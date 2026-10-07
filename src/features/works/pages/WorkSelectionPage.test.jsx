import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useParams } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { appFixture } from "../../../data/fixtures/appFixture";
import { createFixtureWorkRepository } from "../../../data/repositories/fixtureWorkRepository";
import WorkSelectionPage from "./WorkSelectionPage";

function WorkRouteProbe() {
  const { workId } = useParams();
  return <h1>{`작품 화면 ${workId}`}</h1>;
}

const renderSelection = (repository) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<WorkSelectionPage repository={repository} />} />
          <Route path="/works/:workId" element={<WorkRouteProbe />} />
          <Route path="/works/manage" element={<h1>작품 관리 화면</h1>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

describe("WorkSelectionPage", () => {
  it.each([
    ["MONP", "work-monp"],
    ["월하의 잔향", "work-moonlit-echoes"],
  ])("enters the selected work-scoped home for %s", async (title, workId) => {
    const user = userEvent.setup();
    const repository = createFixtureWorkRepository(appFixture.works);

    renderSelection(repository);

    expect(
      await screen.findByRole("heading", { name: "작품을 선택하세요" }),
    ).toBeVisible();
    expect(screen.queryByRole("button", { name: "메뉴 열기" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "작품 관리" })).not.toBeInTheDocument();

    await user.click(
      await screen.findByRole("button", { name: `${title} 열기` }),
    );
    expect(
      await screen.findByRole("heading", {
        name: `작품 화면 ${workId}`,
      }),
    ).toBeVisible();
  });

  it("shows the management action only when there are no active works", async () => {
    const repository = createFixtureWorkRepository([]);

    renderSelection(repository);

    expect(
      await screen.findByRole("heading", { name: "선택할 작품이 없습니다" }),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "작품 관리 열기" })).toHaveAttribute(
      "href",
      "/works/manage",
    );
  });
});
