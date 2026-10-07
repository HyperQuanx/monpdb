import { useEffect, useId, useRef } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import clsx from "clsx";
import {
  EMPTY_TIPTAP_DOCUMENT,
  normalizeTiptapDocument,
  tiptapExtensions,
} from "./tiptapExtensions";
import styles from "./RichTextEditor.module.css";

const EMPTY_TOOLBAR_STATE = Object.freeze({
  bold: false,
  bulletList: false,
  canRedo: false,
  canUndo: false,
  heading: false,
  italic: false,
  paragraph: false,
});

const documentKey = (value) => JSON.stringify(normalizeTiptapDocument(value));

function ToolbarButton({ active, disabled, label, onClick }) {
  return (
    <button
      aria-label={label}
      aria-pressed={active === undefined ? undefined : active}
      className={styles.toolbarButton}
      disabled={disabled}
      type="button"
      onClick={onClick}
    >
      {label}
    </button>
  );
}

export function RichTextEditor({
  className,
  description,
  disabled = false,
  label = "본문",
  onChange,
  value = EMPTY_TIPTAP_DOCUMENT,
}) {
  const labelId = useId();
  const descriptionId = useId();
  const onChangeRef = useRef(onChange);
  const pendingChangeKeysRef = useRef([]);
  const controlledDocumentKey = documentKey(value);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const editor = useEditor({
    content: JSON.parse(controlledDocumentKey),
    editable: !disabled,
    extensions: tiptapExtensions,
    editorProps: {
      attributes: {
        "aria-describedby": description ? descriptionId : undefined,
        "aria-labelledby": labelId,
        "aria-multiline": "true",
        class: styles.proseMirror,
        role: "textbox",
        spellcheck: "true",
      },
    },
    immediatelyRender: true,
    onUpdate: ({ editor: updatedEditor }) => {
      const nextDocument = updatedEditor.getJSON();
      const nextDocumentKey = documentKey(nextDocument);
      pendingChangeKeysRef.current.push(nextDocumentKey);
      onChangeRef.current?.(nextDocument);
    },
  });

  useEffect(() => {
    if (!editor) {
      return;
    }

    editor.setEditable(!disabled);
  }, [disabled, editor]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    const pendingChangeIndex = pendingChangeKeysRef.current.lastIndexOf(
      controlledDocumentKey,
    );
    if (pendingChangeIndex >= 0) {
      pendingChangeKeysRef.current.splice(0, pendingChangeIndex + 1);
      return;
    }
    if (documentKey(editor.getJSON()) === controlledDocumentKey) {
      return;
    }

    pendingChangeKeysRef.current.length = 0;
    editor.commands.setContent(JSON.parse(controlledDocumentKey), {
      emitUpdate: false,
    });
  }, [controlledDocumentKey, editor]);

  const selectedState = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => {
      if (!currentEditor) {
        return EMPTY_TOOLBAR_STATE;
      }

      return {
        bold: currentEditor.isActive("bold"),
        bulletList: currentEditor.isActive("bulletList"),
        canRedo: currentEditor.can().chain().redo().run(),
        canUndo: currentEditor.can().chain().undo().run(),
        heading: currentEditor.isActive("heading", { level: 2 }),
        italic: currentEditor.isActive("italic"),
        paragraph: currentEditor.isActive("paragraph"),
      };
    },
  });
  const toolbarState = selectedState ?? EMPTY_TOOLBAR_STATE;
  const controlsDisabled = disabled || !editor;

  return (
    <section className={clsx(styles.root, className)}>
      <div className={styles.labelRow}>
        <span className={styles.label} id={labelId}>
          {label}
        </span>
        {description ? (
          <span className={styles.description} id={descriptionId}>
            {description}
          </span>
        ) : null}
      </div>
      <div aria-label="본문 서식" className={styles.toolbar} role="toolbar">
        <ToolbarButton
          active={toolbarState.heading}
          disabled={controlsDisabled}
          label="제목"
          onClick={() =>
            editor?.chain().focus().toggleHeading({ level: 2 }).run()
          }
        />
        <ToolbarButton
          active={toolbarState.paragraph}
          disabled={controlsDisabled}
          label="본문 단락"
          onClick={() => editor?.chain().focus().setParagraph().run()}
        />
        <ToolbarButton
          active={toolbarState.bold}
          disabled={controlsDisabled}
          label="굵게"
          onClick={() => editor?.chain().focus().toggleBold().run()}
        />
        <ToolbarButton
          active={toolbarState.italic}
          disabled={controlsDisabled}
          label="기울임"
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        />
        <ToolbarButton
          active={toolbarState.bulletList}
          disabled={controlsDisabled}
          label="글머리 기호 목록"
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        />
        <span aria-hidden="true" className={styles.separator} />
        <ToolbarButton
          disabled={controlsDisabled || !toolbarState.canUndo}
          label="실행 취소"
          onClick={() => editor?.chain().focus().undo().run()}
        />
        <ToolbarButton
          disabled={controlsDisabled || !toolbarState.canRedo}
          label="다시 실행"
          onClick={() => editor?.chain().focus().redo().run()}
        />
      </div>
      <div className={styles.editorFrame}>
        <EditorContent className={styles.editorContent} editor={editor} />
      </div>
    </section>
  );
}
