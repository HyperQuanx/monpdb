import clsx from "clsx";
import styles from "./primitives.module.css";

export function Button({
  as: Component = "button",
  className,
  size = "medium",
  type,
  variant = "primary",
  ...props
}) {
  const elementProps =
    Component === "button" ? { type: type ?? "button" } : {};

  return (
    <Component
      className={clsx(
        styles.button,
        styles[`button_${variant}`],
        styles[`button_${size}`],
        className,
      )}
      {...elementProps}
      {...props}
    />
  );
}
