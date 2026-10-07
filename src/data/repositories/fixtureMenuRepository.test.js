import { beforeEach, describe, expect, it } from "vitest";
import { appFixture } from "../fixtures/appFixture";
import { createFixtureContentRelationState } from "./fixtureContentRelationState";
import { createFixtureMenuRepository } from "./fixtureMenuRepository";
import { createFixtureWorldRepository } from "./fixtureWorldRepository";

const times = [
  "2026-09-25T03:00:00.000Z",
  "2026-09-25T03:01:00.000Z",
  "2026-09-25T03:02:00.000Z",
];

const createRepository = () => {
  let timeIndex = 0;
  return createFixtureMenuRepository(
    {
      menuSections: appFixture.menuSections,
      menuItems: appFixture.menuItems,
    },
    {
      createId: (type) => `${type}-created`,
      now: () => times[timeIndex++] ?? times.at(-1),
    },
  );
};

let repository;

beforeEach(() => {
  repository = createRepository();
});

describe("fixture Menu repository reads", () => {
  it("returns the existing six-section and 31-item active tree", async () => {
    const tree = await repository.listTree();

    expect(tree).toHaveLength(6);
    expect(tree.flatMap(({ items }) => items)).toHaveLength(31);
    expect(tree[0]).toMatchObject({ id: "characters", label: "캐릭터" });
  });

  it("returns deep clones and validates active section-item pairs", async () => {
    const tree = await repository.listTree();
    tree[0].items[0].filterConfig.scope = "changed";

    await expect(repository.getItem("characters00")).resolves.toMatchObject({
      filterConfig: { scope: "all" },
    });
    await expect(
      repository.requireActiveItem("characters", "characters01"),
    ).resolves.toMatchObject({ id: "characters01" });
    await expect(
      repository.requireActiveItem("world", "characters01"),
    ).rejects.toThrow("Menu item does not belong to section world");
  });
});

describe("fixture Menu repository shared content state", () => {
  it("writes menu changes into the shared state so content repositories see new categories", async () => {
    const state = createFixtureContentRelationState(appFixture);
    const shared = createFixtureMenuRepository(state, {
      createId: (type) => `${type}-shared`,
      now: () => times[0],
    });
    const worlds = createFixtureWorldRepository(state, {
      createId: () => "world-in-new-region",
      now: () => times[0],
    });

    const region = await shared.createItem("world", {
      label: "서부 산악지대",
      slug: "west-mountains",
    });
    expect(region).toMatchObject({
      id: "item-shared",
      resourceType: "world",
      filterConfig: { scope: "category" },
    });
    expect(state.read().menuItems.map(({ id }) => id)).toContain("item-shared");
    await expect(
      worlds.create("work-monp", { regionId: "item-shared", title: "서부 요새" }),
    ).resolves.toMatchObject({ regionId: "item-shared", regionName: "서부 산악지대" });

    await shared.updateItem("item-shared", { label: "서부 고원" });
    expect(
      state.read().menuItems.find(({ id }) => id === "item-shared").label,
    ).toBe("서부 고원");

    // Archiving keeps the stored World valid; new Worlds are blocked.
    await shared.archiveItem("item-shared");
    await expect(
      worlds.create("work-monp", { regionId: "item-shared", title: "차단" }),
    ).rejects.toThrow("World region is archived: item-shared");
    await expect(worlds.get("work-monp", "world-in-new-region")).resolves.toMatchObject({
      regionId: "item-shared",
    });
  });

  it("inherits the section resource type and rejects mismatched types", async () => {
    let idIndex = 0;
    const repository = createFixtureMenuRepository(
      { menuItems: appFixture.menuItems, menuSections: appFixture.menuSections },
      { createId: (type) => `${type}-${idIndex++}` },
    );
    await expect(
      repository.createItem("setting", { label: "능력", slug: "ability" }),
    ).resolves.toMatchObject({
      resourceType: "setting",
      filterConfig: { scope: "category" },
    });
    await expect(
      repository.createItem("setting", {
        label: "잘못된 유형",
        slug: "wrong-type",
        resourceType: "world",
      }),
    ).rejects.toThrow("Menu item type must match section type setting: world");

    const custom = await repository.createSection({ label: "연대표" });
    await expect(
      repository.createItem(custom.id, { label: "사건", slug: "timeline-events" }),
    ).resolves.toMatchObject({ resourceType: "generic" });
  });

  it("keeps the structural scope when filterConfig is edited", async () => {
    const updated = await repository.updateItem("setting01", {
      filterConfig: { fields: ["grade"], scope: "all" },
    });
    expect(updated.filterConfig).toMatchObject({
      fields: ["grade"],
      scope: "category",
    });
  });
});

describe("fixture Menu repository mutations", () => {
  it("creates and updates a section while keeping identity fields immutable", async () => {
    const created = await repository.createSection({
      label: "연대표",
      icon: "timeline",
    });
    const updated = await repository.updateSection(created.id, {
      id: "changed",
      label: "역사 연대표",
      order: 99,
      archivedAt: times[1],
    });

    expect(created).toMatchObject({
      id: "section-created",
      label: "연대표",
      order: 6,
      archivedAt: null,
    });
    expect(updated).toMatchObject({
      id: "section-created",
      label: "역사 연대표",
      order: 6,
      archivedAt: null,
    });
  });

  it("creates and renames an item without changing its stable URL identity", async () => {
    const created = await repository.createItem("setting", {
      label: "무기",
      slug: "weapon",
      resourceType: "setting",
      filterConfig: { category: "weapon" },
    });
    const renamed = await repository.updateItem(created.id, {
      id: "changed",
      label: "병장기",
      slug: "armament",
      sectionId: "world",
      resourceType: "world",
      order: 99,
    });

    expect(created).toMatchObject({
      id: "item-created",
      sectionId: "setting",
      order: 3,
    });
    expect(renamed).toMatchObject({
      id: "item-created",
      sectionId: "setting",
      label: "병장기",
      slug: "armament",
      resourceType: "setting",
      order: 3,
    });
  });

  it("reserves item slugs globally including archived items", async () => {
    await repository.archiveItem("setting01");

    await expect(
      repository.createItem("world", {
        label: "충돌",
        slug: "setting01",
        resourceType: "world",
      }),
    ).rejects.toThrow("Menu item slug already exists: setting01");
  });

  it("reorders active sections and sibling items with dense order values", async () => {
    const sections = await repository.listSections();
    await repository.reorderSections(sections.map(({ id }) => id).reverse());
    expect((await repository.listSections()).map(({ id }) => id)).toEqual(
      sections.map(({ id }) => id).reverse(),
    );

    const items = await repository.listItems("setting");
    await repository.reorderItems(
      "setting",
      items.map(({ id }) => id).reverse(),
    );
    expect((await repository.listItems("setting")).map(({ id }) => id)).toEqual(
      items.map(({ id }) => id).reverse(),
    );
  });

  it("rejects incomplete and cross-section reorder permutations", async () => {
    await expect(repository.reorderSections(["characters"])).rejects.toThrow(
      "Section reorder must include every active section exactly once",
    );
    await expect(
      repository.reorderItems("setting", ["setting00", "world00"]),
    ).rejects.toThrow(
      "Item reorder must include every active item in section setting exactly once",
    );
  });

  it("hides a section without mutating children and preserves individual item archives", async () => {
    await repository.archiveItem("setting02");
    await repository.archiveSection("setting");

    expect((await repository.listTree()).map(({ id }) => id)).not.toContain(
      "setting",
    );
    await expect(repository.getItem("setting01")).resolves.toMatchObject({
      archivedAt: null,
    });
    await expect(
      repository.requireActiveItem("setting", "setting01"),
    ).rejects.toThrow("Menu section is archived: setting");

    await repository.restoreSection("setting");
    const settingTree = (await repository.listTree()).find(
      ({ id }) => id === "setting",
    );
    expect(settingTree.items.map(({ id }) => id)).toContain("setting01");
    expect(settingTree.items.map(({ id }) => id)).not.toContain("setting02");
  });

  it("restores an individually archived item and leaves fixture content untouched", async () => {
    const originalContent = structuredClone({
      characters: appFixture.characters,
      contents: appFixture.contents,
      relations: appFixture.relations,
    });

    await repository.archiveItem("characters01");
    await repository.restoreItem("characters01");

    await expect(
      repository.requireActiveItem("characters", "characters01"),
    ).resolves.toMatchObject({ id: "characters01" });
    expect({
      characters: appFixture.characters,
      contents: appFixture.contents,
      relations: appFixture.relations,
    }).toEqual(originalContent);
  });
});
