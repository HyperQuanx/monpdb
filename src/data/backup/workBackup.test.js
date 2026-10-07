import { describe, expect, it } from "vitest";
import { appFixture } from "../fixtures/appFixture";
import { createFixtureContentRelationState } from "../repositories/fixtureContentRelationState";
import { createFixtureRelationRepository } from "../repositories/fixtureRelationRepository";
import { createFixtureSettingRepository } from "../repositories/fixtureSettingRepository";
import {
  BACKUP_VERSION,
  createWorkBackupService,
  exportWorkBackup,
  parseWorkBackup,
  planWorkImport,
} from "./workBackup";

const MONP = "work-monp";
const MOON = "work-moonlit-echoes";
const exportText = (fixture = appFixture) => JSON.stringify(exportWorkBackup(fixture, MONP, { now: () => "2026-10-01T00:00:00.000Z" }));
const byCollection = (summary) => Object.fromEntries(summary.map(({ collection, ...rest }) => [collection, rest]));

describe("work backup export and parse", () => {
  it("exports one work with menus and an image manifest instead of binaries", () => {
    const fixture = structuredClone(appFixture);
    fixture.characters[0].imageUrl = "data:image/png;base64,AAAA";
    fixture.characters[1].imageUrl = "https://example.com/muyeong.png";
    const backup = exportWorkBackup(fixture, MONP, { now: () => "t" });
    expect(backup).toMatchObject({ exportedAt: "t", format: "monp-db-backup", version: BACKUP_VERSION, work: { id: MONP } });
    expect(backup.data.characters.map(({ id }) => id)).not.toContain("character-rin");
    expect(backup.data.characters[0].imageUrl).toBe("");
    expect(backup.images).toEqual([
      { field: "imageUrl", id: "character-yeonhwa", kind: "character", status: "omitted-upload", url: null },
      { field: "imageUrl", id: "character-muyeong", kind: "character", status: "url", url: "https://example.com/muyeong.png" },
    ]);
    expect(backup.menu.menuItems).toHaveLength(31);
    expect(JSON.stringify(backup)).not.toContain("base64");
  });

  it.each([
    ["{broken", /손상/],
    [JSON.stringify({ format: "other" }), /백업 파일이 아닙니다/],
    [JSON.stringify({ format: "monp-db-backup", version: "1" }), /버전 정보/],
    [JSON.stringify({ format: "monp-db-backup", version: 99 }), /새로운 백업 형식\(v99\)/],
    [JSON.stringify({ format: "monp-db-backup", version: 1, work: { id: MONP } }), /필요한 항목이 없습니다: menu, characters/],
  ])("rejects invalid files: %s", (text, message) => {
    expect(() => parseWorkBackup(text)).toThrow(message);
  });

  it("rejects backups mixing items from another work", () => {
    const backup = JSON.parse(exportText());
    backup.data.memos[0].workId = MOON;
    expect(() => parseWorkBackup(JSON.stringify(backup))).toThrow(/다른 작품의 항목/);
  });
});

describe("work backup import", () => {
  it("round-trips into a clean session and restores relations", async () => {
    const edited = createFixtureContentRelationState(appFixture);
    const settings = createFixtureSettingRepository(edited, { createId: () => "setting-new", now: () => "2026-10-01T00:00:00.000Z" });
    const relations = createFixtureRelationRepository(edited, { createId: () => "relation-new", now: () => "2026-10-01T00:00:00.000Z" });
    await settings.create(MONP, { categoryId: "setting02", title: "새 비술" });
    await relations.create(MONP, {
      label: "사용자",
      relationType: "owner",
      source: { type: "setting", id: "setting-new" },
      target: { type: "character", id: "character-muyeong" },
    });
    const text = JSON.stringify(createWorkBackupService(edited).exportWork(MONP));

    const clean = createFixtureContentRelationState(appFixture);
    const service = createWorkBackupService(clean);
    const summary = byCollection(service.importWork(parseWorkBackup(text), MONP, { mode: "replace" }));
    expect(summary.settings).toMatchObject({ added: 1, total: 2 });
    expect(summary.relations).toMatchObject({ added: 1 });
    const restored = createFixtureRelationRepository(clean);
    await expect(restored.list(MONP, { type: "setting", id: "setting-new" })).resolves.toEqual([
      expect.objectContaining({ id: "relation-new", target: { type: "character", id: "character-muyeong" } }),
    ]);
    // The other work is untouched.
    expect(clean.read().characters.filter(({ workId }) => workId === MOON)).toHaveLength(1);
    expect(JSON.stringify(service.exportWork(MONP).data)).toBe(JSON.stringify(JSON.parse(text).data));
  });

  it("merges new items and resolves conflicts by keeping or overwriting", () => {
    const backup = parseWorkBackup(exportText());
    backup.data.memos[0].title = "백업의 제목";
    backup.data.memos.push({ ...structuredClone(backup.data.memos[1]), id: "memo-from-backup", title: "새 메모" });
    const keep = planWorkImport(appFixture, backup, MONP, { conflict: "keep", mode: "merge" });
    expect(byCollection(keep.summary).memos).toMatchObject({ added: 1, conflicts: 1, total: 3 });
    expect(keep.fixture.memos.find(({ id }) => id === "memo-next-session").title).toBe("다음 집필 체크");
    const overwrite = planWorkImport(appFixture, backup, MONP, { conflict: "overwrite", mode: "merge" });
    expect(overwrite.fixture.memos.find(({ id }) => id === "memo-next-session").title).toBe("백업의 제목");

    const replace = planWorkImport(appFixture, { ...backup, data: { ...backup.data, memos: [] } }, MONP, { mode: "replace" });
    expect(byCollection(replace.summary).memos).toMatchObject({ removed: 2, total: 0 });
    expect(replace.fixture.memos.filter(({ workId }) => workId === MONP)).toEqual([]);
  });

  it("rejects duplicate ids, other-work backups, and broken relation integrity", () => {
    const backup = parseWorkBackup(exportText());
    const duplicated = structuredClone(backup);
    duplicated.data.memos.push(structuredClone(duplicated.data.memos[0]));
    expect(() => planWorkImport(appFixture, duplicated, MONP)).toThrow(/ID가 겹쳐서/);

    const clash = structuredClone(backup);
    clash.data.characters.push({ ...structuredClone(clash.data.characters[0]), id: "character-rin" });
    expect(() => planWorkImport(appFixture, clash, MONP)).toThrow(/ID가 겹쳐서/);
    try {
      planWorkImport(appFixture, clash, MONP);
    } catch (error) {
      expect(error.details).toContain("characters:character-rin (다른 작품이 사용 중)");
    }

    expect(() => planWorkImport(appFixture, backup, MOON)).toThrow(/다른 작품\(MONP\)의 백업/);

    const dangling = structuredClone(backup);
    dangling.data.relations[0].target = { type: "world", id: "world-missing" };
    expect(() => planWorkImport(appFixture, dangling, MONP, { mode: "replace" })).toThrow(/무결성 검사/);

    // Nothing is written when validation fails.
    const state = createFixtureContentRelationState(appFixture);
    expect(() => createWorkBackupService(state).importWork(dangling, MONP, { mode: "replace" })).toThrow();
    expect(state.read().relations).toEqual(appFixture.relations);
  });

  it("adds menus from the backup that the current session lacks", () => {
    const backup = parseWorkBackup(exportText());
    backup.menu.menuSections.push({ archivedAt: null, icon: "folder", id: "section-archive", label: "자료실", order: 6 });
    backup.menu.menuItems.push({
      archivedAt: null, filterConfig: { scope: "category" }, id: "item-notes", label: "참고", order: 0,
      resourceType: "generic", sectionId: "section-archive", slug: "notes",
    });
    backup.data.contents.push({
      archivedAt: null, body: { type: "doc", content: [] }, createdAt: "2026-01-01T00:00:00.000Z", id: "content-note",
      menuItemId: "item-notes", order: 0, status: "draft", summary: "", tags: [], title: "참고 기록", type: "generic",
      updatedAt: "2026-01-01T00:00:00.000Z", version: 1, workId: MONP,
    });
    const { fixture } = planWorkImport(appFixture, backup, MONP);
    expect(fixture.menuItems.map(({ id }) => id)).toContain("item-notes");
    expect(fixture.contents.map(({ id }) => id)).toContain("content-note");
  });
});
