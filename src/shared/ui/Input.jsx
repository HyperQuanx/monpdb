import { forwardRef } from "react";
import clsx from "clsx";
import styles from "./primitives.module.css";

export const Input = forwardRef(function Input(
  { className, invalid, ...props },
  ref,
) {
  return (
    <input
      aria-invalid={invalid || props["aria-invalid"] || undefined}
      className={clsx(styles.input, className)}
      ref={ref}
      {...props}
    />
  );
});
