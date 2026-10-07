import { describe, expect, it } from "vitest";
import { appFixture, rawAppFixture } from "../data/fixtures/appFixture";
import { createGenericContentFixture } from "../test/genericContentFixture";
import { AppFixtureSchema, WorldSchema, parseAppFixture } from "./schemas";

const cloneFixture = () => structuredClone(rawAppFixture);
// Built-in sections are all specialized; generic content needs a custom section.
const cloneGenericFixture = () => createGenericContentFixture(rawAppFixture);

describe("WorldSchema", () => {
  it("validates the complete specialized World record and canonical body", () => {
    const world = WorldSchema.parse(appFixture.worlds[0]);

    expect(world).toEqual({
      id: "world-east-plains",
      workId: "work-monp",
      menuItemId: "world01",
      resourceType: "world",
      category: "region",
      regionId: "world01",
      regionName: "동부평야지대",
      title: "동부평야지대",
      summary: "비옥한 평야와 오래된 문파들이 자리한 동부 지역",
      era: "천무력 412년 이후",
      rules: "문파 간 교역로 보호 협약이 적용된다.",
      history: "대홍수 이후 수로를 복구하며 여러 도시가 연합했다.",
      culture: "곡물 축제와 검술 비무가 계절마다 열린다.",
      factions: ["청운문", "동부 상인 연합"],
      places: ["청운문", "동부 교역로", "풍요 평야"],
      body: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "넓은 곡창과 교역로가 이어진다." }],
          },
        ],
      },
      tags: ["지역", "동부"],
      status: "draft",
      order: 0,
      version: 1,
      archivedAt: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    expect(() =>
      WorldSchema.parse({ ...world, category: "unstable-category" }),
    ).toThrow();
  });
});

describe("AppFixtureSchema", () => {
  it("validates the complete work, menu, content, character, World, Plot, and relation fixture", () => {
    expect(AppFixtureSchema.parse(appFixture)).toEqual(appFixture);
    expect(appFixture.works).toHaveLength(2);
    expect(new Set(appFixture.works.map(({ slug }) => slug)).size).toBe(2);
    expect(appFixture.menuSections).toHaveLength(6);
    expect(appFixture.menuItems).toHaveLength(31);
    expect(appFixture.characters.length).toBeGreaterThanOrEqual(3);
    expect(appFixture.contents).toEqual([]);
    expect(appFixture.ideas).toEqual([
      expect.objectContaining({
        id: "idea-dialogue-mist",
        resourceType: "idea",
        categoryId: "idea02",
        status: "developing",
      }),
    ]);
    expect(appFixture.memos.map(({ id }) => id)).toEqual([
      "memo-next-session",
      "memo-research",
    ]);
    expect(appFixture.plotScenes).toEqual([
      expect.objectContaining({
        id: "plot-chapter-one-opening",
        resourceType: "plot",
        chapterId: "plot01",
        menuItemId: "plot01",
      }),
    ]);
    expect(appFixture.worlds).toEqual([
      expect.objectContaining({
        id: "world-east-plains",
        resourceType: "world",
        regionId: "world01",
      }),
    ]);
    expect(appFixture.relations[0].target).toEqual({
      type: "world",
      id: "world-east-plains",
    });
  });

  it("rejects duplicate entity ids", () => {
    const fixture = cloneFixture();
    fixture.worlds.push(structuredClone(fixture.worlds[0]));

    expect(() => parseAppFixture(fixture)).toThrow(/duplicate world id/i);
  });

  it("rejects content and Worlds that reference unknown works", () => {
    const contentFixture = cloneGenericFixture();
    contentFixture.contents[0].workId = "work-missing";
    expect(() => parseAppFixture(contentFixture)).toThrow(/unknown work/i);

    const worldFixture = cloneFixture();
    worldFixture.worlds[0].workId = "work-missing";
    expect(() => parseAppFixture(worldFixture)).toThrow(/unknown work/i);
  });

  it("requires Worlds to use matching, concrete, active World category menus", () => {
    const mismatched = cloneFixture();
    mismatched.worlds[0].regionId = "world00";
    expect(() => parseAppFixture(mismatched)).toThrow(
      /regionId must match menuItemId/i,
    );

    const allStorage = cloneFixture();
    allStorage.worlds[0].menuItemId = "world00";
    allStorage.worlds[0].regionId = "world00";
    expect(() => parseAppFixture(allStorage)).toThrow(
      /concrete world category menu/i,
    );

    const wrongSection = cloneFixture();
    wrongSection.worlds[0].menuItemId = "plot01";
    wrongSection.worlds[0].regionId = "plot01";
    expect(() => parseAppFixture(wrongSection)).toThrow(
      /concrete world category menu/i,
    );

    // Archiving a menu must not invalidate the content it keeps.
    const archivedMenu = cloneFixture();
    archivedMenu.menuItems.find(({ id }) => id === "world01").archivedAt =
      "2026-03-01T00:00:00.000Z";
    expect(() => parseAppFixture(archivedMenu)).not.toThrow();
  });

  it("rejects duplicate typed endpoints across specialized and generic collections", () => {
    const fixture = cloneGenericFixture();
    fixture.contents.push({
      ...structuredClone(fixture.contents[0]),
      id: "world-east-plains",
      menuItemId: "world01",
      type: "world",
      title: "충돌하는 범용 세계 기록",
      order: 1,
    });

    expect(() => parseAppFixture(fixture)).toThrow(
      /duplicate typed entity endpoint: world:world-east-plains/i,
    );
  });

  it("rejects menu items and relations with unknown typed targets", () => {
    const invalidMenuFixture = cloneFixture();
    invalidMenuFixture.menuItems[0].sectionId = "section-missing";

    expect(() => parseAppFixture(invalidMenuFixture)).toThrow(
      /unknown menu section/i,
    );

    const missingRelationFixture = cloneFixture();
    missingRelationFixture.relations[0].target.id = "entity-missing";

    expect(() => parseAppFixture(missingRelationFixture)).toThrow(
      /unknown relation target/i,
    );

    const mistypedRelationFixture = cloneFixture();
    mistypedRelationFixture.relations[0].target.type = "character";

    expect(() => parseAppFixture(mistypedRelationFixture)).toThrow(
      /unknown relation target/i,
    );
  });

  it("requires a relation and both typed endpoints to share one work", () => {
    const fixture = cloneFixture();
    fixture.relations[0].source = {
      type: "character",
      id: "character-rin",
    };

    expect(() => parseAppFixture(fixture)).toThrow(
      /relation source is outside work work-monp/i,
    );
  });

  it("rejects self-relations", () => {
    const fixture = cloneFixture();
    fixture.relations[0].target = structuredClone(fixture.relations[0].source);

    expect(() => parseAppFixture(fixture)).toThrow(
      /relation cannot target itself/i,
    );
  });

  it("rejects exact and bidirectional reverse duplicates", () => {
    const exactFixture = cloneFixture();
    exactFixture.relations.push({
      ...structuredClone(exactFixture.relations[0]),
      id: "relation-exact-duplicate",
    });

    expect(() => parseAppFixture(exactFixture)).toThrow(/duplicate relation/i);

    const reverseFixture = cloneFixture();
    const original = reverseFixture.relations[0];
    reverseFixture.relations.push({
      ...structuredClone(original),
      id: "relation-reverse-duplicate",
      source: structuredClone(original.target),
      target: structuredClone(original.source),
    });

    expect(() => parseAppFixture(reverseFixture)).toThrow(
      /duplicate bidirectional relation/i,
    );
  });

  it("requires Plot scenes to use matching concrete chapter menus", () => {
    const mismatched = cloneFixture();
    mismatched.plotScenes[0].chapterId = "plot02";
    expect(() => parseAppFixture(mismatched)).toThrow(
      /chapterId must match menuItemId/i,
    );

    for (const menuItemId of ["plot00", "world01"]) {
      const invalid = cloneFixture();
      invalid.plotScenes[0].menuItemId = menuItemId;
      invalid.plotScenes[0].chapterId = menuItemId;
      expect(() => parseAppFixture(invalid)).toThrow(
        /concrete plot chapter menu/i,
      );
    }

    const badStatus = cloneFixture();
    badStatus.plotScenes[0].status = "unknown-status";
    expect(() => parseAppFixture(badStatus)).toThrow();
  });

  it("validates Plot scene POV, character, location, and payoff references", () => {
    const unknownPov = cloneFixture();
    unknownPov.plotScenes[0].povCharacterId = "character-missing";
    expect(() => parseAppFixture(unknownPov)).toThrow(/unknown pov character/i);

    const crossWorkCharacter = cloneFixture();
    crossWorkCharacter.plotScenes[0].characterIds = ["character-rin"];
    expect(() => parseAppFixture(crossWorkCharacter)).toThrow(
      /scene character is outside work work-monp/i,
    );

    const duplicateCharacter = cloneFixture();
    duplicateCharacter.plotScenes[0].characterIds = [
      "character-yeonhwa",
      "character-yeonhwa",
    ];
    expect(() => parseAppFixture(duplicateCharacter)).toThrow(
      /characters must be unique/i,
    );

    const unknownLocation = cloneFixture();
    unknownLocation.plotScenes[0].locationWorldId = "world-missing";
    expect(() => parseAppFixture(unknownLocation)).toThrow(
      /unknown location world/i,
    );

    const selfPayoff = cloneFixture();
    selfPayoff.plotScenes[0].clues[0].payoffSceneId = "plot-chapter-one-opening";
    expect(() => parseAppFixture(selfPayoff)).toThrow(/own scene/i);

    const unknownPayoff = cloneFixture();
    unknownPayoff.plotScenes[0].clues[0].payoffSceneId = "plot-missing";
    expect(() => parseAppFixture(unknownPayoff)).toThrow(/unknown payoff scene/i);

    const duplicateClue = cloneFixture();
    duplicateClue.plotScenes[0].clues.push(
      structuredClone(duplicateClue.plotScenes[0].clues[0]),
    );
    expect(() => parseAppFixture(duplicateClue)).toThrow(/duplicate clue id/i);
  });

  it("validates Setting categories, attributes, field configs, and owner relations", () => {
    expect(appFixture.settings).toEqual([
      expect.objectContaining({
        id: "setting-cheongun-sword",
        categoryId: "setting01",
        resourceType: "setting",
      }),
    ]);

    const mismatched = cloneFixture();
    mismatched.settings[0].categoryId = "setting02";
    expect(() => parseAppFixture(mismatched)).toThrow(/categoryId must match menuItemId/i);

    for (const menuItemId of ["setting00", "world01"]) {
      const invalid = cloneFixture();
      invalid.settings[0].menuItemId = menuItemId;
      invalid.settings[0].categoryId = menuItemId;
      expect(() => parseAppFixture(invalid)).toThrow(/concrete setting category menu/i);
    }

    const duplicateAttribute = cloneFixture();
    duplicateAttribute.settings[0].attributes.push(
      structuredClone(duplicateAttribute.settings[0].attributes[0]),
    );
    expect(() => parseAppFixture(duplicateAttribute)).toThrow(/duplicate setting attribute id/i);

    const badFields = cloneFixture();
    badFields.menuItems.find(({ id }) => id === "setting01").filterConfig.fields = ["grade", "unknown"];
    expect(() => parseAppFixture(badFields)).toThrow(/invalid setting field configuration/i);

    const badOwner = cloneFixture();
    badOwner.relations.find(({ relationType }) => relationType === "owner").target = {
      type: "world",
      id: "world-east-plains",
    };
    expect(() => parseAppFixture(badOwner)).toThrow(/owner relations must link a setting to a character/i);
  });

  it("validates Idea categories, adoption, conversion targets, and origin relations", () => {
    const mismatched = cloneFixture();
    mismatched.ideas[0].categoryId = "idea03";
    expect(() => parseAppFixture(mismatched)).toThrow(/idea categoryId must match/i);

    for (const menuItemId of ["idea00", "plot01"]) {
      const invalid = cloneFixture();
      invalid.ideas[0].menuItemId = menuItemId;
      invalid.ideas[0].categoryId = menuItemId;
      expect(() => parseAppFixture(invalid)).toThrow(/concrete idea category menu/i);
    }

    const adoptedWithoutTarget = cloneFixture();
    adoptedWithoutTarget.ideas[0].status = "adopted";
    expect(() => parseAppFixture(adoptedWithoutTarget)).toThrow(/record their conversion/i);

    const unknownTarget = cloneFixture();
    Object.assign(unknownTarget.ideas[0], {
      status: "adopted",
      convertedTo: { type: "plot", id: "plot-missing" },
      convertedAt: "2026-02-01T00:00:00.000Z",
    });
    expect(() => parseAppFixture(unknownTarget)).toThrow(/unknown idea conversion target/i);

    const converted = cloneFixture();
    Object.assign(converted.ideas[0], {
      status: "adopted",
      convertedTo: { type: "plot", id: "plot-chapter-one-opening" },
      convertedAt: "2026-02-01T00:00:00.000Z",
    });
    converted.relations.push({
      ...structuredClone(converted.relations[0]),
      id: "relation-origin",
      source: { type: "plot", id: "plot-chapter-one-opening" },
      target: { type: "idea", id: "idea-dialogue-mist" },
      relationType: "idea-origin",
      label: "원본 아이디어",
      bidirectional: false,
    });
    expect(() => parseAppFixture(converted)).not.toThrow();
    converted.relations.at(-1).target = { type: "world", id: "world-east-plains" };
    expect(() => parseAppFixture(converted)).toThrow(/idea origin relations must point to an idea/i);
  });

  it("validates memo menus, pinning, and checklist ids", () => {
    const wrongMenu = cloneFixture();
    wrongMenu.memos[0].menuItemId = "idea02";
    expect(() => parseAppFixture(wrongMenu)).toThrow(/memo must use a memo menu/i);

    const pinnedWithoutTime = cloneFixture();
    pinnedWithoutTime.memos[0].pinnedAt = null;
    expect(() => parseAppFixture(pinnedWithoutTime)).toThrow(/pinned memos must record pinnedAt/i);

    const duplicateItem = cloneFixture();
    duplicateItem.memos[0].checklist.push(structuredClone(duplicateItem.memos[0].checklist[0]));
    expect(() => parseAppFixture(duplicateItem)).toThrow(/duplicate memo checklist item id/i);

    const badColor = cloneFixture();
    badColor.memos[0].color = "neon";
    expect(() => parseAppFixture(badColor)).toThrow();
  });

  it("allows directional reverse edges and extensible type/status strings", () => {
    const fixture = cloneGenericFixture();
    const original = fixture.relations[0];
    original.bidirectional = false;
    original.relationType = "custom-origin";
    fixture.contents[0].status = "awaiting-plot-review";
    fixture.relations.push({
      ...structuredClone(original),
      id: "relation-directional-reverse",
      source: structuredClone(original.target),
      target: structuredClone(original.source),
    });

    expect(parseAppFixture(fixture)).toMatchObject({
      contents: [expect.objectContaining({ status: "awaiting-plot-review" })],
      relations: [
        expect.objectContaining({ relationType: "custom-origin" }),
        expect.objectContaining({ relationType: "owner" }),
        expect.objectContaining({ id: "relation-directional-reverse" }),
      ],
    });
  });
});
