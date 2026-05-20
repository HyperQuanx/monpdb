import { createBrowserRouter } from "react-router-dom";
import RootLayout from "../layouts/RootLayout";
import ErrorPage from "../pages/ErrorPage";
import HomePage from "../pages/HomePage";
import { characterRegions } from "./menuSections";
import CharacterCreatePage from "../features/characters/pages/CharacterCreatePage";
import CharacterDetailPage from "../features/characters/pages/CharacterDetailPage";
import CharacterListPage from "../features/characters/pages/CharacterListPage";

const characterRoutes = characterRegions.flatMap((region) => [
  {
    path: region.id,
    element: <CharacterListPage />,
  },
  {
    path: `${region.id}/new`,
    element: <CharacterCreatePage />,
  },
  {
    path: `${region.id}/:characterId`,
    element: <CharacterDetailPage />,
  },
]);

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    errorElement: <ErrorPage />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      ...characterRoutes,
    ],
  },
]);
