import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { appFixture } from "../../../data/fixtures/appFixture";
import { createFixtureContentRelationState } from "../../../data/repositories/fixtureContentRelationState";
import { createFixtureMenuRepository } from "../../../data/repositories/fixtureMenuRepository";
import { createFixtureRelationRepository } from "../../../data/repositories/fixtureRelationRepository";
import { createFixtureSettingRepository } from "../../../data/repositories/fixtureSettingRepository";
import SettingMenuLayout from "../SettingMenuLayout";
import SettingDetailPage from "./SettingDetailPage";
import SettingEditorPage from "./SettingEditorPage";
import SettingListPage from "./SettingListPage";

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
const SWORD = "setting-cheongun-sword";

const createFixture = () => {
  const fixture = structuredClone(appFixture);
  fixture.settings.push({
    ...structuredClone(fixture.settings[0]),
    id: "setting-shadow-step",
    menuItemId: "setting02",
    categoryId: "setting02",
    categoryName: "서버 통합",
    title: "그림자 보법",
    grade: "특급",
    effect: "그림자 속으로 이동한다.",
    attributes: [],
    tags: ["보법"],
    order: 0,
  });
  return fixture;
};

function renderSettingFlow({
  fixture = createFixture(),
  initialPath = "/works/work-monp/setting/setting01",
  prepare,
} = {}) {
  const state = createFixtureContentRelationState(fixture);
  let settingId = 0;
  let attributeId = 0;
  let relationId = 0;
  let menuId = 0;
  const repository = createFixtureSettingRepository(state, {
    createAttributeId: () => `attribute-created-${attributeId++}`,
    createId: () => `setting-created-${settingId++}`,
    now: () => "2026-10-01T00:00:00.000Z",
  });
  const relations = createFixtureRelationRepository(state, {
    createId: () => `relation-created-${relationId++}`,
    now: () => "2026-10-01T00:00:00.000Z",
  });
  const menus = createFixtureMenuRepository(state, {
    createId: (type) => `${type}-created-${menuId++}`,
  });
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  const props = { menus, relations, repository };
  const router = createMemoryRouter(
    [
      {
        id: "setting-menu",
        path: "/works/:workId/setting/:menuItemId",
        loader: async ({ params }) => {
          await prepare?.(menus);
          return menus.requireActiveItem("setting", params.menuItemId);
        },
        element: <SettingMenuLayout />,
        children: [
          { index: true, element: <SettingListPage {...props} /> },
          { path: "new", element: <SettingEditorPage {...props} /> },
          { path: ":settingId", element: <SettingDetailPage {...props} /> },
          { path: ":settingId/edit", element: <SettingEditorPage {...props} /> },
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

// Configure once per render; the loader runs again on navigation.
const once = (fn) => {
  let done = false;
  return async (menus) => {
    if (done) return;
    done = true;
    await fn(menus);
  };
};

describe("Task 11 Setting pages", () => {
  it("uses renamed category labels and shows grade, effect, and owners on cards", async () => {
    renderSettingFlow({
      prepare: once((menus) => menus.updateItem("setting01", { label: "무기" })),
    });
    expect(await screen.findByRole("heading", { level: 2, name: "무기" })).toBeInTheDocument();
    const card = await screen.findByRole("link", { name: /^청운검법/ });
    expect(card).toHaveAttribute("href", `/works/work-monp/setting/setting01/${SWORD}`);
    for (const text of ["상급", "검기를 구름처럼 흩어 다수의 적을 견제한다.", "연화"]) {
      expect(within(card).getByText(text)).toBeInTheDocument();
    }
    expect(screen.queryByText("그림자 보법")).not.toBeInTheDocument();
  });

  it("filters setting00 by search, grade, and owner in the URL", async () => {
    const { router } = renderSettingFlow({ initialPath: "/works/work-monp/setting/setting00" });
    await screen.findByText("그림자 보법");
    expect(screen.getByRole("link", { name: /^그림자 보법/ })).toHaveTextContent("서버 통합");

    await userEvent.selectOptions(screen.getByLabelText("설정 사용자 필터"), "character-yeonhwa");
    // Both cards vanish while the filtered query loads, so wait for the
    // filtered list itself rather than only the absence of the other card.
    await waitFor(() => {
      expect(screen.queryByText("그림자 보법")).not.toBeInTheDocument();
      expect(screen.getByText("청운검법")).toBeInTheDocument();
    });
    expect(router.state.location.search).toContain("owner=character-yeonhwa");

    await router.navigate("/works/work-monp/setting/setting00?grade=%ED%8A%B9%EA%B8%89");
    expect(await screen.findByText("그림자 보법")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText("청운검법")).not.toBeInTheDocument());
    expect(screen.getByLabelText("설정 등급 필터")).toHaveValue("특급");

    await router.navigate("/works/work-monp/setting/setting00?q=%EC%B2%AD%EC%9A%B4+%EC%A1%B0%EC%82%AC");
    expect(await screen.findByText("청운검법")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText("그림자 보법")).not.toBeInTheDocument());
  });

  it("shows each category's own field set in the editor and detail", async () => {
    const { router } = renderSettingFlow({
      initialPath: "/works/work-monp/setting/setting01/new",
      prepare: once((menus) =>
        menus.updateItem("setting01", { filterConfig: { fields: ["grade", "owners"] } }),
      ),
    });
    await screen.findByRole("heading", { name: "새 설정 자료 추가" });
    expect(screen.getByRole("textbox", { name: "등급" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "사용자" })).toBeInTheDocument();
    for (const hidden of ["효과", "발동 조건", "제한"]) {
      expect(screen.queryByRole("textbox", { name: hidden })).not.toBeInTheDocument();
    }
    expect(screen.getByText(/숨긴 필드\(효과, 발동 조건, 제한\)/)).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByRole("combobox", { name: /^분류/ }), "setting02");
    expect(screen.getByRole("textbox", { name: "발동 조건" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "효과" })).toBeInTheDocument();

    // Revert so the unsaved-changes guard allows leaving the editor.
    await userEvent.selectOptions(screen.getByRole("combobox", { name: /^분류/ }), "setting01");
    await router.navigate(`/works/work-monp/setting/setting01/${SWORD}`);
    await screen.findByRole("heading", { level: 2, name: "청운검법" });
    expect(screen.getByText("상급")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "효과" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "발동 조건" })).not.toBeInTheDocument();
  });

  it("creates an entry in a category added from menu management with owners and attributes", async () => {
    const { relations, repository, router } = renderSettingFlow({
      initialPath: "/works/work-monp/setting/item-created-0/new",
      prepare: once((menus) =>
        menus.createItem("setting", {
          label: "공통 무공",
          slug: "common-arts",
          filterConfig: { fields: ["grade", "effect", "owners"] },
        }),
      ),
    });
    await screen.findByRole("heading", { name: "새 설정 자료 추가" });
    expect(screen.getByRole("combobox", { name: /^분류/ })).toHaveValue("item-created-0");

    fireEvent.change(screen.getByRole("textbox", { name: /^이름/ }), { target: { value: "기초 토납법" } });
    fireEvent.change(screen.getByRole("textbox", { name: "등급" }), { target: { value: "하급" } });
    fireEvent.change(screen.getByRole("textbox", { name: "효과" }), { target: { value: "내공을 순환시킨다." } });
    const owners = screen.getByRole("group", { name: "사용자" });
    await userEvent.click(within(owners).getByRole("checkbox", { name: "연화" }));
    await userEvent.click(within(owners).getByRole("checkbox", { name: "무영" }));
    await userEvent.click(screen.getByRole("button", { name: "속성 추가" }));
    fireEvent.change(screen.getByRole("textbox", { name: "속성 1 이름" }), { target: { value: "수련 기간" } });
    fireEvent.change(screen.getByRole("textbox", { name: "속성 1 값" }), { target: { value: "3개월" } });
    await userEvent.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() =>
      expect(router.state.location.pathname).toBe(
        "/works/work-monp/setting/item-created-0/setting-created-0",
      ),
    );
    expect(await repository.get(MONP, "setting-created-0")).toMatchObject({
      attributes: [{ id: "attribute-created-0", label: "수련 기간", value: "3개월" }],
      categoryId: "item-created-0",
      categoryName: "공통 무공",
      effect: "내공을 순환시킨다.",
      grade: "하급",
      title: "기초 토납법",
    });
    const connected = await relations.list(MONP, { type: "setting", id: "setting-created-0" });
    expect(connected.map(({ relationType, target }) => [relationType, target.id]).sort()).toEqual([
      ["owner", "character-muyeong"],
      ["owner", "character-yeonhwa"],
    ]);

    expect(await screen.findByRole("heading", { level: 2, name: "기초 토납법" })).toBeInTheDocument();
    const ownerList = screen.getByRole("list", { name: "사용자" });
    expect(within(ownerList).getByRole("link", { name: "연화" })).toHaveAttribute(
      "href",
      "/works/work-monp/characters/characters01/character-yeonhwa",
    );
    expect(screen.getByText("수련 기간")).toBeInTheDocument();
    // Owner relations are shown as owners, not duplicated as generic relations.
    const outgoing = screen.getByRole("heading", { name: "나가는 관계" }).closest("section");
    expect(within(outgoing).getByText("연결된 관계가 없습니다.")).toBeInTheDocument();
  });

  it("validates name, category, and attribute names with focus", async () => {
    renderSettingFlow({ initialPath: "/works/work-monp/setting/setting00/new" });
    await screen.findByRole("heading", { name: "새 설정 자료 추가" });
    await userEvent.click(screen.getByRole("button", { name: "저장" }));
    const title = screen.getByRole("textbox", { name: /^이름/ });
    expect(title).toHaveFocus();
    expect(title).toHaveAccessibleDescription("이름을 입력해 주세요.");

    fireEvent.change(title, { target: { value: "분류 없는 설정" } });
    await userEvent.click(screen.getByRole("button", { name: "저장" }));
    const category = screen.getByRole("combobox", { name: /^분류/ });
    expect(category).toHaveFocus();
    expect(category).toHaveAccessibleDescription("설정 분류를 선택해 주세요.");

    await userEvent.selectOptions(category, "setting01");
    await userEvent.click(screen.getByRole("button", { name: "속성 추가" }));
    await userEvent.click(screen.getByRole("button", { name: "저장" }));
    const attribute = screen.getByRole("textbox", { name: "속성 1 이름" });
    expect(attribute).toHaveFocus();
    expect(attribute).toHaveAccessibleDescription("속성 1의 이름을 입력해 주세요.");
  });

  it("preserves archived owners and hidden field values when editing", async () => {
    const fixture = createFixture();
    fixture.characters.find(({ id }) => id === "character-seolha").archivedAt = "2026-02-01T00:00:00.000Z";
    fixture.characters.find(({ id }) => id === "character-muyeong").archivedAt = "2026-02-01T00:00:00.000Z";
    fixture.relations.push({
      ...structuredClone(fixture.relations.find(({ relationType }) => relationType === "owner")),
      id: "relation-sword-owner-muyeong",
      target: { type: "character", id: "character-muyeong" },
    });
    const { relations, repository } = renderSettingFlow({
      fixture,
      initialPath: `/works/work-monp/setting/setting01/${SWORD}/edit`,
      prepare: once((menus) =>
        menus.updateItem("setting01", { filterConfig: { fields: ["grade", "owners"] } }),
      ),
    });
    await screen.findByRole("heading", { name: "설정 자료 편집" });
    const owners = screen.getByRole("group", { name: "사용자" });
    expect(within(owners).getByRole("checkbox", { name: "무영 (보관됨)" })).toBeChecked();
    expect(within(owners).queryByRole("checkbox", { name: /설하/ })).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole("textbox", { name: "등급" }), { target: { value: "최상급" } });
    await userEvent.click(screen.getByRole("button", { name: "저장" }));
    await screen.findByRole("heading", { level: 2, name: "청운검법" });
    expect(await repository.get(MONP, SWORD)).toMatchObject({
      condition: "청운문 입문 3년 이상",
      effect: "검기를 구름처럼 흩어 다수의 적을 견제한다.",
      grade: "최상급",
    });
    const connected = await relations.list(MONP, { type: "setting", id: SWORD });
    expect(connected.map(({ id }) => id).sort()).toEqual([
      "relation-cheongun-sword-owner-yeonhwa",
      "relation-sword-owner-muyeong",
    ]);
    const ownerList = screen.getByRole("list", { name: "사용자" });
    expect(within(ownerList).getByText("보관됨")).toBeInTheDocument();
  });

  it("archives and restores an entry while keeping its owners", async () => {
    const { repository } = renderSettingFlow({
      initialPath: `/works/work-monp/setting/setting01/${SWORD}`,
    });
    await screen.findByRole("heading", { level: 2, name: "청운검법" });
    await userEvent.click(screen.getByRole("button", { name: "보관" }));
    expect(await screen.findByText("보관된 설정 자료입니다. 사용자와 관계는 유지됩니다.")).toBeInTheDocument();
    expect(within(screen.getByRole("list", { name: "사용자" })).getByText("연화")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "복원" }));
    await waitFor(() => expect(screen.queryByText(/보관된 설정 자료입니다/)).not.toBeInTheDocument());
    expect((await repository.get(MONP, SWORD)).archivedAt).toBeNull();
    await expect(repository.listOwners(MONP)).resolves.toMatchObject({
      [SWORD]: ["character-yeonhwa"],
    });
  });
});
