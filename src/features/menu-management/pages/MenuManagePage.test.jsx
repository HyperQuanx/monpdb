import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { appFixture } from "../../../data/fixtures/appFixture";
import { createFixtureMenuRepository } from "../../../data/repositories/fixtureMenuRepository";
import MenuManagePage from "./MenuManagePage";

const renderPage = (repository) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <MenuManagePage repository={repository} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

describe("MenuManagePage", () => {
  it("creates a section and renames, reorders, archives, and restores an item", async () => {
    const user = userEvent.setup();
    const repository = createFixtureMenuRepository({
      menuSections: appFixture.menuSections,
      menuItems: appFixture.menuItems,
    });

    renderPage(repository);

    expect(
      await screen.findByRole("heading", { name: "메뉴 관리" }),
    ).toBeVisible();

    await user.type(screen.getByLabelText("새 섹션 이름"), "연대표");
    await user.click(screen.getByRole("button", { name: "섹션 추가" }));
    expect(
      await screen.findByRole("button", { name: "연대표 섹션 선택" }),
    ).toBeVisible();

    await user.click(screen.getByRole("button", { name: "설정 섹션 선택" }));
    await user.click(screen.getByRole("button", { name: "서버 메뉴 수정" }));
    const itemName = screen.getByLabelText("메뉴 이름");
    await user.clear(itemName);
    await user.type(itemName, "무기");
    await user.click(screen.getByRole("button", { name: "메뉴 변경 저장" }));

    expect(
      await screen.findByRole("button", { name: "무기 메뉴 수정" }),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "무기 아래로 이동" }));
    await user.click(screen.getByRole("button", { name: "무기 메뉴 보관" }));

    const archive = await screen.findByRole("region", {
      name: "보관된 메뉴",
    });
    expect(within(archive).getByText("무기")).toBeVisible();
    await user.click(
      within(archive).getByRole("button", { name: "무기 메뉴 복구" }),
    );
    expect(
      await screen.findByRole("button", { name: "무기 메뉴 수정" }),
    ).toBeVisible();
  });

  it("adds a setting category with its section type and configures field sets", async () => {
    const user = userEvent.setup();
    let idIndex = 0;
    const repository = createFixtureMenuRepository(
      { menuSections: appFixture.menuSections, menuItems: appFixture.menuItems },
      { createId: (type) => `${type}-${idIndex++}` },
    );
    renderPage(repository);
    await user.click(await screen.findByRole("button", { name: "설정 섹션 선택" }));

    expect(screen.getByText("메뉴 유형: 설정 자료 (섹션 기본)")).toBeVisible();
    expect(screen.queryByRole("combobox", { name: "메뉴 유형" })).not.toBeInTheDocument();
    await user.type(screen.getByLabelText("새 메뉴 이름"), "공통 무공");
    await user.type(screen.getByLabelText("새 메뉴 슬러그"), "common-arts");
    await user.click(screen.getByRole("checkbox", { name: "새 메뉴에 표시할 필드: 사용자" }));
    await user.click(screen.getByRole("button", { name: "메뉴 추가" }));

    expect(await screen.findByRole("button", { name: "공통 무공 메뉴 수정" })).toBeVisible();
    const created = (await repository.listItems("setting")).find(({ label }) => label === "공통 무공");
    expect(created).toMatchObject({
      resourceType: "setting",
      filterConfig: { scope: "category", fields: ["grade", "effect", "condition", "limitation"] },
    });

    await user.click(screen.getByRole("button", { name: "서버 메뉴 수정" }));
    const conditionField = screen.getByRole("checkbox", { name: "이 메뉴에 표시할 필드: 발동 조건" });
    expect(conditionField).toBeChecked();
    await user.click(conditionField);
    await user.click(screen.getByRole("button", { name: "메뉴 변경 저장" }));
    await screen.findByRole("button", { name: "서버 메뉴 수정" });
    expect((await repository.getItem("setting01")).filterConfig).toMatchObject({
      scope: "category",
      fields: ["grade", "effect", "limitation", "owners"],
    });

    // A new empty section lets the user choose any type.
    await user.type(screen.getByLabelText("새 섹션 이름"), "연대표");
    await user.click(screen.getByRole("button", { name: "섹션 추가" }));
    await user.click(await screen.findByRole("button", { name: "연대표 섹션 선택" }));
    expect(screen.getByRole("combobox", { name: "메뉴 유형" })).toHaveValue("generic");
  });
});
