import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RouterProvider, createMemoryRouter, useLocation } from "react-router-dom";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { appFixture } from "../../../data/fixtures/appFixture";
import { createFixtureContentRelationState } from "../../../data/repositories/fixtureContentRelationState";
import { createFixtureIdeaRepository } from "../../../data/repositories/fixtureIdeaRepository";
import { createFixtureMenuRepository } from "../../../data/repositories/fixtureMenuRepository";
import { createFixturePlotRepository } from "../../../data/repositories/fixturePlotRepository";
import { createFixtureRelationRepository } from "../../../data/repositories/fixtureRelationRepository";
import { createFixtureSettingRepository } from "../../../data/repositories/fixtureSettingRepository";
import { createFixtureWorldRepository } from "../../../data/repositories/fixtureWorldRepository";
import { createIdeaConverter } from "../../../data/repositories/ideaConverter";
import MenuOutletLayout from "../../../layouts/MenuOutletLayout";
import IdeaDetailPage from "./IdeaDetailPage";
import IdeaEditorPage from "./IdeaEditorPage";
import IdeaListPage from "./IdeaListPage";

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
const DIALOGUE = "idea-dialogue-mist";

function LocationProbe() {
  const location = useLocation();
  return <p data-testid="location">{location.pathname}</p>;
}

function renderIdeaFlow({ fixture = structuredClone(appFixture), initialPath = "/works/work-monp/idea/idea02" } = {}) {
  const state = createFixtureContentRelationState(fixture);
  let id = 0;
  const createId = () => `created-${id++}`;
  const now = () => `2026-10-01T00:${String(id).padStart(2, "0")}:00.000Z`;
  const repository = createFixtureIdeaRepository(state, { createId, now });
  const relations = createFixtureRelationRepository(state, { createId, now });
  const menus = createFixtureMenuRepository(state);
  const plots = createFixturePlotRepository(state, { createId, now });
  const converter = createIdeaConverter({
    ideas: repository,
    plots,
    relations,
    settings: createFixtureSettingRepository(state, { createId, now }),
    worlds: createFixtureWorldRepository(state, { createId, now }),
  });
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  const props = { menus, relations, repository };
  const router = createMemoryRouter(
    [
      {
        path: "/works/:workId/idea/:menuItemId",
        loader: ({ params }) => menus.requireActiveItem("idea", params.menuItemId),
        element: <MenuOutletLayout />,
        children: [
          { index: true, element: <IdeaListPage {...props} /> },
          { path: "new", element: <IdeaEditorPage {...props} /> },
          { path: ":ideaId", element: <IdeaDetailPage {...props} converter={converter} /> },
          { path: ":ideaId/edit", element: <IdeaEditorPage {...props} /> },
        ],
      },
      { path: "*", element: <LocationProbe /> },
    ],
    { initialEntries: [initialPath] },
  );
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { plots, relations, repository, router };
}

const cardTitles = () =>
  screen.getAllByRole("listitem").map((item) => item.querySelector("strong")?.textContent);

describe("Task 12 Idea pages", () => {
  it("quick-adds an idea in the current type and shows it immediately", async () => {
    const { repository } = renderIdeaFlow();
    expect(await screen.findByRole("heading", { level: 2, name: "대사" })).toBeInTheDocument();
    await screen.findByText("안개 속의 첫 대사");
    expect(screen.queryByRole("combobox", { name: "빠른 추가 유형" })).not.toBeInTheDocument();

    await userEvent.type(screen.getByRole("textbox", { name: "빠른 추가할 아이디어" }), "검은 방울의 속삭임");
    await userEvent.click(screen.getByRole("button", { name: "빠른 추가" }));
    expect(await screen.findByText("검은 방울의 속삭임")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "빠른 추가할 아이디어" })).toHaveValue("");
    expect(screen.getByText('"검은 방울의 속삭임" 아이디어를 추가했습니다.')).toBeInTheDocument();
    // High-priority seed stays ahead of the new medium-priority idea.
    expect(cardTitles()).toEqual(["안개 속의 첫 대사", "검은 방울의 속삭임"]);
    const [created] = await repository.list({ q: "검은 방울", workId: MONP });
    expect(created).toMatchObject({ categoryId: "idea02", priority: "medium", status: "seed" });
  });

  it("chooses the type when quick-adding from idea00 and filters by status and priority", async () => {
    const { router } = renderIdeaFlow({ initialPath: "/works/work-monp/idea/idea00" });
    await screen.findByText("안개 속의 첫 대사");
    await userEvent.type(screen.getByRole("textbox", { name: "빠른 추가할 아이디어" }), "산속 폐사찰");
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "빠른 추가 유형" }), "idea03");
    await userEvent.click(screen.getByRole("button", { name: "빠른 추가" }));
    const card = await screen.findByRole("link", { name: /산속 폐사찰/ });
    expect(within(card).getByText("장소")).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText("아이디어 상태 필터"), "seed");
    await waitFor(() => expect(screen.queryByText("안개 속의 첫 대사")).not.toBeInTheDocument());
    expect(router.state.location.search).toContain("status=seed");
    await userEvent.selectOptions(screen.getByLabelText("아이디어 우선순위 필터"), "high");
    expect(await screen.findByText("조건에 맞는 아이디어가 없습니다.")).toBeInTheDocument();
  });

  it("moves an idea through allowed development states", async () => {
    const { repository } = renderIdeaFlow({ initialPath: `/works/work-monp/idea/idea02/${DIALOGUE}` });
    const stage = (await screen.findByRole("heading", { name: "발전 단계" })).closest("section");
    expect(within(stage).getAllByRole("button").map(({ textContent }) => textContent)).toEqual([
      "씨앗으로 되돌리기",
      "검토 완료로 표시",
      "보류하기",
    ]);
    await userEvent.click(within(stage).getByRole("button", { name: "검토 완료로 표시" }));
    const nextStage = (await screen.findByRole("heading", { name: "발전 단계" })).closest("section");
    await waitFor(() =>
      expect(within(nextStage).getAllByRole("button").map(({ textContent }) => textContent)).toEqual([
        "발전 시작",
        "보류하기",
      ]),
    );
    expect(screen.getByText("검토 완료")).toBeInTheDocument();
    expect((await repository.get(MONP, DIALOGUE)).status).toBe("ready");

    await userEvent.click(within(nextStage).getByRole("button", { name: "보류하기" }));
    await waitFor(() =>
      expect(screen.queryByRole("heading", { name: "다른 항목으로 변환" })).not.toBeInTheDocument(),
    );
    expect(screen.getByRole("button", { name: "씨앗으로 되돌리기" })).toBeInTheDocument();
  });

  it("converts the dialogue idea into a plot scene and keeps the origin link", async () => {
    const { plots, relations, repository, router } = renderIdeaFlow({
      initialPath: `/works/work-monp/idea/idea02/${DIALOGUE}`,
    });
    await screen.findByRole("heading", { name: "다른 항목으로 변환" });
    expect(screen.getByRole("combobox", { name: "변환 대상" })).toHaveValue("plot");
    await screen.findByRole("option", { name: "Chapter2" });
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "대상 분류" }), "plot02");
    await userEvent.click(screen.getByRole("button", { name: "변환" }));

    await waitFor(() =>
      expect(router.state.location.pathname).toMatch(/^\/works\/work-monp\/plot\/plot02\/created-\d+$/),
    );
    const sceneId = router.state.location.pathname.split("/").at(-1);
    expect(await plots.get(MONP, sceneId)).toMatchObject({
      chapterId: "plot02",
      title: "안개 속의 첫 대사",
    });
    expect(await repository.get(MONP, DIALOGUE)).toMatchObject({
      convertedTo: { type: "plot", id: sceneId },
      status: "adopted",
    });
    expect(await relations.list(MONP, { type: "idea", id: DIALOGUE })).toEqual([
      expect.objectContaining({
        label: "원본 아이디어",
        source: { type: "plot", id: sceneId },
      }),
    ]);

    await router.navigate(`/works/work-monp/idea/idea02/${DIALOGUE}`);
    const result = (await screen.findByRole("heading", { name: "채택 결과" })).closest("section");
    expect(within(result).getByRole("link", { name: "안개 속의 첫 대사" })).toHaveAttribute(
      "href",
      `/works/work-monp/plot/plot02/${sceneId}`,
    );
    expect(screen.queryByRole("heading", { name: "발전 단계" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "다른 항목으로 변환" })).not.toBeInTheDocument();
    const incoming = screen.getByRole("heading", { name: "들어오는 관계" }).closest("section");
    expect(within(incoming).getByText(/원본 아이디어/)).toBeInTheDocument();
  });

  it("validates the editor and limits status choices to allowed transitions", async () => {
    const { repository, router } = renderIdeaFlow({ initialPath: "/works/work-monp/idea/idea00/new" });
    await screen.findByRole("heading", { name: "새 아이디어 추가" });
    await userEvent.click(screen.getByRole("button", { name: "저장" }));
    expect(screen.getByRole("textbox", { name: /^제목/ })).toHaveAccessibleDescription("제목을 입력해 주세요.");
    fireEvent.change(screen.getByRole("textbox", { name: /^제목/ }), { target: { value: "달의 사원" } });
    await userEvent.click(screen.getByRole("button", { name: "저장" }));
    const category = screen.getByRole("combobox", { name: /^유형/ });
    expect(category).toHaveFocus();
    expect(category).toHaveAccessibleDescription("아이디어 유형을 선택해 주세요.");

    await userEvent.selectOptions(category, "idea03");
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "우선순위" }), "high");
    expect(
      within(screen.getByRole("combobox", { name: "발전 상태" })).getAllByRole("option").map(({ value }) => value),
    ).toEqual(["seed", "developing", "ready"]);
    fireEvent.change(screen.getByRole("textbox", { name: "출처" }), { target: { value: "여행" } });
    await userEvent.click(screen.getByRole("button", { name: "관계 추가" }));
    await userEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(router.state.location.pathname).toMatch(/\/idea\/idea00\/created-\d+$/));
    const ideaId = router.state.location.pathname.split("/").at(-1);
    expect(await repository.get(MONP, ideaId)).toMatchObject({
      categoryId: "idea03",
      priority: "high",
      source: "여행",
      status: "seed",
      title: "달의 사원",
    });

    await router.navigate(`/works/work-monp/idea/idea02/${DIALOGUE}/edit`);
    await screen.findByRole("heading", { name: "아이디어 편집" });
    expect(
      within(screen.getByRole("combobox", { name: "발전 상태" })).getAllByRole("option").map(({ value }) => value),
    ).toEqual(["developing", "seed", "ready", "discarded"]);
  });

  it("archives and restores an idea from the detail and list", async () => {
    const { repository, router } = renderIdeaFlow({ initialPath: `/works/work-monp/idea/idea02/${DIALOGUE}` });
    await screen.findByRole("heading", { level: 2, name: "안개 속의 첫 대사" });
    await userEvent.click(screen.getByRole("button", { name: "보관" }));
    expect(await screen.findByText("보관된 아이디어입니다. 관계는 유지됩니다.")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "다른 항목으로 변환" })).not.toBeInTheDocument();

    await router.navigate("/works/work-monp/idea/idea02?archive=archived");
    await userEvent.click(await screen.findByRole("button", { name: "안개 속의 첫 대사 복원" }));
    await waitFor(async () => expect((await repository.get(MONP, DIALOGUE)).archivedAt).toBeNull());
  });
});
