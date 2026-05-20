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

export const menuSections = [
  {
    id: "characters",
    label: "캐릭터",
    links: characterRegions.map(({ label, path }) => ({ label, path })),
  },
  {
    id: "world",
    label: "세계관",
    links: [{ label: "던전", path: "/items" }],
  },
  {
    id: "plot",
    label: "플롯",
    links: [
      { label: "전체", path: "/plot00" },
      { label: "Chapter1", path: "/plot01" },
      { label: "Chapter2", path: "/plot02" },
      { label: "Chapter3", path: "/plot03" },
      { label: "Chapter4", path: "/plot04" },
      { label: "Chapter5", path: "/plot05" },
    ],
  },
  {
    id: "setting",
    label: "설정",
    links: [
      { label: "전체", path: "/setting00" },
      { label: "서버", path: "/setting01" },
      { label: "서버 통합", path: "/setting02" },
    ],
  },
  {
    id: "idea",
    label: "아이디어",
    links: [
      { label: "전체", path: "/idea00" },
      { label: "캐릭터", path: "/idea01" },
      { label: "대사", path: "/idea02" },
      { label: "장소", path: "/idea03" },
      { label: "아이템", path: "/idea04" },
      { label: "기타", path: "/idea05" },
    ],
  },
  {
    id: "memo",
    label: "메모",
    links: [{ label: "전체", path: "/memo00" }],
  },
];

export const getHeaderTitle = (pathname) => {
  for (const section of menuSections) {
    const currentLink = section.links.find((link) => link.path === pathname);

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
