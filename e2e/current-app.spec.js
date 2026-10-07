import { expect, test } from "@playwright/test";

const MONP_ALL = "/works/work-monp/characters/characters00";
const MOON_ALL = "/works/work-moonlit-echoes/characters/characters00";

const getDurationInMilliseconds = (duration) => {
  if (duration.endsWith("ms")) {
    return Number.parseFloat(duration);
  }

  return Number.parseFloat(duration) * 1000;
};

test("selects a work before entering scoped character pages offline", async ({
  context,
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const apiRequests = [];
  page.on("request", (request) => {
    if (request.url().startsWith("https://qbix-portfolio.shop")) {
      apiRequests.push(request.url());
    }
  });

  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: "작품을 선택하세요" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /열기$/ })).toHaveCount(2);
  // Route chunks are code-split; wait until they are preloaded before
  // simulating offline navigation.
  await expect(page.locator("html")).toHaveAttribute("data-routes-preloaded", "true");

  await context.setOffline(true);
  await page.getByRole("button", { name: "MONP 열기" }).click();
  await expect(page).toHaveURL(/\/works\/work-monp$/);
  await expect(
    page.getByRole("heading", { level: 2, name: "MONP", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "작품 빠른 탐색" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "메뉴", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "MONP 메뉴" })).toBeVisible();
  await page.getByRole("button", { name: "캐릭터", exact: true }).click();

  const lastRegionLink = page.getByRole("link", {
    name: "캐릭터 · 귀곡성",
  });
  await lastRegionLink.scrollIntoViewIfNeeded();
  await expect(lastRegionLink).toBeVisible();

  await page
    .getByRole("link", { name: "캐릭터 · 동부평야지대" })
    .click();
  await expect(page).toHaveURL(
    /\/works\/work-monp\/characters\/characters01$/,
  );

  const characterLink = page.locator(
    'a[href="/works/work-monp/characters/characters01/character-yeonhwa"]',
  );
  await expect(characterLink).toContainText("연화");
  await characterLink.click();

  await expect(
    page.getByRole("heading", { level: 2, name: "연화", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "동부평야지대 목록으로" }).click();
  await page.getByRole("link", { name: "추가" }).click();
  await expect(page.getByLabel("이름", { exact: true })).toBeVisible();
  await expect(page).toHaveURL(
    /\/works\/work-monp\/characters\/characters01\/new$/,
  );

  expect(apiRequests).toEqual([]);
});

test("isolates characters by work and preserves a scoped deep link on reload", async ({
  page,
}) => {
  await page.goto(MONP_ALL);
  await expect(
    page.locator('a[href^="/works/work-monp/characters/characters00/character-"]'),
  ).toHaveCount(3);
  await expect(page.getByText("린", { exact: true })).not.toBeVisible();

  await page.goto(MOON_ALL);
  const moonCards = page.locator(
    'a[href^="/works/work-moonlit-echoes/characters/characters00/character-"]',
  );
  await expect(moonCards).toHaveCount(1);
  await expect(page.getByText("린", { exact: true })).toBeVisible();
  await expect(page.getByText("연화", { exact: true })).not.toBeVisible();

  await page.reload();
  await expect(page).toHaveURL(new RegExp(`${MOON_ALL}$`));
  await expect(page.getByText("린", { exact: true })).toBeVisible();
});

test("redirects legacy character URLs and guards unknown works", async ({ page }) => {
  await page.goto("/characters01");
  await expect(page).toHaveURL(
    /\/works\/work-monp\/characters\/characters01$/,
  );
  await expect(
    page.getByRole("heading", { level: 2, name: "동부평야지대" }),
  ).toBeVisible();

  await page.goto("/works/work-missing");
  await expect(
    page.getByRole("heading", { name: "작품을 찾을 수 없습니다" }),
  ).toBeVisible();
});

test("manages works separately and reflects them in selection", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/works/work-monp");
  await page.getByRole("button", { name: "메뉴", exact: true }).click();
  await page.getByRole("link", { name: "작품 관리" }).click();

  await expect(page).toHaveURL(/\/works\/manage$/);
  await page.getByLabel("작품명").fill("새 작품");
  await page.getByLabel("슬러그").fill("new-story");
  await page.getByLabel("장르").fill("판타지");
  await page.getByRole("button", { name: "작품 추가" }).click();
  await expect(
    page.getByRole("button", { name: "새 작품 보관" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "새 작품 보관" }).click();
  const archive = page.getByRole("region", { name: "보관된 작품" });
  await archive.getByRole("button", { name: "새 작품 복구" }).click();

  await page.getByRole("link", { name: "선택 화면" }).click();
  await expect(page.getByRole("button", { name: "새 작품 열기" })).toBeVisible();
});

test("applies menu changes globally while preserving stable URLs", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/works/work-monp");
  await page.getByRole("button", { name: "메뉴", exact: true }).click();
  await page.getByRole("link", { name: "메뉴 관리" }).click();
  await expect(page).toHaveURL(/\/menu\/manage$/);

  const plotRow = page.locator('[data-section-id="plot"]');
  const settingRow = page.locator('[data-section-id="setting"]');
  await settingRow.dragTo(plotRow);

  await page.getByRole("button", { name: "설정 섹션 선택" }).click();
  await page.getByRole("button", { name: "서버 메뉴 수정" }).click();
  await page.getByLabel("메뉴 이름", { exact: true }).fill("무기");
  await page.getByRole("button", { name: "메뉴 변경 저장" }).click();
  await page.getByRole("button", { name: "무기 아래로 이동" }).click();

  await page.getByRole("link", { name: "작품 선택" }).click();
  await page.getByRole("button", { name: "MONP 열기" }).click();
  await page.getByRole("button", { name: "메뉴", exact: true }).click();
  await page.getByRole("button", { name: "설정", exact: true }).click();
  const monpWeapon = page.getByRole("link", { name: "설정 · 무기" });
  await expect(monpWeapon).toHaveAttribute(
    "href",
    "/works/work-monp/setting/setting01",
  );

  await page.getByRole("link", { name: "작품 선택" }).click();
  await page.getByRole("button", { name: "월하의 잔향 열기" }).click();
  await page.getByRole("button", { name: "메뉴", exact: true }).click();
  await page.getByRole("button", { name: "설정", exact: true }).click();
  await expect(page.getByRole("link", { name: "설정 · 무기" })).toHaveAttribute(
    "href",
    "/works/work-moonlit-echoes/setting/setting01",
  );

  await page.getByRole("link", { name: "메뉴 관리" }).click();
  await page.getByRole("button", { name: "설정 섹션 선택" }).click();
  await page.getByRole("button", { name: "무기 메뉴 보관" }).click();
  const archivedMenus = page.getByRole("region", { name: "보관된 메뉴" });
  await expect(
    archivedMenus.getByRole("button", { name: "무기 메뉴 복구" }),
  ).toBeVisible();

  await page.getByRole("link", { name: "작품 선택" }).click();
  await page.getByRole("button", { name: "MONP 열기" }).click();
  await page.getByRole("button", { name: "메뉴", exact: true }).click();
  await page.getByRole("button", { name: "설정", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "설정 · 무기" }),
  ).not.toBeVisible();

  await page.getByRole("link", { name: "메뉴 관리" }).click();
  await page.getByRole("button", { name: "설정 섹션 선택" }).click();
  await page
    .getByRole("region", { name: "보관된 메뉴" })
    .getByRole("button", { name: "무기 메뉴 복구" })
    .click();
  await page.getByRole("link", { name: "작품 선택" }).click();
  await page.getByRole("button", { name: "MONP 열기" }).click();
  await page.getByRole("button", { name: "메뉴", exact: true }).click();
  await page.getByRole("button", { name: "설정", exact: true }).click();
  await expect(page.getByRole("link", { name: "설정 · 무기" })).toBeVisible();
});

test("creates formatted content with a relation and guards unsaved edits", async ({
  page,
}) => {
  // Every built-in section has a specialized screen, so the Task 7 generic
  // ContentEntry flow runs on a section created from menu management.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/works/work-monp");
  await page.getByRole("button", { name: "메뉴", exact: true }).click();
  await page.getByRole("link", { name: "메뉴 관리" }).click();
  await page.getByLabel("새 섹션 이름").fill("자료실");
  await page.getByRole("button", { name: "섹션 추가" }).click();
  await page.getByRole("button", { name: "자료실 섹션 선택" }).click();
  await expect(page.getByRole("combobox", { name: "메뉴 유형" })).toHaveValue("generic");
  await page.getByLabel("새 메뉴 이름").fill("참고 자료");
  await page.getByLabel("새 메뉴 슬러그").fill("references");
  await page.getByRole("button", { name: "메뉴 추가" }).click();
  await expect(page.getByRole("button", { name: "참고 자료 메뉴 수정" })).toBeVisible();
  await page.getByRole("link", { name: "작품 선택" }).click();
  await page.getByRole("button", { name: "MONP 열기" }).click();
  await page.getByRole("button", { name: "메뉴", exact: true }).click();
  await page.getByRole("button", { name: "자료실", exact: true }).click();
  await page.getByRole("link", { name: "자료실 · 참고 자료" }).click();
  await expect(
    page.getByRole("heading", { level: 2, name: "참고 자료" }),
  ).toBeVisible();
  const listPath = new URL(page.url()).pathname;
  // The empty list also renders a "첫 항목 추가" link.
  await page.getByRole("link", { name: "추가", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${listPath}/new$`));

  await page.getByRole("textbox", { name: /^제목/ }).fill("청운문의 비밀 통로");
  await page.getByRole("textbox", { name: "요약" }).fill("연화가 발견한 통로");
  await page.getByRole("textbox", { name: "태그" }).fill("장소, 비밀");
  await page.getByRole("textbox", { name: "상태" }).fill("published");

  const body = page.getByRole("textbox", { name: "본문" });
  await body.fill("청운문 지하에는 오래된 통로가 이어진다.");
  await body.press("Control+A");
  await page.getByRole("button", { name: "굵게" }).click();

  await page
    .getByRole("combobox", { name: "관계 대상 선택" })
    .selectOption({ label: "연화" });
  await page.getByRole("button", { name: "관계 추가" }).click();

  const editorMetrics = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    titleFontSize: Number.parseFloat(
      window.getComputedStyle(
        document.querySelector('form input[aria-invalid]'),
      ).fontSize,
    ),
  }));
  expect(editorMetrics.scrollWidth).toBeLessThanOrEqual(editorMetrics.innerWidth);
  expect(editorMetrics.titleFontSize).toBeGreaterThanOrEqual(16);
  const saveButtonBox = await page
    .getByRole("button", { name: "저장" })
    .boundingBox();
  expect(saveButtonBox.width).toBeGreaterThanOrEqual(44);
  expect(saveButtonBox.height).toBeGreaterThanOrEqual(44);

  await page.getByRole("button", { name: "저장" }).click();
  await expect(page).toHaveURL(new RegExp(`${listPath}/[^/]+$`));
  const detailUrl = page.url();
  await expect(
    page.getByRole("heading", { level: 2, name: "청운문의 비밀 통로" }),
  ).toBeVisible();
  await expect(
    page.locator("strong").filter({
      hasText: "청운문 지하에는 오래된 통로가 이어진다.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "연결된 관계" }).getByText("연화"),
  ).toBeVisible();

  await page.getByRole("link", { name: "편집" }).click();
  await page.getByRole("textbox", { name: "요약" }).fill("저장하지 않은 변경");
  await page.getByRole("link", { name: "취소" }).click();
  await expect(
    page.getByRole("dialog", { name: "변경사항을 버리시겠습니까?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "계속 편집" }).click();
  await expect(page).toHaveURL(/\/edit$/);
  await page.getByRole("link", { name: "취소" }).click();
  await page.getByRole("button", { name: "변경사항 버리기" }).click();
  await expect(page).toHaveURL(detailUrl);

  await page.getByRole("button", { name: "메뉴", exact: true }).click();
  await page.getByRole("link", { name: "작품 선택" }).click();
  await page.getByRole("button", { name: "월하의 잔향 열기" }).click();
  await page.getByRole("button", { name: "메뉴", exact: true }).click();
  await page.getByRole("button", { name: "자료실", exact: true }).click();
  await page.getByRole("link", { name: "자료실 · 참고 자료" }).click();
  await expect(
    page.getByRole("heading", {
      name: "표시할 참고 자료 항목이 없습니다.",
    }),
  ).toBeVisible();
  await expect(page.getByText("청운문의 비밀 통로")).not.toBeVisible();
});

test("completes the character create relation edit archive restore journey", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(MONP_ALL);
  await page.getByRole("link", { name: "추가" }).click();
  await expect(page).toHaveURL(
    /\/works\/work-monp\/characters\/characters00\/new$/,
  );

  await page.getByLabel("지역", { exact: true }).selectOption("characters02");
  await page.getByLabel("이름", { exact: true }).fill("하린");
  await page.getByLabel("한자 이름").fill("夏麟");
  await page.getByLabel("영문 이름").fill("Harin");
  await page.getByLabel("소속", { exact: true }).fill("청운문");
  await page.getByLabel("요약", { exact: true }).fill("비밀 통로를 지키는 문지기");
  await page.getByLabel("이미지 URL").fill("/missing-character-image.png");
  await page
    .getByRole("combobox", { name: "관계 대상 선택" })
    .selectOption({ label: "동부평야지대" });
  await page.getByRole("button", { name: "관계 추가" }).click();

  const editorMetrics = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    nameFontSize: Number.parseFloat(
      window.getComputedStyle(document.querySelector("input#name"))
        .fontSize,
    ),
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(editorMetrics.scrollWidth).toBeLessThanOrEqual(editorMetrics.innerWidth);
  expect(editorMetrics.nameFontSize).toBeGreaterThanOrEqual(16);
  const saveButtonBox = await page
    .getByRole("button", { name: "저장" })
    .boundingBox();
  expect(saveButtonBox.width).toBeGreaterThanOrEqual(44);
  expect(saveButtonBox.height).toBeGreaterThanOrEqual(44);

  await page.getByRole("button", { name: "저장" }).click();
  await expect(page).toHaveURL(
    /\/works\/work-monp\/characters\/characters02\/[^/]+$/,
  );
  const characterId = new URL(page.url()).pathname.split("/").at(-1);
  await expect(
    page.getByRole("heading", { level: 2, name: "하린" }),
  ).toBeVisible();
  await expect(
    page.getByText("초상 이미지를 불러오지 못해 기본 이미지를 표시합니다."),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "나가는 관계" }).getByText("동부평야지대"),
  ).toBeVisible();

  await page.getByRole("link", { name: "편집" }).click();
  await page.getByLabel("지역", { exact: true }).selectOption("characters06");
  await page.getByLabel("이름", { exact: true }).fill("하린 그림자");
  await page.getByLabel("종족", { exact: true }).selectOption("마물");
  await page.getByLabel("마물 구분").fill("수호령");
  await page.getByRole("button", { name: "저장" }).click();
  await expect(page).toHaveURL(
    new RegExp(
      `/works/work-monp/characters/characters06/${characterId}$`,
    ),
  );
  await expect(
    page.getByRole("heading", { level: 2, name: "하린 그림자" }),
  ).toBeVisible();
  await expect(page.getByText("수호령", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "보관" }).click();
  await expect(page.getByText("보관된 캐릭터입니다.")).toBeVisible();
  await expect(
    page.getByRole("region", { name: "나가는 관계" }).getByText("동부평야지대"),
  ).toBeVisible();
  await page.getByRole("link", { name: "암수굴 목록으로" }).click();
  // Wait for the list route before asserting the archived card is hidden;
  // a text query during the transition can still match the detail page.
  await expect(page).toHaveURL(/\/works\/work-monp\/characters\/characters06$/);
  await expect(
    page.locator(
      `a[href="/works/work-monp/characters/characters06/${characterId}"]`,
    ),
  ).toHaveCount(0);

  await page
    .getByRole("combobox", { name: "보관 상태 필터" })
    .selectOption("archived");
  await page.getByRole("button", { name: "하린 그림자 복원" }).click();
  await page
    .getByRole("combobox", { name: "보관 상태 필터" })
    .selectOption("active");
  const restoredCharacter = page.locator(
    `a[href="/works/work-monp/characters/characters06/${characterId}"]`,
  );
  await expect(restoredCharacter).toContainText("하린 그림자");
  await restoredCharacter.click();
  await expect(
    page.getByRole("region", { name: "나가는 관계" }).getByText("동부평야지대"),
  ).toBeVisible();

  await page.getByRole("button", { name: "메뉴", exact: true }).click();
  await page.getByRole("link", { name: "작품 선택" }).click();
  await page.getByRole("button", { name: "월하의 잔향 열기" }).click();
  await page.getByRole("button", { name: "메뉴", exact: true }).click();
  await page.getByRole("button", { name: "캐릭터", exact: true }).click();
  await page.getByRole("link", { name: "캐릭터 · 전체" }).click();
  await expect(page.getByText("린", { exact: true })).toBeVisible();
  await expect(page.getByText("하린 그림자")).not.toBeVisible();
});

test("completes the world create relation edit reverse archive restore journey", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/works/work-monp/world/world00");
  await expect(
    page.getByRole("heading", { level: 2, name: "전체", exact: true }),
  ).toBeVisible();
  await expect(
    page.locator('a[href="/works/work-monp/world/world00/world-east-plains"]'),
  ).toContainText("동부평야지대");

  const listMetrics = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    searchFontSize: Number.parseFloat(
      window.getComputedStyle(
        document.querySelector('input[aria-label="세계관 검색"]'),
      ).fontSize,
    ),
  }));
  expect(listMetrics.scrollWidth).toBeLessThanOrEqual(listMetrics.innerWidth);
  expect(listMetrics.searchFontSize).toBeGreaterThanOrEqual(16);

  await page.getByRole("link", { name: "추가" }).click();
  await expect(page).toHaveURL(/\/works\/work-monp\/world\/world00\/new$/);

  await page.getByLabel(/^지역/).selectOption("world01");
  // The wrapping <label> text includes option text, so query the combobox role.
  await page.getByRole("combobox", { name: "분류", exact: true }).selectOption("rule");
  await page.getByRole("textbox", { name: /^제목/ }).fill("청운문 결계");
  await page.getByRole("textbox", { name: "요약" }).fill("청운문을 둘러싼 오래된 결계");
  await page.getByRole("textbox", { name: "시대", exact: true }).fill("천무력 400년");
  await page.getByRole("textbox", { name: "규칙" }).fill("문파 제자만 결계를 통과한다.");
  await page.getByRole("textbox", { name: "세력" }).fill("청운문");
  await page.getByRole("textbox", { name: "장소" }).fill("청운문 산문");
  await page
    .getByRole("textbox", { name: "본문" })
    .fill("결계는 보름마다 약해진다.");

  const candidate = page.getByRole("combobox", { name: "관계 대상 선택" });
  await candidate.selectOption({ label: "연화" });
  await page.getByRole("button", { name: "관계 추가" }).click();
  await candidate.selectOption({ label: "첫 장의 시작" });
  await page.getByRole("button", { name: "관계 추가" }).click();

  const editorMetrics = await page.evaluate(() => {
    const title = [...document.querySelectorAll("form input")].find(
      (input) => input.hasAttribute("aria-invalid"),
    );
    return {
      innerWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      selectFontSize: Number.parseFloat(
        window.getComputedStyle(document.querySelector("form select")).fontSize,
      ),
      titleFontSize: Number.parseFloat(window.getComputedStyle(title).fontSize),
    };
  });
  expect(editorMetrics.scrollWidth).toBeLessThanOrEqual(editorMetrics.innerWidth);
  expect(editorMetrics.titleFontSize).toBeGreaterThanOrEqual(16);
  expect(editorMetrics.selectFontSize).toBeGreaterThanOrEqual(16);
  const saveButton = page.getByRole("button", { name: "저장" });
  const saveButtonBox = await saveButton.boundingBox();
  expect(saveButtonBox.width).toBeGreaterThanOrEqual(44);
  expect(saveButtonBox.height).toBeGreaterThanOrEqual(44);
  // The sticky save area stays inside the viewport while editing.
  expect(saveButtonBox.y + saveButtonBox.height).toBeLessThanOrEqual(844);

  await saveButton.click();
  await expect(page).toHaveURL(/\/works\/work-monp\/world\/world01\/[^/]+$/);
  const detailPath = new URL(page.url()).pathname;
  await expect(
    page.getByRole("heading", { level: 2, name: "청운문 결계" }),
  ).toBeVisible();
  await expect(page.getByText("결계는 보름마다 약해진다.")).toBeVisible();
  const outgoing = page.getByRole("region", { name: "나가는 관계" });
  await expect(outgoing.getByRole("link", { name: "연화" })).toBeVisible();
  await expect(outgoing.getByRole("link", { name: "첫 장의 시작" })).toBeVisible();

  await page.getByRole("link", { name: "편집" }).click();
  await expect(page).toHaveURL(new RegExp(`${detailPath}/edit$`));
  await page.getByRole("textbox", { name: "요약" }).fill("보름마다 약해지는 결계");
  await page.getByRole("button", { name: "저장" }).click();
  await expect(page).toHaveURL(new RegExp(`${detailPath}$`));
  await expect(page.getByText("보름마다 약해지는 결계").first()).toBeVisible();

  await outgoing.getByRole("link", { name: "연화" }).click();
  await expect(page).toHaveURL(
    /\/works\/work-monp\/characters\/characters01\/character-yeonhwa$/,
  );
  await expect(
    page.getByRole("region", { name: "들어오는 관계" }).getByText("청운문 결계"),
  ).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(new RegExp(`${detailPath}$`));

  await page.getByRole("button", { name: "보관" }).click();
  await expect(page.getByText("보관된 세계관입니다. 연결된 관계는 유지됩니다.")).toBeVisible();
  await expect(outgoing.getByRole("link", { name: "연화" })).toBeVisible();
  await expect(outgoing.getByRole("link", { name: "첫 장의 시작" })).toBeVisible();

  await page.getByRole("link", { name: "동부평야지대 목록" }).click();
  await expect(page).toHaveURL(/\/works\/work-monp\/world\/world01$/);
  const createdCard = page.locator(`a[href="${detailPath}"]`);
  await expect(createdCard).toHaveCount(0);
  await page
    .getByRole("combobox", { name: "세계관 보관 상태 필터" })
    .selectOption("archived");
  await expect(page).toHaveURL(/archive=archived/);
  await page.getByRole("button", { name: "청운문 결계 복원" }).click();
  await page
    .getByRole("combobox", { name: "세계관 보관 상태 필터" })
    .selectOption("active");
  await expect(createdCard).toContainText("청운문 결계");
  await createdCard.click();
  await expect(page).toHaveURL(new RegExp(`${detailPath}$`));
  await expect(outgoing.getByRole("link", { name: "연화" })).toBeVisible();
  await expect(outgoing.getByRole("link", { name: "첫 장의 시작" })).toBeVisible();

  await page.getByRole("button", { name: "메뉴", exact: true }).click();
  await page.getByRole("link", { name: "작품 선택" }).click();
  await page.getByRole("button", { name: "월하의 잔향 열기" }).click();
  await page.getByRole("button", { name: "메뉴", exact: true }).click();
  await page.getByRole("button", { name: "세계관", exact: true }).click();
  await page.getByRole("link", { name: "세계관 · 전체" }).click();
  await expect(page).toHaveURL(/\/works\/work-moonlit-echoes\/world\/world00$/);
  await expect(
    page.getByRole("heading", { name: "등록된 세계관이 없습니다." }),
  ).toBeVisible();
  await expect(page.getByText("청운문 결계")).not.toBeVisible();
});

test("writes, reorders, pays off, moves, archives, and restores plot scenes", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/works/work-monp/plot/plot01");
  await expect(
    page.getByRole("heading", { level: 2, name: "Chapter1", exact: true }),
  ).toBeVisible();
  const openingPath = "/works/work-monp/plot/plot01/plot-chapter-one-opening";
  await expect(page.locator(`a[href="${openingPath}"]`)).toContainText(
    "미회수 복선 1",
  );
  const listMetrics = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    searchFontSize: Number.parseFloat(
      window.getComputedStyle(
        document.querySelector('input[aria-label="장면 검색"]'),
      ).fontSize,
    ),
  }));
  expect(listMetrics.scrollWidth).toBeLessThanOrEqual(listMetrics.innerWidth);
  expect(listMetrics.searchFontSize).toBeGreaterThanOrEqual(16);

  // Create a scene with every Plot field.
  await page.getByRole("link", { name: "추가", exact: true }).click();
  await expect(page).toHaveURL(/\/works\/work-monp\/plot\/plot01\/new$/);
  await page.getByRole("textbox", { name: /^제목/ }).fill("상단 행렬의 정지");
  await page.getByRole("textbox", { name: "요약" }).fill("안개 때문에 상단이 멈춘다");
  await page.getByRole("combobox", { name: "상태", exact: true }).selectOption("draft");
  await page.getByRole("combobox", { name: "POV" }).selectOption({ label: "연화" });
  await page.getByRole("textbox", { name: "시간", exact: true }).fill("같은 날 아침");
  await page
    .getByRole("combobox", { name: "장소", exact: true })
    .selectOption({ label: "동부평야지대" });
  await page.getByRole("textbox", { name: "장소 상세" }).fill("교역로 중간 역참");
  const cast = page.getByRole("group", { name: "등장 인물" });
  await cast.getByRole("checkbox", { name: "연화" }).check();
  await cast.getByRole("checkbox", { name: "무영" }).check();
  await page.getByRole("textbox", { name: "사건" }).fill("상단주가 붉은 인장을 숨긴다.");
  await page.getByRole("button", { name: "복선 추가" }).click();
  await page.getByRole("textbox", { name: "복선 1 내용" }).fill("상단주의 붉은 인장");
  await page
    .getByRole("combobox", { name: "관계 대상 선택" })
    .selectOption({ label: "안개 속의 첫 대사" });
  await page.getByRole("button", { name: "관계 추가" }).click();

  const editorMetrics = await page.evaluate(() => {
    const title = [...document.querySelectorAll("form input")].find((input) =>
      input.hasAttribute("aria-invalid"),
    );
    const selects = [...document.querySelectorAll("form select")];
    return {
      innerWidth: window.innerWidth,
      minSelectFontSize: Math.min(
        ...selects.map((select) =>
          Number.parseFloat(window.getComputedStyle(select).fontSize),
        ),
      ),
      scrollWidth: document.documentElement.scrollWidth,
      titleFontSize: Number.parseFloat(window.getComputedStyle(title).fontSize),
    };
  });
  expect(editorMetrics.scrollWidth).toBeLessThanOrEqual(editorMetrics.innerWidth);
  expect(editorMetrics.titleFontSize).toBeGreaterThanOrEqual(16);
  expect(editorMetrics.minSelectFontSize).toBeGreaterThanOrEqual(16);
  const castBox = await cast.locator("label").first().boundingBox();
  expect(castBox.height).toBeGreaterThanOrEqual(44);
  const saveButton = page.getByRole("button", { name: "저장" });
  const saveBox = await saveButton.boundingBox();
  expect(saveBox.height).toBeGreaterThanOrEqual(44);
  expect(saveBox.y + saveBox.height).toBeLessThanOrEqual(844);

  await saveButton.click();
  await expect(page).toHaveURL(/\/works\/work-monp\/plot\/plot01\/[^/]+$/);
  const sceneId = new URL(page.url()).pathname.split("/").at(-1);
  await expect(
    page.getByRole("heading", { level: 2, name: "상단 행렬의 정지" }),
  ).toBeVisible();
  await expect(page.getByText("Chapter1 · 장면 2")).toBeVisible();
  await expect(
    page.getByRole("list", { name: "등장 인물" }).getByRole("link", { name: "무영" }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "나가는 관계" }).getByRole("link", { name: "안개 속의 첫 대사" }),
  ).toBeVisible();

  // Reorder within the chapter.
  await page.getByRole("link", { name: "Chapter1 목록" }).click();
  await page.getByRole("button", { name: "상단 행렬의 정지 위로 이동" }).click();
  await expect(page.locator("ol > li").first()).toContainText("상단 행렬의 정지");
  await expect(page.locator("ol > li").nth(1)).toContainText("첫 장의 시작");

  // Pay off the seed clue in the new scene.
  await page.locator(`a[href="${openingPath}"]`).click();
  await page.getByRole("link", { name: "편집" }).click();
  await page
    .getByRole("combobox", { name: "복선 1 회수 장면" })
    .selectOption({ label: "상단 행렬의 정지" });
  await page.getByRole("button", { name: "저장" }).click();
  await expect(page).toHaveURL(new RegExp(`${openingPath}$`));
  const openingClues = page.getByRole("region", { name: /^복선/ });
  await expect(openingClues.getByText("회수됨", { exact: true })).toBeVisible();
  await openingClues.getByRole("link", { name: "상단 행렬의 정지" }).click();
  await expect(
    page.getByRole("region", { name: "이 장면에서 회수되는 복선" }),
  ).toContainText("안개 속에서 들린 방울 소리");

  // Move the scene to another chapter.
  await page.getByRole("combobox", { name: "이동할 챕터" }).selectOption({ label: "Chapter2" });
  await page.getByRole("button", { name: "챕터 이동" }).click();
  await expect(page).toHaveURL(
    new RegExp(`/works/work-monp/plot/plot02/${sceneId}$`),
  );
  await expect(page.getByText("Chapter2 · 장면 1")).toBeVisible();

  // Unresolved clue filter across chapters. Navigate in-app because a full
  // reload resets the session fixture.
  await page.getByRole("button", { name: "메뉴", exact: true }).click();
  await page.getByRole("button", { name: "플롯", exact: true }).click();
  await page.getByRole("link", { name: "플롯 · 전체" }).click();
  await expect(page).toHaveURL(/\/works\/work-monp\/plot\/plot00$/);
  const allOpening = page.locator(
    'a[href="/works/work-monp/plot/plot00/plot-chapter-one-opening"]',
  );
  const allScene = page.locator(`a[href="/works/work-monp/plot/plot00/${sceneId}"]`);
  await expect(
    page.getByRole("heading", { level: 3, name: "Chapter2" }),
  ).toBeVisible();
  await page.getByRole("checkbox", { name: "미회수 복선만" }).check();
  await expect(page).toHaveURL(/clues=unresolved/);
  await expect(allScene).toContainText("미회수 복선 1");
  await expect(allOpening).toHaveCount(0);

  // Archiving the payoff scene makes the paid-off clue unresolved again.
  await allScene.click();
  await page.getByRole("button", { name: "보관" }).click();
  await expect(
    page.getByText("보관된 장면입니다. 연결된 관계와 복선은 유지됩니다."),
  ).toBeVisible();
  await page.getByRole("link", { name: "전체 목록" }).click();
  await page.getByRole("checkbox", { name: "미회수 복선만" }).uncheck();
  await allOpening.click();
  await expect(
    page.getByText("회수 장면이 보관되어 미회수로 봅니다."),
  ).toBeVisible();

  await page.getByRole("link", { name: "전체 목록" }).click();
  await page
    .getByRole("combobox", { name: "장면 보관 상태 필터" })
    .selectOption("archived");
  await page.getByRole("button", { name: "상단 행렬의 정지 복원" }).click();
  await page
    .getByRole("combobox", { name: "장면 보관 상태 필터" })
    .selectOption("active");
  await expect(allScene).toContainText("상단 행렬의 정지");
  await allOpening.click();
  await expect(
    page.getByRole("region", { name: /^복선/ }).getByText("회수됨", { exact: true }),
  ).toBeVisible();

  // Work isolation.
  await page.getByRole("button", { name: "메뉴", exact: true }).click();
  await page.getByRole("link", { name: "작품 선택" }).click();
  await page.getByRole("button", { name: "월하의 잔향 열기" }).click();
  await page.getByRole("button", { name: "메뉴", exact: true }).click();
  await page.getByRole("button", { name: "플롯", exact: true }).click();
  await page.getByRole("link", { name: "플롯 · 전체" }).click();
  await expect(
    page.getByRole("heading", { name: "등록된 장면이 없습니다." }),
  ).toBeVisible();
  await expect(page.getByText("상단 행렬의 정지")).not.toBeVisible();
});

test("reshapes setting categories into weapon and ability with their own fields and owners", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/works/work-monp");
  await page.getByRole("button", { name: "메뉴", exact: true }).click();
  await page.getByRole("link", { name: "메뉴 관리" }).click();
  await expect(page).toHaveURL(/\/menu\/manage$/);

  // Rename meaningless seed labels and give each category its own field set.
  await page.getByRole("button", { name: "설정 섹션 선택" }).click();
  await expect(page.getByText("메뉴 유형: 설정 자료 (섹션 기본)")).toBeVisible();
  await page.getByRole("button", { name: "서버 메뉴 수정" }).click();
  await page.getByLabel("메뉴 이름", { exact: true }).fill("무기");
  await page.getByRole("checkbox", { name: "이 메뉴에 표시할 필드: 발동 조건" }).uncheck();
  await page.getByRole("button", { name: "메뉴 변경 저장" }).click();
  await expect(page.getByRole("button", { name: "무기 메뉴 수정" })).toBeVisible();
  await page.getByRole("button", { name: "서버 통합 메뉴 수정" }).click();
  await page.getByLabel("메뉴 이름", { exact: true }).fill("능력");
  await page.getByRole("button", { name: "메뉴 변경 저장" }).click();
  await expect(page.getByRole("button", { name: "능력 메뉴 수정" })).toBeVisible();

  // Add a new category without an owner field.
  await page.getByLabel("새 메뉴 이름").fill("공통 무공");
  await page.getByLabel("새 메뉴 슬러그").fill("common-arts");
  await page.getByRole("checkbox", { name: "새 메뉴에 표시할 필드: 사용자" }).uncheck();
  await page.getByRole("button", { name: "메뉴 추가" }).click();
  await expect(page.getByRole("button", { name: "공통 무공 메뉴 수정" })).toBeVisible();

  await page.getByRole("link", { name: "작품 선택" }).click();
  await page.getByRole("button", { name: "MONP 열기" }).click();
  await page.getByRole("button", { name: "메뉴", exact: true }).click();
  await page.getByRole("button", { name: "설정", exact: true }).click();
  await expect(page.getByRole("link", { name: "설정 · 공통 무공" })).toBeVisible();
  await page.getByRole("link", { name: "설정 · 무기" }).click();
  await expect(page).toHaveURL(/\/works\/work-monp\/setting\/setting01$/);
  await expect(
    page.getByRole("heading", { level: 2, name: "무기", exact: true }),
  ).toBeVisible();
  await expect(
    page.locator('a[href="/works/work-monp/setting/setting01/setting-cheongun-sword"]'),
  ).toContainText("연화");

  // Weapon hides the condition field; ability shows it.
  await page.getByRole("link", { name: "추가", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "효과" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "발동 조건" })).toHaveCount(0);
  await page.getByRole("combobox", { name: /^분류/ }).selectOption({ label: "능력" });
  await expect(page.getByRole("textbox", { name: "발동 조건" })).toBeVisible();

  await page.getByRole("textbox", { name: /^이름/ }).fill("천리안");
  await page.getByRole("textbox", { name: "등급", exact: true }).fill("특급");
  await page.getByRole("textbox", { name: "효과" }).fill("먼 곳의 기척을 읽는다.");
  await page.getByRole("textbox", { name: "발동 조건" }).fill("눈을 감고 호흡을 고른다.");
  await page.getByRole("group", { name: "사용자" }).getByRole("checkbox", { name: "무영" }).check();
  await page.getByRole("button", { name: "속성 추가" }).click();
  await page.getByRole("textbox", { name: "속성 1 이름" }).fill("사거리");
  await page.getByRole("textbox", { name: "속성 1 값" }).fill("십 리");

  const editorMetrics = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    minControlFontSize: Math.min(
      ...[...document.querySelectorAll("form input:not([type=checkbox]), form select, form textarea")].map(
        (element) => Number.parseFloat(window.getComputedStyle(element).fontSize),
      ),
    ),
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(editorMetrics.scrollWidth).toBeLessThanOrEqual(editorMetrics.innerWidth);
  expect(editorMetrics.minControlFontSize).toBeGreaterThanOrEqual(16);
  const saveButton = page.getByRole("button", { name: "저장" });
  const saveBox = await saveButton.boundingBox();
  expect(saveBox.height).toBeGreaterThanOrEqual(44);
  expect(saveBox.y + saveBox.height).toBeLessThanOrEqual(844);

  await saveButton.click();
  await expect(page).toHaveURL(/\/works\/work-monp\/setting\/setting02\/[^/]+$/);
  await expect(page.getByRole("heading", { level: 2, name: "천리안" })).toBeVisible();
  await expect(page.getByRole("region", { name: "발동 조건" })).toContainText(
    "눈을 감고 호흡을 고른다.",
  );
  await expect(page.getByRole("region", { name: "추가 속성" })).toContainText("십 리");

  // The owner relation shows on the character as an incoming relation.
  await page.getByRole("list", { name: "사용자" }).getByRole("link", { name: "무영" }).click();
  await expect(page).toHaveURL(/\/characters\/characters06\/character-muyeong$/);
  await expect(
    page.getByRole("region", { name: "들어오는 관계" }).getByText("천리안"),
  ).toBeVisible();

  // The newly added category stores entries with its own field set.
  await page.getByRole("button", { name: "메뉴", exact: true }).click();
  await page.getByRole("button", { name: "설정", exact: true }).click();
  await page.getByRole("link", { name: "설정 · 공통 무공" }).click();
  await expect(
    page.getByRole("heading", { name: "등록된 설정 자료가 없습니다." }),
  ).toBeVisible();
  await page.getByRole("link", { name: "추가", exact: true }).click();
  await expect(page.getByRole("group", { name: "사용자" })).toHaveCount(0);
  await page.getByRole("textbox", { name: /^이름/ }).fill("기초 토납법");
  await page.getByRole("button", { name: "저장" }).click();
  await expect(page.getByRole("heading", { level: 2, name: "기초 토납법" })).toBeVisible();
  await expect(page.getByText("공통 무공").first()).toBeVisible();
});

test("captures ideas, converts a dialogue idea into a plot scene, and manages memos", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/works/work-monp");
  await page.getByRole("button", { name: "메뉴", exact: true }).click();
  await page.getByRole("button", { name: "아이디어", exact: true }).click();
  await page.getByRole("link", { name: "아이디어 · 대사" }).click();
  await expect(page).toHaveURL(/\/works\/work-monp\/idea\/idea02$/);
  await expect(page.getByRole("heading", { level: 2, name: "대사", exact: true })).toBeVisible();

  // Quick capture.
  const quickInput = page.getByRole("textbox", { name: "빠른 추가할 아이디어" });
  await quickInput.fill("검은 방울의 속삭임");
  await page.getByRole("button", { name: "빠른 추가" }).click();
  await expect(page.getByRole("link", { name: /검은 방울의 속삭임/ })).toContainText("씨앗");
  await expect(quickInput).toHaveValue("");
  const quickMetrics = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    inputFontSize: Number.parseFloat(
      window.getComputedStyle(document.querySelector('input[aria-label="빠른 추가할 아이디어"]')).fontSize,
    ),
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(quickMetrics.scrollWidth).toBeLessThanOrEqual(quickMetrics.innerWidth);
  expect(quickMetrics.inputFontSize).toBeGreaterThanOrEqual(16);
  expect((await page.getByRole("button", { name: "빠른 추가" }).boundingBox()).height).toBeGreaterThanOrEqual(44);

  // Develop, then convert the dialogue idea into a Chapter2 plot scene.
  await page.getByRole("link", { name: /안개 속의 첫 대사/ }).click();
  await expect(page).toHaveURL(/\/idea\/idea02\/idea-dialogue-mist$/);
  await page.getByRole("button", { name: "검토 완료로 표시" }).click();
  await expect(page.getByRole("button", { name: "발전 시작" })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "변환 대상" })).toHaveValue("plot");
  await page.getByRole("combobox", { name: "대상 분류" }).selectOption({ label: "Chapter2" });
  await page.getByRole("button", { name: "변환", exact: true }).click();

  await expect(page).toHaveURL(/\/works\/work-monp\/plot\/plot02\/[^/]+$/);
  const scenePath = new URL(page.url()).pathname;
  await expect(page.getByRole("heading", { level: 2, name: "안개 속의 첫 대사" })).toBeVisible();
  await expect(page.getByText("평온하던 교역로에 검은 안개가 번진다.")).toBeVisible();
  const origin = page.getByRole("region", { name: "나가는 관계" });
  await expect(origin).toContainText("원본 아이디어");
  await origin.getByRole("link", { name: "안개 속의 첫 대사" }).click();
  await expect(page).toHaveURL(/\/idea\/idea02\/idea-dialogue-mist$/);
  await expect(
    page.getByRole("region", { name: "채택 결과" }).getByRole("link", { name: "안개 속의 첫 대사" }),
  ).toHaveAttribute("href", scenePath);
  await expect(page.getByRole("region", { name: "다른 항목으로 변환" })).toHaveCount(0);

  // Memos: quick add, checklist, pin order.
  await page.getByRole("button", { name: "메뉴", exact: true }).click();
  await page.getByRole("button", { name: "메모", exact: true }).click();
  await page.getByRole("link", { name: "메모 · 전체" }).click();
  await expect(page).toHaveURL(/\/works\/work-monp\/memo\/memo00$/);
  await page.getByRole("textbox", { name: "빠른 추가할 메모" }).fill("퇴고 순서 정리");
  await page.getByRole("button", { name: "빠른 추가" }).click();
  const memoTitles = page.locator("article").locator("a").first();
  await expect(page.locator("article").nth(1)).toContainText("퇴고 순서 정리");
  await expect(memoTitles).toHaveText("다음 집필 체크");

  // Checklist state comes from saved data, so click and wait for the result.
  await page.getByRole("checkbox", { name: "다음 집필 체크: 안개 묘사 보강" }).click();
  await expect(page.getByText("체크리스트 2/2 완료")).toBeVisible();
  const pinButton = page.getByRole("button", { name: "자료 조사 고정", exact: true });
  const pinBox = await pinButton.boundingBox();
  expect(pinBox.width).toBeGreaterThanOrEqual(44);
  expect(pinBox.height).toBeGreaterThanOrEqual(44);
  await pinButton.click();
  await expect(page.locator("article").first()).toContainText("자료 조사");
  await expect(page.getByRole("button", { name: "자료 조사 고정 해제" })).toHaveAttribute("aria-pressed", "true");
  const memoMetrics = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(memoMetrics.scrollWidth).toBeLessThanOrEqual(memoMetrics.innerWidth);

  // Work isolation.
  await page.getByRole("button", { name: "메뉴", exact: true }).click();
  await page.getByRole("link", { name: "작품 선택" }).click();
  await page.getByRole("button", { name: "월하의 잔향 열기" }).click();
  await page.getByRole("button", { name: "메뉴", exact: true }).click();
  await page.getByRole("button", { name: "아이디어", exact: true }).click();
  await page.getByRole("link", { name: "아이디어 · 전체" }).click();
  await expect(page.getByRole("heading", { name: "등록된 아이디어가 없습니다." })).toBeVisible();
  await expect(page.getByText("검은 방울의 속삭임")).toHaveCount(0);
});

test("exports a work, imports it into a clean session with relations, and restores from the archive", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/works/work-monp/setting/setting02/new");
  await page.getByRole("textbox", { name: /^이름/ }).fill("백업 비술");
  await page.getByRole("group", { name: "사용자" }).getByRole("checkbox", { name: "무영" }).check();
  await page.getByRole("button", { name: "저장" }).click();
  await expect(page.getByRole("heading", { level: 2, name: "백업 비술" })).toBeVisible();

  await page.getByRole("button", { name: "메뉴", exact: true }).click();
  await page.getByRole("link", { name: "백업", exact: true }).click();
  await expect(page).toHaveURL(/\/works\/work-monp\/backup$/);
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "JSON으로 내보내기" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^monp-monp-\d{4}-\d{2}-\d{2}\.json$/);
  const backupPath = test.info().outputPath("monp-backup.json");
  await download.saveAs(backupPath);

  // A full reload resets the session fixture: the new entry is gone.
  await page.reload();
  await expect(page.getByRole("heading", { level: 2, name: "백업과 가져오기" })).toBeVisible();
  await page.getByLabel("백업 파일 선택").setInputFiles(backupPath);
  const preview = page.getByRole("table", { name: "가져오기 미리보기" });
  await expect(preview.getByRole("row", { name: /설정 자료/ })).toContainText("2");
  await page.getByRole("radio", { name: "교체 (백업 내용으로 바꾸기)" }).check();
  await page.getByRole("checkbox", { name: "현재 작품의 데이터를 백업 내용으로 교체합니다" }).check();
  await page.getByRole("button", { name: "가져오기 실행" }).click();
  await expect(page.getByText(/가져오기를 완료했습니다/)).toBeVisible();

  await page.getByRole("link", { name: "검색", exact: true }).click();
  await page.getByRole("searchbox", { name: "통합 검색어" }).fill("백업 비술");
  await page.getByRole("list", { name: "검색 결과" }).getByRole("link", { name: "백업 비술", exact: true }).click();
  await expect(page.getByRole("list", { name: "사용자" }).getByRole("link", { name: "무영" })).toBeVisible();

  await page.getByRole("button", { name: "보관" }).click();
  await expect(page.getByText("보관된 설정 자료입니다. 사용자와 관계는 유지됩니다.")).toBeVisible();
  await page.getByRole("button", { name: "메뉴", exact: true }).click();
  await page.getByRole("link", { name: "보관함", exact: true }).click();
  await page.getByRole("button", { name: "백업 비술 복원" }).click();
  await expect(page.getByText("1개를 복원했습니다.")).toBeVisible();
  await expect(page.getByText("보관된 항목이 없습니다.")).toBeVisible();
});

const responsiveCases = [
  { width: 375, height: 667, columns: 1 },
  { width: 390, height: 844, columns: 1 },
  { width: 430, height: 932, columns: 1 },
  { width: 768, height: 1024, columns: 2 },
  { width: 1200, height: 900, columns: 3 },
];

for (const { columns, height, width } of responsiveCases) {
  test(`fits scoped character navigation at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto(MONP_ALL);

    const cards = page.locator(
      'a[href^="/works/work-monp/characters/characters00/character-"]',
    );
    await expect(cards).toHaveCount(3);

    const metrics = await page.evaluate(() => ({
      innerWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      searchFontSize: Number.parseFloat(
        window.getComputedStyle(
          document.querySelector('input[aria-label="캐릭터 검색"]'),
        ).fontSize,
      ),
    }));
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.innerWidth);
    expect(metrics.searchFontSize).toBeGreaterThanOrEqual(16);

    const bottomNavigation = page.getByRole("navigation", {
      name: "작품 빠른 탐색",
    });
    const sidebar = page.getByRole("complementary");
    if (width < 1024) {
      await expect(bottomNavigation).toBeVisible();
      await expect(sidebar).not.toBeVisible();
      const menuButtonBox = await page
        .getByRole("button", { name: "메뉴", exact: true })
        .boundingBox();
      expect(menuButtonBox.width).toBeGreaterThanOrEqual(44);
      expect(menuButtonBox.height).toBeGreaterThanOrEqual(44);
    } else {
      await expect(bottomNavigation).not.toBeVisible();
      await expect(sidebar).toBeVisible();
      await expect(
        sidebar.getByRole("navigation", { name: "작품 메뉴" }),
      ).toBeVisible();
      // 5 exploration links + 31 menu links + 2 management links.
      await expect(sidebar.getByRole("link")).toHaveCount(38);
      await expect(
        sidebar.getByRole("navigation", { name: "작품 탐색" }).getByRole("link"),
      ).toHaveCount(5);
    }

    const boxes = await cards.evaluateAll((elements) =>
      elements.map((element) => element.getBoundingClientRect().y),
    );
    const sameRow = (first, second) => Math.abs(first - second) < 2;
    if (columns === 1) {
      expect(sameRow(boxes[0], boxes[1])).toBe(false);
    } else if (columns === 2) {
      expect(sameRow(boxes[0], boxes[1])).toBe(true);
      expect(sameRow(boxes[1], boxes[2])).toBe(false);
    } else {
      expect(sameRow(boxes[0], boxes[1])).toBe(true);
      expect(sameRow(boxes[1], boxes[2])).toBe(true);
    }
  });
}

for (const selectionViewport of [
  { width: 390, height: 844, sameRow: false },
  { width: 1200, height: 900, sameRow: true },
]) {
  test(`fits work selection at ${selectionViewport.width}px`, async ({ page }) => {
    await page.setViewportSize(selectionViewport);
    await page.goto("/");

    const cards = page.getByRole("article");
    await expect(cards).toHaveCount(2);
    const metrics = await page.evaluate(() => ({
      innerWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.innerWidth);

    const boxes = await cards.evaluateAll((elements) =>
      elements.map((element) => element.getBoundingClientRect().y),
    );
    expect(Math.abs(boxes[0] - boxes[1]) < 2).toBe(selectionViewport.sameRow);
  });
}

test("searches a character and explores connected world, plot, and setting entries", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/works/work-monp");

  // Korean initial-consonant search from the bottom navigation.
  await page.getByRole("link", { name: "검색", exact: true }).click();
  await expect(page).toHaveURL(/\/works\/work-monp\/search$/);
  await expect(page.getByRole("heading", { level: 2, name: "통합 검색" })).toBeVisible();
  await page.getByRole("searchbox", { name: "통합 검색어" }).fill("ㅇㅎ");
  const results = page.getByRole("list", { name: "검색 결과" });
  await expect(results.getByRole("link", { name: "연화", exact: true })).toHaveAttribute(
    "href",
    "/works/work-monp/characters/characters01/character-yeonhwa",
  );
  await expect(page).toHaveURL(/q=%E3%85%87%E3%85%8E/);
  const searchMetrics = await page.evaluate(() => ({
    fontSize: Number.parseFloat(
      window.getComputedStyle(document.querySelector('input[aria-label="통합 검색어"]')).fontSize,
    ),
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(searchMetrics.scrollWidth).toBeLessThanOrEqual(searchMetrics.innerWidth);
  expect(searchMetrics.fontSize).toBeGreaterThanOrEqual(16);

  // Compound filter: body-text search limited to plot scenes.
  await page.getByRole("searchbox", { name: "통합 검색어" }).fill("검은 안개");
  await page.getByRole("combobox", { name: "항목 유형 필터" }).selectOption("plot");
  await expect(page.getByText("검색 결과 1건")).toBeVisible();
  await expect(results.getByRole("link", { name: "첫 장의 시작", exact: true })).toBeVisible();

  // Explore relations from the character.
  await page.getByRole("searchbox", { name: "통합 검색어" }).fill("연화");
  await page.getByRole("combobox", { name: "항목 유형 필터" }).selectOption("character");
  await page.getByRole("link", { name: "연화 관계 탐색" }).click();
  await expect(page).toHaveURL(/\/works\/work-monp\/relations\?focus=character%3Acharacter-yeonhwa$/);
  await expect(page.getByRole("heading", { name: "1단계 연결 · 3개" })).toBeVisible();
  await expect(page.getByRole("list", { name: "동부평야지대 연결 경로" })).toContainText("출신 지역");
  await expect(page.getByRole("list", { name: "첫 장의 시작 연결 경로" })).toContainText("POV");
  await expect(page.getByRole("list", { name: "청운검법 연결 경로" })).toContainText("사용자");

  await page.getByRole("link", { name: "첫 장의 시작", exact: true }).click();
  await expect(page).toHaveURL(/\/plot\/plot01\/plot-chapter-one-opening$/);
  await page.goBack();
  await page.getByRole("button", { name: "동부평야지대 기준으로 관계 보기" }).click();
  await expect(page.getByRole("heading", { level: 3, name: "동부평야지대" })).toBeVisible();
  await expect(page.getByRole("list", { name: "첫 장의 시작 연결 경로" })).toContainText("장소");
  await page.goBack();
  await expect(page.getByRole("list", { name: "청운검법 연결 경로" })).toBeVisible();

  // Graph view is supplementary; nodes are keyboard-focusable links.
  await page.getByRole("button", { name: "그래프 보기" }).click();
  const graph = page.getByRole("group", { name: "연화 관계 그래프" });
  await expect(graph).toBeVisible();
  const settingNode = graph.getByRole("link", { name: "설정 자료 청운검법" });
  await settingNode.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/setting\/setting01\/setting-cheongun-sword$/);

  // Recent views include the detail pages opened above.
  await page.getByRole("link", { name: "최근", exact: true }).click();
  const viewed = page.getByRole("list", { name: "최근 본 항목" });
  await expect(viewed.getByRole("link").first()).toHaveText("청운검법");
  await expect(viewed.getByRole("link", { name: "첫 장의 시작", exact: true })).toBeVisible();
  await expect(page.getByRole("list", { name: "최근 수정한 항목" })).toBeVisible();
});

test("removes menu motion when reduced motion is requested", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/works/work-monp");
  await page.getByRole("button", { name: "메뉴", exact: true }).click();
  await page.getByRole("button", { name: "캐릭터", exact: true }).click();

  const transitionDuration = await page
    .getByRole("link", { name: "캐릭터 · 귀곡성" })
    .evaluate((element) => window.getComputedStyle(element).transitionDuration);

  expect(getDurationInMilliseconds(transitionDuration)).toBeLessThanOrEqual(1);
});
