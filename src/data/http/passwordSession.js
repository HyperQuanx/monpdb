import { apiBaseUrl } from "./config";
const key = `monp-access:${apiBaseUrl}`;
const listeners = new Set();
let session;
try { session = JSON.parse(globalThis.sessionStorage?.getItem(key) ?? "null"); } catch { session = null; }
if (!session?.token || Date.parse(session.expiresAt) <= Date.now()) session = null;
export const getAccessToken = () => session?.token ?? "";
export const subscribeSession = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
export const setPasswordSession = (value) => {
  session = value;
  try {
    if (value) sessionStorage.setItem(key, JSON.stringify(value));
    else sessionStorage.removeItem(key);
  } catch { /* Private browsing may disable storage; keep the current session in memory. */ }
  listeners.forEach((fn) => fn());
};
export const accessHeaders = () => getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {};
export const loginWithPassword = async (password, fetchImpl = globalThis.fetch) => {
  const response = await fetchImpl(`${apiBaseUrl}/auth/login`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }), signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    const error = new Error(response.status === 429 ? "잠시 후 다시 시도해 주세요." : response.status === 401 ? "비밀번호가 일치하지 않습니다." : "접속하지 못했습니다. 다시 시도해 주세요.");
    error.status = response.status;
    throw error;
  }
  const result = await response.json();
  if (!result.token || !Number.isFinite(Date.parse(result.expiresAt))) throw new Error("접속 정보를 확인하지 못했습니다.");
  setPasswordSession(result);
};
export const logoutPasswordSession = async () => {
  try {
    await fetch(`${apiBaseUrl}/auth/logout`, { method: "POST", headers: accessHeaders(), signal: AbortSignal.timeout(5000) });
  } catch { /* Always clear local access, including during an outage. */ }
  setPasswordSession(null);
};
