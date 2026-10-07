import { createApiClient, ApiError } from "../http/apiClient";
import { apiBaseUrl } from "../http/config";
import { createFixtureContentRelationState } from "./fixtureContentRelationState";
import { createFixtureCharacterRepository } from "./fixtureCharacterRepository";
import { createFixtureContentRepository } from "./fixtureContentRepository";
import { createFixtureExplorationRepository } from "./fixtureExplorationRepository";
import { createFixtureIdeaRepository } from "./fixtureIdeaRepository";
import { createFixtureMemoRepository } from "./fixtureMemoRepository";
import { createFixturePlotRepository } from "./fixturePlotRepository";
import { createFixtureSettingRepository } from "./fixtureSettingRepository";
import { createFixtureRelationRepository } from "./fixtureRelationRepository";
import { createFixtureWorldRepository } from "./fixtureWorldRepository";
import { createWorkBackupService } from "../backup/workBackup";

export const httpClient = createApiClient();
const encode = encodeURIComponent;
const collections = { character: "characters", content: "contents", idea: "ideas", memo: "memos", plot: "plotScenes", setting: "settings", world: "worlds" };
export const createHttpRepositories = ({ api = httpClient, baseUrl = apiBaseUrl } = {}) => {
  const snapshots = new Map();
  const pending = new Map();
  let generation = 0;
  const path = (workId, kind, id = "") => `/works/${encode(workId)}/entries/${kind}${id ? `/${encode(id)}` : ""}`;
  const clear = (workId) => { generation += 1; if (workId) { snapshots.delete(workId); pending.delete(workId); } else { snapshots.clear(); pending.clear(); } };
  const normalizeImages = (fixture) => {
    for (const work of fixture.works) if (work.cover?.startsWith("/api/")) work.cover = new URL(work.cover, baseUrl).href;
    for (const character of fixture.characters) if (character.imageUrl?.startsWith("/api/")) character.imageUrl = new URL(character.imageUrl, baseUrl).href;
    return fixture;
  };
  const snapshot = async (workId, force = false) => {
    const saved = snapshots.get(workId);
    if (!force && saved && Date.now() - saved.timestamp < 500) return saved;
    if (pending.has(workId)) return pending.get(workId);
    const revision = generation;
    const request = api.get(`/works/${encode(workId)}/snapshot`).then((fixture) => {
      normalizeImages(fixture);
      const state = createFixtureContentRelationState(fixture);
      const adapters = {
        character: createFixtureCharacterRepository(state), content: createFixtureContentRepository(state),
        world: createFixtureWorldRepository(state), plot: createFixturePlotRepository(state), setting: createFixtureSettingRepository(state),
        idea: createFixtureIdeaRepository(state), memo: createFixtureMemoRepository(state), relation: createFixtureRelationRepository(state),
        exploration: createFixtureExplorationRepository(state),
      };
      const value = { state, adapters, timestamp: Date.now() };
      for (const [kind, collection] of Object.entries(collections)) for (const entry of fixture[collection]) {
        const resourcePath = path(workId, kind, entry.id);
        if (!api.getTag(resourcePath)) api.setTag(resourcePath, entry.version);
      }
      if (revision === generation) snapshots.set(workId, value);
      return value;
    }).finally(() => { if (pending.get(workId) === request) pending.delete(workId); });
    pending.set(workId, request);
    return request;
  };
  const change = async (workId, resourcePath, options) => { const result = await api.write(resourcePath, options); clear(workId); return result; };
  const entryRepositories = Object.fromEntries(Object.keys(collections).map((kind) => [kind, {
    async list(filters = {}) { return (await snapshot(filters.workId)).adapters[kind].list(filters); },
    async get(workId, id) {
      const result = await api.get(path(workId, kind, id));
      if (kind === "character" && result.imageUrl?.startsWith("/api/")) result.imageUrl = new URL(result.imageUrl, baseUrl).href;
      return result;
    },
    create: (workId, payload) => change(workId, path(workId, kind), { body: payload }),
    update: (workId, id, updates) => change(workId, path(workId, kind, id), { method: "PATCH", body: updates, matchPath: path(workId, kind, id) }),
    archive: (workId, id) => change(workId, `${path(workId, kind, id)}/archive`, { matchPath: path(workId, kind, id) }),
    restore: (workId, id) => change(workId, `${path(workId, kind, id)}/restore`, { matchPath: path(workId, kind, id) }),
  }]));
  const contentCreate = entryRepositories.content.create;
  entryRepositories.content.create = (workId, menuItemId, payload = {}) => contentCreate(workId, { ...payload, menuItemId });
  entryRepositories.character.storeImage = async (file) => { const body = new FormData(); body.set("image", file); return new URL((await api.write("/images", { body })).imageUrl, baseUrl).href; };
  entryRepositories.plot.move = (workId, id, payload) => change(workId, `${path(workId, "plot", id)}/position`, { method: "PUT", body: payload, matchPath: path(workId, "plot", id) });
  entryRepositories.setting.listOwners = async (workId) => (await snapshot(workId)).adapters.setting.listOwners(workId);
  entryRepositories.idea.transition = (workId, id, status) => entryRepositories.idea.update(workId, id, { status });
  entryRepositories.idea.markConverted = () => Promise.reject(new ApiError("아이디어 전환 API를 사용해 주세요."));
  entryRepositories.memo.setPinned = (workId, id, pinned) => entryRepositories.memo.update(workId, id, { pinned });
  entryRepositories.memo.toggleChecklistItem = async (workId, id, itemId) => {
    const { adapters } = await snapshot(workId);
    const memo = await adapters.memo.get(workId, id);
    if (!memo.checklist.some((item) => item.id === itemId)) throw new ApiError("체크리스트 항목을 찾을 수 없습니다.", { status: 404 });
    return entryRepositories.memo.update(workId, id, { checklist: memo.checklist.map((item) => item.id === itemId ? { ...item, done: !item.done } : item) });
  };
  const coreRead = async (resourcePath, prefix) => {
    const versions = await api.get("/versions");
    Object.entries(versions).filter(([key]) => key.startsWith(prefix)).forEach(([key, version]) => api.setTag(key, version));
    return api.get(resourcePath);
  };
  const workRepository = {
    list: ({ includeArchived = false } = {}) => coreRead(`/works?includeArchived=${includeArchived}`, "/works/"),
    get: (id) => api.get(`/works/${encode(id)}`),
    create: (body) => change(null, "/works", { body }),
    update: (id, body) => change(id, `/works/${encode(id)}`, { method: "PATCH", body, matchPath: `/works/${encode(id)}` }),
    archive: (id) => change(id, `/works/${encode(id)}/archive`, { matchPath: `/works/${encode(id)}` }),
    restore: (id) => change(id, `/works/${encode(id)}/restore`, { matchPath: `/works/${encode(id)}` }),
    async select(id) { const work = await api.get(`/works/${encode(id)}`); if (work.archivedAt) throw new ApiError("보관된 작품입니다.", { status: 404 }); return work; },
  };
  const menuRepository = {
    listTree: ({ includeArchived = false } = {}) => includeArchived ? Promise.all([menuRepository.listSections({ includeArchived: true }), api.get("/menu/tree")]).then(async ([sections]) => Promise.all(sections.map(async (s) => ({ ...s, items: await menuRepository.listItems(s.id, { includeArchived: true }) })))) : coreRead("/menu/tree", "/menu/"),
    listSections: ({ includeArchived = false } = {}) => coreRead(`/menu/sections?includeArchived=${includeArchived}`, "/menu/sections/"),
    getSection: (id) => api.get(`/menu/sections/${encode(id)}`),
    listItems: (id, { includeArchived = false } = {}) => coreRead(`/menu/sections/${encode(id)}/items?includeArchived=${includeArchived}`, "/menu/items/"),
    getItem: (id) => api.get(`/menu/items/${encode(id)}`),
    createSection: (body) => change(null, "/menu/sections", { body }),
    createItem: (id, body) => change(null, `/menu/sections/${encode(id)}/items`, { body }),
    async requireActiveItem(sectionId, id) {
      const [section, menuItem] = await Promise.all([menuRepository.getSection(sectionId), menuRepository.getItem(id)]);
      if (section.archivedAt || menuItem.archivedAt || menuItem.sectionId !== sectionId) throw new ApiError("메뉴를 찾을 수 없습니다.", { status: 404 });
      return menuItem;
    },
  };
  for (const [name, namespace] of [["Section", "sections"], ["Item", "items"]]) {
    const resource = (id) => `/menu/${namespace}/${encode(id)}`;
    menuRepository[`update${name}`] = (id, body) => change(null, resource(id), { method: "PATCH", body, matchPath: resource(id) });
    menuRepository[`archive${name}`] = (id) => change(null, `${resource(id)}/archive`, { matchPath: resource(id) });
    menuRepository[`restore${name}`] = (id) => change(null, `${resource(id)}/restore`, { matchPath: resource(id) });
  }
  const reorder = async (resource, ids, prefix) => {
    // Use versions captured when the menu was displayed; preflight only absent ones.
    const missing = ids.filter((id) => !api.getTag(`${prefix}${encode(id)}`));
    await Promise.all(missing.map((id) => api.get(`${prefix}${encode(id)}`)));
    const versions = Object.fromEntries(ids.map((id) => [id, Number(api.getTag(`${prefix}${encode(id)}`).replaceAll('"', ""))]));
    return change(null, resource, { method: "PUT", body: { ids, versions } });
  };
  menuRepository.reorderSections = (ids) => reorder("/menu/sections/order", ids, "/menu/sections/");
  menuRepository.reorderItems = (sectionId, ids) => reorder(`/menu/sections/${encode(sectionId)}/items/order`, ids, "/menu/items/");
  const relationRepository = {
    list: async (workId, endpoint) => (await snapshot(workId)).adapters.relation.list(workId, endpoint),
    listCandidates: async (workId, endpoint, options) => (await snapshot(workId)).adapters.relation.listCandidates(workId, endpoint, options),
    create: (workId, body) => change(workId, `/works/${encode(workId)}/relations`, { body }),
    async replaceOutgoing(workId, source, drafts) {
      const kind = Object.hasOwn(collections, source.type) ? source.type : "content";
      const sourcePath = path(workId, kind, source.id);
      const result = await change(workId, `/works/${encode(workId)}/relations/outgoing`, { method: "PUT", body: { source, drafts }, matchPath: sourcePath });
      const version = Number(api.getTag(sourcePath).replaceAll('"', "")); api.setTag(sourcePath, version + 1);
      return result;
    },
    archive: (workId, id) => change(workId, `/works/${encode(workId)}/relations/${encode(id)}/archive`, { matchPath: `/works/${encode(workId)}/relations/${encode(id)}` }),
    restore: (workId, id) => change(workId, `/works/${encode(workId)}/relations/${encode(id)}/restore`, { matchPath: `/works/${encode(workId)}/relations/${encode(id)}` }),
  };
  const explorationRepository = Object.fromEntries(["search", "listRecentlyUpdated", "resolve", "getNeighborhood"].map((method) => [method, async (workId, ...args) => (await snapshot(workId)).adapters.exploration[method](workId, ...args)]));
  const backupService = {
    load: (workId) => snapshot(workId, true),
    async exportWork(workId) { await snapshot(workId, true); return api.get(`/works/${encode(workId)}/backup`); },
    preview(backup, workId, options) { const current = snapshots.get(workId); if (!current) throw new ApiError("백업 데이터를 불러오는 중입니다."); return createWorkBackupService(current.state).preview(backup, workId, options); },
    async importWork(backup, workId, options) {
      const snapshotPath = `/works/${encode(workId)}/snapshot`;
      const result = await change(workId, `/works/${encode(workId)}/backup/import`, { body: { backup, ...options }, matchPath: snapshotPath });
      await snapshot(workId, true); return result;
    },
  };
  const ideaConverter = { convert: (workId, id, body) => change(workId, `${path(workId, "idea", id)}/convert`, { body, matchPath: path(workId, "idea", id) }) };
  return { ...Object.fromEntries(Object.entries(entryRepositories).map(([kind, repository]) => [`${kind}Repository`, repository])), workRepository, menuRepository, relationRepository, explorationRepository, backupService, ideaConverter };
};
