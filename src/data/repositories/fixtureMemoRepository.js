import { MemoSchema } from "../../domain/schemas";
import { asFixtureContentRelationState } from "./fixtureContentRelationState";

const requiredMethods = [
  "list",
  "get",
  "create",
  "update",
  "setPinned",
  "toggleChecklistItem",
  "archive",
  "restore",
];

export const assertMemoRepository = (repository) => {
  for (const method of requiredMethods) {
    if (typeof repository?.[method] !== "function") {
      throw new TypeError(`Memo repository is missing method: ${method}`);
    }
  }
  return repository;
};

const archiveStatuses = new Set(["active", "archived", "all"]);
const clone = (value) => structuredClone(value);
const normalizeSearchText = (value) =>
  String(value ?? "").trim().toLocaleLowerCase("ko-KR");

const randomId = (prefix) =>
  globalThis.crypto?.randomUUID?.() ??
  `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

/** Pinned memos first (most recently pinned first), then most recently updated. */
export const compareMemos = (first, second) =>
  Number(second.pinned) - Number(first.pinned) ||
  (second.pinnedAt ?? "").localeCompare(first.pinnedAt ?? "") ||
  second.updatedAt.localeCompare(first.updatedAt);

export const createFixtureMemoRepository = (
  fixtureOrState,
  {
    createId = () => randomId("memo"),
    createChecklistItemId = () => randomId("check"),
    now = () => new Date().toISOString(),
  } = {},
) => {
  const state = asFixtureContentRelationState(fixtureOrState);

  const assertWork = (fixture, workId) => {
    if (!fixture.works.some(({ id }) => id === workId)) {
      throw new Error(`Work not found: ${workId}`);
    }
  };

  const findMemo = (fixture, workId, memoId) => {
    assertWork(fixture, workId);
    const memo = fixture.memos.find(
      (candidate) => candidate.workId === workId && candidate.id === memoId,
    );
    if (!memo) {
      throw new Error(`Memo not found in work ${workId}: ${memoId}`);
    }
    return memo;
  };

  const findMemoMenu = (fixture, menuItemId, { active = true } = {}) => {
    const menuItem = fixture.menuItems.find(({ id }) => id === menuItemId);
    if (!menuItem) {
      throw new Error(`Memo menu not found: ${menuItemId}`);
    }
    if (menuItem.sectionId !== "memo" || menuItem.resourceType !== "memo") {
      throw new Error(`Invalid memo menu: ${menuItemId}`);
    }
    const section = fixture.menuSections.find(({ id }) => id === menuItem.sectionId);
    if (active && (menuItem.archivedAt || section?.archivedAt)) {
      throw new Error(`Memo menu is archived: ${menuItemId}`);
    }
    return menuItem;
  };

  const normalizeChecklist = (checklist = []) => {
    const ids = new Set();
    return checklist.map((item) => {
      const id = item.id ? String(item.id) : createChecklistItemId();
      if (ids.has(id)) {
        throw new Error(`Duplicate memo checklist item id: ${id}`);
      }
      ids.add(id);
      return { id, text: String(item.text ?? "").trim(), done: Boolean(item.done) };
    });
  };

  const replaceMemo = (fixture, updated) => {
    state.replaceMemos(
      fixture.memos.map((memo) =>
        memo.workId === updated.workId && memo.id === updated.id ? updated : memo,
      ),
    );
    return clone(updated);
  };

  const assertEditable = (memo) => {
    if (memo.archivedAt) {
      throw new Error(`Archived memo cannot be changed: ${memo.id}`);
    }
  };

  const repository = {
    async list({ workId, menuItemId, q, color, archiveStatus = "active" } = {}) {
      const fixture = state.read();
      assertWork(fixture, workId);
      if (!archiveStatuses.has(archiveStatus)) {
        throw new Error(`Invalid memo archive status: ${archiveStatus}`);
      }
      // An all-scope memo menu shows every memo in the work.
      const menuItem = menuItemId ? findMemoMenu(fixture, menuItemId, { active: false }) : null;
      const showAll = !menuItem || menuItem.filterConfig.scope === "all";
      const normalizedQuery = normalizeSearchText(q);

      return clone(
        fixture.memos
          .filter((memo) => {
            if (memo.workId !== workId) return false;
            const matchesArchive =
              archiveStatus === "all" ||
              (archiveStatus === "archived" ? Boolean(memo.archivedAt) : !memo.archivedAt);
            const matchesMenu = showAll || memo.menuItemId === menuItem.id;
            const matchesColor = !color || memo.color === color;
            const matchesSearch =
              !normalizedQuery ||
              [memo.title, memo.text, ...memo.tags, ...memo.checklist.map(({ text }) => text)].some(
                (value) => normalizeSearchText(value).includes(normalizedQuery),
              );
            return matchesArchive && matchesMenu && matchesColor && matchesSearch;
          })
          .sort(compareMemos),
      );
    },

    async get(workId, memoId) {
      const fixture = state.read();
      return clone(findMemo(fixture, workId, memoId));
    },

    /** Also serves quick capture: only `menuItemId` and `title` are required. */
    async create(workId, memoData = {}) {
      const fixture = state.read();
      assertWork(fixture, workId);
      const input = clone(memoData);
      const menuItem = findMemoMenu(fixture, input.menuItemId);
      const timestamp = now();
      const pinned = Boolean(input.pinned);
      const memo = MemoSchema.parse({
        text: "",
        color: "default",
        ...input,
        id: createId(),
        workId,
        menuItemId: menuItem.id,
        resourceType: "memo",
        title: String(input.title ?? "").trim(),
        pinned,
        pinnedAt: pinned ? timestamp : null,
        checklist: normalizeChecklist(input.checklist),
        tags: clone(input.tags ?? []),
        version: 1,
        archivedAt: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      if (fixture.memos.some(({ id }) => id === memo.id)) {
        throw new Error(`Duplicate memo id: ${memo.id}`);
      }
      state.replaceMemos([...fixture.memos, memo]);
      return clone(memo);
    },

    async update(workId, memoId, updates = {}) {
      const fixture = state.read();
      const existing = findMemo(fixture, workId, memoId);
      assertEditable(existing);
      const input = clone(updates);
      const menuItem = findMemoMenu(fixture, input.menuItemId ?? existing.menuItemId);
      const timestamp = now();
      const pinned = input.pinned === undefined ? existing.pinned : Boolean(input.pinned);
      return replaceMemo(
        fixture,
        MemoSchema.parse({
          ...existing,
          ...input,
          id: existing.id,
          workId: existing.workId,
          menuItemId: menuItem.id,
          resourceType: "memo",
          title: String(input.title ?? existing.title).trim(),
          pinned,
          pinnedAt: pinned ? (existing.pinnedAt ?? timestamp) : null,
          checklist: normalizeChecklist(input.checklist ?? existing.checklist),
          tags: clone(input.tags ?? existing.tags),
          version: existing.version + 1,
          archivedAt: existing.archivedAt,
          createdAt: existing.createdAt,
          updatedAt: timestamp,
        }),
      );
    },

    async setPinned(workId, memoId, pinned) {
      const fixture = state.read();
      const existing = findMemo(fixture, workId, memoId);
      assertEditable(existing);
      if (existing.pinned === Boolean(pinned)) return clone(existing);
      const timestamp = now();
      return replaceMemo(
        fixture,
        MemoSchema.parse({
          ...existing,
          pinned: Boolean(pinned),
          pinnedAt: pinned ? timestamp : null,
          version: existing.version + 1,
          updatedAt: timestamp,
        }),
      );
    },

    async toggleChecklistItem(workId, memoId, itemId) {
      const fixture = state.read();
      const existing = findMemo(fixture, workId, memoId);
      assertEditable(existing);
      if (!existing.checklist.some(({ id }) => id === itemId)) {
        throw new Error(`Checklist item not found: ${itemId}`);
      }
      return replaceMemo(
        fixture,
        MemoSchema.parse({
          ...existing,
          checklist: existing.checklist.map((item) =>
            item.id === itemId ? { ...item, done: !item.done } : item,
          ),
          version: existing.version + 1,
          updatedAt: now(),
        }),
      );
    },

    async archive(workId, memoId) {
      const fixture = state.read();
      const existing = findMemo(fixture, workId, memoId);
      if (existing.archivedAt) return clone(existing);
      const timestamp = now();
      return replaceMemo(
        fixture,
        MemoSchema.parse({
          ...existing,
          archivedAt: timestamp,
          updatedAt: timestamp,
          version: existing.version + 1,
        }),
      );
    },

    async restore(workId, memoId) {
      const fixture = state.read();
      const existing = findMemo(fixture, workId, memoId);
      if (!existing.archivedAt) return clone(existing);
      findMemoMenu(fixture, existing.menuItemId);
      return replaceMemo(
        fixture,
        MemoSchema.parse({
          ...existing,
          archivedAt: null,
          updatedAt: now(),
          version: existing.version + 1,
        }),
      );
    },
  };

  return assertMemoRepository(repository);
};
