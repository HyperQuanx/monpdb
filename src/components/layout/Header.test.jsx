import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import Header from "./Header";

describe("Header", () => {
  it("opens the global menu from work management", async () => {
    const user = userEvent.setup();
    const onOpenMenu = vi.fn();

    render(
      <MemoryRouter initialEntries={["/works/manage"]}>
        <Header
          isMenuOpen={false}
          work={null}
          onOpenMenu={onOpenMenu}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "작품 관리" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "메뉴 열기" }));
    expect(onOpenMenu).toHaveBeenCalledOnce();
  });

  it("shows the scoped title without a duplicate header menu trigger", () => {
    render(
      <MemoryRouter initialEntries={["/works/work-monp"]}>
        <Header
          isMenuOpen={false}
          work={{ id: "work-monp", title: "MONP" }}
          onOpenMenu={() => {}}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "MONP" })).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "메뉴 열기" }),
    ).not.toBeInTheDocument();
  });
});
