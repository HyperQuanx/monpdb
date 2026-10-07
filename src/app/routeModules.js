// Route-level code splitting. Each page is its own chunk; heavy shared
// dependencies such as Tiptap only load with the editor/detail pages that use
// them. Loaders stay in the static route tree so data rules run before render.
export const routeModules = {
  workHome: () => import("../features/works/pages/WorkHomePage"),
  workManage: () => import("../features/works/pages/WorkManagePage"),
  menuManage: () => import("../features/menu-management/pages/MenuManagePage"),
  characterList: () => import("../features/characters/pages/CharacterListPage"),
  characterEditor: () => import("../features/characters/pages/CharacterEditorPage"),
  characterDetail: () => import("../features/characters/pages/CharacterDetailPage"),
  worldList: () => import("../features/worlds/pages/WorldListPage"),
  worldEditor: () => import("../features/worlds/pages/WorldEditorPage"),
  worldDetail: () => import("../features/worlds/pages/WorldDetailPage"),
  plotList: () => import("../features/plots/pages/PlotListPage"),
  plotEditor: () => import("../features/plots/pages/PlotEditorPage"),
  plotDetail: () => import("../features/plots/pages/PlotDetailPage"),
  settingList: () => import("../features/settings/pages/SettingListPage"),
  settingEditor: () => import("../features/settings/pages/SettingEditorPage"),
  settingDetail: () => import("../features/settings/pages/SettingDetailPage"),
  ideaList: () => import("../features/ideas/pages/IdeaListPage"),
  ideaEditor: () => import("../features/ideas/pages/IdeaEditorPage"),
  ideaDetail: () => import("../features/ideas/pages/IdeaDetailPage"),
  memoList: () => import("../features/memos/pages/MemoListPage"),
  memoEditor: () => import("../features/memos/pages/MemoEditorPage"),
  memoDetail: () => import("../features/memos/pages/MemoDetailPage"),
  search: () => import("../features/exploration/pages/SearchPage"),
  recent: () => import("../features/exploration/pages/RecentPage"),
  relations: () => import("../features/exploration/pages/RelationsPage"),
  archive: () => import("../features/archive/pages/ArchivePage"),
  backup: () => import("../features/backup/pages/BackupPage"),
  contentList: () => import("../features/content/pages/ContentListPage"),
  contentEditor: () => import("../features/content/pages/ContentEditorPage"),
  contentDetail: () => import("../features/content/pages/ContentDetailPage"),
};

/** React Router `lazy` adapter for a default-exported page component. */
export const lazyPage = (name) => async () => ({
  Component: (await routeModules[name]()).default,
});

/**
 * Fetches every route chunk in the background once the browser is idle, so
 * later navigation works without further requests (e.g. after going offline
 * in fixture mode, or on a flaky mobile connection).
 */
export const preloadRouteModules = ({
  schedule = globalThis.requestIdleCallback
    ? (callback) => globalThis.requestIdleCallback(callback, { timeout: 2000 })
    : (callback) => globalThis.setTimeout(callback, 200),
} = {}) =>
  new Promise((resolve) => {
    schedule(() => {
      Promise.allSettled(Object.values(routeModules).map((load) => load())).then(resolve);
    });
  });
