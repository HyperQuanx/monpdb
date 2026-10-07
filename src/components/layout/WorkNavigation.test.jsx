import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { menuSections } from "../../app/menuSections";
import { WorkBottomNavigation, WorkMenuTree } from "./WorkNavigation";

const workId = "work-monp";

describe("WorkMenuTree", () => {
  it("renders all existing menu links with work-scoped hrefs in the sidebar", () => {
    render(
      <MemoryRouter initialEntries={["/works/work-monp"]}>
        <WorkMenuTree variant="sidebar" workId={workId} />
      </MemoryRouter>,
    );

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(
      menuSections.reduce((count, section) => count + section.links.length, 0),
    );
    expect(
      screen.getByRole("link", {
        name: "캐릭터 · 동부평야지대",
        exact: true,
      }),
    ).toHaveAttribute(
      "href",
      "/works/work-monp/characters/characters01",
    );
  });
});

describe("WorkBottomNavigation", () => {
  it("links home, search, and recent while opening the shared menu", async () => {
    const user = userEvent.setup();
    const onOpenMenu = vi.fn();

    render(
      <MemoryRouter initialEntries={["/works/work-monp"]}>
        <WorkBottomNavigation
          isMenuOpen={false}
          workId={workId}
          onOpenMenu={onOpenMenu}
        />
      </MemoryRouter>,
    );

    const navigation = screen.getByRole("navigation", {
      name: "작품 빠른 탐색",
    });
    expect(navigation).toBeVisible();
    expect(screen.getByRole("link", { name: "작품 홈" })).toHaveAttribute(
      "href",
      "/works/work-monp",
    );
    expect(screen.getByRole("link", { name: "검색" })).toHaveAttribute(
      "href",
      "/works/work-monp/search",
    );
    expect(screen.getByRole("link", { name: "최근" })).toHaveAttribute(
      "href",
      "/works/work-monp/recent",
    );

    await user.click(screen.getByRole("button", { name: "메뉴" }));
    expect(onOpenMenu).toHaveBeenCalledOnce();
  });
});

describe("WorkSidebar", () => {
  it("offers search, recent, and relation exploration on desktop", async () => {
    const { WorkSidebar } = await import("./WorkNavigation");
    render(
      <MemoryRouter initialEntries={["/works/work-monp"]}>
        <WorkSidebar menuSections={menuSections} work={{ id: workId, title: "MONP" }} />
      </MemoryRouter>,
    );
    const exploration = screen.getByRole("navigation", { name: "작품 탐색" });
    expect(
      [...exploration.querySelectorAll("a")].map((link) => [link.textContent, link.getAttribute("href")]),
    ).toEqual([
      ["검색", "/works/work-monp/search"],
      ["최근 항목", "/works/work-monp/recent"],
      ["관계 탐색", "/works/work-monp/relations"],
      ["보관함", "/works/work-monp/archive"],
      ["백업", "/works/work-monp/backup"],
    ]);
  });
});
