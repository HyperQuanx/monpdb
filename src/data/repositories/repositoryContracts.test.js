import { describe, expect, it } from "vitest";
import { assertCharacterRepository } from "./characterRepository";
import { assertContentRepository } from "./contentRepository";
import { assertRelationRepository } from "./relationRepository";
import { assertWorldRepository } from "./worldRepository";

const methods = (names) =>
  Object.fromEntries(names.map((name) => [name, () => undefined]));

describe("repository runtime contracts", () => {
  it("requires restore in the complete character contract", () => {
    const repository = methods([
      "list",
      "get",
      "create",
      "update",
      "archive",
      "restore",
      "storeImage",
    ]);
    const withoutRestore = methods([
      "list",
      "get",
      "create",
      "update",
      "archive",
      "storeImage",
    ]);

    expect(assertCharacterRepository(repository)).toBe(repository);
    expect(() => assertCharacterRepository(withoutRestore)).toThrow(
      "Character repository is missing method: restore",
    );
  });

  it("accepts the complete World contract and rejects a missing method", () => {
    const repository = methods([
      "list",
      "get",
      "create",
      "update",
      "archive",
      "restore",
    ]);
    const withoutRestore = methods([
      "list",
      "get",
      "create",
      "update",
      "archive",
    ]);

    expect(assertWorldRepository(repository)).toBe(repository);
    expect(() => assertWorldRepository(withoutRestore)).toThrow(
      "World repository is missing method: restore",
    );
  });

  it("accepts the complete content contract and rejects a missing method", () => {
    const repository = methods([
      "list",
      "get",
      "create",
      "update",
      "archive",
      "restore",
    ]);

    expect(assertContentRepository(repository)).toBe(repository);
    expect(() => assertContentRepository({})).toThrow(
      "Content repository is missing method: list",
    );
  });

  it("accepts the complete relation contract and rejects a missing method", () => {
    const repository = methods([
      "list",
      "listCandidates",
      "create",
      "replaceOutgoing",
      "archive",
      "restore",
    ]);

    expect(assertRelationRepository(repository)).toBe(repository);
    expect(() => assertRelationRepository({})).toThrow(
      "Relation repository is missing method: list",
    );
  });
});
