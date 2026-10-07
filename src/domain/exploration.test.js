import { describe, expect, it } from "vitest";
import {
  createGraph,
  excerptAround,
  extractRichText,
  getNeighborhood,
  matchesSearchText,
  scoreEntity,
  toChosung,
} from "./exploration";

describe("Korean search matching", () => {
  it.each([
    ["청운검법", "검법", true],
    ["청운검법", "청운 검법", true],
    ["청운 검법", "청운검법", true],
    ["연화", "ㅇㅎ", true],
    ["동부평야지대", "ㄷㅂ ㅍㅇ", true],
    ["연화", "ㅎㅇ", false],
    ["Yeonhwa", "YEON", true],
    ["무영", "", false],
  ])("matches %s with %s → %s", (text, query, expected) => {
    expect(matchesSearchText(text, query)).toBe(expected);
  });

  it("can disable initial-consonant matching for long fields", () => {
    expect(matchesSearchText("연화", "ㅇㅎ", { chosung: false })).toBe(false);
    expect(
      scoreEntity(
        { fields: [{ key: "summary", label: "요약", text: "암수굴의 오래된 통로", weight: 30 }], label: "무영" },
        "ㅇㅎ",
      ),
    ).toBeNull();
  });

  it("normalizes decomposed Hangul and extracts initial consonants", () => {
    const decomposed = "연화".normalize("NFD");
    expect(matchesSearchText(decomposed, "연화")).toBe(true);
    expect(toChosung("청운검법 A1")).toBe("ㅊㅇㄱㅂ A1");
  });

  it("extracts Tiptap text and builds excerpts around the match", () => {
    const doc = {
      type: "doc",
      content: [
        { type: "heading", content: [{ type: "text", text: "제목" }] },
        { type: "paragraph", content: [{ type: "text", text: "검은 " }, { type: "text", marks: [{ type: "bold" }], text: "안개" }] },
      ],
    };
    expect(extractRichText(doc)).toBe("제목 검은 안개");
    expect(extractRichText(null)).toBe("");
    expect(excerptAround("가".repeat(50) + "목표" + "나".repeat(50), "목표", 5)).toBe("…가가가가가목표나나나나나…");
  });

  it("ranks exact, prefix, and partial title matches above field matches", () => {
    const entity = (label, fieldText = "") => ({
      fields: [{ key: "summary", label: "요약", text: fieldText, weight: 30 }],
      label,
    });
    const scores = [
      scoreEntity(entity("연화"), "연화").score,
      scoreEntity(entity("연화의 검"), "연화").score,
      scoreEntity(entity("푸른 연화"), "연화").score,
      scoreEntity(entity("무영", "연화와 대립"), "연화").score,
    ];
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
    expect(scoreEntity(entity("무영", "연화와 대립"), "연화").matchedField).toMatchObject({ label: "요약" });
    expect(scoreEntity(entity("무영"), "연화")).toBeNull();
  });
});

const node = (id, extra = {}) => ({ endpoint: { type: "x", id }, label: id, archivedAt: null, ...extra });
const edge = (from, to, label = "관련") => ({
  id: `${from}-${to}`,
  label,
  source: { type: "x", id: from },
  target: { type: "x", id: to },
});

describe("relation neighborhood", () => {
  it("walks depth levels in both directions and records how nodes connect", () => {
    const graph = createGraph(
      [node("a"), node("b"), node("c"), node("d")],
      [edge("a", "b"), edge("c", "a"), edge("b", "d")],
    );
    const one = getNeighborhood(graph, { type: "x", id: "a" });
    expect(one.levels).toHaveLength(1);
    expect(one.levels[0].items.map(({ node: item }) => item.label).sort()).toEqual(["b", "c"]);
    const two = getNeighborhood(graph, { type: "x", id: "a" }, { depth: 2 });
    expect(two.levels[1].items.map(({ node: item, via }) => [item.label, via[0].from.label])).toEqual([["d", "b"]]);
    expect(two.edges).toHaveLength(3);
    expect(getNeighborhood(graph, { type: "x", id: "missing" })).toBeNull();
  });

  it("is safe with cycles and self or dangling edges", () => {
    const graph = createGraph(
      [node("a"), node("b"), node("c")],
      [edge("a", "b"), edge("b", "c"), edge("c", "a"), edge("a", "a"), edge("a", "ghost")],
    );
    const result = getNeighborhood(graph, { type: "x", id: "a" }, { depth: 5 });
    const labels = result.levels.flatMap(({ items }) => items.map(({ node: item }) => item.label));
    expect(labels.sort()).toEqual(["b", "c"]);
    // c is reached from both a and b at depth 1/2 but listed once.
    expect(result.levels).toHaveLength(1);
    expect(result.levels[0].items.find(({ node: item }) => item.label === "c").via).toHaveLength(1);
  });

  it("skips archived neighbors unless requested and caps large graphs", () => {
    const archivedGraph = createGraph(
      [node("a"), node("b", { archivedAt: "2026-01-01T00:00:00.000Z" })],
      [edge("a", "b")],
    );
    expect(getNeighborhood(archivedGraph, { type: "x", id: "a" }).levels).toEqual([]);
    expect(
      getNeighborhood(archivedGraph, { type: "x", id: "a" }, { includeArchived: true }).levels[0].items,
    ).toHaveLength(1);

    const count = 2000;
    const nodes = Array.from({ length: count }, (_, index) => node(`n${index}`));
    const edges = nodes.flatMap((_, index) => [
      edge(`n${index}`, `n${(index + 1) % count}`),
      edge(`n${index}`, `n${(index * 7) % count}`),
    ]);
    const started = performance.now();
    const result = getNeighborhood(createGraph(nodes, edges), { type: "x", id: "n0" }, { depth: 4, limit: 50 });
    expect(performance.now() - started).toBeLessThan(500);
    const included = result.levels.reduce((sum, { items }) => sum + items.length, 0);
    expect(included).toBe(50);
    expect(result.truncated).toBeGreaterThan(0);
  });
});
