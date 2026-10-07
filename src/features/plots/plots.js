export {
  editableRelation,
  endpointKey,
  normalizeRelationDrafts,
  parseCommaSeparated,
  relationCandidatePath,
  sameEndpoint,
} from "../../shared/relations/relationDrafts";
export {
  countUnresolvedClues,
  isPlotClueResolved,
} from "../../data/repositories/fixturePlotRepository";

export const PLOT_SCENE_STATUSES = Object.freeze([
  ["planned", "구상"],
  ["draft", "초고"],
  ["revised", "퇴고"],
  ["final", "완료"],
]);

export const PLOT_STATUS_LABELS = new Map(PLOT_SCENE_STATUSES);

export const isAllPlotChapter = (menuItem) =>
  menuItem?.id === "plot00" || menuItem?.filterConfig?.scope === "all";

export const isConcretePlotChapter = (menuItem) =>
  menuItem?.sectionId === "plot" &&
  menuItem?.resourceType === "plot" &&
  menuItem?.filterConfig?.scope === "category" &&
  !menuItem.archivedAt;

export const sceneBelongsToMenu = (scene, menuItem) =>
  isAllPlotChapter(menuItem)
    ? scene?.resourceType === "plot"
    : scene?.chapterId === menuItem?.id;

/**
 * Groups scenes by chapter following the live (user-reorderable) menu order.
 * Scenes whose chapter is missing from the menu list are grouped last.
 */
export const groupScenesByChapter = (scenes, chapters) => {
  const groups = new Map(
    chapters
      .filter((chapter) => !isAllPlotChapter(chapter))
      .map((chapter) => [chapter.id, { chapter, scenes: [] }]),
  );
  for (const scene of scenes) {
    if (!groups.has(scene.chapterId)) {
      groups.set(scene.chapterId, {
        chapter: {
          archivedAt: null,
          id: scene.chapterId,
          label: scene.chapterName || scene.chapterId,
        },
        scenes: [],
      });
    }
    groups.get(scene.chapterId).scenes.push(scene);
  }
  return [...groups.values()].filter(({ scenes: grouped }) => grouped.length > 0);
};
