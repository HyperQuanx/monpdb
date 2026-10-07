import { flushSync } from "react-dom";
import { useId, useMemo, useRef, useState } from "react";
import {
  Link,
  useNavigate,
  useOutletContext,
  useParams,
} from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Save, Trash2 } from "lucide-react";
import { plotDetailPath, plotListPath } from "../../../app/paths";
import {
  menuQueryKeys,
  menuRepository,
  plotQueryKeys,
  plotRepository,
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
  PLOT_SCENE_STATUSES,
  editableRelation,
  endpointKey,
  isAllPlotChapter,
  isConcretePlotChapter,
  normalizeRelationDrafts,
  parseCommaSeparated,
  sameEndpoint,
  sceneBelongsToMenu,
} from "../plots";
import styles from "./PlotEditorPage.module.css";

const draftSnapshot = (draft) =>
  JSON.stringify({
    ...draft,
    body: normalizeTiptapDocument(draft.body),
    relations: draft.relations.map(editableRelation),
  });

const candidateLabel = (candidate) =>
  `${candidate.label}${candidate.archivedAt ? " (보관됨)" : ""}`;

/**
 * Options for a reference field: active candidates plus any archived ones that
 * are already selected, so existing links stay visible without offering
 * archived targets as new choices.
 */
const referenceOptions = (candidates, type, selectedIds) =>
  candidates.filter(
    (candidate) =>
      candidate.endpoint.type === type &&
      (!candidate.archivedAt || selectedIds.includes(candidate.endpoint.id)),
  );

function PlotEditorForm({
  candidates,
  connected,
  entry,
  menuItem,
  menuItems,
  relationRepository: relations,
  repository,
  route,
}) {
  const { menuItemId, sceneId, workId } = route;
  const isEdit = Boolean(sceneId);
  const source = entry ? { type: entry.resourceType, id: entry.id } : undefined;
  const outgoing = connected
    .filter((relation) => sameEndpoint(relation.source, source))
    .map(editableRelation);
  const incoming = connected.filter(
    (relation) => !sameEndpoint(relation.source, source),
  );
  const initialDraft = {
    body: normalizeTiptapDocument(entry?.body ?? EMPTY_TIPTAP_DOCUMENT),
    chapterId: entry?.chapterId ?? (isConcretePlotChapter(menuItem) ? menuItem.id : ""),
    characterIds: entry?.characterIds ?? [],
    clues: (entry?.clues ?? []).map((clue) => ({
      ...clue,
      payoffSceneId: clue.payoffSceneId ?? "",
    })),
    event: entry?.event ?? "",
    locationDetail: entry?.locationDetail ?? "",
    locationWorldId: entry?.locationWorldId ?? "",
    povCharacterId: entry?.povCharacterId ?? "",
    relations: outgoing,
    status: entry?.status ?? "planned",
    storyTime: entry?.storyTime ?? "",
    summary: entry?.summary ?? "",
    tags: entry?.tags?.join(", ") ?? "",
    title: entry?.title ?? "",
  };
  const [draft, setDraft] = useState(initialDraft);
  const [relationDrafts, setRelationDrafts] = useState(initialDraft.relations);
  const [titleError, setTitleError] = useState("");
  const [chapterError, setChapterError] = useState("");
  const [clueError, setClueError] = useState("");
  const [formError, setFormError] = useState("");
  const [savedSnapshot, setSavedSnapshot] = useState(() => draftSnapshot(initialDraft));
  const createdSceneRef = useRef(null);
  const titleRef = useRef(null);
  const chapterRef = useRef(null);
  const clueListRef = useRef(null);
  const titleErrorId = useId();
  const chapterErrorId = useId();
  const clueErrorId = useId();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentSnapshot = draftSnapshot({ ...draft, relations: relationDrafts });
  const isDirty = currentSnapshot !== savedSnapshot;
  const cancelPath = isEdit
    ? plotDetailPath(workId, menuItemId, sceneId)
    : plotListPath(workId, menuItemId);
  const concreteChapters = menuItems.filter(isConcretePlotChapter);
  const povOptions = referenceOptions(candidates, "character", [draft.povCharacterId]);
  const characterOptions = referenceOptions(candidates, "character", draft.characterIds);
  const locationOptions = referenceOptions(candidates, "world", [draft.locationWorldId]);
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
  const toggleCharacter = (characterId) => {
    setDraft((current) => ({
      ...current,
      characterIds: current.characterIds.includes(characterId)
        ? current.characterIds.filter((id) => id !== characterId)
        : [...current.characterIds, characterId],
    }));
  };
  const updateClue = (index, patch) => {
    setDraft((current) => ({
      ...current,
      clues: current.clues.map((clue, clueIndex) =>
        clueIndex === index ? { ...clue, ...patch } : clue,
      ),
    }));
    if (clueError) setClueError("");
  };

  const saveMutation = useMutation({
    mutationFn: async ({ payload, relationUpdates }) => {
      let savedScene;
      if (isEdit) {
        savedScene = await repository.update(workId, sceneId, payload);
      } else if (createdSceneRef.current) {
        savedScene = await repository.update(workId, createdSceneRef.current.id, payload);
      } else {
        savedScene = await repository.create(workId, payload);
        createdSceneRef.current = savedScene;
      }
      await relations.replaceOutgoing(
        workId,
        { type: savedScene.resourceType, id: savedScene.id },
        relationUpdates,
      );
      return savedScene;
    },
    onSuccess: async (savedScene) => {
      queryClient.setQueryData(plotQueryKeys.detail(workId, savedScene.id), savedScene);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: plotQueryKeys.all(workId) }),
        queryClient.invalidateQueries({ queryKey: relationQueryKeys.all(workId) }),
      ]);
      flushSync(() => setSavedSnapshot(currentSnapshot));
      const destination = isAllPlotChapter(menuItem) ? menuItem.id : savedScene.chapterId;
      navigate(plotDetailPath(workId, destination, savedScene.id), { replace: true });
    },
    onError: (error) => {
      setFormError(error?.message || "장면을 저장하지 못했습니다.");
    },
  });

  const handleSubmit = (event) => {
    event.preventDefault();
    setFormError("");
    const normalizedTitle = draft.title.trim();
    if (!normalizedTitle) {
      setTitleError("제목을 입력해 주세요.");
      titleRef.current?.focus();
      return;
    }
    setTitleError("");
    if (!concreteChapters.some(({ id }) => id === draft.chapterId)) {
      setChapterError("장면을 둘 챕터를 선택해 주세요.");
      chapterRef.current?.focus();
      return;
    }
    setChapterError("");
    const blankClueIndex = draft.clues.findIndex(({ clue }) => !clue.trim());
    if (blankClueIndex >= 0) {
      setClueError(`복선 ${blankClueIndex + 1}의 내용을 입력해 주세요.`);
      const clueInputs = clueListRef.current?.querySelectorAll("[data-clue-text]");
      clueInputs?.[blankClueIndex]?.focus();
      return;
    }
    setClueError("");

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
        chapterId: draft.chapterId,
        characterIds: draft.characterIds,
        clues: draft.clues.map((clue) => ({
          ...(clue.id ? { id: clue.id } : {}),
          clue: clue.clue.trim(),
          notes: clue.notes ?? "",
          payoffSceneId: clue.payoffSceneId || null,
        })),
        event: draft.event.trim(),
        locationDetail: draft.locationDetail.trim(),
        locationWorldId: draft.locationWorldId || null,
        povCharacterId: draft.povCharacterId || null,
        status: draft.status,
        storyTime: draft.storyTime.trim(),
        summary: draft.summary.trim(),
        tags: parseCommaSeparated(draft.tags),
        title: normalizedTitle,
      },
      relationUpdates,
    });
  };

  const payoffOptions = (clue) =>
    candidates.filter(
      (candidate) =>
        candidate.endpoint.type === "plot" &&
        (!candidate.archivedAt || candidate.endpoint.id === clue.payoffSceneId),
    );

  return (
    <>
      <form
        aria-label={`${menuItem.label} 장면 ${isEdit ? "편집" : "추가"}`}
        className={styles.form}
        noValidate
        onSubmit={handleSubmit}
      >
        <header className={styles.header}>
          <span className={styles.eyebrow}>{menuItem.label}</span>
          <h2>{isEdit ? "장면 편집" : "새 장면 추가"}</h2>
        </header>

        <div className={styles.fieldGrid}>
          <label className={styles.field}>
            <span>챕터 <strong aria-hidden="true">*</strong></span>
            <select
              aria-describedby={chapterError ? chapterErrorId : undefined}
              aria-invalid={Boolean(chapterError)}
              className={styles.control}
              ref={chapterRef}
              value={draft.chapterId}
              onChange={(event) => {
                setField("chapterId")(event);
                if (chapterError) setChapterError("");
              }}
            >
              <option value="">챕터 선택</option>
              {concreteChapters.map((chapter) => (
                <option key={chapter.id} value={chapter.id}>{chapter.label}</option>
              ))}
            </select>
            {chapterError ? <span className={styles.fieldError} id={chapterErrorId} role="alert">{chapterError}</span> : null}
          </label>
          <label className={styles.field}>
            <span>상태</span>
            <select className={styles.control} value={draft.status} onChange={setField("status")}>
              {PLOT_SCENE_STATUSES.map(([value, label]) => (
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
            <span>POV</span>
            <select className={styles.control} value={draft.povCharacterId} onChange={setField("povCharacterId")}>
              <option value="">POV 없음</option>
              {povOptions.map((candidate) => (
                <option key={candidate.endpoint.id} value={candidate.endpoint.id}>
                  {candidateLabel(candidate)}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span>시간</span>
            <Input className={styles.control} placeholder="예: 천무력 412년 봄" value={draft.storyTime} onChange={setField("storyTime")} />
          </label>
          <label className={styles.field}>
            <span>장소</span>
            <select className={styles.control} value={draft.locationWorldId} onChange={setField("locationWorldId")}>
              <option value="">장소 없음</option>
              {locationOptions.map((candidate) => (
                <option key={candidate.endpoint.id} value={candidate.endpoint.id}>
                  {candidateLabel(candidate)}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span>장소 상세</span>
            <Input className={styles.control} value={draft.locationDetail} onChange={setField("locationDetail")} />
          </label>
        </div>

        <fieldset className={styles.fieldset}>
          <legend>등장 인물</legend>
          {characterOptions.length === 0 ? (
            <p className={styles.helper}>선택할 수 있는 인물이 없습니다.</p>
          ) : (
            <div className={styles.checkboxGrid}>
              {characterOptions.map((candidate) => (
                <label className={styles.checkboxLabel} key={candidate.endpoint.id}>
                  <input
                    checked={draft.characterIds.includes(candidate.endpoint.id)}
                    type="checkbox"
                    onChange={() => toggleCharacter(candidate.endpoint.id)}
                  />
                  <span>{candidateLabel(candidate)}</span>
                </label>
              ))}
            </div>
          )}
        </fieldset>

        <label className={styles.field}>
          <span>사건</span>
          <textarea className={styles.textarea} rows="3" value={draft.event} onChange={setField("event")} />
        </label>

        <fieldset className={styles.fieldset} ref={clueListRef}>
          <legend>복선과 회수</legend>
          <p className={styles.helper}>회수 장면을 지정하지 않은 복선은 미회수로 표시됩니다.</p>
          {draft.clues.map((clue, index) => {
            const number = index + 1;
            return (
              <div className={styles.clueRow} key={clue.id ?? `new-${index}`}>
                <label className={styles.field}>
                  <span>복선 {number}</span>
                  <Input
                    aria-describedby={clueError ? clueErrorId : undefined}
                    aria-label={`복선 ${number} 내용`}
                    className={styles.control}
                    data-clue-text=""
                    value={clue.clue}
                    onChange={(event) => updateClue(index, { clue: event.target.value })}
                  />
                </label>
                <label className={styles.field}>
                  <span>회수 장면</span>
                  <select
                    aria-label={`복선 ${number} 회수 장면`}
                    className={styles.control}
                    value={clue.payoffSceneId}
                    onChange={(event) => updateClue(index, { payoffSceneId: event.target.value })}
                  >
                    <option value="">미회수</option>
                    {payoffOptions(clue).map((candidate) => (
                      <option key={candidate.endpoint.id} value={candidate.endpoint.id}>
                        {candidateLabel(candidate)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.field}>
                  <span>메모</span>
                  <Input
                    aria-label={`복선 ${number} 메모`}
                    className={styles.control}
                    value={clue.notes ?? ""}
                    onChange={(event) => updateClue(index, { notes: event.target.value })}
                  />
                </label>
                <Button
                  aria-label={`복선 ${number} 삭제`}
                  className={styles.clueRemove}
                  size="small"
                  variant="ghost"
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      clues: current.clues.filter((_, clueIndex) => clueIndex !== index),
                    }))
                  }
                >
                  <Trash2 aria-hidden="true" size={17} />
                  삭제
                </Button>
              </div>
            );
          })}
          {clueError ? <span className={styles.fieldError} id={clueErrorId} role="alert">{clueError}</span> : null}
          <Button
            className={styles.clueAdd}
            size="small"
            variant="secondary"
            onClick={() =>
              setDraft((current) => ({
                ...current,
                clues: [...current.clues, { clue: "", notes: "", payoffSceneId: "" }],
              }))
            }
          >
            <Plus aria-hidden="true" size={17} />
            복선 추가
          </Button>
        </fieldset>

        <label className={styles.field}>
          <span>태그</span>
          <Input aria-label="태그" className={styles.control} placeholder="쉼표로 구분" value={draft.tags} onChange={setField("tags")} />
        </label>

        <RichTextEditor
          className={styles.editor}
          description="장면 본문을 작성합니다. 제목, 목록, 굵게 등 서식을 적용할 수 있습니다."
          value={draft.body}
          onChange={(body) => setDraft((current) => ({ ...current, body }))}
        />

        <RelationPicker
          candidates={pickerCandidates}
          className={styles.relationPicker}
          disabled={saveMutation.isPending}
          source={source}
          value={relationDrafts}
          workId={workId}
          onChange={setRelationDrafts}
        />

        {incoming.length > 0 ? (
          <section aria-labelledby="incoming-plot-relations" className={styles.incoming}>
            <h3 id="incoming-plot-relations">들어오는 관계</h3>
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

function PlotEditorPage({
  menus = menuRepository,
  relations = relationRepository,
  repository = plotRepository,
}) {
  const { menuItem } = useOutletContext();
  const route = useParams();
  const { sceneId, workId } = route;
  const isEdit = Boolean(sceneId);
  const entryQuery = useQuery({
    enabled: isEdit,
    networkMode: "always",
    queryKey: plotQueryKeys.detail(workId, sceneId),
    queryFn: () => repository.get(workId, sceneId),
    retry: false,
  });
  const menuItemsQuery = useQuery({
    networkMode: "always",
    queryKey: menuQueryKeys.items("plot", true),
    queryFn: () => menus.listItems("plot", { includeArchived: true }),
    retry: false,
  });
  const entry = entryQuery.data;
  const matchesMenu = entry ? sceneBelongsToMenu(entry, menuItem) : !isEdit;
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
  const loading =
    menuItemsQuery.isPending ||
    (isEdit && entryQuery.isPending) ||
    (isEdit && connectedQuery.isPending) ||
    candidatesQuery.isPending;
  const failed =
    menuItemsQuery.isError ||
    (isEdit && entryQuery.isError) ||
    connectedQuery.isError ||
    candidatesQuery.isError;

  if (loading && !failed) {
    return (
      <div aria-live="polite" className={styles.state} role="status">
        <Skeleton className={styles.loadingSkeleton} />
        <span>장면 편집기를 준비하는 중입니다.</span>
      </div>
    );
  }

  if (failed || !matchesMenu || (isEdit && !entry)) {
    return (
      <div className={styles.state} role="alert">
        <p>현재 챕터에서 편집할 장면을 불러오지 못했습니다.</p>
        <Button as={Link} size="small" to={plotListPath(workId, route.menuItemId)} variant="secondary">
          목록으로 돌아가기
        </Button>
      </div>
    );
  }

  return (
    <PlotEditorForm
      candidates={candidatesQuery.data ?? []}
      connected={connectedQuery.data ?? []}
      entry={entry}
      key={`${entry?.id ?? "new"}:${entry?.version ?? 0}`}
      menuItem={menuItem}
      menuItems={menuItemsQuery.data ?? []}
      relationRepository={relations}
      repository={repository}
      route={route}
    />
  );
}

export default PlotEditorPage;
