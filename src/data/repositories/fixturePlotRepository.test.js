import { beforeEach, describe, expect, it } from "vitest";
import { appFixture } from "../fixtures/appFixture";
import { createFixtureContentRelationState } from "./fixtureContentRelationState";
import {
  countUnresolvedClues,
  createFixturePlotRepository,
} from "./fixturePlotRepository";
import { createFixtureRelationRepository } from "./fixtureRelationRepository";

const MONP = "work-monp";
const MOON = "work-moonlit-echoes";
const OPENING = "plot-chapter-one-opening";
const TIME = "2026-10-01T00:00:00.000Z";

const createPlotFixture = () => {
  const fixture = structuredClone(appFixture);
  const base = fixture.plotScenes[0];
  const scene = (overrides) => ({
    ...structuredClone(base),
    clues: [],
    ...overrides,
  });
  fixture.plotScenes.push(
    scene({ id: "plot-caravan", title: "상단의 정지", order: 1, status: "planned" }),
    scene({ id: "plot-gate", title: "산문의 경고", order: 2, status: "revised" }),
    scene({
      id: "plot-archived-ch1",
      title: "보관된 1장 장면",
      order: 3,
      archivedAt: "2026-02-01T00:00:00.000Z",
    }),
    scene({
      id: "plot-ch2-arrival",
      menuItemId: "plot02",
      chapterId: "plot02",
      chapterName: "Chapter2",
      title: "암수굴 도착",
      order: 0,
    }),
    scene({
      id: "plot-moon-scene",
      workId: MOON,
      povCharacterId: "character-rin",
      characterIds: ["character-rin"],
      locationWorldId: null,
      title: "달빛 도시",
      order: 0,
    }),
  );
  fixture.characters.find(({ id }) => id === "character-seolha").archivedAt =
    "2026-02-01T00:00:00.000Z";
  return fixture;
};

const createRepository = (fixtureOrState = createPlotFixture()) => {
  let sceneIndex = 0;
  let clueIndex = 0;
  return createFixturePlotRepository(fixtureOrState, {
    createClueId: () => `clue-created-${clueIndex++}`,
    createId: () => `plot-created-${sceneIndex++}`,
    now: () => TIME,
  });
};

const chapterIds = async (repository, chapterId, archiveStatus = "active") =>
  (await repository.list({ archiveStatus, chapterId, workId: MONP })).map(
    ({ id }) => id,
  );

let repository;

beforeEach(() => {
  repository = createRepository();
});

describe("fixture Plot repository reads", () => {
  it("lists a concrete chapter in scene order and plot00 across chapters within a work", async () => {
    expect(await chapterIds(repository, "plot01")).toEqual([
      OPENING,
      "plot-caravan",
      "plot-gate",
    ]);
    expect(await chapterIds(repository, "plot00")).toEqual([
      OPENING,
      "plot-caravan",
      "plot-gate",
      "plot-ch2-arrival",
    ]);
    expect(await chapterIds(repository, "plot01", "archived")).toEqual([
      "plot-archived-ch1",
    ]);
    await expect(repository.get(MOON, OPENING)).rejects.toThrow(
      "Plot scene not found in work work-moonlit-echoes",
    );
  });

  it("filters by search, status, and unresolved clues with AND semantics", async () => {
    const list = (filters) =>
      repository
        .list({ chapterId: "plot00", workId: MONP, ...filters })
        .then((scenes) => scenes.map(({ id }) => id));

    expect(await list({ q: "방울 소리" })).toEqual([OPENING]);
    expect(await list({ q: "교역로 초입" })).toEqual([
      OPENING,
      "plot-caravan",
      "plot-gate",
      "plot-ch2-arrival",
    ]);
    expect(await list({ status: "revised" })).toEqual(["plot-gate"]);
    expect(await list({ unresolved: true })).toEqual([OPENING]);
    expect(await list({ status: "planned", unresolved: true })).toEqual([]);
  });

  it("treats clues as resolved only while the payoff scene is active", async () => {
    await repository.update(MONP, OPENING, {
      clues: [
        {
          id: "clue-black-mist",
          clue: "안개 속에서 들린 방울 소리",
          payoffSceneId: "plot-ch2-arrival",
          notes: "",
        },
      ],
    });
    expect(
      await repository.list({ chapterId: "plot00", unresolved: true, workId: MONP }),
    ).toEqual([]);

    await repository.archive(MONP, "plot-ch2-arrival");
    const unresolved = await repository.list({
      chapterId: "plot00",
      unresolved: true,
      workId: MONP,
    });
    expect(unresolved.map(({ id }) => id)).toEqual([OPENING]);
    const all = await repository.list({
      archiveStatus: "all",
      chapterId: "plot00",
      workId: MONP,
    });
    const byId = new Map(all.map((scene) => [scene.id, scene]));
    expect(countUnresolvedClues(byId.get(OPENING), byId)).toBe(1);
  });
});

describe("fixture Plot repository mutations", () => {
  it("creates scenes at the end of a concrete chapter and trusts route context", async () => {
    const created = await repository.create(MONP, {
      id: "spoofed",
      workId: MOON,
      resourceType: "character",
      chapterId: "plot01",
      menuItemId: "plot05",
      title: "  새 장면  ",
      status: "draft",
      povCharacterId: "character-muyeong",
      characterIds: ["character-yeonhwa", "character-muyeong", "character-yeonhwa"],
      locationWorldId: "world-east-plains",
      clues: [{ clue: " 새 복선 ", payoffSceneId: "" }],
      order: 99,
      version: 42,
    });

    expect(created).toMatchObject({
      id: "plot-created-0",
      workId: MONP,
      resourceType: "plot",
      chapterId: "plot01",
      menuItemId: "plot01",
      chapterName: "Chapter1",
      title: "새 장면",
      characterIds: ["character-yeonhwa", "character-muyeong"],
      clues: [{ id: "clue-created-0", clue: "새 복선", payoffSceneId: null, notes: "" }],
      // Appended after active scenes; archived scenes keep trailing slots.
      order: 3,
      version: 1,
    });
    expect(await chapterIds(repository, "plot01")).toEqual([
      OPENING,
      "plot-caravan",
      "plot-gate",
      "plot-created-0",
    ]);

    for (const chapterId of [undefined, "plot00", "world01", "missing"]) {
      await expect(
        repository.create(MONP, { chapterId, title: "잘못된 장" }),
      ).rejects.toThrow(/chapter/i);
    }
    await expect(
      repository.create(MONP, { chapterId: "plot01", title: "   " }),
    ).rejects.toThrow();
  });

  it("reorders scenes within a chapter and keeps order contiguous", async () => {
    await repository.move(MONP, "plot-gate", { index: 0 });
    expect(await chapterIds(repository, "plot01")).toEqual([
      "plot-gate",
      OPENING,
      "plot-caravan",
    ]);
    await repository.move(MONP, "plot-gate", { index: 99 });
    expect(await chapterIds(repository, "plot01")).toEqual([
      OPENING,
      "plot-caravan",
      "plot-gate",
    ]);

    const all = await repository.list({
      archiveStatus: "all",
      chapterId: "plot01",
      workId: MONP,
    });
    expect(all.map(({ id, order }) => [id, order])).toEqual([
      [OPENING, 0],
      ["plot-caravan", 1],
      ["plot-gate", 2],
      ["plot-archived-ch1", 3],
    ]);
  });

  it("moves a scene to another chapter and closes the source gap", async () => {
    const moved = await repository.move(MONP, "plot-caravan", {
      chapterId: "plot02",
      index: 0,
    });
    expect(moved).toMatchObject({
      chapterId: "plot02",
      menuItemId: "plot02",
      chapterName: "Chapter2",
      order: 0,
      version: 2,
    });
    expect(await chapterIds(repository, "plot02")).toEqual([
      "plot-caravan",
      "plot-ch2-arrival",
    ]);
    const chapterOne = await repository.list({
      archiveStatus: "all",
      chapterId: "plot01",
      workId: MONP,
    });
    expect(chapterOne.map(({ id, order }) => [id, order])).toEqual([
      [OPENING, 0],
      ["plot-gate", 1],
      ["plot-archived-ch1", 2],
    ]);

    const updated = await repository.update(MONP, "plot-gate", {
      chapterId: "plot02",
      title: "산문의 경고 (이동)",
    });
    expect(updated).toMatchObject({ chapterId: "plot02", order: 2 });
    expect(await chapterIds(repository, "plot02")).toEqual([
      "plot-caravan",
      "plot-ch2-arrival",
      "plot-gate",
    ]);

    await expect(
      repository.move(MONP, "plot-archived-ch1", { index: 0 }),
    ).rejects.toThrow("Archived plot scene cannot be moved");
    await expect(
      repository.move(MONP, OPENING, { chapterId: "plot00" }),
    ).rejects.toThrow("A concrete plot chapter is required.");
  });

  it("rejects new archived, cross-work, and self references but preserves existing ones", async () => {
    await expect(
      repository.update(MONP, OPENING, { povCharacterId: "character-seolha" }),
    ).rejects.toThrow("Archived POV character cannot be newly linked");
    await expect(
      repository.update(MONP, OPENING, { characterIds: ["character-rin"] }),
    ).rejects.toThrow("scene character is outside work work-monp");
    await expect(
      repository.update(MONP, OPENING, {
        clues: [{ id: "c", clue: "자기 회수", payoffSceneId: OPENING }],
      }),
    ).rejects.toThrow("A clue cannot pay off in its own scene.");
    await expect(
      repository.update(MONP, OPENING, {
        clues: [{ clue: "보관 회수", payoffSceneId: "plot-archived-ch1" }],
      }),
    ).rejects.toThrow("Archived payoff scene cannot be newly linked");

    const fixture = createPlotFixture();
    fixture.plotScenes[0].characterIds.push("character-seolha");
    fixture.plotScenes[0].clues[0].payoffSceneId = "plot-archived-ch1";
    const preserving = createRepository(fixture);
    const updated = await preserving.update(MONP, OPENING, {
      summary: "보관된 참조 유지",
    });
    expect(updated.characterIds).toContain("character-seolha");
    expect(updated.clues[0].payoffSceneId).toBe("plot-archived-ch1");
  });

  it("archives and restores scenes without deleting relations or changing order", async () => {
    const state = createFixtureContentRelationState(createPlotFixture());
    const plots = createRepository(state);
    const relations = createFixtureRelationRepository(state, {
      createId: () => "relation-plot",
      now: () => TIME,
    });
    await relations.create(MONP, {
      source: { type: "character", id: "character-yeonhwa" },
      target: { type: "plot", id: "plot-gate" },
      relationType: "appears-in",
      label: "등장 장면",
    });

    const archived = await plots.archive(MONP, "plot-gate");
    expect(archived).toMatchObject({ archivedAt: TIME, order: 2 });
    expect(await chapterIds(plots, "plot01")).not.toContain("plot-gate");
    const restored = await plots.restore(MONP, "plot-gate");
    expect(restored).toMatchObject({ archivedAt: null, order: 2 });
    await expect(
      relations.list(MONP, { type: "plot", id: "plot-gate" }),
    ).resolves.toEqual([expect.objectContaining({ id: "relation-plot" })]);
  });
});
