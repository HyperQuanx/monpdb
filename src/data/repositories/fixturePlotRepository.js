import { PlotSceneSchema } from "../../domain/schemas";
import { asFixtureContentRelationState } from "./fixtureContentRelationState";
import { assertPlotRepository } from "./plotRepository";

export const PLOT_ALL_CHAPTER_ID = "plot00";

const archiveStatuses = new Set(["active", "archived", "all"]);
const clone = (value) => structuredClone(value);
const normalizeSearchText = (value) =>
  String(value ?? "").trim().toLocaleLowerCase("ko-KR");
const emptyBody = { type: "doc", content: [] };
const searchableScalarFields = [
  "title",
  "summary",
  "event",
  "storyTime",
  "locationDetail",
];

const randomId = (prefix) =>
  globalThis.crypto?.randomUUID?.() ??
  `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

/**
 * A clue is resolved only while its payoff scene exists and is active.
 * Archiving the payoff scene makes the clue unresolved again.
 */
export const isPlotClueResolved = (clue, scenesById) => {
  if (!clue.payoffSceneId) return false;
  const payoff = scenesById.get(clue.payoffSceneId);
  return Boolean(payoff && !payoff.archivedAt);
};

export const countUnresolvedClues = (scene, scenesById) =>
  scene.clues.filter((clue) => !isPlotClueResolved(clue, scenesById)).length;

export const createFixturePlotRepository = (
  fixtureOrState,
  {
    createId = () => randomId("plot"),
    createClueId = () => randomId("clue"),
    now = () => new Date().toISOString(),
  } = {},
) => {
  const state = asFixtureContentRelationState(fixtureOrState);

  const assertWork = (fixture, workId) => {
    if (!fixture.works.some(({ id }) => id === workId)) {
      throw new Error(`Work not found: ${workId}`);
    }
  };

  const findScene = (fixture, workId, sceneId) => {
    assertWork(fixture, workId);
    const scene = fixture.plotScenes.find(
      (candidate) => candidate.workId === workId && candidate.id === sceneId,
    );
    if (!scene) {
      throw new Error(`Plot scene not found in work ${workId}: ${sceneId}`);
    }
    return scene;
  };

  const findConcreteChapter = (fixture, chapterId) => {
    if (!chapterId || chapterId === PLOT_ALL_CHAPTER_ID) {
      throw new Error("A concrete plot chapter is required.");
    }
    const menuItem = fixture.menuItems.find(({ id }) => id === chapterId);
    if (!menuItem) {
      throw new Error(`Plot chapter not found: ${chapterId}`);
    }
    if (
      menuItem.sectionId !== "plot" ||
      menuItem.resourceType !== "plot" ||
      menuItem.filterConfig.scope !== "category"
    ) {
      throw new Error(`Invalid plot chapter: ${chapterId}`);
    }
    const section = fixture.menuSections.find(
      ({ id }) => id === menuItem.sectionId,
    );
    if (menuItem.archivedAt || section?.archivedAt) {
      throw new Error(`Plot chapter is archived: ${chapterId}`);
    }
    return menuItem;
  };

  // New references must point to active same-work entities. References that
  // already existed before the target was archived are preserved.
  const assertReference = (collection, id, workId, label, previousIds) => {
    const entity = collection.find((candidate) => candidate.id === id);
    if (!entity) {
      throw new Error(`Unknown ${label}: ${id}`);
    }
    if (entity.workId !== workId) {
      throw new Error(`${label} is outside work ${workId}: ${id}`);
    }
    if (entity.archivedAt && !previousIds.has(id)) {
      throw new Error(`Archived ${label} cannot be newly linked: ${id}`);
    }
  };

  const normalizeReferences = (fixture, workId, sceneId, input, existing) => {
    const povCharacterId = input.povCharacterId || null;
    const locationWorldId = input.locationWorldId || null;
    const characterIds = [...new Set(input.characterIds ?? [])];
    const previousClues = new Map(
      (existing?.clues ?? []).map((clue) => [clue.id, clue]),
    );
    const usedClueIds = new Set();
    const clues = (input.clues ?? []).map((clue) => {
      let id = clue.id ? String(clue.id) : createClueId();
      if (usedClueIds.has(id)) {
        throw new Error(`Duplicate clue id: ${id}`);
      }
      usedClueIds.add(id);
      return {
        id,
        clue: String(clue.clue ?? "").trim(),
        payoffSceneId: clue.payoffSceneId || null,
        notes: String(clue.notes ?? ""),
      };
    });

    if (povCharacterId) {
      assertReference(
        fixture.characters,
        povCharacterId,
        workId,
        "POV character",
        new Set(existing?.povCharacterId ? [existing.povCharacterId] : []),
      );
    }
    const previousCharacters = new Set(existing?.characterIds ?? []);
    for (const characterId of characterIds) {
      assertReference(
        fixture.characters,
        characterId,
        workId,
        "scene character",
        previousCharacters,
      );
    }
    if (locationWorldId) {
      assertReference(
        fixture.worlds,
        locationWorldId,
        workId,
        "location world",
        new Set(existing?.locationWorldId ? [existing.locationWorldId] : []),
      );
    }
    for (const clue of clues) {
      if (!clue.payoffSceneId) continue;
      if (clue.payoffSceneId === sceneId) {
        throw new Error("A clue cannot pay off in its own scene.");
      }
      const previousPayoff = previousClues.get(clue.id)?.payoffSceneId;
      assertReference(
        fixture.plotScenes,
        clue.payoffSceneId,
        workId,
        "payoff scene",
        new Set(previousPayoff ? [previousPayoff] : []),
      );
    }

    return { characterIds, clues, locationWorldId, povCharacterId };
  };

  const chapterSiblings = (scenes, workId, chapterId, excludedId) =>
    scenes
      .filter(
        (scene) =>
          scene.workId === workId &&
          scene.chapterId === chapterId &&
          scene.id !== excludedId,
      )
      .sort((first, second) => first.order - second.order);

  /**
   * Places `moving` in `chapter` at `index` among active scenes, renumbers the
   * target chapter (archived scenes keep their relative order after active
   * ones), and closes the gap in the source chapter.
   */
  const placeScene = (fixture, moving, chapter, index) => {
    const siblings = chapterSiblings(
      fixture.plotScenes,
      moving.workId,
      chapter.id,
      moving.id,
    );
    const active = siblings.filter(({ archivedAt }) => !archivedAt);
    const archived = siblings.filter(({ archivedAt }) => archivedAt);
    const insertAt = Math.min(
      Math.max(Number.isInteger(index) ? index : active.length, 0),
      active.length,
    );
    const targetOrder = moving.archivedAt
      ? [...active, ...archived, moving]
      : [
          ...active.slice(0, insertAt),
          moving,
          ...active.slice(insertAt),
          ...archived,
        ];
    const orders = new Map(targetOrder.map(({ id }, order) => [id, order]));
    const previousChapterId = fixture.plotScenes.find(
      ({ id }) => id === moving.id,
    )?.chapterId;
    if (previousChapterId && previousChapterId !== chapter.id) {
      chapterSiblings(
        fixture.plotScenes,
        moving.workId,
        previousChapterId,
        moving.id,
      ).forEach(({ id }, order) => orders.set(id, order));
    }

    const timestamp = moving.updatedAt;
    const placed = PlotSceneSchema.parse({
      ...moving,
      menuItemId: chapter.id,
      chapterId: chapter.id,
      chapterName: chapter.label,
      order: orders.get(moving.id),
    });
    const exists = fixture.plotScenes.some(({ id }) => id === moving.id);
    const baseScenes = exists
      ? fixture.plotScenes
      : [...fixture.plotScenes, placed];
    state.replacePlotScenes(
      baseScenes.map((scene) => {
        if (scene.id === placed.id && scene.workId === placed.workId) {
          return placed;
        }
        if (scene.workId !== moving.workId || !orders.has(scene.id)) {
          return scene;
        }
        const order = orders.get(scene.id);
        return order === scene.order
          ? scene
          : { ...scene, order, updatedAt: timestamp };
      }),
    );
    return clone(placed);
  };

  const replaceScene = (fixture, updated) => {
    state.replacePlotScenes(
      fixture.plotScenes.map((scene) =>
        scene.workId === updated.workId && scene.id === updated.id
          ? updated
          : scene,
      ),
    );
    return clone(updated);
  };

  const repository = {
    async list({
      workId,
      chapterId,
      q,
      status,
      unresolved = false,
      archiveStatus = "active",
    } = {}) {
      const fixture = state.read();
      assertWork(fixture, workId);
      if (!archiveStatuses.has(archiveStatus)) {
        throw new Error(`Invalid plot archive status: ${archiveStatus}`);
      }
      const normalizedQuery = normalizeSearchText(q);
      const normalizedStatus = String(status ?? "").trim();
      const scenesById = new Map(
        fixture.plotScenes
          .filter((scene) => scene.workId === workId)
          .map((scene) => [scene.id, scene]),
      );
      const chapterOrder = new Map(
        fixture.menuItems
          .filter(({ sectionId }) => sectionId === "plot")
          .map(({ id, order }) => [id, order]),
      );

      return clone(
        [...scenesById.values()]
          .filter((scene) => {
            const matchesArchive =
              archiveStatus === "all" ||
              (archiveStatus === "archived"
                ? Boolean(scene.archivedAt)
                : !scene.archivedAt);
            const matchesChapter =
              !chapterId ||
              chapterId === PLOT_ALL_CHAPTER_ID ||
              scene.chapterId === chapterId;
            const matchesStatus =
              !normalizedStatus || scene.status === normalizedStatus;
            const matchesUnresolved =
              !unresolved || countUnresolvedClues(scene, scenesById) > 0;
            const matchesSearch =
              !normalizedQuery ||
              searchableScalarFields.some((field) =>
                normalizeSearchText(scene[field]).includes(normalizedQuery),
              ) ||
              scene.tags.some((tag) =>
                normalizeSearchText(tag).includes(normalizedQuery),
              ) ||
              scene.clues.some((clue) =>
                normalizeSearchText(clue.clue).includes(normalizedQuery),
              );

            return (
              matchesArchive &&
              matchesChapter &&
              matchesStatus &&
              matchesUnresolved &&
              matchesSearch
            );
          })
          .sort(
            (first, second) =>
              (chapterOrder.get(first.chapterId) ?? 0) -
                (chapterOrder.get(second.chapterId) ?? 0) ||
              first.order - second.order,
          ),
      );
    },

    async get(workId, sceneId) {
      const fixture = state.read();
      return clone(findScene(fixture, workId, sceneId));
    },

    async create(workId, sceneData = {}) {
      const fixture = state.read();
      assertWork(fixture, workId);
      const input = clone(sceneData);
      const chapter = findConcreteChapter(fixture, input.chapterId);
      const id = createId();
      if (fixture.plotScenes.some((scene) => scene.id === id)) {
        throw new Error(`Duplicate plot scene id: ${id}`);
      }
      const references = normalizeReferences(fixture, workId, id, input);
      const timestamp = now();
      const scene = PlotSceneSchema.parse({
        summary: "",
        status: "planned",
        storyTime: "",
        locationDetail: "",
        event: "",
        ...input,
        ...references,
        id,
        workId,
        menuItemId: chapter.id,
        resourceType: "plot",
        chapterId: chapter.id,
        chapterName: chapter.label,
        title: String(input.title ?? "").trim(),
        body: clone(input.body ?? emptyBody),
        tags: clone(input.tags ?? []),
        order: 0,
        version: 1,
        archivedAt: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      });

      return placeScene(fixture, scene, chapter);
    },

    async update(workId, sceneId, updates = {}) {
      const fixture = state.read();
      const existing = findScene(fixture, workId, sceneId);
      const input = clone(updates);
      const chapter = findConcreteChapter(
        fixture,
        input.chapterId ?? existing.chapterId,
      );
      const references = normalizeReferences(
        fixture,
        workId,
        existing.id,
        {
          povCharacterId: existing.povCharacterId,
          locationWorldId: existing.locationWorldId,
          characterIds: existing.characterIds,
          clues: existing.clues,
          ...input,
        },
        existing,
      );
      const updated = PlotSceneSchema.parse({
        ...existing,
        ...input,
        ...references,
        id: existing.id,
        workId: existing.workId,
        menuItemId: existing.menuItemId,
        resourceType: "plot",
        chapterId: existing.chapterId,
        chapterName: existing.chapterName,
        title: String(input.title ?? existing.title).trim(),
        body: clone(input.body ?? existing.body),
        tags: clone(input.tags ?? existing.tags),
        order: existing.order,
        version: existing.version + 1,
        archivedAt: existing.archivedAt,
        createdAt: existing.createdAt,
        updatedAt: now(),
      });

      if (chapter.id !== existing.chapterId) {
        // Changing the chapter appends the scene to the new chapter.
        return placeScene(fixture, updated, chapter);
      }
      return replaceScene(fixture, updated);
    },

    async move(workId, sceneId, { chapterId, index } = {}) {
      const fixture = state.read();
      const existing = findScene(fixture, workId, sceneId);
      if (existing.archivedAt) {
        throw new Error(`Archived plot scene cannot be moved: ${sceneId}`);
      }
      const chapter = findConcreteChapter(
        fixture,
        chapterId ?? existing.chapterId,
      );
      return placeScene(
        fixture,
        {
          ...existing,
          version: existing.version + 1,
          updatedAt: now(),
        },
        chapter,
        index,
      );
    },

    async archive(workId, sceneId) {
      const fixture = state.read();
      const existing = findScene(fixture, workId, sceneId);
      if (existing.archivedAt) {
        return clone(existing);
      }
      const timestamp = now();
      return replaceScene(
        fixture,
        PlotSceneSchema.parse({
          ...existing,
          archivedAt: timestamp,
          updatedAt: timestamp,
          version: existing.version + 1,
        }),
      );
    },

    async restore(workId, sceneId) {
      const fixture = state.read();
      const existing = findScene(fixture, workId, sceneId);
      if (!existing.archivedAt) {
        return clone(existing);
      }
      findConcreteChapter(fixture, existing.chapterId);
      return replaceScene(
        fixture,
        PlotSceneSchema.parse({
          ...existing,
          archivedAt: null,
          updatedAt: now(),
          version: existing.version + 1,
        }),
      );
    },
  };

  return assertPlotRepository(repository);
};
