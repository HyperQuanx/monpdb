import {
  SETTING_OWNER_RELATION_TYPE,
  SettingSchema,
} from "../../domain/schemas";
import { asFixtureContentRelationState } from "./fixtureContentRelationState";
import { assertSettingRepository } from "./settingRepository";

export const SETTING_ALL_CATEGORY_ID = "setting00";

const archiveStatuses = new Set(["active", "archived", "all"]);
const clone = (value) => structuredClone(value);
const normalizeSearchText = (value) =>
  String(value ?? "").trim().toLocaleLowerCase("ko-KR");
const emptyBody = { type: "doc", content: [] };
const searchableFields = [
  "title",
  "summary",
  "grade",
  "effect",
  "condition",
  "limitation",
];

const randomId = (prefix) =>
  globalThis.crypto?.randomUUID?.() ??
  `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

/** Active owner relations grouped by setting id. */
const ownersBySetting = (fixture, workId) => {
  const owners = new Map();
  for (const relation of fixture.relations) {
    if (
      relation.workId !== workId ||
      relation.archivedAt ||
      relation.relationType !== SETTING_OWNER_RELATION_TYPE ||
      relation.source.type !== "setting"
    ) {
      continue;
    }
    const list = owners.get(relation.source.id) ?? [];
    list.push(relation.target.id);
    owners.set(relation.source.id, list);
  }
  return owners;
};

export const createFixtureSettingRepository = (
  fixtureOrState,
  {
    createId = () => randomId("setting"),
    createAttributeId = () => randomId("attribute"),
    now = () => new Date().toISOString(),
  } = {},
) => {
  const state = asFixtureContentRelationState(fixtureOrState);

  const assertWork = (fixture, workId) => {
    if (!fixture.works.some(({ id }) => id === workId)) {
      throw new Error(`Work not found: ${workId}`);
    }
  };

  const findSetting = (fixture, workId, settingId) => {
    assertWork(fixture, workId);
    const setting = fixture.settings.find(
      (candidate) => candidate.workId === workId && candidate.id === settingId,
    );
    if (!setting) {
      throw new Error(`Setting not found in work ${workId}: ${settingId}`);
    }
    return setting;
  };

  const findConcreteCategory = (fixture, categoryId) => {
    if (!categoryId || categoryId === SETTING_ALL_CATEGORY_ID) {
      throw new Error("A concrete setting category is required.");
    }
    const menuItem = fixture.menuItems.find(({ id }) => id === categoryId);
    if (!menuItem) {
      throw new Error(`Setting category not found: ${categoryId}`);
    }
    if (
      menuItem.sectionId !== "setting" ||
      menuItem.resourceType !== "setting" ||
      menuItem.filterConfig.scope !== "category"
    ) {
      throw new Error(`Invalid setting category: ${categoryId}`);
    }
    const section = fixture.menuSections.find(
      ({ id }) => id === menuItem.sectionId,
    );
    if (menuItem.archivedAt || section?.archivedAt) {
      throw new Error(`Setting category is archived: ${categoryId}`);
    }
    return menuItem;
  };

  const normalizeAttributes = (attributes = []) => {
    const ids = new Set();
    return attributes.map((attribute) => {
      const id = attribute.id ? String(attribute.id) : createAttributeId();
      if (ids.has(id)) {
        throw new Error(`Duplicate setting attribute id: ${id}`);
      }
      ids.add(id);
      return {
        id,
        label: String(attribute.label ?? "").trim(),
        value: String(attribute.value ?? ""),
      };
    });
  };

  const nextOrder = (fixture, workId, categoryId, excludedId) => {
    const orders = fixture.settings
      .filter(
        (setting) =>
          setting.workId === workId &&
          setting.categoryId === categoryId &&
          setting.id !== excludedId,
      )
      .map(({ order }) => order);
    return orders.length ? Math.max(...orders) + 1 : 0;
  };

  const replaceSetting = (fixture, updated) => {
    state.replaceSettings(
      fixture.settings.map((setting) =>
        setting.workId === updated.workId && setting.id === updated.id
          ? updated
          : setting,
      ),
    );
    return clone(updated);
  };

  const repository = {
    async list({
      workId,
      categoryId,
      q,
      grade,
      ownerCharacterId,
      archiveStatus = "active",
    } = {}) {
      const fixture = state.read();
      assertWork(fixture, workId);
      if (!archiveStatuses.has(archiveStatus)) {
        throw new Error(`Invalid setting archive status: ${archiveStatus}`);
      }
      const normalizedQuery = normalizeSearchText(q);
      const normalizedGrade = normalizeSearchText(grade);
      const owners = ownersBySetting(fixture, workId);
      const categoryOrder = new Map(
        fixture.menuItems
          .filter(({ sectionId }) => sectionId === "setting")
          .map(({ id, order }) => [id, order]),
      );

      return clone(
        fixture.settings
          .filter((setting) => {
            if (setting.workId !== workId) return false;
            const matchesArchive =
              archiveStatus === "all" ||
              (archiveStatus === "archived"
                ? Boolean(setting.archivedAt)
                : !setting.archivedAt);
            const matchesCategory =
              !categoryId ||
              categoryId === SETTING_ALL_CATEGORY_ID ||
              setting.categoryId === categoryId;
            const matchesGrade =
              !normalizedGrade ||
              normalizeSearchText(setting.grade).includes(normalizedGrade);
            const matchesOwner =
              !ownerCharacterId ||
              (owners.get(setting.id) ?? []).includes(ownerCharacterId);
            const matchesSearch =
              !normalizedQuery ||
              searchableFields.some((field) =>
                normalizeSearchText(setting[field]).includes(normalizedQuery),
              ) ||
              setting.tags.some((tag) =>
                normalizeSearchText(tag).includes(normalizedQuery),
              ) ||
              setting.attributes.some((attribute) =>
                normalizeSearchText(`${attribute.label} ${attribute.value}`).includes(
                  normalizedQuery,
                ),
              );
            return (
              matchesArchive &&
              matchesCategory &&
              matchesGrade &&
              matchesOwner &&
              matchesSearch
            );
          })
          .sort(
            (first, second) =>
              (categoryOrder.get(first.categoryId) ?? 0) -
                (categoryOrder.get(second.categoryId) ?? 0) ||
              first.order - second.order,
          ),
      );
    },

    async get(workId, settingId) {
      const fixture = state.read();
      return clone(findSetting(fixture, workId, settingId));
    },

    async listOwners(workId) {
      const fixture = state.read();
      assertWork(fixture, workId);
      return Object.fromEntries(ownersBySetting(fixture, workId));
    },

    async create(workId, settingData = {}) {
      const fixture = state.read();
      assertWork(fixture, workId);
      const input = clone(settingData);
      const category = findConcreteCategory(fixture, input.categoryId);
      const timestamp = now();
      const setting = SettingSchema.parse({
        summary: "",
        grade: "",
        effect: "",
        condition: "",
        limitation: "",
        status: "draft",
        ...input,
        id: createId(),
        workId,
        menuItemId: category.id,
        resourceType: "setting",
        categoryId: category.id,
        categoryName: category.label,
        title: String(input.title ?? "").trim(),
        attributes: normalizeAttributes(input.attributes),
        body: clone(input.body ?? emptyBody),
        tags: clone(input.tags ?? []),
        order: nextOrder(fixture, workId, category.id),
        version: 1,
        archivedAt: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      if (fixture.settings.some(({ id }) => id === setting.id)) {
        throw new Error(`Duplicate setting id: ${setting.id}`);
      }
      state.replaceSettings([...fixture.settings, setting]);
      return clone(setting);
    },

    async update(workId, settingId, updates = {}) {
      const fixture = state.read();
      const existing = findSetting(fixture, workId, settingId);
      const input = clone(updates);
      const category = findConcreteCategory(
        fixture,
        input.categoryId ?? existing.categoryId,
      );
      const moved = category.id !== existing.categoryId;
      const updated = SettingSchema.parse({
        ...existing,
        ...input,
        id: existing.id,
        workId: existing.workId,
        menuItemId: category.id,
        resourceType: "setting",
        categoryId: category.id,
        categoryName: category.label,
        title: String(input.title ?? existing.title).trim(),
        attributes: normalizeAttributes(input.attributes ?? existing.attributes),
        body: clone(input.body ?? existing.body),
        tags: clone(input.tags ?? existing.tags),
        // Moving to another category appends the entry to that category.
        order: moved ? nextOrder(fixture, workId, category.id, existing.id) : existing.order,
        version: existing.version + 1,
        archivedAt: existing.archivedAt,
        createdAt: existing.createdAt,
        updatedAt: now(),
      });
      return replaceSetting(fixture, updated);
    },

    async archive(workId, settingId) {
      const fixture = state.read();
      const existing = findSetting(fixture, workId, settingId);
      if (existing.archivedAt) return clone(existing);
      const timestamp = now();
      return replaceSetting(
        fixture,
        SettingSchema.parse({
          ...existing,
          archivedAt: timestamp,
          updatedAt: timestamp,
          version: existing.version + 1,
        }),
      );
    },

    async restore(workId, settingId) {
      const fixture = state.read();
      const existing = findSetting(fixture, workId, settingId);
      if (!existing.archivedAt) return clone(existing);
      findConcreteCategory(fixture, existing.categoryId);
      return replaceSetting(
        fixture,
        SettingSchema.parse({
          ...existing,
          archivedAt: null,
          updatedAt: now(),
          version: existing.version + 1,
        }),
      );
    },
  };

  return assertSettingRepository(repository);
};
