import { z } from "zod";

const requiredText = z.string().trim().min(1);
const text = z.string();
const timestamp = z.iso.datetime();
const archivedAt = timestamp.nullable();

export const ImageSourceSchema = z.string().refine(
  (value) =>
    value === "" ||
    value.startsWith("/") ||
    value.startsWith("data:image/") ||
    /^https?:\/\//i.test(value),
  { message: "Image source must be empty, local, HTTP(S), or an image data URL" },
);

export const WorkSchema = z
  .object({
    id: requiredText,
    slug: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
    title: requiredText,
    subtitle: text,
    cover: ImageSourceSchema,
    summary: text,
    genre: text,
    status: z.enum(["planning", "writing", "paused", "completed"]),
    accentColor: z.string().regex(/^#[0-9a-f]{6}$/i),
    archivedAt,
    createdAt: timestamp,
    updatedAt: timestamp,
  })
  .strict();

export const MenuSectionSchema = z
  .object({
    id: requiredText,
    label: requiredText,
    icon: text,
    order: z.number().int().nonnegative(),
    archivedAt,
  })
  .strict();

export const MenuItemSchema = z
  .object({
    id: requiredText,
    sectionId: requiredText,
    label: requiredText,
    slug: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
    resourceType: z.enum([
      "character",
      "world",
      "plot",
      "setting",
      "idea",
      "memo",
      "generic",
    ]),
    filterConfig: z.record(z.string(), z.unknown()),
    order: z.number().int().nonnegative(),
    archivedAt,
  })
  .strict();

export const RichTextBodySchema = z
  .object({
    type: z.literal("doc"),
    content: z.array(z.unknown()),
  })
  .passthrough();

export const ContentEntrySchema = z
  .object({
    id: requiredText,
    workId: requiredText,
    menuItemId: requiredText,
    type: requiredText,
    title: requiredText,
    summary: text,
    body: RichTextBodySchema,
    tags: z.array(requiredText),
    status: requiredText,
    order: z.number().int().nonnegative(),
    version: z.number().int().positive(),
    archivedAt,
    createdAt: timestamp,
    updatedAt: timestamp,
  })
  .strict();

export const ProfileThemeSchema = z
  .object({
    labelBackground: z.string().regex(/^#[0-9a-f]{6}$/i),
    labelText: z.string().regex(/^#[0-9a-f]{6}$/i),
    autoText: z.boolean(),
  })
  .strict();

export const CharacterSchema = z
  .object({
    id: requiredText,
    workId: requiredText,
    menuItemId: requiredText,
    resourceType: z.literal("character"),
    regionId: requiredText,
    regionName: text.optional(),
    name: requiredText,
    hanjaName: text,
    englishName: text,
    imageUrl: ImageSourceSchema,
    species: z.enum(["인간", "마물"]),
    birthplace: text,
    gender: text,
    type: text,
    birthDate: text,
    age: text,
    height: text,
    weight: text,
    occupation: text,
    alignment: text,
    affiliation: text,
    faction: text,
    likes: text,
    dislikes: text,
    martialArts: text,
    personality: text,
    appearance: text,
    themeSong: text,
    summary: text,
    notes: text,
    profileTheme: ProfileThemeSchema,
    version: z.number().int().positive(),
    archivedAt,
    createdAt: timestamp,
    updatedAt: timestamp,
  })
  .strict();

export const WorldCategorySchema = z.enum([
  "region",
  "era",
  "rule",
  "history",
  "culture",
  "faction",
  "place",
]);

export const WorldSchema = z
  .object({
    id: requiredText,
    workId: requiredText,
    menuItemId: requiredText,
    resourceType: z.literal("world"),
    category: WorldCategorySchema,
    regionId: requiredText,
    regionName: text.optional(),
    title: requiredText,
    summary: text,
    era: text,
    rules: text,
    history: text,
    culture: text,
    factions: z.array(requiredText),
    places: z.array(requiredText),
    body: RichTextBodySchema,
    tags: z.array(requiredText),
    status: requiredText,
    order: z.number().int().nonnegative(),
    version: z.number().int().positive(),
    archivedAt,
    createdAt: timestamp,
    updatedAt: timestamp,
  })
  .strict();

export const PlotSceneStatusSchema = z.enum([
  "planned",
  "draft",
  "revised",
  "final",
]);

// A clue planted in a scene. It counts as resolved only while it points to an
// active payoff scene in the same work.
export const PlotClueSchema = z
  .object({
    id: requiredText,
    clue: requiredText,
    payoffSceneId: requiredText.nullable(),
    notes: text,
  })
  .strict();

export const PlotSceneSchema = z
  .object({
    id: requiredText,
    workId: requiredText,
    menuItemId: requiredText,
    resourceType: z.literal("plot"),
    chapterId: requiredText,
    chapterName: text.optional(),
    title: requiredText,
    summary: text,
    status: PlotSceneStatusSchema,
    povCharacterId: requiredText.nullable(),
    storyTime: text,
    locationWorldId: requiredText.nullable(),
    locationDetail: text,
    characterIds: z.array(requiredText),
    event: text,
    clues: z.array(PlotClueSchema),
    body: RichTextBodySchema,
    tags: z.array(requiredText),
    order: z.number().int().nonnegative(),
    version: z.number().int().positive(),
    archivedAt,
    createdAt: timestamp,
    updatedAt: timestamp,
  })
  .strict();

// Configurable Setting fields. A setting category menu may list a subset in
// `filterConfig.fields`; values of hidden fields are kept, not cleared.
export const SETTING_FIELD_KEYS = Object.freeze([
  "grade",
  "effect",
  "condition",
  "limitation",
  "owners",
]);

// Setting owners are stored as relations (setting -> character) so the
// character's incoming relations show what it owns or uses.
export const SETTING_OWNER_RELATION_TYPE = "owner";

export const SettingAttributeSchema = z
  .object({
    id: requiredText,
    label: requiredText,
    value: text,
  })
  .strict();

export const SettingSchema = z
  .object({
    id: requiredText,
    workId: requiredText,
    menuItemId: requiredText,
    resourceType: z.literal("setting"),
    categoryId: requiredText,
    categoryName: text.optional(),
    title: requiredText,
    summary: text,
    grade: text,
    effect: text,
    condition: text,
    limitation: text,
    attributes: z.array(SettingAttributeSchema),
    body: RichTextBodySchema,
    tags: z.array(requiredText),
    status: requiredText,
    order: z.number().int().nonnegative(),
    version: z.number().int().positive(),
    archivedAt,
    createdAt: timestamp,
    updatedAt: timestamp,
  })
  .strict();

export const IdeaPrioritySchema = z.enum(["low", "medium", "high"]);

// `adopted` is reached only by converting the idea into a target resource.
export const IdeaStatusSchema = z.enum([
  "seed",
  "developing",
  "ready",
  "adopted",
  "discarded",
]);

export const IDEA_STATUS_TRANSITIONS = Object.freeze({
  seed: Object.freeze(["developing", "discarded"]),
  developing: Object.freeze(["seed", "ready", "discarded"]),
  ready: Object.freeze(["developing", "discarded"]),
  adopted: Object.freeze([]),
  discarded: Object.freeze(["seed"]),
});

// Converted targets keep a relation back to the idea they came from.
export const IDEA_ORIGIN_RELATION_TYPE = "idea-origin";

const EntityEndpointSchema = z
  .object({
    type: requiredText,
    id: requiredText,
  })
  .strict();

export const IdeaSchema = z
  .object({
    id: requiredText,
    workId: requiredText,
    menuItemId: requiredText,
    resourceType: z.literal("idea"),
    categoryId: requiredText,
    categoryName: text.optional(),
    title: requiredText,
    summary: text,
    source: text,
    priority: IdeaPrioritySchema,
    status: IdeaStatusSchema,
    convertedTo: EntityEndpointSchema.nullable(),
    convertedAt: timestamp.nullable(),
    body: RichTextBodySchema,
    tags: z.array(requiredText),
    version: z.number().int().positive(),
    archivedAt,
    createdAt: timestamp,
    updatedAt: timestamp,
  })
  .strict();

export const MemoColorSchema = z.enum([
  "default",
  "yellow",
  "green",
  "blue",
  "pink",
  "purple",
]);

export const MemoChecklistItemSchema = z
  .object({
    id: requiredText,
    text: requiredText,
    done: z.boolean(),
  })
  .strict();

export const MemoSchema = z
  .object({
    id: requiredText,
    workId: requiredText,
    menuItemId: requiredText,
    resourceType: z.literal("memo"),
    title: requiredText,
    text,
    color: MemoColorSchema,
    pinned: z.boolean(),
    pinnedAt: timestamp.nullable(),
    checklist: z.array(MemoChecklistItemSchema),
    tags: z.array(requiredText),
    version: z.number().int().positive(),
    archivedAt,
    createdAt: timestamp,
    updatedAt: timestamp,
  })
  .strict();

const RelationEndSchema = z
  .object({
    type: requiredText,
    id: requiredText,
  })
  .strict();

export const RelationSchema = z
  .object({
    id: requiredText,
    workId: requiredText,
    source: RelationEndSchema,
    target: RelationEndSchema,
    relationType: requiredText,
    label: requiredText,
    bidirectional: z.boolean(),
    notes: text,
    archivedAt,
    createdAt: timestamp,
    updatedAt: timestamp,
  })
  .strict();

const findDuplicate = (items) => {
  const ids = new Set();

  for (const { id } of items) {
    if (ids.has(id)) {
      return id;
    }
    ids.add(id);
  }

  return null;
};

const addReferenceIssue = (context, message, path) => {
  context.addIssue({
    code: "custom",
    message,
    path,
  });
};

export const AppFixtureSchema = z
  .object({
    works: z.array(WorkSchema).min(1),
    menuSections: z.array(MenuSectionSchema).min(1),
    menuItems: z.array(MenuItemSchema).min(1),
    contents: z.array(ContentEntrySchema),
    characters: z.array(CharacterSchema),
    worlds: z.array(WorldSchema),
    plotScenes: z.array(PlotSceneSchema),
    settings: z.array(SettingSchema),
    ideas: z.array(IdeaSchema),
    memos: z.array(MemoSchema),
    relations: z.array(RelationSchema),
  })
  .strict()
  .superRefine((fixture, context) => {
    const collections = [
      ["work", fixture.works],
      ["menu section", fixture.menuSections],
      ["menu item", fixture.menuItems],
      ["content", fixture.contents],
      ["character", fixture.characters],
      ["world", fixture.worlds],
      ["plot scene", fixture.plotScenes],
      ["setting", fixture.settings],
      ["idea", fixture.ideas],
      ["memo", fixture.memos],
      ["relation", fixture.relations],
    ];

    for (const [label, items] of collections) {
      const duplicateId = findDuplicate(items);
      if (duplicateId) {
        addReferenceIssue(
          context,
          `Duplicate ${label} id: ${duplicateId}`,
          [label],
        );
      }
    }

    const workSlugs = new Set();
    fixture.works.forEach((work, index) => {
      if (workSlugs.has(work.slug)) {
        addReferenceIssue(
          context,
          `Duplicate work slug: ${work.slug}`,
          ["works", index, "slug"],
        );
      }
      workSlugs.add(work.slug);
    });

    const workIds = new Set(fixture.works.map(({ id }) => id));
    const sectionIds = new Set(fixture.menuSections.map(({ id }) => id));
    const menuItemsById = new Map(
      fixture.menuItems.map((item) => [item.id, item]),
    );
    const entityKey = ({ type, id }) => JSON.stringify([type, id]);
    const entitiesByKey = new Map();
    const typedCollections = [
      ["contents", fixture.contents, (entry) => entry.type],
      ["characters", fixture.characters, (entry) => entry.resourceType],
      ["worlds", fixture.worlds, (entry) => entry.resourceType],
      ["plotScenes", fixture.plotScenes, (entry) => entry.resourceType],
      ["settings", fixture.settings, (entry) => entry.resourceType],
      ["ideas", fixture.ideas, (entry) => entry.resourceType],
    ];

    for (const [collectionName, entries, getType] of typedCollections) {
      entries.forEach((entry, index) => {
        const type = getType(entry);
        const key = entityKey({ type, id: entry.id });
        if (entitiesByKey.has(key)) {
          addReferenceIssue(
            context,
            `Duplicate typed entity endpoint: ${type}:${entry.id}`,
            [collectionName, index, "id"],
          );
          return;
        }
        entitiesByKey.set(key, entry);
      });
    }

    fixture.menuItems.forEach((item, index) => {
      if (!sectionIds.has(item.sectionId)) {
        addReferenceIssue(
          context,
          `Unknown menu section: ${item.sectionId}`,
          ["menuItems", index, "sectionId"],
        );
      }
    });

    const validateContentReference = (entry, index, collectionName) => {
      if (!workIds.has(entry.workId)) {
        addReferenceIssue(
          context,
          `Unknown work: ${entry.workId}`,
          [collectionName, index, "workId"],
        );
      }
      if (!menuItemsById.has(entry.menuItemId)) {
        addReferenceIssue(
          context,
          `Unknown menu item: ${entry.menuItemId}`,
          [collectionName, index, "menuItemId"],
        );
      }
    };

    fixture.contents.forEach((entry, index) =>
      validateContentReference(entry, index, "contents"),
    );
    fixture.characters.forEach((entry, index) =>
      validateContentReference(entry, index, "characters"),
    );
    fixture.worlds.forEach((world, index) => {
      validateContentReference(world, index, "worlds");

      if (world.regionId !== world.menuItemId) {
        addReferenceIssue(
          context,
          "World regionId must match menuItemId",
          ["worlds", index, "regionId"],
        );
      }

      const menuItem = menuItemsById.get(world.menuItemId);
      if (
        menuItem &&
        (menuItem.id === "world00" ||
          menuItem.sectionId !== "world" ||
          menuItem.resourceType !== "world" ||
          menuItem.filterConfig.scope !== "category")
      ) {
        addReferenceIssue(
          context,
          `World must use a concrete world category menu: ${world.menuItemId}`,
          ["worlds", index, "menuItemId"],
        );
      }
      // Archiving a menu keeps its content, so an archived World menu is valid
      // here. Repositories still require an active menu for create/restore.
    });

    const charactersById = new Map(
      fixture.characters.map((character) => [character.id, character]),
    );
    const worldsById = new Map(fixture.worlds.map((world) => [world.id, world]));
    const scenesById = new Map(
      fixture.plotScenes.map((scene) => [scene.id, scene]),
    );
    const validateSameWorkReference = (
      collection,
      id,
      workId,
      label,
      path,
    ) => {
      const referenced = collection.get(id);
      if (!referenced) {
        addReferenceIssue(context, `Unknown ${label}: ${id}`, path);
      } else if (referenced.workId !== workId) {
        addReferenceIssue(
          context,
          `${label} is outside work ${workId}: ${id}`,
          path,
        );
      }
    };

    fixture.plotScenes.forEach((scene, index) => {
      const path = ["plotScenes", index];
      validateContentReference(scene, index, "plotScenes");

      if (scene.chapterId !== scene.menuItemId) {
        addReferenceIssue(
          context,
          "Plot chapterId must match menuItemId",
          [...path, "chapterId"],
        );
      }

      const menuItem = menuItemsById.get(scene.menuItemId);
      if (
        menuItem &&
        (menuItem.sectionId !== "plot" ||
          menuItem.resourceType !== "plot" ||
          menuItem.filterConfig.scope !== "category")
      ) {
        addReferenceIssue(
          context,
          `Plot scene must use a concrete plot chapter menu: ${scene.menuItemId}`,
          [...path, "menuItemId"],
        );
      }

      if (scene.povCharacterId) {
        validateSameWorkReference(
          charactersById,
          scene.povCharacterId,
          scene.workId,
          "POV character",
          [...path, "povCharacterId"],
        );
      }
      if (scene.locationWorldId) {
        validateSameWorkReference(
          worldsById,
          scene.locationWorldId,
          scene.workId,
          "location world",
          [...path, "locationWorldId"],
        );
      }
      if (new Set(scene.characterIds).size !== scene.characterIds.length) {
        addReferenceIssue(
          context,
          "Plot scene characters must be unique",
          [...path, "characterIds"],
        );
      }
      scene.characterIds.forEach((characterId, characterIndex) =>
        validateSameWorkReference(
          charactersById,
          characterId,
          scene.workId,
          "scene character",
          [...path, "characterIds", characterIndex],
        ),
      );

      const clueIds = new Set();
      scene.clues.forEach((clue, clueIndex) => {
        const cluePath = [...path, "clues", clueIndex];
        if (clueIds.has(clue.id)) {
          addReferenceIssue(context, `Duplicate clue id: ${clue.id}`, cluePath);
        }
        clueIds.add(clue.id);
        if (!clue.payoffSceneId) return;
        if (clue.payoffSceneId === scene.id) {
          addReferenceIssue(
            context,
            "A clue cannot pay off in its own scene",
            [...cluePath, "payoffSceneId"],
          );
          return;
        }
        validateSameWorkReference(
          scenesById,
          clue.payoffSceneId,
          scene.workId,
          "payoff scene",
          [...cluePath, "payoffSceneId"],
        );
      });
    });

    fixture.settings.forEach((setting, index) => {
      const path = ["settings", index];
      validateContentReference(setting, index, "settings");
      if (setting.categoryId !== setting.menuItemId) {
        addReferenceIssue(
          context,
          "Setting categoryId must match menuItemId",
          [...path, "categoryId"],
        );
      }
      const menuItem = menuItemsById.get(setting.menuItemId);
      if (
        menuItem &&
        (menuItem.sectionId !== "setting" ||
          menuItem.resourceType !== "setting" ||
          menuItem.filterConfig.scope !== "category")
      ) {
        addReferenceIssue(
          context,
          `Setting must use a concrete setting category menu: ${setting.menuItemId}`,
          [...path, "menuItemId"],
        );
      }
      const attributeIds = new Set();
      setting.attributes.forEach((attribute, attributeIndex) => {
        if (attributeIds.has(attribute.id)) {
          addReferenceIssue(
            context,
            `Duplicate setting attribute id: ${attribute.id}`,
            [...path, "attributes", attributeIndex, "id"],
          );
        }
        attributeIds.add(attribute.id);
      });
    });

    fixture.ideas.forEach((idea, index) => {
      const path = ["ideas", index];
      validateContentReference(idea, index, "ideas");
      if (idea.categoryId !== idea.menuItemId) {
        addReferenceIssue(context, "Idea categoryId must match menuItemId", [...path, "categoryId"]);
      }
      const menuItem = menuItemsById.get(idea.menuItemId);
      if (
        menuItem &&
        (menuItem.sectionId !== "idea" ||
          menuItem.resourceType !== "idea" ||
          menuItem.filterConfig.scope !== "category")
      ) {
        addReferenceIssue(
          context,
          `Idea must use a concrete idea category menu: ${idea.menuItemId}`,
          [...path, "menuItemId"],
        );
      }
      const adopted = idea.status === "adopted";
      if (adopted !== Boolean(idea.convertedTo) || adopted !== Boolean(idea.convertedAt)) {
        addReferenceIssue(
          context,
          "Adopted ideas must record their conversion target and time",
          [...path, "status"],
        );
      }
      if (idea.convertedTo) {
        const target = entitiesByKey.get(entityKey(idea.convertedTo));
        if (!target) {
          addReferenceIssue(
            context,
            `Unknown idea conversion target: ${idea.convertedTo.type}:${idea.convertedTo.id}`,
            [...path, "convertedTo"],
          );
        } else if (target.workId !== idea.workId) {
          addReferenceIssue(
            context,
            `Idea conversion target is outside work ${idea.workId}`,
            [...path, "convertedTo"],
          );
        }
      }
    });

    fixture.memos.forEach((memo, index) => {
      const path = ["memos", index];
      validateContentReference(memo, index, "memos");
      const menuItem = menuItemsById.get(memo.menuItemId);
      if (menuItem && (menuItem.sectionId !== "memo" || menuItem.resourceType !== "memo")) {
        addReferenceIssue(context, `Memo must use a memo menu: ${memo.menuItemId}`, [...path, "menuItemId"]);
      }
      if (memo.pinned !== Boolean(memo.pinnedAt)) {
        addReferenceIssue(context, "Pinned memos must record pinnedAt", [...path, "pinnedAt"]);
      }
      const itemIds = new Set();
      memo.checklist.forEach((item, itemIndex) => {
        if (itemIds.has(item.id)) {
          addReferenceIssue(
            context,
            `Duplicate memo checklist item id: ${item.id}`,
            [...path, "checklist", itemIndex, "id"],
          );
        }
        itemIds.add(item.id);
      });
    });

    fixture.menuItems.forEach((item, index) => {
      const fields = item.filterConfig.fields;
      if (fields === undefined) return;
      if (
        !Array.isArray(fields) ||
        fields.some((field) => !SETTING_FIELD_KEYS.includes(field)) ||
        new Set(fields).size !== fields.length
      ) {
        addReferenceIssue(
          context,
          `Invalid setting field configuration: ${item.id}`,
          ["menuItems", index, "filterConfig", "fields"],
        );
      }
    });

    fixture.relations.forEach((relation, index) => {
      if (!workIds.has(relation.workId)) {
        addReferenceIssue(
          context,
          `Unknown work: ${relation.workId}`,
          ["relations", index, "workId"],
        );
      }

      const sourceKey = entityKey(relation.source);
      const targetKey = entityKey(relation.target);
      const source = entitiesByKey.get(sourceKey);
      const target = entitiesByKey.get(targetKey);

      if (!source) {
        addReferenceIssue(
          context,
          `Unknown relation source: ${relation.source.type}:${relation.source.id}`,
          ["relations", index, "source"],
        );
      } else if (source.workId !== relation.workId) {
        addReferenceIssue(
          context,
          `Relation source is outside work ${relation.workId}: ${relation.source.type}:${relation.source.id}`,
          ["relations", index, "source"],
        );
      }

      if (!target) {
        addReferenceIssue(
          context,
          `Unknown relation target: ${relation.target.type}:${relation.target.id}`,
          ["relations", index, "target"],
        );
      } else if (target.workId !== relation.workId) {
        addReferenceIssue(
          context,
          `Relation target is outside work ${relation.workId}: ${relation.target.type}:${relation.target.id}`,
          ["relations", index, "target"],
        );
      }

      if (
        relation.relationType === SETTING_OWNER_RELATION_TYPE &&
        (relation.source.type !== "setting" ||
          relation.target.type !== "character")
      ) {
        addReferenceIssue(
          context,
          "Owner relations must link a setting to a character",
          ["relations", index],
        );
      }

      if (
        relation.relationType === IDEA_ORIGIN_RELATION_TYPE &&
        relation.target.type !== "idea"
      ) {
        addReferenceIssue(
          context,
          "Idea origin relations must point to an idea",
          ["relations", index, "target"],
        );
      }

      if (sourceKey === targetKey) {
        addReferenceIssue(
          context,
          `Relation cannot target itself: ${relation.source.type}:${relation.source.id}`,
          ["relations", index, "target"],
        );
      }

      for (let previousIndex = 0; previousIndex < index; previousIndex += 1) {
        const previous = fixture.relations[previousIndex];
        if (previous.archivedAt || relation.archivedAt) continue;
        if (previous.relationType !== relation.relationType) {
          continue;
        }

        const previousSourceKey = entityKey(previous.source);
        const previousTargetKey = entityKey(previous.target);
        const isExactDuplicate =
          previousSourceKey === sourceKey && previousTargetKey === targetKey;
        const isBidirectionalReverse =
          (previous.bidirectional || relation.bidirectional) &&
          previousSourceKey === targetKey &&
          previousTargetKey === sourceKey;

        if (isExactDuplicate || isBidirectionalReverse) {
          addReferenceIssue(
            context,
            isExactDuplicate
              ? `Duplicate relation: ${relation.relationType}`
              : `Duplicate bidirectional relation: ${relation.relationType}`,
            ["relations", index],
          );
          break;
        }
      }
    });
  });

export const parseAppFixture = (fixture) => AppFixtureSchema.parse(fixture);
