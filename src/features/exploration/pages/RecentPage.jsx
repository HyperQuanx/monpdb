import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  explorationQueryKeys,
  explorationRepository,
  menuRepository,
} from "../../../data/repositories/appRepositories";
import { recentViewStore, useRecentViews } from "../../../shared/navigation/recentViews";
import { Button, Skeleton } from "../../../shared/ui";
import EntityResult from "../components/EntityResult";
import { formatDateTime } from "../exploration";
import { useMenuLabels } from "../useMenuLabels";
import styles from "./ExplorationPages.module.css";

function RecentList({ empty, entities, label, menuLabels, meta, workId }) {
  if (entities.length === 0) return <p className={styles.empty}>{empty}</p>;
  return (
    <ol aria-label={label} className={styles.results}>
      {entities.map((entity) => (
        <EntityResult
          entity={{ ...entity, snippet: { label: meta.label, text: formatDateTime(meta.value(entity)) } }}
          key={`${entity.kind}:${entity.endpoint.id}`}
          menuLabels={menuLabels}
          workId={workId}
        />
      ))}
    </ol>
  );
}

function RecentPage({
  menus = menuRepository,
  repository = explorationRepository,
  store = recentViewStore,
}) {
  const { workId } = useParams();
  const views = useRecentViews(workId, store);
  const { labels: menuLabels } = useMenuLabels(menus);
  const references = views.map(({ id, kind }) => ({ id, kind }));
  const viewedAt = new Map(views.map((view) => [`${view.kind}:${view.id}`, view.viewedAt]));
  const viewedQuery = useQuery({
    networkMode: "always",
    queryKey: explorationQueryKeys.resolve(workId, references),
    queryFn: () => repository.resolve(workId, references),
    staleTime: 0,
  });
  const updatedQuery = useQuery({
    networkMode: "always",
    queryKey: explorationQueryKeys.recentlyUpdated(workId),
    queryFn: () => repository.listRecentlyUpdated(workId, { limit: 20 }),
    staleTime: 0,
  });

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <span className={styles.eyebrow}>Recent</span>
        <h2 className={styles.title}>최근 항목</h2>
        <p className={styles.lead}>이번 세션에서 열어 본 항목과 최근 수정된 항목입니다.</p>
      </header>

      <section aria-labelledby="recent-viewed" className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 id="recent-viewed">최근 본 항목</h3>
          {views.length > 0 ? (
            <Button size="small" variant="ghost" onClick={() => store.clear(workId)}>
              기록 지우기
            </Button>
          ) : null}
        </div>
        {viewedQuery.isPending ? (
          <div aria-live="polite" role="status">
            <Skeleton />
            <span className={styles.visuallyHidden}>최근 본 항목을 불러오는 중입니다.</span>
          </div>
        ) : null}
        {viewedQuery.isError ? <p className={styles.error} role="alert">최근 본 항목을 불러오지 못했습니다.</p> : null}
        {viewedQuery.data ? (
          <RecentList
            empty="아직 열어 본 항목이 없습니다. 상세 화면을 열면 여기에 기록됩니다."
            entities={viewedQuery.data}
            label="최근 본 항목"
            menuLabels={menuLabels}
            meta={{ label: "열어 본 시각", value: (entity) => viewedAt.get(`${entity.kind}:${entity.endpoint.id}`) }}
            workId={workId}
          />
        ) : null}
      </section>

      <section aria-labelledby="recent-updated" className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 id="recent-updated">최근 수정한 항목</h3>
        </div>
        {updatedQuery.isPending ? (
          <div aria-live="polite" role="status">
            <Skeleton />
            <span className={styles.visuallyHidden}>최근 수정한 항목을 불러오는 중입니다.</span>
          </div>
        ) : null}
        {updatedQuery.isError ? <p className={styles.error} role="alert">최근 수정한 항목을 불러오지 못했습니다.</p> : null}
        {updatedQuery.data ? (
          <RecentList
            empty="수정한 항목이 없습니다."
            entities={updatedQuery.data}
            label="최근 수정한 항목"
            menuLabels={menuLabels}
            meta={{ label: "수정", value: (entity) => entity.updatedAt }}
            workId={workId}
          />
        ) : null}
      </section>
    </section>
  );
}

export default RecentPage;
