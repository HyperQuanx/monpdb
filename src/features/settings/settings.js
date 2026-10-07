import {
  SETTING_FIELD_KEYS,
  SETTING_OWNER_RELATION_TYPE,
} from "../../domain/schemas";

export {
  editableRelation,
  endpointKey,
  normalizeRelationDrafts,
  parseCommaSeparated,
  relationCandidatePath,
  sameEndpoint,
} from "../../shared/relations/relationDrafts";
export { SETTING_FIELD_KEYS, SETTING_OWNER_RELATION_TYPE };

// Business logic keys off stable field keys and menu configuration, never off
// menu labels, so categories can be renamed freely (e.g. 서버 → 무기).
export const SETTING_FIELDS = Object.freeze([
  ["grade", "등급"],
  ["effect", "효과"],
  ["condition", "발동 조건"],
  ["limitation", "제한"],
  ["owners", "사용자"],
]);

export const SETTING_FIELD_LABELS = new Map(SETTING_FIELDS);
export const OWNER_RELATION_LABEL = "사용자";

export const isAllSettingCategory = (menuItem) =>
  menuItem?.id === "setting00" || menuItem?.filterConfig?.scope === "all";

export const isConcreteSettingCategory = (menuItem) =>
  menuItem?.sectionId === "setting" &&
  menuItem?.resourceType === "setting" &&
  menuItem?.filterConfig?.scope === "category" &&
  !menuItem.archivedAt;

export const settingBelongsToMenu = (setting, menuItem) =>
  isAllSettingCategory(menuItem)
    ? setting?.resourceType === "setting"
    : setting?.categoryId === menuItem?.id;

/** Enabled field keys for a category; an unset config enables every field. */
export const enabledSettingFields = (category) => {
  const fields = category?.filterConfig?.fields;
  return Array.isArray(fields) ? fields : [...SETTING_FIELD_KEYS];
};

export const isOwnerRelation = (relation) =>
  relation.relationType === SETTING_OWNER_RELATION_TYPE;
