import { useState } from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  Button,
  Card,
  Dialog,
  EmptyState,
  Input,
  Sheet,
  Skeleton,
} from "./index";

describe("design system primitives", () => {
  it("renders an accessible button with safe defaults", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(<Button onClick={onClick}>저장</Button>);
    const button = screen.getByRole("button", { name: "저장" });

    expect(button).toHaveAttribute("type", "button");
    await user.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("forwards input labels, descriptions, and invalid state", () => {
    render(
      <div>
        <label htmlFor="character-name">이름</label>
        <Input
          aria-describedby="character-name-error"
          aria-invalid="true"
          id="character-name"
        />
        <p id="character-name-error">이름을 입력하세요.</p>
      </div>,
    );

    const input = screen.getByRole("textbox", { name: "이름" });
    expect(input).toHaveAccessibleDescription("이름을 입력하세요.");
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("supports semantic cards, empty states, and hidden skeletons", () => {
    const { container } = render(
      <>
        <Card as="article">캐릭터 카드</Card>
        <EmptyState
          action={<Button>추가</Button>}
          description="새 항목을 만들어 보세요."
          title="아직 항목이 없습니다"
        />
        <Skeleton aria-label="캐릭터 로딩" />
      </>,
    );

    expect(screen.getByRole("article")).toHaveTextContent("캐릭터 카드");
    expect(
      screen.getByRole("heading", { name: "아직 항목이 없습니다" }),
    ).toBeVisible();
    expect(screen.getByText("새 항목을 만들어 보세요.")).toBeVisible();
    expect(screen.getByRole("button", { name: "추가" })).toBeVisible();
    expect(container.querySelector('[data-ui="skeleton"]')).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });
});

function SheetHarness() {
  const [open, setOpen] = useState(false);

  return (
    <div id="root">
      <button type="button" onClick={() => setOpen(true)}>
        메뉴 열기
      </button>
      <Sheet open={open} title="전체 메뉴" onClose={() => setOpen(false)}>
        <button type="button">첫 번째 메뉴</button>
      </Sheet>
    </div>
  );
}

describe("Sheet", () => {
  it("locks the page, traps focus, and restores focus after Escape", async () => {
    const user = userEvent.setup();
    render(<SheetHarness />);

    const trigger = screen.getByRole("button", { name: "메뉴 열기" });
    await user.click(trigger);

    const dialog = screen.getByRole("dialog", { name: "전체 메뉴" });
    const closeButton = within(dialog).getByRole("button", { name: "닫기" });

    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(document.body).toHaveStyle({ overflow: "hidden" });
    expect(document.getElementById("root")).toHaveAttribute("inert");
    await waitFor(() => expect(closeButton).toHaveFocus());

    await user.tab({ shift: true });
    expect(within(dialog).getByRole("button", { name: "첫 번째 메뉴" })).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "전체 메뉴" })).not.toBeInTheDocument();
    expect(document.body).not.toHaveStyle({ overflow: "hidden" });
    expect(document.getElementById("root")).not.toHaveAttribute("inert");
    expect(trigger).toHaveFocus();
  });
});

function DialogHarness() {
  const [open, setOpen] = useState(true);

  return (
    <div id="root">
      <Dialog
        description="이 작업은 되돌릴 수 있습니다."
        open={open}
        title="항목 보관"
        onClose={() => setOpen(false)}
      >
        <Button onClick={() => setOpen(false)}>확인</Button>
      </Dialog>
    </div>
  );
}

describe("Dialog", () => {
  it("provides an accessible title, description, and action area", async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);

    const dialog = screen.getByRole("dialog", { name: "항목 보관" });
    expect(dialog).toHaveAccessibleDescription(
      "이 작업은 되돌릴 수 있습니다.",
    );

    await user.click(within(dialog).getByRole("button", { name: "확인" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
