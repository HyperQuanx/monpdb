import { flushSync } from "react-dom";
import { useId, useRef, useState } from "react";
import {
  Link,
  useNavigate,
  useOutletContext,
  useParams,
} from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { Plus, Save, Trash2 } from "lucide-react";
import { memoDetailPath, memoListPath } from "../../../app/paths";
import {
  memoQueryKeys,
  memoRepository,
  menuQueryKeys,
  menuRepository,
} from "../../../data/repositories/appRepositories";
import { UnsavedChangesGuard } from "../../../shared/hooks";
import { parseCommaSeparated } from "../../../shared/relations/relationDrafts";
import { Button, Input, Skeleton } from "../../../shared/ui";
import colorStyles from "../components/memoColors.module.css";
import { MEMO_COLORS, isAllMemoMenu, isUsableMemoMenu, memoBelongsToMenu } from "../memos";
import styles from "./MemoEditorPage.module.css";

function MemoEditorForm({ entry, menuItem, menuItems, repository, route }) {
  const { memoId, menuItemId, workId } = route;
  const isEdit = Boolean(memoId);
  const initialDraft = {
    checklist: (entry?.checklist ?? []).map((item) => ({ ...item })),
    color: entry?.color ?? "default",
    menuItemId: entry?.menuItemId ?? menuItem.id,
    pinned: entry?.pinned ?? false,
    tags: entry?.tags?.join(", ") ?? "",
    text: entry?.text ?? "",
    title: entry?.title ?? "",
  };
  const [draft, setDraft] = useState(initialDraft);
  const [titleError, setTitleError] = useState("");
  const [checklistError, setChecklistError] = useState("");
  const [formError, setFormError] = useState("");
  const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify(initialDraft));
  const createdRef = useRef(null);
  const titleRef = useRef(null);
  const checklistRef = useRef(null);
  const titleErrorId = useId();
  const checklistErrorId = useId();
  const colorGroupId = useId();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentSnapshot = JSON.stringify(draft);
  const isDirty = currentSnapshot !== savedSnapshot;
  const cancelPath = isEdit ? memoDetailPath(workId, menuItemId, memoId) : memoListPath(workId, menuItemId);
  const usableMenus = menuItems.filter(isUsableMemoMenu);

  const setField = (field) => (event) => {
    const value = event.target.value;
    setDraft((current) => ({ ...current, [field]: value }));
  };
  const updateItem = (index, patch) => {
    setDraft((current) => ({
      ...current,
      checklist: current.checklist.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    }));
    if (checklistError) setChecklistError("");
  };

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      if (isEdit) return repository.update(workId, memoId, payload);
      if (createdRef.current) return repository.update(workId, createdRef.current.id, payload);
      const created = await repository.create(workId, payload);
      createdRef.current = created;
      return created;
    },
    onSuccess: async (saved) => {
      queryClient.setQueryData(memoQueryKeys.detail(workId, saved.id), saved);
      await queryClient.invalidateQueries({ queryKey: memoQueryKeys.all(workId) });
      flushSync(() => setSavedSnapshot(currentSnapshot));
      const destination = isAllMemoMenu(menuItem) ? menuItem.id : saved.menuItemId;
      navigate(memoDetailPath(workId, destination, saved.id), { replace: true });
    },
    onError: (error) => setFormError(error?.message || "메모를 저장하지 못했습니다."),
  });

  const handleSubmit = (event) => {
    event.preventDefault();
    setFormError("");
    const title = draft.title.trim();
    if (!title) {
      setTitleError("제목을 입력해 주세요.");
      titleRef.current?.focus();
      return;
    }
    setTitleError("");
    const blankIndex = draft.checklist.findIndex(({ text }) => !text.trim());
    if (blankIndex >= 0) {
      setChecklistError(`항목 ${blankIndex + 1}의 내용을 입력해 주세요.`);
      checklistRef.current?.querySelectorAll("[data-checklist-text]")[blankIndex]?.focus();
      return;
    }
    setChecklistError("");
    saveMutation.mutate({
      checklist: draft.checklist.map((item) => ({
        ...(item.id ? { id: item.id } : {}),
        done: Boolean(item.done),
        text: item.text.trim(),
      })),
      color: draft.color,
      menuItemId: draft.menuItemId,
      pinned: draft.pinned,
      tags: parseCommaSeparated(draft.tags),
      text: draft.text,
      title,
    });
  };

  return (
    <>
      <form
        aria-label={`${menuItem.label} 메모 ${isEdit ? "편집" : "추가"}`}
        className={clsx(styles.form)}
        noValidate
        onSubmit={handleSubmit}
      >
        <header className={styles.header}>
          <span className={styles.eyebrow}>{menuItem.label}</span>
          <h2>{isEdit ? "메모 편집" : "새 메모"}</h2>
        </header>

        <label className={styles.field}>
          <span>제목 <strong aria-hidden="true">*</strong></span>
          <Input
            aria-describedby={titleError ? titleErrorId : undefined}
            aria-invalid={Boolean(titleError)}
            autoFocus
            className={styles.control}
            ref={titleRef}
            value={draft.title}
            onChange={(event) => {
              setField("title")(event);
              if (titleError) setTitleError("");
            }}
          />
          {titleError ? <span className={styles.fieldError} id={titleErrorId} role="alert">{titleError}</span> : null}
        </label>

        <label className={styles.field}>
          <span>내용</span>
          <textarea className={styles.textarea} rows="5" value={draft.text} onChange={setField("text")} />
        </label>

        {usableMenus.length > 1 ? (
          <label className={styles.field}>
            <span>메모 분류</span>
            <select className={styles.control} value={draft.menuItemId} onChange={setField("menuItemId")}>
              {usableMenus.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
          </label>
        ) : null}

        <fieldset aria-describedby={colorGroupId} className={styles.fieldset}>
          <legend>색상</legend>
          <p className={styles.helper} id={colorGroupId}>목록에서 메모를 구분하는 배경색입니다.</p>
          <div className={styles.checkboxGrid}>
            {MEMO_COLORS.map(([value, label]) => (
              <label className={clsx(styles.checkboxLabel, colorStyles[value])} key={value}>
                <input
                  checked={draft.color === value}
                  name="memo-color"
                  type="radio"
                  value={value}
                  onChange={setField("color")}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className={styles.checkboxLabel}>
          <input
            checked={draft.pinned}
            type="checkbox"
            onChange={(event) => setDraft((current) => ({ ...current, pinned: event.target.checked }))}
          />
          <span>목록 맨 위에 고정</span>
        </label>

        <fieldset className={styles.fieldset} ref={checklistRef}>
          <legend>체크리스트</legend>
          {draft.checklist.map((item, index) => {
            const number = index + 1;
            return (
              <div className={styles.clueRow} key={item.id ?? `new-${index}`}>
                <label className={styles.checkboxLabel}>
                  <input
                    aria-label={`항목 ${number} 완료`}
                    checked={Boolean(item.done)}
                    type="checkbox"
                    onChange={(event) => updateItem(index, { done: event.target.checked })}
                  />
                  <span>완료</span>
                </label>
                <Input
                  aria-describedby={checklistError ? checklistErrorId : undefined}
                  aria-label={`항목 ${number} 내용`}
                  className={styles.control}
                  data-checklist-text=""
                  value={item.text}
                  onChange={(event) => updateItem(index, { text: event.target.value })}
                />
                <Button
                  aria-label={`항목 ${number} 삭제`}
                  className={styles.clueRemove}
                  size="small"
                  variant="ghost"
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      checklist: current.checklist.filter((_, itemIndex) => itemIndex !== index),
                    }))
                  }
                >
                  <Trash2 aria-hidden="true" size={17} />
                  삭제
                </Button>
              </div>
            );
          })}
          {checklistError ? <span className={styles.fieldError} id={checklistErrorId} role="alert">{checklistError}</span> : null}
          <Button
            className={styles.clueAdd}
            size="small"
            variant="secondary"
            onClick={() =>
              setDraft((current) => ({
                ...current,
                checklist: [...current.checklist, { done: false, text: "" }],
              }))
            }
          >
            <Plus aria-hidden="true" size={17} />
            항목 추가
          </Button>
        </fieldset>

        <label className={styles.field}>
          <span>태그</span>
          <Input aria-label="태그" className={styles.control} placeholder="쉼표로 구분" value={draft.tags} onChange={setField("tags")} />
        </label>

        {formError ? <p className={styles.formError} role="alert">{formError}</p> : null}

        <div className={styles.actions}>
          <Button as={Link} to={cancelPath} variant="secondary">취소</Button>
          <Button disabled={saveMutation.isPending} type="submit">
            <Save aria-hidden="true" size={18} />
            {saveMutation.isPending ? "저장 중…" : "저장"}
          </Button>
        </div>
      </form>
      <UnsavedChangesGuard isDirty={isDirty} />
    </>
  );
}

function MemoEditorPage({ menus = menuRepository, repository = memoRepository }) {
  const { menuItem } = useOutletContext();
  const route = useParams();
  const { memoId, workId } = route;
  const isEdit = Boolean(memoId);
  const entryQuery = useQuery({
    enabled: isEdit,
    networkMode: "always",
    queryKey: memoQueryKeys.detail(workId, memoId),
    queryFn: () => repository.get(workId, memoId),
    retry: false,
  });
  const menusQuery = useQuery({
    networkMode: "always",
    queryKey: menuQueryKeys.items("memo", true),
    queryFn: () => menus.listItems("memo", { includeArchived: true }),
    retry: false,
  });
  const entry = entryQuery.data;
  const failed = menusQuery.isError || (isEdit && entryQuery.isError);
  const loading = !failed && (menusQuery.isPending || (isEdit && entryQuery.isPending));

  if (loading) {
    return (
      <div aria-live="polite" className={styles.state} role="status">
        <Skeleton className={styles.loadingSkeleton} />
        <span>메모 편집기를 준비하는 중입니다.</span>
      </div>
    );
  }

  if (failed || (isEdit && (!entry || !memoBelongsToMenu(entry, menuItem) || entry.archivedAt))) {
    return (
      <div className={styles.state} role="alert">
        <p>현재 메뉴에서 편집할 메모를 불러오지 못했습니다.</p>
        <Button as={Link} size="small" to={memoListPath(workId, route.menuItemId)} variant="secondary">
          목록으로 돌아가기
        </Button>
      </div>
    );
  }

  return (
    <MemoEditorForm
      entry={entry}
      key={`${entry?.id ?? "new"}:${entry?.version ?? 0}`}
      menuItem={menuItem}
      menuItems={menusQuery.data ?? []}
      repository={repository}
      route={route}
    />
  );
}

export default MemoEditorPage;
