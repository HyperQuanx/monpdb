import {
  IDEA_STATUS_TRANSITIONS,
  IdeaSchema,
} from "../../domain/schemas";
import { asFixtureContentRelationState } from "./fixtureContentRelationState";

export const IDEA_ALL_CATEGORY_ID = "idea00";

const requiredMethods = [
  "list",
  "get",
  "create",
  "update",
  "transition",
  "markConverted",
  "archive",
  "restore",
];

export const assertIdeaRepository = (repository) => {
  for (const method of requiredMethods) {
    if (typeof repository?.[method] !== "function") {
      throw new TypeError(`Idea repository is missing method: ${method}`);
    }
  }
  return repository;
};

const archiveStatuses = new Set(["active", "archived", "all"]);
const priorityRank = { high: 0, medium: 1, low: 2 };
const clone = (value) => structuredClone(value);
const normalizeSearchText = (value) =>
  String(value ?? "").trim().toLocaleLowerCase("ko-KR");
const emptyBody = { type: "doc", content: [] };

const randomId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `idea-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const canTransitionIdea = (from, to) =>
  (IDEA_STATUS_TRANSITIONS[from] ?? []).includes(to);

export const createFixtureIdeaRepository = (
  fixtureOrState,
  { createId = randomId, now = () => new Date().toISOString() } = {},
) => {
  const state = asFixtureContentRelationState(fixtureOrState);

  const assertWork = (fixture, workId) => {
    if (!fixture.works.some(({ id }) => id === workId)) {
      throw new Error(`Work not found: ${workId}`);
    }
  };

  const findIdea = (fixture, workId, ideaId) => {
    assertWork(fixture, workId);
    const idea = fixture.ideas.find(
      (candidate) => candidate.workId === workId && candidate.id === ideaId,
    );
    if (!idea) {
      throw new Error(`Idea not found in work ${workId}: ${ideaId}`);
    }
    return idea;
  };

  const findConcreteCategory = (fixture, categoryId) => {
    if (!categoryId || categoryId === IDEA_ALL_CATEGORY_ID) {
      throw new Error("A concrete idea category is required.");
    }
    const menuItem = fixture.menuItems.find(({ id }) => id === categoryId);
    if (!menuItem) {
      throw new Error(`Idea category not found: ${categoryId}`);
    }
    if (
      menuItem.sectionId !== "idea" ||
      menuItem.resourceType !== "idea" ||
      menuItem.filterConfig.scope !== "category"
    ) {
      throw new Error(`Invalid idea category: ${categoryId}`);
    }
    const section = fixture.menuSections.find(({ id }) => id === menuItem.sectionId);
    if (menuItem.archivedAt || section?.archivedAt) {
      throw new Error(`Idea category is archived: ${categoryId}`);
    }
    return menuItem;
  };

  const replaceIdea = (fixture, updated) => {
    state.replaceIdeas(
      fixture.ideas.map((idea) =>
        idea.workId === updated.workId && idea.id === updated.id ? updated : idea,
      ),
    );
    return clone(updated);
  };

  const assertEditable = (idea) => {
    if (idea.archivedAt) {
      throw new Error(`Archived idea cannot be changed: ${idea.id}`);
    }
  };

  const repository = {
    async list({
      workId,
      categoryId,
      q,
      priority,
      status,
      archiveStatus = "active",
    } = {}) {
      const fixture = state.read();
      assertWork(fixture, workId);
      if (!archiveStatuses.has(archiveStatus)) {
        throw new Error(`Invalid idea archive status: ${archiveStatus}`);
      }
      const normalizedQuery = normalizeSearchText(q);

      return clone(
        fixture.ideas
          .filter((idea) => {
            if (idea.workId !== workId) return false;
            const matchesArchive =
              archiveStatus === "all" ||
              (archiveStatus === "archived" ? Boolean(idea.archivedAt) : !idea.archivedAt);
            const matchesCategory =
              !categoryId ||
              categoryId === IDEA_ALL_CATEGORY_ID ||
              idea.categoryId === categoryId;
            const matchesPriority = !priority || idea.priority === priority;
            const matchesStatus = !status || idea.status === status;
            const matchesSearch =
              !normalizedQuery ||
              [idea.title, idea.summary, idea.source, ...idea.tags].some((value) =>
                normalizeSearchText(value).includes(normalizedQuery),
              );
            return (
              matchesArchive &&
              matchesCategory &&
              matchesPriority &&
              matchesStatus &&
              matchesSearch
            );
          })
          // High priority first, then most recently updated.
          .sort(
            (first, second) =>
              priorityRank[first.priority] - priorityRank[second.priority] ||
              second.updatedAt.localeCompare(first.updatedAt),
          ),
      );
    },

    async get(workId, ideaId) {
      const fixture = state.read();
      return clone(findIdea(fixture, workId, ideaId));
    },

    /** Also serves quick capture: only `categoryId` and `title` are required. */
    async create(workId, ideaData = {}) {
      const fixture = state.read();
      assertWork(fixture, workId);
      const input = clone(ideaData);
      const category = findConcreteCategory(fixture, input.categoryId);
      const status = input.status ?? "seed";
      if (status === "adopted") {
        throw new Error("Ideas are adopted only by converting them.");
      }
      const timestamp = now();
      const idea = IdeaSchema.parse({
        summary: "",
        source: "",
        priority: "medium",
        ...input,
        id: createId(),
        workId,
        menuItemId: category.id,
        resourceType: "idea",
        categoryId: category.id,
        categoryName: category.label,
        title: String(input.title ?? "").trim(),
        status,
        convertedTo: null,
        convertedAt: null,
        body: clone(input.body ?? emptyBody),
        tags: clone(input.tags ?? []),
        version: 1,
        archivedAt: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      if (fixture.ideas.some(({ id }) => id === idea.id)) {
        throw new Error(`Duplicate idea id: ${idea.id}`);
      }
      state.replaceIdeas([...fixture.ideas, idea]);
      return clone(idea);
    },

    async update(workId, ideaId, updates = {}) {
      const fixture = state.read();
      const existing = findIdea(fixture, workId, ideaId);
      assertEditable(existing);
      const input = clone(updates);
      const status = input.status ?? existing.status;
      if (status !== existing.status && !canTransitionIdea(existing.status, status)) {
        throw new Error(`Invalid idea status transition: ${existing.status} -> ${status}`);
      }
      const category = findConcreteCategory(fixture, input.categoryId ?? existing.categoryId);
      return replaceIdea(
        fixture,
        IdeaSchema.parse({
          ...existing,
          ...input,
          id: existing.id,
          workId: existing.workId,
          menuItemId: category.id,
          resourceType: "idea",
          categoryId: category.id,
          categoryName: category.label,
          title: String(input.title ?? existing.title).trim(),
          status,
          convertedTo: existing.convertedTo,
          convertedAt: existing.convertedAt,
          body: clone(input.body ?? existing.body),
          tags: clone(input.tags ?? existing.tags),
          version: existing.version + 1,
          archivedAt: existing.archivedAt,
          createdAt: existing.createdAt,
          updatedAt: now(),
        }),
      );
    },

    async transition(workId, ideaId, nextStatus) {
      const fixture = state.read();
      const existing = findIdea(fixture, workId, ideaId);
      assertEditable(existing);
      if (!canTransitionIdea(existing.status, nextStatus)) {
        throw new Error(`Invalid idea status transition: ${existing.status} -> ${nextStatus}`);
      }
      return replaceIdea(
        fixture,
        IdeaSchema.parse({
          ...existing,
          status: nextStatus,
          version: existing.version + 1,
          updatedAt: now(),
        }),
      );
    },

    /** Records a completed conversion; only the idea converter calls this. */
    async markConverted(workId, ideaId, target) {
      const fixture = state.read();
      const existing = findIdea(fixture, workId, ideaId);
      assertEditable(existing);
      if (existing.status === "adopted" || existing.status === "discarded") {
        throw new Error(`Idea cannot be converted from status ${existing.status}: ${ideaId}`);
      }
      const timestamp = now();
      return replaceIdea(
        fixture,
        IdeaSchema.parse({
          ...existing,
          status: "adopted",
          convertedTo: { type: target.type, id: target.id },
          convertedAt: timestamp,
          version: existing.version + 1,
          updatedAt: timestamp,
        }),
      );
    },

    async archive(workId, ideaId) {
      const fixture = state.read();
      const existing = findIdea(fixture, workId, ideaId);
      if (existing.archivedAt) return clone(existing);
      const timestamp = now();
      return replaceIdea(
        fixture,
        IdeaSchema.parse({
          ...existing,
          archivedAt: timestamp,
          updatedAt: timestamp,
          version: existing.version + 1,
        }),
      );
    },

    async restore(workId, ideaId) {
      const fixture = state.read();
      const existing = findIdea(fixture, workId, ideaId);
      if (!existing.archivedAt) return clone(existing);
      findConcreteCategory(fixture, existing.categoryId);
      return replaceIdea(
        fixture,
        IdeaSchema.parse({
          ...existing,
          archivedAt: null,
          updatedAt: now(),
          version: existing.version + 1,
        }),
      );
    },
  };

  return assertIdeaRepository(repository);
};
