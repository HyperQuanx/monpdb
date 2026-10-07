import { beforeEach, describe, expect, it } from "vitest";
import { appFixture } from "../fixtures/appFixture";
import { createFixtureWorkRepository } from "./fixtureWorkRepository";
import { createFixtureContentRelationState } from "./fixtureContentRelationState";
import { createFixtureCharacterRepository } from "./fixtureCharacterRepository";
import { createWorkBackupService } from "../backup/workBackup";

const timestamps = [
  "2026-09-25T01:00:00.000Z",
  "2026-09-25T01:01:00.000Z",
  "2026-09-25T01:02:00.000Z",
  "2026-09-25T01:03:00.000Z",
];

const createRepository = (works = appFixture.works) => {
  let timeIndex = 0;

  return createFixtureWorkRepository(works, {
    createId: () => "work-created",
    now: () => timestamps[timeIndex++] ?? timestamps.at(-1),
  });
};

let repository;

beforeEach(() => {
  repository = createRepository();
});

describe("fixture Work repository reads", () => {
  it("lists active works by default and includes archived works on request", async () => {
    await repository.archive("work-monp");

    const active = await repository.list();
    const all = await repository.list({ includeArchived: true });

    expect(active.map(({ id }) => id)).not.toContain("work-monp");
    expect(all).toHaveLength(appFixture.works.length);
  });

  it("returns clones from list, get, and select", async () => {
    const [listed] = await repository.list();
    listed.title = "외부 변경";

    const selected = await repository.select("work-monp");
    selected.title = "선택 변경";

    await expect(repository.get("work-monp")).resolves.toMatchObject({
      title: "MONP",
    });
  });

  it("rejects missing and archived selections", async () => {
    await expect(repository.select("work-missing")).rejects.toThrow(
      "Work not found: work-missing",
    );

    await repository.archive("work-monp");
    await expect(repository.select("work-monp")).rejects.toThrow(
      "Archived work cannot be selected: work-monp",
    );
  });
});

describe("fixture Work repository session mutations", () => {
  it("creates a normalized work that is immediately readable", async () => {
    const created = await repository.create({
      title: "새 작품",
      slug: "  NEW-WORK  ",
      subtitle: "두 번째 이야기",
      genre: "판타지",
      summary: "새 작품 요약",
      status: "planning",
      accentColor: "#345678",
      cover: "",
    });

    expect(created).toMatchObject({
      id: "work-created",
      title: "새 작품",
      slug: "new-work",
      archivedAt: null,
      createdAt: timestamps[0],
      updatedAt: timestamps[0],
    });
    await expect(repository.get(created.id)).resolves.toEqual(created);
  });

  it("partially updates without changing identity or creation time", async () => {
    const before = await repository.get("work-monp");
    const updated = await repository.update("work-monp", {
      title: "MONP 개정판",
      status: "paused",
    });

    expect(updated).toMatchObject({
      id: before.id,
      slug: before.slug,
      title: "MONP 개정판",
      status: "paused",
      createdAt: before.createdAt,
      updatedAt: timestamps[0],
    });
  });

  it("archives and restores a work without releasing its slug", async () => {
    const archived = await repository.archive("work-monp");
    expect(archived.archivedAt).toBe(timestamps[0]);
    await expect(repository.list()).resolves.not.toContainEqual(
      expect.objectContaining({ id: "work-monp" }),
    );

    await expect(
      repository.create({ title: "충돌", slug: archived.slug }),
    ).rejects.toThrow(`Work slug already exists: ${archived.slug}`);

    const restored = await repository.restore("work-monp");
    expect(restored.archivedAt).toBeNull();
    await expect(repository.list()).resolves.toContainEqual(restored);
  });

  it("rejects duplicate slugs on create and update", async () => {
    const [, secondWork] = appFixture.works;

    await expect(
      repository.create({ title: "중복", slug: "monp" }),
    ).rejects.toThrow("Work slug already exists: monp");
    await expect(
      repository.update(secondWork.id, { slug: "MONP" }),
    ).rejects.toThrow("Work slug already exists: monp");
  });

  it("rejects missing mutation targets", async () => {
    await expect(
      repository.update("work-missing", { title: "없음" }),
    ).rejects.toThrow("Work not found: work-missing");
    await expect(repository.archive("work-missing")).rejects.toThrow(
      "Work not found: work-missing",
    );
    await expect(repository.restore("work-missing")).rejects.toThrow(
      "Work not found: work-missing",
    );
  });
});
it("shares newly created and edited works with content and backup", async () => {
  const state = createFixtureContentRelationState(appFixture);
  const works = createFixtureWorkRepository(state, { createId: () => "new-work" });
  const work = await works.create({ title: "새 작품", slug: "new-work" });
  const characters = createFixtureCharacterRepository(state);
  await expect(characters.create(work.id, { name: "새 인물", regionId: "characters01" }))
    .resolves.toMatchObject({ workId: work.id });
  await works.update(work.id, { title: "수정된 작품" });
  expect(createWorkBackupService(state).exportWork(work.id).work.title).toBe("수정된 작품");
});
