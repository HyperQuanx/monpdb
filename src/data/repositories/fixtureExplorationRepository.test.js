import { describe, expect, it } from "vitest";
import { appFixture } from "../fixtures/appFixture";
import { createGenericContentFixture } from "../../test/genericContentFixture";
import { createFixtureExplorationRepository } from "./fixtureExplorationRepository";
import { entityDetailPath, parseEntityDetailPath } from "../../shared/navigation/entityPaths";
import { createRecentViewStore } from "../../shared/navigation/recentViews";

const MONP = "work-monp";
const MOON = "work-moonlit-echoes";
const createRepository = (fixture = createGenericContentFixture(appFixture)) =>
  createFixtureExplorationRepository(fixture);
const ids = ({ results }) => results.map(({ endpoint }) => endpoint.id);

describe("fixture exploration search", () => {
  it("searches titles, summaries, bodies, tags, and type fields across every collection", async () => {
    const repository = createRepository();
    expect(ids(await repository.search(MONP, { q: "연화" }))[0]).toBe("character-yeonhwa");
    // Body text of the plot scene and the generic note.
    expect(ids(await repository.search(MONP, { q: "검은 안개" }))).toEqual(
      expect.arrayContaining(["plot-chapter-one-opening", "generic-mist-note", "idea-dialogue-mist"]),
    );
    expect(ids(await repository.search(MONP, { q: "안개 묘사" }))).toEqual(["memo-next-session"]);
    expect(ids(await repository.search(MONP, { q: "청운 조사" }))).toEqual(["setting-cheongun-sword"]);
    expect(ids(await repository.search(MONP, { q: "蓮花" }))).toEqual(["character-yeonhwa"]);
    const summary = await repository.search(MONP, { q: "교역로" });
    const scene = summary.results.find(({ endpoint }) => endpoint.id === "plot-chapter-one-opening");
    expect(scene.snippet).toMatchObject({ label: "요약" });
    expect(scene.snippet.text).toContain("교역로");
    expect(scene).not.toHaveProperty("fields");
  });

  it("supports Korean initial-consonant and space-insensitive search", async () => {
    const repository = createRepository();
    expect(ids(await repository.search(MONP, { q: "ㅊㅇㄱㅂ" }))).toContain("setting-cheongun-sword");
    expect(ids(await repository.search(MONP, { q: "청운 검법" }))).toContain("setting-cheongun-sword");
    expect(ids(await repository.search(MONP, { q: "ㅇㅎ", kind: "character" }))).toEqual(["character-yeonhwa"]);
  });

  it("combines kind, menu, status, and archive filters with AND", async () => {
    const fixture = createGenericContentFixture(appFixture);
    fixture.plotScenes.push({
      ...structuredClone(fixture.plotScenes[0]),
      id: "plot-archived-mist",
      title: "보관된 안개 장면",
      status: "final",
      archivedAt: "2026-02-01T00:00:00.000Z",
      clues: [],
    });
    const repository = createRepository(fixture);
    expect(ids(await repository.search(MONP, { q: "안개", kind: "plot" }))).toEqual(["plot-chapter-one-opening"]);
    expect(ids(await repository.search(MONP, { includeArchived: true, kind: "plot", q: "안개", status: "final" }))).toEqual([
      "plot-archived-mist",
    ]);
    const plotStatuses = await repository.search(MONP, { includeArchived: true, kind: "plot" });
    expect(plotStatuses.statuses).toEqual(["draft", "final"]);
    expect(ids(await repository.search(MONP, { kind: "plot", menuItemId: "plot02" }))).toEqual([]);
    expect(ids(await repository.search(MONP, { menuItemId: "plot00" }))).toEqual(["plot-chapter-one-opening"]);
    expect(ids(await repository.search(MONP, { menuItemId: "characters01" }))).toEqual(["character-yeonhwa"]);
    expect(ids(await repository.search(MOON, { q: "연화" }))).toEqual([]);
    await expect(repository.search("work-missing", {})).rejects.toThrow("Work not found");
  });

  it("builds deep links for every result kind", async () => {
    const repository = createRepository();
    const { results } = await repository.search(MONP, {});
    const paths = new Map(results.map((entity) => [entity.endpoint.id, entityDetailPath(MONP, entity)]));
    expect(Object.fromEntries(paths)).toMatchObject({
      "character-yeonhwa": "/works/work-monp/characters/characters01/character-yeonhwa",
      "generic-mist-note": "/works/work-monp/notes/notes01/generic-mist-note",
      "idea-dialogue-mist": "/works/work-monp/idea/idea02/idea-dialogue-mist",
      "memo-next-session": "/works/work-monp/memo/memo00/memo-next-session",
      "plot-chapter-one-opening": "/works/work-monp/plot/plot01/plot-chapter-one-opening",
      "setting-cheongun-sword": "/works/work-monp/setting/setting01/setting-cheongun-sword",
      "world-east-plains": "/works/work-monp/world/world01/world-east-plains",
    });
    for (const [id, path] of paths) {
      const parsed = parseEntityDetailPath(path);
      expect(parsed.id).toBe(id);
      expect(parsed.workId).toBe(MONP);
    }
    expect(parseEntityDetailPath("/works/work-monp/plot/plot01/new")).toBeNull();
    expect(parseEntityDetailPath("/works/work-monp/plot/plot01/plot-1/edit")).toBeNull();
    expect(parseEntityDetailPath("/works/work-monp/search")).toBeNull();
  });
});

describe("fixture exploration recent and resolve", () => {
  it("lists recently updated active entities and resolves references in order", async () => {
    const fixture = createGenericContentFixture(appFixture);
    fixture.worlds[0].updatedAt = "2026-09-01T00:00:00.000Z";
    const repository = createRepository(fixture);
    const recent = await repository.listRecentlyUpdated(MONP, { limit: 3 });
    expect(recent[0].endpoint.id).toBe("world-east-plains");
    expect(recent).toHaveLength(3);
    const resolved = await repository.resolve(MONP, [
      { kind: "memo", id: "memo-research" },
      { kind: "character", id: "missing" },
      { kind: "character", id: "character-yeonhwa" },
    ]);
    expect(resolved.map(({ endpoint }) => endpoint.id)).toEqual(["memo-research", "character-yeonhwa"]);
  });

  it("keeps the latest view first without duplicates per work", () => {
    let tick = 0;
    const store = createRecentViewStore({ limit: 2, now: () => `t${tick++}` });
    store.record(MONP, { kind: "plot", id: "a" });
    store.record(MONP, { kind: "world", id: "b" });
    store.record(MONP, { kind: "plot", id: "a" });
    store.record(MOON, { kind: "character", id: "c" });
    expect(store.list(MONP)).toEqual([
      { id: "a", kind: "plot", viewedAt: "t2" },
      { id: "b", kind: "world", viewedAt: "t1" },
    ]);
    store.record(MONP, { kind: "idea", id: "d" });
    expect(store.list(MONP).map(({ id }) => id)).toEqual(["d", "a"]);
    expect(store.list(MOON)).toHaveLength(1);
  });
});

describe("fixture exploration neighborhood", () => {
  it("connects a character to worlds, plot scenes, and settings including derived plot edges", async () => {
    const repository = createRepository();
    const result = await repository.getNeighborhood(MONP, { type: "character", id: "character-yeonhwa" });
    const connected = result.levels[0].items.map(({ node, via }) => [node.endpoint.id, via.map(({ edge }) => edge.label)]);
    expect(Object.fromEntries(connected)).toEqual({
      "plot-chapter-one-opening": ["POV"],
      "setting-cheongun-sword": ["사용자"],
      "world-east-plains": ["출신 지역"],
    });
    const two = await repository.getNeighborhood(
      MONP,
      { type: "character", id: "character-yeonhwa" },
      { depth: 2 },
    );
    // The world is linked both directly and through the scene's location; it stays at depth 1.
    expect(two.levels.flatMap(({ items }) => items).filter(({ node }) => node.endpoint.id === "world-east-plains")).toHaveLength(1);
    expect(await repository.getNeighborhood(MONP, { type: "character", id: "missing" })).toBeNull();
  });

  it("includes idea origin and payoff edges and ignores memos and other works", async () => {
    const fixture = createGenericContentFixture(appFixture);
    fixture.plotScenes.push({
      ...structuredClone(fixture.plotScenes[0]),
      id: "plot-payoff",
      title: "방울의 정체",
      clues: [],
      povCharacterId: null,
      characterIds: [],
      locationWorldId: null,
    });
    fixture.plotScenes[0].clues[0].payoffSceneId = "plot-payoff";
    const repository = createRepository(fixture);
    const result = await repository.getNeighborhood(MONP, { type: "plot", id: "plot-payoff" });
    expect(result.levels[0].items).toEqual([
      expect.objectContaining({
        node: expect.objectContaining({ label: "첫 장의 시작" }),
        via: [expect.objectContaining({ edge: expect.objectContaining({ derived: true, relationType: "payoff" }) })],
      }),
    ]);
    await expect(
      repository.getNeighborhood(MONP, { type: "memo", id: "memo-next-session" }),
    ).resolves.toBeNull();
  });
});
