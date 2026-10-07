import { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { RelationPicker } from "./RelationPicker";

const candidates = [
  {
    endpoint: { id: "target-one", type: "world" },
    label: "첫 번째 대상",
    workId: "work-one",
  },
  {
    endpoint: { id: "target-two", type: "character" },
    label: "두 번째 대상",
    workId: "work-one",
  },
  {
    endpoint: { id: "outside", type: "world" },
    label: "다른 작품 대상",
    workId: "work-two",
  },
];

function RelationHarness() {
  const [relations, setRelations] = useState([]);

  return (
    <>
      <RelationPicker
        candidates={candidates}
        source={{ id: "source", type: "character" }}
        value={relations}
        workId="work-one"
        onChange={setRelations}
      />
      <output data-testid="relation-count">{relations.length}</output>
    </>
  );
}

describe("RelationPicker", () => {
  it("labels existing archived targets without offering them as new targets", () => {
    const archived = {
      archivedAt: "2026-09-01T00:00:00.000Z",
      endpoint: { id: "archived-target", type: "world" },
      label: "보관 대상",
      workId: "work-one",
    };
    render(
      <RelationPicker
        candidates={[...candidates, archived]}
        source={{ id: "source", type: "character" }}
        value={[{
          bidirectional: false,
          label: "관련",
          notes: "기존 메모",
          relationType: "related",
          target: archived.endpoint,
        }]}
        workId="work-one"
      />,
    );

    expect(screen.getByLabelText("보관 대상 관계 메모")).toHaveValue("기존 메모");
    expect(screen.queryByRole("option", { name: "보관 대상" })).not.toBeInTheDocument();
    expect(screen.getByRole("option", { name: "첫 번째 대상" })).toBeInTheDocument();
  });

  it("prevents duplicate targets and makes removed targets available again", async () => {
    const user = userEvent.setup();
    render(<RelationHarness />);

    const candidateSelect = screen.getByRole("combobox", {
      name: "관계 대상 선택",
    });
    expect(
      screen.queryByRole("option", { name: "다른 작품 대상" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "관계 추가" }));
    await waitFor(() =>
      expect(screen.getByTestId("relation-count")).toHaveTextContent("1"),
    );
    expect(
      screen.queryByRole("option", { name: "첫 번째 대상" }),
    ).not.toBeInTheDocument();
    expect(candidateSelect).toHaveValue('["character","target-two"]');

    await user.click(screen.getByRole("button", { name: "관계 추가" }));
    await waitFor(() =>
      expect(screen.getByTestId("relation-count")).toHaveTextContent("2"),
    );
    expect(screen.getByRole("button", { name: "관계 추가" })).toBeDisabled();

    await user.click(
      screen.getByRole("button", { name: "첫 번째 대상 관계 삭제" }),
    );
    await waitFor(() =>
      expect(screen.getByTestId("relation-count")).toHaveTextContent("1"),
    );
    expect(
      screen.getByRole("option", { name: "첫 번째 대상" }),
    ).toBeInTheDocument();
  });
});
