import {
  characterDetailPath,
  plotDetailPath,
  settingDetailPath,
  workEntryDetailPath,
  worldDetailPath,
} from "../../app/paths";
import { IDEA_STATUS_TRANSITIONS } from "../../domain/schemas";

export {
  editableRelation,
  endpointKey,
  normalizeRelationDrafts,
  parseCommaSeparated,
  relationCandidatePath,
  sameEndpoint,
} from "../../shared/relations/relationDrafts";
export {
  IDEA_CONVERSION_TARGETS,
  IDEA_ORIGIN_RELATION_LABEL,
} from "../../data/repositories/ideaConverter";
export { canTransitionIdea } from "../../data/repositories/fixtureIdeaRepository";
export { IDEA_STATUS_TRANSITIONS };

export const IDEA_PRIORITIES = Object.freeze([
  ["high", "높음"],
  ["medium", "보통"],
  ["low", "낮음"],
]);
export const IDEA_PRIORITY_LABELS = new Map(IDEA_PRIORITIES);

export const IDEA_STATUSES = Object.freeze([
  ["seed", "씨앗"],
  ["developing", "발전 중"],
  ["ready", "검토 완료"],
  ["adopted", "채택"],
  ["discarded", "보류"],
]);
export const IDEA_STATUS_LABELS = new Map(IDEA_STATUSES);

// Verb labels for moving an idea along its development flow.
export const IDEA_TRANSITION_ACTIONS = Object.freeze({
  seed: "씨앗으로 되돌리기",
  developing: "발전 시작",
  ready: "검토 완료로 표시",
  discarded: "보류하기",
});

export const isAllIdeaCategory = (menuItem) =>
  menuItem?.id === "idea00" || menuItem?.filterConfig?.scope === "all";

export const isConcreteIdeaCategory = (menuItem) =>
  menuItem?.sectionId === "idea" &&
  menuItem?.resourceType === "idea" &&
  menuItem?.filterConfig?.scope === "category" &&
  !menuItem.archivedAt;

export const ideaBelongsToMenu = (idea, menuItem) =>
  isAllIdeaCategory(menuItem)
    ? idea?.resourceType === "idea"
    : idea?.categoryId === menuItem?.id;

/** Detail path of a converted target, resolved from its menu item id. */
export const conversionTargetPath = (workId, endpoint, menuItemId) => {
  if (!endpoint || !menuItemId) return null;
  if (endpoint.type === "plot") return plotDetailPath(workId, menuItemId, endpoint.id);
  if (endpoint.type === "setting") return settingDetailPath(workId, menuItemId, endpoint.id);
  if (endpoint.type === "world") return worldDetailPath(workId, menuItemId, endpoint.id);
  if (endpoint.type === "character") return characterDetailPath(workId, menuItemId, endpoint.id);
  return workEntryDetailPath(workId, endpoint.type, menuItemId, endpoint.id);
};
