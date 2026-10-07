export const dataMode = import.meta.env.VITE_DATA_MODE ?? "fixture";
if (!["fixture", "http"].includes(dataMode)) throw new Error("VITE_DATA_MODE must be fixture or http.");
export const isHttpMode = dataMode === "http";
export const CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
export const CACHE_BUSTER = "monp-api-v1-text-cache-1";
export const normalizeApiBase = (value) => {
  const base = String(value ?? "http://127.0.0.1:8181/api").replace(/\/+$/, "");
  return base.endsWith("/v1") ? base : `${base}/v1`;
};
export const apiBaseUrl = normalizeApiBase(import.meta.env.VITE_API_BASE_URL);
