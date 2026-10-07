import { useState } from "react";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  createMemoryRouter,
  Link,
  RouterProvider,
} from "react-router-dom";
import { describe, expect, it } from "vitest";
import { UnsavedChangesGuard } from "./UnsavedChangesGuard";

function EditorRoute() {
  const [isDirty, setIsDirty] = useState(false);

  return (
    <main id="root">
      <h1>편집 화면</h1>
      <button type="button" onClick={() => setIsDirty(true)}>
        변경 만들기
      </button>
      <button type="button" onClick={() => setIsDirty(false)}>
        저장 완료
      </button>
      <Link to="/next">다음 화면</Link>
      <UnsavedChangesGuard isDirty={isDirty} />
    </main>
  );
}

const createTestRouter = () =>
  createMemoryRouter(
    [
      { path: "/", element: <EditorRoute /> },
      { path: "/next", element: <h1>다음 화면</h1> },
    ],
    { initialEntries: ["/"] },
  );

describe("UnsavedChangesGuard", () => {
  it("cancels or proceeds with dirty data-router navigation", async () => {
    const user = userEvent.setup();
    const router = createTestRouter();
    render(<RouterProvider router={router} />);

    await user.click(screen.getByRole("button", { name: "변경 만들기" }));
    await user.click(screen.getByRole("link", { name: "다음 화면" }));

    let dialog = screen.getByRole("dialog", {
      name: "변경사항을 버리시겠습니까?",
    });
    const continueEditing = within(dialog).getByRole("button", {
      name: "계속 편집",
    });
    await waitFor(() => expect(continueEditing).toHaveFocus());

    await user.click(continueEditing);
    expect(screen.getByRole("heading", { name: "편집 화면" })).toBeVisible();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "다음 화면" }));
    screen.getByRole("dialog", {
      name: "변경사항을 버리시겠습니까?",
    });
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "편집 화면" })).toBeVisible();

    await user.click(screen.getByRole("link", { name: "다음 화면" }));
    dialog = screen.getByRole("dialog", {
      name: "변경사항을 버리시겠습니까?",
    });
    await user.click(
      within(dialog).getByRole("button", { name: "변경사항 버리기" }),
    );

    await screen.findByRole("heading", { name: "다음 화면" });
    expect(router.state.location.pathname).toBe("/next");
  });

  it("blocks beforeunload only while changes are dirty", async () => {
    const user = userEvent.setup();
    render(<RouterProvider router={createTestRouter()} />);

    const cleanEvent = new Event("beforeunload", { cancelable: true });
    act(() => window.dispatchEvent(cleanEvent));
    expect(cleanEvent.defaultPrevented).toBe(false);

    await user.click(screen.getByRole("button", { name: "변경 만들기" }));
    const dirtyEvent = new Event("beforeunload", { cancelable: true });
    act(() => window.dispatchEvent(dirtyEvent));
    expect(dirtyEvent.defaultPrevented).toBe(true);

    await user.click(screen.getByRole("button", { name: "저장 완료" }));
    const savedEvent = new Event("beforeunload", { cancelable: true });
    act(() => window.dispatchEvent(savedEvent));
    expect(savedEvent.defaultPrevented).toBe(false);
  });
});
