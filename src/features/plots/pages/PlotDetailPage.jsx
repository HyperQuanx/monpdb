import { useMemo, useState } from "react";
import {
  Link,
  useNavigate,
  useOutletContext,
  useParams,
} from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, ArrowLeft, ArrowRightLeft, Pencil, RotateCcw } from "lucide-react";
import {
  plotDetailPath,
  plotEditPath,
  plotListPath,
} from "../../../app/paths";
import {
  menuQueryKeys,
  menuRepository,
  plotQueryKeys,
  plotRepository,
  relationQueryKeys,
  relationRepository,
} from "../../../data/repositories/appRepositories";
import { RichTextRenderer } from "../../../shared/editor";
import { Button, Skeleton } from "../../../shared/ui";
import {
  PLOT_STATUS_LABELS,
  endpointKey,
  isAllPlotChapter,
  isConcretePlotChapter,
  isPlotClueResolved,
  relationCandidatePath,
  sameEndpoint,
  sceneBelongsToMenu,
} from "../plots";
import styles from "./PlotDetailPage.module.css";

const displayValue = (value) => value || "-";

function EntityLink({ candidate, endpoint, workId }) {
  if (!candidate) {
    return <strong>{`${endpoint.type}:${endpoint.id}`}</strong>;
  }
  const path = relationCandidatePath(workId, candidate);
  return (
    <span className={styles.relationTarget}>
      {path ? <Link to={path}>{candidate.label}</Link> : <strong>{candidate.label}</strong>}
      {candidate.archivedAt ? <span className={styles.archivedBadge}>보관됨</span> : null}
    </span>
  );
}

function RelationSection({ candidateMap, direction, relations, source, workId }) {
  const isOutgoing = direction === "outgoing";
  const visible = relations.filter((relation) =>
    isOutgoing
      ? sameEndpoint(relation.source, source)
      : !sameEndpoint(relation.source, source),
  );

  return (
    <section aria-labelledby={`${direction}-plot-relations`} className={styles.relationSection}>
      <h3 id={`${direction}-plot-relations`}>{isOutgoing ? "나가는 관계" : "들어오는 관계"}</h3>
      {visible.length === 0 ? (
        <p className={styles.relationState}>연결된 관계가 없습니다.</p>
      ) : (
        <ul className={styles.relations}>
          {visible.map((relation) => {
            const other = isOutgoing ? relation.target : relation.source;
            return (
              <li key={relation.id}>
                <EntityLink candidate={candidateMap.get(endpointKey(other))} endpoint={other} workId={workId} />
                <span>{relation.label} · {relation.relationType}{relation.bidirectional ? " · 상호" : ""}</span>
                {relation.notes ? <small>{relation.notes}</small> : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function PlotDetailContent({
  candidateMap,
  chapters,
  menuItem,
  relationRecords,
  repository,
  scene,
  scenesById,
  workId,
}) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const source = useMemo(
    () => ({ type: scene.resourceType, id: scene.id }),
    [scene.id, scene.resourceType],
  );
  const chapterLabel =
    chapters.find(({ id }) => id === scene.chapterId)?.label ??
    scene.chapterName ??
    scene.chapterId;
  const moveTargets = chapters.filter(
    (chapter) => isConcretePlotChapter(chapter) && chapter.id !== scene.chapterId,
  );
  const [targetChapterId, setTargetChapterId] = useState("");
  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: plotQueryKeys.all(workId) }),
      queryClient.invalidateQueries({ queryKey: relationQueryKeys.all(workId) }),
    ]);
  const lifecycleMutation = useMutation({
    mutationFn: () =>
      scene.archivedAt
        ? repository.restore(workId, scene.id)
        : repository.archive(workId, scene.id),
    onSuccess: async (updated) => {
      queryClient.setQueryData(plotQueryKeys.detail(workId, scene.id), updated);
      await invalidate();
    },
  });
  const moveMutation = useMutation({
    mutationFn: (chapterId) => repository.move(workId, scene.id, { chapterId }),
    onSuccess: async (moved) => {
      queryClient.setQueryData(plotQueryKeys.detail(workId, scene.id), moved);
      await invalidate();
      setTargetChapterId("");
      if (!isAllPlotChapter(menuItem)) {
        navigate(plotDetailPath(workId, moved.chapterId, moved.id), { replace: true });
      }
    },
  });

  const characterEndpoint = (id) => ({ type: "character", id });
  const pov = scene.povCharacterId ? characterEndpoint(scene.povCharacterId) : null;
  const location = scene.locationWorldId ? { type: "world", id: scene.locationWorldId } : null;
  const incomingPayoffs = [...scenesById.values()].flatMap((other) =>
    other.id === scene.id
      ? []
      : other.clues
          .filter((clue) => clue.payoffSceneId === scene.id)
          .map((clue) => ({ clue, origin: other })),
  );
  const unresolvedCount = scene.clues.filter(
    (clue) => !isPlotClueResolved(clue, scenesById),
  ).length;

  return (
    <article className={styles.page}>
      {scene.archivedAt ? (
        <div className={styles.archivedBanner} role="status">
          <span>보관된 장면입니다. 연결된 관계와 복선은 유지됩니다.</span>
          <Button
            disabled={lifecycleMutation.isPending}
            size="small"
            variant="secondary"
            onClick={() => lifecycleMutation.mutate()}
          >
            <RotateCcw aria-hidden="true" size={17} />
            복원
          </Button>
        </div>
      ) : null}

      <header className={styles.header}>
        <div className={styles.headingGroup}>
          <span className={styles.eyebrow}>{chapterLabel} · 장면 {scene.order + 1}</span>
          <h2>{scene.title}</h2>
          <p>{displayValue(scene.summary)}</p>
        </div>
        {!scene.archivedAt ? (
          <div className={styles.actions}>
            <Button as={Link} size="small" to={plotEditPath(workId, menuItem.id, scene.id)} variant="secondary">
              <Pencil aria-hidden="true" size={17} />
              편집
            </Button>
            <Button
              disabled={lifecycleMutation.isPending}
              size="small"
              variant="danger"
              onClick={() => lifecycleMutation.mutate()}
            >
              <Archive aria-hidden="true" size={17} />
              보관
            </Button>
          </div>
        ) : null}
      </header>

      {lifecycleMutation.isError ? (
        <p className={styles.error} role="alert">보관 상태를 변경하지 못했습니다.</p>
      ) : null}

      <dl className={styles.meta}>
        <div><dt>챕터</dt><dd>{chapterLabel}</dd></div>
        <div><dt>상태</dt><dd>{PLOT_STATUS_LABELS.get(scene.status) ?? scene.status}</dd></div>
        <div>
          <dt>POV</dt>
          <dd>{pov ? <EntityLink candidate={candidateMap.get(endpointKey(pov))} endpoint={pov} workId={workId} /> : "-"}</dd>
        </div>
        <div><dt>시간</dt><dd>{displayValue(scene.storyTime)}</dd></div>
        <div>
          <dt>장소</dt>
          <dd className={styles.inlineValues}>
            {location ? <EntityLink candidate={candidateMap.get(endpointKey(location))} endpoint={location} workId={workId} /> : null}
            {scene.locationDetail ? <span>{scene.locationDetail}</span> : null}
            {!location && !scene.locationDetail ? "-" : null}
          </dd>
        </div>
        <div>
          <dt>인물</dt>
          <dd>
            {scene.characterIds.length > 0 ? (
              <ul aria-label="등장 인물" className={styles.chips}>
                {scene.characterIds.map((id) => {
                  const endpoint = characterEndpoint(id);
                  return (
                    <li key={id}>
                      <EntityLink candidate={candidateMap.get(endpointKey(endpoint))} endpoint={endpoint} workId={workId} />
                    </li>
                  );
                })}
              </ul>
            ) : "-"}
          </dd>
        </div>
        <div>
          <dt>태그</dt>
          <dd>
            {scene.tags.length > 0 ? (
              <ul aria-label="태그" className={styles.chips}>
                {scene.tags.map((tag) => <li key={tag}>{tag}</li>)}
              </ul>
            ) : "-"}
          </dd>
        </div>
      </dl>

      <section aria-labelledby="plot-event" className={styles.panel}>
        <h3 id="plot-event">사건</h3>
        <p className={styles.preWrap}>{displayValue(scene.event)}</p>
      </section>

      <section aria-labelledby="plot-clues" className={styles.panel}>
        <h3 id="plot-clues">
          복선
          {unresolvedCount > 0 ? <span className={styles.clueBadge}>미회수 {unresolvedCount}</span> : null}
        </h3>
        {scene.clues.length === 0 ? (
          <p className={styles.relationState}>등록된 복선이 없습니다.</p>
        ) : (
          <ul className={styles.relations}>
            {scene.clues.map((clue) => {
              const payoff = clue.payoffSceneId ? scenesById.get(clue.payoffSceneId) : null;
              const payoffEndpoint = clue.payoffSceneId ? { type: "plot", id: clue.payoffSceneId } : null;
              const resolved = isPlotClueResolved(clue, scenesById);
              return (
                <li key={clue.id}>
                  <strong>{clue.clue}</strong>
                  <span className={styles.inlineValues}>
                    <span>{resolved ? "회수됨" : "미회수"}</span>
                    {payoffEndpoint ? (
                      <>
                        {" · 회수 장면 "}
                        <EntityLink candidate={candidateMap.get(endpointKey(payoffEndpoint))} endpoint={payoffEndpoint} workId={workId} />
                      </>
                    ) : null}
                    {payoff?.archivedAt ? <small>회수 장면이 보관되어 미회수로 봅니다.</small> : null}
                  </span>
                  {clue.notes ? <small>{clue.notes}</small> : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {incomingPayoffs.length > 0 ? (
        <section aria-labelledby="plot-payoffs" className={styles.panel}>
          <h3 id="plot-payoffs">이 장면에서 회수되는 복선</h3>
          <ul className={styles.relations}>
            {incomingPayoffs.map(({ clue, origin }) => {
              const endpoint = { type: "plot", id: origin.id };
              return (
                <li key={`${origin.id}:${clue.id}`}>
                  <strong>{clue.clue}</strong>
                  <span className={styles.inlineValues}>
                    {"복선 장면 "}
                    <EntityLink candidate={candidateMap.get(endpointKey(endpoint))} endpoint={endpoint} workId={workId} />
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="plot-body" className={styles.panel}>
        <h3 id="plot-body">본문</h3>
        <RichTextRenderer className={styles.body} value={scene.body} />
      </section>

      {!scene.archivedAt && moveTargets.length > 0 ? (
        <section aria-labelledby="plot-move" className={styles.panel}>
          <h3 id="plot-move">다른 챕터로 이동</h3>
          <div className={styles.moveRow}>
            <label className={styles.moveField}>
              <span>이동할 챕터</span>
              <select
                value={targetChapterId}
                onChange={(event) => setTargetChapterId(event.target.value)}
              >
                <option value="">챕터 선택</option>
                {moveTargets.map((chapter) => (
                  <option key={chapter.id} value={chapter.id}>{chapter.label}</option>
                ))}
              </select>
            </label>
            <Button
              disabled={!targetChapterId || moveMutation.isPending}
              size="small"
              variant="secondary"
              onClick={() => moveMutation.mutate(targetChapterId)}
            >
              <ArrowRightLeft aria-hidden="true" size={17} />
              챕터 이동
            </Button>
          </div>
          <p className={styles.relationState}>이동한 장면은 대상 챕터의 마지막 순서에 놓입니다.</p>
          {moveMutation.isError ? (
            <p className={styles.error} role="alert">장면을 이동하지 못했습니다.</p>
          ) : null}
        </section>
      ) : null}

      <div className={styles.relationGrid}>
        <RelationSection candidateMap={candidateMap} direction="outgoing" relations={relationRecords} source={source} workId={workId} />
        <RelationSection candidateMap={candidateMap} direction="incoming" relations={relationRecords} source={source} workId={workId} />
      </div>

      <Button as={Link} className={styles.backLink} to={plotListPath(workId, menuItem.id)} variant="ghost">
        <ArrowLeft aria-hidden="true" size={18} />
        {menuItem.label} 목록
      </Button>
    </article>
  );
}

function PlotDetailPage({
  menus = menuRepository,
  relations = relationRepository,
  repository = plotRepository,
}) {
  const { menuItem } = useOutletContext();
  const { sceneId, workId } = useParams();
  const sceneQuery = useQuery({
    enabled: Boolean(sceneId),
    networkMode: "always",
    queryKey: plotQueryKeys.detail(workId, sceneId),
    queryFn: () => repository.get(workId, sceneId),
    retry: false,
  });
  const chaptersQuery = useQuery({
    networkMode: "always",
    queryKey: menuQueryKeys.items("plot", true),
    queryFn: () => menus.listItems("plot", { includeArchived: true }),
    retry: false,
  });
  const indexQuery = useQuery({
    networkMode: "always",
    queryKey: plotQueryKeys.index(workId),
    queryFn: () => repository.list({ archiveStatus: "all", workId }),
    retry: false,
  });
  const scene = sceneQuery.data;
  const matchesMenu = scene ? sceneBelongsToMenu(scene, menuItem) : false;
  const source = useMemo(
    () => (scene ? { type: scene.resourceType, id: scene.id } : undefined),
    [scene],
  );
  const relationsQuery = useQuery({
    enabled: Boolean(source && matchesMenu),
    networkMode: "always",
    queryKey: relationQueryKeys.list(workId, source),
    queryFn: () => relations.list(workId, source),
    retry: false,
  });
  // Unscoped candidates include this scene too, so payoff links can resolve.
  const candidatesQuery = useQuery({
    enabled: Boolean(source && matchesMenu),
    networkMode: "always",
    queryKey: relationQueryKeys.candidates(workId, undefined),
    queryFn: () => relations.listCandidates(workId, undefined, { includeArchived: true }),
    retry: false,
  });
  const candidateMap = useMemo(
    () =>
      new Map(
        (candidatesQuery.data ?? []).map((candidate) => [
          endpointKey(candidate.endpoint),
          candidate,
        ]),
      ),
    [candidatesQuery.data],
  );
  const scenesById = useMemo(
    () => new Map((indexQuery.data ?? []).map((item) => [item.id, item])),
    [indexQuery.data],
  );
  const failed =
    sceneQuery.isError ||
    chaptersQuery.isError ||
    indexQuery.isError ||
    relationsQuery.isError ||
    candidatesQuery.isError;
  const loading =
    !failed &&
    (sceneQuery.isPending ||
      chaptersQuery.isPending ||
      indexQuery.isPending ||
      (matchesMenu && (relationsQuery.isPending || candidatesQuery.isPending)));

  if (loading) {
    return (
      <div aria-live="polite" className={styles.state} role="status">
        <Skeleton className={styles.loadingSkeleton} />
        <span>장면을 불러오는 중입니다.</span>
      </div>
    );
  }

  if (failed || !scene || !matchesMenu) {
    return (
      <section className={styles.state} role="alert">
        <p>현재 챕터에서 장면을 찾을 수 없습니다.</p>
        <Link to={plotListPath(workId, menuItem.id)}>{menuItem.label} 목록으로</Link>
      </section>
    );
  }

  return (
    <PlotDetailContent
      candidateMap={candidateMap}
      chapters={chaptersQuery.data ?? []}
      key={`${scene.id}:${scene.version}`}
      menuItem={menuItem}
      relationRecords={relationsQuery.data ?? []}
      repository={repository}
      scene={scene}
      scenesById={scenesById}
      workId={workId}
    />
  );
}

export default PlotDetailPage;
