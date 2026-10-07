export const MEMO_COLORS = Object.freeze([
  ["default", "기본"],
  ["yellow", "노랑"],
  ["green", "초록"],
  ["blue", "파랑"],
  ["pink", "분홍"],
  ["purple", "보라"],
]);
export const MEMO_COLOR_LABELS = new Map(MEMO_COLORS);

export const isAllMemoMenu = (menuItem) =>
  menuItem?.id === "memo00" || menuItem?.filterConfig?.scope === "all";

export const isUsableMemoMenu = (menuItem) =>
  menuItem?.sectionId === "memo" && menuItem?.resourceType === "memo" && !menuItem.archivedAt;

export const memoBelongsToMenu = (memo, menuItem) =>
  isAllMemoMenu(menuItem) ? memo?.resourceType === "memo" : memo?.menuItemId === menuItem?.id;

export const checklistProgress = (checklist) => ({
  done: checklist.filter(({ done }) => done).length,
  total: checklist.length,
});

export const formatMemoDate = (value) =>
  new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
