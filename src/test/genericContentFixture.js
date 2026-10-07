import { appFixture } from "../data/fixtures/appFixture";

const createdAt = "2026-01-01T00:00:00.000Z";

/**
 * All built-in sections have specialized screens, so generic ContentEntry
 * tests use a user-defined section like one created from menu management.
 */
export const GENERIC_SECTION_ID = "notes";

export const createGenericContentFixture = (base = appFixture) => {
  const fixture = structuredClone(base);
  fixture.menuSections.push({
    id: GENERIC_SECTION_ID,
    label: "자료실",
    icon: "folder",
    order: fixture.menuSections.length,
    archivedAt: null,
  });
  fixture.menuItems.push(
    ...[
      ["notes00", "전체", "all"],
      ["notes01", "참고 자료", "category"],
      ["notes02", "보류 자료", "category"],
    ].map(([id, label, scope], order) => ({
      id,
      sectionId: GENERIC_SECTION_ID,
      label,
      slug: id,
      resourceType: "generic",
      filterConfig: { scope },
      order,
      archivedAt: null,
    })),
  );
  fixture.contents.push({
    id: "generic-mist-note",
    workId: "work-monp",
    menuItemId: "notes01",
    type: "generic",
    title: "안개 속의 첫 대사",
    summary: "연화가 교역로의 이상 징후를 처음 알아차리는 참고 기록",
    body: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "평온하던 교역로에 검은 안개가 번진다." }],
        },
      ],
    },
    tags: ["1장", "도입"],
    status: "draft",
    order: 0,
    version: 1,
    archivedAt: null,
    createdAt,
    updatedAt: createdAt,
  });
  return fixture;
};
