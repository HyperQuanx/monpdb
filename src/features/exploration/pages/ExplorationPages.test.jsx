import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { appFixture } from "../../../data/fixtures/appFixture";
import { createFixtureContentRelationState } from "../../../data/repositories/fixtureContentRelationState";
import { createFixtureExplorationRepository } from "../../../data/repositories/fixtureExplorationRepository";
import { createFixtureMenuRepository } from "../../../data/repositories/fixtureMenuRepository";
import { createRecentViewStore } from "../../../shared/navigation/recentViews";
import { createGenericContentFixture } from "../../../test/genericContentFixture";
import RecentPage from "./RecentPage";
import RelationsPage from "./RelationsPage";
import SearchPage from "./SearchPage";

const MONP = "work-monp";

function renderExploration({ fixture = createGenericContentFixture(appFixture), initialPath, store } = {}) {
  const state = createFixtureContentRelationState(fixture);
  const repository = createFixtureExplorationRepository(state);
  const menus = createFixtureMenuRepository(state);
  const recentStore = store ?? createRecentViewStore();
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(
    [
      { path: "/works/:workId/search", element: <SearchPage menus={menus} repository={repository} /> },
      { path: "/works/:workId/recent", element: <RecentPage menus={menus} repository={repository} store={recentStore} /> },
      { path: "/works/:workId/relations", element: <RelationsPage repository={repository} /> },
      { path: "*", element: <p>other page</p> },
    ],
    { initialEntries: [initialPath] },
  );
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { recentStore, router };
}

const resultTitles = () =>
  within(screen.getByRole("list", { name: "검색 결과" }))
    .getAllByRole("listitem")
    .map((item) => item.querySelector("a, strong")?.textContent);

describe("Task 13 search page", () => {
  it("finds a character by initial consonants and links to its detail", async () => {
    const { router } = renderExploration({ initialPath: "/works/work-monp/search" });
    expect(screen.getByText("검색어를 입력하거나 유형·메뉴를 골라 보세요.")).toBeInTheDocument();
    await userEvent.type(screen.getByRole("searchbox", { name: "통합 검색어" }), "ㅇㅎ");
    expect(await screen.findByText(/검색 결과 \d+건/)).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "연화" });
    expect(link).toHaveAttribute("href", "/works/work-monp/characters/characters01/character-yeonhwa");
    expect(screen.getByRole("link", { name: "연화 관계 탐색" })).toHaveAttribute(
      "href",
      "/works/work-monp/relations?focus=character%3Acharacter-yeonhwa",
    );
    await waitFor(() => expect(router.state.location.search).toBe("?q=%E3%85%87%E3%85%8E"));
  });

  it("shows matched snippets across collections and follows external URL changes", async () => {
    const { router } = renderExploration({ initialPath: "/works/work-monp/search?q=%EA%B2%80%EC%9D%80+%EC%95%88%EA%B0%9C" });
    expect(await screen.findByText(/검색 결과 3건/)).toBeInTheDocument();
    expect(resultTitles()).toEqual(expect.arrayContaining(["첫 장의 시작", "안개 속의 첫 대사"]));
    expect(screen.getAllByText("본문").length).toBeGreaterThan(0);

    await act(() => router.navigate("/works/work-monp/search?q=%EC%B2%AD%EC%9A%B4+%EC%A1%B0%EC%82%AC"));
    await waitFor(() => expect(resultTitles()).toEqual(["청운검법"]));
    expect(screen.getByRole("searchbox", { name: "통합 검색어" })).toHaveValue("청운 조사");
    expect(screen.getByText("청운 조사", { exact: false, selector: "p" })).toBeInTheDocument();
  });

  it("combines kind, menu, status, and archive filters in the URL", async () => {
    const fixture = createGenericContentFixture(appFixture);
    fixture.plotScenes.push({
      ...structuredClone(fixture.plotScenes[0]),
      archivedAt: "2026-02-01T00:00:00.000Z",
      clues: [],
      id: "plot-archived",
      status: "final",
      title: "보관된 장면",
    });
    const { router } = renderExploration({ fixture, initialPath: "/works/work-monp/search" });
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "항목 유형 필터" }), "plot");
    await waitFor(() => expect(resultTitles()).toEqual(["첫 장의 시작"]));
    const menuFilter = screen.getByRole("combobox", { name: "메뉴 필터" });
    expect(within(menuFilter).getAllByRole("group").map((group) => group.getAttribute("label"))).toEqual(["플롯"]);

    await userEvent.click(screen.getByRole("checkbox", { name: "보관 항목 포함" }));
    await waitFor(() => expect(resultTitles()).toEqual(expect.arrayContaining(["첫 장의 시작", "보관된 장면"])));
    expect(screen.getByText("보관됨")).toBeInTheDocument();
    const statusFilter = screen.getByRole("combobox", { name: "상태 필터" });
    await waitFor(() =>
      expect(within(statusFilter).getAllByRole("option").map(({ textContent }) => textContent)).toEqual([
        "전체 상태",
        "초고",
        "완료",
      ]),
    );
    await userEvent.selectOptions(statusFilter, "final");
    await waitFor(() => expect(resultTitles()).toEqual(["보관된 장면"]));
    expect(router.state.location.search).toBe("?kind=plot&archived=1&status=final");

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "메뉴 필터" }), "plot02");
    expect(await screen.findByText("조건에 맞는 항목이 없습니다.")).toBeInTheDocument();
  });
});

describe("Task 13 recent page", () => {
  it("lists session views newest first and recently updated entities", async () => {
    const store = createRecentViewStore();
    store.record(MONP, { id: "character-yeonhwa", kind: "character" });
    store.record(MONP, { id: "missing", kind: "plot" });
    store.record(MONP, { id: "memo-research", kind: "memo" });
    renderExploration({ initialPath: "/works/work-monp/recent", store });
    const viewed = await screen.findByRole("list", { name: "최근 본 항목" });
    expect(within(viewed).getAllByRole("link", { name: /^(자료 조사|연화)$/ }).map(({ textContent }) => textContent)).toEqual([
      "자료 조사",
      "연화",
    ]);
    expect(within(viewed).getByRole("link", { name: "자료 조사" })).toHaveAttribute(
      "href",
      "/works/work-monp/memo/memo00/memo-research",
    );
    const updated = await screen.findByRole("list", { name: "최근 수정한 항목" });
    expect(within(updated).getAllByRole("listitem").length).toBeGreaterThan(3);

    await userEvent.click(screen.getByRole("button", { name: "기록 지우기" }));
    expect(await screen.findByText(/아직 열어 본 항목이 없습니다/)).toBeInTheDocument();
  });
});

describe("Task 13 relations page", () => {
  it("lists a character's connections with how they connect and refocuses in history", async () => {
    const { router } = renderExploration({
      initialPath: "/works/work-monp/relations?focus=character%3Acharacter-yeonhwa",
    });
    expect(await screen.findByRole("heading", { name: "1단계 연결 · 3개" })).toBeInTheDocument();
    expect(screen.getByText("연결된 항목 3개")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "목록 보기" })).toHaveAttribute("aria-pressed", "true");
    const scene = within(screen.getByRole("list", { name: "첫 장의 시작 연결 경로" }));
    expect(scene.getByText(/연화에서 들어오는 관계 · POV/)).toBeInTheDocument();
    expect(scene.getByText("장면 정보", { exact: false })).toBeInTheDocument();
    expect(
      within(screen.getByRole("list", { name: "청운검법 연결 경로" })).getByText(/들어오는 관계 · 사용자/),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("list", { name: "동부평야지대 연결 경로" })).getByText(/상호 관계 · 출신 지역/),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "동부평야지대 기준으로 관계 보기" }));
    await waitFor(() =>
      expect(router.state.location.search).toBe(`?focus=${encodeURIComponent("world:world-east-plains")}`),
    );
    expect(router.state.historyAction).toBe("PUSH");
    await screen.findByRole("heading", { level: 3, name: "동부평야지대" });

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "연결 단계" }), "2");
    expect(await screen.findByRole("heading", { name: /^2단계 연결/ })).toBeInTheDocument();
  });

  it("picks a focus by search and renders an accessible graph view", async () => {
    const { router } = renderExploration({ initialPath: "/works/work-monp/relations" });
    expect(screen.getByText("관계를 볼 항목을 검색해 선택하세요.")).toBeInTheDocument();
    await userEvent.type(screen.getByRole("searchbox", { name: "관계를 볼 항목 검색" }), "무영");
    await userEvent.click(await screen.findByRole("button", { name: /무영/ }));
    await waitFor(() => expect(router.state.location.search).toContain("focus=character%3Acharacter-muyeong"));
    expect(await screen.findByText("연결된 항목이 없습니다.")).toBeInTheDocument();

    await act(() => router.navigate("/works/work-monp/relations?focus=character%3Acharacter-yeonhwa&view=graph"));
    const graph = await screen.findByRole("group", { name: "연화 관계 그래프" });
    expect(screen.getByRole("button", { name: "그래프 보기" })).toHaveAttribute("aria-pressed", "true");
    expect(within(graph).getByRole("link", { name: "세계관 동부평야지대" })).toHaveAttribute(
      "href",
      "/works/work-monp/world/world01/world-east-plains",
    );
    // Three edges from 연화 plus the scene → 동부평야지대 location edge between shown nodes.
    expect(graph.querySelectorAll("line")).toHaveLength(4);
  });

  it("caps large graphs and reports unknown focus", async () => {
    const fixture = createGenericContentFixture(appFixture);
    const base = fixture.characters.find(({ id }) => id === "character-muyeong");
    for (let index = 0; index < 45; index += 1) {
      fixture.characters.push({ ...structuredClone(base), id: `character-extra-${index}`, name: `조연 ${index}` });
      fixture.relations.push({
        ...structuredClone(fixture.relations[0]),
        bidirectional: false,
        id: `relation-extra-${index}`,
        relationType: "ally",
        source: { type: "character", id: `character-extra-${index}` },
        target: { type: "character", id: "character-yeonhwa" },
      });
    }
    const { router } = renderExploration({
      fixture,
      initialPath: "/works/work-monp/relations?focus=character%3Acharacter-yeonhwa&view=graph",
    });
    expect(await screen.findByText("연결된 항목 48개")).toBeInTheDocument();
    expect(screen.getByText(/그래프에는 36개까지만 그립니다. 나머지 12개는 목록 보기에서 확인하세요./)).toBeInTheDocument();
    const graph = screen.getByRole("group", { name: "연화 관계 그래프" });
    expect(within(graph).getAllByRole("link")).toHaveLength(37);

    await act(() => router.navigate("/works/work-monp/relations?focus=character%3Amissing"));
    expect(await screen.findByRole("alert")).toHaveTextContent("관계를 볼 항목을 찾을 수 없습니다.");
  });
});
