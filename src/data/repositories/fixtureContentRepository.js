import { ContentEntrySchema } from "../../domain/schemas";
import { assertContentRepository } from "./contentRepository";
import { asFixtureContentRelationState } from "./fixtureContentRelationState";

const clone = (value) => structuredClone(value);
const normalizeSearchText = (value) =>
  String(value ?? "").trim().toLocaleLowerCase("ko-KR");
const emptyBody = { type: "doc", content: [] };

const defaultCreateId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `content-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const createFixtureContentRepository = (
  fixtureOrState,
  {
    createId = defaultCreateId,
    now = () => new Date().toISOString(),
  } = {},
) => {
  const state = asFixtureContentRelationState(fixtureOrState);

  const assertWork = (fixture, workId) => {
    if (!fixture.works.some(({ id }) => id === workId)) {
      throw new Error(`Work not found: ${workId}`);
    }
  };

  const findMenuItem = (fixture, menuItemId) => {
    const menuItem = fixture.menuItems.find(({ id }) => id === menuItemId);
    if (!menuItem) {
      throw new Error(`Menu item not found: ${menuItemId}`);
    }
    return menuItem;
  };

  const findContent = (fixture, workId, contentId) => {
    assertWork(fixture, workId);
    const content = fixture.contents.find(
      (candidate) =>
        candidate.workId === workId && candidate.id === contentId,
    );
    if (!content) {
      throw new Error(`Content not found in work ${workId}: ${contentId}`);
    }
    return content;
  };

  const replaceContent = (fixture, updated) => {
    state.replaceContents(
      fixture.contents.map((content) =>
        content.id === updated.id && content.workId === updated.workId
          ? updated
          : content,
      ),
    );
    return clone(updated);
  };

  const repository = {
    async list({ workId, menuItemId, q } = {}) {
      const fixture = state.read();
      assertWork(fixture, workId);
      const menuItem = findMenuItem(fixture, menuItemId);
      const normalizedQuery = normalizeSearchText(q);
      const scope = menuItem.filterConfig.scope;

      return clone(
        fixture.contents.filter((content) => {
          if (content.workId !== workId || content.archivedAt) {
            return false;
          }

          const matchesMenu =
            scope === "all"
              ? content.type === menuItem.resourceType
              : content.menuItemId === menuItem.id;
          const matchesSearch =
            !normalizedQuery ||
            [content.title, content.summary, ...content.tags].some((value) =>
              normalizeSearchText(value).includes(normalizedQuery),
            );

          return matchesMenu && matchesSearch;
        }),
      );
    },

    async get(workId, contentId) {
      const fixture = state.read();
      return clone(findContent(fixture, workId, contentId));
    },

    async create(workId, menuItemId, contentData = {}) {
      const fixture = state.read();
      assertWork(fixture, workId);
      const menuItem = findMenuItem(fixture, menuItemId);
      const timestamp = now();
      const siblingOrders = fixture.contents
        .filter(
          (content) =>
            content.workId === workId && content.menuItemId === menuItemId,
        )
        .map(({ order }) => order);
      const nextOrder = siblingOrders.length
        ? Math.max(...siblingOrders) + 1
        : 0;
      const content = ContentEntrySchema.parse({
        summary: "",
        tags: [],
        status: "draft",
        ...clone(contentData),
        id: createId(),
        workId,
        menuItemId,
        type: menuItem.resourceType,
        title: String(contentData.title ?? "").trim(),
        body: clone(contentData.body ?? emptyBody),
        order: nextOrder,
        version: 1,
        archivedAt: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      });

      if (fixture.contents.some(({ id }) => id === content.id)) {
        throw new Error(`Duplicate content id: ${content.id}`);
      }
      state.replaceContents([...fixture.contents, content]);
      return clone(content);
    },

    async update(workId, contentId, updates = {}) {
      const fixture = state.read();
      const existing = findContent(fixture, workId, contentId);
      const updated = ContentEntrySchema.parse({
        ...existing,
        ...clone(updates),
        id: existing.id,
        workId: existing.workId,
        menuItemId: existing.menuItemId,
        type: existing.type,
        title: String(updates.title ?? existing.title).trim(),
        body:
          updates.body === undefined ? existing.body : clone(updates.body),
        order: existing.order,
        version: existing.version + 1,
        archivedAt: existing.archivedAt,
        createdAt: existing.createdAt,
        updatedAt: now(),
      });

      return replaceContent(fixture, updated);
    },

    async archive(workId, contentId) {
      const fixture = state.read();
      const existing = findContent(fixture, workId, contentId);
      if (existing.archivedAt) {
        return clone(existing);
      }
      const timestamp = now();
      const archived = ContentEntrySchema.parse({
        ...existing,
        archivedAt: timestamp,
        updatedAt: timestamp,
        version: existing.version + 1,
      });

      return replaceContent(fixture, archived);
    },

    async restore(workId, contentId) {
      const fixture = state.read();
      const existing = findContent(fixture, workId, contentId);
      if (!existing.archivedAt) {
        return clone(existing);
      }
      const restored = ContentEntrySchema.parse({
        ...existing,
        archivedAt: null,
        updatedAt: now(),
        version: existing.version + 1,
      });

      return replaceContent(fixture, restored);
    },
  };

  return assertContentRepository(repository);
};
