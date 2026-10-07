import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RotateCcw } from "lucide-react";
import {
  explorationQueryKeys,
  explorationRepository,
  menuRepository,
  restoreRepositories,
} from "../../../data/repositories/appRepositories";
import { KIND_LABELS, entityDetailPath } from "../../../shared/navigation/entityPaths";
import { Button, Skeleton } from "../../../shared/ui";
import { formatDateTime } from "../../exploration/exploration";
import { useMenuLabels } from "../../exploration/useMenuLabels";
import styles from "../../exploration/pages/ExplorationPages.module.css";

const keyOf = (entity) => `${entity.kind}:${entity.endpoint.id}`;

function ArchivePage({
  menus = menuRepository,
  repositories = restoreRepositories,
  repository = explorationRepository,
}) {
  const { workId } = useParams();
  const queryClient = useQueryClient();
  const [kind, setKind] = useState("");
  const [selected, setSelected] = useState(() => new Set());
  const [report, setReport] = useState(null);
  const { labels: menuLabels } = useMenuLabels(menus);
  const filters = { archivedOnly: true, kind, limit: 500 };
  const archivedQuery = useQuery({
    networkMode: "always",
    queryKey: explorationQueryKeys.search(workId, filters),
    queryFn: () => repository.search(workId, filters),
    staleTime: 0,
  });
  const items = archivedQuery.data?.results ?? [];
  const selectedItems = items.filter((entity) => selected.has(keyOf(entity)));

  // Restores one by one so a blocked item (e.g. its menu is archived) does not
  // stop the rest; failures are reported per item.
  const restoreMutation = useMutation({
    mutationFn: async (entities) => {
      const results = await Promise.allSettled(
        entities.map((entity) => repositories[entity.kind].restore(workId, entity.endpoint.id)),
      );
      return entities.map((entity, index) => ({ entity, result: results[index] }));
    },
    onSuccess: async (outcomes) => {
      const failed = outcomes.filter(({ result }) => result.status === "rejected");
      setReport({
        failed: failed.map(({ entity, result }) => `${entity.label}: ${result.reason?.message ?? "복원 실패"}`),
        restored: outcomes.length - failed.length,
      });
      setSelected(new Set());
      await queryClient.invalidateQueries();
    },
  });

  const toggle = (entity) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(keyOf(entity))) next.delete(keyOf(entity));
      else next.add(keyOf(entity));
      return next;
    });
  const allSelected = items.length > 0 && selectedItems.length === items.length;

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <span className={styles.eyebrow}>Archive</span>
        <h2 className={styles.title}>보관함</h2>
        <p className={styles.lead}>보관한 항목을 한곳에서 보고 골라서 복원합니다. 보관해도 관계는 지워지지 않습니다.</p>
      </header>

      <div className={styles.toolbar}>
        <label className={styles.filterField}>
          <span>항목 유형</span>
          <select
            aria-label="보관 항목 유형"
            value={kind}
            onChange={(event) => {
              setKind(event.target.value);
              setSelected(new Set());
            }}
          >
            <option value="">전체 유형</option>
            {[...KIND_LABELS].map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <div className={styles.resultActions}>
          <label className={styles.checkboxField}>
            <input
              checked={allSelected}
              disabled={items.length === 0}
              type="checkbox"
              onChange={() => setSelected(allSelected ? new Set() : new Set(items.map(keyOf)))}
            />
            <span>전체 선택</span>
          </label>
          <Button
            disabled={selectedItems.length === 0 || restoreMutation.isPending}
            onClick={() => restoreMutation.mutate(selectedItems)}
          >
            <RotateCcw aria-hidden="true" size={17} />
            선택 항목 복원 ({selectedItems.length})
          </Button>
        </div>
      </div>

      {report ? (
        <div aria-live="polite" role="status">
          <p className={styles.status}>{report.restored}개를 복원했습니다.</p>
          {report.failed.length > 0 ? (
            <ul aria-label="복원하지 못한 항목" className={styles.via}>
              {report.failed.map((message) => <li className={styles.error} key={message}>{message}</li>)}
            </ul>
          ) : null}
        </div>
      ) : null}

      {archivedQuery.isPending ? (
        <div aria-live="polite" role="status">
          <Skeleton />
          <span className={styles.visuallyHidden}>보관함을 불러오는 중입니다.</span>
        </div>
      ) : null}
      {archivedQuery.isError ? <p className={styles.error} role="alert">보관함을 불러오지 못했습니다.</p> : null}
      {archivedQuery.data && items.length === 0 ? <p className={styles.empty}>보관된 항목이 없습니다.</p> : null}
      {items.length > 0 ? (
        <ol aria-label="보관된 항목" className={styles.results}>
          {items.map((entity) => {
            const path = entityDetailPath(workId, entity);
            return (
              <li className={styles.result} key={keyOf(entity)}>
                <div className={styles.resultMeta}>
                  <label className={styles.checkboxField}>
                    <input
                      aria-label={`${entity.label} 선택`}
                      checked={selected.has(keyOf(entity))}
                      type="checkbox"
                      onChange={() => toggle(entity)}
                    />
                  </label>
                  <span className={styles.kindBadge}>{KIND_LABELS.get(entity.kind)}</span>
                  {menuLabels.get(entity.menuItemId) ? <span>{menuLabels.get(entity.menuItemId)}</span> : null}
                  <span>보관 {formatDateTime(entity.archivedAt)}</span>
                </div>
                {path ? <Link className={styles.resultLink} to={path}>{entity.label}</Link> : <strong>{entity.label}</strong>}
                <div className={styles.resultActions}>
                  <Button
                    aria-label={`${entity.label} 복원`}
                    disabled={restoreMutation.isPending}
                    size="small"
                    variant="secondary"
                    onClick={() => restoreMutation.mutate([entity])}
                  >
                    복원
                  </Button>
                </div>
              </li>
            );
          })}
        </ol>
      ) : null}
    </section>
  );
}

export default ArchivePage;
