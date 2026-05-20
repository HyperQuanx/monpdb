import { characterRegions } from "../../app/menuSections";

export const getCharacterRegion = (regionId) =>
  characterRegions.find((region) => region.id === regionId) ??
  characterRegions[0];

export const getCharacterRegionPath = (regionId) =>
  getCharacterRegion(regionId).path;

export const getCharacterRegionFromPathname = (pathname) =>
  characterRegions.find(
    (region) =>
      pathname === region.path || pathname.startsWith(`${region.path}/`),
  ) ?? characterRegions[0];

export const characterSpeciesOptions = ["인간", "마물"];
export const characterGenderOptions = ["남", "여"];

export const getCharacterSpecies = (character) =>
  characterSpeciesOptions.includes(character?.species)
    ? character.species
    : "인간";

export const isMonsterCharacter = (character) =>
  getCharacterSpecies(character) === "마물";

export const profileDraftKeys = [
  "name",
  "imageUrl",
  "species",
  "birthplace",
  "gender",
  "type",
  "birthDate",
  "age",
  "height",
  "weight",
  "occupation",
  "alignment",
  "affiliation",
  "faction",
  "likes",
  "dislikes",
  "martialArts",
  "personality",
  "appearance",
  "themeSong",
  "notes",
];

export const getProfileFields = (character) => [
  ["name", "이름"],
  ["species", "종족"],
  ["birthplace", "출생지"],
  [
    isMonsterCharacter(character) ? "type" : "gender",
    isMonsterCharacter(character) ? "구분" : "성별",
  ],
  ["birthDate", "생년월일"],
  ["age", "나이"],
  ["height", "키"],
  ["weight", "몸무게"],
  ["occupation", "직업"],
  ["alignment", "성향"],
  ["affiliation", "소속"],
  ["faction", "파벌"],
  ["likes", "선호"],
  ["dislikes", "비호"],
  ["martialArts", "무공, 특성"],
  ["personality", "성격"],
  ["appearance", "외형"],
  ["themeSong", "테마곡"],
  ["notes", "특이사항"],
];

export const getCharacterCoverImage = (character) => {
  if (character?.imageUrl) {
    return character.imageUrl;
  }

  if (isMonsterCharacter(character)) {
    const type = character?.type?.toLowerCase() ?? "";

    if (type.includes("악마") || type.includes("demon")) {
      return "/coverImage/cover_image_demon.png";
    }

    return "/coverImage/cover_image_monster.png";
  }

  return character?.gender === "여"
    ? "/coverImage/cover_image_woman.png"
    : "/coverImage/cover_image_man.png";
};
