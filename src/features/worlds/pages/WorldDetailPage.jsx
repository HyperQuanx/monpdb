import { useMemo } from "react";
import { Link, useOutletContext, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, ArrowLeft, Pencil, RotateCcw } from "lucide-react";
import {
  worldEditPath,
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
import { RichTextRenderer } from "../../../shared/editor";
import { Button, Skeleton } from "../../../shared/ui";
import {
  WORLD_CATEGORY_LABELS,
  endpointKey,
  relationCandidatePath,
  sameEndpoint,
  worldBelongsToMenu,
} from "../worlds";
import styles from "./WorldDetailPage.module.css";

const displayValue = (value) => value || "-";

function RelationSection({ candidates, direction, relations, source, workId }) {
  const isOutgoing = direction === "outgoing";
  const visible = relations.filter((relation) =>
    isOutgoing
      ? sameEndpoint(relation.source, source)
      : !sameEndpoint(relation.source, source),
  );
  const candidateMap = new Map(
    candidates.map((candidate) => [endpointKey(candidate.endpoint), candidate]),
  );
  const title = isOutgoing ? "나가는 관계" : "들어오는 관계";

  return (
    <section aria-labelledby={`${direction}-world-relations`} className={styles.relationSection}>
      <h3 id={`${direction}-world-relations`}>{title}</h3>
      {visible.length === 0 ? (
        <p className={styles.relationState}>연결된 관계가 없습니다.</p>
      ) : (
        <ul className={styles.relations}>
          {visible.map((relation) => {
            const other = isOutgoing ? relation.target : relation.source;
            const candidate = candidateMap.get(endpointKey(other));
            const path = relationCandidatePath(workId, candidate);
            const label = candidate?.label ?? `${other.type}:${other.id}`;
            return (
              <li key={relation.id}>
                <div className={styles.relationTarget}>
                  {path ? <Link to={path}>{label}</Link> : <strong>{label}</strong>}
                  {candidate?.archivedAt ? <span className={styles.archivedBadge}>보관됨</span> : null}
                </div>
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

function WorldDetailContent({
  candidates,
  menuItem,
  menuItems,
  relationRecords,
  repository,
  workId,
  world,
}) {
  const queryClient = useQueryClient();
  const source = useMemo(
    () => ({ type: world.resourceType, id: world.id }),
    [world.id, world.resourceType],
  );
  const regionLabel = menuItems.find(({ id }) => id === world.regionId)?.label
    ?? world.regionName
    ?? world.regionId;
  const lifecycleMutation = useMutation({
    mutationFn: () => world.archivedAt
      ? repository.restore(workId, world.id)
      : repository.archive(workId, world.id),
    onSuccess: async (updatedWorld) => {
      queryClient.setQueryData(worldQueryKeys.detail(workId, world.id), updatedWorld);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: worldQueryKeys.all(workId) }),
        queryClient.invalidateQueries({ queryKey: relationQueryKeys.all(workId) }),
      ]);
    },
  });

  const listValues = [
    ["세력", world.factions],
    ["장소", world.places],
    ["태그", world.tags],
  ];

  return (
    <article className={styles.page}>
      {world.archivedAt ? (
        <div className={styles.archivedBanner} role="status">
          <span>보관된 세계관입니다. 연결된 관계는 유지됩니다.</span>
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
          <span className={styles.eyebrow}>{menuItem.label} · {regionLabel}</span>
          <h2>{world.title}</h2>
          <p>{displayValue(world.summary)}</p>
        </div>
        {!world.archivedAt ? (
          <div className={styles.actions}>
            <Button as={Link} size="small" to={worldEditPath(workId, menuItem.id, world.id)} variant="secondary">
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
        <div><dt>지역</dt><dd>{regionLabel}</dd></div>
        <div><dt>분류</dt><dd>{WORLD_CATEGORY_LABELS.get(world.category) ?? world.category}</dd></div>
        <div><dt>시대</dt><dd>{displayValue(world.era)}</dd></div>
        <div><dt>상태</dt><dd>{world.status}</dd></div>
        {listValues.map(([label, values]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>
              {values.length > 0 ? (
                <ul aria-label={label} className={styles.chips}>
                  {values.map((value) => <li key={value}>{value}</li>)}
                </ul>
              ) : "-"}
            </dd>
          </div>
        ))}
      </dl>

      {[["rules", "규칙", world.rules], ["history", "역사", world.history], ["culture", "문화", world.culture]].map(([id, title, value]) => (
        <section aria-labelledby={`world-${id}`} className={styles.panel} key={id}>
          <h3 id={`world-${id}`}>{title}</h3>
          <p className={styles.preWrap}>{displayValue(value)}</p>
        </section>
      ))}

      <section aria-labelledby="world-body" className={styles.panel}>
        <h3 id="world-body">본문</h3>
        <RichTextRenderer className={styles.body} value={world.body} />
      </section>

      <div className={styles.relationGrid}>
        <RelationSection candidates={candidates} direction="outgoing" relations={relationRecords} source={source} workId={workId} />
        <RelationSection candidates={candidates} direction="incoming" relations={relationRecords} source={source} workId={workId} />
      </div>

      <Button as={Link} className={styles.backLink} to={worldListPath(workId, menuItem.id)} variant="ghost">
        <ArrowLeft aria-hidden="true" size={18} />
        {menuItem.label} 목록
      </Button>
    </article>
  );
}

function WorldDetailPage({
  menus = menuRepository,
  relations = relationRepository,
  repository = worldRepository,
}) {
  const { menuItem } = useOutletContext();
  const { workId, worldId } = useParams();
  const worldQuery = useQuery({
    enabled: Boolean(worldId),
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
  const world = worldQuery.data;
  const matchesRegion = world ? worldBelongsToMenu(world, menuItem) : false;
  const source = useMemo(
    () => world ? { type: world.resourceType, id: world.id } : undefined,
    [world],
  );
  const relationsQuery = useQuery({
    enabled: Boolean(source && matchesRegion),
    networkMode: "always",
    queryKey: relationQueryKeys.list(workId, source),
    queryFn: () => relations.list(workId, source),
    retry: false,
  });
  const candidatesQuery = useQuery({
    enabled: Boolean(source && matchesRegion),
    networkMode: "always",
    queryKey: relationQueryKeys.candidates(workId, source),
    queryFn: () => relations.listCandidates(workId, source, { includeArchived: true }),
    retry: false,
  });
  const loading =
    worldQuery.isPending ||
    menuItemsQuery.isPending ||
    (matchesRegion && (relationsQuery.isPending || candidatesQuery.isPending));
  const failed =
    worldQuery.isError ||
    menuItemsQuery.isError ||
    relationsQuery.isError ||
    candidatesQuery.isError;

  if (loading) {
    return (
      <div aria-live="polite" className={styles.state} role="status">
        <Skeleton className={styles.loadingSkeleton} />
        <span>세계관을 불러오는 중입니다.</span>
      </div>
    );
  }

  if (failed || !world || !matchesRegion) {
    return (
      <section className={styles.state} role="alert">
        <p>현재 지역에서 세계관을 찾을 수 없습니다.</p>
        <Link to={worldListPath(workId, menuItem.id)}>{menuItem.label} 목록으로</Link>
      </section>
    );
  }

  return (
    <WorldDetailContent
      candidates={candidatesQuery.data ?? []}
      key={`${world.id}:${world.version}`}
      menuItem={menuItem}
      menuItems={menuItemsQuery.data ?? []}
      relationRecords={relationsQuery.data ?? []}
      repository={repository}
      workId={workId}
      world={world}
    />
  );
}

export default WorldDetailPage;
