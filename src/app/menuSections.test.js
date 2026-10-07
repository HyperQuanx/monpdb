import { describe, expect, it } from "vitest";
import {
  characterRegions,
  getHeaderTitle,
  menuSections,
} from "./menuSections";

describe("menuSections", () => {
  it("keeps the six existing sections and 31 unique menu links", () => {
    const links = menuSections.flatMap((section) => section.links);

    expect(menuSections.map(({ id }) => id)).toEqual([
      "characters",
      "world",
      "plot",
      "setting",
      "idea",
      "memo",
    ]);
    expect(links).toHaveLength(31);
    expect(new Set(links.map(({ path }) => path)).size).toBe(31);
    expect(
      links.every(
        ({ archivedAt, id, order, resourceType, slug }) =>
          id &&
          slug &&
          resourceType &&
          Number.isInteger(order) &&
          archivedAt === null,
      ),
    ).toBe(true);
  });

  it("keeps all 13 character regions in menu order", () => {
    expect(characterRegions).toHaveLength(13);
    expect(characterRegions[0]).toEqual({
      id: "characters00",
      label: "전체",
      path: "/characters00",
    });
    expect(characterRegions.at(-1)).toEqual({
      id: "characters12",
      label: "귀곡성",
      path: "/characters12",
    });
    expect(
      menuSections[0].links.map(({ label, path }) => ({ label, path })),
    ).toEqual(characterRegions.map(({ label, path }) => ({ label, path })));
  });
});

describe("getHeaderTitle", () => {
  it("uses the section and link labels for exact menu paths", () => {
    expect(getHeaderTitle("/characters01")).toBe("캐릭터-동부평야지대");
    expect(getHeaderTitle("/plot03")).toBe("플롯-Chapter3");
    expect(getHeaderTitle("/setting02")).toBe("설정-서버 통합");
    expect(getHeaderTitle("/works/manage")).toBe("작품 관리");
  });

  it("uses work-scoped menu and reserved navigation titles", () => {
    expect(getHeaderTitle("/works/work-monp", "MONP")).toBe("MONP");
    expect(
      getHeaderTitle(
        "/works/work-monp/characters/characters01/character-yeonhwa",
        "MONP",
      ),
    ).toBe("캐릭터-동부평야지대");
    expect(getHeaderTitle("/works/work-monp/search", "MONP")).toBe("검색");
    expect(getHeaderTitle("/works/work-monp/recent", "MONP")).toBe(
      "최근 항목",
    );
  });

  it("keeps the character region title on create and detail paths", () => {
    expect(getHeaderTitle("/characters07/new")).toBe("캐릭터-생사의 탑");
    expect(getHeaderTitle("/characters12/character-1")).toBe(
      "캐릭터-귀곡성",
    );
  });

  it("falls back to the product title for unknown paths", () => {
    expect(getHeaderTitle("/not-registered")).toBe("MONP Storage");
  });
});
