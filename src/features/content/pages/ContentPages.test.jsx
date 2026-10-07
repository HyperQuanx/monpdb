import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createGenericContentFixture } from "../../../test/genericContentFixture";
import { createFixtureContentRelationState } from "../../../data/repositories/fixtureContentRelationState";
import { createFixtureContentRepository } from "../../../data/repositories/fixtureContentRepository";
import { createFixtureRelationRepository } from "../../../data/repositories/fixtureRelationRepository";
import ContentMenuLayout from "../ContentMenuLayout";
import ContentDetailPage from "./ContentDetailPage";
import ContentEditorPage from "./ContentEditorPage";
import ContentListPage from "./ContentListPage";

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
  if (originalElementFromPoint) {
    document.elementFromPoint = originalElementFromPoint;
  } else {
    delete document.elementFromPoint;
  }
  Range.prototype.getClientRects = originalRangeGetClientRects;
  Range.prototype.getBoundingClientRect = originalRangeGetBoundingClientRect;
});

const getMenuItem = (menuItemId, label) => ({
  ...createGenericContentFixture().menuItems.find(({ id }) => id === menuItemId),
  ...(label ? { label } : {}),
});

const createFixture = () => {
  const fixture = createGenericContentFixture();
  fixture.relations.push({
    id: "relation-yeonhwa-plot-opening",
    workId: "work-monp",
    source: { type: "character", id: "character-yeonhwa" },
    target: { type: "generic", id: "generic-mist-note" },
    relationType: "appears-in",
    label: "등장 장면",
    bidirectional: false,
    notes: "범용 콘텐츠 페이지 관계 보존 검증",
    archivedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  });
  return fixture;
};

function renderContentFlow({
  fixture = createFixture(),
  initialPath = "/works/work-monp/notes/notes01",
  menuItem = getMenuItem("notes01", "실시간 1장 기록"),
} = {}) {
  const state = createFixtureContentRelationState(fixture);
  let contentId = 0;
  let relationId = 0;
  const repository = createFixtureContentRepository(state, {
    createId: () => `content-created-${contentId++}`,
    now: () => "2026-10-01T00:00:00.000Z",
  });
  const relations = createFixtureRelationRepository(state, {
    createId: () => `relation-created-${relationId++}`,
    now: () => "2026-10-01T00:00:00.000Z",
  });
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });
  const router = createMemoryRouter(
    [
      {
        id: "content-menu",
        path: "/works/:workId/:sectionId/:menuItemId",
        loader: () => menuItem,
        element: <ContentMenuLayout />,
        children: [
          { index: true, element: <ContentListPage repository={repository} /> },
          {
            path: "new",
            element: (
              <ContentEditorPage
                relations={relations}
                repository={repository}
              />
            ),
          },
          {
            path: ":entryId",
            element: (
              <ContentDetailPage
                relations={relations}
                repository={repository}
              />
            ),
          },
          {
            path: ":entryId/edit",
            element: (
              <ContentEditorPage
                relations={relations}
                repository={repository}
              />
            ),
          },
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

  return { queryClient, relations, repository, router };
}

const findTextNode = (node) => {
  if (node?.type === "text") return node;
  return node?.content?.map(findTextNode).find(Boolean);
};

describe("common content entry flow", () => {
  it("uses the runtime menu label and filters/searches within work and category", async () => {
    const fixture = createFixture();
    const base = structuredClone(fixture.contents[0]);
    fixture.contents.push(
      {
        ...base,
        id: "plot-tag-match",
        title: "숨은 기록",
        summary: "태그 검색 확인용",
        tags: ["고유검색어"],
        order: 1,
      },
      {
        ...base,
        id: "plot-wrong-category",
        menuItemId: "notes02",
        title: "다른 분류 기록",
        order: 2,
      },
      {
        ...base,
        id: "plot-wrong-work",
        workId: "work-moonlit-echoes",
        title: "다른 작품 기록",
        order: 3,
      },
    );
    renderContentFlow({ fixture });

    expect(
      await screen.findByRole("heading", { name: "실시간 1장 기록" }),
    ).toBeInTheDocument();
    expect(await screen.findByText("안개 속의 첫 대사")).toBeInTheDocument();
    expect(screen.getByText("숨은 기록")).toBeInTheDocument();
    expect(screen.queryByText("다른 분류 기록")).not.toBeInTheDocument();
    expect(screen.queryByText("다른 작품 기록")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "추가" })).toHaveAttribute(
      "href",
      "/works/work-monp/notes/notes01/new",
    );

    const user = userEvent.setup();
    await user.type(
      screen.getByRole("searchbox", { name: "실시간 1장 기록 검색" }),
      "고유검색어",
    );
    await waitFor(() =>
      expect(screen.queryByText("안개 속의 첫 대사")).not.toBeInTheDocument(),
    );
    expect(screen.getByText("숨은 기록")).toBeInTheDocument();
  });

  it("focuses and describes the required title error", async () => {
    renderContentFlow({
      initialPath: "/works/work-monp/notes/notes01/new",
    });
    const user = userEvent.setup();
    await screen.findByRole("heading", { name: "새 항목 추가" });

    await user.click(screen.getByRole("button", { name: "저장" }));

    const title = screen.getByRole("textbox", { name: /^제목/ });
    expect(title).toHaveFocus();
    expect(title).toHaveAttribute("aria-invalid", "true");
    expect(title).toHaveAccessibleDescription("제목을 입력해 주세요.");
  });

  it("creates formatted canonical JSON and an outgoing relation before navigating", async () => {
    const { relations, repository, router } = renderContentFlow({
      initialPath: "/works/work-monp/notes/notes01/new",
    });
    const user = userEvent.setup();
    await screen.findByRole("heading", { name: "새 항목 추가" });

    await user.type(screen.getByRole("textbox", { name: /^제목/ }), "새 플롯 기록");
    await user.type(
      screen.getByRole("textbox", { name: "태그" }),
      "서식, 관계, 서식",
    );
    const body = screen.getByRole("textbox", { name: "본문" });
    body.focus();
    await user.type(body, "굵은 본문", { skipClick: true });
    await user.keyboard("{Control>}a{/Control}");
    await user.click(screen.getByRole("button", { name: "굵게" }));
    await user.click(screen.getByRole("button", { name: "관계 추가" }));
    await user.click(screen.getByRole("button", { name: "저장" }));

    expect(
      await screen.findByRole("heading", { name: "새 플롯 기록" }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(
      "/works/work-monp/notes/notes01/content-created-0",
    );
    const created = await repository.get("work-monp", "content-created-0");
    expect(created.tags).toEqual(["서식", "관계"]);
    expect(findTextNode(created.body)).toMatchObject({
      marks: [{ type: "bold" }],
      text: "굵은 본문",
      type: "text",
    });
    await expect(
      relations.list("work-monp", {
        type: "generic",
        id: "content-created-0",
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        source: { type: "generic", id: "content-created-0" },
        target: { type: "generic", id: "generic-mist-note" },
      }),
    ]);
  });

  it("edits outgoing relations without deleting an incoming relation", async () => {
    const { relations } = renderContentFlow({
      initialPath:
        "/works/work-monp/notes/notes01/generic-mist-note/edit",
    });
    const user = userEvent.setup();
    await screen.findByRole("heading", { name: "항목 편집" });

    const incoming = screen.getByRole("heading", { name: "들어오는 관계" })
      .parentElement;
    expect(within(incoming).getByText("등장 장면")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "연화 관계 삭제" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "관계 추가" }));
    await user.click(screen.getByRole("button", { name: "저장" }));
    await screen.findByRole("heading", { name: "안개 속의 첫 대사" });

    const connected = await relations.list("work-monp", {
      type: "generic",
      id: "generic-mist-note",
    });
    expect(connected.map(({ id }) => id)).toContain(
      "relation-yeonhwa-plot-opening",
    );
    expect(connected).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: { type: "generic", id: "generic-mist-note" },
          // The first active candidate other than itself is the dialogue idea.
          target: { type: "idea", id: "idea-dialogue-mist" },
        }),
      ]),
    );
  });

  it("renders canonical body safely and archives without removing relations", async () => {
    const fixture = createFixture();
    fixture.contents[0].status = "published";
    fixture.contents[0].tags = ["안전"];
    fixture.contents[0].body = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: '<img src=x onerror="alert(1)">안전한 본문',
            },
          ],
        },
      ],
    };
    const { relations, repository } = renderContentFlow({
      fixture,
      initialPath: "/works/work-monp/notes/notes01/generic-mist-note",
    });

    const renderedText = await screen.findByText(/<img src=x/);
    expect(renderedText).toHaveTextContent("안전한 본문");
    expect(renderedText.querySelector("img")).toBeNull();
    expect(screen.getByText("published")).toBeInTheDocument();
    expect(screen.getByText("안전")).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "보관" }));
    await screen.findByRole("heading", { name: "실시간 1장 기록" });
    await expect(
      repository.get("work-monp", "generic-mist-note"),
    ).resolves.toMatchObject({ archivedAt: "2026-10-01T00:00:00.000Z" });
    await expect(
      relations.list("work-monp", {
        type: "generic",
        id: "generic-mist-note",
      }),
    ).resolves.toEqual([
      expect.objectContaining({ id: "relation-yeonhwa-plot-opening" }),
    ]);
  });

  it("enforces category semantics while an all-scope menu accepts the resource type", async () => {
    const categoryView = renderContentFlow({
      initialPath:
        "/works/work-monp/notes/notes02/generic-mist-note",
      menuItem: getMenuItem("notes02"),
    });
    expect(
      await screen.findByText("현재 메뉴에서 이 항목을 찾을 수 없습니다."),
    ).toBeInTheDocument();
    categoryView.queryClient.clear();

    renderContentFlow({
      initialPath:
        "/works/work-monp/notes/notes00/generic-mist-note",
      menuItem: getMenuItem("notes00", "전체 자료"),
    });
    expect(
      await screen.findByRole("heading", { name: "안개 속의 첫 대사" }),
    ).toBeInTheDocument();
  });

  it("blocks dirty navigation until the user explicitly discards changes", async () => {
    const { router } = renderContentFlow({
      initialPath: "/works/work-monp/notes/notes01/new",
    });
    const user = userEvent.setup();
    await screen.findByRole("heading", { name: "새 항목 추가" });
    await user.type(screen.getByRole("textbox", { name: /^제목/ }), "미저장 항목");

    await user.click(screen.getByRole("link", { name: "취소" }));
    expect(
      await screen.findByRole("dialog", {
        name: "변경사항을 버리시겠습니까?",
      }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "계속 편집" }));
    expect(router.state.location.pathname).toBe(
      "/works/work-monp/notes/notes01/new",
    );

    await user.click(screen.getByRole("link", { name: "취소" }));
    await user.click(
      await screen.findByRole("button", { name: "변경사항 버리기" }),
    );
    await screen.findByRole("heading", { name: "실시간 1장 기록" });
    expect(router.state.location.pathname).toBe(
      "/works/work-monp/notes/notes01",
    );
  });
});
