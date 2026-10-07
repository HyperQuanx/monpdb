import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { appFixture } from "../../../data/fixtures/appFixture";
import { createFixtureContentRelationState } from "../../../data/repositories/fixtureContentRelationState";
import { createFixtureMenuRepository } from "../../../data/repositories/fixtureMenuRepository";
import { createFixtureRelationRepository } from "../../../data/repositories/fixtureRelationRepository";
import { createFixtureWorldRepository } from "../../../data/repositories/fixtureWorldRepository";
import WorldMenuLayout from "../WorldMenuLayout";
import WorldDetailPage from "./WorldDetailPage";
import WorldEditorPage from "./WorldEditorPage";
import WorldListPage from "./WorldListPage";

const originalElementFromPoint = document.elementFromPoint;
const originalRangeGetClientRects = Range.prototype.getClientRects;
const originalRangeGetBoundingClientRect = Range.prototype.getBoundingClientRect;

beforeAll(() => {
  document.elementFromPoint = () => null;
  Range.prototype.getClientRects = () => [];
  Range.prototype.getBoundingClientRect = () => ({
    bottom: 0,
    height: 0,
    left: 0,
    right: 0,
    top: 0,
    width: 0,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
});

afterAll(() => {
  if (originalElementFromPoint) document.elementFromPoint = originalElementFromPoint;
  else delete document.elementFromPoint;
  Range.prototype.getClientRects = originalRangeGetClientRects;
  Range.prototype.getBoundingClientRect = originalRangeGetBoundingClientRect;
});

afterEach(() => {
  vi.useRealTimers();
});

const createFixture = () => structuredClone(appFixture);

const addWorldRegion = (fixture, {
  id = "world02",
  label = "서부 산악지대",
} = {}) => {
  const base = fixture.menuItems.find(({ id: itemId }) => itemId === "world01");
  fixture.menuItems.push({
    ...structuredClone(base),
    filterConfig: { legacyPath: `/${id}`, scope: "category" },
    id,
    label,
    order: Math.max(...fixture.menuItems.filter(({ sectionId }) => sectionId === "world").map(({ order }) => order)) + 1,
    slug: id,
  });
  return id;
};

const addWorld = (fixture, overrides) => {
  const base = fixture.worlds[0];
  const world = {
    ...structuredClone(base),
    id: overrides.id,
    menuItemId: overrides.regionId ?? base.regionId,
    order: fixture.worlds.length,
    regionId: overrides.regionId ?? base.regionId,
    regionName: overrides.regionName ?? base.regionName,
    ...overrides,
  };
  fixture.worlds.push(world);
  return world;
};

function renderWorldFlow({
  fixture = createFixture(),
  initialPath = "/works/work-monp/world/world00",
} = {}) {
  const state = createFixtureContentRelationState(fixture);
  let worldId = 0;
  let relationId = 0;
  const repository = createFixtureWorldRepository(state, {
    createId: () => `world-created-${worldId++}`,
    now: () => "2026-10-01T00:00:00.000Z",
  });
  const relations = createFixtureRelationRepository(state, {
    createId: () => `relation-created-${relationId++}`,
    now: () => "2026-10-01T00:00:00.000Z",
  });
  const menus = createFixtureMenuRepository({
    menuItems: fixture.menuItems,
    menuSections: fixture.menuSections,
  });
  const listSpy = vi.spyOn(repository, "list");
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });
  const listProps = { menus, repository };
  const relationProps = { ...listProps, relations };
  const router = createMemoryRouter(
    [
      {
        id: "world-menu",
        path: "/works/:workId/world/:menuItemId",
        loader: ({ params }) => menus.requireActiveItem("world", params.menuItemId),
        element: <WorldMenuLayout />,
        children: [
          { index: true, element: <WorldListPage {...listProps} /> },
          { path: "new", element: <WorldEditorPage {...relationProps} /> },
          { path: ":worldId", element: <WorldDetailPage {...relationProps} /> },
          { path: ":worldId/edit", element: <WorldEditorPage {...relationProps} /> },
        ],
      },
    ],
    { initialEntries: [initialPath] },
  );

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );

  return { listSpy, menus, queryClient, relations, repository, router };
}

const changeByLabel = (label, value) => {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
};

// The rich text toolbar also has a "제목" (heading) button, so target the textbox.
const changeTitle = (value) => {
  fireEvent.change(screen.getByRole("textbox", { name: /^제목/ }), { target: { value } });
};

// Card links start with the World title; region labels may repeat the same text.
const worldCard = (title) => ({ name: new RegExp(`^${title}`) });

const findTextNode = (node) => {
  if (node?.type === "text") return node;
  return node?.content?.map(findTextNode).find(Boolean);
};

describe("Task 9 World pages", () => {
  it("uses runtime labels and renders complete responsive summary cards", async () => {
    const fixture = createFixture();
    fixture.menuItems.find(({ id }) => id === "world00").label = "실시간 전체 세계";
    fixture.menuItems.find(({ id }) => id === "world01").label = "새 동부 이름";
    renderWorldFlow({ fixture });

    expect(await screen.findByRole("heading", { level: 2, name: "실시간 전체 세계" })).toBeInTheDocument();
    const card = await screen.findByRole("link", worldCard("동부평야지대"));
    expect(card).toHaveAttribute("href", "/works/work-monp/world/world00/world-east-plains");
    for (const text of [
      "지역", "새 동부 이름", "시대", "천무력 412년 이후", "상태", "draft",
      "세력", "청운문, 동부 상인 연합", "장소", "청운문, 동부 교역로, 풍요 평야",
      "비옥한 평야와 오래된 문파들이 자리한 동부 지역",
    ]) expect(within(card).getAllByText(text).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "추가" })).toHaveAttribute(
      "href",
      "/works/work-monp/world/world00/new",
    );
  });

  it("updates only the latest q and era values at exactly 300 ms", async () => {
    const { listSpy, router } = renderWorldFlow();
    await screen.findByRole("link", worldCard("동부평야지대"));
    listSpy.mockClear();
    vi.useFakeTimers();

    fireEvent.change(screen.getByLabelText("세계관 검색"), { target: { value: "동" } });
    fireEvent.change(screen.getByLabelText("세계관 검색"), { target: { value: "동부" } });
    fireEvent.change(screen.getByLabelText("세계관 시대 필터"), { target: { value: "천" } });
    fireEvent.change(screen.getByLabelText("세계관 시대 필터"), { target: { value: "천무력" } });

    await act(async () => { await vi.advanceTimersByTimeAsync(299); });
    expect(listSpy).not.toHaveBeenCalled();
    expect(router.state.location.search).toBe("");

    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(router.state.location.search).toContain("q=%EB%8F%99%EB%B6%80");
    expect(router.state.location.search).toContain("era=%EC%B2%9C%EB%AC%B4%EB%A0%A5");
    expect(listSpy).toHaveBeenCalledWith(expect.objectContaining({
      era: "천무력",
      q: "동부",
      regionId: "world00",
    }));
    expect(listSpy.mock.calls.some(([options]) => options.q === "동" || options.era === "천")).toBe(false);
  });

  it("keeps category, era, archive, and query filters in the URL with AND semantics", async () => {
    const fixture = createFixture();
    addWorld(fixture, {
      category: "culture",
      era: "천무력 412년",
      id: "world-harvest-festival",
      summary: "달 축제 기록",
      title: "풍요 달 축제",
    });
    addWorld(fixture, {
      archivedAt: "2026-09-01T00:00:00.000Z",
      category: "culture",
      era: "천무력 412년",
      id: "world-archived-festival",
      summary: "달 축제 기록",
      title: "보관된 달 축제",
    });
    const { router } = renderWorldFlow({
      fixture,
      initialPath: "/works/work-monp/world/world00?q=%EB%8B%AC+%EC%B6%95%EC%A0%9C&category=culture&era=412&archive=all",
    });

    expect(await screen.findByRole("link", worldCard("풍요 달 축제"))).toBeInTheDocument();
    expect(screen.getByRole("link", worldCard("보관된 달 축제"))).toBeInTheDocument();
    expect(screen.queryByRole("link", worldCard("동부평야지대"))).not.toBeInTheDocument();
    expect(router.state.location.search).toContain("category=culture");
    expect(router.state.location.search).toContain("era=412");
    expect(router.state.location.search).toContain("archive=all");
  });

  it("distinguishes no-data, no-filter-match, and no-archive empty states", async () => {
    const noData = createFixture();
    noData.worlds = [];
    noData.relations = [];
    noData.plotScenes = [];
    const first = renderWorldFlow({ fixture: noData });
    expect(await screen.findByText("등록된 세계관이 없습니다.")).toBeInTheDocument();
    first.queryClient.clear();
    await first.router.navigate("/works/work-monp/world/world00?q=missing");
    expect(await screen.findByText("조건에 맞는 세계관이 없습니다.")).toBeInTheDocument();
    await first.router.navigate("/works/work-monp/world/world00?archive=archived");
    expect(await screen.findByText("보관된 세계관이 없습니다.")).toBeInTheDocument();
  });

  it("accepts world00 detail but rejects a wrong concrete region", async () => {
    const fixture = createFixture();
    addWorldRegion(fixture);
    const { router } = renderWorldFlow({
      fixture,
      initialPath: "/works/work-monp/world/world00/world-east-plains",
    });
    expect(await screen.findByRole("heading", { level: 2, name: "동부평야지대" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "전체 목록" })).toHaveAttribute(
      "href",
      "/works/work-monp/world/world00",
    );

    await router.navigate("/works/work-monp/world/world02/world-east-plains");
    expect(await screen.findByRole("alert")).toHaveTextContent("현재 지역에서 세계관을 찾을 수 없습니다");
  });

  it("validates required title and concrete region with focus and descriptions", async () => {
    renderWorldFlow({ initialPath: "/works/work-monp/world/world00/new" });
    await screen.findByRole("heading", { name: "새 세계관 추가" });

    await userEvent.click(screen.getByRole("button", { name: "저장" }));
    const title = screen.getByRole("textbox", { name: /^제목/ });
    expect(title).toHaveFocus();
    expect(title).toHaveAttribute("aria-invalid", "true");
    expect(title).toHaveAccessibleDescription("제목을 입력해 주세요.");

    changeTitle("지역 필수 검사");
    await userEvent.click(screen.getByRole("button", { name: "저장" }));
    const region = screen.getByLabelText(/^지역/);
    expect(region).toHaveFocus();
    expect(region).toHaveAttribute("aria-invalid", "true");
    expect(region).toHaveAccessibleDescription("구체적인 세계관 지역을 선택해 주세요.");
  });

  it("preselects a concrete route and creates all fields, rich JSON, character and plot relations", async () => {
    const { relations, repository, router } = renderWorldFlow({
      initialPath: "/works/work-monp/world/world01/new",
    });
    await screen.findByRole("heading", { name: "새 세계관 추가" });
    expect(screen.getByLabelText(/^지역/)).toHaveValue("world01");

    changeTitle("월광 연맹의 시대");
    changeByLabel("요약", "전 필드 요약");
    await userEvent.selectOptions(screen.getByLabelText("분류"), "culture");
    changeByLabel("시대", "신력 100년");
    changeByLabel("상태", "published-custom");
    changeByLabel("규칙", "마력 사용에는 서약이 필요하다.");
    changeByLabel("역사", "달의 문이 열린 뒤 연맹이 세워졌다.");
    changeByLabel("문화", "매달 등불제를 연다.");
    changeByLabel("세력", "월광 연맹, 은빛 상단, 월광 연맹");
    changeByLabel("장소", "달의 문, 은빛 광장");
    changeByLabel("태그", "달, 연맹, 달");

    const body = screen.getByRole("textbox", { name: "본문" });
    body.focus();
    await userEvent.type(body, "굵은 세계 본문", { skipClick: true });
    await userEvent.keyboard("{Control>}a{/Control}");
    await userEvent.click(screen.getByRole("button", { name: "굵게" }));

    const candidate = screen.getByLabelText("관계 대상 선택");
    await userEvent.selectOptions(candidate, JSON.stringify(["plot", "plot-chapter-one-opening"]));
    await userEvent.click(screen.getByRole("button", { name: "관계 추가" }));
    await userEvent.selectOptions(candidate, JSON.stringify(["character", "character-yeonhwa"]));
    await userEvent.click(screen.getByRole("button", { name: "관계 추가" }));
    await userEvent.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => expect(router.state.location.pathname).toBe(
      "/works/work-monp/world/world01/world-created-0",
    ));
    const created = await repository.get("work-monp", "world-created-0");
    expect(created).toMatchObject({
      category: "culture",
      culture: "매달 등불제를 연다.",
      era: "신력 100년",
      factions: ["월광 연맹", "은빛 상단"],
      history: "달의 문이 열린 뒤 연맹이 세워졌다.",
      places: ["달의 문", "은빛 광장"],
      regionId: "world01",
      rules: "마력 사용에는 서약이 필요하다.",
      status: "published-custom",
      summary: "전 필드 요약",
      tags: ["달", "연맹"],
      title: "월광 연맹의 시대",
    });
    expect(findTextNode(created.body)).toMatchObject({
      marks: [{ type: "bold" }],
      text: "굵은 세계 본문",
      type: "text",
    });
    const connected = await relations.list("work-monp", { type: "world", id: created.id });
    expect(connected.map(({ target }) => target)).toEqual(expect.arrayContaining([
      { type: "plot", id: "plot-chapter-one-opening" },
      { type: "character", id: "character-yeonhwa" },
    ]));
  });

  it("displays incoming reverse relations and preserves them while editing", async () => {
    const { relations, repository } = renderWorldFlow({
      initialPath: "/works/work-monp/world/world01/world-east-plains/edit",
    });
    await screen.findByRole("heading", { name: "세계관 편집" });
    const incoming = screen.getByRole("heading", { name: "들어오는 관계" }).parentElement;
    expect(within(incoming).getByText("연화")).toBeInTheDocument();
    expect(within(incoming).getByText("출신 지역")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "연화 관계 삭제" })).not.toBeInTheDocument();

    changeTitle("동부평야 수정");
    await userEvent.click(screen.getByRole("button", { name: "저장" }));
    expect(await screen.findByRole("heading", { level: 2, name: "동부평야 수정" })).toBeInTheDocument();
    expect(await repository.get("work-monp", "world-east-plains")).toMatchObject({ title: "동부평야 수정" });
    const connected = await relations.list("work-monp", { type: "world", id: "world-east-plains" });
    expect(connected.map(({ id }) => id)).toContain("relation-yeonhwa-east-plains");
    const detailIncoming = screen.getByRole("heading", { name: "들어오는 관계" }).parentElement;
    expect(within(detailIncoming).getByText("연화")).toHaveAttribute(
      "href",
      "/works/work-monp/characters/characters01/character-yeonhwa",
    );
  });

  it("guards dirty navigation until changes are explicitly discarded", async () => {
    const { router } = renderWorldFlow({
      initialPath: "/works/work-monp/world/world01/world-east-plains/edit",
    });
    await screen.findByRole("heading", { name: "세계관 편집" });
    await userEvent.type(screen.getByRole("textbox", { name: /^제목/ }), " 변경");
    await userEvent.click(screen.getByRole("link", { name: "취소" }));

    const dialog = await screen.findByRole("dialog", { name: "변경사항을 버리시겠습니까?" });
    await userEvent.click(within(dialog).getByRole("button", { name: "계속 편집" }));
    expect(router.state.location.pathname).toContain("/edit");
    await userEvent.click(screen.getByRole("link", { name: "취소" }));
    await userEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "변경사항 버리기" }));
    await waitFor(() => expect(router.state.location.pathname).not.toContain("/edit"));
  });

  it("moves concrete-region edits while all-view edits may remain in all", async () => {
    const fixture = createFixture();
    addWorldRegion(fixture);
    const { repository, router } = renderWorldFlow({
      fixture,
      initialPath: "/works/work-monp/world/world01/world-east-plains/edit",
    });
    await screen.findByRole("heading", { name: "세계관 편집" });
    await userEvent.selectOptions(screen.getByLabelText(/^지역/), "world02");
    await userEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(router.state.location.pathname).toBe(
      "/works/work-monp/world/world02/world-east-plains",
    ));
    expect(await repository.get("work-monp", "world-east-plains")).toMatchObject({
      regionId: "world02",
      regionName: "서부 산악지대",
    });

    await router.navigate("/works/work-monp/world/world00/world-east-plains/edit");
    await screen.findByRole("heading", { name: "세계관 편집" });
    changeByLabel("요약", "전체 보기에서 수정");
    await userEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(router.state.location.pathname).toBe(
      "/works/work-monp/world/world00/world-east-plains",
    ));
  });

  it("reuses a created World id after relation persistence fails once", async () => {
    const { relations, repository, router } = renderWorldFlow({
      initialPath: "/works/work-monp/world/world01/new",
    });
    await screen.findByRole("heading", { name: "새 세계관 추가" });
    changeTitle("재시도 세계관");
    await userEvent.click(screen.getByRole("button", { name: "관계 추가" }));
    vi.spyOn(relations, "replaceOutgoing").mockRejectedValueOnce(new Error("관계 저장 실패"));

    await userEvent.click(screen.getByRole("button", { name: "저장" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("관계 저장 실패");
    await userEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(router.state.location.pathname).toContain("world-created-0"));
    const matches = await repository.list({ archiveStatus: "all", q: "재시도 세계관", workId: "work-monp" });
    expect(matches).toHaveLength(1);
    expect(matches[0].id).toBe("world-created-0");
  });

  it("archives and restores without removing relations", async () => {
    const { relations, repository } = renderWorldFlow({
      initialPath: "/works/work-monp/world/world01/world-east-plains",
    });
    expect(await screen.findByText(/출신 지역/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "보관" }));
    expect(await screen.findByText(/보관된 세계관입니다/)).toBeInTheDocument();
    expect(screen.getByText(/출신 지역/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "복원" }));
    await waitFor(() => expect(screen.queryByText(/보관된 세계관입니다/)).not.toBeInTheDocument());
    expect((await repository.get("work-monp", "world-east-plains")).archivedAt).toBeNull();
    expect(await relations.list("work-monp", { type: "world", id: "world-east-plains" })).toEqual([
      expect.objectContaining({ id: "relation-yeonhwa-east-plains" }),
    ]);
  });

  it("shows archived endpoint labels and entity links in detail and editor", async () => {
    const fixture = createFixture();
    addWorldRegion(fixture);
    addWorld(fixture, {
      archivedAt: "2026-09-01T00:00:00.000Z",
      category: "place",
      id: "world-archived-fort",
      regionId: "world02",
      regionName: "서부 산악지대",
      title: "보관된 요새",
    });
    fixture.relations.push({
      archivedAt: null,
      bidirectional: false,
      createdAt: "2026-01-01T00:00:00.000Z",
      id: "relation-east-archived-fort",
      label: "폐허 통로",
      notes: "보관된 대상 연결",
      relationType: "related",
      source: { type: "world", id: "world-east-plains" },
      target: { type: "world", id: "world-archived-fort" },
      updatedAt: "2026-01-01T00:00:00.000Z",
      workId: "work-monp",
    });
    const { relations, router } = renderWorldFlow({
      fixture,
      initialPath: "/works/work-monp/world/world01/world-east-plains",
    });

    const outgoing = (await screen.findByRole("heading", { name: "나가는 관계" })).parentElement;
    expect(within(outgoing).getByRole("link", { name: "보관된 요새" })).toHaveAttribute(
      "href",
      "/works/work-monp/world/world02/world-archived-fort",
    );
    expect(within(outgoing).getByText("보관됨")).toBeInTheDocument();

    await router.navigate("/works/work-monp/world/world01/world-east-plains/edit");
    await screen.findByRole("heading", { name: "세계관 편집" });
    // Existing relation rows resolve archived labels, but archived targets are
    // never offered as new relation candidates.
    expect(screen.getByLabelText("보관된 요새 (보관됨) 관계 메모")).toHaveValue("보관된 대상 연결");
    expect(screen.queryByRole("option", { name: /보관된 요새/ })).not.toBeInTheDocument();

    changeByLabel("요약", "보관 대상 관계 유지");
    await userEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(router.state.location.pathname).toBe(
      "/works/work-monp/world/world01/world-east-plains",
    ));
    const connected = await relations.list("work-monp", { type: "world", id: "world-east-plains" });
    expect(connected.map(({ id }) => id)).toContain("relation-east-archived-fort");
  });

  it("follows external URL filter changes without reverting them", async () => {
    const { router } = renderWorldFlow();
    await screen.findByRole("link", worldCard("동부평야지대"));

    await router.navigate("/works/work-monp/world/world00?q=missing");
    await waitFor(() => expect(screen.getByLabelText("세계관 검색")).toHaveValue("missing"));
    expect(await screen.findByText("조건에 맞는 세계관이 없습니다.")).toBeInTheDocument();
    expect(router.state.location.search).toBe("?q=missing");
  });
});
