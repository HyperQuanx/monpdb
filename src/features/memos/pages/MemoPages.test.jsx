import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { appFixture } from "../../../data/fixtures/appFixture";
import { createFixtureContentRelationState } from "../../../data/repositories/fixtureContentRelationState";
import { createFixtureMemoRepository } from "../../../data/repositories/fixtureMemoRepository";
import { createFixtureMenuRepository } from "../../../data/repositories/fixtureMenuRepository";
import MenuOutletLayout from "../../../layouts/MenuOutletLayout";
import MemoDetailPage from "./MemoDetailPage";
import MemoEditorPage from "./MemoEditorPage";
import MemoListPage from "./MemoListPage";

const MONP = "work-monp";

function renderMemoFlow({ fixture = structuredClone(appFixture), initialPath = "/works/work-monp/memo/memo00" } = {}) {
  const state = createFixtureContentRelationState(fixture);
  let id = 0;
  let tick = 10;
  const repository = createFixtureMemoRepository(state, {
    createChecklistItemId: () => `check-created-${id++}`,
    createId: () => `memo-created-${id++}`,
    now: () => `2026-10-01T00:${String(tick++).padStart(2, "0")}:00.000Z`,
  });
  const menus = createFixtureMenuRepository(state);
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  const props = { menus, repository };
  const router = createMemoryRouter(
    [
      {
        path: "/works/:workId/memo/:menuItemId",
        loader: ({ params }) => menus.requireActiveItem("memo", params.menuItemId),
        element: <MenuOutletLayout />,
        children: [
          { index: true, element: <MemoListPage {...props} /> },
          { path: "new", element: <MemoEditorPage {...props} /> },
          { path: ":memoId", element: <MemoDetailPage {...props} /> },
          { path: ":memoId/edit", element: <MemoEditorPage {...props} /> },
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
  return { repository, router };
}

const memoTitles = () =>
  screen
    .getAllByRole("article")
    .map((article) => within(article).getAllByRole("link")[0].textContent);

describe("Task 12 Memo pages", () => {
  it("quick-adds memos and keeps pinned memos first", async () => {
    renderMemoFlow();
    await screen.findByText("다음 집필 체크");
    expect(memoTitles()).toEqual(["다음 집필 체크", "자료 조사"]);

    await userEvent.type(screen.getByRole("textbox", { name: "빠른 추가할 메모" }), "퇴고 순서 정리");
    await userEvent.click(screen.getByRole("button", { name: "빠른 추가" }));
    await screen.findByText("퇴고 순서 정리");
    expect(screen.getByRole("textbox", { name: "빠른 추가할 메모" })).toHaveValue("");
    expect(screen.getByText('"퇴고 순서 정리" 메모를 추가했습니다.')).toBeInTheDocument();
    // New memos go right after pinned ones.
    expect(memoTitles()).toEqual(["다음 집필 체크", "퇴고 순서 정리", "자료 조사"]);

    const pin = screen.getByRole("button", { name: "자료 조사 고정" });
    expect(pin).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(pin);
    await waitFor(() => expect(memoTitles()).toEqual(["자료 조사", "다음 집필 체크", "퇴고 순서 정리"]));
    expect(screen.getByRole("button", { name: "자료 조사 고정 해제" })).toHaveAttribute("aria-pressed", "true");
  });

  it("toggles checklist items in place and filters by color", async () => {
    const { repository, router } = renderMemoFlow();
    const item = await screen.findByRole("checkbox", { name: "다음 집필 체크: 안개 묘사 보강" });
    expect(screen.getByText("체크리스트 1/2 완료")).toBeInTheDocument();
    expect(item).not.toBeChecked();
    await userEvent.click(item);
    expect(await screen.findByText("체크리스트 2/2 완료")).toBeInTheDocument();
    expect((await repository.get(MONP, "memo-next-session")).checklist.every(({ done }) => done)).toBe(true);

    await userEvent.selectOptions(screen.getByLabelText("메모 색상 필터"), "blue");
    await waitFor(() => expect(memoTitles()).toEqual(["자료 조사"]));
    expect(router.state.location.search).toContain("color=blue");
  });

  it("creates a full memo with color, pin, checklist, and tags", async () => {
    const { repository, router } = renderMemoFlow({ initialPath: "/works/work-monp/memo/memo00/new" });
    await screen.findByRole("heading", { name: "새 메모" });
    await userEvent.click(screen.getByRole("button", { name: "저장" }));
    expect(screen.getByRole("textbox", { name: /^제목/ })).toHaveAccessibleDescription("제목을 입력해 주세요.");

    fireEvent.change(screen.getByRole("textbox", { name: /^제목/ }), { target: { value: "2장 준비" } });
    fireEvent.change(screen.getByRole("textbox", { name: "내용" }), { target: { value: "암수굴 묘사 자료" } });
    await userEvent.click(screen.getByRole("radio", { name: "초록" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "목록 맨 위에 고정" }));
    await userEvent.click(screen.getByRole("button", { name: "항목 추가" }));
    await userEvent.click(screen.getByRole("button", { name: "저장" }));
    const blank = screen.getByRole("textbox", { name: "항목 1 내용" });
    expect(blank).toHaveFocus();
    expect(blank).toHaveAccessibleDescription("항목 1의 내용을 입력해 주세요.");
    fireEvent.change(blank, { target: { value: "동굴 지도" } });
    await userEvent.click(screen.getByRole("button", { name: "항목 추가" }));
    fireEvent.change(screen.getByRole("textbox", { name: "항목 2 내용" }), { target: { value: "등불 소품" } });
    await userEvent.click(screen.getByRole("checkbox", { name: "항목 2 완료" }));
    fireEvent.change(screen.getByRole("textbox", { name: "태그" }), { target: { value: "2장, 자료" } });
    await userEvent.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => expect(router.state.location.pathname).toMatch(/\/memo\/memo00\/memo-created-\d+$/));
    const memoId = router.state.location.pathname.split("/").at(-1);
    expect(await repository.get(MONP, memoId)).toMatchObject({
      checklist: [
        { done: false, text: "동굴 지도" },
        { done: true, text: "등불 소품" },
      ],
      color: "green",
      pinned: true,
      tags: ["2장", "자료"],
      text: "암수굴 묘사 자료",
      title: "2장 준비",
    });
    expect(await screen.findByRole("heading", { level: 2, name: "2장 준비" })).toBeInTheDocument();
    expect(screen.getByText("체크리스트 1/2 완료")).toBeInTheDocument();
    expect(screen.getByText("초록")).toBeInTheDocument();
  });

  it("pins, archives, and restores from the detail page", async () => {
    const { repository } = renderMemoFlow({ initialPath: "/works/work-monp/memo/memo00/memo-research" });
    await screen.findByRole("heading", { level: 2, name: "자료 조사" });
    await userEvent.click(screen.getByRole("button", { name: "고정" }));
    await waitFor(async () => expect((await repository.get(MONP, "memo-research")).pinned).toBe(true));
    expect(await screen.findByRole("button", { name: "고정 해제" })).toHaveAttribute("aria-pressed", "true");

    await userEvent.click(screen.getByRole("button", { name: "보관" }));
    expect(await screen.findByText("보관된 메모입니다.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "편집" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "복원" }));
    await waitFor(() => expect(screen.queryByText("보관된 메모입니다.")).not.toBeInTheDocument());
    expect((await repository.get(MONP, "memo-research")).archivedAt).toBeNull();
  });
});
