import { isHttpMode } from "../http/config";
import { createHttpRepositories } from "./httpRepositories";
import { appFixture } from "../fixtures/appFixture";
import { createFixtureCharacterRepository } from "./fixtureCharacterRepository";
import { createFixtureContentRelationState } from "./fixtureContentRelationState";
import { createWorkBackupService } from "../backup/workBackup";
import { createFixtureContentRepository } from "./fixtureContentRepository";
import { createFixtureExplorationRepository } from "./fixtureExplorationRepository";
import { createFixtureMenuRepository } from "./fixtureMenuRepository";
import { createFixtureIdeaRepository } from "./fixtureIdeaRepository";
import { createFixtureMemoRepository } from "./fixtureMemoRepository";
import { createFixturePlotRepository } from "./fixturePlotRepository";
import { createIdeaConverter } from "./ideaConverter";
import { createFixtureSettingRepository } from "./fixtureSettingRepository";
import { createFixtureRelationRepository } from "./fixtureRelationRepository";
import { createFixtureWorkRepository } from "./fixtureWorkRepository";
import { createFixtureWorldRepository } from "./fixtureWorldRepository";

export const defaultFixtureWorkId = appFixture.works[0].id;

export const menuQueryKeys = {
  all: () => ["menu"],
  tree: () => ["menu", "tree"],
  sections: (includeArchived = false) => [
    "menu",
    "sections",
    { includeArchived },
  ],
  items: (sectionId, includeArchived = false) => [
    "menu",
    "items",
    sectionId,
    { includeArchived },
  ],
};

export const workQueryKeys = {
  all: () => ["works"],
  lists: () => ["works", "list"],
  list: (includeArchived = false) => [
    "works",
    "list",
    { includeArchived },
  ],
  details: () => ["works", "detail"],
  detail: (workId) => ["works", "detail", workId],
  selected: () => ["works", "selected"],
};

const createFilteredListKey = (
  namespace,
  workId,
  regionId,
  query,
  filters,
  allowedFilters,
) => {
  const filterState = { regionId, query };

  for (const key of allowedFilters) {
    const value = filters[key];
    if (value === undefined || value === null) {
      continue;
    }
    const normalizedValue = typeof value === "string" ? value.trim() : value;
    if (normalizedValue !== "") {
      filterState[key] = normalizedValue;
    }
  }

  return [namespace, workId, "list", filterState];
};

export const characterQueryKeys = {
  all: (workId) => ["characters", workId],
  lists: (workId) => ["characters", workId, "list"],
  list: (workId, regionId, query, filters = {}) =>
    createFilteredListKey(
      "characters",
      workId,
      regionId,
      query,
      filters,
      ["species", "affiliation", "archiveStatus"],
    ),
  details: (workId) => ["characters", workId, "detail"],
  detail: (workId, characterId) => [
    "characters",
    workId,
    "detail",
    characterId,
  ],
};

export const worldQueryKeys = {
  all: (workId) => ["worlds", workId],
  lists: (workId) => ["worlds", workId, "list"],
  list: (workId, regionId, query, filters = {}) =>
    createFilteredListKey("worlds", workId, regionId, query, filters, [
      "category",
      "era",
      "archiveStatus",
    ]),
  details: (workId) => ["worlds", workId, "detail"],
  detail: (workId, worldId) => ["worlds", workId, "detail", worldId],
};

export const plotQueryKeys = {
  all: (workId) => ["plots", workId],
  lists: (workId) => ["plots", workId, "list"],
  list: (workId, chapterId, query, filters = {}) =>
    createFilteredListKey("plots", workId, chapterId, query, filters, [
      "status",
      "unresolved",
      "archiveStatus",
    ]),
  index: (workId) => ["plots", workId, "index"],
  details: (workId) => ["plots", workId, "detail"],
  detail: (workId, sceneId) => ["plots", workId, "detail", sceneId],
};

export const settingQueryKeys = {
  all: (workId) => ["settings", workId],
  lists: (workId) => ["settings", workId, "list"],
  list: (workId, categoryId, query, filters = {}) =>
    createFilteredListKey("settings", workId, categoryId, query, filters, [
      "grade",
      "ownerCharacterId",
      "archiveStatus",
    ]),
  owners: (workId) => ["settings", workId, "owners"],
  details: (workId) => ["settings", workId, "detail"],
  detail: (workId, settingId) => ["settings", workId, "detail", settingId],
};

export const ideaQueryKeys = {
  all: (workId) => ["ideas", workId],
  lists: (workId) => ["ideas", workId, "list"],
  list: (workId, categoryId, query, filters = {}) =>
    createFilteredListKey("ideas", workId, categoryId, query, filters, [
      "priority",
      "status",
      "archiveStatus",
    ]),
  details: (workId) => ["ideas", workId, "detail"],
  detail: (workId, ideaId) => ["ideas", workId, "detail", ideaId],
};

export const memoQueryKeys = {
  all: (workId) => ["memos", workId],
  lists: (workId) => ["memos", workId, "list"],
  list: (workId, menuItemId, query, filters = {}) =>
    createFilteredListKey("memos", workId, menuItemId, query, filters, [
      "color",
      "archiveStatus",
    ]),
  details: (workId) => ["memos", workId, "detail"],
  detail: (workId, memoId) => ["memos", workId, "detail", memoId],
};

// Exploration reads every collection, so its keys sit under one prefix that
// pages invalidate broadly; staleTime 0 keeps results in sync after edits.
export const explorationQueryKeys = {
  all: (workId) => ["exploration", workId],
  search: (workId, filters) => ["exploration", workId, "search", filters],
  recentlyUpdated: (workId) => ["exploration", workId, "recently-updated"],
  resolve: (workId, references) => ["exploration", workId, "resolve", references],
  neighborhood: (workId, focus, options) => ["exploration", workId, "neighborhood", focus, options],
};

export const contentQueryKeys = {
  all: (workId) => ["contents", workId],
  lists: (workId) => ["contents", workId, "list"],
  list: (workId, menuItemId, query) => [
    "contents",
    workId,
    "list",
    { menuItemId, query },
  ],
  details: (workId) => ["contents", workId, "detail"],
  detail: (workId, contentId) => [
    "contents",
    workId,
    "detail",
    contentId,
  ],
};

export const relationQueryKeys = {
  all: (workId) => ["relations", workId],
  lists: (workId) => ["relations", workId, "list"],
  list: (workId, entity) => ["relations", workId, "list", entity],
  candidates: (workId, source) => [
    "relations",
    workId,
    "candidates",
    source,
  ],
};

// These singletons intentionally live for one SPA session. A full page reload
// reconstructs them from the validated fixture until the HTTP repositories land.
const httpRepositories = isHttpMode ? createHttpRepositories() : null;
const contentRelationState = createFixtureContentRelationState(appFixture);

// Menus share the content state so categories created in menu management can
// hold content in the same session.
export const menuRepository = httpRepositories?.menuRepository ?? createFixtureMenuRepository(contentRelationState);
export const workRepository = httpRepositories?.workRepository ?? createFixtureWorkRepository(contentRelationState);
export const characterRepository = httpRepositories?.characterRepository ?? createFixtureCharacterRepository(contentRelationState);
export const worldRepository = httpRepositories?.worldRepository ?? createFixtureWorldRepository(contentRelationState);
export const plotRepository = httpRepositories?.plotRepository ?? createFixturePlotRepository(contentRelationState);
export const settingRepository = httpRepositories?.settingRepository ?? createFixtureSettingRepository(contentRelationState);
export const ideaRepository = httpRepositories?.ideaRepository ?? createFixtureIdeaRepository(contentRelationState);
export const memoRepository = httpRepositories?.memoRepository ?? createFixtureMemoRepository(contentRelationState);
export const contentRepository = httpRepositories?.contentRepository ?? createFixtureContentRepository(contentRelationState);
export const relationRepository = httpRepositories?.relationRepository ?? createFixtureRelationRepository(contentRelationState);
export const explorationRepository = httpRepositories?.explorationRepository ?? createFixtureExplorationRepository(contentRelationState);
export const backupService = httpRepositories?.backupService ?? createWorkBackupService(contentRelationState);
// Restore entry point per exploration kind, used by the combined archive.
export const restoreRepositories = {
  character: characterRepository,
  content: contentRepository,
  idea: ideaRepository,
  memo: memoRepository,
  plot: plotRepository,
  setting: settingRepository,
  world: worldRepository,
};
export const ideaConverter = httpRepositories?.ideaConverter ?? createIdeaConverter({
  ideas: ideaRepository,
  plots: plotRepository,
  relations: relationRepository,
  settings: settingRepository,
  worlds: worldRepository,
});
