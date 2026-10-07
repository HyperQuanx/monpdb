const encodeSegment = (value) => encodeURIComponent(String(value));

export const workManagePath = () => "/works/manage";
export const menuManagePath = () => "/menu/manage";

export const workHomePath = (workId) => `/works/${encodeSegment(workId)}`;

export const workMenuPath = (workId, sectionId, menuItemId) =>
  `${workHomePath(workId)}/${encodeSegment(sectionId)}/${encodeSegment(menuItemId)}`;

export const workEntryNewPath = (workId, sectionId, menuItemId) =>
  `${workMenuPath(workId, sectionId, menuItemId)}/new`;

export const workEntryDetailPath = (
  workId,
  sectionId,
  menuItemId,
  entryId,
) => `${workMenuPath(workId, sectionId, menuItemId)}/${encodeSegment(entryId)}`;

export const workEntryEditPath = (
  workId,
  sectionId,
  menuItemId,
  entryId,
) => `${workEntryDetailPath(workId, sectionId, menuItemId, entryId)}/edit`;

export const workSearchPath = (workId) => `${workHomePath(workId)}/search`;
export const workRecentPath = (workId) => `${workHomePath(workId)}/recent`;
export const workArchivePath = (workId) => `${workHomePath(workId)}/archive`;
export const workBackupPath = (workId) => `${workHomePath(workId)}/backup`;
export const workRelationsPath = (workId, focus) =>
  `${workHomePath(workId)}/relations${
    focus ? `?focus=${encodeURIComponent(`${focus.type}:${focus.id}`)}` : ""
  }`;

export const characterListPath = (workId, regionId) =>
  workMenuPath(workId, "characters", regionId);

export const characterCreatePath = (workId, regionId) =>
  workEntryNewPath(workId, "characters", regionId);

export const characterDetailPath = (workId, regionId, characterId) =>
  workEntryDetailPath(workId, "characters", regionId, characterId);

export const characterEditPath = (workId, regionId, characterId) =>
  workEntryEditPath(workId, "characters", regionId, characterId);

export const worldListPath = (workId, regionId) =>
  workMenuPath(workId, "world", regionId);

export const worldCreatePath = (workId, regionId) =>
  workEntryNewPath(workId, "world", regionId);

export const worldDetailPath = (workId, regionId, worldId) =>
  workEntryDetailPath(workId, "world", regionId, worldId);

export const worldEditPath = (workId, regionId, worldId) =>
  workEntryEditPath(workId, "world", regionId, worldId);

export const plotListPath = (workId, chapterId) =>
  workMenuPath(workId, "plot", chapterId);

export const plotCreatePath = (workId, chapterId) =>
  workEntryNewPath(workId, "plot", chapterId);

export const plotDetailPath = (workId, chapterId, sceneId) =>
  workEntryDetailPath(workId, "plot", chapterId, sceneId);

export const plotEditPath = (workId, chapterId, sceneId) =>
  workEntryEditPath(workId, "plot", chapterId, sceneId);

export const settingListPath = (workId, categoryId) =>
  workMenuPath(workId, "setting", categoryId);

export const settingCreatePath = (workId, categoryId) =>
  workEntryNewPath(workId, "setting", categoryId);

export const settingDetailPath = (workId, categoryId, settingId) =>
  workEntryDetailPath(workId, "setting", categoryId, settingId);

export const settingEditPath = (workId, categoryId, settingId) =>
  workEntryEditPath(workId, "setting", categoryId, settingId);

export const ideaListPath = (workId, categoryId) =>
  workMenuPath(workId, "idea", categoryId);

export const ideaCreatePath = (workId, categoryId) =>
  workEntryNewPath(workId, "idea", categoryId);

export const ideaDetailPath = (workId, categoryId, ideaId) =>
  workEntryDetailPath(workId, "idea", categoryId, ideaId);

export const ideaEditPath = (workId, categoryId, ideaId) =>
  workEntryEditPath(workId, "idea", categoryId, ideaId);

export const memoListPath = (workId, menuItemId) =>
  workMenuPath(workId, "memo", menuItemId);

export const memoCreatePath = (workId, menuItemId) =>
  workEntryNewPath(workId, "memo", menuItemId);

export const memoDetailPath = (workId, menuItemId, memoId) =>
  workEntryDetailPath(workId, "memo", menuItemId, memoId);

export const memoEditPath = (workId, menuItemId, memoId) =>
  workEntryEditPath(workId, "memo", menuItemId, memoId);

export const menuItemIdFromLegacyPath = (path) =>
  String(path).split(/[?#]/, 1)[0].replace(/^\/+|\/+$/g, "").split("/")[0];
