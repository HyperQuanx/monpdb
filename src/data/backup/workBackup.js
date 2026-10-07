import { parseAppFixture } from "../../domain/schemas";

export const BACKUP_FORMAT = "monp-db-backup";
export const BACKUP_VERSION = 1;

// Work-scoped collections carried by a backup. Menus are global and merged.
export const BACKUP_COLLECTIONS = Object.freeze([
  "characters",
  "worlds",
  "plotScenes",
  "settings",
  "ideas",
  "memos",
  "contents",
  "relations",
]);

export const COLLECTION_LABELS = new Map([
  ["characters", "캐릭터"],
  ["worlds", "세계관"],
  ["plotScenes", "플롯 장면"],
  ["settings", "설정 자료"],
  ["ideas", "아이디어"],
  ["memos", "메모"],
  ["contents", "자료"],
  ["relations", "관계"],
]);

const clone = (value) => structuredClone(value);
const isDataUrl = (value) => typeof value === "string" && value.startsWith("data:");

export class BackupError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = "BackupError";
    this.details = details;
  }
}

/**
 * Versioned JSON backup of one work. Image binaries are never embedded:
 * uploaded (data URL) images are cleared and listed in `images`, while
 * remote/local image URLs are kept and listed for reference.
 */
export const exportWorkBackup = (fixture, workId, { now = () => new Date().toISOString() } = {}) => {
  const work = fixture.works.find(({ id }) => id === workId);
  if (!work) throw new BackupError(`작품을 찾을 수 없습니다: ${workId}`);
  const images = [];
  const data = Object.fromEntries(
    BACKUP_COLLECTIONS.map((collection) => [
      collection,
      fixture[collection].filter((item) => item.workId === workId).map(clone),
    ]),
  );
  for (const character of data.characters) {
    if (!character.imageUrl) continue;
    const embedded = isDataUrl(character.imageUrl);
    images.push({
      field: "imageUrl",
      id: character.id,
      kind: "character",
      status: embedded ? "omitted-upload" : "url",
      url: embedded ? null : character.imageUrl,
    });
    if (embedded) character.imageUrl = "";
  }
  const exportedWork = clone(work);
  if (isDataUrl(exportedWork.cover)) {
    images.push({ field: "cover", id: work.id, kind: "work", status: "omitted-upload", url: null });
    exportedWork.cover = "";
  }
  return {
    data,
    exportedAt: now(),
    format: BACKUP_FORMAT,
    images,
    menu: { menuItems: clone(fixture.menuItems), menuSections: clone(fixture.menuSections) },
    version: BACKUP_VERSION,
    work: exportedWork,
  };
};

/** Parses and structurally checks a backup file's text. */
export const parseWorkBackup = (text) => {
  let backup;
  try {
    backup = JSON.parse(text);
  } catch {
    throw new BackupError("JSON 파일을 읽을 수 없습니다. 손상되었거나 백업 파일이 아닙니다.");
  }
  if (!backup || typeof backup !== "object" || backup.format !== BACKUP_FORMAT) {
    throw new BackupError("MONP DB 백업 파일이 아닙니다.");
  }
  if (!Number.isInteger(backup.version) || backup.version < 1) {
    throw new BackupError("백업 버전 정보가 올바르지 않습니다.");
  }
  if (backup.version > BACKUP_VERSION) {
    throw new BackupError(
      `이 앱보다 새로운 백업 형식(v${backup.version})입니다. 앱을 업데이트한 뒤 가져오세요.`,
    );
  }
  const missing = [
    ...(backup.work?.id ? [] : ["work"]),
    ...(Array.isArray(backup.menu?.menuItems) && Array.isArray(backup.menu?.menuSections) ? [] : ["menu"]),
    ...BACKUP_COLLECTIONS.filter((collection) => !Array.isArray(backup.data?.[collection])),
  ];
  if (missing.length > 0) {
    throw new BackupError(`백업에 필요한 항목이 없습니다: ${missing.join(", ")}`);
  }
  const foreign = BACKUP_COLLECTIONS.flatMap((collection) =>
    backup.data[collection]
      .filter((item) => item?.workId !== backup.work.id)
      .map((item) => `${collection}:${item?.id}`),
  );
  if (foreign.length > 0) {
    throw new BackupError("백업 안에 다른 작품의 항목이 섞여 있습니다.", foreign);
  }
  return backup;
};

const mergeById = (current, incoming) => {
  const ids = new Set(current.map(({ id }) => id));
  return [...current, ...incoming.filter(({ id }) => !ids.has(id)).map(clone)];
};

/**
 * Computes the fixture that results from importing `backup` into `workId`.
 * - replace: all of the work's content is replaced by the backup.
 * - merge: new ids are added; existing ids follow `conflict` ("keep" | "overwrite").
 * Menus are global: missing sections/items are added, existing ones kept.
 * Ids that already belong to another work are rejected.
 */
export const planWorkImport = (fixture, backup, workId, { conflict = "keep", mode = "merge" } = {}) => {
  if (backup.work.id !== workId) {
    throw new BackupError(
      `다른 작품(${backup.work.title ?? backup.work.id})의 백업입니다. 해당 작품에서 가져오세요.`,
    );
  }
  const summary = [];
  const duplicates = [];
  const next = clone(fixture);
  next.menuSections = mergeById(fixture.menuSections, backup.menu.menuSections);
  next.menuItems = mergeById(fixture.menuItems, backup.menu.menuItems);

  for (const collection of BACKUP_COLLECTIONS) {
    const incoming = backup.data[collection];
    const seen = new Set();
    for (const item of incoming) {
      if (seen.has(item.id)) duplicates.push(`${collection}:${item.id} (백업 안에서 중복)`);
      seen.add(item.id);
    }
    const others = fixture[collection].filter((item) => item.workId !== workId);
    const otherIds = new Set(others.map(({ id }) => id));
    for (const item of incoming) {
      if (otherIds.has(item.id)) duplicates.push(`${collection}:${item.id} (다른 작품이 사용 중)`);
    }
    const current = fixture[collection].filter((item) => item.workId === workId);
    const currentById = new Map(current.map((item) => [item.id, item]));
    const conflicts = incoming.filter(
      (item) => currentById.has(item.id) && JSON.stringify(currentById.get(item.id)) !== JSON.stringify(item),
    );
    const added = incoming.filter((item) => !currentById.has(item.id));
    let result;
    if (mode === "replace") {
      result = incoming.map(clone);
    } else {
      const incomingById = new Map(incoming.map((item) => [item.id, item]));
      result = [
        ...current.map((item) =>
          conflict === "overwrite" && incomingById.has(item.id) ? clone(incomingById.get(item.id)) : item,
        ),
        ...added.map(clone),
      ];
    }
    next[collection] = [...others, ...result];
    summary.push({
      added: added.length,
      collection,
      conflicts: conflicts.length,
      removed: mode === "replace" ? current.filter((item) => !incoming.some(({ id }) => id === item.id)).length : 0,
      total: incoming.length,
    });
  }

  if (duplicates.length > 0) {
    throw new BackupError("ID가 겹쳐서 가져올 수 없습니다.", duplicates);
  }
  try {
    return { fixture: parseAppFixture(next), summary };
  } catch (error) {
    const details = (error.issues ?? []).map((issue) => `${issue.path?.join(".")}: ${issue.message}`);
    throw new BackupError("가져온 뒤 데이터 무결성 검사에 실패했습니다.", details.slice(0, 20));
  }
};

export const createWorkBackupService = (state, { now } = {}) => ({
  exportWork: (workId) => exportWorkBackup(state.read(), workId, { now }),
  preview: (backup, workId, options) => planWorkImport(state.read(), backup, workId, options).summary,
  importWork(backup, workId, options) {
    const { fixture, summary } = planWorkImport(state.read(), backup, workId, options);
    state.replaceAll(fixture);
    return summary;
  },
});
