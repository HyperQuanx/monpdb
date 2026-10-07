import { parseAppFixture } from "../../domain/schemas";

const clone = (value) => structuredClone(value);
const stateMarker = Symbol("fixtureContentRelationState");

export const createFixtureContentRelationState = (fixture) => {
  let current = parseAppFixture(clone(fixture));

  return Object.freeze({
    [stateMarker]: true,

    read() {
      return clone(current);
    },

    replaceWorks(works) {
      current = parseAppFixture({ ...current, works: clone(works) });
    },

    replaceContents(contents) {
      current = parseAppFixture({
        ...current,
        contents: clone(contents),
      });
    },

    replaceCharacters(characters) {
      current = parseAppFixture({
        ...current,
        characters: clone(characters),
      });
    },

    replaceWorlds(worlds) {
      current = parseAppFixture({
        ...current,
        worlds: clone(worlds),
      });
    },

    replaceIdeas(ideas) {
      current = parseAppFixture({
        ...current,
        ideas: clone(ideas),
      });
    },

    replaceMemos(memos) {
      current = parseAppFixture({
        ...current,
        memos: clone(memos),
      });
    },

    replaceSettings(settings) {
      current = parseAppFixture({
        ...current,
        settings: clone(settings),
      });
    },

    replacePlotScenes(plotScenes) {
      current = parseAppFixture({
        ...current,
        plotScenes: clone(plotScenes),
      });
    },

    // Menu management writes here too, so content repositories see new,
    // renamed, reordered, and archived menus in the same session state.
    replaceMenu({ menuSections, menuItems }) {
      current = parseAppFixture({
        ...current,
        menuSections: clone(menuSections),
        menuItems: clone(menuItems),
      });
    },

    // Whole-fixture swap for backup import; validation makes it all-or-nothing.
    replaceAll(fixture) {
      current = parseAppFixture(clone(fixture));
    },

    replaceRelations(relations) {
      current = parseAppFixture({
        ...current,
        relations: clone(relations),
      });
    },
  });
};

export const isFixtureContentRelationState = (value) =>
  Boolean(value?.[stateMarker]);

export const asFixtureContentRelationState = (fixtureOrState) =>
  fixtureOrState?.[stateMarker]
    ? fixtureOrState
    : createFixtureContentRelationState(fixtureOrState);
