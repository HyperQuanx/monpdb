import { useEffect, useMemo, useState } from "react";
import {
  Link,
  useOutletContext,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Plus, Route, Search } from "lucide-react";
import { plotCreatePath, plotDetailPath } from "../../../app/paths";
import {
  menuQueryKeys,
  menuRepository,
  plotQueryKeys,
  plotRepository,
  relationQueryKeys,
  relationRepository,
} from "../../../data/repositories/appRepositories";
import { useDebouncedValue } from "../../../shared/hooks/useDebouncedValue";
import { Button, Card, EmptyState, Input, Skeleton } from "../../../shared/ui";
import {
  PLOT_SCENE_STATUSES,
  PLOT_STATUS_LABELS,
  countUnresolvedClues,
  endpointKey,
  groupScenesByChapter,
  isAllPlotChapter,
} from "../plots";
import styles from "./PlotListPage.module.css";

const archiveOptions = [
  ["active", "활성"],
  ["archived", "보관됨"],
  ["all", "전체"],
];

const useUrlBackedTextValue = (urlValue) => {
  const [draft, setDraft] = useState({ source: urlValue, value: urlValue });
  const value = draft.source === urlValue ? draft.value : urlValue;
  return [value, (nextValue) => setDraft({ source: urlValue, value: nextValue })];
};

const emptyCopy = ({ archiveStatus, hasFilters }) => {
  if (archiveStatus === "archived") {
    return {
      description: "보관한 장면이 아직 없습니다.",
      title: "보관된 장면이 없습니다.",
    };
  }
  if (hasFilters) {
    return {
      description: "검색어나 상태, 복선 조건을 바꿔 보세요.",
      title: "조건에 맞는 장면이 없습니다.",
    };
  }
  return {
    description: "첫 장면을 추가해 이야기를 구성해 보세요.",
    title: "등록된 장면이 없습니다.",
  };
};

function SceneCard({
  canReorder,
  isFirst,
  isLast,
  labels,
  menuItemId,
  onMove,
  onRestore,
  pending,
  position,
  scene,
  unresolvedCount,
  workId,
}) {
  const pov = scene.povCharacterId
    ? labels.get(endpointKey({ type: "character", id: scene.povCharacterId }))
    : null;
  const location = scene.locationWorldId
    ? labels.get(endpointKey({ type: "world", id: scene.locationWorldId }))
    : null;
  const locationText = [location?.label, scene.locationDetail]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className={styles.sceneItem}>
      <Card as="article" className={styles.card}>
        <Link
          className={styles.cardLink}
          to={plotDetailPath(workId, menuItemId, scene.id)}
        >
          <div className={styles.cardHeader}>
            <span className={styles.sceneNumber}>장면 {position}</span>
            <strong>{scene.title}</strong>
            <span className={styles.statusBadge}>
              {PLOT_STATUS_LABELS.get(scene.status) ?? scene.status}
            </span>
          </div>
          <dl className={styles.meta}>
            <div><dt>POV</dt><dd>{pov?.label ?? "-"}</dd></div>
            <div><dt>시간</dt><dd>{scene.storyTime || "-"}</dd></div>
            <div><dt>장소</dt><dd>{locationText || "-"}</dd></div>
            <div><dt>인물</dt><dd>{scene.characterIds.length}명</dd></div>
          </dl>
          <p>{scene.summary || "-"}</p>
          <div className={styles.badges}>
            {unresolvedCount > 0 ? (
              <span className={styles.clueBadge}>미회수 복선 {unresolvedCount}</span>
            ) : null}
            {scene.archivedAt ? <span className={styles.archivedBadge}>보관됨</span> : null}
          </div>
        </Link>
        {canReorder && !scene.archivedAt ? (
          <div className={styles.reorder}>
            <Button
              aria-label={`${scene.title} 위로 이동`}
              disabled={pending || isFirst}
              size="small"
              variant="secondary"
              onClick={() => onMove(scene, position - 2)}
            >
              <ArrowUp aria-hidden="true" size={17} />
              위로
            </Button>
            <Button
              aria-label={`${scene.title} 아래로 이동`}
              disabled={pending || isLast}
              size="small"
              variant="secondary"
              onClick={() => onMove(scene, position)}
            >
              <ArrowDown aria-hidden="true" size={17} />
              아래로
            </Button>
          </div>
        ) : null}
        {scene.archivedAt ? (
          <Button
            aria-label={`${scene.title} 복원`}
            className={styles.restoreButton}
            disabled={pending}
            size="small"
            variant="secondary"
            onClick={() => onRestore(scene.id)}
          >
            복원
          </Button>
        ) : null}
      </Card>
    </li>
  );
}

function PlotListPage({
  menus = menuRepository,
  relations = relationRepository,
  repository = plotRepository,
}) {
  const { menuItem } = useOutletContext();
  const { workId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlQuery = searchParams.get("q") ?? "";
  const [query, setQuery] = useUrlBackedTextValue(urlQuery);
  const debouncedQuery = useDebouncedValue(query, 300);
  const status = searchParams.get("status") ?? "";
  const unresolved = searchParams.get("clues") === "unresolved";
  // Router search-param updates land asynchronously, so keep the checkbox
  // optimistic to avoid a controlled-input flicker.
  const [unresolvedChecked, setUnresolvedChecked] = useUrlBackedTextValue(unresolved);
  const requestedArchive = searchParams.get("archive") ?? "active";
  const archiveStatus = archiveOptions.some(([value]) => value === requestedArchive)
    ? requestedArchive
    : "active";
  const isAll = isAllPlotChapter(menuItem);
  const queryClient = useQueryClient();

  const chaptersQuery = useQuery({
    networkMode: "always",
    queryKey: menuQueryKeys.items("plot", true),
    queryFn: () => menus.listItems("plot", { includeArchived: true }),
    retry: false,
  });
  const scenesQuery = useQuery({
    networkMode: "always",
    queryKey: plotQueryKeys.list(workId, menuItem.id, debouncedQuery, {
      archiveStatus,
      status,
      unresolved,
    }),
    queryFn: () =>
      repository.list({
        archiveStatus,
        chapterId: menuItem.id,
        q: debouncedQuery,
        status,
        unresolved,
        workId,
      }),
  });
  // Every scene in the work, used to decide whether clues are resolved.
  const indexQuery = useQuery({
    networkMode: "always",
    queryKey: plotQueryKeys.index(workId),
    queryFn: () => repository.list({ archiveStatus: "all", workId }),
  });
  const candidatesQuery = useQuery({
    networkMode: "always",
    queryKey: relationQueryKeys.candidates(workId, undefined),
    queryFn: () => relations.listCandidates(workId, undefined, { includeArchived: true }),
    retry: false,
  });

  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: plotQueryKeys.all(workId) }),
      queryClient.invalidateQueries({ queryKey: relationQueryKeys.all(workId) }),
    ]);
  const moveMutation = useMutation({
    mutationFn: ({ index, scene }) =>
      repository.move(workId, scene.id, { chapterId: scene.chapterId, index }),
    onSuccess: invalidate,
  });
  const restoreMutation = useMutation({
    mutationFn: (sceneId) => repository.restore(workId, sceneId),
    onSuccess: invalidate,
  });

  const setFilter = (key, value) => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true },
    );
  };

  useEffect(() => {
    // Only push settled user edits; external URL changes must not be reverted.
    if (debouncedQuery !== query) return;
    if ((searchParams.get("q") ?? "") === debouncedQuery) return;
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (debouncedQuery) next.set("q", debouncedQuery);
        else next.delete("q");
        return next;
      },
      { replace: true },
    );
  }, [debouncedQuery, query, searchParams, setSearchParams]);

  const scenes = useMemo(() => scenesQuery.data ?? [], [scenesQuery.data]);
  const scenesById = useMemo(
    () => new Map((indexQuery.data ?? []).map((scene) => [scene.id, scene])),
    [indexQuery.data],
  );
  const labels = useMemo(
    () =>
      new Map(
        (candidatesQuery.data ?? []).map((candidate) => [
          endpointKey(candidate.endpoint),
          candidate,
        ]),
      ),
    [candidatesQuery.data],
  );
  const groups = useMemo(
    () =>
      isAll
        ? groupScenesByChapter(scenes, chaptersQuery.data ?? [])
        : scenes.length
          ? [{ chapter: menuItem, scenes }]
          : [],
    [chaptersQuery.data, isAll, menuItem, scenes],
  );

  const loading =
    scenesQuery.isLoading ||
    chaptersQuery.isLoading ||
    candidatesQuery.isLoading ||
    indexQuery.isLoading;
  const failed =
    scenesQuery.isError ||
    chaptersQuery.isError ||
    candidatesQuery.isError ||
    indexQuery.isError;
  const hasFilters = Boolean(
    debouncedQuery || status || unresolved || archiveStatus !== "active",
  );
  const canReorder = !hasFilters;
  const pending = moveMutation.isPending || restoreMutation.isPending;
  const empty = emptyCopy({ archiveStatus, hasFilters });

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Plot</span>
          <h2 className={styles.title}>{menuItem.label}</h2>
        </div>
        <Button as={Link} size="small" to={plotCreatePath(workId, menuItem.id)}>
          <Plus aria-hidden="true" size={18} />
          추가
        </Button>
      </header>

      <div className={styles.filters}>
        <label className={styles.search}>
          <Search aria-hidden="true" size={19} />
          <Input
            aria-label="장면 검색"
            className={styles.searchInput}
            placeholder="제목, 요약, 사건, 복선 검색"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label className={styles.filterField}>
          <span>상태</span>
          <select
            aria-label="장면 상태 필터"
            value={status}
            onChange={(event) => setFilter("status", event.target.value)}
          >
            <option value="">전체 상태</option>
            {PLOT_SCENE_STATUSES.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label className={styles.filterField}>
          <span>보관 상태</span>
          <select
            aria-label="장면 보관 상태 필터"
            value={archiveStatus}
            onChange={(event) =>
              setFilter("archive", event.target.value === "active" ? "" : event.target.value)
            }
          >
            {archiveOptions.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label className={styles.checkboxField}>
          <input
            checked={unresolvedChecked}
            type="checkbox"
            onChange={(event) => {
              setUnresolvedChecked(event.target.checked);
              setFilter("clues", event.target.checked ? "unresolved" : "");
            }}
          />
          <span>미회수 복선만</span>
        </label>
      </div>
      {!canReorder && scenes.length > 0 ? (
        <p className={styles.hint}>필터를 모두 해제하면 장면 순서를 바꿀 수 있습니다.</p>
      ) : null}

      {loading ? (
        <div aria-live="polite" className={styles.loadingState} role="status">
          <Skeleton className={styles.loadingSkeleton} />
          <span>장면을 불러오는 중입니다.</span>
        </div>
      ) : null}
      {failed ? (
        <p className={styles.errorState} role="alert">장면을 불러오지 못했습니다.</p>
      ) : null}
      {!loading && !failed && scenes.length === 0 ? (
        <EmptyState
          className={styles.emptyState}
          description={empty.description}
          headingLevel={3}
          icon={<Route size={24} />}
          title={empty.title}
        />
      ) : null}

      {!loading && !failed
        ? groups.map(({ chapter, scenes: chapterScenes }) => (
            <section
              aria-labelledby={`plot-chapter-${chapter.id}`}
              className={styles.chapter}
              key={chapter.id}
            >
              <h3 className={isAll ? styles.chapterTitle : styles.visuallyHidden} id={`plot-chapter-${chapter.id}`}>
                {chapter.label}
                {chapter.archivedAt ? <span className={styles.archivedBadge}>보관된 챕터</span> : null}
              </h3>
              <ol className={styles.sceneList}>
                {chapterScenes.map((scene, index) => (
                  <SceneCard
                    canReorder={canReorder}
                    isFirst={index === 0}
                    isLast={index === chapterScenes.length - 1}
                    key={scene.id}
                    labels={labels}
                    menuItemId={menuItem.id}
                    pending={pending}
                    position={index + 1}
                    scene={scene}
                    unresolvedCount={countUnresolvedClues(scene, scenesById)}
                    workId={workId}
                    onMove={(target, nextIndex) =>
                      moveMutation.mutate({ index: nextIndex, scene: target })
                    }
                    onRestore={(sceneId) => restoreMutation.mutate(sceneId)}
                  />
                ))}
              </ol>
            </section>
          ))
        : null}

      {moveMutation.isError ? (
        <p className={styles.inlineError} role="alert">장면 순서를 바꾸지 못했습니다.</p>
      ) : null}
      {restoreMutation.isError ? (
        <p className={styles.inlineError} role="alert">장면을 복원하지 못했습니다.</p>
      ) : null}
    </section>
  );
}

export default PlotListPage;
