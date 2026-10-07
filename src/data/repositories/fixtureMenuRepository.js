import { z } from "zod";
import { MenuItemSchema, MenuSectionSchema } from "../../domain/schemas";
import { isFixtureContentRelationState } from "./fixtureContentRelationState";
import { assertMenuRepository } from "./menuRepository";

const clone = (value) => structuredClone(value);
const SectionListSchema = z.array(MenuSectionSchema);
const ItemListSchema = z.array(MenuItemSchema);
const byOrder = (first, second) => first.order - second.order;

const defaultCreateId = (type) =>
  `${type}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;

const assertExactPermutation = (receivedIds, expectedIds, message) => {
  const received = new Set(receivedIds);
  const expected = new Set(expectedIds);
  const isExact =
    receivedIds.length === expectedIds.length &&
    received.size === receivedIds.length &&
    receivedIds.every((id) => expected.has(id));

  if (!isExact) {
    throw new Error(message);
  }
};

/**
 * Menu storage. With a shared fixture state, menu changes are written into the
 * same session state that content repositories validate against, so new menus
 * can hold content immediately. A plain `{ menuSections, menuItems }` object
 * keeps an isolated local store (used by focused tests).
 */
const createMenuStore = (initialMenuOrState) => {
  if (isFixtureContentRelationState(initialMenuOrState)) {
    const state = initialMenuOrState;
    return {
      read: () => {
        const fixture = state.read();
        return { items: fixture.menuItems, sections: fixture.menuSections };
      },
      write: (sections, items) =>
        state.replaceMenu({ menuItems: items, menuSections: sections }),
    };
  }

  let stored = {
    items: ItemListSchema.parse(clone(initialMenuOrState.menuItems)),
    sections: SectionListSchema.parse(clone(initialMenuOrState.menuSections)),
  };
  return {
    read: () => clone(stored),
    write: (sections, items) => {
      stored = {
        items: ItemListSchema.parse(clone(items)),
        sections: SectionListSchema.parse(clone(sections)),
      };
    },
  };
};

/**
 * New items inherit their section's resource type so specialized screens
 * (routed by section) always receive matching items. Empty custom sections
 * accept any type and default to generic.
 */
const sectionResourceType = (items, sectionId) => {
  const types = new Set(
    items.filter((item) => item.sectionId === sectionId).map(({ resourceType }) => resourceType),
  );
  return types.size === 1 ? [...types][0] : null;
};

export const createFixtureMenuRepository = (
  initialMenuOrState,
  {
    createId = defaultCreateId,
    now = () => new Date().toISOString(),
  } = {},
) => {
  const store = createMenuStore(initialMenuOrState);
  let sections = [];
  let items = [];

  const load = () => {
    ({ items, sections } = store.read());
  };
  const save = (nextSections, nextItems) => {
    store.write(nextSections, nextItems);
    sections = nextSections;
    items = nextItems;
  };

  const findSection = (sectionId) => {
    const section = sections.find(({ id }) => id === sectionId);
    if (!section) {
      throw new Error(`Menu section not found: ${sectionId}`);
    }
    return section;
  };

  const findItem = (itemId) => {
    const item = items.find(({ id }) => id === itemId);
    if (!item) {
      throw new Error(`Menu item not found: ${itemId}`);
    }
    return item;
  };

  const assertUniqueState = () => {
    const sectionIds = new Set();
    const itemIds = new Set();
    const slugs = new Set();

    for (const section of sections) {
      if (sectionIds.has(section.id)) {
        throw new Error(`Duplicate menu section id: ${section.id}`);
      }
      sectionIds.add(section.id);
    }

    for (const item of items) {
      if (!sectionIds.has(item.sectionId)) {
        throw new Error(`Unknown menu section: ${item.sectionId}`);
      }
      if (itemIds.has(item.id)) {
        throw new Error(`Duplicate menu item id: ${item.id}`);
      }
      if (slugs.has(item.slug)) {
        throw new Error(`Menu item slug already exists: ${item.slug}`);
      }
      itemIds.add(item.id);
      slugs.add(item.slug);
    }
  };

  const assertAvailableSlug = (slug, currentItemId) => {
    if (items.some((item) => item.slug === slug && item.id !== currentItemId)) {
      throw new Error(`Menu item slug already exists: ${slug}`);
    }
  };

  const replaceSection = (updated) => {
    save(
      sections.map((section) => (section.id === updated.id ? updated : section)),
      items,
    );
    return clone(updated);
  };

  const replaceItem = (updated) => {
    save(
      sections,
      items.map((item) => (item.id === updated.id ? updated : item)),
    );
    return clone(updated);
  };

  const listSections = ({ includeArchived = false } = {}) =>
    clone(
      [...sections]
        .filter((section) => includeArchived || !section.archivedAt)
        .sort(byOrder),
    );

  const listItems = (sectionId, { includeArchived = false } = {}) => {
    findSection(sectionId);
    return clone(
      [...items]
        .filter(
          (item) =>
            item.sectionId === sectionId &&
            (includeArchived || !item.archivedAt),
        )
        .sort(byOrder),
    );
  };

  load();
  assertUniqueState();

  const repository = {
    async listTree({ includeArchived = false } = {}) {
      load();
      return clone(
        [...sections]
          .sort(byOrder)
          .filter((section) => includeArchived || !section.archivedAt)
          .map((section) => ({
            ...section,
            items: [...items]
              .filter(
                (item) =>
                  item.sectionId === section.id &&
                  (includeArchived || (!section.archivedAt && !item.archivedAt)),
              )
              .sort(byOrder),
          })),
      );
    },

    async listSections(options) {
      load();
      return listSections(options);
    },

    async getSection(sectionId) {
      load();
      return clone(findSection(sectionId));
    },

    async createSection(sectionData) {
      load();
      const section = MenuSectionSchema.parse({
        id: createId("section"),
        label: sectionData.label,
        icon: sectionData.icon ?? "folder",
        order: sections.length,
        archivedAt: null,
      });
      if (sections.some(({ id }) => id === section.id)) {
        throw new Error(`Duplicate menu section id: ${section.id}`);
      }
      save([...sections, section], items);
      return clone(section);
    },

    async updateSection(sectionId, updates) {
      load();
      const existing = findSection(sectionId);
      return replaceSection(
        MenuSectionSchema.parse({
          ...existing,
          label: updates.label ?? existing.label,
          icon: updates.icon ?? existing.icon,
        }),
      );
    },

    async reorderSections(sectionIds) {
      load();
      const active = [...sections].filter(({ archivedAt }) => !archivedAt).sort(byOrder);
      const archived = [...sections].filter(({ archivedAt }) => archivedAt).sort(byOrder);
      assertExactPermutation(
        sectionIds,
        active.map(({ id }) => id),
        "Section reorder must include every active section exactly once",
      );
      const activeById = new Map(active.map((section) => [section.id, section]));
      save(
        [...sectionIds.map((id) => activeById.get(id)), ...archived].map(
          (section, order) => ({ ...section, order }),
        ),
        items,
      );
      return listSections();
    },

    async archiveSection(sectionId) {
      load();
      const existing = findSection(sectionId);
      if (existing.archivedAt) {
        return clone(existing);
      }
      return replaceSection(
        MenuSectionSchema.parse({ ...existing, archivedAt: now() }),
      );
    },

    async restoreSection(sectionId) {
      load();
      const existing = findSection(sectionId);
      if (!existing.archivedAt) {
        return clone(existing);
      }
      return replaceSection(
        MenuSectionSchema.parse({
          ...existing,
          archivedAt: null,
          order: sections.length - 1,
        }),
      );
    },

    async listItems(sectionId, options) {
      load();
      return listItems(sectionId, options);
    },

    async getItem(itemId) {
      load();
      return clone(findItem(itemId));
    },

    async createItem(sectionId, itemData) {
      load();
      const section = findSection(sectionId);
      if (section.archivedAt) {
        throw new Error(`Menu section is archived: ${sectionId}`);
      }
      const sectionType = sectionResourceType(items, sectionId);
      const resourceType = itemData.resourceType || sectionType || "generic";
      if (sectionType && resourceType !== sectionType) {
        throw new Error(
          `Menu item type must match section type ${sectionType}: ${resourceType}`,
        );
      }
      const siblingCount = items.filter((item) => item.sectionId === sectionId).length;
      const slug = String(itemData.slug ?? "").trim().toLowerCase();
      assertAvailableSlug(slug);
      const item = MenuItemSchema.parse({
        id: createId("item"),
        sectionId,
        label: itemData.label,
        slug,
        resourceType,
        // New menus are concrete categories unless configured otherwise.
        filterConfig: { scope: "category", ...clone(itemData.filterConfig ?? {}) },
        order: siblingCount,
        archivedAt: null,
      });
      if (items.some(({ id }) => id === item.id)) {
        throw new Error(`Duplicate menu item id: ${item.id}`);
      }
      save(sections, [...items, item]);
      return clone(item);
    },

    async updateItem(itemId, updates) {
      load();
      const existing = findItem(itemId);
      const slug =
        updates.slug === undefined
          ? existing.slug
          : String(updates.slug).trim().toLowerCase();
      assertAvailableSlug(slug, itemId);
      return replaceItem(
        MenuItemSchema.parse({
          ...existing,
          label: updates.label ?? existing.label,
          slug,
          filterConfig:
            updates.filterConfig === undefined
              ? existing.filterConfig
              : {
                  // Scope is structural and cannot be changed from the editor.
                  ...clone(updates.filterConfig),
                  scope: existing.filterConfig.scope,
                },
        }),
      );
    },

    async reorderItems(sectionId, itemIds) {
      load();
      findSection(sectionId);
      const siblings = [...items]
        .filter((item) => item.sectionId === sectionId)
        .sort(byOrder);
      const active = siblings.filter(({ archivedAt }) => !archivedAt);
      const archived = siblings.filter(({ archivedAt }) => archivedAt);
      assertExactPermutation(
        itemIds,
        active.map(({ id }) => id),
        `Item reorder must include every active item in section ${sectionId} exactly once`,
      );
      const activeById = new Map(active.map((item) => [item.id, item]));
      const reordered = [
        ...itemIds.map((id) => activeById.get(id)),
        ...archived,
      ].map((item, order) => ({ ...item, order }));
      const reorderedById = new Map(reordered.map((item) => [item.id, item]));
      save(
        sections,
        items.map((item) => reorderedById.get(item.id) ?? item),
      );
      return listItems(sectionId);
    },

    async archiveItem(itemId) {
      load();
      const existing = findItem(itemId);
      if (existing.archivedAt) {
        return clone(existing);
      }
      return replaceItem(MenuItemSchema.parse({ ...existing, archivedAt: now() }));
    },

    async restoreItem(itemId) {
      load();
      const existing = findItem(itemId);
      const section = findSection(existing.sectionId);
      if (section.archivedAt) {
        throw new Error(`Menu section is archived: ${section.id}`);
      }
      if (!existing.archivedAt) {
        return clone(existing);
      }
      const siblingCount = items.filter(
        (item) => item.sectionId === existing.sectionId,
      ).length;
      return replaceItem(
        MenuItemSchema.parse({
          ...existing,
          archivedAt: null,
          order: siblingCount - 1,
        }),
      );
    },

    async requireActiveItem(sectionId, itemId) {
      load();
      const section = findSection(sectionId);
      if (section.archivedAt) {
        throw new Error(`Menu section is archived: ${sectionId}`);
      }
      const item = findItem(itemId);
      if (item.sectionId !== sectionId) {
        throw new Error(`Menu item does not belong to section ${sectionId}`);
      }
      if (item.archivedAt) {
        throw new Error(`Menu item is archived: ${itemId}`);
      }
      return clone(item);
    },
  };

  return assertMenuRepository(repository);
};
