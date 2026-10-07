import { describe, expect, it } from "vitest";
import { appFixture } from "../../data/fixtures/appFixture";
import { createFixtureMenuRepository } from "../../data/repositories/fixtureMenuRepository";
import { createRequireActiveMenuItem } from "./menuLoader";

const createLoader = () => {
  const repository = createFixtureMenuRepository({
    menuSections: appFixture.menuSections,
    menuItems: appFixture.menuItems,
  });
  return { repository, loader: createRequireActiveMenuItem(repository) };
};

describe("active menu item loader", () => {
  it("returns an active section-item pair", async () => {
    const { loader } = createLoader();

    await expect(
      loader({
        params: { sectionId: "characters", menuItemId: "characters01" },
      }),
    ).resolves.toMatchObject({ id: "characters01" });
  });

  it("fixes specialized loaders to the World section", async () => {
    const { repository } = createLoader();
    const loader = createRequireActiveMenuItem(repository, "world");

    await expect(
      loader({ params: { menuItemId: "world01" } }),
    ).resolves.toMatchObject({ id: "world01", sectionId: "world" });
    await expect(
      loader({ params: { menuItemId: "characters01" } }),
    ).rejects.toThrow("Menu item does not belong to section world");
  });

  it("fixes specialized loaders to the Plot section", async () => {
    const { repository } = createLoader();
    const loader = createRequireActiveMenuItem(repository, "plot");

    await expect(
      loader({ params: { menuItemId: "plot02" } }),
    ).resolves.toMatchObject({ id: "plot02", sectionId: "plot" });
    await expect(
      loader({ params: { menuItemId: "world01" } }),
    ).rejects.toThrow("Menu item does not belong to section plot");
  });

  it("rejects archived items and children of archived sections", async () => {
    const itemCase = createLoader();
    await itemCase.repository.archiveItem("setting01");
    await expect(
      itemCase.loader({
        params: { sectionId: "setting", menuItemId: "setting01" },
      }),
    ).rejects.toThrow("Menu item is archived: setting01");

    const sectionCase = createLoader();
    await sectionCase.repository.archiveSection("setting");
    await expect(
      sectionCase.loader({
        params: { sectionId: "setting", menuItemId: "setting01" },
      }),
    ).rejects.toThrow("Menu section is archived: setting");
  });
});
