import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { appFixture } from "../../../data/fixtures/appFixture";
import { createFixtureContentRelationState } from "../../../data/repositories/fixtureContentRelationState";
import { createFixtureMenuRepository } from "../../../data/repositories/fixtureMenuRepository";
import { createFixturePlotRepository } from "../../../data/repositories/fixturePlotRepository";
import { createFixtureRelationRepository } from "../../../data/repositories/fixtureRelationRepository";
import PlotMenuLayout from "../PlotMenuLayout";
import PlotDetailPage from "./PlotDetailPage";
import PlotEditorPage from "./PlotEditorPage";
import PlotListPage from "./PlotListPage";

const originalElementFromPoint = document.elementFromPoint;
const originalRangeGetClientRects = Range.prototype.getClientRects;
const originalRangeGetBoundingClientRect = Range.prototype.getBoundingClientRect;

beforeAll(() => {
  document.elementFromPoint = () => null;
  Range.prototype.getClientRects = () => [];
  Range.prototype.getBoundingClientRect = () => ({
    bottom: 0, height: 0, left: 0, right: 0, top: 0, width: 0, x: 0, y: 0,
    toJSON: () => ({}),
  });
});

afterAll(() => {
  if (originalElementFromPoint) document.elementFromPoint = originalElementFromPoint;
  else delete document.elementFromPoint;
  Range.prototype.getClientRects = originalRangeGetClientRects;
  Range.prototype.getBoundingClientRect = originalRangeGetBoundingClientRect;
});

const MONP = "work-monp";
const OPENING = "plot-chapter-one-opening";

const createFixture = () => {
  const fixture = structuredClone(appFixture);
  const base = fixture.plotScenes[0];
  const scene = (overrides) => ({ ...structuredClone(base), clues: [], ...overrides });
  fixture.plotScenes.push(
    scene({ id: "plot-caravan", title: "상단의 정지", order: 1, status: "planned" }),
    scene({ id: "plot-gate", title: "산문의 경고", order: 2, status: "revised" }),
    scene({
      id: "plot-cave",
      menuItemId: "plot02",
      chapterId: "plot02",
      chapterName: "Chapter2",
      title: "암수굴 도착",
      order: 0,
    }),
  );
  return fixture;
};

function renderPlotFlow({
  fixture = createFixture(),
  initialPath = "/works/work-monp/plot/plot01",
} = {}) {
  const state = createFixtureContentRelationState(fixture);
  let sceneId = 0;
  let clueId = 0;
  let relationId = 0;
  const repository = createFixturePlotRepository(state, {
    createClueId: () => `clue-created-${clueId++}`,
    createId: () => `plot-created-${sceneId++}`,
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
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  const props = { menus, relations, repository };
  const router = createMemoryRouter(
    [
      {
        id: "plot-menu",
        path: "/works/:workId/plot/:menuItemId",
        loader: ({ params }) => menus.requireActiveItem("plot", params.menuItemId),
        element: <PlotMenuLayout />,
        children: [
          { index: true, element: <PlotListPage {...props} /> },
          { path: "new", element: <PlotEditorPage {...props} /> },
          { path: ":sceneId", element: <PlotDetailPage {...props} /> },
          { path: ":sceneId/edit", element: <PlotEditorPage {...props} /> },
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

  return { menus, queryClient, relations, repository, router };
}

const sceneTitles = (container = document.body) =>
  within(container)
    .getAllByRole("listitem")
    .map((item) => within(item).getByRole("link").querySelector("strong")?.textContent)
    .filter(Boolean);

const chapterSection = (label) =>
  screen.getByRole("heading", { level: 3, name: new RegExp(`^${label}`) }).closest("section");

describe("Task 10 Plot pages", () => {
  it("lists a chapter's scenes in order with POV, time, location, and unresolved clues", async () => {
    renderPlotFlow();
    expect(await screen.findByRole("heading", { level: 2, name: "Chapter1" })).toBeInTheDocument();
    await screen.findByText("첫 장의 시작");
    expect(sceneTitles()).toEqual(["첫 장의 시작", "상단의 정지", "산문의 경고"]);

    const opening = screen.getByRole("link", { name: /^장면 1\s*첫 장의 시작/ });
    expect(opening).toHaveAttribute("href", `/works/work-monp/plot/plot01/${OPENING}`);
    for (const text of ["연화", "천무력 412년 봄, 새벽", "동부평야지대 · 동부 교역로 초입", "1명", "미회수 복선 1", "초고"]) {
      expect(within(opening).getByText(text)).toBeInTheDocument();
    }
    expect(screen.queryByText("암수굴 도착")).not.toBeInTheDocument();
  });

  it("groups plot00 by the live chapter menu order", async () => {
    const { menus, queryClient } = renderPlotFlow({
      initialPath: "/works/work-monp/plot/plot00",
    });
    await screen.findByText("암수굴 도착");
    const headings = () =>
      screen.getAllByRole("heading", { level: 3 }).map(({ textContent }) => textContent);
    expect(headings()).toEqual(["Chapter1", "Chapter2"]);
    expect(sceneTitles(chapterSection("Chapter1"))).toEqual([
      "첫 장의 시작",
      "상단의 정지",
      "산문의 경고",
    ]);
    expect(sceneTitles(chapterSection("Chapter2"))).toEqual(["암수굴 도착"]);
    expect(
      screen.getByRole("link", { name: /^장면 1\s*암수굴 도착/ }),
    ).toHaveAttribute("href", "/works/work-monp/plot/plot00/plot-cave");

    // Chapter move: reordering the global menu reorders the grouped view.
    const ids = (await menus.listItems("plot")).map(({ id }) => id);
    expect(ids.slice(1, 3)).toEqual(["plot01", "plot02"]);
    await menus.reorderItems("plot", [ids[0], "plot02", "plot01", ...ids.slice(3)]);
    await queryClient.invalidateQueries({ queryKey: ["menu"] });
    await waitFor(() => expect(headings()).toEqual(["Chapter2", "Chapter1"]));
  });

  it("reorders scenes within a chapter with move buttons and disables edge moves", async () => {
    const { repository } = renderPlotFlow();
    await screen.findByText("산문의 경고");
    expect(screen.getByRole("button", { name: "첫 장의 시작 위로 이동" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "산문의 경고 아래로 이동" })).toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: "산문의 경고 위로 이동" }));
    await waitFor(() =>
      expect(sceneTitles()).toEqual(["첫 장의 시작", "산문의 경고", "상단의 정지"]),
    );
    await userEvent.click(screen.getByRole("button", { name: "첫 장의 시작 아래로 이동" }));
    await waitFor(() =>
      expect(sceneTitles()).toEqual(["산문의 경고", "첫 장의 시작", "상단의 정지"]),
    );
    const stored = await repository.list({ chapterId: "plot01", workId: MONP });
    expect(stored.map(({ id, order }) => [id, order])).toEqual([
      ["plot-gate", 0],
      [OPENING, 1],
      ["plot-caravan", 2],
    ]);
  });

  it("filters unresolved clues and status in the URL and hides reorder while filtered", async () => {
    const { router } = renderPlotFlow();
    await screen.findByText("산문의 경고");

    await userEvent.click(screen.getByRole("checkbox", { name: "미회수 복선만" }));
    await waitFor(() => expect(sceneTitles()).toEqual(["첫 장의 시작"]));
    expect(router.state.location.search).toContain("clues=unresolved");
    expect(screen.queryByRole("button", { name: /위로 이동/ })).not.toBeInTheDocument();
    expect(screen.getByText("필터를 모두 해제하면 장면 순서를 바꿀 수 있습니다.")).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText("장면 상태 필터"), "planned");
    expect(await screen.findByText("조건에 맞는 장면이 없습니다.")).toBeInTheDocument();
    expect(router.state.location.search).toContain("status=planned");

    await router.navigate("/works/work-monp/plot/plot01?status=revised");
    await waitFor(() => expect(sceneTitles()).toEqual(["산문의 경고"]));
  });

  it("validates title and concrete chapter with focus and descriptions", async () => {
    renderPlotFlow({ initialPath: "/works/work-monp/plot/plot00/new" });
    await screen.findByRole("heading", { name: "새 장면 추가" });

    await userEvent.click(screen.getByRole("button", { name: "저장" }));
    const title = screen.getByRole("textbox", { name: /^제목/ });
    expect(title).toHaveFocus();
    expect(title).toHaveAccessibleDescription("제목을 입력해 주세요.");

    fireEvent.change(title, { target: { value: "챕터 없는 장면" } });
    await userEvent.click(screen.getByRole("button", { name: "저장" }));
    const chapter = screen.getByRole("combobox", { name: /^챕터/ });
    expect(chapter).toHaveFocus();
    expect(chapter).toHaveAccessibleDescription("장면을 둘 챕터를 선택해 주세요.");

    await userEvent.selectOptions(chapter, "plot02");
    await userEvent.click(screen.getByRole("button", { name: "복선 추가" }));
    await userEvent.click(screen.getByRole("button", { name: "저장" }));
    const clue = screen.getByRole("textbox", { name: "복선 1 내용" });
    expect(clue).toHaveFocus();
    expect(clue).toHaveAccessibleDescription("복선 1의 내용을 입력해 주세요.");
  });

  it("creates a scene with POV, time, location, characters, event, clues, and a payoff", async () => {
    const { repository, router } = renderPlotFlow({
      initialPath: "/works/work-monp/plot/plot02/new",
    });
    await screen.findByRole("heading", { name: "새 장면 추가" });
    expect(screen.getByRole("combobox", { name: /^챕터/ })).toHaveValue("plot02");

    fireEvent.change(screen.getByRole("textbox", { name: /^제목/ }), { target: { value: "방울 소리의 정체" } });
    fireEvent.change(screen.getByRole("textbox", { name: "요약" }), { target: { value: "무영이 방울을 흔든다" } });
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "상태" }), "draft");
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "POV" }), "character-muyeong");
    fireEvent.change(screen.getByRole("textbox", { name: "시간" }), { target: { value: "같은 날 밤" } });
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "장소" }), "world-east-plains");
    fireEvent.change(screen.getByRole("textbox", { name: "장소 상세" }), { target: { value: "암수굴 입구" } });
    const cast = screen.getByRole("group", { name: "등장 인물" });
    await userEvent.click(within(cast).getByRole("checkbox", { name: "무영" }));
    await userEvent.click(within(cast).getByRole("checkbox", { name: "연화" }));
    fireEvent.change(screen.getByRole("textbox", { name: "사건" }), { target: { value: "방울 소리가 안개를 부른다." } });
    await userEvent.click(screen.getByRole("button", { name: "복선 추가" }));
    fireEvent.change(screen.getByRole("textbox", { name: "복선 1 내용" }), { target: { value: "무영의 오래된 방울" } });
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "복선 1 회수 장면" }), OPENING);
    fireEvent.change(screen.getByRole("textbox", { name: "태그" }), { target: { value: "2장, 방울" } });
    await userEvent.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() =>
      expect(router.state.location.pathname).toBe("/works/work-monp/plot/plot02/plot-created-0"),
    );
    expect(await repository.get(MONP, "plot-created-0")).toMatchObject({
      chapterId: "plot02",
      characterIds: ["character-muyeong", "character-yeonhwa"],
      clues: [{ clue: "무영의 오래된 방울", id: "clue-created-0", payoffSceneId: OPENING }],
      event: "방울 소리가 안개를 부른다.",
      locationDetail: "암수굴 입구",
      locationWorldId: "world-east-plains",
      order: 1,
      povCharacterId: "character-muyeong",
      status: "draft",
      storyTime: "같은 날 밤",
      tags: ["2장", "방울"],
      title: "방울 소리의 정체",
    });

    expect(await screen.findByRole("heading", { level: 2, name: "방울 소리의 정체" })).toBeInTheDocument();
    const clues = screen.getByRole("heading", { name: "복선" }).closest("section");
    expect(within(clues).getByText("회수됨")).toBeInTheDocument();
    expect(within(clues).getByRole("link", { name: "첫 장의 시작" })).toHaveAttribute(
      "href",
      `/works/work-monp/plot/plot01/${OPENING}`,
    );
  });

  it("shows payoffs on the payoff scene and moves a scene to another chapter", async () => {
    const fixture = createFixture();
    fixture.plotScenes.find(({ id }) => id === "plot-cave").clues = [
      { id: "clue-cave", clue: "동굴 벽의 문양", notes: "", payoffSceneId: OPENING },
    ];
    const { repository, router } = renderPlotFlow({
      fixture,
      initialPath: `/works/work-monp/plot/plot01/${OPENING}`,
    });
    const payoffs = (await screen.findByRole("heading", { name: "이 장면에서 회수되는 복선" })).closest("section");
    expect(within(payoffs).getByText("동굴 벽의 문양")).toBeInTheDocument();
    expect(within(payoffs).getByRole("link", { name: "암수굴 도착" })).toHaveAttribute(
      "href",
      "/works/work-monp/plot/plot02/plot-cave",
    );

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "이동할 챕터" }), "plot02");
    await userEvent.click(screen.getByRole("button", { name: "챕터 이동" }));
    await waitFor(() =>
      expect(router.state.location.pathname).toBe(`/works/work-monp/plot/plot02/${OPENING}`),
    );
    expect(await screen.findByText("Chapter2 · 장면 2")).toBeInTheDocument();
    expect(await repository.get(MONP, OPENING)).toMatchObject({ chapterId: "plot02", order: 1 });
    expect(
      (await repository.list({ chapterId: "plot01", workId: MONP })).map(({ id, order }) => [id, order]),
    ).toEqual([["plot-caravan", 0], ["plot-gate", 1]]);
  });

  it("keeps archived targets labeled without offering them as new choices", async () => {
    const fixture = createFixture();
    fixture.characters.find(({ id }) => id === "character-seolha").archivedAt = "2026-02-01T00:00:00.000Z";
    fixture.characters.find(({ id }) => id === "character-muyeong").archivedAt = "2026-02-01T00:00:00.000Z";
    fixture.plotScenes[0].characterIds.push("character-muyeong");
    fixture.plotScenes.find(({ id }) => id === "plot-gate").archivedAt = "2026-02-01T00:00:00.000Z";
    fixture.plotScenes[0].clues[0].payoffSceneId = "plot-gate";
    const { repository } = renderPlotFlow({
      fixture,
      initialPath: `/works/work-monp/plot/plot01/${OPENING}`,
    });

    const cast = await screen.findByRole("list", { name: "등장 인물" });
    expect(within(cast).getByText("무영")).toBeInTheDocument();
    expect(within(cast).getByText("보관됨")).toBeInTheDocument();
    const clues = screen.getByRole("heading", { name: /^복선/ }).closest("section");
    expect(within(clues).getByText("미회수")).toBeInTheDocument();
    expect(within(clues).getByText("회수 장면이 보관되어 미회수로 봅니다.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("link", { name: "편집" }));
    await screen.findByRole("heading", { name: "장면 편집" });
    const editorCast = screen.getByRole("group", { name: "등장 인물" });
    expect(within(editorCast).getByRole("checkbox", { name: "무영 (보관됨)" })).toBeChecked();
    expect(within(editorCast).queryByRole("checkbox", { name: /설하/ })).not.toBeInTheDocument();
    expect(screen.getByRole("option", { name: "산문의 경고 (보관됨)" })).toBeInTheDocument();
    expect(within(screen.getByRole("combobox", { name: "POV" })).queryByRole("option", { name: /설하/ })).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole("textbox", { name: "요약" }), { target: { value: "보관 대상 유지" } });
    await userEvent.click(screen.getByRole("button", { name: "저장" }));
    await screen.findByRole("heading", { level: 2, name: "첫 장의 시작" });
    expect(await repository.get(MONP, OPENING)).toMatchObject({
      characterIds: ["character-yeonhwa", "character-muyeong"],
      clues: [expect.objectContaining({ payoffSceneId: "plot-gate" })],
      summary: "보관 대상 유지",
    });
  });

  it("archives and restores a scene while keeping relations and clues", async () => {
    const { relations, repository } = renderPlotFlow({
      initialPath: `/works/work-monp/plot/plot01/${OPENING}`,
    });
    await relations.create(MONP, {
      label: "등장 장면",
      relationType: "appears-in",
      source: { type: "character", id: "character-seolha" },
      target: { type: "plot", id: OPENING },
    });
    await screen.findByRole("heading", { level: 2, name: "첫 장의 시작" });
    await userEvent.click(screen.getByRole("button", { name: "보관" }));
    expect(await screen.findByText("보관된 장면입니다. 연결된 관계와 복선은 유지됩니다.")).toBeInTheDocument();
    expect(screen.getByText("안개 속에서 들린 방울 소리")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "복원" }));
    await waitFor(() =>
      expect(screen.queryByText(/보관된 장면입니다/)).not.toBeInTheDocument(),
    );
    expect((await repository.get(MONP, OPENING)).archivedAt).toBeNull();
    expect(
      (await relations.list(MONP, { type: "plot", id: OPENING })).map(({ id }) => id),
    ).toEqual(["relation-created-0"]);
  });
});
