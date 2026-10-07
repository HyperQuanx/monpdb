import clsx from "clsx";
import styles from "./primitives.module.css";

export function Skeleton({ className, ...props }) {
  return (
    <span
      {...props}
      aria-hidden="true"
      className={clsx(styles.skeleton, className)}
      data-ui="skeleton"
    />
  );
}
