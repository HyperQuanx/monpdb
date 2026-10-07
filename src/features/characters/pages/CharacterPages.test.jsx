import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  RouterProvider,
  createMemoryRouter,
} from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { appFixture } from "../../../data/fixtures/appFixture";
import { createFixtureCharacterRepository } from "../../../data/repositories/fixtureCharacterRepository";
import { createFixtureContentRelationState } from "../../../data/repositories/fixtureContentRelationState";
import { createFixtureMenuRepository } from "../../../data/repositories/fixtureMenuRepository";
import { createFixtureRelationRepository } from "../../../data/repositories/fixtureRelationRepository";
import CharacterMenuLayout from "../CharacterMenuLayout";
import CharacterDetailPage from "./CharacterDetailPage";
import CharacterEditorPage from "./CharacterEditorPage";
import CharacterListPage from "./CharacterListPage";

const createFixture = () => structuredClone(appFixture);
let originalCreateObjectUrl;
let originalRevokeObjectUrl;

beforeEach(() => {
  originalCreateObjectUrl = URL.createObjectURL;
  originalRevokeObjectUrl = URL.revokeObjectURL;
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: vi.fn((file) => `blob:${file.name}`),
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: vi.fn(),
  });
});

afterEach(() => {
  if (originalCreateObjectUrl) {
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: originalCreateObjectUrl,
    });
  } else {
    delete URL.createObjectURL;
  }
  if (originalRevokeObjectUrl) {
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: originalRevokeObjectUrl,
    });
  } else {
    delete URL.revokeObjectURL;
  }
});

function renderCharacterFlow({
  fixture = createFixture(),
  initialPath = "/works/work-monp/characters/characters00",
} = {}) {
  const state = createFixtureContentRelationState(fixture);
  let characterId = 0;
  let relationId = 0;
  const repository = createFixtureCharacterRepository(state, {
    createId: () => `character-created-${characterId++}`,
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
  const pageProps = { menus, repository };
  const relationPageProps = { ...pageProps, relations };
  const router = createMemoryRouter(
    [
      {
        id: "character-menu",
        path: "/works/:workId/characters/:menuItemId",
        loader: ({ params }) =>
          menus.requireActiveItem("characters", params.menuItemId),
        element: <CharacterMenuLayout />,
        children: [
          { index: true, element: <CharacterListPage {...pageProps} /> },
          {
            path: "new",
            element: <CharacterEditorPage {...relationPageProps} />,
          },
          {
            path: ":characterId",
            element: <CharacterDetailPage {...relationPageProps} />,
          },
          {
            path: ":characterId/edit",
            element: <CharacterEditorPage {...relationPageProps} />,
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

  return { listSpy, menus, queryClient, relations, repository, router };
}

const changeByLabel = (label, value) => {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
};

describe("Task 8 character pages", () => {
  it("uses runtime labels, keeps URL filters, and queries only the latest debounced search", async () => {
    const fixture = createFixture();
    fixture.menuItems.find(({ id }) => id === "characters00").label =
      "실시간 전체 인물";
    const { listSpy, router } = renderCharacterFlow({ fixture });

    expect(
      await screen.findByRole("heading", { level: 2, name: "실시간 전체 인물" }),
    ).toBeInTheDocument();
    expect(await screen.findByText("연화")).toBeInTheDocument();
    listSpy.mockClear();

    const search = screen.getByLabelText("캐릭터 검색");
    fireEvent.change(search, { target: { value: "연" } });
    fireEvent.change(search, { target: { value: "연화" } });
    expect(listSpy).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(router.state.location.search).toBe("?q=%EC%97%B0%ED%99%94"),
    );

    await waitFor(
      () =>
        expect(listSpy).toHaveBeenLastCalledWith(
          expect.objectContaining({ q: "연화", regionId: "characters00" }),
        ),
      { timeout: 600 },
    );
    expect(
      listSpy.mock.calls.some(([options]) => options.q === "연"),
    ).toBe(false);

    await userEvent.selectOptions(screen.getByLabelText("종족 필터"), "인간");
    await userEvent.type(screen.getByLabelText("소속 필터"), "청운문");
    await userEvent.selectOptions(screen.getByLabelText("보관 상태 필터"), "전체");
    await waitFor(() => {
      expect(router.state.location.search).toContain("species=%EC%9D%B8%EA%B0%84");
      expect(router.state.location.search).toContain("affiliation=%EC%B2%AD%EC%9A%B4%EB%AC%B8");
      expect(router.state.location.search).toContain("archive=all");
    });
  });

  it("accepts characters00 details, renders all fields, and rejects a concrete-region mismatch", async () => {
    const fixture = createFixture();
    fixture.menuItems.find(({ id }) => id === "characters00").label = "모든 인물";
    renderCharacterFlow({
      fixture,
      initialPath:
        "/works/work-monp/characters/characters00/character-yeonhwa",
    });

    expect(
      await screen.findByRole("heading", { level: 2, name: "연화" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "모든 인물 목록으로" })).toHaveAttribute(
      "href",
      "/works/work-monp/characters/characters00",
    );
    for (const label of [
      "지역",
      "이름",
      "한자 이름",
      "영문 이름",
      "이미지 URL",
      "종족",
      "출생지",
      "성별",
      "생년월일",
      "나이",
      "키",
      "몸무게",
      "직업",
      "성향",
      "소속",
      "파벌",
      "선호",
      "비호",
      "무공, 특성",
      "성격",
      "외형",
      "테마곡",
      "요약",
      "특이사항",
      "라벨 배경색",
      "라벨 글자색",
      "글자색 자동 선택",
    ]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("does not silently show a character under the wrong concrete region", async () => {
    renderCharacterFlow({
      initialPath:
        "/works/work-monp/characters/characters02/character-yeonhwa",
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "현재 지역에서 캐릭터를 찾을 수 없습니다",
    );
    expect(screen.queryByRole("heading", { level: 2, name: "연화" })).not.toBeInTheDocument();
  });

  it("creates every editable field with a relation and enforces the species branch", async () => {
    const { relations, repository, router } = renderCharacterFlow({
      initialPath: "/works/work-monp/characters/characters00/new",
    });
    await screen.findByRole("form", { name: "캐릭터 추가" });

    await userEvent.click(screen.getByRole("button", { name: "저장" }));
    const nameInput = screen.getByLabelText("이름");
    expect(nameInput).toHaveFocus();
    expect(nameInput).toHaveAttribute("aria-invalid", "true");
    expect(nameInput).toHaveAccessibleDescription("이름을 입력해 주세요.");

    changeByLabel("지역", "characters02");
    const values = {
      "이름": "전 필드",
      "한자 이름": "全項目",
      "영문 이름": "All Fields",
      "출생지": "서부",
      "생년월일": "봄",
      "나이": "29",
      "키": "177cm",
      "몸무게": "70kg",
      "직업": "기록자",
      "성향": "중립",
      "소속": "기록단",
      "파벌": "새벽파",
      "테마곡": "새벽",
      "선호": "책",
      "비호": "거짓",
      "무공, 특성": "기록술",
      "성격": "차분함",
      "외형": "은발",
      "요약": "모든 필드 요약",
      "특이사항": "메모",
    };
    for (const [label, value] of Object.entries(values)) changeByLabel(label, value);
    await userEvent.selectOptions(screen.getByLabelText("종족"), "마물");
    expect(screen.queryByLabelText("성별")).not.toBeInTheDocument();
    changeByLabel("마물 구분", "정령");
    fireEvent.change(screen.getByLabelText("라벨 배경색"), {
      target: { value: "#123456" },
    });
    await userEvent.click(screen.getByLabelText("라벨 글자색 자동 선택"));
    fireEvent.change(screen.getByLabelText("라벨 글자색"), {
      target: { value: "#fedcba" },
    });
    await userEvent.click(screen.getByRole("button", { name: "관계 추가" }));
    await userEvent.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() =>
      expect(router.state.location.pathname).toBe(
        "/works/work-monp/characters/characters02/character-created-0",
      ),
    );
    const created = await repository.get("work-monp", "character-created-0");
    expect(created).toMatchObject({
      affiliation: "기록단",
      alignment: "중립",
      appearance: "은발",
      birthDate: "봄",
      birthplace: "서부",
      dislikes: "거짓",
      englishName: "All Fields",
      faction: "새벽파",
      gender: "",
      hanjaName: "全項目",
      height: "177cm",
      likes: "책",
      martialArts: "기록술",
      name: "전 필드",
      notes: "메모",
      occupation: "기록자",
      personality: "차분함",
      profileTheme: {
        autoText: false,
        labelBackground: "#123456",
        labelText: "#fedcba",
      },
      regionId: "characters02",
      species: "마물",
      summary: "모든 필드 요약",
      themeSong: "새벽",
      type: "정령",
      weight: "70kg",
    });
    expect(
      await relations.list("work-monp", {
        type: "character",
        id: created.id,
      }),
    ).toHaveLength(1);
  });

  it("preserves incoming relations, profile theme, and moves edit navigation to the new region", async () => {
    const fixture = createFixture();
    fixture.relations.push({
      id: "relation-world-yeonhwa",
      workId: "work-monp",
      source: { type: "world", id: "world-east-plains" },
      target: { type: "character", id: "character-yeonhwa" },
      relationType: "mentor",
      label: "보호 대상",
      bidirectional: false,
      notes: "들어오는 관계 유지",
      archivedAt: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    const { relations, repository, router } = renderCharacterFlow({
      fixture,
      initialPath:
        "/works/work-monp/characters/characters01/character-yeonhwa/edit",
    });

    expect(await screen.findByText("들어오는 관계 유지")).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText("지역"), "characters02");
    await userEvent.clear(screen.getByLabelText("이름"));
    await userEvent.type(screen.getByLabelText("이름"), "연화 수정");
    await userEvent.click(screen.getByLabelText("라벨 글자색 자동 선택"));
    fireEvent.change(screen.getByLabelText("라벨 글자색"), {
      target: { value: "#102030" },
    });
    await userEvent.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() =>
      expect(router.state.location.pathname).toBe(
        "/works/work-monp/characters/characters02/character-yeonhwa",
      ),
    );
    expect(await repository.get("work-monp", "character-yeonhwa")).toMatchObject({
      name: "연화 수정",
      regionId: "characters02",
      profileTheme: { autoText: false, labelText: "#102030" },
    });
    const connected = await relations.list("work-monp", {
      type: "character",
      id: "character-yeonhwa",
    });
    expect(connected.map(({ id }) => id)).toEqual(
      expect.arrayContaining([
        "relation-yeonhwa-east-plains",
        "relation-world-yeonhwa",
      ]),
    );
  });

  it("reuses the created character id when relation persistence is retried", async () => {
    const { relations, repository, router } = renderCharacterFlow({
      initialPath: "/works/work-monp/characters/characters01/new",
    });
    await screen.findByRole("form", { name: "캐릭터 추가" });
    changeByLabel("이름", "재시도 캐릭터");
    await userEvent.click(screen.getByRole("button", { name: "관계 추가" }));
    vi.spyOn(relations, "replaceOutgoing").mockRejectedValueOnce(
      new Error("관계 저장 실패"),
    );

    await userEvent.click(screen.getByRole("button", { name: "저장" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("관계 저장 실패");
    await userEvent.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() =>
      expect(router.state.location.pathname).toContain("character-created-0"),
    );
    const matches = await repository.list({
      archiveStatus: "all",
      q: "재시도 캐릭터",
      workId: "work-monp",
    });
    expect(matches).toHaveLength(1);
    expect(matches[0].id).toBe("character-created-0");
  });

  it("guards dirty navigation and clears the blocker only when changes are discarded", async () => {
    const { router } = renderCharacterFlow({
      initialPath:
        "/works/work-monp/characters/characters01/character-yeonhwa/edit",
    });
    await screen.findByRole("form", { name: "캐릭터 편집" });
    await userEvent.type(screen.getByLabelText("이름"), " 변경");
    await userEvent.click(screen.getAllByRole("link", { name: "취소" })[0]);

    const dialog = await screen.findByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "계속 편집" }));
    expect(router.state.location.pathname).toContain("/edit");

    await userEvent.click(screen.getAllByRole("link", { name: "취소" })[0]);
    await userEvent.click(
      within(await screen.findByRole("dialog")).getByRole("button", {
        name: "변경사항 버리기",
      }),
    );
    await waitFor(() => expect(router.state.location.pathname).not.toContain("/edit"));
  });

  it("keeps relations visible through archive/restore and offers non-nested list restoration", async () => {
    const { relations, repository } = renderCharacterFlow({
      initialPath:
        "/works/work-monp/characters/characters01/character-yeonhwa",
    });
    expect(await screen.findByText(/출신 지역/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "보관" }));
    expect(await screen.findByText("보관된 캐릭터입니다.")).toBeInTheDocument();
    expect(screen.getByText(/출신 지역/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "복원" }));
    await waitFor(() =>
      expect(screen.queryByText("보관된 캐릭터입니다.")).not.toBeInTheDocument(),
    );
    expect(
      await relations.list("work-monp", {
        type: "character",
        id: "character-yeonhwa",
      }).then((connected) => connected.map(({ id }) => id).sort()),
    ).toEqual([
      "relation-cheongun-sword-owner-yeonhwa",
      "relation-yeonhwa-east-plains",
    ]);
    expect((await repository.get("work-monp", "character-yeonhwa")).archivedAt).toBeNull();

    await repository.archive("work-monp", "character-yeonhwa");
  });

  it("filters archived cards with AND semantics and restores outside the detail link", async () => {
    const fixture = createFixture();
    fixture.characters.find(({ id }) => id === "character-yeonhwa").archivedAt =
      "2026-09-01T00:00:00.000Z";
    const { repository } = renderCharacterFlow({
      fixture,
      initialPath:
        "/works/work-monp/characters/characters00?species=%EC%9D%B8%EA%B0%84&affiliation=%EC%B2%AD%EC%9A%B4%EB%AC%B8&archive=archived",
    });

    const restore = await screen.findByRole("button", { name: "연화 복원" });
    expect(restore.closest("a")).toBeNull();
    expect(screen.queryByText("설하")).not.toBeInTheDocument();
    await userEvent.click(restore);
    expect(await screen.findByText("표시할 캐릭터가 없습니다.")).toBeInTheDocument();
    expect((await repository.get("work-monp", "character-yeonhwa")).archivedAt).toBeNull();
  });

  it("previews file-over-URL, cleans replacement/clear URLs, and reports invalid/store failures", async () => {
    const { repository } = renderCharacterFlow({
      initialPath: "/works/work-monp/characters/characters01/new",
    });
    await screen.findByRole("form", { name: "캐릭터 추가" });
    changeByLabel("이름", "이미지 검사");
    changeByLabel("이미지 URL", "https://example.test/portrait.png");
    const fileInput = screen.getByLabelText("초상 이미지 파일");
    const firstFile = new File(["first"], "first.png", { type: "image/png" });
    const secondFile = new File(["second"], "second.png", { type: "image/png" });

    await userEvent.upload(fileInput, firstFile);
    expect(screen.getByRole("img", { name: "이미지 검사 초상 미리보기" })).toHaveAttribute(
      "src",
      "blob:first.png",
    );
    await userEvent.upload(fileInput, secondFile);
    await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:first.png"));
    await userEvent.click(screen.getByRole("button", { name: "이미지 비우기" }));
    await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:second.png"));

    const invalidFile = new File(["text"], "notes.txt", { type: "text/plain" });
    fireEvent.change(fileInput, { target: { files: [invalidFile] } });
    expect(await screen.findByRole("alert")).toHaveTextContent("이미지 형식");

    fireEvent.change(fileInput, { target: { files: [firstFile] } });
    vi.spyOn(repository, "storeImage").mockRejectedValueOnce(
      new Error("이미지 저장 실패"),
    );
    await userEvent.click(screen.getByRole("button", { name: "저장" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("이미지 저장 실패");
  });

  it("follows external URL filter changes without reverting them", async () => {
    const { router } = renderCharacterFlow();
    expect(await screen.findByText("연화")).toBeInTheDocument();

    await router.navigate(
      "/works/work-monp/characters/characters00?q=missing&affiliation=nowhere",
    );
    await waitFor(() => {
      expect(screen.getByLabelText("캐릭터 검색")).toHaveValue("missing");
      expect(screen.getByLabelText("소속 필터")).toHaveValue("nowhere");
    });
    expect(await screen.findByText("표시할 캐릭터가 없습니다.")).toBeInTheDocument();
    // Outlast the 300ms debounce: a lagging value must not rewrite the URL.
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(router.state.location.search).toBe("?q=missing&affiliation=nowhere");
    expect(screen.getByLabelText("캐릭터 검색")).toHaveValue("missing");
  });
});
