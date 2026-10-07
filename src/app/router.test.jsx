import { describe, expect, it, vi } from "vitest";
import { matchRoutes } from "react-router-dom";
import RootLayout from "../layouts/RootLayout";
import WorkSelectionPage from "../features/works/pages/WorkSelectionPage";
import { createRequireActiveWork } from "../features/works/workLoader";
import { characterRegions } from "./menuSections";
import { router } from "./router";

const getMatches = (pathname) => matchRoutes(router.routes, pathname) ?? [];
const getLeafRoute = (pathname) => getMatches(pathname).at(-1)?.route;

describe("router", () => {
  it("renders selection outside the shell and management inside a global shell", () => {
    const selectionMatches = getMatches("/");
    const managementMatches = getMatches("/works/manage");

    expect(selectionMatches).toHaveLength(2);
    expect(selectionMatches[1].route.element.type).toBe(WorkSelectionPage);
    expect(
      selectionMatches.some(({ route }) => route.element?.type === RootLayout),
    ).toBe(false);
    expect(managementMatches.at(-1).route.path).toBe("works/manage");
    expect(
      managementMatches.some(({ route }) => route.element?.type === RootLayout),
    ).toBe(true);
  });

  it("matches work home, reserved navigation, and specialized World paths", () => {
    expect(getLeafRoute("/works/work-monp")?.index).toBe(true);
    expect(getLeafRoute("/works/work-monp/search")?.path).toBe("search");
    expect(getLeafRoute("/works/work-monp/recent")?.path).toBe("recent");

    const base = "/works/work-monp/world/world01";
    expect(getLeafRoute(base)?.index).toBe(true);
    expect(getLeafRoute(`${base}/new`)?.path).toBe("new");
    expect(getLeafRoute(`${base}/world-east-plains`)?.path).toBe(":worldId");
    expect(getLeafRoute(`${base}/world-east-plains/edit`)?.path).toBe(
      ":worldId/edit",
    );
    expect(
      getMatches(base).some(({ route }) => route.id === "world-menu"),
    ).toBe(true);
    expect(
      getMatches(base).some(({ route }) => route.id === "content-menu"),
    ).toBe(false);
  });

  it("matches specialized Plot paths before the generic content route", () => {
    const base = "/works/work-monp/plot/plot01";
    expect(getLeafRoute(base)?.index).toBe(true);
    expect(getLeafRoute(`${base}/new`)?.path).toBe("new");
    expect(getLeafRoute(`${base}/plot-chapter-one-opening`)?.path).toBe(":sceneId");
    expect(getLeafRoute(`${base}/plot-chapter-one-opening/edit`)?.path).toBe(
      ":sceneId/edit",
    );
    expect(
      getMatches(base).some(({ route }) => route.id === "plot-menu"),
    ).toBe(true);
    expect(
      getMatches(base).some(({ route }) => route.id === "content-menu"),
    ).toBe(false);
  });

  it("matches specialized Setting paths before the generic content route", () => {
    const base = "/works/work-monp/setting/setting01";
    expect(getLeafRoute(base)?.index).toBe(true);
    expect(getLeafRoute(`${base}/new`)?.path).toBe("new");
    expect(getLeafRoute(`${base}/setting-cheongun-sword`)?.path).toBe(":settingId");
    expect(getLeafRoute(`${base}/setting-cheongun-sword/edit`)?.path).toBe(
      ":settingId/edit",
    );
    expect(getMatches(base).some(({ route }) => route.id === "setting-menu")).toBe(true);
    expect(getMatches(base).some(({ route }) => route.id === "content-menu")).toBe(false);
  });

  it.each([
    ["idea", "idea02", "idea-dialogue-mist", ":ideaId", "idea-menu"],
    ["memo", "memo00", "memo-next-session", ":memoId", "memo-menu"],
  ])("matches specialized %s paths before the generic content route", (section, item, entry, param, id) => {
    const base = `/works/work-monp/${section}/${item}`;
    expect(getLeafRoute(base)?.index).toBe(true);
    expect(getLeafRoute(`${base}/new`)?.path).toBe("new");
    expect(getLeafRoute(`${base}/${entry}`)?.path).toBe(param);
    expect(getLeafRoute(`${base}/${entry}/edit`)?.path).toBe(`${param}/edit`);
    expect(getMatches(base).some(({ route }) => route.id === id)).toBe(true);
    expect(getMatches(base).some(({ route }) => route.id === "content-menu")).toBe(false);
  });

  it("keeps user-defined sections on the generic content route", () => {
    const base = "/works/work-monp/section-custom/item-custom";
    expect(getLeafRoute(base)?.index).toBe(true);
    expect(getLeafRoute(`${base}/new`)?.path).toBe("new");
    expect(getLeafRoute(`${base}/entry-1`)?.path).toBe(":entryId");
    expect(getLeafRoute(`${base}/entry-1/edit`)?.path).toBe(":entryId/edit");
    expect(getMatches(base).some(({ route }) => route.id === "content-menu")).toBe(true);
  });

  it.each(characterRegions)(
    "registers scoped list, create, detail, and legacy routes for $id",
    ({ id }) => {
      const base = `/works/work-monp/characters/${id}`;

      expect(getLeafRoute(base)?.index).toBe(true);
      expect(getLeafRoute(`${base}/new`)?.path).toBe("new");
      expect(getLeafRoute(`${base}/character-1`)?.path).toBe(":characterId");
      expect(getLeafRoute(`${base}/character-1/edit`)?.path).toBe(
        ":characterId/edit",
      );
      expect(
        getMatches(base).some(({ route }) => route.id === "character-menu"),
      ).toBe(true);
      expect(getLeafRoute(`/${id}`)?.path).toBe(id);
      expect(getLeafRoute(`/${id}/new`)?.path).toBe(`${id}/new`);
      expect(getLeafRoute(`/${id}/character-1`)?.path).toBe(
        `${id}/:characterId`,
      );
    },
  );

  it("validates active works without relying on selected query cache", async () => {
    const selectedWork = { id: "work-monp", title: "MONP" };
    const repository = { select: vi.fn().mockResolvedValue(selectedWork) };
    const loader = createRequireActiveWork(repository);

    await expect(loader({ params: { workId: "work-monp" } })).resolves.toBe(
      selectedWork,
    );
    expect(repository.select).toHaveBeenCalledWith("work-monp");
  });
});
