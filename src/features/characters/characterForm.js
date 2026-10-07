export const defaultProfileTheme = {
  labelBackground: "#eeeeee",
  labelText: "#3f3f3f",
  autoText: true,
};

export const characterTextFields = [
  ["name", "이름", true],
  ["hanjaName", "한자 이름"],
  ["englishName", "영문 이름"],
  ["birthplace", "출생지"],
  ["birthDate", "생년월일"],
  ["age", "나이"],
  ["height", "키"],
  ["weight", "몸무게"],
  ["occupation", "직업"],
  ["alignment", "성향"],
  ["affiliation", "소속"],
  ["faction", "파벌"],
  ["themeSong", "테마곡"],
];

export const characterLongFields = [
  ["likes", "선호"],
  ["dislikes", "비호"],
  ["martialArts", "무공, 특성"],
  ["personality", "성격"],
  ["appearance", "외형"],
  ["summary", "요약"],
  ["notes", "특이사항"],
];

const emptyFields = Object.fromEntries(
  [...characterTextFields, ...characterLongFields].map(([key]) => [key, ""]),
);

export const createCharacterDraft = (character, initialRegionId = "") => ({
  ...emptyFields,
  imageUrl: "",
  regionId: initialRegionId,
  species: "인간",
  gender: "남",
  type: "",
  profileTheme: { ...defaultProfileTheme },
  ...(character
    ? {
        ...Object.fromEntries(
          Object.keys(emptyFields).map((key) => [key, character[key] ?? ""]),
        ),
        imageUrl: character.imageUrl ?? "",
        regionId: character.regionId,
        species: character.species,
        gender: character.gender,
        type: character.type,
        profileTheme: {
          ...defaultProfileTheme,
          ...character.profileTheme,
        },
      }
    : {}),
});

export const normalizeCharacterPayload = (draft) => {
  const species = draft.species === "마물" ? "마물" : "인간";

  return {
    ...draft,
    name: draft.name.trim(),
    species,
    gender: species === "인간" ? draft.gender || "남" : "",
    type: species === "마물" ? draft.type || "마물" : "",
    profileTheme: { ...draft.profileTheme },
  };
};

const endpointKey = (endpoint) =>
  endpoint ? JSON.stringify([endpoint.type, endpoint.id]) : "";

export const sameEndpoint = (first, second) =>
  endpointKey(first) === endpointKey(second);

export const editableRelation = (relation) => ({
  ...(relation.id ? { id: relation.id } : {}),
  bidirectional: Boolean(relation.bidirectional),
  label: relation.label,
  notes: relation.notes ?? "",
  relationType: relation.relationType,
  target: { ...relation.target },
});

export const normalizeRelationDrafts = (drafts, source) => {
  const targets = new Set();

  return drafts.map((draft) => {
    const relationType = String(draft.relationType ?? "").trim();
    const label = String(draft.label ?? "").trim();
    const target = draft.target;
    const targetIdentity = endpointKey(target);

    if (!relationType || !label || !target?.type || !target?.id) {
      throw new Error("관계 종류, 이름, 대상을 모두 입력해 주세요.");
    }
    if (source && sameEndpoint(source, target)) {
      throw new Error("자기 자신을 관계 대상으로 선택할 수 없습니다.");
    }
    if (targets.has(targetIdentity)) {
      throw new Error("같은 관계 대상을 두 번 추가할 수 없습니다.");
    }
    targets.add(targetIdentity);

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

export const characterDraftSnapshot = (draft, relations, imageFile) =>
  JSON.stringify({
    draft,
    imageFile: imageFile
      ? {
          lastModified: imageFile.lastModified,
          name: imageFile.name,
          size: imageFile.size,
          type: imageFile.type,
        }
      : null,
    relations: relations.map(editableRelation),
  });

export const getReadableTextColor = (backgroundColor) => {
  const hex = backgroundColor.replace("#", "");
  const normalized =
    hex.length === 3
      ? hex
          .split("")
          .map((value) => value + value)
          .join("")
      : hex;
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  const brightness = (red * 299 + green * 587 + blue * 114) / 1000;

  return brightness > 150 ? "#111111" : "#ffffff";
};
