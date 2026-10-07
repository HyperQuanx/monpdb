import { getSchema } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";

export const EMPTY_TIPTAP_DOCUMENT = Object.freeze({
  type: "doc",
  content: Object.freeze([]),
});

export const tiptapExtensions = Object.freeze([
  StarterKit.configure({
    heading: {
      levels: [1, 2, 3],
    },
  }),
]);

const tiptapSchema = getSchema(tiptapExtensions);

export function normalizeTiptapDocument(value) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    value.type !== "doc" ||
    !Array.isArray(value.content)
  ) {
    return EMPTY_TIPTAP_DOCUMENT;
  }

  try {
    tiptapSchema.nodeFromJSON(value);
    JSON.stringify(value);
    return value;
  } catch {
    return EMPTY_TIPTAP_DOCUMENT;
  }
}
