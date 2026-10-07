import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { menuSections } from "../src/app/menuSections.js";

const W = "/works/work-monp";

// One representative URL per screen type (list, detail, editor, tools).
const pages = [
  ["작품 선택", "/"],
  ["작품 관리", "/works/manage"],
  ["메뉴 관리", "/menu/manage"],
  ["작품 홈", W],
  ["캐릭터 목록", `${W}/characters/characters00`],
  ["캐릭터 상세", `${W}/characters/characters01/character-yeonhwa`],
  ["캐릭터 편집", `${W}/characters/characters01/character-yeonhwa/edit`],
  ["세계관 목록", `${W}/world/world00`],
  ["세계관 상세", `${W}/world/world01/world-east-plains`],
  ["세계관 편집", `${W}/world/world01/world-east-plains/edit`],
  ["플롯 목록", `${W}/plot/plot00`],
  ["플롯 상세", `${W}/plot/plot01/plot-chapter-one-opening`],
  ["플롯 편집", `${W}/plot/plot01/plot-chapter-one-opening/edit`],
  ["설정 목록", `${W}/setting/setting00`],
  ["설정 상세", `${W}/setting/setting01/setting-cheongun-sword`],
  ["설정 편집", `${W}/setting/setting01/setting-cheongun-sword/edit`],
  ["아이디어 목록", `${W}/idea/idea02`],
  ["아이디어 상세", `${W}/idea/idea02/idea-dialogue-mist`],
  ["메모 목록", `${W}/memo/memo00`],
  ["메모 편집", `${W}/memo/memo00/memo-next-session/edit`],
  ["검색", `${W}/search?q=%EC%97%B0%ED%99%94`],
  ["최근 항목", `${W}/recent`],
  ["관계 탐색", `${W}/relations?focus=character%3Acharacter-yeonhwa`],
  ["관계 그래프", `${W}/relations?focus=character%3Acharacter-yeonhwa&view=graph`],
  ["보관함", `${W}/archive`],
  ["백업", `${W}/backup`],
  ["404", "/no-such-page"],
];

const waitForScreen = async (page) => {
  await page.locator("h1, h2").first().waitFor();
  // Wait for lazy data: no loading status left on screen.
  await expect(page.getByRole("status").filter({ hasText: /불러오는 중|준비하는 중/ })).toHaveCount(0);
};

const formatViolations = (violations) =>
  violations
    .map(({ id, impact, nodes, help }) => `${impact} ${id}: ${help}\n  ${nodes.slice(0, 3).map(({ target }) => target.join(" ")).join("\n  ")}`)
    .join("\n");

for (const viewport of [
  { height: 844, name: "mobile", width: 390 },
  { height: 900, name: "desktop", width: 1200 },
]) {
  test.describe(`accessibility (${viewport.name})`, () => {
    test.use({ viewport: { height: viewport.height, width: viewport.width } });

    for (const [name, url] of pages) {
      test(`${name} has no WCAG 2.1 A/AA violations`, async ({ page }) => {
        await page.goto(url);
        await waitForScreen(page);
        const { violations } = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
          .analyze();
        expect(violations, formatViolations(violations)).toEqual([]);
      });
    }
  });
}

test("every built-in menu opens on a 390px phone without overflow", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ height: 844, width: 390 });
  for (const section of menuSections) {
    for (const link of section.links) {
      await page.goto(`${W}/${section.id}/${link.id}`);
      await expect(
        page.getByRole("heading", { exact: true, level: 2, name: link.label }),
        `${section.label} · ${link.label}`,
      ).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow, `${section.label} · ${link.label} overflow`).toBeLessThanOrEqual(0);
      await expect(page.getByText("문제가 발생했습니다")).toHaveCount(0);
    }
  }
});

test("unknown URLs show a 404 page with a way back", async ({ page }) => {
  await page.goto("/works/work-monp/characters/characters01/missing/extra/segments");
  await expect(page.getByRole("heading", { name: "페이지를 찾을 수 없습니다" })).toBeVisible();
  await page.getByRole("link", { name: "작품 선택으로 돌아가기" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "작품을 선택하세요" })).toBeVisible();
});
