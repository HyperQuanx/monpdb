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
import {
  workEntryDetailPath,
  workMenuPath,
} from "../../../app/paths";
import {
  contentQueryKeys,
  contentRepository,
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
  contentBelongsToMenu,
  endpointKey,
  sameEndpoint,
} from "../contentMenu";
import styles from "./ContentEditorPage.module.css";

const parseTags = (value) => [
  ...new Set(
    value
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
  ),
];

const editableRelation = (relation) => ({
  ...(relation.id ? { id: relation.id } : {}),
  bidirectional: Boolean(relation.bidirectional),
  label: relation.label,
  notes: relation.notes ?? "",
  relationType: relation.relationType,
  target: relation.target,
});

const draftSnapshot = ({ body, relations, status, summary, tags, title }) =>
  JSON.stringify({
    body: normalizeTiptapDocument(body),
    relations: relations.map(editableRelation),
    status,
    summary,
    tags,
    title,
  });

const normalizeRelationDrafts = (drafts, source) => {
  const targets = new Set();

  return drafts.map((draft) => {
    const relationType = String(draft.relationType ?? "").trim();
    const label = String(draft.label ?? "").trim();
    const target = draft.target;
    const targetKey = endpointKey(target);

    if (!relationType || !label || !target?.type || !target?.id) {
      throw new Error("관계 종류, 이름, 대상을 모두 입력해 주세요.");
    }
    if (source && sameEndpoint(source, target)) {
      throw new Error("자기 자신을 관계 대상으로 선택할 수 없습니다.");
    }
    if (targets.has(targetKey)) {
      throw new Error("같은 관계 대상을 두 번 추가할 수 없습니다.");
    }
    targets.add(targetKey);

    return {
      ...(draft.id ? { id: draft.id } : {}),
      bidirectional: Boolean(draft.bidirectional),
      label,
      notes: String(draft.notes ?? ""),
      relationType,
      target: { type: target.type, id: target.id },
    };
  });
};

function ContentEditorForm({
  candidates,
  connected,
  entry,
  menuItem,
  relationRepository: relations,
  repository,
  route,
}) {
  const { entryId, menuItemId, sectionId, workId } = route;
  const isEdit = Boolean(entryId);
  const source = entry ? { type: entry.type, id: entry.id } : undefined;
  const outgoing = connected
    .filter((relation) => sameEndpoint(relation.source, source))
    .map(editableRelation);
  const incoming = connected.filter(
    (relation) => !sameEndpoint(relation.source, source),
  );
  const initialDraft = {
    body: normalizeTiptapDocument(entry?.body ?? EMPTY_TIPTAP_DOCUMENT),
    relations: outgoing,
    status: entry?.status ?? "draft",
    summary: entry?.summary ?? "",
    tags: entry?.tags?.join(", ") ?? "",
    title: entry?.title ?? "",
  };
  const [title, setTitle] = useState(initialDraft.title);
  const [summary, setSummary] = useState(initialDraft.summary);
  const [tags, setTags] = useState(initialDraft.tags);
  const [status, setStatus] = useState(initialDraft.status);
  const [body, setBody] = useState(initialDraft.body);
  const [relationDrafts, setRelationDrafts] = useState(initialDraft.relations);
  const [titleError, setTitleError] = useState("");
  const [formError, setFormError] = useState("");
  const [savedSnapshot, setSavedSnapshot] = useState(() =>
    draftSnapshot(initialDraft),
  );
  const createdEntryRef = useRef(null);
  const titleRef = useRef(null);
  const titleErrorId = useId();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentSnapshot = draftSnapshot({
    body,
    relations: relationDrafts,
    status,
    summary,
    tags,
    title,
  });
  const isDirty = currentSnapshot !== savedSnapshot;
  const cancelPath = isEdit
    ? workEntryDetailPath(workId, sectionId, menuItemId, entryId)
    : workMenuPath(workId, sectionId, menuItemId);

  const saveMutation = useMutation({
    mutationFn: async ({ payload, relationUpdates }) => {
      let savedEntry;
      if (isEdit) {
        savedEntry = await repository.update(workId, entryId, payload);
      } else if (createdEntryRef.current) {
        savedEntry = await repository.update(
          workId,
          createdEntryRef.current.id,
          payload,
        );
      } else {
        savedEntry = await repository.create(workId, menuItemId, payload);
        createdEntryRef.current = savedEntry;
      }

      await relations.replaceOutgoing(
        workId,
        { type: savedEntry.type, id: savedEntry.id },
        relationUpdates,
      );
      return savedEntry;
    },
    onSuccess: async (savedEntry) => {
      queryClient.setQueryData(
        contentQueryKeys.detail(workId, savedEntry.id),
        savedEntry,
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: contentQueryKeys.all(workId) }),
        queryClient.invalidateQueries({ queryKey: relationQueryKeys.all(workId) }),
      ]);
      flushSync(() => setSavedSnapshot(currentSnapshot));
      navigate(
        workEntryDetailPath(
          workId,
          sectionId,
          menuItemId,
          savedEntry.id,
        ),
        { replace: true },
      );
    },
    onError: (error) => {
      setFormError(error?.message || "항목을 저장하지 못했습니다.");
    },
  });

  const handleSubmit = (event) => {
    event.preventDefault();
    setFormError("");
    const normalizedTitle = title.trim();
    if (!normalizedTitle) {
      setTitleError("제목을 입력해 주세요.");
      titleRef.current?.focus();
      return;
    }
    setTitleError("");
    const normalizedStatus = status.trim();
    if (!normalizedStatus) {
      setFormError("상태를 입력해 주세요.");
      return;
    }

    let relationUpdates;
    try {
      relationUpdates = normalizeRelationDrafts(relationDrafts, source);
    } catch (error) {
      setFormError(error.message);
      return;
    }

    saveMutation.mutate({
      payload: {
        body: normalizeTiptapDocument(body),
        status: normalizedStatus,
        summary: summary.trim(),
        tags: parseTags(tags),
        title: normalizedTitle,
      },
      relationUpdates,
    });
  };

  return (
    <>
      <form
        aria-label={`${menuItem.label} ${isEdit ? "편집" : "추가"}`}
        className={styles.form}
        noValidate
        onSubmit={handleSubmit}
      >
        <header className={styles.header}>
          <span className={styles.eyebrow}>{menuItem.label}</span>
          <h2>{isEdit ? "항목 편집" : "새 항목 추가"}</h2>
        </header>

        <label className={styles.field}>
          <span>제목 <strong aria-hidden="true">*</strong></span>
          <Input
            aria-describedby={titleError ? titleErrorId : undefined}
            aria-invalid={Boolean(titleError)}
            autoFocus
            className={styles.control}
            ref={titleRef}
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              if (titleError) setTitleError("");
            }}
          />
          {titleError ? (
            <span className={styles.fieldError} id={titleErrorId} role="alert">
              {titleError}
            </span>
          ) : null}
        </label>

        <label className={styles.field}>
          <span>요약</span>
          <textarea
            className={styles.textarea}
            rows="3"
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
          />
        </label>

        <div className={styles.fieldGrid}>
          <label className={styles.field}>
            <span>태그</span>
            <Input
              aria-describedby="content-tags-description"
              aria-label="태그"
              className={styles.control}
              placeholder="쉼표로 구분"
              value={tags}
              onChange={(event) => setTags(event.target.value)}
            />
            <small id="content-tags-description">예: 지역, 동부, 사건</small>
          </label>
          <label className={styles.field}>
            <span>상태</span>
            <Input
              className={styles.control}
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            />
          </label>
        </div>

        <RichTextEditor
          className={styles.editor}
          description="제목, 목록, 굵게 등 서식을 적용할 수 있습니다."
          value={body}
          onChange={setBody}
        />

        <RelationPicker
          candidates={candidates}
          className={styles.relationPicker}
          disabled={saveMutation.isPending}
          source={source}
          value={relationDrafts}
          workId={workId}
          onChange={setRelationDrafts}
        />

        {incoming.length > 0 ? (
          <section aria-labelledby="incoming-relations-title" className={styles.incoming}>
            <h3 id="incoming-relations-title">들어오는 관계</h3>
            <p>다른 항목에서 연결한 관계는 여기에서 삭제되지 않습니다.</p>
            <ul>
              {incoming.map((relation) => (
                <li key={relation.id}>{relation.label}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {formError ? (
          <p className={styles.formError} role="alert">
            {formError}
          </p>
        ) : null}

        <div className={styles.actions}>
          <Button as={Link} to={cancelPath} variant="secondary">
            취소
          </Button>
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

function ContentEditorPage({
  repository = contentRepository,
  relations = relationRepository,
}) {
  const { menuItem } = useOutletContext();
  const route = useParams();
  const { entryId, workId } = route;
  const isEdit = Boolean(entryId);
  const entryQuery = useQuery({
    enabled: isEdit,
    networkMode: "always",
    queryKey: contentQueryKeys.detail(workId, entryId),
    queryFn: () => repository.get(workId, entryId),
    retry: false,
  });
  const entry = entryQuery.data;
  const matchesMenu = entry ? contentBelongsToMenu(entry, menuItem) : !isEdit;
  const source = useMemo(
    () => (entry ? { type: entry.type, id: entry.id } : undefined),
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
    queryFn: () => relations.listCandidates(workId, source),
    retry: false,
  });
  const listPath = workMenuPath(workId, route.sectionId, route.menuItemId);
  const loading =
    (isEdit && entryQuery.isPending) ||
    (isEdit && connectedQuery.isPending) ||
    candidatesQuery.isPending;
  const failed =
    (isEdit && entryQuery.isError) ||
    connectedQuery.isError ||
    candidatesQuery.isError;

  if (loading) {
    return (
      <div aria-live="polite" className={styles.state} role="status">
        <Skeleton className={styles.loadingSkeleton} />
        <span>편집기를 준비하는 중입니다.</span>
      </div>
    );
  }

  if (failed || !matchesMenu || (isEdit && !entry)) {
    return (
      <div className={styles.state} role="alert">
        <p>현재 메뉴에서 편집할 항목을 불러오지 못했습니다.</p>
        <Button as={Link} size="small" to={listPath} variant="secondary">
          목록으로 돌아가기
        </Button>
      </div>
    );
  }

  return (
    <ContentEditorForm
      candidates={candidatesQuery.data ?? []}
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

export default ContentEditorPage;
