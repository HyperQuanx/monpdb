import { Navigate, createBrowserRouter } from "react-router-dom";
import LegacyCharacterDetailRedirect from "./LegacyCharacterDetailRedirect";
import RootLayout from "../layouts/RootLayout";
import ErrorPage from "../pages/ErrorPage";
import MenuRouteErrorPage from "../pages/MenuRouteErrorPage";
import WorkRouteErrorPage from "../pages/WorkRouteErrorPage";
import { characterRegions } from "./menuSections";
import { lazyPage } from "./routeModules";
import RouteLoadingPage from "../pages/RouteLoadingPage";
import {
  characterCreatePath,
  characterListPath,
} from "./paths";
import CharacterMenuLayout from "../features/characters/CharacterMenuLayout";
import ContentMenuLayout from "../features/content/ContentMenuLayout";
import PlotMenuLayout from "../features/plots/PlotMenuLayout";
import SettingMenuLayout from "../features/settings/SettingMenuLayout";
import WorldMenuLayout from "../features/worlds/WorldMenuLayout";
import {
  requireActiveCharacterMenuItem,
  requireActiveMenuItem,
  requireActivePlotMenuItem,
  requireActiveIdeaMenuItem,
  requireActiveMemoMenuItem,
  requireActiveSettingMenuItem,
  requireActiveWorldMenuItem,
} from "../features/menu-management/menuLoader";
import MenuOutletLayout from "../layouts/MenuOutletLayout";
import WorkSelectionPage from "../features/works/pages/WorkSelectionPage";
import { requireActiveWork } from "../features/works/workLoader";
import { defaultFixtureWorkId } from "../data/repositories/appRepositories";

const legacyCharacterRoutes = characterRegions.flatMap((region) => [
  {
    path: region.id,
    element: (
      <Navigate
        replace
        to={characterListPath(defaultFixtureWorkId, region.id)}
      />
    ),
  },
  {
    path: `${region.id}/new`,
    element: (
      <Navigate
        replace
        to={characterCreatePath(defaultFixtureWorkId, region.id)}
      />
    ),
  },
  {
    path: `${region.id}/:characterId`,
    element: (
      <LegacyCharacterDetailRedirect
        regionId={region.id}
        workId={defaultFixtureWorkId}
      />
    ),
  },
]);

export const routeDefinitions = [
  {
    path: "/",
    errorElement: <ErrorPage />,
    HydrateFallback: RouteLoadingPage,
    children: [
      {
        index: true,
        element: <WorkSelectionPage />,
      },
      {
        element: <RootLayout />,
        children: [
          {
            path: "works/manage",
            lazy: lazyPage("workManage"),
          },
          {
            path: "menu/manage",
            lazy: lazyPage("menuManage"),
          },
        ],
      },
      {
        id: "work",
        path: "works/:workId",
        loader: requireActiveWork,
        errorElement: <WorkRouteErrorPage />,
        element: <RootLayout workScoped />,
        children: [
          {
            index: true,
            lazy: lazyPage("workHome"),
          },
          { path: "search", lazy: lazyPage("search") },
          { path: "recent", lazy: lazyPage("recent") },
          { path: "relations", lazy: lazyPage("relations") },
          { path: "archive", lazy: lazyPage("archive") },
          { path: "backup", lazy: lazyPage("backup") },
          {
            id: "character-menu",
            path: "characters/:menuItemId",
            loader: requireActiveCharacterMenuItem,
            errorElement: <MenuRouteErrorPage />,
            element: <CharacterMenuLayout />,
            children: [
              { index: true, lazy: lazyPage("characterList") },
              { path: "new", lazy: lazyPage("characterEditor") },
              { path: ":characterId", lazy: lazyPage("characterDetail") },
              { path: ":characterId/edit", lazy: lazyPage("characterEditor") },
            ],
          },
          {
            id: "world-menu",
            path: "world/:menuItemId",
            loader: requireActiveWorldMenuItem,
            errorElement: <MenuRouteErrorPage />,
            element: <WorldMenuLayout />,
            children: [
              { index: true, lazy: lazyPage("worldList") },
              { path: "new", lazy: lazyPage("worldEditor") },
              { path: ":worldId", lazy: lazyPage("worldDetail") },
              { path: ":worldId/edit", lazy: lazyPage("worldEditor") },
            ],
          },
          {
            id: "plot-menu",
            path: "plot/:menuItemId",
            loader: requireActivePlotMenuItem,
            errorElement: <MenuRouteErrorPage />,
            element: <PlotMenuLayout />,
            children: [
              { index: true, lazy: lazyPage("plotList") },
              { path: "new", lazy: lazyPage("plotEditor") },
              { path: ":sceneId", lazy: lazyPage("plotDetail") },
              { path: ":sceneId/edit", lazy: lazyPage("plotEditor") },
            ],
          },
          {
            id: "setting-menu",
            path: "setting/:menuItemId",
            loader: requireActiveSettingMenuItem,
            errorElement: <MenuRouteErrorPage />,
            element: <SettingMenuLayout />,
            children: [
              { index: true, lazy: lazyPage("settingList") },
              { path: "new", lazy: lazyPage("settingEditor") },
              { path: ":settingId", lazy: lazyPage("settingDetail") },
              { path: ":settingId/edit", lazy: lazyPage("settingEditor") },
            ],
          },
          {
            id: "idea-menu",
            path: "idea/:menuItemId",
            loader: requireActiveIdeaMenuItem,
            errorElement: <MenuRouteErrorPage />,
            element: <MenuOutletLayout />,
            children: [
              { index: true, lazy: lazyPage("ideaList") },
              { path: "new", lazy: lazyPage("ideaEditor") },
              { path: ":ideaId", lazy: lazyPage("ideaDetail") },
              { path: ":ideaId/edit", lazy: lazyPage("ideaEditor") },
            ],
          },
          {
            id: "memo-menu",
            path: "memo/:menuItemId",
            loader: requireActiveMemoMenuItem,
            errorElement: <MenuRouteErrorPage />,
            element: <MenuOutletLayout />,
            children: [
              { index: true, lazy: lazyPage("memoList") },
              { path: "new", lazy: lazyPage("memoEditor") },
              { path: ":memoId", lazy: lazyPage("memoDetail") },
              { path: ":memoId/edit", lazy: lazyPage("memoEditor") },
            ],
          },
          {
            id: "content-menu",
            path: ":sectionId/:menuItemId",
            loader: requireActiveMenuItem,
            errorElement: <MenuRouteErrorPage />,
            element: <ContentMenuLayout />,
            children: [
              { index: true, lazy: lazyPage("contentList") },
              { path: "new", lazy: lazyPage("contentEditor") },
              { path: ":entryId", lazy: lazyPage("contentDetail") },
              { path: ":entryId/edit", lazy: lazyPage("contentEditor") },
            ],
          },
        ],
      },
      ...legacyCharacterRoutes,
    ],
  },
];
export const createAppRouter = () => createBrowserRouter(routeDefinitions);
export const router = import.meta.env.MODE === "test" ? createAppRouter() : undefined;
