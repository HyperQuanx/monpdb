import { describe, expect, it } from "vitest";
import {
  characterQueryKeys,
  contentQueryKeys,
  relationQueryKeys,
  worldQueryKeys,
} from "./appRepositories";

describe("character query keys", () => {
  it("isolates every list and detail key by work", () => {
    expect(characterQueryKeys.all("work-monp")).toEqual([
      "characters",
      "work-monp",
    ]);
    expect(
      characterQueryKeys.list("work-monp", "characters01", "연화"),
    ).toEqual([
      "characters",
      "work-monp",
      "list",
      { regionId: "characters01", query: "연화" },
    ]);
    expect(
      characterQueryKeys.list("work-monp", "characters00", " 연 ", {
        archiveStatus: "all",
        affiliation: " 청운문 ",
        ignored: "not-a-character-filter",
        species: "인간",
      }),
    ).toEqual([
      "characters",
      "work-monp",
      "list",
      {
        regionId: "characters00",
        query: " 연 ",
        species: "인간",
        affiliation: "청운문",
        archiveStatus: "all",
      },
    ]);
    expect(
      characterQueryKeys.list("work-monp", "characters00", "", {
        species: "",
        affiliation: "   ",
        archiveStatus: undefined,
      }),
    ).toEqual([
      "characters",
      "work-monp",
      "list",
      { regionId: "characters00", query: "" },
    ]);
    expect(
      characterQueryKeys.list("work-monp", "characters00", "", {
        species: "인간",
      }),
    ).not.toEqual(
      characterQueryKeys.list("work-moonlit-echoes", "characters00", "", {
        species: "인간",
      }),
    );
    expect(
      characterQueryKeys.detail("work-moonlit-echoes", "character-rin"),
    ).toEqual([
      "characters",
      "work-moonlit-echoes",
      "detail",
      "character-rin",
    ]);
    expect(characterQueryKeys.all("work-monp")).not.toEqual(
      characterQueryKeys.all("work-moonlit-echoes"),
    );
  });
});

describe("World query keys", () => {
  it("includes workId in every deterministic World key", () => {
    const workId = "work-monp";
    const keys = [
      worldQueryKeys.all(workId),
      worldQueryKeys.lists(workId),
      worldQueryKeys.list(workId, "world01", "동부", {
        era: " 천무력 ",
        ignored: "not-a-world-filter",
        archiveStatus: "all",
        category: " region ",
      }),
      worldQueryKeys.details(workId),
      worldQueryKeys.detail(workId, "world-east-plains"),
    ];

    expect(keys.every((key) => key[1] === workId)).toBe(true);
    expect(keys[2]).toEqual([
      "worlds",
      workId,
      "list",
      {
        regionId: "world01",
        query: "동부",
        category: "region",
        era: "천무력",
        archiveStatus: "all",
      },
    ]);
    expect(
      worldQueryKeys.list(workId, "world00", "", {
        category: " ",
        era: undefined,
        archiveStatus: null,
      }),
    ).toEqual([
      "worlds",
      workId,
      "list",
      { regionId: "world00", query: "" },
    ]);
    expect(worldQueryKeys.all(workId)).not.toEqual(
      worldQueryKeys.all("work-moonlit-echoes"),
    );
  });
});

describe("content and relation query keys", () => {
  it("includes workId in every content key", () => {
    const workId = "work-monp";
    const keys = [
      contentQueryKeys.all(workId),
      contentQueryKeys.lists(workId),
      contentQueryKeys.list(workId, "plot01", "도입"),
      contentQueryKeys.details(workId),
      contentQueryKeys.detail(workId, "plot-chapter-one-opening"),
    ];

    expect(keys.every((key) => key[1] === workId)).toBe(true);
    expect(contentQueryKeys.list(workId, "plot01", "도입")).toEqual([
      "contents",
      workId,
      "list",
      { menuItemId: "plot01", query: "도입" },
    ]);
    expect(contentQueryKeys.all(workId)).not.toEqual(
      contentQueryKeys.all("work-moonlit-echoes"),
    );
  });

  it("includes workId in every relation key", () => {
    const workId = "work-monp";
    const entity = { type: "character", id: "character-yeonhwa" };
    const keys = [
      relationQueryKeys.all(workId),
      relationQueryKeys.lists(workId),
      relationQueryKeys.list(workId, entity),
      relationQueryKeys.candidates(workId, entity),
    ];

    expect(keys.every((key) => key[1] === workId)).toBe(true);
    expect(relationQueryKeys.list(workId, entity)).toEqual([
      "relations",
      workId,
      "list",
      entity,
    ]);
    expect(relationQueryKeys.all(workId)).not.toEqual(
      relationQueryKeys.all("work-moonlit-echoes"),
    );
  });
});
