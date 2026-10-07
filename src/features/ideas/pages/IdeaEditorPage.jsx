import { flushSync } from "react-dom";
import { useId, useMemo, useRef, useState } from "react";
import {
  Link,
  useNavigate,
  useOutletContext,
  useParams,
} from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { ideaDetailPath, ideaListPath } from "../../../app/paths";
import {
  ideaQueryKeys,
  ideaRepository,
  menuQueryKeys,
  menuRepository,
  relationQueryKeys,
  relationRepository,
} from "../../../data/repositories/appRepositories";
import {
  EMPTY_TIPTAP_DOCUMENT,
  RichTextEditor,
  normalizeTiptapDocument,
} from "../../../shared/editor";
import { UnsavedChangesGuard } from "../../../shared/hooks";
import { RelationPicker } from "../../../shared/relations";
import { Button, Input, Skeleton } from "../../../shared/ui";
import {
  IDEA_PRIORITIES,
  IDEA_STATUS_LABELS,
  IDEA_STATUS_TRANSITIONS,
  editableRelation,
  endpointKey,
  ideaBelongsToMenu,
  isAllIdeaCategory,
  isConcreteIdeaCategory,
  normalizeRelationDrafts,
  parseCommaSeparated,
  sameEndpoint,
} from "../ideas";
import styles from "./IdeaEditorPage.module.css";

const draftSnapshot = (draft) =>
  JSON.stringify({
    ...draft,
    body: normalizeTiptapDocument(draft.body),
    relations: draft.relations.map(editableRelation),
  });

const candidateLabel = (candidate) =>
  `${candidate.label}${candidate.archivedAt ? " (보관됨)" : ""}`;

function IdeaEditorForm({
  candidates,
  categories,
  connected,
  entry,
  menuItem,
  relationRepository: relations,
  repository,
  route,
}) {
  const { ideaId, menuItemId, workId } = route;
  const isEdit = Boolean(ideaId);
  const source = entry ? { type: entry.resourceType, id: entry.id } : undefined;
  const outgoing = connected
    .filter((relation) => sameEndpoint(relation.source, source))
    .map(editableRelation);
  const incoming = connected.filter((relation) => !sameEndpoint(relation.source, source));
  const initialDraft = {
    body: normalizeTiptapDocument(entry?.body ?? EMPTY_TIPTAP_DOCUMENT),
    categoryId: entry?.categoryId ?? (isConcreteIdeaCategory(menuItem) ? menuItem.id : ""),
    priority: entry?.priority ?? "medium",
    relations: outgoing,
    source: entry?.source ?? "",
    status: entry?.status ?? "seed",
    summary: entry?.summary ?? "",
    tags: entry?.tags?.join(", ") ?? "",
    title: entry?.title ?? "",
  };
  const [draft, setDraft] = useState(initialDraft);
  const [relationDrafts, setRelationDrafts] = useState(initialDraft.relations);
  const [titleError, setTitleError] = useState("");
  const [categoryError, setCategoryError] = useState("");
  const [formError, setFormError] = useState("");
  const [savedSnapshot, setSavedSnapshot] = useState(() => draftSnapshot(initialDraft));
  const createdRef = useRef(null);
  const titleRef = useRef(null);
  const categoryRef = useRef(null);
  const titleErrorId = useId();
  const categoryErrorId = useId();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentSnapshot = draftSnapshot({ ...draft, relations: relationDrafts });
  const isDirty = currentSnapshot !== savedSnapshot;
  const cancelPath = isEdit
    ? ideaDetailPath(workId, menuItemId, ideaId)
    : ideaListPath(workId, menuItemId);
  const concreteCategories = categories.filter(isConcreteIdeaCategory);
  // Only the current status and its allowed next states are selectable.
  const originalStatus = entry?.status ?? "seed";
  const statusOptions = isEdit
    ? [originalStatus, ...IDEA_STATUS_TRANSITIONS[originalStatus]]
    : ["seed", "developing", "ready"];
  const pickerCandidates = candidates.map((candidate) => ({
    ...candidate,
    label: candidateLabel(candidate),
  }));
  const incomingLabels = new Map(
    pickerCandidates.map((candidate) => [endpointKey(candidate.endpoint), candidate.label]),
  );

  const setField = (field) => (event) => {
    const value = event.target.value;
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const saveMutation = useMutation({
    mutationFn: async ({ payload, relationUpdates }) => {
      let saved;
      if (isEdit) {
        saved = await repository.update(workId, ideaId, payload);
      } else if (createdRef.current) {
        saved = await repository.update(workId, createdRef.current.id, payload);
      } else {
        saved = await repository.create(workId, payload);
        createdRef.current = saved;
      }
      await relations.replaceOutgoing(
        workId,
        { type: saved.resourceType, id: saved.id },
        relationUpdates,
      );
      return saved;
    },
    onSuccess: async (saved) => {
      queryClient.setQueryData(ideaQueryKeys.detail(workId, saved.id), saved);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ideaQueryKeys.all(workId) }),
        queryClient.invalidateQueries({ queryKey: relationQueryKeys.all(workId) }),
      ]);
      flushSync(() => setSavedSnapshot(currentSnapshot));
      const destination = isAllIdeaCategory(menuItem) ? menuItem.id : saved.categoryId;
      navigate(ideaDetailPath(workId, destination, saved.id), { replace: true });
    },
    onError: (error) => setFormError(error?.message || "아이디어를 저장하지 못했습니다."),
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
    if (!concreteCategories.some(({ id }) => id === draft.categoryId)) {
      setCategoryError("아이디어 유형을 선택해 주세요.");
      categoryRef.current?.focus();
      return;
    }
    setCategoryError("");
    let relationUpdates;
    try {
      relationUpdates = normalizeRelationDrafts(relationDrafts, source);
    } catch (error) {
      setFormError(error.message);
      return;
    }
    saveMutation.mutate({
      payload: {
        body: normalizeTiptapDocument(draft.body),
        categoryId: draft.categoryId,
        priority: draft.priority,
        source: draft.source.trim(),
        status: draft.status,
        summary: draft.summary.trim(),
        tags: parseCommaSeparated(draft.tags),
        title,
      },
      relationUpdates,
    });
  };

  return (
    <>
      <form
        aria-label={`${menuItem.label} 아이디어 ${isEdit ? "편집" : "추가"}`}
        className={styles.form}
        noValidate
        onSubmit={handleSubmit}
      >
        <header className={styles.header}>
          <span className={styles.eyebrow}>{menuItem.label}</span>
          <h2>{isEdit ? "아이디어 편집" : "새 아이디어 추가"}</h2>
        </header>

        <div className={styles.fieldGrid}>
          <label className={styles.field}>
            <span>유형 <strong aria-hidden="true">*</strong></span>
            <select
              aria-describedby={categoryError ? categoryErrorId : undefined}
              aria-invalid={Boolean(categoryError)}
              className={styles.control}
              ref={categoryRef}
              value={draft.categoryId}
              onChange={(event) => {
                setField("categoryId")(event);
                if (categoryError) setCategoryError("");
              }}
            >
              <option value="">유형 선택</option>
              {concreteCategories.map((category) => (
                <option key={category.id} value={category.id}>{category.label}</option>
              ))}
            </select>
            {categoryError ? <span className={styles.fieldError} id={categoryErrorId} role="alert">{categoryError}</span> : null}
          </label>
          <label className={styles.field}>
            <span>우선순위</span>
            <select className={styles.control} value={draft.priority} onChange={setField("priority")}>
              {IDEA_PRIORITIES.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
        </div>

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
          <span>요약</span>
          <textarea className={styles.textarea} rows="3" value={draft.summary} onChange={setField("summary")} />
        </label>

        <div className={styles.fieldGrid}>
          <label className={styles.field}>
            <span>발전 상태</span>
            {originalStatus === "adopted" ? (
              <p className={styles.helper}>채택된 아이디어는 상태를 바꿀 수 없습니다.</p>
            ) : (
              <select className={styles.control} value={draft.status} onChange={setField("status")}>
                {statusOptions.map((value) => (
                  <option key={value} value={value}>{IDEA_STATUS_LABELS.get(value)}</option>
                ))}
              </select>
            )}
          </label>
          <label className={styles.field}>
            <span>출처</span>
            <Input className={styles.control} placeholder="예: 꿈, 대화, 책" value={draft.source} onChange={setField("source")} />
          </label>
        </div>

        <label className={styles.field}>
          <span>태그</span>
          <Input aria-label="태그" className={styles.control} placeholder="쉼표로 구분" value={draft.tags} onChange={setField("tags")} />
        </label>

        <RichTextEditor
          className={styles.editor}
          description="아이디어를 자유롭게 발전시켜 적습니다."
          value={draft.body}
          onChange={(body) => setDraft((current) => ({ ...current, body }))}
        />

        <RelationPicker
          candidates={pickerCandidates}
          className={styles.relationPicker}
          disabled={saveMutation.isPending}
          label="관련 설정"
          source={source}
          value={relationDrafts}
          workId={workId}
          onChange={setRelationDrafts}
        />

        {incoming.length > 0 ? (
          <section aria-labelledby="incoming-idea-relations" className={styles.incoming}>
            <h3 id="incoming-idea-relations">들어오는 관계</h3>
            <p>다른 항목에서 연결한 관계는 저장해도 유지됩니다.</p>
            <ul>
              {incoming.map((relation) => (
                <li key={relation.id}>
                  <strong>{incomingLabels.get(endpointKey(relation.source)) ?? `${relation.source.type}:${relation.source.id}`}</strong>
                  <span>{relation.label}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

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

function IdeaEditorPage({
  menus = menuRepository,
  relations = relationRepository,
  repository = ideaRepository,
}) {
  const { menuItem } = useOutletContext();
  const route = useParams();
  const { ideaId, workId } = route;
  const isEdit = Boolean(ideaId);
  const entryQuery = useQuery({
    enabled: isEdit,
    networkMode: "always",
    queryKey: ideaQueryKeys.detail(workId, ideaId),
    queryFn: () => repository.get(workId, ideaId),
    retry: false,
  });
  const categoriesQuery = useQuery({
    networkMode: "always",
    queryKey: menuQueryKeys.items("idea", true),
    queryFn: () => menus.listItems("idea", { includeArchived: true }),
    retry: false,
  });
  const entry = entryQuery.data;
  const matchesMenu = entry ? ideaBelongsToMenu(entry, menuItem) : !isEdit;
  const source = useMemo(
    () => (entry ? { type: entry.resourceType, id: entry.id } : undefined),
    [entry],
  );
  const connectedQuery = useQuery({
    enabled: Boolean(isEdit && source && matchesMenu),
    networkMode: "always",
    queryKey: relationQueryKeys.list(workId, source),
    queryFn: () => relations.list(workId, source),
    retry: false,
  });
  const candidatesQuery = useQuery({
    enabled: Boolean(matchesMenu && (!isEdit || source)),
    networkMode: "always",
    queryKey: relationQueryKeys.candidates(workId, source),
    queryFn: () => relations.listCandidates(workId, source, { includeArchived: true }),
    retry: false,
  });
  const failed =
    categoriesQuery.isError ||
    (isEdit && entryQuery.isError) ||
    connectedQuery.isError ||
    candidatesQuery.isError;
  const loading =
    !failed &&
    (categoriesQuery.isPending ||
      (isEdit && entryQuery.isPending) ||
      (isEdit && connectedQuery.isPending) ||
      candidatesQuery.isPending);

  if (loading) {
    return (
      <div aria-live="polite" className={styles.state} role="status">
        <Skeleton className={styles.loadingSkeleton} />
        <span>아이디어 편집기를 준비하는 중입니다.</span>
      </div>
    );
  }

  if (failed || !matchesMenu || (isEdit && !entry) || entry?.archivedAt) {
    return (
      <div className={styles.state} role="alert">
        <p>현재 유형에서 편집할 아이디어를 불러오지 못했습니다.</p>
        <Button as={Link} size="small" to={ideaListPath(workId, route.menuItemId)} variant="secondary">
          목록으로 돌아가기
        </Button>
      </div>
    );
  }

  return (
    <IdeaEditorForm
      candidates={candidatesQuery.data ?? []}
      categories={categoriesQuery.data ?? []}
      connected={connectedQuery.data ?? []}
      entry={entry}
      key={`${entry?.id ?? "new"}:${entry?.version ?? 0}`}
      menuItem={menuItem}
      relationRepository={relations}
      repository={repository}
      route={route}
    />
  );
}

export default IdeaEditorPage;
