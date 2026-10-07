import { Link } from "react-router-dom";
import { Network } from "lucide-react";
import { workRelationsPath } from "../../../app/paths";
import { entityDetailPath } from "../../../shared/navigation/entityPaths";
import { Button } from "../../../shared/ui";
import { KIND_LABELS, statusLabel } from "../exploration";
import styles from "../pages/ExplorationPages.module.css";

function EntityResult({ entity, menuLabels, workId }) {
  const path = entityDetailPath(workId, entity);
  return (
    <li className={styles.result}>
      <div className={styles.resultMeta}>
        <span className={styles.kindBadge}>{KIND_LABELS.get(entity.kind)}</span>
        {menuLabels.get(entity.menuItemId) ? <span>{menuLabels.get(entity.menuItemId)}</span> : null}
        {entity.status ? <span>{statusLabel(entity.kind, entity.status)}</span> : null}
        {entity.archivedAt ? <span className={styles.archivedBadge}>보관됨</span> : null}
      </div>
      {path ? (
        <Link className={styles.resultLink} to={path}>{entity.label}</Link>
      ) : (
        <strong className={styles.resultLink}>{entity.label}</strong>
      )}
      {entity.snippet ? (
        <p className={styles.snippet}>
          <strong>{entity.snippet.label}</strong>
          {entity.snippet.text}
        </p>
      ) : entity.summary ? (
        <p className={styles.snippet}>{entity.summary}</p>
      ) : null}
      {entity.tags.length > 0 ? (
        <p className={styles.resultMeta}>{entity.tags.map((tag) => `#${tag}`).join(" ")}</p>
      ) : null}
      {entity.kind !== "memo" ? (
        <div className={styles.resultActions}>
          <Button
            aria-label={`${entity.label} 관계 탐색`}
            as={Link}
            size="small"
            to={workRelationsPath(workId, entity.endpoint)}
            variant="ghost"
          >
            <Network aria-hidden="true" size={16} />
            관계 탐색
          </Button>
        </div>
      ) : null}
    </li>
  );
}

export default EntityResult;
