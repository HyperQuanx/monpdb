import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { appFixture } from "../../../data/fixtures/appFixture";
import { createFixtureWorkRepository } from "../../../data/repositories/fixtureWorkRepository";
import WorkManagePage from "./WorkManagePage";

const renderManagement = (repository) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <WorkManagePage repository={repository} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

describe("WorkManagePage", () => {
  it("creates, edits, archives, and restores works in the session", async () => {
    const user = userEvent.setup();
    const repository = createFixtureWorkRepository(appFixture.works, {
      createId: () => "work-created",
      now: () => "2026-09-25T02:00:00.000Z",
    });

    renderManagement(repository);

    expect(
      await screen.findByRole("heading", { name: "작품 관리" }),
    ).toBeVisible();

    await user.type(screen.getByLabelText("작품명"), "새 작품");
    await user.type(screen.getByLabelText("슬러그"), "new-story");
    await user.click(screen.getByRole("button", { name: "작품 추가" }));
    expect(await screen.findByText("새 작품")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "MONP 수정" }));
    const titleInput = screen.getByLabelText("작품명");
    await user.clear(titleInput);
    await user.type(titleInput, "MONP 개정판");
    await user.click(screen.getByRole("button", { name: "변경 저장" }));
    expect(await screen.findByText("MONP 개정판")).toBeVisible();

    await user.click(
      screen.getByRole("button", { name: "MONP 개정판 보관" }),
    );
    const archiveSection = await screen.findByRole("region", {
      name: "보관된 작품",
    });
    expect(within(archiveSection).getByText("MONP 개정판")).toBeVisible();

    await user.click(
      within(archiveSection).getByRole("button", {
        name: "MONP 개정판 복구",
      }),
    );
    expect(
      screen.getByRole("button", { name: "MONP 개정판 보관" }),
    ).toBeVisible();
  });
});
