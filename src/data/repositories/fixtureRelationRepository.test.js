import { beforeEach, describe, expect, it } from "vitest";
import { appFixture } from "../fixtures/appFixture";
import { createFixtureRelationRepository } from "./fixtureRelationRepository";

const MONP_WORK_ID = "work-monp";
const MOON_WORK_ID = "work-moonlit-echoes";
const fixedTimes = [
  "2026-09-27T00:00:00.000Z",
  "2026-09-27T00:01:00.000Z",
  "2026-09-27T00:02:00.000Z",
  "2026-09-27T00:03:00.000Z",
];

const createRelationFixture = () => {
  const fixture = structuredClone(appFixture);
  fixture.worlds.push({
    ...structuredClone(fixture.worlds[0]),
    id: "world-archived-place",
    title: "보관된 장소",
    category: "place",
    order: 1,
    archivedAt: "2026-02-01T00:00:00.000Z",
  });
  return fixture;
};

const createRepository = () => {
  let idIndex = 0;
  let timeIndex = 0;

  return createFixtureRelationRepository(createRelationFixture(), {
    createId: () => `relation-created-${idIndex++}`,
    now: () => fixedTimes[timeIndex++] ?? fixedTimes.at(-1),
  });
};

const plotOpening = { type: "plot", id: "plot-chapter-one-opening" };
const ideaDialogue = { type: "idea", id: "idea-dialogue-mist" };
const cheongunSword = { type: "setting", id: "setting-cheongun-sword" };
const yeonhwa = { type: "character", id: "character-yeonhwa" };
const muyeong = { type: "character", id: "character-muyeong" };
const seolha = { type: "character", id: "character-seolha" };
const rin = { type: "character", id: "character-rin" };
const eastPlains = { type: "world", id: "world-east-plains" };
const archivedPlace = { type: "world", id: "world-archived-place" };

let repository;

beforeEach(() => {
  repository = createRepository();
});

describe("fixture relation repository scoped reads", () => {
  it("lists active incoming edges as reverse lookups for a typed World", async () => {
    const relations = await repository.list(MONP_WORK_ID, eastPlains);

    expect(relations).toEqual([
      expect.objectContaining({
        id: "relation-yeonhwa-east-plains",
        source: yeonhwa,
        target: eastPlains,
      }),
    ]);

    relations[0].source.id = "external-change";
    await expect(repository.list(MONP_WORK_ID, eastPlains)).resolves.toEqual([
      expect.objectContaining({ source: yeonhwa }),
    ]);
  });

  it("returns every same-work active generic, World, Character, and Plot candidate", async () => {
    const candidates = await repository.listCandidates(MONP_WORK_ID);

    expect(candidates.map(({ endpoint }) => endpoint)).toEqual([
      ideaDialogue,
      eastPlains,
      yeonhwa,
      muyeong,
      seolha,
      cheongunSword,
      plotOpening,
    ]);
    expect(candidates.find(({ endpoint }) => endpoint.id === plotOpening.id)).toMatchObject({
      endpoint: plotOpening,
      entityType: "plot",
      label: "첫 장의 시작",
      menuItemId: "plot01",
    });
    expect(candidates.map(({ endpoint: { id } }) => id)).not.toContain(
      archivedPlace.id,
    );
    expect(candidates.map(({ endpoint: { id } }) => id)).not.toContain(rin.id);
    expect(candidates.find(({ endpoint }) => endpoint.id === eastPlains.id)).toMatchObject({
      endpoint: eastPlains,
      entityType: "world",
      label: "동부평야지대",
    });
  });

  it("keeps archived entities out by default and includes them only when requested", async () => {
    await expect(
      repository.listCandidates(MONP_WORK_ID),
    ).resolves.not.toEqual(
      expect.arrayContaining([expect.objectContaining({ endpoint: archivedPlace })]),
    );
    await expect(
      repository.listCandidates(MONP_WORK_ID, undefined, {
        includeArchived: true,
      }),
    ).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          endpoint: archivedPlace,
          entityType: "world",
          label: "보관된 장소",
          archivedAt: "2026-02-01T00:00:00.000Z",
        }),
      ]),
    );
    await expect(
      repository.listCandidates(MONP_WORK_ID, archivedPlace),
    ).rejects.toThrow("Relation endpoint is archived: world:world-archived-place");
    const archivedSourceCandidates = await repository.listCandidates(
      MONP_WORK_ID,
      archivedPlace,
      { includeArchived: true },
    );
    expect(archivedSourceCandidates.map(({ endpoint }) => endpoint)).not.toContainEqual(
      archivedPlace,
    );
  });

  it("returns only same-work active candidates and excludes a supplied source", async () => {
    const candidates = await repository.listCandidates(MONP_WORK_ID, yeonhwa);

    expect(candidates.map(({ endpoint }) => endpoint)).toEqual([
      ideaDialogue,
      eastPlains,
      muyeong,
      seolha,
      cheongunSword,
      plotOpening,
    ]);
    expect(candidates.map(({ endpoint: { id } }) => id)).not.toContain(
      archivedPlace.id,
    );
    expect(candidates.map(({ endpoint: { id } }) => id)).not.toContain(rin.id);

    candidates[0].endpoint.id = "external-change";
    await expect(
      repository.listCandidates(MONP_WORK_ID, yeonhwa),
    ).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ endpoint: eastPlains }),
      ]),
    );
  });

  it("rejects cross-work and mistyped source lookups", async () => {
    await expect(repository.list(MOON_WORK_ID, yeonhwa)).rejects.toThrow(
      "Relation endpoint is outside work work-moonlit-echoes: character:character-yeonhwa",
    );
    await expect(
      repository.list(MONP_WORK_ID, {
        type: "world",
        id: "character-yeonhwa",
      }),
    ).rejects.toThrow(
      "Unknown relation endpoint: world:character-yeonhwa",
    );
  });
});

describe("fixture relation repository integrity and mutations", () => {
  it("creates a cloned relation in route work and preserves extensible types", async () => {
    const input = {
      workId: MOON_WORK_ID,
      source: muyeong,
      target: { ...eastPlains },
      relationType: "custom-rivalry",
      label: "  오래된 경쟁자  ",
      bidirectional: false,
      notes: "대련 기록",
    };
    const created = await repository.create(MONP_WORK_ID, input);

    expect(created).toMatchObject({
      id: "relation-created-0",
      workId: MONP_WORK_ID,
      source: muyeong,
      target: eastPlains,
      relationType: "custom-rivalry",
      label: "오래된 경쟁자",
      createdAt: fixedTimes[0],
      updatedAt: fixedTimes[0],
    });

    input.target.id = "external-change";
    created.target.id = "result-change";
    await expect(repository.list(MONP_WORK_ID, muyeong)).resolves.toEqual([
      expect.objectContaining({ target: eastPlains }),
    ]);
  });

  it("rejects self, exact/reverse duplicate, cross-work, and unknown endpoints", async () => {
    await expect(
      repository.create(MONP_WORK_ID, {
        source: yeonhwa,
        target: yeonhwa,
        relationType: "self",
        label: "자기 자신",
      }),
    ).rejects.toThrow("Relation cannot target itself");

    await expect(
      repository.create(MONP_WORK_ID, {
        source: yeonhwa,
        target: eastPlains,
        relationType: "origin",
        label: "중복",
      }),
    ).rejects.toThrow("Duplicate relation: origin");

    await expect(
      repository.create(MONP_WORK_ID, {
        source: eastPlains,
        target: yeonhwa,
        relationType: "origin",
        label: "역방향 중복",
        bidirectional: false,
      }),
    ).rejects.toThrow("Duplicate relation: origin");

    await expect(
      repository.create(MONP_WORK_ID, {
        source: yeonhwa,
        target: rin,
        relationType: "knows",
        label: "다른 작품",
      }),
    ).rejects.toThrow("Relation endpoint is outside work work-monp");

    await expect(
      repository.create(MONP_WORK_ID, {
        source: yeonhwa,
        target: { type: "character", id: "world-east-plains" },
        relationType: "knows",
        label: "잘못된 타입",
      }),
    ).rejects.toThrow(
      "Unknown relation endpoint: character:world-east-plains",
    );
  });

  it("replaces outgoing drafts while retaining incoming edges", async () => {
    const outgoing = await repository.create(MONP_WORK_ID, {
      source: eastPlains,
      target: muyeong,
      relationType: "contains",
      label: "머무는 인물",
    });
    const replacements = await repository.replaceOutgoing(
      MONP_WORK_ID,
      eastPlains,
      [
        {
          source: rin,
          target: seolha,
          relationType: "contains",
          label: "새로 머무는 인물",
          bidirectional: false,
          notes: "",
        },
      ],
    );
    const connected = await repository.list(MONP_WORK_ID, eastPlains);

    expect(replacements).toEqual([
      expect.objectContaining({
        id: "relation-created-1",
        workId: MONP_WORK_ID,
        source: eastPlains,
        target: seolha,
      }),
    ]);
    expect(connected.map(({ id }) => id)).toContain(
      "relation-yeonhwa-east-plains",
    );
    expect(connected.map(({ id }) => id)).toContain("relation-created-1");
    expect(connected.map(({ id }) => id)).not.toContain(outgoing.id);
  });

  it("preserves an existing relation to a later-archived target but rejects new archived targets", async () => {
    const fixture = createRelationFixture();
    fixture.relations.push({
      id: "relation-east-archived-place",
      workId: MONP_WORK_ID,
      source: eastPlains,
      target: archivedPlace,
      relationType: "related",
      label: "폐허 통로",
      bidirectional: false,
      notes: "",
      archivedAt: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    const scoped = createFixtureRelationRepository(fixture, {
      createId: () => "relation-created-archived",
      now: () => fixedTimes[0],
    });
    const kept = {
      id: "relation-east-archived-place",
      target: archivedPlace,
      relationType: "related",
      label: "폐허 통로 수정",
      bidirectional: false,
      notes: "메모",
    };

    await expect(
      scoped.replaceOutgoing(MONP_WORK_ID, eastPlains, [kept]),
    ).resolves.toEqual([
      expect.objectContaining({
        id: "relation-east-archived-place",
        label: "폐허 통로 수정",
        target: archivedPlace,
      }),
    ]);
    await expect(
      scoped.replaceOutgoing(MONP_WORK_ID, eastPlains, [
        kept,
        { ...kept, id: undefined, relationType: "contains", label: "새 연결" },
      ]),
    ).rejects.toThrow("Relation endpoint is archived: world:world-archived-place");
    await expect(
      scoped.create(MONP_WORK_ID, {
        source: yeonhwa,
        target: archivedPlace,
        relationType: "knows",
        label: "새 보관 대상",
      }),
    ).rejects.toThrow("Relation endpoint is archived: world:world-archived-place");
  });

  it("archives and restores instead of deleting a relation", async () => {
    const relationId = "relation-yeonhwa-east-plains";
    const archived = await repository.archive(MONP_WORK_ID, relationId);

    expect(archived.archivedAt).toBe(fixedTimes[0]);
    await expect(
      repository.list(MONP_WORK_ID, yeonhwa).then((relations) => relations.map(({ id }) => id)),
    ).resolves.not.toContain(relationId);

    const restored = await repository.restore(MONP_WORK_ID, relationId);
    expect(restored).toMatchObject({
      id: relationId,
      archivedAt: null,
      updatedAt: fixedTimes[1],
    });
    await expect(
      repository.list(MONP_WORK_ID, yeonhwa).then((relations) => relations.map(({ id }) => id)),
    ).resolves.toContain(relationId);
  });
});
