import { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { RichTextEditor } from "./RichTextEditor";
import { EMPTY_TIPTAP_DOCUMENT } from "./tiptapExtensions";

const originalElementFromPoint = document.elementFromPoint;
const originalRangeGetClientRects = Range.prototype.getClientRects;
const originalRangeGetBoundingClientRect = Range.prototype.getBoundingClientRect;

beforeAll(() => {
  document.elementFromPoint = () => null;
  Range.prototype.getClientRects = () => [];
  Range.prototype.getBoundingClientRect = () => ({
    bottom: 0,
    height: 0,
    left: 0,
    right: 0,
    top: 0,
    width: 0,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
});

afterAll(() => {
  if (originalElementFromPoint) {
    document.elementFromPoint = originalElementFromPoint;
  } else {
    delete document.elementFromPoint;
  }
  Range.prototype.getClientRects = originalRangeGetClientRects;
  Range.prototype.getBoundingClientRect = originalRangeGetBoundingClientRect;
});

function EditorHarness() {
  const [value, setValue] = useState(EMPTY_TIPTAP_DOCUMENT);

  return (
    <>
      <RichTextEditor
        description="서식을 적용할 수 있습니다."
        label="작품 본문"
        value={value}
        onChange={setValue}
      />
      <output data-testid="editor-json">{JSON.stringify(value)}</output>
    </>
  );
}

const currentDocument = () =>
  JSON.parse(screen.getByTestId("editor-json").textContent);

const findTextNode = (node) => {
  if (node?.type === "text") {
    return node;
  }

  return node?.content?.map(findTextNode).find(Boolean);
};

describe("RichTextEditor", () => {
  it("emits canonical formatting JSON and supports undo and redo", async () => {
    const user = userEvent.setup();
    render(<EditorHarness />);

    const contentArea = screen.getByRole("textbox", { name: "작품 본문" });
    expect(contentArea).toHaveAccessibleDescription(
      "서식을 적용할 수 있습니다.",
    );

    contentArea.focus();
    await user.type(contentArea, "format text", { skipClick: true });
    await user.keyboard("{Control>}a{/Control}");
    await user.click(screen.getByRole("button", { name: "굵게" }));

    await waitFor(() => {
      expect(findTextNode(currentDocument())).toMatchObject({
        marks: [{ type: "bold" }],
        text: "format text",
        type: "text",
      });
    });
    expect(screen.getByRole("button", { name: "굵게" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    const formattedDocument = currentDocument();
    const undoButton = screen.getByRole("button", { name: "실행 취소" });
    const redoButton = screen.getByRole("button", { name: "다시 실행" });
    expect(undoButton).toBeEnabled();

    await user.click(undoButton);
    await waitFor(() =>
      expect(currentDocument()).not.toEqual(formattedDocument),
    );
    expect(redoButton).toBeEnabled();

    await user.click(redoButton);
    await waitFor(() => expect(currentDocument()).toEqual(formattedDocument));
  });
});
