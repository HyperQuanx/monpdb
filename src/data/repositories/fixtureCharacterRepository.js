import { CharacterSchema } from "../../domain/schemas";
import { assertCharacterRepository } from "./characterRepository";
import { asFixtureContentRelationState } from "./fixtureContentRelationState";

export const MAX_CHARACTER_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

const defaultProfileTheme = {
  labelBackground: "#eeeeee",
  labelText: "#3f3f3f",
  autoText: true,
};

const emptyCharacterFields = {
  hanjaName: "",
  englishName: "",
  imageUrl: "",
  birthplace: "",
  gender: "",
  type: "",
  birthDate: "",
  age: "",
  height: "",
  weight: "",
  occupation: "",
  alignment: "",
  affiliation: "",
  faction: "",
  likes: "",
  dislikes: "",
  martialArts: "",
  personality: "",
  appearance: "",
  themeSong: "",
  summary: "",
  notes: "",
};

const archiveStatuses = new Set(["active", "archived", "all"]);
const clone = (value) => structuredClone(value);
const normalizeSearchText = (value) =>
  String(value ?? "").trim().toLocaleLowerCase("ko-KR");

const searchableFields = [
  "name",
  "hanjaName",
  "englishName",
  "species",
  "type",
  "birthplace",
  "affiliation",
  "faction",
  "occupation",
  "alignment",
  "martialArts",
  "summary",
];

const defaultCreateId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `character-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      const result = reader.result;
      if (typeof result !== "string" || !result.startsWith("data:image/")) {
        reject(new Error("Unable to read image file as an image data URL."));
        return;
      }
      resolve(result);
    });
    reader.addEventListener("error", () =>
      reject(reader.error ?? new Error("Unable to read image file.")),
    );
    reader.addEventListener("abort", () =>
      reject(new Error("Image file reading was aborted.")),
    );
    reader.readAsDataURL(file);
  });

export const createFixtureCharacterRepository = (
  fixtureOrState,
  {
    createId = defaultCreateId,
    now = () => new Date().toISOString(),
  } = {},
) => {
  const state = asFixtureContentRelationState(fixtureOrState);

  const assertWork = (fixture, workId) => {
    if (!fixture.works.some(({ id }) => id === workId)) {
      throw new Error(`Work not found: ${workId}`);
    }
  };

  const findCharacter = (fixture, workId, characterId) => {
    assertWork(fixture, workId);
    const character = fixture.characters.find(
      (candidate) =>
        candidate.workId === workId && candidate.id === characterId,
    );

    if (!character) {
      throw new Error(`Character not found in work ${workId}: ${characterId}`);
    }

    return character;
  };

  const findConcreteCharacterRegion = (fixture, regionId) => {
    if (!regionId || regionId === "characters00") {
      throw new Error("A concrete character region is required.");
    }

    const menuItem = fixture.menuItems.find(({ id }) => id === regionId);
    if (!menuItem) {
      throw new Error(`Character region not found: ${regionId}`);
    }
    if (
      menuItem.sectionId !== "characters" ||
      menuItem.resourceType !== "character" ||
      menuItem.filterConfig.scope !== "category"
    ) {
      throw new Error(`Invalid character region: ${regionId}`);
    }

    const section = fixture.menuSections.find(
      ({ id }) => id === menuItem.sectionId,
    );
    if (menuItem.archivedAt || section?.archivedAt) {
      throw new Error(`Character region is archived: ${regionId}`);
    }

    return menuItem;
  };

  const replaceCharacter = (fixture, updated) => {
    state.replaceCharacters(
      fixture.characters.map((character) =>
        character.workId === updated.workId && character.id === updated.id
          ? updated
          : character,
      ),
    );
    return clone(updated);
  };

  const repository = {
    async list({
      workId,
      regionId,
      q,
      species,
      affiliation,
      archiveStatus = "active",
    } = {}) {
      const fixture = state.read();
      assertWork(fixture, workId);
      if (!archiveStatuses.has(archiveStatus)) {
        throw new Error(`Invalid character archive status: ${archiveStatus}`);
      }

      const normalizedQuery = normalizeSearchText(q);
      const normalizedSpecies = normalizeSearchText(species);
      const normalizedAffiliation = normalizeSearchText(affiliation);

      return clone(
        fixture.characters.filter((character) => {
          if (character.workId !== workId) {
            return false;
          }

          const matchesArchive =
            archiveStatus === "all" ||
            (archiveStatus === "archived"
              ? Boolean(character.archivedAt)
              : !character.archivedAt);
          const matchesRegion =
            !regionId ||
            regionId === "characters00" ||
            character.regionId === regionId;
          const matchesSpecies =
            !normalizedSpecies ||
            normalizeSearchText(character.species) === normalizedSpecies;
          const matchesAffiliation =
            !normalizedAffiliation ||
            normalizeSearchText(character.affiliation) ===
              normalizedAffiliation;
          const matchesSearch =
            !normalizedQuery ||
            searchableFields.some((field) =>
              normalizeSearchText(character[field]).includes(normalizedQuery),
            );

          return (
            matchesArchive &&
            matchesRegion &&
            matchesSpecies &&
            matchesAffiliation &&
            matchesSearch
          );
        }),
      );
    },

    async get(workId, characterId) {
      const fixture = state.read();
      return clone(findCharacter(fixture, workId, characterId));
    },

    async create(workId, characterData = {}) {
      const fixture = state.read();
      assertWork(fixture, workId);
      const input = clone(characterData);
      const region = findConcreteCharacterRegion(fixture, input.regionId);
      const timestamp = now();
      const species = input.species ?? "인간";
      const character = CharacterSchema.parse({
        ...emptyCharacterFields,
        ...input,
        id: createId(),
        workId,
        menuItemId: region.id,
        resourceType: "character",
        regionId: region.id,
        regionName: region.label,
        name: String(input.name ?? "").trim(),
        species,
        gender: species === "마물" ? "" : (input.gender ?? ""),
        type: species === "인간" ? "" : (input.type ?? ""),
        profileTheme: clone(input.profileTheme ?? defaultProfileTheme),
        version: 1,
        archivedAt: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      });

      if (fixture.characters.some(({ id }) => id === character.id)) {
        throw new Error(`Duplicate character id: ${character.id}`);
      }
      state.replaceCharacters([...fixture.characters, character]);

      return clone(character);
    },

    async update(workId, characterId, updates = {}) {
      const fixture = state.read();
      const existing = findCharacter(fixture, workId, characterId);
      const input = clone(updates);
      const region = findConcreteCharacterRegion(
        fixture,
        input.regionId ?? existing.regionId,
      );
      const species = input.species ?? existing.species;
      const updated = CharacterSchema.parse({
        ...existing,
        ...input,
        id: existing.id,
        workId: existing.workId,
        menuItemId: region.id,
        resourceType: "character",
        regionId: region.id,
        regionName: region.label,
        name: String(input.name ?? existing.name).trim(),
        species,
        gender:
          species === "마물" ? "" : (input.gender ?? existing.gender),
        type: species === "인간" ? "" : (input.type ?? existing.type),
        version: existing.version + 1,
        archivedAt: existing.archivedAt,
        createdAt: existing.createdAt,
        updatedAt: now(),
      });

      return replaceCharacter(fixture, updated);
    },

    async archive(workId, characterId) {
      const fixture = state.read();
      const existing = findCharacter(fixture, workId, characterId);
      if (existing.archivedAt) {
        return clone(existing);
      }
      const timestamp = now();
      const archived = CharacterSchema.parse({
        ...existing,
        archivedAt: timestamp,
        updatedAt: timestamp,
        version: existing.version + 1,
      });

      return replaceCharacter(fixture, archived);
    },

    async restore(workId, characterId) {
      const fixture = state.read();
      const existing = findCharacter(fixture, workId, characterId);
      if (!existing.archivedAt) {
        return clone(existing);
      }
      const restored = CharacterSchema.parse({
        ...existing,
        archivedAt: null,
        updatedAt: now(),
        version: existing.version + 1,
      });

      return replaceCharacter(fixture, restored);
    },

    async storeImage(file) {
      if (
        !file ||
        typeof file.type !== "string" ||
        typeof file.size !== "number"
      ) {
        throw new TypeError("An image file is required.");
      }
      if (!file.type.toLocaleLowerCase().startsWith("image/")) {
        throw new TypeError("Character image must use an image MIME type.");
      }
      if (file.size > MAX_CHARACTER_IMAGE_SIZE_BYTES) {
        throw new RangeError(
          `Character image must not exceed ${MAX_CHARACTER_IMAGE_SIZE_BYTES} bytes.`,
        );
      }

      return readFileAsDataUrl(file);
    },
  };

  return assertCharacterRepository(repository);
};
