import { z } from "zod";
import { WorkSchema } from "../../domain/schemas";
import { assertWorkRepository } from "./workRepository";
import { isFixtureContentRelationState } from "./fixtureContentRelationState";

const clone = (value) => structuredClone(value);
const WorkListSchema = z.array(WorkSchema);

const defaultCreateId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `work-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const normalizeSlug = (slug) => String(slug ?? "").trim().toLowerCase();

export const createFixtureWorkRepository = (
  initialWorks,
  {
    createId = defaultCreateId,
    now = () => new Date().toISOString(),
  } = {},
) => {
  const state = isFixtureContentRelationState(initialWorks) ? initialWorks : null;
  let works = WorkListSchema.parse(clone(state ? state.read().works : initialWorks));
  const load = () => { if (state) works = state.read().works; };
  const save = () => { if (state) state.replaceWorks(works); };

  const ensureUniqueState = () => {
    const ids = new Set();
    const slugs = new Set();

    for (const work of works) {
      if (ids.has(work.id)) {
        throw new Error(`Duplicate work id: ${work.id}`);
      }
      if (slugs.has(work.slug)) {
        throw new Error(`Work slug already exists: ${work.slug}`);
      }
      ids.add(work.id);
      slugs.add(work.slug);
    }
  };

  ensureUniqueState();

  const findWork = (workId) => {
    load();
    const work = works.find(({ id }) => id === workId);

    if (!work) {
      throw new Error(`Work not found: ${workId}`);
    }

    return work;
  };

  const assertAvailableSlug = (slug, currentWorkId) => {
    const conflict = works.find(
      (work) => work.slug === slug && work.id !== currentWorkId,
    );

    if (conflict) {
      throw new Error(`Work slug already exists: ${slug}`);
    }
  };

  const replaceWork = (updated) => {
    works = works.map((work) => (work.id === updated.id ? updated : work));
    save();
    return clone(updated);
  };

  const repository = {
    async list({ includeArchived = false } = {}) {
      load();
      return clone(
        includeArchived ? works : works.filter(({ archivedAt }) => !archivedAt),
      );
    },

    async get(workId) {
      return clone(findWork(workId));
    },

    async create(workData) {
      load();
      const timestamp = now();
      const slug = normalizeSlug(workData.slug);
      const work = WorkSchema.parse({
        subtitle: "",
        cover: "",
        summary: "",
        genre: "",
        status: "planning",
        accentColor: "#245c4f",
        ...clone(workData),
        id: createId(),
        slug,
        archivedAt: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      });

      if (works.some(({ id }) => id === work.id)) {
        throw new Error(`Duplicate work id: ${work.id}`);
      }
      assertAvailableSlug(work.slug);
      works = [...works, work];
      save();

      return clone(work);
    },

    async update(workId, updates) {
      const existing = findWork(workId);
      const slug =
        updates.slug === undefined ? existing.slug : normalizeSlug(updates.slug);
      const updated = WorkSchema.parse({
        ...existing,
        ...clone(updates),
        id: existing.id,
        slug,
        archivedAt: existing.archivedAt,
        createdAt: existing.createdAt,
        updatedAt: now(),
      });

      assertAvailableSlug(updated.slug, existing.id);
      return replaceWork(updated);
    },

    async archive(workId) {
      const existing = findWork(workId);

      if (existing.archivedAt) {
        return clone(existing);
      }

      const timestamp = now();
      return replaceWork(
        WorkSchema.parse({
          ...existing,
          archivedAt: timestamp,
          updatedAt: timestamp,
        }),
      );
    },

    async restore(workId) {
      const existing = findWork(workId);

      if (!existing.archivedAt) {
        return clone(existing);
      }

      return replaceWork(
        WorkSchema.parse({
          ...existing,
          archivedAt: null,
          updatedAt: now(),
        }),
      );
    },

    async select(workId) {
      const work = findWork(workId);

      if (work.archivedAt) {
        throw new Error(`Archived work cannot be selected: ${workId}`);
      }

      return clone(work);
    },
  };

  return assertWorkRepository(repository);
};
