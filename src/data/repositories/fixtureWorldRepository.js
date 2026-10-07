import { WorldSchema } from "../../domain/schemas";
import { asFixtureContentRelationState } from "./fixtureContentRelationState";
import { assertWorldRepository } from "./worldRepository";

const archiveStatuses = new Set(["active", "archived", "all"]);
const clone = (value) => structuredClone(value);
const normalizeSearchText = (value) =>
  String(value ?? "").trim().toLocaleLowerCase("ko-KR");
const emptyBody = { type: "doc", content: [] };

const searchableScalarFields = [
  "title",
  "summary",
  "era",
  "rules",
  "history",
  "culture",
];
const searchableArrayFields = ["factions", "places", "tags"];

const defaultCreateId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `world-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const createFixtureWorldRepository = (
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

  const findWorld = (fixture, workId, worldId) => {
    assertWork(fixture, workId);
    const world = fixture.worlds.find(
      (candidate) => candidate.workId === workId && candidate.id === worldId,
    );

    if (!world) {
      throw new Error(`World not found in work ${workId}: ${worldId}`);
    }

    return world;
  };

  const findConcreteWorldRegion = (fixture, regionId) => {
    if (!regionId || regionId === "world00") {
      throw new Error("A concrete world region is required.");
    }

    const menuItem = fixture.menuItems.find(({ id }) => id === regionId);
    if (!menuItem) {
      throw new Error(`World region not found: ${regionId}`);
    }
    if (
      menuItem.sectionId !== "world" ||
      menuItem.resourceType !== "world" ||
      menuItem.filterConfig.scope !== "category"
    ) {
      throw new Error(`Invalid world region: ${regionId}`);
    }

    const section = fixture.menuSections.find(
      ({ id }) => id === menuItem.sectionId,
    );
    if (menuItem.archivedAt || section?.archivedAt) {
      throw new Error(`World region is archived: ${regionId}`);
    }

    return menuItem;
  };

  const replaceWorld = (fixture, updated) => {
    state.replaceWorlds(
      fixture.worlds.map((world) =>
        world.workId === updated.workId && world.id === updated.id
          ? updated
          : world,
      ),
    );
    return clone(updated);
  };

  const repository = {
    async list({
      workId,
      regionId,
      q,
      category,
      era,
      archiveStatus = "active",
    } = {}) {
      const fixture = state.read();
      assertWork(fixture, workId);
      if (!archiveStatuses.has(archiveStatus)) {
        throw new Error(`Invalid world archive status: ${archiveStatus}`);
      }

      const normalizedQuery = normalizeSearchText(q);
      const normalizedCategory = String(category ?? "").trim();
      const normalizedEra = normalizeSearchText(era);

      return clone(
        fixture.worlds.filter((world) => {
          if (world.workId !== workId) {
            return false;
          }

          const matchesArchive =
            archiveStatus === "all" ||
            (archiveStatus === "archived"
              ? Boolean(world.archivedAt)
              : !world.archivedAt);
          const matchesRegion =
            !regionId || regionId === "world00" || world.regionId === regionId;
          const matchesCategory =
            !normalizedCategory || world.category === normalizedCategory;
          const matchesEra =
            !normalizedEra ||
            normalizeSearchText(world.era).includes(normalizedEra);
          const matchesSearch =
            !normalizedQuery ||
            searchableScalarFields.some((field) =>
              normalizeSearchText(world[field]).includes(normalizedQuery),
            ) ||
            searchableArrayFields.some((field) =>
              world[field].some((value) =>
                normalizeSearchText(value).includes(normalizedQuery),
              ),
            );

          return (
            matchesArchive &&
            matchesRegion &&
            matchesCategory &&
            matchesEra &&
            matchesSearch
          );
        }),
      );
    },

    async get(workId, worldId) {
      const fixture = state.read();
      return clone(findWorld(fixture, workId, worldId));
    },

    async create(workId, worldData = {}) {
      const fixture = state.read();
      assertWork(fixture, workId);
      const input = clone(worldData);
      const region = findConcreteWorldRegion(fixture, input.regionId);
      const timestamp = now();
      const siblingOrders = fixture.worlds
        .filter(
          (world) =>
            world.workId === workId && world.regionId === region.id,
        )
        .map(({ order }) => order);
      const nextOrder = siblingOrders.length
        ? Math.max(...siblingOrders) + 1
        : 0;
      const world = WorldSchema.parse({
        category: "region",
        summary: "",
        era: "",
        rules: "",
        history: "",
        culture: "",
        status: "draft",
        ...input,
        id: createId(),
        workId,
        menuItemId: region.id,
        resourceType: "world",
        regionId: region.id,
        regionName: region.label,
        title: String(input.title ?? "").trim(),
        body: clone(input.body ?? emptyBody),
        factions: clone(input.factions ?? []),
        places: clone(input.places ?? []),
        tags: clone(input.tags ?? []),
        order: nextOrder,
        version: 1,
        archivedAt: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      });

      if (fixture.worlds.some(({ id }) => id === world.id)) {
        throw new Error(`Duplicate world id: ${world.id}`);
      }
      state.replaceWorlds([...fixture.worlds, world]);
      return clone(world);
    },

    async update(workId, worldId, updates = {}) {
      const fixture = state.read();
      const existing = findWorld(fixture, workId, worldId);
      const input = clone(updates);
      const region = findConcreteWorldRegion(
        fixture,
        input.regionId ?? existing.regionId,
      );
      const updated = WorldSchema.parse({
        ...existing,
        ...input,
        id: existing.id,
        workId: existing.workId,
        menuItemId: region.id,
        resourceType: "world",
        regionId: region.id,
        regionName: region.label,
        title: String(input.title ?? existing.title).trim(),
        body: clone(input.body ?? existing.body),
        factions: clone(input.factions ?? existing.factions),
        places: clone(input.places ?? existing.places),
        tags: clone(input.tags ?? existing.tags),
        order: existing.order,
        version: existing.version + 1,
        archivedAt: existing.archivedAt,
        createdAt: existing.createdAt,
        updatedAt: now(),
      });

      return replaceWorld(fixture, updated);
    },

    async archive(workId, worldId) {
      const fixture = state.read();
      const existing = findWorld(fixture, workId, worldId);
      if (existing.archivedAt) {
        return clone(existing);
      }
      const timestamp = now();
      const archived = WorldSchema.parse({
        ...existing,
        archivedAt: timestamp,
        updatedAt: timestamp,
        version: existing.version + 1,
      });

      return replaceWorld(fixture, archived);
    },

    async restore(workId, worldId) {
      const fixture = state.read();
      const existing = findWorld(fixture, workId, worldId);
      if (!existing.archivedAt) {
        return clone(existing);
      }
      findConcreteWorldRegion(fixture, existing.regionId);
      const restored = WorldSchema.parse({
        ...existing,
        archivedAt: null,
        updatedAt: now(),
        version: existing.version + 1,
      });

      return replaceWorld(fixture, restored);
    },
  };

  return assertWorldRepository(repository);
};
