import clsx from "clsx";
import styles from "./primitives.module.css";

export function Card({
  as: Component = "div",
  className,
  interactive = false,
  ...props
}) {
  return (
    <Component
      className={clsx(
        styles.card,
        interactive && styles.cardInteractive,
        className,
      )}
      {...props}
    />
  );
}
