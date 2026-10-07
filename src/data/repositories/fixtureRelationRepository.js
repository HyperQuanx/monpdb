import { RelationSchema } from "../../domain/schemas";
import { asFixtureContentRelationState } from "./fixtureContentRelationState";
import { assertRelationRepository } from "./relationRepository";

const clone = (value) => structuredClone(value);
const endpointKey = (endpoint) => JSON.stringify([endpoint.type, endpoint.id]);
const sameEndpoint = (first, second) =>
  endpointKey(first) === endpointKey(second);

const defaultCreateId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `relation-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const getEntities = (fixture) => [
  ...fixture.contents.map((content) => ({
    endpoint: { type: content.type, id: content.id },
    entityType: "content",
    label: content.title,
    menuItemId: content.menuItemId,
    workId: content.workId,
    archivedAt: content.archivedAt,
  })),
  ...fixture.ideas.map((idea) => ({
    endpoint: { type: idea.resourceType, id: idea.id },
    entityType: "idea",
    label: idea.title,
    menuItemId: idea.menuItemId,
    workId: idea.workId,
    archivedAt: idea.archivedAt,
  })),
  ...fixture.worlds.map((world) => ({
    endpoint: { type: world.resourceType, id: world.id },
    entityType: "world",
    label: world.title,
    menuItemId: world.menuItemId,
    workId: world.workId,
    archivedAt: world.archivedAt,
  })),
  ...fixture.characters.map((character) => ({
    endpoint: { type: character.resourceType, id: character.id },
    entityType: "character",
    label: character.name,
    menuItemId: character.menuItemId,
    workId: character.workId,
    archivedAt: character.archivedAt,
  })),
  ...fixture.settings.map((setting) => ({
    endpoint: { type: setting.resourceType, id: setting.id },
    entityType: "setting",
    label: setting.title,
    menuItemId: setting.menuItemId,
    workId: setting.workId,
    archivedAt: setting.archivedAt,
  })),
  ...fixture.plotScenes.map((scene) => ({
    endpoint: { type: scene.resourceType, id: scene.id },
    entityType: "plot",
    label: scene.title,
    menuItemId: scene.menuItemId,
    workId: scene.workId,
    archivedAt: scene.archivedAt,
  })),
];

const isDuplicate = (first, second) => {
  if (first.relationType !== second.relationType) {
    return false;
  }

  const exact =
    sameEndpoint(first.source, second.source) &&
    sameEndpoint(first.target, second.target);
  const bidirectionalReverse =
    (first.bidirectional || second.bidirectional) &&
    sameEndpoint(first.source, second.target) &&
    sameEndpoint(first.target, second.source);

  return exact || bidirectionalReverse;
};

export const createFixtureRelationRepository = (
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

  const findEntity = (fixture, workId, endpoint, { active = false } = {}) => {
    const entity = getEntities(fixture).find((candidate) =>
      sameEndpoint(candidate.endpoint, endpoint),
    );
    if (!entity) {
      throw new Error(
        `Unknown relation endpoint: ${endpoint?.type}:${endpoint?.id}`,
      );
    }
    if (entity.workId !== workId) {
      throw new Error(
        `Relation endpoint is outside work ${workId}: ${endpoint.type}:${endpoint.id}`,
      );
    }
    if (active && entity.archivedAt) {
      throw new Error(
        `Relation endpoint is archived: ${endpoint.type}:${endpoint.id}`,
      );
    }
    return entity;
  };

  const validateRelation = (
    fixture,
    relation,
    otherRelations,
    { allowArchivedTarget = false } = {},
  ) => {
    if (sameEndpoint(relation.source, relation.target)) {
      throw new Error(
        `Relation cannot target itself: ${relation.source.type}:${relation.source.id}`,
      );
    }
    findEntity(fixture, relation.workId, relation.source, { active: true });
    findEntity(fixture, relation.workId, relation.target, {
      active: !allowArchivedTarget,
    });
    if (
      otherRelations.some(
        (candidate) => !candidate.archivedAt && isDuplicate(candidate, relation),
      )
    ) {
      throw new Error(`Duplicate relation: ${relation.relationType}`);
    }
  };

  const buildNewRelation = (workId, relationData, timestamp) =>
    RelationSchema.parse({
      relationType: relationData.relationType,
      label: relationData.label,
      bidirectional: relationData.bidirectional ?? false,
      notes: relationData.notes ?? "",
      id: createId(),
      workId,
      source: clone(relationData.source),
      target: clone(relationData.target),
      archivedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

  const repository = {
    async list(workId, entity) {
      const fixture = state.read();
      assertWork(fixture, workId);
      findEntity(fixture, workId, entity);

      return clone(
        fixture.relations.filter(
          (relation) =>
            relation.workId === workId &&
            !relation.archivedAt &&
            (sameEndpoint(relation.source, entity) ||
              sameEndpoint(relation.target, entity)),
        ),
      );
    },

    async listCandidates(workId, source, options = {}) {
      const fixture = state.read();
      assertWork(fixture, workId);
      const includeArchived = options?.includeArchived === true;
      if (source !== undefined) {
        findEntity(fixture, workId, source, { active: !includeArchived });
      }

      return clone(
        getEntities(fixture).filter(
          (candidate) =>
            candidate.workId === workId &&
            (includeArchived || !candidate.archivedAt) &&
            (source === undefined ||
              !sameEndpoint(candidate.endpoint, source)),
        ),
      );
    },

    async create(workId, relationData) {
      const fixture = state.read();
      assertWork(fixture, workId);
      const relation = buildNewRelation(workId, relationData, now());
      if (fixture.relations.some(({ id }) => id === relation.id)) {
        throw new Error(`Duplicate relation id: ${relation.id}`);
      }
      validateRelation(fixture, relation, fixture.relations);
      state.replaceRelations([...fixture.relations, relation]);
      return clone(relation);
    },

    async replaceOutgoing(workId, source, drafts) {
      if (!Array.isArray(drafts)) {
        throw new TypeError("Relation drafts must be an array.");
      }

      const fixture = state.read();
      assertWork(fixture, workId);
      findEntity(fixture, workId, source, { active: true });
      const timestamp = now();
      const outgoing = fixture.relations.filter(
        (relation) =>
          relation.workId === workId &&
          !relation.archivedAt &&
          sameEndpoint(relation.source, source),
      );
      const outgoingById = new Map(
        outgoing.map((relation) => [relation.id, relation]),
      );
      const outgoingIds = new Set(outgoingById.keys());
      const retainedRelations = fixture.relations.filter(
        (relation) => !outgoingIds.has(relation.id),
      );
      const replacements = [];
      const usedExistingIds = new Set();

      for (const draft of drafts) {
        const existing =
          outgoingById.get(draft.id) ??
          outgoing.find(
            (relation) =>
              !usedExistingIds.has(relation.id) &&
              relation.relationType === draft.relationType &&
              sameEndpoint(relation.target, draft.target),
          );
        if (existing) {
          usedExistingIds.add(existing.id);
        }
        const replacement = existing
          ? RelationSchema.parse({
              ...existing,
              ...clone(draft),
              id: existing.id,
              workId,
              source: clone(source),
              target: clone(draft.target),
              archivedAt: null,
              createdAt: existing.createdAt,
              updatedAt: timestamp,
            })
          : buildNewRelation(
              workId,
              { ...clone(draft), source: clone(source) },
              timestamp,
            );

        if (
          !existing &&
          fixture.relations.some(({ id }) => id === replacement.id)
        ) {
          throw new Error(`Duplicate relation id: ${replacement.id}`);
        }
        // An existing relation whose target was archived later is preserved
        // on save; only new or retargeted relations require an active target.
        validateRelation(
          fixture,
          replacement,
          [...retainedRelations, ...replacements],
          {
            allowArchivedTarget: Boolean(
              existing && sameEndpoint(existing.target, replacement.target),
            ),
          },
        );
        replacements.push(replacement);
      }

      const replacementsById = new Map(
        replacements.map((relation) => [relation.id, relation]),
      );
      const nextRelations = fixture.relations.map((relation) => {
        const replacement = replacementsById.get(relation.id);
        if (replacement) {
          return replacement;
        }
        if (outgoingIds.has(relation.id)) {
          return RelationSchema.parse({
            ...relation,
            archivedAt: timestamp,
            updatedAt: timestamp,
          });
        }
        return relation;
      });
      const existingIds = new Set(fixture.relations.map(({ id }) => id));
      state.replaceRelations([
        ...nextRelations,
        ...replacements.filter(({ id }) => !existingIds.has(id)),
      ]);
      return clone(replacements);
    },

    async archive(workId, relationId) {
      const fixture = state.read();
      assertWork(fixture, workId);
      const existing = fixture.relations.find(
        (relation) =>
          relation.workId === workId && relation.id === relationId,
      );
      if (!existing) {
        throw new Error(
          `Relation not found in work ${workId}: ${relationId}`,
        );
      }
      if (existing.archivedAt) {
        return clone(existing);
      }
      const timestamp = now();
      const archived = RelationSchema.parse({
        ...existing,
        archivedAt: timestamp,
        updatedAt: timestamp,
      });
      state.replaceRelations(
        fixture.relations.map((relation) =>
          relation.id === relationId ? archived : relation,
        ),
      );
      return clone(archived);
    },

    async restore(workId, relationId) {
      const fixture = state.read();
      assertWork(fixture, workId);
      const existing = fixture.relations.find(
        (relation) =>
          relation.workId === workId && relation.id === relationId,
      );
      if (!existing) {
        throw new Error(
          `Relation not found in work ${workId}: ${relationId}`,
        );
      }
      if (!existing.archivedAt) {
        return clone(existing);
      }
      const restored = RelationSchema.parse({
        ...existing,
        archivedAt: null,
        updatedAt: now(),
      });
      validateRelation(
        fixture,
        restored,
        fixture.relations.filter(({ id }) => id !== relationId),
      );
      state.replaceRelations(
        fixture.relations.map((relation) =>
          relation.id === relationId ? restored : relation,
        ),
      );
      return clone(restored);
    },
  };

  return assertRelationRepository(repository);
};
