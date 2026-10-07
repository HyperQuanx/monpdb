import { Link, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, ArrowLeft, Pencil } from "lucide-react";
import {
  workEntryEditPath,
  workMenuPath,
} from "../../../app/paths";
import {
  contentQueryKeys,
  contentRepository,
  relationQueryKeys,
  relationRepository,
} from "../../../data/repositories/appRepositories";
import { RichTextRenderer } from "../../../shared/editor";
import { Button, Skeleton } from "../../../shared/ui";
import {
  contentBelongsToMenu,
  endpointKey,
  sameEndpoint,
} from "../contentMenu";
import styles from "./ContentDetailPage.module.css";

const relationDirection = (relation, source) =>
  sameEndpoint(relation.source, source) ? "나가는 관계" : "들어오는 관계";

function ContentDetailPage({
  repository = contentRepository,
  relations = relationRepository,
}) {
  const { menuItem } = useOutletContext();
  const { entryId, menuItemId, sectionId, workId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const listPath = workMenuPath(workId, sectionId, menuItemId);

  const entryQuery = useQuery({
    enabled: Boolean(entryId),
    networkMode: "always",
    queryKey: contentQueryKeys.detail(workId, entryId),
    queryFn: () => repository.get(workId, entryId),
    retry: false,
  });
  const entry = entryQuery.data;
  const matchesMenu = entry ? contentBelongsToMenu(entry, menuItem) : false;
  const source = entry ? { type: entry.type, id: entry.id } : undefined;
  const connectedQuery = useQuery({
    enabled: Boolean(source && matchesMenu),
    networkMode: "always",
    queryKey: relationQueryKeys.list(workId, source),
    queryFn: () => relations.list(workId, source),
    retry: false,
  });
  const candidatesQuery = useQuery({
    enabled: Boolean(entry && matchesMenu),
    networkMode: "always",
    queryKey: relationQueryKeys.candidates(workId),
    queryFn: () => relations.listCandidates(workId),
    retry: false,
  });

  const archiveMutation = useMutation({
    mutationFn: () => repository.archive(workId, entryId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: contentQueryKeys.all(workId) }),
        queryClient.invalidateQueries({ queryKey: relationQueryKeys.all(workId) }),
      ]);
      navigate(listPath, { replace: true });
    },
  });

  if (entryQuery.isPending) {
    return (
      <div aria-live="polite" className={styles.state} role="status">
        <Skeleton className={styles.loadingSkeleton} />
        <span>항목을 불러오는 중입니다.</span>
      </div>
    );
  }

  if (entryQuery.isError || !entry || !matchesMenu) {
    return (
      <div className={styles.state} role="alert">
        <p>현재 메뉴에서 이 항목을 찾을 수 없습니다.</p>
        <Button as={Link} size="small" to={listPath} variant="secondary">
          목록으로 돌아가기
        </Button>
      </div>
    );
  }

  const connected = connectedQuery.data ?? [];
  const candidateLabels = new Map(
    (candidatesQuery.data ?? []).map((candidate) => [
      endpointKey(candidate.endpoint),
      candidate.label,
    ]),
  );
  candidateLabels.set(endpointKey(source), entry.title);

  return (
    <article className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headingGroup}>
          <span className={styles.eyebrow}>{menuItem.label}</span>
          <h2>{entry.title}</h2>
          {entry.summary ? <p>{entry.summary}</p> : null}
        </div>
        <div className={styles.actions}>
          <Button
            as={Link}
            size="small"
            to={workEntryEditPath(
              workId,
              sectionId,
              menuItemId,
              entry.id,
            )}
            variant="secondary"
          >
            <Pencil aria-hidden="true" size={17} />
            편집
          </Button>
          <Button
            disabled={archiveMutation.isPending || Boolean(entry.archivedAt)}
            size="small"
            variant="danger"
            onClick={() => archiveMutation.mutate()}
          >
            <Archive aria-hidden="true" size={17} />
            {entry.archivedAt ? "보관됨" : "보관"}
          </Button>
        </div>
      </header>

      {archiveMutation.isError ? (
        <p className={styles.error} role="alert">
          항목을 보관하지 못했습니다. 다시 시도해 주세요.
        </p>
      ) : null}

      <dl className={styles.meta}>
        <div>
          <dt>상태</dt>
          <dd>{entry.status}</dd>
        </div>
        <div>
          <dt>태그</dt>
          <dd>
            {entry.tags.length > 0 ? (
              <ul aria-label="태그" className={styles.tags}>
                {entry.tags.map((tag) => (
                  <li key={tag}>{tag}</li>
                ))}
              </ul>
            ) : (
              "-"
            )}
          </dd>
        </div>
      </dl>

      <section aria-labelledby="content-body-title" className={styles.panel}>
        <h3 id="content-body-title">본문</h3>
        <RichTextRenderer className={styles.body} value={entry.body} />
      </section>

      <section aria-labelledby="content-relations-title" className={styles.panel}>
        <h3 id="content-relations-title">연결된 관계</h3>
        {connectedQuery.isPending || candidatesQuery.isPending ? (
          <p aria-live="polite" className={styles.relationState} role="status">
            관계를 불러오는 중입니다.
          </p>
        ) : null}
        {connectedQuery.isError || candidatesQuery.isError ? (
          <p className={styles.error} role="alert">
            관계를 불러오지 못했습니다.
          </p>
        ) : null}
        {!connectedQuery.isPending &&
        !connectedQuery.isError &&
        connected.length === 0 ? (
          <p className={styles.relationState}>연결된 관계가 없습니다.</p>
        ) : null}
        {connected.length > 0 ? (
          <ul className={styles.relations}>
            {connected.map((relation) => {
              const other = sameEndpoint(relation.source, source)
                ? relation.target
                : relation.source;
              return (
                <li key={relation.id}>
                  <strong>{relation.label}</strong>
                  <span>
                    {candidateLabels.get(endpointKey(other)) ??
                      `${other.type}:${other.id}`}
                  </span>
                  <small>
                    {relationDirection(relation, source)} · {relation.relationType}
                    {relation.bidirectional ? " · 상호" : ""}
                  </small>
                </li>
              );
            })}
          </ul>
        ) : null}
      </section>

      <Button as={Link} className={styles.backLink} to={listPath} variant="ghost">
        <ArrowLeft aria-hidden="true" size={18} />
        {menuItem.label} 목록
      </Button>
    </article>
  );
}

export default ContentDetailPage;
