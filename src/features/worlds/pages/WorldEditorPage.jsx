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
  worldDetailPath,
  worldListPath,
} from "../../../app/paths";
import {
  menuQueryKeys,
  menuRepository,
  relationQueryKeys,
  relationRepository,
  worldQueryKeys,
  worldRepository,
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
  WORLD_CATEGORIES,
  editableRelation,
  endpointKey,
  isAllWorldRegion,
  isConcreteWorldRegion,
  normalizeRelationDrafts,
  parseCommaSeparated,
  sameEndpoint,
  worldBelongsToMenu,
} from "../worlds";
import styles from "./WorldEditorPage.module.css";

const draftSnapshot = (draft) =>
  JSON.stringify({
    ...draft,
    body: normalizeTiptapDocument(draft.body),
    relations: draft.relations.map(editableRelation),
  });

function WorldEditorForm({
  candidates,
  connected,
  entry,
  menuItem,
  menuItems,
  relationRepository: relations,
  repository,
  route,
}) {
  const { menuItemId, workId, worldId } = route;
  const isEdit = Boolean(worldId);
  const source = entry ? { type: entry.resourceType, id: entry.id } : undefined;
  const outgoing = connected
    .filter((relation) => sameEndpoint(relation.source, source))
    .map(editableRelation);
  const incoming = connected.filter(
    (relation) => !sameEndpoint(relation.source, source),
  );
  const initialDraft = {
    body: normalizeTiptapDocument(entry?.body ?? EMPTY_TIPTAP_DOCUMENT),
    category: entry?.category ?? "region",
    culture: entry?.culture ?? "",
    era: entry?.era ?? "",
    factions: entry?.factions?.join(", ") ?? "",
    history: entry?.history ?? "",
    places: entry?.places?.join(", ") ?? "",
    regionId: entry?.regionId ?? (isConcreteWorldRegion(menuItem) ? menuItem.id : ""),
    relations: outgoing,
    rules: entry?.rules ?? "",
    status: entry?.status ?? "draft",
    summary: entry?.summary ?? "",
    tags: entry?.tags?.join(", ") ?? "",
    title: entry?.title ?? "",
  };
  const [draft, setDraft] = useState(initialDraft);
  const [relationDrafts, setRelationDrafts] = useState(initialDraft.relations);
  const [titleError, setTitleError] = useState("");
  const [regionError, setRegionError] = useState("");
  const [formError, setFormError] = useState("");
  const [savedSnapshot, setSavedSnapshot] = useState(() => draftSnapshot(initialDraft));
  const createdWorldRef = useRef(null);
  const titleRef = useRef(null);
  const regionRef = useRef(null);
  const titleErrorId = useId();
  const regionErrorId = useId();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentSnapshot = draftSnapshot({ ...draft, relations: relationDrafts });
  const isDirty = currentSnapshot !== savedSnapshot;
  const cancelPath = isEdit
    ? worldDetailPath(workId, menuItemId, worldId)
    : worldListPath(workId, menuItemId);
  const concreteRegions = menuItems.filter(isConcreteWorldRegion);
  const candidateLabels = new Map(
    candidates.map((candidate) => [
      endpointKey(candidate.endpoint),
      `${candidate.label}${candidate.archivedAt ? " (보관됨)" : ""}`,
    ]),
  );
  const pickerCandidates = candidates.map((candidate) => ({
    ...candidate,
    label: candidateLabels.get(endpointKey(candidate.endpoint)),
  }));

  const setField = (field) => (event) => {
    const value = event.target.value;
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const saveMutation = useMutation({
    mutationFn: async ({ payload, relationUpdates }) => {
      let savedWorld;
      if (isEdit) {
        savedWorld = await repository.update(workId, worldId, payload);
      } else if (createdWorldRef.current) {
        savedWorld = await repository.update(
          workId,
          createdWorldRef.current.id,
          payload,
        );
      } else {
        savedWorld = await repository.create(workId, payload);
        createdWorldRef.current = savedWorld;
      }

      await relations.replaceOutgoing(
        workId,
        { type: savedWorld.resourceType, id: savedWorld.id },
        relationUpdates,
      );
      return savedWorld;
    },
    onSuccess: async (savedWorld) => {
      queryClient.setQueryData(
        worldQueryKeys.detail(workId, savedWorld.id),
        savedWorld,
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: worldQueryKeys.all(workId) }),
        queryClient.invalidateQueries({ queryKey: relationQueryKeys.all(workId) }),
      ]);
      flushSync(() => setSavedSnapshot(currentSnapshot));
      const destinationRegion = isEdit && isAllWorldRegion(menuItem)
        ? menuItem.id
        : savedWorld.regionId;
      navigate(worldDetailPath(workId, destinationRegion, savedWorld.id), {
        replace: true,
      });
    },
    onError: (error) => {
      setFormError(error?.message || "세계관을 저장하지 못했습니다.");
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
    if (!concreteRegions.some(({ id }) => id === draft.regionId)) {
      setRegionError("구체적인 세계관 지역을 선택해 주세요.");
      regionRef.current?.focus();
      return;
    }
    setRegionError("");
    const normalizedStatus = draft.status.trim();
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
        body: normalizeTiptapDocument(draft.body),
        category: draft.category,
        culture: draft.culture.trim(),
        era: draft.era.trim(),
        factions: parseCommaSeparated(draft.factions),
        history: draft.history.trim(),
        places: parseCommaSeparated(draft.places),
        regionId: draft.regionId,
        rules: draft.rules.trim(),
        status: normalizedStatus,
        summary: draft.summary.trim(),
        tags: parseCommaSeparated(draft.tags),
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
          <h2>{isEdit ? "세계관 편집" : "새 세계관 추가"}</h2>
        </header>

        <div className={styles.fieldGrid}>
          <label className={styles.field}>
            <span>지역 <strong aria-hidden="true">*</strong></span>
            <select
              aria-describedby={regionError ? regionErrorId : undefined}
              aria-invalid={Boolean(regionError)}
              className={styles.control}
              ref={regionRef}
              value={draft.regionId}
              onChange={(event) => {
                setField("regionId")(event);
                if (regionError) setRegionError("");
              }}
            >
              <option value="">지역 선택</option>
              {concreteRegions.map((region) => (
                <option key={region.id} value={region.id}>{region.label}</option>
              ))}
            </select>
            {regionError ? <span className={styles.fieldError} id={regionErrorId} role="alert">{regionError}</span> : null}
          </label>
          <label className={styles.field}>
            <span>분류</span>
            <select className={styles.control} value={draft.category} onChange={setField("category")}>
              {WORLD_CATEGORIES.map(([value, label]) => (
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
          <label className={styles.field}><span>시대</span><Input className={styles.control} value={draft.era} onChange={setField("era")} /></label>
          <label className={styles.field}><span>상태</span><Input className={styles.control} value={draft.status} onChange={setField("status")} /></label>
        </div>

        <label className={styles.field}><span>규칙</span><textarea className={styles.textarea} rows="4" value={draft.rules} onChange={setField("rules")} /></label>
        <label className={styles.field}><span>역사</span><textarea className={styles.textarea} rows="4" value={draft.history} onChange={setField("history")} /></label>
        <label className={styles.field}><span>문화</span><textarea className={styles.textarea} rows="4" value={draft.culture} onChange={setField("culture")} /></label>

        <div className={styles.listGrid}>
          <label className={styles.field}><span>세력</span><Input aria-label="세력" className={styles.control} placeholder="쉼표로 구분" value={draft.factions} onChange={setField("factions")} /></label>
          <label className={styles.field}><span>장소</span><Input aria-label="장소" className={styles.control} placeholder="쉼표로 구분" value={draft.places} onChange={setField("places")} /></label>
          <label className={styles.field}><span>태그</span><Input aria-label="태그" className={styles.control} placeholder="쉼표로 구분" value={draft.tags} onChange={setField("tags")} /></label>
        </div>

        <RichTextEditor
          className={styles.editor}
          description="제목, 목록, 굵게 등 서식을 적용할 수 있습니다."
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
          <section aria-labelledby="incoming-world-relations" className={styles.incoming}>
            <h3 id="incoming-world-relations">들어오는 관계</h3>
            <p>다른 항목에서 연결한 관계는 저장해도 유지됩니다.</p>
            <ul>
              {incoming.map((relation) => (
                <li key={relation.id}>
                  <strong>{candidateLabels.get(endpointKey(relation.source)) ?? `${relation.source.type}:${relation.source.id}`}</strong>
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

function WorldEditorPage({
  menus = menuRepository,
  relations = relationRepository,
  repository = worldRepository,
}) {
  const { menuItem } = useOutletContext();
  const route = useParams();
  const { workId, worldId } = route;
  const isEdit = Boolean(worldId);
  const entryQuery = useQuery({
    enabled: isEdit,
    networkMode: "always",
    queryKey: worldQueryKeys.detail(workId, worldId),
    queryFn: () => repository.get(workId, worldId),
    retry: false,
  });
  const menuItemsQuery = useQuery({
    networkMode: "always",
    queryKey: menuQueryKeys.items("world", true),
    queryFn: () => menus.listItems("world", { includeArchived: true }),
    retry: false,
  });
  const entry = entryQuery.data;
  const matchesMenu = entry ? worldBelongsToMenu(entry, menuItem) : !isEdit;
  const source = useMemo(
    () => entry ? { type: entry.resourceType, id: entry.id } : undefined,
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
  const listPath = worldListPath(workId, route.menuItemId);
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

  if (loading) {
    return (
      <div aria-live="polite" className={styles.state} role="status">
        <Skeleton className={styles.loadingSkeleton} />
        <span>세계관 편집기를 준비하는 중입니다.</span>
      </div>
    );
  }

  if (failed || !matchesMenu || (isEdit && !entry)) {
    return (
      <div className={styles.state} role="alert">
        <p>현재 지역에서 편집할 세계관을 불러오지 못했습니다.</p>
        <Button as={Link} size="small" to={listPath} variant="secondary">목록으로 돌아가기</Button>
      </div>
    );
  }

  return (
    <WorldEditorForm
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

export default WorldEditorPage;
