import clsx from "clsx";
import { EMPTY_TIPTAP_DOCUMENT } from "./tiptapExtensions";
import { renderRichTextToSafeHtml } from "./renderRichTextToSafeHtml";
import styles from "./RichTextRenderer.module.css";

export function RichTextRenderer({
  className,
  fallback = "표시할 내용이 없습니다.",
  value = EMPTY_TIPTAP_DOCUMENT,
}) {
  const html = renderRichTextToSafeHtml(value);

  if (!html) {
    return <p className={clsx(styles.fallback, className)}>{fallback}</p>;
  }

  return (
    <div
      className={clsx(styles.content, className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
