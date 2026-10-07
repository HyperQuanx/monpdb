import {
  characterDetailPath,
  ideaDetailPath,
  plotDetailPath,
  settingDetailPath,
  workEntryDetailPath,
  worldDetailPath,
} from "../../app/paths";

// Relation draft helpers shared by specialized editors (World, Plot, ...).

export const endpointKey = (endpoint) =>
  endpoint ? JSON.stringify([endpoint.type, endpoint.id]) : "";

export const sameEndpoint = (first, second) =>
  Boolean(first && second) &&
  first.type === second.type &&
  first.id === second.id;

export const parseCommaSeparated = (value) => [
  ...new Set(
    String(value ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  ),
];

export const editableRelation = (relation) => ({
  ...(relation.id ? { id: relation.id } : {}),
  bidirectional: Boolean(relation.bidirectional),
  label: relation.label,
  notes: relation.notes ?? "",
  relationType: relation.relationType,
  target: relation.target,
});

export const normalizeRelationDrafts = (drafts, source) => {
  const targets = new Set();

  return drafts.map((draft) => {
    const relationType = String(draft.relationType ?? "").trim();
    const label = String(draft.label ?? "").trim();
    const target = draft.target;
    const targetKey = endpointKey(target);

    if (!relationType || !label || !target?.type || !target?.id) {
      throw new Error("관계 종류, 이름, 대상을 모두 입력해 주세요.");
    }
    if (source && sameEndpoint(source, target)) {
      throw new Error("자기 자신을 관계 대상으로 선택할 수 없습니다.");
    }
    if (targets.has(targetKey)) {
      throw new Error("같은 관계 대상을 두 번 추가할 수 없습니다.");
    }
    targets.add(targetKey);

    return {
      ...(draft.id ? { id: draft.id } : {}),
      bidirectional: Boolean(draft.bidirectional),
      label,
      notes: String(draft.notes ?? ""),
      relationType,
      target: { type: target.type, id: target.id },
    };
  });
};

export const relationCandidatePath = (workId, candidate) => {
  if (!candidate?.menuItemId) return null;
  const { id, type } = candidate.endpoint;
  if (type === "character") {
    return characterDetailPath(workId, candidate.menuItemId, id);
  }
  if (type === "world") {
    return worldDetailPath(workId, candidate.menuItemId, id);
  }
  if (type === "plot") {
    return plotDetailPath(workId, candidate.menuItemId, id);
  }
  if (type === "setting") {
    return settingDetailPath(workId, candidate.menuItemId, id);
  }
  if (type === "idea") {
    return ideaDetailPath(workId, candidate.menuItemId, id);
  }
  return workEntryDetailPath(workId, type, candidate.menuItemId, id);
};
