import { describe, expect, it } from "vitest";
import {
  characterCreatePath,
  characterDetailPath,
  characterEditPath,
  characterListPath,
  menuItemIdFromLegacyPath,
  workEntryDetailPath,
  workEntryEditPath,
  workEntryNewPath,
  workHomePath,
  workManagePath,
  workMenuPath,
  workRecentPath,
  workSearchPath,
  ideaDetailPath,
  ideaEditPath,
  memoCreatePath,
  memoDetailPath,
  plotCreatePath,
  plotDetailPath,
  plotEditPath,
  plotListPath,
  settingCreatePath,
  settingDetailPath,
  settingEditPath,
  settingListPath,
  worldCreatePath,
  worldDetailPath,
  worldEditPath,
  worldListPath,
} from "./paths";

describe("work-scoped paths", () => {
  it("builds home, menu, create, detail, search, and recent paths", () => {
    expect(workHomePath("work-monp")).toBe("/works/work-monp");
    expect(workMenuPath("work-monp", "characters", "characters01")).toBe(
      "/works/work-monp/characters/characters01",
    );
    expect(
      workEntryNewPath("work-monp", "characters", "characters01"),
    ).toBe("/works/work-monp/characters/characters01/new");
    expect(
      workEntryDetailPath(
        "work-monp",
        "characters",
        "characters01",
        "character-1",
      ),
    ).toBe("/works/work-monp/characters/characters01/character-1");
    expect(
      workEntryEditPath(
        "work-monp",
        "characters",
        "characters01",
        "character-1",
      ),
    ).toBe("/works/work-monp/characters/characters01/character-1/edit");
    expect(workSearchPath("work-monp")).toBe("/works/work-monp/search");
    expect(workRecentPath("work-monp")).toBe("/works/work-monp/recent");
    expect(workManagePath()).toBe("/works/manage");
  });

  it("encodes every dynamic path segment", () => {
    expect(workMenuPath("작품 1", "세계 관", "동부/지역")).toBe(
      "/works/%EC%9E%91%ED%92%88%201/%EC%84%B8%EA%B3%84%20%EA%B4%80/%EB%8F%99%EB%B6%80%2F%EC%A7%80%EC%97%AD",
    );
  });

  it("provides character wrappers and legacy item id conversion", () => {
    expect(characterListPath("work-monp", "characters03")).toBe(
      "/works/work-monp/characters/characters03",
    );
    expect(characterCreatePath("work-monp", "characters03")).toBe(
      "/works/work-monp/characters/characters03/new",
    );
    expect(
      characterDetailPath("work-monp", "characters03", "character-1"),
    ).toBe("/works/work-monp/characters/characters03/character-1");
    expect(
      characterEditPath("work-monp", "characters03", "character-1"),
    ).toBe("/works/work-monp/characters/characters03/character-1/edit");
    expect(worldListPath("work-monp", "world01")).toBe(
      "/works/work-monp/world/world01",
    );
    expect(worldCreatePath("work-monp", "world01")).toBe(
      "/works/work-monp/world/world01/new",
    );
    expect(worldDetailPath("work-monp", "world01", "world-east-plains")).toBe(
      "/works/work-monp/world/world01/world-east-plains",
    );
    expect(worldEditPath("work-monp", "world01", "world-east-plains")).toBe(
      "/works/work-monp/world/world01/world-east-plains/edit",
    );
    expect(plotListPath("work-monp", "plot01")).toBe(
      "/works/work-monp/plot/plot01",
    );
    expect(plotCreatePath("work-monp", "plot01")).toBe(
      "/works/work-monp/plot/plot01/new",
    );
    expect(plotDetailPath("work-monp", "plot01", "plot-a b")).toBe(
      "/works/work-monp/plot/plot01/plot-a%20b",
    );
    expect(plotEditPath("work-monp", "plot01", "plot-1")).toBe(
      "/works/work-monp/plot/plot01/plot-1/edit",
    );
    expect(settingListPath("work-monp", "setting01")).toBe(
      "/works/work-monp/setting/setting01",
    );
    expect(settingCreatePath("work-monp", "setting01")).toBe(
      "/works/work-monp/setting/setting01/new",
    );
    expect(settingDetailPath("work-monp", "setting01", "setting-1")).toBe(
      "/works/work-monp/setting/setting01/setting-1",
    );
    expect(settingEditPath("work-monp", "setting01", "setting-1")).toBe(
      "/works/work-monp/setting/setting01/setting-1/edit",
    );
    expect(ideaDetailPath("work-monp", "idea02", "idea-1")).toBe(
      "/works/work-monp/idea/idea02/idea-1",
    );
    expect(ideaEditPath("work-monp", "idea02", "idea-1")).toBe(
      "/works/work-monp/idea/idea02/idea-1/edit",
    );
    expect(memoCreatePath("work-monp", "memo00")).toBe("/works/work-monp/memo/memo00/new");
    expect(memoDetailPath("work-monp", "memo00", "memo-1")).toBe(
      "/works/work-monp/memo/memo00/memo-1",
    );
    expect(menuItemIdFromLegacyPath("/characters03")).toBe("characters03");
  });
});
