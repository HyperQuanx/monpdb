import { KIND_LABELS } from "../../shared/navigation/entityPaths";

export { KIND_LABELS };

// Status values differ per kind; known enums get Korean labels, free-text
// statuses are shown as entered.
const STATUS_LABELS = new Map([
  ["plot:planned", "구상"],
  ["plot:draft", "초고"],
  ["plot:revised", "퇴고"],
  ["plot:final", "완료"],
  ["idea:seed", "씨앗"],
  ["idea:developing", "발전 중"],
  ["idea:ready", "검토 완료"],
  ["idea:adopted", "채택"],
  ["idea:discarded", "보류"],
]);

export const statusLabel = (kind, status) =>
  STATUS_LABELS.get(`${kind}:${status}`) ?? status;

const KIND_SECTIONS = new Map([
  ["character", "characters"],
  ["world", "world"],
  ["plot", "plot"],
  ["setting", "setting"],
  ["idea", "idea"],
  ["memo", "memo"],
]);
const BUILT_IN_SECTIONS = new Set(KIND_SECTIONS.values());

/** Menu sections searchable for a kind; generic content lives in custom sections. */
export const sectionsForKind = (tree, kind) => {
  if (!kind) return tree;
  if (kind === "content") return tree.filter(({ id }) => !BUILT_IN_SECTIONS.has(id));
  return tree.filter(({ id }) => id === KIND_SECTIONS.get(kind));
};

export const parseFocus = (value) => {
  const text = String(value ?? "");
  const separator = text.indexOf(":");
  if (separator <= 0 || separator === text.length - 1) return null;
  return { type: text.slice(0, separator), id: text.slice(separator + 1) };
};

export const formatDateTime = (value) =>
  new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
