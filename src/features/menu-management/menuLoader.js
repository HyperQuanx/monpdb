import { menuRepository } from "../../data/repositories/appRepositories";

export const createRequireActiveMenuItem =
  (repository, fixedSectionId) =>
  async ({ params }) =>
    repository.requireActiveItem(
      fixedSectionId ?? params.sectionId,
      params.menuItemId,
    );

export const requireActiveMenuItem = createRequireActiveMenuItem(menuRepository);
export const requireActiveCharacterMenuItem = createRequireActiveMenuItem(
  menuRepository,
  "characters",
);
export const requireActiveWorldMenuItem = createRequireActiveMenuItem(
  menuRepository,
  "world",
);
export const requireActivePlotMenuItem = createRequireActiveMenuItem(
  menuRepository,
  "plot",
);
export const requireActiveSettingMenuItem = createRequireActiveMenuItem(
  menuRepository,
  "setting",
);
export const requireActiveIdeaMenuItem = createRequireActiveMenuItem(
  menuRepository,
  "idea",
);
export const requireActiveMemoMenuItem = createRequireActiveMenuItem(
  menuRepository,
  "memo",
);
