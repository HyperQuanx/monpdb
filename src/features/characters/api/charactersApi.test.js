import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "../../../test/mocks/server";
import {
  createCharacter,
  getCharacter,
  getCharacters,
  updateCharacter,
  uploadCharacterImage,
} from "./charactersApi";

const apiBaseUrl = "https://qbix-portfolio.shop:8443/api";

describe("characters API contract", () => {
  it("sends region and search filters and returns the response JSON", async () => {
    server.use(
      http.get(`${apiBaseUrl}/characters`, ({ request }) => {
        const url = new URL(request.url);

        expect(url.searchParams.get("regionId")).toBe("characters03");
        expect(url.searchParams.get("q")).toBe("연화");

        return HttpResponse.json([{ id: "character-1", name: "연화" }]);
      }),
    );

    await expect(
      getCharacters({ regionId: "characters03", q: "연화" }),
    ).resolves.toEqual([{ id: "character-1", name: "연화" }]);
  });

  it("keeps the existing GET, POST, and PATCH endpoint shapes", async () => {
    server.use(
      http.get(`${apiBaseUrl}/characters/character-1`, () =>
        HttpResponse.json({ id: "character-1", name: "연화" }),
      ),
      http.post(`${apiBaseUrl}/characters`, async ({ request }) => {
        expect(await request.json()).toEqual({ name: "신규" });
        return HttpResponse.json({ id: "character-2", name: "신규" });
      }),
      http.patch(
        `${apiBaseUrl}/characters/character-1`,
        async ({ request }) => {
          expect(await request.json()).toEqual({ name: "수정" });
          return HttpResponse.json({ id: "character-1", name: "수정" });
        },
      ),
    );

    await expect(getCharacter("character-1")).resolves.toMatchObject({
      name: "연화",
    });
    await expect(createCharacter({ name: "신규" })).resolves.toMatchObject({
      id: "character-2",
    });
    await expect(
      updateCharacter("character-1", { name: "수정" }),
    ).resolves.toMatchObject({ name: "수정" });
  });

  it("uploads the image under the image multipart field", async () => {
    server.use(
      http.post(`${apiBaseUrl}/character-images`, async ({ request }) => {
        const body = await request.formData();
        const image = body.get("image");

        expect(image).not.toBeNull();
        expect(image.type).toBe("image/png");
        expect(image.size).toBeGreaterThan(0);

        return HttpResponse.json({ imageUrl: "/uploads/portrait.png" });
      }),
    );

    const file = new File(["portrait"], "portrait.png", {
      type: "image/png",
    });

    await expect(uploadCharacterImage(file)).resolves.toBe(
      "/uploads/portrait.png",
    );
  });
});

describe("characters API errors", () => {
  it("uses the API message when an error body is JSON", async () => {
    server.use(
      http.get(`${apiBaseUrl}/characters/missing`, () =>
        HttpResponse.json({ message: "캐릭터가 없습니다." }, { status: 404 }),
      ),
    );

    await expect(getCharacter("missing")).rejects.toThrow(
      "캐릭터가 없습니다.",
    );
  });

  it("falls back to the HTTP status when the error body is not JSON", async () => {
    server.use(
      http.get(`${apiBaseUrl}/characters/broken`, () =>
        HttpResponse.text("Unavailable", { status: 503 }),
      ),
    );

    await expect(getCharacter("broken")).rejects.toThrow(
      "Request failed: 503",
    );
  });

  it("rejects an upload response without an image URL", async () => {
    server.use(
      http.post(`${apiBaseUrl}/character-images`, () =>
        HttpResponse.json({ id: "upload-1" }),
      ),
    );

    await expect(
      uploadCharacterImage(new File(["x"], "portrait.png")),
    ).rejects.toThrow("Image upload response is missing imageUrl.");
  });
});
