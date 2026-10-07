import { describe, expect, it, vi } from "vitest";
import { createApiClient } from "./apiClient";
import { createTextCache } from "../cache/textCache";
import { appFixture } from "../fixtures/appFixture";
import { createHttpRepositories } from "../repositories/httpRepositories";
const response = (body, status = 200, etag) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...(etag ? { ETag: etag } : {}) } });
describe("HTTP and text cache", () => {
  it("uses the loaded ETag and surfaces a stale edit without retrying", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(response({ title: "old" }, 200, '"3"')).mockResolvedValueOnce(response({ code: "version_conflict", detail: "changed" }, 409));
    const client = createApiClient({ baseUrl: "https://api.test/v1", fetchImpl, online: () => true, onReachable: vi.fn() });
    await client.get("/works/id");
    await expect(client.write("/works/id", { method: "PATCH", body: { title: "edit" }, matchPath: "/works/id" })).rejects.toMatchObject({ status: 409, code: "version_conflict" });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(fetchImpl.mock.calls[1][1].headers["If-Match"]).toBe('"3"');
  });
  it("persists text, isolates works, expires it, and rejects offline writes", async () => {
    let online = true; let now = 100;
    const cache = createTextCache({ scope: "api", now: () => now, maxAge: 1000 });
    const fetchImpl = vi.fn().mockResolvedValue(response({ name: "연화", imageUrl: "data:image/png;base64,secret", cover: "https://image" }));
    const client = createApiClient({ fetchImpl, cache, online: () => online, onReachable: vi.fn() });
    await client.get("/works/a/entries/character/id"); online = false;
    expect(await client.get("/works/a/entries/character/id")).toEqual({ name: "연화", imageUrl: "", cover: "" });
    await expect(client.get("/works/b/entries/character/id")).rejects.toMatchObject({ code: "offline_cache_miss" });
    await expect(client.write("/works/a", { body: {} })).rejects.toMatchObject({ code: "offline_mutation" });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    now = 1101;
    await expect(client.get("/works/a/entries/character/id")).rejects.toMatchObject({ code: "offline_cache_miss" });
  });
  it("falls back during a transport outage and respects explicit cancellation", async () => {
    const cache = createTextCache({ scope: "outage" }); await cache.put("/works/id", { data: { title: "saved" }, etag: '"1"' });
    const client = createApiClient({ cache, online: () => true, onReachable: vi.fn(), fetchImpl: vi.fn().mockRejectedValue(new TypeError("offline")) });
    expect(await client.get("/works/id")).toEqual({ title: "saved" });
    const controller = new AbortController(); controller.abort();
    await expect(client.get("/works/id", { signal: controller.signal })).rejects.toMatchObject({ code: "request_cancelled" });
  });
  it("reads specialized contracts and Korean search from a work snapshot", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response(structuredClone(appFixture), 200, '"1"'));
    const api = createApiClient({ fetchImpl, online: () => true, onReachable: vi.fn() });
    const repositories = createHttpRepositories({ api });
    const characters = await repositories.characterRepository.list({ workId: "work-monp", regionId: "characters00" });
    expect(characters.length).toBeGreaterThan(0);
    const worlds = await repositories.worldRepository.list({ workId: "work-monp", regionId: "world00" });
    expect(worlds.length).toBeGreaterThan(0);
    const results = await repositories.explorationRepository.search("work-monp", { q: "ㅇㅎ" });
    expect(results.results.some((item) => item.label === "연화")).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
