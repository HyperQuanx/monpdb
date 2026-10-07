import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { appFixture } from "../fixtures/appFixture";
import { createFixtureContentRelationState } from "./fixtureContentRelationState";
import {
  MAX_CHARACTER_IMAGE_SIZE_BYTES,
  createFixtureCharacterRepository,
} from "./fixtureCharacterRepository";
import { createFixtureRelationRepository } from "./fixtureRelationRepository";

const MONP_WORK_ID = "work-monp";
const MOON_WORK_ID = "work-moonlit-echoes";
const fixedTimes = [
  "2026-09-25T00:00:00.000Z",
  "2026-09-25T00:01:00.000Z",
  "2026-09-25T00:02:00.000Z",
  "2026-09-25T00:03:00.000Z",
];

const createRepository = (fixtureOrState = appFixture) => {
  let timeIndex = 0;

  return createFixtureCharacterRepository(fixtureOrState, {
    createId: () => "character-created",
    now: () => fixedTimes[timeIndex++] ?? fixedTimes.at(-1),
  });
};

let repository;

beforeEach(() => {
  repository = createRepository();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fixture character repository work-scoped reads", () => {
  it("treats characters00 and an omitted region as all regions inside one work", async () => {
    const allRegionCharacters = await repository.list({
      workId: MONP_WORK_ID,
      regionId: "characters00",
    });
    const omittedRegionCharacters = await repository.list({
      workId: MONP_WORK_ID,
    });
    const moonCharacters = await repository.list({
      workId: MOON_WORK_ID,
      regionId: "characters00",
    });

    expect(allRegionCharacters).toHaveLength(3);
    expect(omittedRegionCharacters).toEqual(allRegionCharacters);
    expect(moonCharacters).toEqual([
      expect.objectContaining({ id: "character-rin", workId: MOON_WORK_ID }),
    ]);
    expect(
      allRegionCharacters.every(({ workId }) => workId === MONP_WORK_ID),
    ).toBe(true);
  });

  it.each([
    ["연화", "character-yeonhwa"],
    ["마물", "character-muyeong"],
    ["청운문", "character-yeonhwa"],
    ["검사", "character-yeonhwa"],
  ])("searches '%s' inside one work", async (query, expectedId) => {
    const result = await repository.list({
      workId: MONP_WORK_ID,
      regionId: "characters00",
      q: query,
    });

    expect(result.map(({ id }) => id)).toContain(expectedId);
  });

  it("combines region, search, species, affiliation, and archive filters with AND", async () => {
    await repository.archive(MONP_WORK_ID, "character-muyeong");

    await expect(
      repository.list({
        workId: MONP_WORK_ID,
        regionId: "characters01",
        q: "  검사  ",
        species: "인간",
        affiliation: " 청운문 ",
        archiveStatus: "active",
      }),
    ).resolves.toEqual([
      expect.objectContaining({ id: "character-yeonhwa" }),
    ]);
    await expect(
      repository.list({
        workId: MONP_WORK_ID,
        regionId: "characters01",
        q: "검사",
        species: "마물",
        affiliation: "청운문",
      }),
    ).resolves.toEqual([]);
    await expect(
      repository.list({
        workId: MONP_WORK_ID,
        regionId: "characters00",
        archiveStatus: "archived",
      }),
    ).resolves.toEqual([
      expect.objectContaining({ id: "character-muyeong" }),
    ]);
    await expect(
      repository.list({
        workId: MONP_WORK_ID,
        regionId: "characters00",
        archiveStatus: "all",
      }),
    ).resolves.toHaveLength(3);
  });

  it("rejects unsupported archive filters", async () => {
    await expect(
      repository.list({
        workId: MONP_WORK_ID,
        archiveStatus: "deleted",
      }),
    ).rejects.toThrow("Invalid character archive status: deleted");
  });

  it("returns clones, including nested theme data, and rejects cross-work access", async () => {
    const character = await repository.get(
      MONP_WORK_ID,
      "character-yeonhwa",
    );
    character.name = "외부 변경";
    character.profileTheme.labelText = "#000000";

    await expect(
      repository.get(MONP_WORK_ID, "character-yeonhwa"),
    ).resolves.toMatchObject({
      name: "연화",
      profileTheme: { labelText: "#3f3f3f" },
    });
    await expect(
      repository.get(MOON_WORK_ID, "character-yeonhwa"),
    ).rejects.toThrow(
      "Character not found in work work-moonlit-echoes: character-yeonhwa",
    );
  });

  it("can get archived records and rejects reads for an unknown work", async () => {
    await repository.archive(MONP_WORK_ID, "character-yeonhwa");

    await expect(
      repository.get(MONP_WORK_ID, "character-yeonhwa"),
    ).resolves.toMatchObject({ archivedAt: fixedTimes[0] });
    await expect(
      repository.list({ workId: "work-missing", regionId: "characters00" }),
    ).rejects.toThrow("Work not found: work-missing");
  });
});

describe("fixture character repository work-scoped mutations", () => {
  it("round-trips every editable field while deriving immutable identity, work, type, and region metadata", async () => {
    const profileTheme = {
      labelBackground: "#123456",
      labelText: "#abcdef",
      autoText: false,
    };
    const created = await repository.create(MONP_WORK_ID, {
      id: "spoofed-id",
      workId: MOON_WORK_ID,
      menuItemId: "plot01",
      resourceType: "world",
      regionId: "characters02",
      regionName: "spoofed region",
      name: "  신규 인물  ",
      hanjaName: "新人",
      englishName: "New Person",
      imageUrl: "/portrait.png",
      species: "인간",
      birthplace: "남동하천지대",
      gender: "여",
      type: "숨겨진 마물 유형",
      birthDate: "3월 2일",
      age: "27",
      height: "170cm",
      weight: "58kg",
      occupation: "연구자",
      alignment: "중립 선",
      affiliation: "하천 연구회",
      faction: "기록단",
      likes: "지도",
      dislikes: "거짓말",
      martialArts: "유수검법",
      personality: "침착하다.",
      appearance: "푸른 도포.",
      themeSong: "흐르는 강",
      summary: "모든 필드를 가진 인물.",
      notes: "비공개 기록",
      profileTheme,
      version: 99,
      archivedAt: fixedTimes[3],
      createdAt: fixedTimes[3],
      updatedAt: fixedTimes[3],
    });

    expect(created).toEqual({
      id: "character-created",
      workId: MONP_WORK_ID,
      menuItemId: "characters02",
      resourceType: "character",
      regionId: "characters02",
      regionName: "남동하천지대",
      name: "신규 인물",
      hanjaName: "新人",
      englishName: "New Person",
      imageUrl: "/portrait.png",
      species: "인간",
      birthplace: "남동하천지대",
      gender: "여",
      type: "",
      birthDate: "3월 2일",
      age: "27",
      height: "170cm",
      weight: "58kg",
      occupation: "연구자",
      alignment: "중립 선",
      affiliation: "하천 연구회",
      faction: "기록단",
      likes: "지도",
      dislikes: "거짓말",
      martialArts: "유수검법",
      personality: "침착하다.",
      appearance: "푸른 도포.",
      themeSong: "흐르는 강",
      summary: "모든 필드를 가진 인물.",
      notes: "비공개 기록",
      profileTheme,
      version: 1,
      archivedAt: null,
      createdAt: fixedTimes[0],
      updatedAt: fixedTimes[0],
    });

    profileTheme.labelText = "#000000";
    created.profileTheme.labelBackground = "#000000";
    await expect(
      repository.get(MONP_WORK_ID, "character-created"),
    ).resolves.toMatchObject({
      profileTheme: {
        labelBackground: "#123456",
        labelText: "#abcdef",
      },
    });

    const updated = await repository.update(
      MONP_WORK_ID,
      "character-created",
      {
        id: "updated-spoof",
        workId: MOON_WORK_ID,
        menuItemId: "world01",
        resourceType: "world",
        regionId: "characters06",
        regionName: "updated spoof",
        name: "  변경 인물  ",
        hanjaName: "變更",
        englishName: "Changed Person",
        imageUrl: "/changed.png",
        species: "마물",
        birthplace: "암수굴",
        gender: "남",
        type: "상급 악마",
        birthDate: "불명",
        age: "불명",
        height: "220cm",
        weight: "불명",
        occupation: "수문장",
        alignment: "질서 악",
        affiliation: "암수굴",
        faction: "흑월회",
        likes: "어둠",
        dislikes: "빛",
        martialArts: "그림자 잠식",
        personality: "과묵하다.",
        appearance: "검은 형체.",
        themeSong: "심연",
        summary: "변경된 모든 필드.",
        notes: "변경 기록",
        profileTheme: {
          labelBackground: "#654321",
          labelText: "#fedcba",
          autoText: true,
        },
        version: 500,
        archivedAt: fixedTimes[3],
        createdAt: fixedTimes[3],
        updatedAt: fixedTimes[3],
      },
    );

    expect(updated).toMatchObject({
      id: "character-created",
      workId: MONP_WORK_ID,
      menuItemId: "characters06",
      resourceType: "character",
      regionId: "characters06",
      regionName: "암수굴",
      name: "변경 인물",
      hanjaName: "變更",
      englishName: "Changed Person",
      imageUrl: "/changed.png",
      species: "마물",
      birthplace: "암수굴",
      gender: "",
      type: "상급 악마",
      birthDate: "불명",
      age: "불명",
      height: "220cm",
      weight: "불명",
      occupation: "수문장",
      alignment: "질서 악",
      affiliation: "암수굴",
      faction: "흑월회",
      likes: "어둠",
      dislikes: "빛",
      martialArts: "그림자 잠식",
      personality: "과묵하다.",
      appearance: "검은 형체.",
      themeSong: "심연",
      summary: "변경된 모든 필드.",
      notes: "변경 기록",
      version: 2,
      archivedAt: null,
      createdAt: fixedTimes[0],
      updatedAt: fixedTimes[1],
    });
  });

  it("normalizes the inactive human/monster branch on create and update", async () => {
    const monster = await repository.create(MONP_WORK_ID, {
      regionId: "characters06",
      name: "마물",
      species: "마물",
      gender: "여",
      type: "악마",
    });
    expect(monster).toMatchObject({ species: "마물", gender: "", type: "악마" });

    const human = await repository.update(MONP_WORK_ID, monster.id, {
      species: "인간",
      gender: "남",
      type: "남아 있으면 안 됨",
    });
    expect(human).toMatchObject({ species: "인간", gender: "남", type: "" });
  });

  it("requires a trimmed name and a concrete active character region", async () => {
    await expect(
      repository.create(MONP_WORK_ID, {
        regionId: "characters01",
        name: "   ",
      }),
    ).rejects.toThrow();
    await expect(
      repository.update(MONP_WORK_ID, "character-yeonhwa", { name: "\n\t" }),
    ).rejects.toThrow();

    for (const regionId of [undefined, "characters00", "missing", "world01"]) {
      await expect(
        repository.create(MONP_WORK_ID, { regionId, name: "잘못된 지역" }),
      ).rejects.toThrow();
    }

    const archivedMenuFixture = structuredClone(appFixture);
    archivedMenuFixture.menuItems.find(
      ({ id }) => id === "characters02",
    ).archivedAt = fixedTimes[3];
    const archivedMenuRepository = createRepository(archivedMenuFixture);

    await expect(
      archivedMenuRepository.create(MONP_WORK_ID, {
        regionId: "characters02",
        name: "보관 메뉴 인물",
      }),
    ).rejects.toThrow("Character region is archived: characters02");
  });

  it("is cross-work safe for update, archive, and restore", async () => {
    await expect(
      repository.update(MOON_WORK_ID, "character-yeonhwa", { name: "누수" }),
    ).rejects.toThrow(
      "Character not found in work work-moonlit-echoes: character-yeonhwa",
    );
    await expect(
      repository.archive(MOON_WORK_ID, "character-yeonhwa"),
    ).rejects.toThrow(
      "Character not found in work work-moonlit-echoes: character-yeonhwa",
    );
    await expect(
      repository.restore(MOON_WORK_ID, "character-yeonhwa"),
    ).rejects.toThrow(
      "Character not found in work work-moonlit-echoes: character-yeonhwa",
    );
  });

  it("archives and restores idempotently while preserving relations", async () => {
    const state = createFixtureContentRelationState(appFixture);
    const characterRepository = createRepository(state);
    const relationRepository = createFixtureRelationRepository(state);
    const endpoint = { type: "character", id: "character-yeonhwa" };
    const relationsBefore = await relationRepository.list(
      MONP_WORK_ID,
      endpoint,
    );
    const before = await characterRepository.get(
      MONP_WORK_ID,
      endpoint.id,
    );

    const archived = await characterRepository.archive(
      MONP_WORK_ID,
      endpoint.id,
    );
    const archivedAgain = await characterRepository.archive(
      MONP_WORK_ID,
      endpoint.id,
    );
    expect(archived).toMatchObject({
      archivedAt: fixedTimes[0],
      updatedAt: fixedTimes[0],
      version: before.version + 1,
    });
    expect(archivedAgain).toEqual(archived);
    await expect(
      relationRepository.list(MONP_WORK_ID, endpoint),
    ).resolves.toEqual(relationsBefore);
    await expect(
      relationRepository.listCandidates(MONP_WORK_ID),
    ).resolves.not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ endpoint }),
      ]),
    );

    const restored = await characterRepository.restore(
      MONP_WORK_ID,
      endpoint.id,
    );
    const restoredAgain = await characterRepository.restore(
      MONP_WORK_ID,
      endpoint.id,
    );
    expect(restored).toMatchObject({
      archivedAt: null,
      updatedAt: fixedTimes[1],
      version: before.version + 2,
    });
    expect(restoredAgain).toEqual(restored);
    await expect(
      relationRepository.list(MONP_WORK_ID, endpoint),
    ).resolves.toEqual(relationsBefore);
    await expect(
      relationRepository.listCandidates(MONP_WORK_ID),
    ).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ endpoint, label: "연화" }),
      ]),
    );
  });

  it("synchronizes relation candidates after shared-state create, rename, archive, and restore", async () => {
    const state = createFixtureContentRelationState(appFixture);
    const characterRepository = createRepository(state);
    const relationRepository = createFixtureRelationRepository(state);
    const endpoint = { type: "character", id: "character-created" };

    await characterRepository.create(MONP_WORK_ID, {
      regionId: "characters02",
      name: "공유 인물",
    });
    await expect(
      relationRepository.listCandidates(MONP_WORK_ID),
    ).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ endpoint, label: "공유 인물" }),
      ]),
    );

    await characterRepository.update(MONP_WORK_ID, endpoint.id, {
      name: "변경된 공유 인물",
    });
    await expect(
      relationRepository.listCandidates(MONP_WORK_ID),
    ).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ endpoint, label: "변경된 공유 인물" }),
      ]),
    );

    await characterRepository.archive(MONP_WORK_ID, endpoint.id);
    expect(
      (await relationRepository.listCandidates(MONP_WORK_ID)).map(
        ({ endpoint: candidate }) => candidate,
      ),
    ).not.toContainEqual(endpoint);

    await characterRepository.restore(MONP_WORK_ID, endpoint.id);
    await expect(
      relationRepository.listCandidates(MONP_WORK_ID),
    ).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ endpoint, label: "변경된 공유 인물" }),
      ]),
    );
  });

  it("rejects missing mutation targets", async () => {
    await expect(
      repository.update(MONP_WORK_ID, "character-missing", { name: "없음" }),
    ).rejects.toThrow(
      "Character not found in work work-monp: character-missing",
    );
    await expect(
      repository.archive(MONP_WORK_ID, "character-missing"),
    ).rejects.toThrow(
      "Character not found in work work-monp: character-missing",
    );
    await expect(
      repository.restore(MONP_WORK_ID, "character-missing"),
    ).rejects.toThrow(
      "Character not found in work work-monp: character-missing",
    );
  });
});

describe("fixture character repository image storage", () => {
  it("stores an uploaded image as a session-safe data URL", async () => {
    const image = new File(["portrait"], "portrait.png", {
      type: "image/png",
    });

    await expect(repository.storeImage(image)).resolves.toMatch(
      /^data:image\/png;base64,/,
    );
  });

  it("rejects non-image MIME types and images larger than exactly 5 MiB", async () => {
    const text = new File(["not an image"], "portrait.txt", {
      type: "text/plain",
    });
    const oversizedImage = {
      type: "image/png",
      size: MAX_CHARACTER_IMAGE_SIZE_BYTES + 1,
    };

    await expect(repository.storeImage(text)).rejects.toThrow(
      "Character image must use an image MIME type.",
    );
    await expect(repository.storeImage(oversizedImage)).rejects.toThrow(
      `Character image must not exceed ${MAX_CHARACTER_IMAGE_SIZE_BYTES} bytes.`,
    );
  });

  it("rejects FileReader failures", async () => {
    const readError = new Error("simulated read failure");

    class FailingFileReader {
      constructor() {
        this.error = readError;
        this.listeners = new Map();
      }

      addEventListener(type, listener) {
        this.listeners.set(type, listener);
      }

      readAsDataURL() {
        this.listeners.get("error")?.();
      }
    }

    vi.stubGlobal("FileReader", FailingFileReader);

    await expect(
      repository.storeImage({ type: "image/png", size: 100 }),
    ).rejects.toBe(readError);
  });
});


describe("fixture character shared-state validation", () => {
  it("deep-clones character reads/writes and revalidates existing relations", () => {
    const state = createFixtureContentRelationState(appFixture);
    const nextCharacters = state.read().characters;

    state.replaceCharacters(nextCharacters);
    nextCharacters[0].name = "외부 변경";
    const readResult = state.read();
    readResult.characters[0].profileTheme.labelText = "#000000";

    expect(state.read().characters[0]).toMatchObject({
      name: "연화",
      profileTheme: { labelText: "#3f3f3f" },
    });
    expect(() =>
      state.replaceCharacters(
        state
          .read()
          .characters.filter(({ id }) => id !== "character-yeonhwa"),
      ),
    ).toThrow(/unknown relation source/i);
    expect(state.read().characters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "character-yeonhwa" }),
      ]),
    );
  });
});