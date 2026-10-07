import { describe, expect, it } from "vitest";
import {
  getCharacterCoverImage,
  getCharacterRegion,
  getCharacterRegionFromPathname,
  getCharacterRegionLabel,
  getCharacterRegionPath,
  getCharacterSpecies,
  getProfileFields,
  isMonsterCharacter,
} from "./characters";

describe("character region helpers", () => {
  it("resolves known regions from ids and nested paths", () => {
    expect(getCharacterRegion("characters04").label).toBe("중부 숲지대");
    expect(getCharacterRegionLabel("characters11")).toBe("한야섬");
    expect(getCharacterRegionPath("characters02")).toBe("/characters02");
    expect(
      getCharacterRegionFromPathname("/characters09/character-1").id,
    ).toBe("characters09");
  });

  it("preserves the undecided label and defaults unknown regions to all", () => {
    expect(getCharacterRegionLabel("미정")).toBe("미정");
    expect(getCharacterRegion("unknown").id).toBe("characters00");
    expect(getCharacterRegionFromPathname("/unknown").id).toBe(
      "characters00",
    );
  });
});

describe("human and monster rules", () => {
  it("defaults missing or unsupported species to human", () => {
    expect(getCharacterSpecies({})).toBe("인간");
    expect(getCharacterSpecies({ species: "요괴" })).toBe("인간");
    expect(isMonsterCharacter({ species: "요괴" })).toBe(false);
  });

  it("uses gender for humans and type for monsters", () => {
    const humanKeys = getProfileFields({ species: "인간" }).map(
      ([key]) => key,
    );
    const monsterKeys = getProfileFields({ species: "마물" }).map(
      ([key]) => key,
    );

    expect(humanKeys).toContain("gender");
    expect(humanKeys).not.toContain("type");
    expect(monsterKeys).toContain("type");
    expect(monsterKeys).not.toContain("gender");
    expect(isMonsterCharacter({ species: "마물" })).toBe(true);
  });

  it("selects the existing cover image fallbacks", () => {
    expect(getCharacterCoverImage({ imageUrl: "/custom.png" })).toBe(
      "/custom.png",
    );
    expect(
      getCharacterCoverImage({ species: "마물", type: "상급 악마" }),
    ).toBe("/coverImage/cover_image_demon.png");
    expect(getCharacterCoverImage({ species: "마물", type: "괴수" })).toBe(
      "/coverImage/cover_image_monster.png",
    );
    expect(getCharacterCoverImage({ species: "인간", gender: "여" })).toBe(
      "/coverImage/cover_image_woman.png",
    );
    expect(getCharacterCoverImage({ species: "인간", gender: "남" })).toBe(
      "/coverImage/cover_image_man.png",
    );
  });
});
