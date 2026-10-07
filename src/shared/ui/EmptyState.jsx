import clsx from "clsx";
import styles from "./primitives.module.css";

export function EmptyState({
  action,
  className,
  description,
  headingLevel = 2,
  icon,
  title,
}) {
  const Heading = `h${headingLevel}`;

  return (
    <section className={clsx(styles.emptyState, className)}>
      {icon ? (
        <span aria-hidden="true" className={styles.emptyStateIcon}>
          {icon}
        </span>
      ) : null}
      <Heading className={styles.emptyStateTitle}>{title}</Heading>
      {description ? (
        <p className={styles.emptyStateDescription}>{description}</p>
      ) : null}
      {action ? <div className={styles.emptyStateAction}>{action}</div> : null}
    </section>
  );
}
