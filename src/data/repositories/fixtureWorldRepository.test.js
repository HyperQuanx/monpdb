import { beforeEach, describe, expect, it } from "vitest";
import { appFixture } from "../fixtures/appFixture";
import { createFixtureContentRelationState } from "./fixtureContentRelationState";
import { createFixtureRelationRepository } from "./fixtureRelationRepository";
import { createFixtureWorldRepository } from "./fixtureWorldRepository";

const MONP_WORK_ID = "work-monp";
const MOON_WORK_ID = "work-moonlit-echoes";
const fixedTimes = [
  "2026-09-28T00:00:00.000Z",
  "2026-09-28T00:01:00.000Z",
  "2026-09-28T00:02:00.000Z",
  "2026-09-28T00:03:00.000Z",
];

const createWorldFixture = () => {
  const fixture = structuredClone(appFixture);
  const seed = fixture.worlds[0];
  fixture.worlds.push(
    {
      ...structuredClone(seed),
      id: "world-moon-festival",
      category: "culture",
      title: "달맞이 문화권",
      summary: "달빛 제례를 계승한 동부 공동체",
      era: "고대 왕조기 말기",
      rules: "제례 동안 횃불 사용을 금한다.",
      history: "은월회가 옛 제단을 복원하며 시작되었다.",
      culture: "보름마다 달맞이 제례와 가면극을 연다.",
      factions: ["제관단", "은월회"],
      places: ["월광정", "옛 제단"],
      tags: ["달맞이축제", "달빛"],
      order: 1,
    },
    {
      ...structuredClone(seed),
      id: "world-archived-fort",
      category: "place",
      title: "폐쇄된 동부 성채",
      summary: "현재는 접근이 금지된 성채",
      era: "구왕조 시대",
      rules: "출입 금지",
      history: "전쟁 뒤 폐쇄되었다.",
      culture: "",
      factions: ["옛 수비대"],
      places: ["동문"],
      tags: ["성채"],
      order: 2,
      archivedAt: "2026-02-01T00:00:00.000Z",
    },
    {
      ...structuredClone(seed),
      id: "world-moon-city",
      workId: MOON_WORK_ID,
      category: "place",
      title: "잃어버린 도시",
      summary: "달빛 아래에서만 드러나는 도시",
      era: "기억 소실기",
      rules: "해가 뜨면 흔적이 사라진다.",
      history: "도시의 기록이 한밤에 사라졌다.",
      culture: "기억을 유리병에 보관한다.",
      factions: ["월광 기록단"],
      places: ["기억 도서관"],
      tags: ["달빛", "도시"],
      order: 0,
    },
  );
  return fixture;
};

const createRepository = (fixtureOrState = appFixture, createId = () => "world-created") => {
  let timeIndex = 0;

  return createFixtureWorldRepository(fixtureOrState, {
    createId,
    now: () => fixedTimes[timeIndex++] ?? fixedTimes.at(-1),
  });
};

let repository;

beforeEach(() => {
  repository = createRepository(createWorldFixture());
});

describe("fixture World repository work-scoped reads", () => {
  it("treats world00 and an omitted region as all regions inside one work", async () => {
    const allRegionWorlds = await repository.list({
      workId: MONP_WORK_ID,
      regionId: "world00",
    });
    const omittedRegionWorlds = await repository.list({ workId: MONP_WORK_ID });
    const categoryWorlds = await repository.list({
      workId: MONP_WORK_ID,
      regionId: "world01",
    });
    const moonWorlds = await repository.list({
      workId: MOON_WORK_ID,
      regionId: "world00",
    });

    expect(allRegionWorlds.map(({ id }) => id)).toEqual([
      "world-east-plains",
      "world-moon-festival",
    ]);
    expect(omittedRegionWorlds).toEqual(allRegionWorlds);
    expect(categoryWorlds).toEqual(allRegionWorlds);
    expect(moonWorlds).toEqual([
      expect.objectContaining({ id: "world-moon-city", workId: MOON_WORK_ID }),
    ]);
    expect(allRegionWorlds.every(({ workId }) => workId === MONP_WORK_ID)).toBe(
      true,
    );
  });

  it.each([
    ["달맞이 문화권"],
    ["달빛 제례를"],
    ["왕조기"],
    ["횃불 사용"],
    ["제단을 복원"],
    ["가면극"],
    ["제관단"],
    ["월광정"],
    ["달맞이축제"],
  ])("searches every World text and array field for '%s'", async (q) => {
    const result = await repository.list({
      workId: MONP_WORK_ID,
      regionId: "world00",
      q,
    });

    expect(result.map(({ id }) => id)).toEqual(["world-moon-festival"]);
  });

  it("combines region, Korean search, category, era, and archive filters with AND", async () => {
    await expect(
      repository.list({
        workId: MONP_WORK_ID,
        regionId: "world01",
        q: "  달맞이 제례  ",
        category: "culture",
        era: " 왕조기 ",
        archiveStatus: "active",
      }),
    ).resolves.toEqual([
      expect.objectContaining({ id: "world-moon-festival" }),
    ]);
    await expect(
      repository.list({
        workId: MONP_WORK_ID,
        regionId: "world01",
        q: "달맞이",
        category: "region",
        era: "왕조기",
      }),
    ).resolves.toEqual([]);
    await expect(
      repository.list({
        workId: MONP_WORK_ID,
        category: "CULTURE",
      }),
    ).resolves.toEqual([]);
  });

  it("supports active, archived, and all lifecycle views", async () => {
    await expect(
      repository.list({
        workId: MONP_WORK_ID,
        regionId: "world00",
        archiveStatus: "archived",
      }),
    ).resolves.toEqual([
      expect.objectContaining({ id: "world-archived-fort" }),
    ]);
    await expect(
      repository.list({
        workId: MONP_WORK_ID,
        regionId: "world00",
        archiveStatus: "all",
      }),
    ).resolves.toHaveLength(3);
    await expect(
      repository.list({ workId: MONP_WORK_ID, archiveStatus: "deleted" }),
    ).rejects.toThrow("Invalid world archive status: deleted");
  });

  it("returns deep clones and rejects cross-work access", async () => {
    const world = await repository.get(MONP_WORK_ID, "world-east-plains");
    world.body.content[0].content[0].text = "외부 변경";
    world.factions.push("외부 세력");
    world.places[0] = "외부 장소";
    world.tags.push("외부 태그");

    await expect(
      repository.get(MONP_WORK_ID, "world-east-plains"),
    ).resolves.toMatchObject({
      body: {
        content: [{ content: [{ text: "넓은 곡창과 교역로가 이어진다." }] }],
      },
      factions: ["청운문", "동부 상인 연합"],
      places: ["청운문", "동부 교역로", "풍요 평야"],
      tags: ["지역", "동부"],
    });
    await expect(
      repository.get(MOON_WORK_ID, "world-east-plains"),
    ).rejects.toThrow(
      "World not found in work work-moonlit-echoes: world-east-plains",
    );
    await expect(
      repository.list({ workId: "work-missing" }),
    ).rejects.toThrow("Work not found: work-missing");
  });
});

describe("fixture World repository work-scoped mutations", () => {
  it("round-trips all fields, rejects spoofed context, and preserves long canonical JSON", async () => {
    const longText = "세계관 장문 문장입니다. ".repeat(12000);
    const body = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          attrs: { align: "center", dataLore: "faction" },
          content: [{ type: "text", marks: [{ type: "bold" }], text: longText }],
        },
      ],
      canonicalVersion: 7,
    };
    const factions = ["백운회", "남천 상단"];
    const places = ["백운각", "남천 시장"];
    const tags = ["세력", "교역"];
    const localRepository = createRepository();
    const created = await localRepository.create(MONP_WORK_ID, {
      id: "spoofed-world",
      workId: MOON_WORK_ID,
      menuItemId: "plot01",
      resourceType: "character",
      category: "faction",
      regionId: "world01",
      regionName: "위조 지역명",
      title: "  백운 연맹  ",
      summary: "동부의 상단 연맹",
      era: "천무력 420년",
      rules: "회원은 교역로를 공동 방위한다.",
      history: "세 상단의 협약으로 출범했다.",
      culture: "분기마다 교역제를 연다.",
      factions,
      places,
      body,
      tags,
      status: "in-review",
      order: 99,
      version: 99,
      archivedAt: fixedTimes[3],
      createdAt: fixedTimes[3],
      updatedAt: fixedTimes[3],
    });

    expect(created).toEqual({
      id: "world-created",
      workId: MONP_WORK_ID,
      menuItemId: "world01",
      resourceType: "world",
      category: "faction",
      regionId: "world01",
      regionName: "동부평야지대",
      title: "백운 연맹",
      summary: "동부의 상단 연맹",
      era: "천무력 420년",
      rules: "회원은 교역로를 공동 방위한다.",
      history: "세 상단의 협약으로 출범했다.",
      culture: "분기마다 교역제를 연다.",
      factions,
      places,
      body,
      tags,
      status: "in-review",
      order: 1,
      version: 1,
      archivedAt: null,
      createdAt: fixedTimes[0],
      updatedAt: fixedTimes[0],
    });
    expect(created.body.content[0].content[0].text).toBe(longText);

    body.content[0].content[0].text = "입력 변경";
    factions.push("입력 변경");
    places.push("입력 변경");
    tags.push("입력 변경");
    created.body.content[0].content[0].text = "결과 변경";
    created.factions.push("결과 변경");

    await expect(
      localRepository.get(MONP_WORK_ID, "world-created"),
    ).resolves.toMatchObject({
      body: { content: [{ content: [{ text: longText }] }] },
      factions: ["백운회", "남천 상단"],
      places: ["백운각", "남천 시장"],
      tags: ["세력", "교역"],
    });
  });

  it("updates every editable field while preserving identity and lifecycle", async () => {
    const localRepository = createRepository();
    const created = await localRepository.create(MONP_WORK_ID, {
      regionId: "world01",
      title: "생성 세계",
    });
    const body = {
      type: "doc",
      content: [{ type: "heading", attrs: { level: 2 } }],
      canonicalVersion: 2,
    };
    const updated = await localRepository.update(MONP_WORK_ID, created.id, {
      id: "spoofed-update",
      workId: MOON_WORK_ID,
      menuItemId: "plot01",
      resourceType: "plot",
      category: "history",
      regionId: "world01",
      regionName: "위조 변경 지역명",
      title: "  변경 세계  ",
      summary: "변경 요약",
      era: "변경 시대",
      rules: "변경 규칙",
      history: "변경 역사",
      culture: "변경 문화",
      factions: ["변경 세력"],
      places: ["변경 장소"],
      body,
      tags: ["변경 태그"],
      status: "published",
      order: 500,
      version: 500,
      archivedAt: fixedTimes[3],
      createdAt: fixedTimes[3],
      updatedAt: fixedTimes[3],
    });

    expect(updated).toEqual({
      id: "world-created",
      workId: MONP_WORK_ID,
      menuItemId: "world01",
      resourceType: "world",
      category: "history",
      regionId: "world01",
      regionName: "동부평야지대",
      title: "변경 세계",
      summary: "변경 요약",
      era: "변경 시대",
      rules: "변경 규칙",
      history: "변경 역사",
      culture: "변경 문화",
      factions: ["변경 세력"],
      places: ["변경 장소"],
      body,
      tags: ["변경 태그"],
      status: "published",
      order: 1,
      version: 2,
      archivedAt: null,
      createdAt: fixedTimes[0],
      updatedAt: fixedTimes[1],
    });

    body.content[0].attrs.level = 3;
    updated.factions[0] = "외부 변경";
    await expect(localRepository.get(MONP_WORK_ID, created.id)).resolves.toMatchObject({
      body: { content: [{ attrs: { level: 2 } }], canonicalVersion: 2 },
      factions: ["변경 세력"],
    });
  });

  it("requires trimmed titles and concrete active World category menus", async () => {
    const localRepository = createRepository();
    await expect(
      localRepository.create(MONP_WORK_ID, {
        regionId: "world01",
        title: "   ",
      }),
    ).rejects.toThrow();
    await expect(
      localRepository.update(MONP_WORK_ID, "world-east-plains", {
        title: "\n\t",
      }),
    ).rejects.toThrow();

    for (const regionId of [undefined, "world00", "missing", "plot01"]) {
      await expect(
        localRepository.create(MONP_WORK_ID, {
          regionId,
          title: "잘못된 지역",
        }),
      ).rejects.toThrow();
    }

    for (const archiveTarget of ["item", "section"]) {
      const fixture = structuredClone(appFixture);
      fixture.worlds = [];
      fixture.relations = [];
      // Plot scenes may reference Worlds as locations.
      fixture.plotScenes = [];
      if (archiveTarget === "item") {
        fixture.menuItems.find(({ id }) => id === "world01").archivedAt =
          fixedTimes[3];
      } else {
        fixture.menuSections.find(({ id }) => id === "world").archivedAt =
          fixedTimes[3];
      }
      const archivedMenuRepository = createRepository(fixture);

      await expect(
        archivedMenuRepository.create(MONP_WORK_ID, {
          regionId: "world01",
          title: "보관 메뉴 세계",
        }),
      ).rejects.toThrow("World region is archived: world01");
    }
  });

  it("is cross-work safe and rejects duplicate generated ids", async () => {
    const localRepository = createRepository();
    for (const operation of ["update", "archive", "restore"]) {
      const args =
        operation === "update"
          ? [MOON_WORK_ID, "world-east-plains", { title: "누수" }]
          : [MOON_WORK_ID, "world-east-plains"];
      await expect(localRepository[operation](...args)).rejects.toThrow(
        "World not found in work work-moonlit-echoes: world-east-plains",
      );
    }

    const duplicateRepository = createRepository(
      appFixture,
      () => "world-east-plains",
    );
    await expect(
      duplicateRepository.create(MONP_WORK_ID, {
        regionId: "world01",
        title: "중복 세계",
      }),
    ).rejects.toThrow("Duplicate world id: world-east-plains");
  });

  it("archives and restores idempotently while preserving relations and labels", async () => {
    const state = createFixtureContentRelationState(appFixture);
    const worldRepository = createRepository(state);
    const relationRepository = createFixtureRelationRepository(state);
    const endpoint = { type: "world", id: "world-east-plains" };
    const relationsBefore = await relationRepository.list(MONP_WORK_ID, endpoint);
    const before = await worldRepository.get(MONP_WORK_ID, endpoint.id);

    const archived = await worldRepository.archive(MONP_WORK_ID, endpoint.id);
    const archivedAgain = await worldRepository.archive(MONP_WORK_ID, endpoint.id);
    expect(archived).toMatchObject({
      archivedAt: fixedTimes[0],
      updatedAt: fixedTimes[0],
      version: before.version + 1,
    });
    expect(archivedAgain).toEqual(archived);
    await expect(relationRepository.list(MONP_WORK_ID, endpoint)).resolves.toEqual(
      relationsBefore,
    );
    await expect(
      relationRepository.listCandidates(MONP_WORK_ID),
    ).resolves.not.toEqual(
      expect.arrayContaining([expect.objectContaining({ endpoint })]),
    );
    await expect(
      relationRepository.listCandidates(MONP_WORK_ID, undefined, {
        includeArchived: true,
      }),
    ).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ endpoint, label: "동부평야지대" }),
      ]),
    );

    const restored = await worldRepository.restore(MONP_WORK_ID, endpoint.id);
    const restoredAgain = await worldRepository.restore(MONP_WORK_ID, endpoint.id);
    expect(restored).toMatchObject({
      archivedAt: null,
      updatedAt: fixedTimes[1],
      version: before.version + 2,
    });
    expect(restoredAgain).toEqual(restored);
    await expect(relationRepository.list(MONP_WORK_ID, endpoint)).resolves.toEqual(
      relationsBefore,
    );
    await expect(
      relationRepository.listCandidates(MONP_WORK_ID),
    ).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ endpoint, label: "동부평야지대" }),
      ]),
    );
  });

  it("synchronizes candidates after World create, rename, archive, and restore", async () => {
    const state = createFixtureContentRelationState(appFixture);
    const worldRepository = createRepository(state);
    const relationRepository = createFixtureRelationRepository(state);
    const endpoint = { type: "world", id: "world-created" };

    await worldRepository.create(MONP_WORK_ID, {
      regionId: "world01",
      title: "공유 세계",
    });
    await expect(
      relationRepository.listCandidates(MONP_WORK_ID),
    ).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ endpoint, label: "공유 세계" }),
      ]),
    );

    await worldRepository.update(MONP_WORK_ID, endpoint.id, {
      title: "변경된 공유 세계",
    });
    await expect(
      relationRepository.listCandidates(MONP_WORK_ID),
    ).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ endpoint, label: "변경된 공유 세계" }),
      ]),
    );

    await worldRepository.archive(MONP_WORK_ID, endpoint.id);
    expect(
      (await relationRepository.listCandidates(MONP_WORK_ID)).map(
        ({ endpoint: candidate }) => candidate,
      ),
    ).not.toContainEqual(endpoint);
    await expect(
      relationRepository.listCandidates(MONP_WORK_ID, undefined, {
        includeArchived: true,
      }),
    ).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ endpoint, label: "변경된 공유 세계" }),
      ]),
    );

    await worldRepository.restore(MONP_WORK_ID, endpoint.id);
    await expect(
      relationRepository.listCandidates(MONP_WORK_ID),
    ).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ endpoint, label: "변경된 공유 세계" }),
      ]),
    );
  });

  it("rejects missing mutation targets", async () => {
    await expect(
      repository.update(MONP_WORK_ID, "world-missing", { title: "없음" }),
    ).rejects.toThrow("World not found in work work-monp: world-missing");
    await expect(
      repository.archive(MONP_WORK_ID, "world-missing"),
    ).rejects.toThrow("World not found in work work-monp: world-missing");
    await expect(
      repository.restore(MONP_WORK_ID, "world-missing"),
    ).rejects.toThrow("World not found in work work-monp: world-missing");
  });
});

describe("fixture World shared-state validation", () => {
  it("deep-clones replaceWorlds and atomically revalidates existing relations", () => {
    const state = createFixtureContentRelationState(appFixture);
    const nextWorlds = state.read().worlds;

    state.replaceWorlds(nextWorlds);
    nextWorlds[0].title = "외부 변경";
    const readResult = state.read();
    readResult.worlds[0].body.content[0].content[0].text = "외부 변경";

    expect(state.read().worlds[0]).toMatchObject({
      title: "동부평야지대",
      body: {
        content: [{ content: [{ text: "넓은 곡창과 교역로가 이어진다." }] }],
      },
    });
    expect(() => state.replaceWorlds([])).toThrow(/unknown relation target/i);
    expect(state.read().worlds).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "world-east-plains" }),
      ]),
    );
  });
});
