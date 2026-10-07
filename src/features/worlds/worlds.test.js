import { describe, expect, it } from "vitest";
import {
  normalizeRelationDrafts,
  parseCommaSeparated,
  relationCandidatePath,
} from "./worlds";

const draft = (target) => ({
  bidirectional: false,
  label: "관련",
  notes: "",
  relationType: "related",
  target,
});

describe("World UI helpers", () => {
  it("normalizes comma-separated fields without blanks or duplicates", () => {
    expect(parseCommaSeparated(" 청운문, 상단, 청운문,  ")).toEqual([
      "청운문",
      "상단",
    ]);
  });

  it("rejects invalid, self, and duplicate relation drafts", () => {
    expect(() => normalizeRelationDrafts([
      { ...draft({ type: "plot", id: "plot-1" }), label: " " },
    ])).toThrow("관계 종류, 이름, 대상을 모두 입력해 주세요.");
    expect(() => normalizeRelationDrafts(
      [draft({ type: "world", id: "world-1" })],
      { type: "world", id: "world-1" },
    )).toThrow("자기 자신을 관계 대상으로 선택할 수 없습니다.");
    expect(() => normalizeRelationDrafts([
      draft({ type: "character", id: "character-1" }),
      draft({ type: "character", id: "character-1" }),
    ])).toThrow("같은 관계 대상을 두 번 추가할 수 없습니다.");
  });

  it("builds entity-aware relation links", () => {
    expect(relationCandidatePath("work-monp", {
      endpoint: { type: "character", id: "character-1" },
      menuItemId: "characters01",
    })).toBe("/works/work-monp/characters/characters01/character-1");
    expect(relationCandidatePath("work-monp", {
      endpoint: { type: "plot", id: "plot-1" },
      menuItemId: "plot01",
    })).toBe("/works/work-monp/plot/plot01/plot-1");
    expect(relationCandidatePath("work-monp", {
      endpoint: { type: "world", id: "world-1" },
      menuItemId: "world01",
    })).toBe("/works/work-monp/world/world01/world-1");
  });
});
