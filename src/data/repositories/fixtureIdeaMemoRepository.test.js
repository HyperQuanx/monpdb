import { beforeEach, describe, expect, it } from "vitest";
import { appFixture } from "../fixtures/appFixture";
import { createFixtureContentRelationState } from "./fixtureContentRelationState";
import { createFixtureIdeaRepository } from "./fixtureIdeaRepository";
import { createFixtureMemoRepository } from "./fixtureMemoRepository";
import { createFixturePlotRepository } from "./fixturePlotRepository";
import { createFixtureRelationRepository } from "./fixtureRelationRepository";
import { createFixtureSettingRepository } from "./fixtureSettingRepository";
import { createFixtureWorldRepository } from "./fixtureWorldRepository";
import { createIdeaConverter } from "./ideaConverter";

const MONP = "work-monp";
const MOON = "work-moonlit-echoes";
const DIALOGUE = "idea-dialogue-mist";
const times = Array.from({ length: 20 }, (_, index) =>
  `2026-10-01T00:${String(index).padStart(2, "0")}:00.000Z`,
);

const createRepositories = (fixture = structuredClone(appFixture)) => {
  const state = createFixtureContentRelationState(fixture);
  let tick = 0;
  let idIndex = 0;
  const now = () => times[tick++] ?? times.at(-1);
  const createId = () => `created-${idIndex++}`;
  const ideas = createFixtureIdeaRepository(state, { createId, now });
  const plots = createFixturePlotRepository(state, { createId, now });
  const settings = createFixtureSettingRepository(state, { createId, now });
  const worlds = createFixtureWorldRepository(state, { createId, now });
  const relations = createFixtureRelationRepository(state, { createId, now });
  const memos = createFixtureMemoRepository(state, {
    createChecklistItemId: () => `check-${idIndex++}`,
    createId,
    now,
  });
  return {
    converter: createIdeaConverter({ ideas, plots, relations, settings, worlds }),
    ideas,
    memos,
    plots,
    relations,
    settings,
    state,
    worlds,
  };
};

let repos;

beforeEach(() => {
  repos = createRepositories();
});

describe("fixture Idea repository", () => {
  it("quick-adds a seed idea with defaults into a concrete category", async () => {
    const idea = await repos.ideas.create(MONP, { categoryId: "idea01", title: "  떠돌이 검객  " });
    expect(idea).toMatchObject({
      categoryId: "idea01",
      categoryName: "캐릭터",
      convertedTo: null,
      priority: "medium",
      status: "seed",
      title: "떠돌이 검객",
    });
    await expect(repos.ideas.create(MONP, { categoryId: "idea00", title: "전체" })).rejects.toThrow(
      "A concrete idea category is required.",
    );
    await expect(
      repos.ideas.create(MONP, { categoryId: "idea01", status: "adopted", title: "채택" }),
    ).rejects.toThrow("Ideas are adopted only by converting them.");
  });

  it("lists by priority then recency with filters and work isolation", async () => {
    await repos.ideas.create(MONP, { categoryId: "idea02", priority: "low", title: "낮은 대사" });
    await repos.ideas.create(MONP, { categoryId: "idea03", priority: "high", title: "높은 장소" });
    const all = await repos.ideas.list({ categoryId: "idea00", workId: MONP });
    expect(all.map(({ title }) => title)).toEqual(["높은 장소", "안개 속의 첫 대사", "낮은 대사"]);
    expect(
      (await repos.ideas.list({ categoryId: "idea02", workId: MONP, priority: "low" })).map(({ title }) => title),
    ).toEqual(["낮은 대사"]);
    expect(await repos.ideas.list({ q: "산책", workId: MONP })).toHaveLength(1);
    expect(await repos.ideas.list({ workId: MOON })).toEqual([]);
    await expect(repos.ideas.get(MOON, DIALOGUE)).rejects.toThrow("Idea not found in work");
  });

  it("allows only defined status transitions", async () => {
    await expect(repos.ideas.transition(MONP, DIALOGUE, "ready")).resolves.toMatchObject({ status: "ready" });
    await expect(repos.ideas.transition(MONP, DIALOGUE, "seed")).rejects.toThrow(
      "Invalid idea status transition: ready -> seed",
    );
    await expect(repos.ideas.transition(MONP, DIALOGUE, "adopted")).rejects.toThrow(
      "Invalid idea status transition: ready -> adopted",
    );
    await repos.ideas.transition(MONP, DIALOGUE, "discarded");
    await expect(repos.ideas.update(MONP, DIALOGUE, { status: "ready" })).rejects.toThrow(
      "Invalid idea status transition: discarded -> ready",
    );
    await expect(repos.ideas.transition(MONP, DIALOGUE, "seed")).resolves.toMatchObject({ status: "seed" });
    await repos.ideas.archive(MONP, DIALOGUE);
    await expect(repos.ideas.transition(MONP, DIALOGUE, "developing")).rejects.toThrow(
      "Archived idea cannot be changed",
    );
  });
});

describe("idea conversion", () => {
  it("converts the dialogue idea into a plot scene with an origin relation", async () => {
    const { idea, relation, target } = await repos.converter.convert(MONP, DIALOGUE, {
      categoryId: "plot02",
      targetType: "plot",
    });
    expect(target).toMatchObject({
      body: appFixture.ideas[0].body,
      chapterId: "plot02",
      resourceType: "plot",
      status: "planned",
      summary: appFixture.ideas[0].summary,
      tags: ["1장", "도입"],
      title: "안개 속의 첫 대사",
    });
    expect(relation).toMatchObject({
      label: "원본 아이디어",
      relationType: "idea-origin",
      source: { type: "plot", id: target.id },
      target: { type: "idea", id: DIALOGUE },
    });
    expect(idea).toMatchObject({
      convertedTo: { type: "plot", id: target.id },
      status: "adopted",
    });
    await expect(
      repos.relations.list(MONP, { type: "idea", id: DIALOGUE }),
    ).resolves.toEqual([expect.objectContaining({ relationType: "idea-origin" })]);
    await expect(
      repos.converter.convert(MONP, DIALOGUE, { categoryId: "plot02", targetType: "plot" }),
    ).rejects.toThrow("Idea cannot be converted from status adopted");
    await expect(repos.ideas.transition(MONP, DIALOGUE, "developing")).rejects.toThrow(
      "Invalid idea status transition: adopted -> developing",
    );
  });

  it("converts into setting and world targets using their category fields", async () => {
    const ability = await repos.ideas.create(MONP, { categoryId: "idea04", title: "달빛 부적" });
    const { target: setting } = await repos.converter.convert(MONP, ability.id, {
      categoryId: "setting02",
      targetType: "setting",
    });
    expect(setting).toMatchObject({ categoryId: "setting02", resourceType: "setting", title: "달빛 부적" });

    const place = await repos.ideas.create(MONP, { categoryId: "idea03", title: "안개 협곡" });
    const { target: world } = await repos.converter.convert(MONP, place.id, {
      categoryId: "world01",
      targetType: "world",
    });
    expect(world).toMatchObject({ category: "region", regionId: "world01", resourceType: "world" });
  });

  it("rejects invalid targets without leaving partial records", async () => {
    const before = repos.state.read();
    await expect(
      repos.converter.convert(MONP, DIALOGUE, { categoryId: "plot00", targetType: "plot" }),
    ).rejects.toThrow("A concrete plot chapter is required.");
    await expect(
      repos.converter.convert(MONP, DIALOGUE, { categoryId: "memo00", targetType: "memo" }),
    ).rejects.toThrow("Unsupported idea conversion target: memo");
    const after = repos.state.read();
    expect(after.plotScenes).toEqual(before.plotScenes);
    expect(after.ideas).toEqual(before.ideas);

    await repos.ideas.transition(MONP, DIALOGUE, "discarded");
    await expect(
      repos.converter.convert(MONP, DIALOGUE, { categoryId: "plot01", targetType: "plot" }),
    ).rejects.toThrow("Idea cannot be converted from status discarded");
  });

  it("archives the created target when recording the conversion fails", async () => {
    const failingIdeas = {
      ...repos.ideas,
      markConverted: () => Promise.reject(new Error("기록 실패")),
    };
    const converter = createIdeaConverter({ ...repos, ideas: failingIdeas });
    await expect(
      converter.convert(MONP, DIALOGUE, { categoryId: "plot01", targetType: "plot" }),
    ).rejects.toThrow("기록 실패");
    const created = (await repos.plots.list({ archiveStatus: "all", workId: MONP })).find(
      ({ title }) => title === "안개 속의 첫 대사",
    );
    expect(created.archivedAt).not.toBeNull();
    expect((await repos.ideas.get(MONP, DIALOGUE)).status).toBe("developing");
    await expect(repos.relations.list(MONP, { type: "idea", id: DIALOGUE })).resolves.toEqual([]);
  });
});

describe("fixture Memo repository", () => {
  it("quick-adds memos and sorts pinned first, then by recency", async () => {
    const quick = await repos.memos.create(MONP, { menuItemId: "memo00", title: "  빠른 메모  " });
    expect(quick).toMatchObject({ color: "default", pinned: false, pinnedAt: null, title: "빠른 메모" });
    const ids = async () => (await repos.memos.list({ menuItemId: "memo00", workId: MONP })).map(({ id }) => id);
    expect(await ids()).toEqual(["memo-next-session", quick.id, "memo-research"]);

    await repos.memos.setPinned(MONP, "memo-research", true);
    expect(await ids()).toEqual(["memo-research", "memo-next-session", quick.id]);
    await repos.memos.setPinned(MONP, "memo-research", false);
    await repos.memos.setPinned(MONP, "memo-next-session", false);
    // With nothing pinned, the most recently updated memo comes first.
    expect(await ids()).toEqual(["memo-next-session", "memo-research", quick.id]);
  });

  it("toggles checklist items and filters by color, search, and work", async () => {
    const toggled = await repos.memos.toggleChecklistItem(MONP, "memo-next-session", "check-mist");
    expect(toggled.checklist.map(({ done }) => done)).toEqual([true, true]);
    await expect(
      repos.memos.toggleChecklistItem(MONP, "memo-next-session", "missing"),
    ).rejects.toThrow("Checklist item not found: missing");
    expect((await repos.memos.list({ color: "blue", workId: MONP })).map(({ id }) => id)).toEqual(["memo-research"]);
    expect((await repos.memos.list({ q: "안개 묘사", workId: MONP })).map(({ id }) => id)).toEqual([
      "memo-next-session",
    ]);
    expect(await repos.memos.list({ workId: MOON })).toEqual([]);
  });

  it("stores memos in custom memo menus and shows them in memo00", async () => {
    const fixture = structuredClone(appFixture);
    fixture.menuItems.push({
      ...structuredClone(fixture.menuItems.find(({ id }) => id === "memo00")),
      id: "memo-work",
      label: "작업 메모",
      slug: "memo-work",
      filterConfig: { scope: "category" },
      order: 1,
    });
    const scoped = createRepositories(fixture);
    const memo = await scoped.memos.create(MONP, {
      checklist: [{ text: " 확인 " }],
      menuItemId: "memo-work",
      title: "분류 메모",
    });
    expect(memo.checklist).toEqual([{ done: false, id: expect.stringMatching(/^check-/), text: "확인" }]);
    expect((await scoped.memos.list({ menuItemId: "memo-work", workId: MONP })).map(({ id }) => id)).toEqual([memo.id]);
    expect((await scoped.memos.list({ menuItemId: "memo00", workId: MONP })).map(({ id }) => id)).toContain(memo.id);
    await expect(scoped.memos.create(MONP, { menuItemId: "idea01", title: "잘못" })).rejects.toThrow(
      "Invalid memo menu: idea01",
    );
  });

  it("archives and restores memos and blocks edits while archived", async () => {
    await repos.memos.archive(MONP, "memo-research");
    expect((await repos.memos.list({ workId: MONP })).map(({ id }) => id)).not.toContain("memo-research");
    await expect(repos.memos.setPinned(MONP, "memo-research", true)).rejects.toThrow("Archived memo cannot be changed");
    await repos.memos.restore(MONP, "memo-research");
    expect((await repos.memos.get(MONP, "memo-research")).archivedAt).toBeNull();
  });
});
