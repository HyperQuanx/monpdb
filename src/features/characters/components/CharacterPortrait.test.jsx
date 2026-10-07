import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import CharacterPortrait from "./CharacterPortrait";

describe("CharacterPortrait", () => {
  it("switches once from a broken custom image to the species fallback", () => {
    render(
      <CharacterPortrait
        character={{
          gender: "",
          imageUrl: "https://example.test/broken.png",
          name: "무영",
          species: "마물",
          type: "상급 악마",
        }}
      />,
    );

    const portrait = screen.getByRole("img", { name: "무영 초상" });
    expect(portrait).toHaveAttribute("src", "https://example.test/broken.png");
    fireEvent.error(portrait);
    expect(portrait).toHaveAttribute(
      "src",
      "/coverImage/cover_image_demon.png",
    );
    expect(screen.getByRole("status")).toHaveTextContent("기본 이미지");

    fireEvent.error(portrait);
    expect(portrait).toHaveAttribute(
      "src",
      "/coverImage/cover_image_demon.png",
    );
  });
});
