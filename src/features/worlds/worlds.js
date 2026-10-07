export {
  editableRelation,
  endpointKey,
  normalizeRelationDrafts,
  parseCommaSeparated,
  relationCandidatePath,
  sameEndpoint,
} from "../../shared/relations/relationDrafts";

export const WORLD_CATEGORIES = Object.freeze([
  ["region", "지역"],
  ["era", "시대"],
  ["rule", "규칙"],
  ["history", "역사"],
  ["culture", "문화"],
  ["faction", "세력"],
  ["place", "장소"],
]);

export const WORLD_CATEGORY_LABELS = new Map(WORLD_CATEGORIES);

export const isAllWorldRegion = (menuItem) =>
  menuItem?.id === "world00" || menuItem?.filterConfig?.scope === "all";

export const isConcreteWorldRegion = (menuItem) =>
  menuItem?.sectionId === "world" &&
  menuItem?.resourceType === "world" &&
  menuItem?.filterConfig?.scope === "category" &&
  !menuItem.archivedAt;

export const worldBelongsToMenu = (world, menuItem) =>
  isAllWorldRegion(menuItem)
    ? world?.resourceType === "world"
    : world?.regionId === menuItem?.id;
