import { beforeEach, describe, expect, it } from "vitest";
import { createGenericContentFixture } from "../../test/genericContentFixture";
import { createFixtureContentRelationState } from "./fixtureContentRelationState";
import { createFixtureContentRepository } from "./fixtureContentRepository";
import { createFixtureRelationRepository } from "./fixtureRelationRepository";

const MONP_WORK_ID = "work-monp";
const MOON_WORK_ID = "work-moonlit-echoes";
const fixedTimes = [
  "2026-09-26T00:00:00.000Z",
  "2026-09-26T00:01:00.000Z",
  "2026-09-26T00:02:00.000Z",
];

const createContentFixture = () => {
  const fixture = createGenericContentFixture();
  const seed = fixture.contents[0];
  fixture.contents.push(
    {
      ...structuredClone(seed),
      id: "plot-overview-note",
      menuItemId: "notes00",
      title: "플롯 개요",
      summary: "모든 플롯 장에서 조회되는 기록",
      tags: ["개요", "공통"],
      order: 1,
    },
    {
      ...structuredClone(seed),
      id: "plot-archived-note",
      title: "보관된 도입 기록",
      tags: ["보관"],
      order: 2,
      archivedAt: "2026-02-01T00:00:00.000Z",
    },
    {
      ...structuredClone(seed),
      id: "plot-moon-opening",
      workId: MOON_WORK_ID,
      title: "잃어버린 도시의 시작",
      tags: ["달빛"],
      order: 0,
    },
  );
  fixture.relations.push({
    id: "relation-yeonhwa-plot-opening",
    workId: MONP_WORK_ID,
    source: { type: "character", id: "character-yeonhwa" },
    target: { type: "generic", id: "generic-mist-note" },
    relationType: "appears-in",
    label: "등장 장면",
    bidirectional: false,
    notes: "범용 콘텐츠 관계 보존 검증",
    archivedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  });
  return fixture;
};

const createRepository = (fixtureOrState = createContentFixture()) => {
  let timeIndex = 0;

  return createFixtureContentRepository(fixtureOrState, {
    createId: () => "content-created",
    now: () => fixedTimes[timeIndex++] ?? fixedTimes.at(-1),
  });
};

let repository;

beforeEach(() => {
  repository = createRepository();
});

describe("fixture content repository scoped reads", () => {
  it("preserves stable generic all and category behavior with the generic section seed", async () => {
    const allPlotEntries = await repository.list({
      workId: MONP_WORK_ID,
      menuItemId: "notes00",
    });
    const categoryEntries = await repository.list({
      workId: MONP_WORK_ID,
      menuItemId: "notes01",
    });

    expect(allPlotEntries.map(({ id }) => id)).toEqual([
      "generic-mist-note",
      "plot-overview-note",
    ]);
    expect(categoryEntries.map(({ id }) => id)).toEqual([
      "generic-mist-note",
    ]);
    expect(allPlotEntries.every(({ workId }) => workId === MONP_WORK_ID)).toBe(
      true,
    );
  });

  it.each([
    ["첫 대사", "generic-mist-note"],
    ["공통", "plot-overview-note"],
    ["  모든 플롯  ", "plot-overview-note"],
  ])("searches title, tags, and summary for '%s'", async (q, expectedId) => {
    const result = await repository.list({
      workId: MONP_WORK_ID,
      menuItemId: "notes00",
      q,
    });

    expect(result.map(({ id }) => id)).toEqual([expectedId]);
  });

  it("returns deep clones and rejects cross-work detail access", async () => {
    const first = await repository.get(
      MONP_WORK_ID,
      "generic-mist-note",
    );
    first.body.content[0].content[0].text = "외부 변경";
    first.tags.push("외부 태그");

    await expect(
      repository.get(MONP_WORK_ID, "generic-mist-note"),
    ).resolves.toMatchObject({
      body: {
        content: [
          { content: [{ text: "평온하던 교역로에 검은 안개가 번진다." }] },
        ],
      },
      tags: ["1장", "도입"],
    });
    await expect(
      repository.get(MOON_WORK_ID, "generic-mist-note"),
    ).rejects.toThrow(
      "Content not found in work work-moonlit-echoes: generic-mist-note",
    );
  });
});

describe("fixture content repository scoped mutations", () => {
  it("trusts work/menu context, trims title, and preserves long Tiptap JSON", async () => {
    const longText = "긴 본문 문장입니다. ".repeat(12000);
    const body = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          attrs: { align: "left" },
          content: [{ type: "text", text: longText }],
        },
      ],
      canonicalVersion: 1,
    };
    const created = await repository.create(MONP_WORK_ID, "notes01", {
      workId: MOON_WORK_ID,
      menuItemId: "world01",
      type: "world",
      title: "  장문 플롯 기록  ",
      body,
      tags: ["장문"],
      status: "in-review",
    });

    expect(created).toMatchObject({
      id: "content-created",
      workId: MONP_WORK_ID,
      menuItemId: "notes01",
      type: "generic",
      title: "장문 플롯 기록",
      status: "in-review",
      version: 1,
      createdAt: fixedTimes[0],
      updatedAt: fixedTimes[0],
    });
    expect(created.body.content[0].content[0].text).toBe(longText);
    expect(created.body).toEqual(body);

    body.content[0].content[0].text = "입력 변경";
    created.body.content[0].content[0].text = "결과 변경";
    await expect(
      repository.get(MONP_WORK_ID, "content-created"),
    ).resolves.toMatchObject({
      body: { content: [{ content: [{ text: longText }] }] },
    });
  });

  it("rejects blank titles on create and update", async () => {
    await expect(
      repository.create(MONP_WORK_ID, "notes01", { title: "   " }),
    ).rejects.toThrow();
    await expect(
      repository.update(MONP_WORK_ID, "generic-mist-note", {
        title: "\n\t",
      }),
    ).rejects.toThrow();
  });

  it("preserves identity, menu/type context, and canonical body on update", async () => {
    const body = {
      type: "doc",
      content: [{ type: "heading", attrs: { level: 2 } }],
    };
    const before = await repository.get(
      MONP_WORK_ID,
      "generic-mist-note",
    );
    const updated = await repository.update(
      MONP_WORK_ID,
      "generic-mist-note",
      {
        id: "spoofed-id",
        workId: MOON_WORK_ID,
        menuItemId: "world01",
        type: "world",
        title: "  수정된 도입부  ",
        body,
        version: 99,
        archivedAt: fixedTimes[2],
      },
    );

    expect(updated).toMatchObject({
      id: before.id,
      workId: MONP_WORK_ID,
      menuItemId: before.menuItemId,
      type: before.type,
      title: "수정된 도입부",
      body,
      version: before.version + 1,
      archivedAt: null,
      createdAt: before.createdAt,
      updatedAt: fixedTimes[0],
    });
  });

  it("archives and restores generic content without deleting its relations", async () => {
    const state = createFixtureContentRelationState(createContentFixture());
    const contentRepository = createRepository(state);
    const relationRepository = createFixtureRelationRepository(state);
    const source = { type: "character", id: "character-yeonhwa" };
    const relationsBefore = await relationRepository.list(MONP_WORK_ID, source);

    const archived = await contentRepository.archive(
      MONP_WORK_ID,
      "generic-mist-note",
    );
    expect(archived).toMatchObject({
      archivedAt: fixedTimes[0],
      version: 2,
    });
    await expect(
      contentRepository.list({
        workId: MONP_WORK_ID,
        menuItemId: "notes00",
      }),
    ).resolves.not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "generic-mist-note" }),
      ]),
    );
    await expect(
      relationRepository.list(MONP_WORK_ID, source),
    ).resolves.toEqual(relationsBefore);

    const restored = await contentRepository.restore(
      MONP_WORK_ID,
      "generic-mist-note",
    );
    expect(restored).toMatchObject({ archivedAt: null, version: 3 });
    await expect(
      relationRepository.list(MONP_WORK_ID, source),
    ).resolves.toEqual(relationsBefore);
  });
});
