import { createTextCache } from "../cache/textCache";
import { apiBaseUrl } from "./config";
import { isOnline, markServerReachable } from "./connectivity";
export class ApiError extends Error {
  constructor(message, { status = 0, code = "network_error" } = {}) { super(message); this.name = "ApiError"; this.status = status; this.code = code; }
}
export const createApiClient = ({ baseUrl = apiBaseUrl, fetchImpl = globalThis.fetch, cache = createTextCache({ scope: baseUrl }), timeout = 10_000, online = isOnline, onReachable = markServerReachable } = {}) => {
  const tags = new Map();
  const request = async (path, { method = "GET", body, tagPath, tag, signal } = {}) => {
    const reading = method === "GET";
    if (!reading && !online()) throw new ApiError("오프라인에서는 수정할 수 없습니다.", { code: "offline_mutation" });
    const fromCache = async () => {
      const saved = await cache.get(path);
      if (!saved) throw new ApiError("저장된 텍스트가 없습니다. 온라인에서 먼저 열어 주세요.", { code: "offline_cache_miss" });
      if (saved.etag) tags.set(tagPath ?? path, saved.etag);
      return saved.data;
    };
    if (reading && !online()) return fromCache();
    const controller = new AbortController();
    const abort = () => controller.abort(signal.reason);
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) abort();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const multipart = typeof FormData !== "undefined" && body instanceof FormData;
      const response = await fetchImpl(`${baseUrl}${path}`, {
        method, signal: controller.signal,
        headers: { ...(!multipart && body !== undefined ? { "Content-Type": "application/json" } : {}), ...(tag ? { "If-Match": tag } : {}) },
        ...(body === undefined ? {} : { body: multipart ? body : JSON.stringify(body) }),
      });
      if (!response.ok) {
        const problem = await response.json().catch(() => ({}));
        if (reading && [502, 503, 504].includes(response.status)) { onReachable(false); return fromCache(); }
        throw new ApiError(problem.detail ?? `요청에 실패했습니다 (${response.status}).`, { status: response.status, code: problem.code });
      }
      onReachable(true);
      const data = await response.json();
      const etag = response.headers.get("ETag");
      if (etag) tags.set(tagPath ?? path, etag);
      if (reading) await cache.put(path, { data, etag });
      return data;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (signal?.aborted) throw new ApiError("요청이 취소되었습니다.", { code: "request_cancelled" });
      onReachable(false);
      if (reading) return fromCache();
      throw new ApiError("서버에 연결할 수 없습니다. 저장 여부를 확인한 뒤 다시 시도해 주세요.");
    } finally { clearTimeout(timer); signal?.removeEventListener("abort", abort); }
  };
  return {
    get: (path, options) => request(path, options),
    setTag: (path, version) => tags.set(path, `"${version}"`),
    getTag: (path) => tags.get(path),
    async write(path, { method = "POST", body, matchPath, tag } = {}) {
      if (!online()) throw new ApiError("오프라인에서는 수정할 수 없습니다.", { code: "offline_mutation" });
      if (matchPath && !tag && !tags.has(matchPath)) await request(matchPath);
      return request(path, { method, body, tag: tag ?? (matchPath ? tags.get(matchPath) : undefined), tagPath: matchPath });
    },
    async loadVersions() { const versions = await request("/versions"); Object.entries(versions).forEach(([path, version]) => tags.set(path, `"${version}"`)); return versions; },
    async probe() {
      if (globalThis.navigator?.onLine === false) return false;
      try {
        const response = await fetchImpl(`${baseUrl}/works`, { signal: AbortSignal.timeout(timeout) });
        onReachable(response.ok); return response.ok;
      } catch { onReachable(false); return false; }
    },
    cache,
  };
};
