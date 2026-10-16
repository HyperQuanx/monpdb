import { test, expect } from "@playwright/test";
import process from "node:process";
import { Buffer } from "node:buffer";
const API = process.env.MONP_HTTP_API_BASE ?? "http://127.0.0.1:18181/api/v1";
test("requires a password, opens after confirmation, and protects uploaded images", async ({ page, request }) => {
  expect((await request.get(`${API}/works`)).status()).toBe(401);
  expect((await request.get(`${API}/images/00000000-0000-0000-0000-000000000000`)).status()).toBe(401);
  await page.goto("/works/manage");
  await expect(page.getByRole("heading", { name: "비밀번호를 입력하세요" })).toBeVisible();
  await page.getByLabel("비밀번호").fill("wrong-access");
  await page.getByRole("button", { name: "접속", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveText("비밀번호가 일치하지 않습니다.");
  await page.getByLabel("비밀번호").fill(process.env.MONP_HTTP_TEST_PASSWORD ?? "runtime-test-access");
  await page.getByRole("button", { name: "접속", exact: true }).click();
  await expect(page.getByRole("button", { name: "접속 종료" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "접속 종료" })).toBeVisible();
  const session = await page.evaluate((api) => JSON.parse(sessionStorage.getItem(`monp-access:${api}`)), API);
  const headers = { Authorization: `Bearer ${session.token}` };
  const image = await request.post(`${API}/images`, { headers, multipart: {
    image: { name: "pixel.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64") },
  } });
  expect(image.status()).toBe(201);
  const uploaded = await image.json();
  const workResponse = await request.post(`${API}/works`, { headers, data: { title: "인증 이미지 검증", slug: `auth-image-${Date.now()}` } });
  expect(workResponse.status()).toBe(201);
  const work = await workResponse.json();
  const characterResponse = await request.post(`${API}/works/${work.id}/entries/character`, { headers, data: {
    name: "보호된 초상", regionId: "characters01", imageUrl: uploaded.imageUrl,
  } });
  expect(characterResponse.status()).toBe(201);
  const character = await characterResponse.json();
  await page.goto(`/works/${work.id}/characters/characters01/${character.id}`);
  const portrait = page.getByRole("img", { name: "보호된 초상 초상" });
  await expect(portrait).toHaveAttribute("src", /^blob:/);
  await expect.poll(() => portrait.evaluate((img) => img.naturalWidth)).toBe(1);
  await page.getByRole("button", { name: "접속 종료" }).click();
  await expect(page.getByRole("heading", { name: "비밀번호를 입력하세요" })).toBeVisible();
  expect((await request.get(`${API}/works`, { headers })).status()).toBe(401);
});
