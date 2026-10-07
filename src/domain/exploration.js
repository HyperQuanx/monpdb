// Pure search and relation-graph helpers shared by the fixture adapter and,
// later, the HTTP adapter. No React or storage dependencies.

const CHOSUNG = [
  "ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ",
  "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ",
];
const HANGUL_START = 0xac00;
const HANGUL_COUNT = 11172;
const JUNGSEONG_TIMES_JONGSEONG = 588;

export const normalizeSearchText = (value) =>
  String(value ?? "")
    .normalize("NFC")
    .toLocaleLowerCase("ko-KR")
    .replace(/\s+/g, " ")
    .trim();

const compact = (value) => value.replace(/\s+/g, "");

/** Hangul syllables → initial consonants (e.g. "연화" → "ㅇㅎ"). */
export const toChosung = (value) =>
  [...String(value ?? "")]
    .map((character) => {
      const offset = character.charCodeAt(0) - HANGUL_START;
      return offset >= 0 && offset < HANGUL_COUNT
        ? CHOSUNG[Math.floor(offset / JUNGSEONG_TIMES_JONGSEONG)]
        : character;
    })
    .join("");

const isChosungQuery = (query) => /^[ㄱ-ㅎ\s]+$/.test(query);

/**
 * Korean-friendly containment: plain match, match ignoring spaces
 * ("청운 검법" finds "청운검법"), and initial-consonant match ("ㅊㅇㄱㅂ").
 */
export const matchesSearchText = (text, query, { chosung = true } = {}) => {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return false;
  const normalizedText = normalizeSearchText(text);
  if (!normalizedText) return false;
  if (normalizedText.includes(normalizedQuery)) return true;
  const compactQuery = compact(normalizedQuery);
  if (compact(normalizedText).includes(compactQuery)) return true;
  return (
    chosung &&
    isChosungQuery(normalizedQuery) &&
    compact(toChosung(normalizedText)).includes(compactQuery)
  );
};

/** Plain text of a Tiptap JSON document, blocks separated by spaces. */
export const extractRichText = (document) => {
  const parts = [];
  const visit = (node) => {
    if (!node || typeof node !== "object") return;
    if (node.type === "text" && typeof node.text === "string") parts.push(node.text);
    if (Array.isArray(node.content)) {
      node.content.forEach(visit);
      if (node.type !== "text") parts.push(" ");
    }
  };
  visit(document);
  return parts.join("").replace(/\s+/g, " ").trim();
};

/** Short excerpt around the first match, for result snippets. */
export const excerptAround = (text, query, radius = 36) => {
  const source = String(text ?? "").replace(/\s+/g, " ").trim();
  const index = normalizeSearchText(source).indexOf(normalizeSearchText(query));
  if (index < 0) {
    return source.length > radius * 2 ? `${source.slice(0, radius * 2)}…` : source;
  }
  const start = Math.max(0, index - radius);
  const end = Math.min(source.length, index + normalizeSearchText(query).length + radius);
  return `${start > 0 ? "…" : ""}${source.slice(start, end)}${end < source.length ? "…" : ""}`;
};

/**
 * Scores an indexed entity. Title matches dominate (exact > prefix > any),
 * then tags, summary, type-specific fields, and body text. Returns null when
 * nothing matches.
 */
export const scoreEntity = (entity, query) => {
  const normalizedQuery = normalizeSearchText(query);
  const title = normalizeSearchText(entity.label);
  let score = 0;
  let matchedField = null;
  if (title === normalizedQuery) score = 1000;
  else if (title.startsWith(normalizedQuery)) score = 300;
  else if (matchesSearchText(entity.label, normalizedQuery)) score = 100;
  if (score > 0) matchedField = { key: "title", label: "제목", text: entity.label };

  // Initial-consonant matching applies to titles only; on long text it would
  // match almost anything.
  for (const field of entity.fields) {
    if (!matchesSearchText(field.text, normalizedQuery, { chosung: false })) continue;
    score += field.weight;
    matchedField ??= field;
  }
  return score > 0 ? { matchedField, score } : null;
};

const endpointKey = ({ type, id }) => `${type}:${id}`;

/**
 * Builds an undirected adjacency view of explicit relations plus derived
 * edges. Edges keep their original direction for display.
 */
export const createGraph = (nodes, edges) => {
  const nodesByKey = new Map(nodes.map((node) => [endpointKey(node.endpoint), node]));
  const adjacency = new Map();
  const link = (from, to, edge) => {
    if (!adjacency.has(from)) adjacency.set(from, []);
    adjacency.get(from).push({ edge, neighbor: to });
  };
  for (const edge of edges) {
    const sourceKey = endpointKey(edge.source);
    const targetKey = endpointKey(edge.target);
    if (!nodesByKey.has(sourceKey) || !nodesByKey.has(targetKey) || sourceKey === targetKey) {
      continue;
    }
    link(sourceKey, targetKey, edge);
    link(targetKey, sourceKey, edge);
  }
  return { adjacency, edges, nodesByKey };
};

/**
 * Breadth-first neighborhood around `focus`. A visited set makes cycles safe;
 * `limit` caps how many nodes are returned (the rest are counted as
 * `truncated`). Archived nodes are skipped unless requested, except the focus.
 */
export const getNeighborhood = (
  graph,
  focus,
  { depth = 1, includeArchived = false, limit = 200 } = {},
) => {
  const focusKey = endpointKey(focus);
  const focusNode = graph.nodesByKey.get(focusKey);
  if (!focusNode) return null;

  const visited = new Map([[focusKey, 0]]);
  const levels = [];
  let frontier = [focusKey];
  let included = 0;
  let truncated = 0;
  const includedKeys = new Set([focusKey]);

  for (let level = 1; level <= depth && frontier.length > 0; level += 1) {
    const levelNodes = new Map();
    const nextFrontier = [];
    for (const key of frontier) {
      for (const { edge, neighbor } of graph.adjacency.get(key) ?? []) {
        const node = graph.nodesByKey.get(neighbor);
        if (!includeArchived && node.archivedAt) continue;
        const seenDepth = visited.get(neighbor);
        if (seenDepth !== undefined && seenDepth < level) continue;
        if (seenDepth === undefined) {
          visited.set(neighbor, level);
          if (included >= limit) {
            truncated += 1;
            continue;
          }
          included += 1;
          includedKeys.add(neighbor);
          nextFrontier.push(neighbor);
          levelNodes.set(neighbor, { node, via: [] });
        }
        const entry = levelNodes.get(neighbor);
        if (entry && includedKeys.has(key)) {
          entry.via.push({ edge, from: graph.nodesByKey.get(key) });
        }
      }
    }
    if (levelNodes.size > 0) {
      levels.push({ depth: level, items: [...levelNodes.values()] });
    }
    frontier = nextFrontier;
  }

  const edges = graph.edges.filter(
    (edge) => includedKeys.has(endpointKey(edge.source)) && includedKeys.has(endpointKey(edge.target)),
  );
  return { edges, focus: focusNode, levels, truncated };
};
