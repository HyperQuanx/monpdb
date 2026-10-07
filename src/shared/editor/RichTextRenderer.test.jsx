import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RichTextRenderer } from "./RichTextRenderer";
import { renderRichTextToSafeHtml } from "./renderRichTextToSafeHtml";

describe("RichTextRenderer", () => {
  it("renders supported JSON while escaping markup and removing unsafe URLs", () => {
    const value = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              marks: [{ type: "bold" }],
              text: '<img src=x onerror="alert(1)">안전한 본문',
            },
          ],
        },
      ],
    };

    const { container } = render(<RichTextRenderer value={value} />);

    expect(screen.getByText(/안전한 본문/).tagName).toBe("STRONG");
    expect(container.querySelector("img")).not.toBeInTheDocument();
    expect(container.querySelector("script")).not.toBeInTheDocument();

    const unsafeUrlDocument = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              marks: [
                {
                  type: "link",
                  attrs: {
                    href: "javascript:alert(1)",
                    onclick: "alert(1)",
                  },
                },
              ],
              text: "위험한 링크",
            },
          ],
        },
      ],
    };
    const sanitized = renderRichTextToSafeHtml(unsafeUrlDocument);

    expect(sanitized).not.toContain("javascript:");
    expect(sanitized).not.toContain("onclick");
  });

  it("uses a safe fallback for malformed or unsupported JSON", () => {
    const unsupported = {
      type: "doc",
      content: [{ type: "script", attrs: { src: "https://bad.example" } }],
    };

    const { rerender } = render(<RichTextRenderer value={unsupported} />);
    expect(screen.getByText("표시할 내용이 없습니다.")).toBeVisible();
    expect(document.querySelector("script")).not.toBeInTheDocument();

    rerender(<RichTextRenderer value={{ type: "not-a-document" }} />);
    expect(screen.getByText("표시할 내용이 없습니다.")).toBeVisible();
  });
});
