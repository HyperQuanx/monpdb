import { test as base, expect } from "@playwright/test";
import process from "node:process";
export const API = process.env.MONP_HTTP_API_BASE ?? "http://127.0.0.1:18181/api/v1";
const password = process.env.MONP_HTTP_TEST_PASSWORD ?? "runtime-test-access";
export const test = base.extend({
  passwordSession: async ({ playwright }, provide) => {
    const api = await playwright.request.newContext();
    const login = await api.post(`${API}/auth/login`, { data: { password } });
    expect(login.status()).toBe(200);
    await provide(await login.json()); await api.dispose();
  },
  request: async ({ playwright, passwordSession }, provide) => {
    const api = await playwright.request.newContext({ extraHTTPHeaders: { Authorization: `Bearer ${passwordSession.token}` } });
    await provide(api); await api.dispose();
  },
  prepareAccess: [async ({ context, passwordSession }, provide) => {
    await context.addInitScript(({ api, session }) => sessionStorage.setItem(`monp-access:${api}`, JSON.stringify(session)), { api: API, session: passwordSession });
    await provide();
  }, { auto: true }],
});
export { expect };
