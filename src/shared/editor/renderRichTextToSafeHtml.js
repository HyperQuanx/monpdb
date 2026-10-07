import { generateHTML } from "@tiptap/core";
import DOMPurify from "dompurify";
import {
  EMPTY_TIPTAP_DOCUMENT,
  normalizeTiptapDocument,
  tiptapExtensions,
} from "./tiptapExtensions";

const ALLOWED_TAGS = [
  "blockquote",
  "br",
  "code",
  "del",
  "em",
  "h1",
  "h2",
  "h3",
  "hr",
  "li",
  "ol",
  "p",
  "pre",
  "s",
  "strong",
  "u",
  "ul",
];

export function renderRichTextToSafeHtml(value) {
  const document = normalizeTiptapDocument(value);

  if (document === EMPTY_TIPTAP_DOCUMENT && value !== EMPTY_TIPTAP_DOCUMENT) {
    return "";
  }

  try {
    const generatedHtml = generateHTML(document, tiptapExtensions);

    return DOMPurify.sanitize(generatedHtml, {
      ALLOW_ARIA_ATTR: false,
      ALLOW_DATA_ATTR: false,
      ALLOWED_ATTR: [],
      ALLOWED_TAGS,
    });
  } catch {
    return "";
  }
}
