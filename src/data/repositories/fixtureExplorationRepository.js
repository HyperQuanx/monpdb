import {
  createGraph,
  excerptAround,
  extractRichText,
  getNeighborhood,
  scoreEntity,
} from "../../domain/exploration";
import { asFixtureContentRelationState } from "./fixtureContentRelationState";

export const EXPLORATION_KINDS = Object.freeze([
  "character",
  "world",
  "plot",
  "setting",
  "idea",
  "memo",
  "content",
]);

const requiredMethods = ["search", "listRecentlyUpdated", "resolve", "getNeighborhood"];

export const assertExplorationRepository = (repository) => {
  for (const method of requiredMethods) {
    if (typeof repository?.[method] !== "function") {
      throw new TypeError(`Exploration repository is missing method: ${method}`);
    }
  }
  return repository;
};

const clone = (value) => structuredClone(value);
const joinList = (values) => (values ?? []).filter(Boolean).join(", ");
const field = (key, label, text, weight = 20) => ({ key, label, text: String(text ?? ""), weight });

/**
 * One searchable/linkable record per entity. `kind` groups collections for
 * filtering; `endpoint` is the relation identity ({ type, id }).
 */
const indexEntities = (fixture, workId) => {
  const menuItems = new Map(fixture.menuItems.map((item) => [item.id, item]));
  const base = (kind, entity, endpointType, label, extra) => ({
    archivedAt: entity.archivedAt ?? null,
    endpoint: { type: endpointType, id: entity.id },
    kind,
    label,
    menuItemId: entity.menuItemId,
    sectionId: menuItems.get(entity.menuItemId)?.sectionId ?? null,
    status: null,
    summary: entity.summary ?? "",
    tags: entity.tags ?? [],
    updatedAt: entity.updatedAt,
    ...extra,
  });
  const inWork = (items) => items.filter((item) => item.workId === workId);

  return [
    ...inWork(fixture.characters).map((character) =>
      base("character", character, "character", character.name, {
        fields: [
          field("names", "이름", `${character.hanjaName} ${character.englishName}`, 60),
          field("summary", "요약", character.summary, 30),
          field("affiliation", "소속", `${character.affiliation} ${character.faction}`),
          field("profile", "프로필", [
            character.species, character.occupation, character.alignment,
            character.birthplace, character.martialArts,
          ].join(" ")),
          field("personality", "성격", character.personality, 15),
          field("appearance", "외형", character.appearance, 15),
          field("notes", "특이사항", character.notes, 10),
        ],
      }),
    ),
    ...inWork(fixture.worlds).map((world) =>
      base("world", world, "world", world.title, {
        status: world.status,
        fields: [
          field("tags", "태그", joinList(world.tags), 40),
          field("summary", "요약", world.summary, 30),
          field("era", "시대", world.era),
          field("rules", "규칙", world.rules),
          field("history", "역사", world.history),
          field("culture", "문화", world.culture),
          field("factions", "세력·장소", `${joinList(world.factions)} ${joinList(world.places)}`),
          field("body", "본문", extractRichText(world.body), 10),
        ],
      }),
    ),
    ...inWork(fixture.plotScenes).map((scene) =>
      base("plot", scene, "plot", scene.title, {
        status: scene.status,
        fields: [
          field("tags", "태그", joinList(scene.tags), 40),
          field("summary", "요약", scene.summary, 30),
          field("event", "사건", scene.event),
          field("time", "시간·장소", `${scene.storyTime} ${scene.locationDetail}`),
          field("clues", "복선", scene.clues.map(({ clue }) => clue).join(" ")),
          field("body", "본문", extractRichText(scene.body), 10),
        ],
      }),
    ),
    ...inWork(fixture.settings).map((setting) =>
      base("setting", setting, "setting", setting.title, {
        status: setting.status,
        fields: [
          field("tags", "태그", joinList(setting.tags), 40),
          field("summary", "요약", setting.summary, 30),
          field("grade", "등급", setting.grade),
          field("effect", "효과", setting.effect),
          field("condition", "조건·제한", `${setting.condition} ${setting.limitation}`),
          field("attributes", "속성", setting.attributes.map(({ label, value }) => `${label} ${value}`).join(" ")),
          field("body", "본문", extractRichText(setting.body), 10),
        ],
      }),
    ),
    ...inWork(fixture.ideas).map((idea) =>
      base("idea", idea, "idea", idea.title, {
        status: idea.status,
        fields: [
          field("tags", "태그", joinList(idea.tags), 40),
          field("summary", "요약", idea.summary, 30),
          field("source", "출처", idea.source),
          field("body", "본문", extractRichText(idea.body), 10),
        ],
      }),
    ),
    ...inWork(fixture.memos).map((memo) =>
      base("memo", memo, "memo", memo.title, {
        summary: memo.text,
        fields: [
          field("tags", "태그", joinList(memo.tags), 40),
          field("text", "내용", memo.text, 30),
          field("checklist", "체크리스트", memo.checklist.map(({ text }) => text).join(" ")),
        ],
      }),
    ),
    ...inWork(fixture.contents).map((content) =>
      base("content", content, content.type, content.title, {
        status: content.status,
        fields: [
          field("tags", "태그", joinList(content.tags), 40),
          field("summary", "요약", content.summary, 30),
          field("body", "본문", extractRichText(content.body), 10),
        ],
      }),
    ),
  ];
};

/**
 * Explicit relations plus edges implied by Plot fields (POV, cast, location,
 * clue payoff), so a character reaches the scenes it appears in.
 */
const graphEdges = (fixture, workId) => [
  ...fixture.relations
    .filter((relation) => relation.workId === workId && !relation.archivedAt)
    .map((relation) => ({
      bidirectional: relation.bidirectional,
      derived: false,
      id: relation.id,
      label: relation.label,
      relationType: relation.relationType,
      source: relation.source,
      target: relation.target,
    })),
  ...fixture.plotScenes
    .filter((scene) => scene.workId === workId)
    .flatMap((scene) => {
      const source = { type: "plot", id: scene.id };
      const derived = (suffix, target, label, relationType) => ({
        bidirectional: false,
        derived: true,
        id: `derived:${scene.id}:${suffix}`,
        label,
        relationType,
        source,
        target,
      });
      return [
        ...(scene.povCharacterId
          ? [derived("pov", { type: "character", id: scene.povCharacterId }, "POV", "pov")]
          : []),
        ...scene.characterIds
          .filter((id) => id !== scene.povCharacterId)
          .map((id) => derived(`cast:${id}`, { type: "character", id }, "등장 인물", "appears")),
        ...(scene.locationWorldId
          ? [derived("location", { type: "world", id: scene.locationWorldId }, "장소", "location")]
          : []),
        ...scene.clues
          .filter(({ payoffSceneId }) => payoffSceneId)
          .map((clue) =>
            derived(`clue:${clue.id}`, { type: "plot", id: clue.payoffSceneId }, `복선 회수: ${clue.clue}`, "payoff"),
          ),
      ];
    }),
];

const menuMatches = (entity, menuItem) =>
  menuItem.filterConfig?.scope === "all"
    ? entity.sectionId === menuItem.sectionId
    : entity.menuItemId === menuItem.id;

// Search fields are internal to ranking; callers get display data only.
const publicEntity = (entity) => {
  const copy = clone(entity);
  delete copy.fields;
  return copy;
};

export const createFixtureExplorationRepository = (fixtureOrState) => {
  const state = asFixtureContentRelationState(fixtureOrState);

  const read = (workId) => {
    const fixture = state.read();
    if (!fixture.works.some(({ id }) => id === workId)) {
      throw new Error(`Work not found: ${workId}`);
    }
    return fixture;
  };

  const repository = {
    /**
     * Unified search. Filters combine with AND. `statuses` lists the distinct
     * statuses available under the other filters, for the status select.
     */
    async search(
      workId,
      {
        q = "",
        kind = "",
        menuItemId = "",
        status = "",
        includeArchived = false,
        archivedOnly = false,
        limit = 100,
      } = {},
    ) {
      const fixture = read(workId);
      const menuItem = menuItemId ? fixture.menuItems.find(({ id }) => id === menuItemId) : null;
      const query = String(q).trim();
      const matches = indexEntities(fixture, workId)
        .filter((entity) =>
          (archivedOnly ? Boolean(entity.archivedAt) : includeArchived || !entity.archivedAt) &&
          (!kind || entity.kind === kind) &&
          (!menuItem || menuMatches(entity, menuItem)),
        )
        .map((entity) => {
          if (!query) return { entity, matchedField: null, score: 0 };
          const scored = scoreEntity(entity, query);
          return scored ? { entity, ...scored } : null;
        })
        .filter(Boolean);
      const statuses = [...new Set(matches.map(({ entity }) => entity.status).filter(Boolean))].sort();
      const filtered = matches
        .filter(({ entity }) => !status || entity.status === status)
        .sort(
          (first, second) =>
            second.score - first.score ||
            String(second.entity.updatedAt).localeCompare(String(first.entity.updatedAt)),
        );

      return {
        results: filtered.slice(0, limit).map(({ entity, matchedField }) => ({
          ...publicEntity(entity),
          snippet: matchedField
            ? { label: matchedField.label, text: excerptAround(matchedField.text, query) }
            : null,
        })),
        statuses,
        total: filtered.length,
      };
    },

    async listRecentlyUpdated(workId, { limit = 20 } = {}) {
      const fixture = read(workId);
      return indexEntities(fixture, workId)
        .filter((entity) => !entity.archivedAt)
        .sort((first, second) => String(second.updatedAt).localeCompare(String(first.updatedAt)))
        .slice(0, limit)
        .map(publicEntity);
    },

    /** Resolves `{ kind, id }` references in order; unknown ones are dropped. */
    async resolve(workId, references) {
      const fixture = read(workId);
      const entities = new Map(
        indexEntities(fixture, workId).map((entity) => [`${entity.kind}:${entity.endpoint.id}`, entity]),
      );
      return references
        .map(({ kind, id }) => entities.get(`${kind}:${id}`))
        .filter(Boolean)
        .map(publicEntity);
    },

    async getNeighborhood(workId, focus, options) {
      const fixture = read(workId);
      const nodes = indexEntities(fixture, workId).filter(({ kind }) => kind !== "memo");
      const graph = createGraph(nodes, graphEdges(fixture, workId));
      const result = getNeighborhood(graph, focus, options);
      if (!result) return null;
      return clone({
        ...result,
        focus: publicEntity(result.focus),
        levels: result.levels.map((level) => ({
          ...level,
          items: level.items.map(({ node, via }) => ({
            node: publicEntity(node),
            via: via.map(({ edge, from }) => ({ edge, from: publicEntity(from) })),
          })),
        })),
      });
    },
  };

  return assertExplorationRepository(repository);
};
