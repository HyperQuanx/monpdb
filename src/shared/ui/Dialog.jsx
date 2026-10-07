import { useId } from "react";
import { X } from "lucide-react";
import { ModalLayer } from "./ModalLayer";
import styles from "./overlay.module.css";

export function Dialog({
  children,
  description,
  initialFocusRef,
  onClose,
  open,
  title,
}) {
  const titleId = useId();
  const descriptionId = useId();

  return (
    <ModalLayer
      describedBy={description ? descriptionId : undefined}
      initialFocusRef={initialFocusRef}
      labelledBy={titleId}
      onClose={onClose}
      open={open}
      panelClassName={styles.dialog}
    >
      <header className={styles.dialogHeader}>
        <div>
          <h2 id={titleId}>{title}</h2>
          {description ? <p id={descriptionId}>{description}</p> : null}
        </div>
        <button
          aria-label="닫기"
          className={styles.closeButton}
          data-autofocus
          type="button"
          onClick={onClose}
        >
          <X aria-hidden="true" size={20} />
        </button>
      </header>
      <div className={styles.dialogBody}>{children}</div>
    </ModalLayer>
  );
}
