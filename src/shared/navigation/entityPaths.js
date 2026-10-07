import {
  characterDetailPath,
  ideaDetailPath,
  memoDetailPath,
  plotDetailPath,
  settingDetailPath,
  workEntryDetailPath,
  worldDetailPath,
} from "../../app/paths";

export const KIND_LABELS = new Map([
  ["character", "캐릭터"],
  ["world", "세계관"],
  ["plot", "플롯 장면"],
  ["setting", "설정 자료"],
  ["idea", "아이디어"],
  ["memo", "메모"],
  ["content", "자료"],
]);

// Route section id → exploration kind. Unknown (user-defined) sections are generic content.
const SECTION_KINDS = new Map([
  ["characters", "character"],
  ["world", "world"],
  ["plot", "plot"],
  ["setting", "setting"],
  ["idea", "idea"],
  ["memo", "memo"],
]);

export const kindForSection = (sectionId) => SECTION_KINDS.get(sectionId) ?? "content";

/** Detail URL for an indexed entity ({ kind, endpoint, menuItemId, sectionId }). */
export const entityDetailPath = (workId, entity) => {
  const { id } = entity.endpoint;
  switch (entity.kind) {
    case "character": return characterDetailPath(workId, entity.menuItemId, id);
    case "world": return worldDetailPath(workId, entity.menuItemId, id);
    case "plot": return plotDetailPath(workId, entity.menuItemId, id);
    case "setting": return settingDetailPath(workId, entity.menuItemId, id);
    case "idea": return ideaDetailPath(workId, entity.menuItemId, id);
    case "memo": return memoDetailPath(workId, entity.menuItemId, id);
    default:
      return entity.sectionId
        ? workEntryDetailPath(workId, entity.sectionId, entity.menuItemId, id)
        : null;
  }
};

/** `{ kind, id }` for a detail URL, or null for lists, editors, and other pages. */
export const parseEntityDetailPath = (pathname) => {
  const match = /^\/works\/([^/]+)\/([^/]+)\/([^/]+)\/([^/]+)\/?$/.exec(pathname);
  if (!match) return null;
  const [, workId, sectionId, , entryId] = match.map((part) => decodeURIComponent(part ?? ""));
  if (entryId === "new") return null;
  return { id: entryId, kind: kindForSection(sectionId), workId };
};
