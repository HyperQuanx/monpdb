import { describe, expect, it } from "vitest";
import { lazyPage, preloadRouteModules, routeModules } from "./routeModules";
import { router } from "./router";

const collectLazyRoutes = (routes) =>
  routes.flatMap((route) => [
    ...(route.lazy ? [route] : []),
    ...collectLazyRoutes(route.children ?? []),
  ]);

describe("route code splitting", () => {
  it("resolves every lazy page module to a component", async () => {
    for (const name of Object.keys(routeModules)) {
      const { Component } = await lazyPage(name)();
      expect(typeof Component, name).toBe("function");
    }
  });

  it("lazy-loads every feature page while keeping loaders static", () => {
    const lazyRoutes = collectLazyRoutes(router.routes);
    expect(lazyRoutes.length).toBeGreaterThanOrEqual(23);
    expect(lazyRoutes.every(({ element }) => element === undefined)).toBe(true);
    const menuRoutes = router.routes[0].children
      .flatMap((route) => route.children ?? [])
      .filter(({ id }) => String(id).endsWith("-menu"));
    expect(menuRoutes.map(({ id }) => id).sort()).toEqual([
      "character-menu",
      "content-menu",
      "idea-menu",
      "memo-menu",
      "plot-menu",
      "setting-menu",
      "world-menu",
    ]);
    expect(menuRoutes.every(({ loader }) => typeof loader === "function")).toBe(true);
  });

  it("preloads every route module on an idle schedule", async () => {
    let scheduled;
    const done = preloadRouteModules({ schedule: (callback) => { scheduled = callback; } });
    expect(typeof scheduled).toBe("function");
    scheduled();
    const results = await done;
    expect(results).toHaveLength(Object.keys(routeModules).length);
    expect(results.every(({ status }) => status === "fulfilled")).toBe(true);
  });
});
