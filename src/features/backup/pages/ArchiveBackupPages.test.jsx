import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { createWorkBackupService } from "../../../data/backup/workBackup";
import { appFixture } from "../../../data/fixtures/appFixture";
import { createFixtureContentRelationState } from "../../../data/repositories/fixtureContentRelationState";
import { createFixtureExplorationRepository } from "../../../data/repositories/fixtureExplorationRepository";
import { createFixtureMenuRepository } from "../../../data/repositories/fixtureMenuRepository";
import { createFixturePlotRepository } from "../../../data/repositories/fixturePlotRepository";
import { createFixtureWorldRepository } from "../../../data/repositories/fixtureWorldRepository";
import ArchivePage from "../../archive/pages/ArchivePage";
import BackupPage from "./BackupPage";

const archived = "2026-02-01T00:00:00.000Z";

const renderPage = (path, element) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter([{ path: "/works/:workId/:page", element }], { initialEntries: [path] });
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
};

describe("Task 14 archive page", () => {
  it("restores selected items and reports ones that cannot be restored", async () => {
    const fixture = structuredClone(appFixture);
    fixture.worlds[0].archivedAt = archived;
    fixture.plotScenes[0].archivedAt = archived;
    fixture.menuItems.find(({ id }) => id === "plot01").archivedAt = archived;
    const state = createFixtureContentRelationState(fixture);
    renderPage(
      "/works/work-monp/archive",
      <ArchivePage
        menus={createFixtureMenuRepository(state)}
        repositories={{ plot: createFixturePlotRepository(state), world: createFixtureWorldRepository(state) }}
        repository={createFixtureExplorationRepository(state)}
      />,
    );
    const list = await screen.findByRole("list", { name: "보관된 항목" });
    expect(within(list).getByRole("link", { name: "동부평야지대" })).toHaveAttribute(
      "href",
      "/works/work-monp/world/world01/world-east-plains",
    );
    await userEvent.click(screen.getByRole("checkbox", { name: "전체 선택" }));
    await userEvent.click(screen.getByRole("button", { name: "선택 항목 복원 (2)" }));
    expect(await screen.findByText("1개를 복원했습니다.")).toBeInTheDocument();
    expect(within(screen.getByRole("list", { name: "복원하지 못한 항목" })).getByText(/첫 장의 시작: Plot chapter is archived/)).toBeInTheDocument();
    expect(state.read().worlds[0].archivedAt).toBeNull();
    await waitFor(() => expect(screen.queryByRole("link", { name: "동부평야지대" })).not.toBeInTheDocument());
  });
});

describe("Task 14 backup page", () => {
  it("exports a JSON file and imports it with a preview and replace confirmation", async () => {
    const state = createFixtureContentRelationState(appFixture);
    const service = createWorkBackupService(state, { now: () => "2026-10-01T00:00:00.000Z" });
    const download = vi.fn();
    renderPage("/works/work-monp/backup", <BackupPage download={download} service={service} />);

    await userEvent.click(screen.getByRole("button", { name: "JSON으로 내보내기" }));
    expect(download).toHaveBeenCalledWith("monp-monp-2026-10-01.json", expect.objectContaining({ format: "monp-db-backup" }));
    expect(screen.getByText(/항목 \d+개를 내보냈습니다/)).toBeInTheDocument();

    const backup = download.mock.calls[0][1];
    backup.data.memos.push({ ...structuredClone(backup.data.memos[0]), id: "memo-imported", title: "가져온 메모" });
    const file = new File([JSON.stringify(backup)], "monp.json", { type: "application/json" });
    await userEvent.upload(screen.getByLabelText("백업 파일 선택"), file);
    const table = await screen.findByRole("table", { name: "가져오기 미리보기" });
    const memoRow = within(table).getByRole("row", { name: /메모/ });
    expect(within(memoRow).getAllByRole("cell").map(({ textContent }) => textContent)).toEqual(["3", "1", "0", "0"]);

    await userEvent.click(screen.getByRole("radio", { name: "교체 (백업 내용으로 바꾸기)" }));
    const importButton = screen.getByRole("button", { name: "가져오기 실행" });
    expect(importButton).toBeDisabled();
    await userEvent.click(screen.getByRole("checkbox", { name: "현재 작품의 데이터를 백업 내용으로 교체합니다" }));
    await userEvent.click(importButton);
    expect(await screen.findByText("가져오기를 완료했습니다. 새 항목 1개.")).toBeInTheDocument();
    expect(state.read().memos.map(({ id }) => id)).toContain("memo-imported");
  });

  it("shows corrupt-file and integrity errors without importing", async () => {
    const state = createFixtureContentRelationState(appFixture);
    const service = createWorkBackupService(state);
    renderPage("/works/work-monp/backup", <BackupPage download={vi.fn()} service={service} />);
    await userEvent.upload(screen.getByLabelText("백업 파일 선택"), new File(["{oops"], "bad.json", { type: "application/json" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("JSON 파일을 읽을 수 없습니다");

    const broken = service.exportWork("work-monp");
    // A new relation pointing at a missing entity fails even in merge mode.
    broken.data.relations.push({
      ...structuredClone(broken.data.relations[0]),
      id: "relation-dangling",
      target: { type: "world", id: "world-missing" },
    });
    await userEvent.upload(
      screen.getByLabelText("백업 파일 선택"),
      new File([JSON.stringify(broken)], "broken.json", { type: "application/json" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("무결성 검사에 실패했습니다");
    expect(within(screen.getByRole("list", { name: "문제 목록" })).getAllByRole("listitem").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "가져오기 실행" })).toBeDisabled();
  });
});
