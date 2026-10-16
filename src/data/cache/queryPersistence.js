import { dehydrate, hydrate } from "@tanstack/react-query";
import { createTextCache } from "./textCache";
import { apiBaseUrl, isHttpMode, CACHE_MAX_AGE } from "../http/config";
import { isOnline } from "../http/connectivity";
import { getAccessToken } from "../http/passwordSession";
export const startQueryPersistence = async (client) => {
  if (!isHttpMode) return;
  const cache = createTextCache({ scope: apiBaseUrl });
  const restored = getAccessToken() ? await cache.get("queries") : undefined;
  if (restored) hydrate(client, { ...restored, queries: restored.queries.filter((query) => Date.now() - query.state.dataUpdatedAt <= CACHE_MAX_AGE) });
  let timer;
  client.getQueryCache().subscribe(() => {
    clearTimeout(timer);
    if (!isOnline() || !getAccessToken()) return;
    timer = setTimeout(() => { if (!getAccessToken()) return; void cache.put("queries", dehydrate(client, {
      shouldDehydrateMutation: () => false,
      shouldDehydrateQuery: (query) => query.state.status === "success" && Date.now() - query.state.dataUpdatedAt <= CACHE_MAX_AGE,
    })); }, 200);
  });
};
