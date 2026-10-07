export const characterRegions = [
  { id: "characters00", label: "전체", path: "/characters00" },
  { id: "characters01", label: "동부평야지대", path: "/characters01" },
  { id: "characters02", label: "남동하천지대", path: "/characters02" },
  { id: "characters03", label: "북동평야지대", path: "/characters03" },
  { id: "characters04", label: "중부 숲지대", path: "/characters04" },
  { id: "characters05", label: "북부 산악지대", path: "/characters05" },
  { id: "characters06", label: "암수굴", path: "/characters06" },
  { id: "characters07", label: "생사의 탑", path: "/characters07" },
  { id: "characters08", label: "남부 산림지대", path: "/characters08" },
  { id: "characters09", label: "귀주도", path: "/characters09" },
  { id: "characters10", label: "남서 협곡지대", path: "/characters10" },
  { id: "characters11", label: "한야섬", path: "/characters11" },
  { id: "characters12", label: "귀곡성", path: "/characters12" },
];

const resourceTypes = {
  characters: "character",
  world: "world",
  plot: "plot",
  setting: "setting",
  idea: "idea",
  memo: "memo",
};

const sectionIcons = {
  characters: "users",
  world: "globe",
  plot: "route",
  setting: "sparkles",
  idea: "lightbulb",
  memo: "notebook",
};

const createMenuLink = (sectionId, link, order) => {
  const id = link.id ?? link.path.replace(/^\//, "");

  return {
    id,
    sectionId,
    label: link.label,
    path: link.path,
    slug: link.slug ?? id,
    resourceType: resourceTypes[sectionId] ?? "generic",
    filterConfig: {
      legacyPath: link.path,
      scope: id.endsWith("00") ? "all" : "category",
    },
    order,
    archivedAt: null,
  };
};

const createMenuSection = (id, label, links, order) => ({
  id,
  label,
  icon: sectionIcons[id] ?? "folder",
  order,
  archivedAt: null,
  links: links.map((link, linkOrder) =>
    createMenuLink(id, link, linkOrder),
  ),
});

export const menuSections = [
  createMenuSection("characters", "캐릭터", characterRegions, 0),
  createMenuSection(
    "world",
    "세계관",
    [
      { label: "전체", path: "/world00" },
      { label: "동부평야지대", path: "/world01" },
    ],
    1,
  ),
  createMenuSection(
    "plot",
    "플롯",
    [
      { label: "전체", path: "/plot00" },
      { label: "Chapter1", path: "/plot01" },
      { label: "Chapter2", path: "/plot02" },
      { label: "Chapter3", path: "/plot03" },
      { label: "Chapter4", path: "/plot04" },
      { label: "Chapter5", path: "/plot05" },
    ],
    2,
  ),
  createMenuSection(
    "setting",
    "설정",
    [
      { label: "전체", path: "/setting00" },
      { label: "서버", path: "/setting01" },
      { label: "서버 통합", path: "/setting02" },
    ],
    3,
  ),
  createMenuSection(
    "idea",
    "아이디어",
    [
      { label: "전체", path: "/idea00" },
      { label: "캐릭터", path: "/idea01" },
      { label: "대사", path: "/idea02" },
      { label: "장소", path: "/idea03" },
      { label: "아이템", path: "/idea04" },
      { label: "기타", path: "/idea05" },
    ],
    4,
  ),
  createMenuSection(
    "memo",
    "메모",
    [{ label: "전체", path: "/memo00" }],
    5,
  ),
];

export const getMenuItemId = (link) =>
  link.id ?? link.path.replace(/^\//, "");

export const findMenuItem = (
  sectionId,
  menuItemId,
  sections = menuSections,
) => {
  const section = sections.find(({ id }) => id === sectionId);
  const links = section?.items ?? section?.links ?? [];
  const link = links.find((candidate) => getMenuItemId(candidate) === menuItemId);

  return section && link ? { section, link } : null;
};

export const getHeaderTitle = (pathname, workTitle, sections = menuSections) => {
  if (pathname === "/works/manage") {
    return "작품 관리";
  }
  if (pathname === "/menu/manage") {
    return "메뉴 관리";
  }

  const segments = pathname
    .split("/")
    .filter(Boolean)
    .map((segment) => decodeURIComponent(segment));

  if (segments[0] === "works" && segments[1]) {
    if (segments.length === 2) {
      return workTitle || "작품 홈";
    }
    if (segments[2] === "search") {
      return "검색";
    }
    if (segments[2] === "recent") {
      return "최근 항목";
    }
    if (segments[2] === "relations") {
      return "관계 탐색";
    }
    if (segments[2] === "archive") {
      return "보관함";
    }
    if (segments[2] === "backup") {
      return "백업";
    }

    const menuItem = findMenuItem(segments[2], segments[3], sections);
    if (menuItem) {
      return `${menuItem.section.label}-${menuItem.link.label}`;
    }
  }

  for (const section of sections) {
    const links = section.items ?? section.links ?? [];
    const currentLink = links.find((link) => link.path === pathname);

    if (currentLink) {
      return `${section.label}-${currentLink.label}`;
    }
  }

  const characterDetailRegion = characterRegions.find((region) =>
    pathname.startsWith(`${region.path}/`),
  );

  if (characterDetailRegion) {
    return `캐릭터-${characterDetailRegion.label}`;
  }

  return "MONP Storage";
};
