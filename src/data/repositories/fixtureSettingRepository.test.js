import { beforeEach, describe, expect, it } from "vitest";
import { appFixture } from "../fixtures/appFixture";
import { createFixtureContentRelationState } from "./fixtureContentRelationState";
import { createFixtureMenuRepository } from "./fixtureMenuRepository";
import { createFixtureRelationRepository } from "./fixtureRelationRepository";
import { createFixtureSettingRepository } from "./fixtureSettingRepository";

const MONP = "work-monp";
const MOON = "work-moonlit-echoes";
const SWORD = "setting-cheongun-sword";
const TIME = "2026-10-01T00:00:00.000Z";

const createSettingFixture = () => {
  const fixture = structuredClone(appFixture);
  const base = fixture.settings[0];
  fixture.settings.push(
    {
      ...structuredClone(base),
      id: "setting-shadow-step",
      menuItemId: "setting02",
      categoryId: "setting02",
      categoryName: "서버 통합",
      title: "그림자 보법",
      grade: "특급",
      effect: "그림자 속으로 이동한다.",
      attributes: [],
      tags: ["보법"],
      order: 0,
    },
    {
      ...structuredClone(base),
      id: "setting-archived-blade",
      title: "부러진 검",
      grade: "하급",
      attributes: [],
      order: 1,
      archivedAt: "2026-02-01T00:00:00.000Z",
    },
    {
      ...structuredClone(base),
      id: "setting-moon-lantern",
      workId: MOON,
      title: "달빛 등불",
      attributes: [],
      order: 0,
    },
  );
  return fixture;
};

const createRepositories = (fixture = createSettingFixture()) => {
  const state = createFixtureContentRelationState(fixture);
  let settingIndex = 0;
  let attributeIndex = 0;
  let relationIndex = 0;
  return {
    menus: createFixtureMenuRepository(state, { createId: (type) => `${type}-new` }),
    relations: createFixtureRelationRepository(state, {
      createId: () => `relation-created-${relationIndex++}`,
      now: () => TIME,
    }),
    settings: createFixtureSettingRepository(state, {
      createAttributeId: () => `attribute-created-${attributeIndex++}`,
      createId: () => `setting-created-${settingIndex++}`,
      now: () => TIME,
    }),
    state,
  };
};

let repos;

beforeEach(() => {
  repos = createRepositories();
});

const ids = (settings) => settings.map(({ id }) => id);

describe("fixture Setting repository reads", () => {
  it("lists concrete categories, setting00 across categories, and archive states per work", async () => {
    const { settings } = repos;
    expect(ids(await settings.list({ categoryId: "setting01", workId: MONP }))).toEqual([SWORD]);
    expect(ids(await settings.list({ categoryId: "setting00", workId: MONP }))).toEqual([
      SWORD,
      "setting-shadow-step",
    ]);
    expect(
      ids(await settings.list({ archiveStatus: "archived", categoryId: "setting00", workId: MONP })),
    ).toEqual(["setting-archived-blade"]);
    await expect(settings.get(MOON, SWORD)).rejects.toThrow(
      "Setting not found in work work-moonlit-echoes",
    );
  });

  it("searches fields and attributes and filters by grade and owner", async () => {
    const { settings } = repos;
    const list = (filters) =>
      settings.list({ categoryId: "setting00", workId: MONP, ...filters }).then(ids);

    expect(await list({ q: "청운 조사" })).toEqual([SWORD]);
    expect(await list({ q: "그림자" })).toEqual(["setting-shadow-step"]);
    expect(await list({ grade: "특" })).toEqual(["setting-shadow-step"]);
    expect(await list({ ownerCharacterId: "character-yeonhwa" })).toEqual([SWORD]);
    expect(await list({ grade: "특급", ownerCharacterId: "character-yeonhwa" })).toEqual([]);
    await expect(settings.listOwners(MONP)).resolves.toEqual({
      [SWORD]: ["character-yeonhwa"],
    });
  });
});

describe("fixture Setting repository mutations", () => {
  it("creates entries in a concrete category and trusts route context", async () => {
    const created = await repos.settings.create(MONP, {
      id: "spoofed",
      workId: MOON,
      resourceType: "world",
      categoryId: "setting01",
      menuItemId: "setting02",
      title: "  청운 검집  ",
      grade: "중급",
      attributes: [{ label: " 재질 ", value: "흑철" }],
      order: 42,
    });
    expect(created).toMatchObject({
      id: "setting-created-0",
      workId: MONP,
      resourceType: "setting",
      categoryId: "setting01",
      menuItemId: "setting01",
      categoryName: "서버",
      title: "청운 검집",
      attributes: [{ id: "attribute-created-0", label: "재질", value: "흑철" }],
      order: 2,
      version: 1,
    });

    for (const categoryId of [undefined, "setting00", "world01", "missing"]) {
      await expect(
        repos.settings.create(MONP, { categoryId, title: "잘못된 분류" }),
      ).rejects.toThrow(/category/i);
    }
    await expect(
      repos.settings.create(MONP, { categoryId: "setting01", title: " " }),
    ).rejects.toThrow();
  });

  it("stores entries in a category created from menu management", async () => {
    const category = await repos.menus.createItem("setting", {
      label: "공통 무공",
      slug: "common-martial-arts",
      filterConfig: { fields: ["grade", "effect"] },
    });
    const created = await repos.settings.create(MONP, {
      categoryId: category.id,
      title: "기초 토납법",
    });
    expect(created).toMatchObject({ categoryId: "item-new", categoryName: "공통 무공" });
    expect(
      ids(await repos.settings.list({ categoryId: "item-new", workId: MONP })),
    ).toEqual([created.id]);

    await repos.menus.updateItem(category.id, { label: "기본 무공" });
    await repos.menus.archiveItem(category.id);
    await expect(
      repos.settings.create(MONP, { categoryId: category.id, title: "차단" }),
    ).rejects.toThrow("Setting category is archived");
    await expect(repos.settings.get(MONP, created.id)).resolves.toMatchObject({
      categoryId: "item-new",
    });
  });

  it("moves an entry to another category and appends it there", async () => {
    const moved = await repos.settings.update(MONP, SWORD, {
      categoryId: "setting02",
      title: "청운검법 (개정)",
    });
    expect(moved).toMatchObject({
      categoryId: "setting02",
      categoryName: "서버 통합",
      menuItemId: "setting02",
      order: 1,
      version: 2,
    });
    await expect(
      repos.settings.update(MONP, SWORD, { categoryId: "setting00" }),
    ).rejects.toThrow("A concrete setting category is required.");
  });

  it("keeps owner relations through archive and restore", async () => {
    const archived = await repos.settings.archive(MONP, SWORD);
    expect(archived).toMatchObject({ archivedAt: TIME, version: 2 });
    await expect(
      repos.relations.list(MONP, { type: "character", id: "character-yeonhwa" }),
    ).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          relationType: "owner",
          source: { type: "setting", id: SWORD },
        }),
      ]),
    );
    const restored = await repos.settings.restore(MONP, SWORD);
    expect(restored).toMatchObject({ archivedAt: null, version: 3 });
    await expect(repos.settings.listOwners(MONP)).resolves.toMatchObject({
      [SWORD]: ["character-yeonhwa"],
    });
  });

  it("manages owners through outgoing owner relations", async () => {
    const source = { type: "setting", id: SWORD };
    await repos.relations.replaceOutgoing(MONP, source, [
      {
        bidirectional: false,
        label: "사용자",
        notes: "",
        relationType: "owner",
        target: { type: "character", id: "character-muyeong" },
      },
    ]);
    await expect(repos.settings.listOwners(MONP)).resolves.toEqual({
      [SWORD]: ["character-muyeong"],
    });
    await expect(
      repos.relations.replaceOutgoing(MONP, source, [
        {
          bidirectional: false,
          label: "사용자",
          notes: "",
          relationType: "owner",
          target: { type: "world", id: "world-east-plains" },
        },
      ]),
    ).rejects.toThrow(/owner relations must link a setting to a character/i);
  });
});
