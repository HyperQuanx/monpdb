import { test, expect } from "@playwright/test";
const API = "http://127.0.0.1:8181/api/v1";
test.beforeEach(async ({ request }) => {
  await expect.poll(async () => { try { return (await request.get("http://127.0.0.1:8181/healthz")).status(); } catch { return 0; } }, { timeout: 15_000 }).toBe(200);
});
test("persists a complete character journey and reads cached text offline", async ({ page, context, request }) => {
  const created = await request.post(`${API}/works`, { data: { title: "HTTP 여정", slug: `http-${Date.now()}` } });
  expect(created.status()).toBe(201);
  const work = await created.json();
  const worldResponse = await request.post(`${API}/works/${work.id}/entries/world`, { data: { title: "HTTP 동부평야", regionId: "world01" } });
  expect(worldResponse.status()).toBe(201);
  const root = `/works/${work.id}`;
  await page.goto(`${root}/characters/characters01/new`);
  await page.getByLabel("이름", { exact: true }).fill("HTTP 연화");
  await page.getByLabel("요약", { exact: true }).fill("DB에 저장하는 인물");
  await page.getByRole("combobox", { name: "관계 대상 선택" }).selectOption({ label: "HTTP 동부평야" });
  await page.getByRole("button", { name: "관계 추가" }).click();
  await page.getByRole("button", { name: "저장", exact: true }).click();
  await expect(page.getByRole("heading", { level: 2, name: "HTTP 연화" })).toBeVisible();
  const detail = new URL(page.url()).pathname;
  await page.reload();
  await expect(page.getByRole("region", { name: "나가는 관계" }).getByText("HTTP 동부평야")).toBeVisible();
  await page.getByRole("link", { name: "편집", exact: true }).click();
  await page.getByLabel("이름", { exact: true }).fill("HTTP 연화 수정");
  await page.getByRole("button", { name: "저장", exact: true }).click();
  await expect(page.getByRole("heading", { level: 2, name: "HTTP 연화 수정" })).toBeVisible();
  const id = detail.split("/").at(-1);
  expect((await (await request.get(`${API}/works/${work.id}/entries/character/${id}`)).json()).name).toBe("HTTP 연화 수정");
  await page.goto(`${root}/backup`);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "JSON으로 내보내기" }).click();
  const artifact = await download;
  const filePath = await artifact.path();
  await page.getByLabel("백업 파일 선택").setInputFiles(filePath);
  await expect(page.getByRole("table", { name: "가져오기 미리보기" })).toBeVisible();
  await page.getByRole("button", { name: "가져오기 실행" }).click();
  await expect(page.getByText(/가져오기를 완료/)).toBeVisible();
  await page.goto(detail);
  await expect(page.getByRole("heading", { level: 2, name: "HTTP 연화 수정" })).toBeVisible();
  await expect.poll(() => page.locator("html").getAttribute("data-routes-preloaded")).toBe("true");
  await context.setOffline(true);
  await expect(page.getByText(/오프라인 · 저장된 텍스트/)).toBeVisible();
  await page.getByRole("link", { name: "편집", exact: true }).click();
  await expect(page.getByText("편집은 온라인에서 가능합니다.")).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("heading", { level: 2, name: "HTTP 연화 수정" })).toBeVisible();
  await expect(page.getByRole("img", { name: /오프라인 이미지 표시 안 함/ })).toBeVisible();
  // IndexedDB persists across a page reload while the app shell stays online.
  await context.setOffline(false);
  await page.route("**/api/v1/**", (route) => route.abort());
  await page.reload();
  await expect(page.getByRole("heading", { level: 2, name: "HTTP 연화 수정" })).toBeVisible();
  await expect(page.getByText(/오프라인 · 저장된 텍스트/)).toBeVisible();
});

test("writes each specialized editor through HTTP", async ({ page, request }) => {
  const created = await request.post(`${API}/works`, { data: { title: "전문 화면 HTTP", slug: `editors-${Date.now()}` } });
  const work = await created.json();
  for (const [section, menu] of [["world", "world01"], ["plot", "plot01"], ["setting", "setting01"], ["idea", "idea02"], ["memo", "memo00"]]) {
    const title = `HTTP ${section} 자료`;
    await page.goto(`/works/${work.id}/${section}/${menu}/new`);
    await page.getByRole("textbox", { name: section === "setting" ? "이름" : /^제목/ }).fill(title);
    await page.getByRole("button", { name: "저장", exact: true }).click();
    await expect(page.getByRole("heading", { level: 2, name: title })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { level: 2, name: title })).toBeVisible();
  }
});
