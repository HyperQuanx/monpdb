import { useId } from "react";
import { X } from "lucide-react";
import { ModalLayer } from "./ModalLayer";
import styles from "./overlay.module.css";

export function Sheet({
  children,
  closeLabel = "닫기",
  id,
  onClose,
  open,
  title,
}) {
  const titleId = useId();

  return (
    <ModalLayer
      id={id}
      labelledBy={titleId}
      onClose={onClose}
      open={open}
      panelClassName={styles.sheet}
    >
      <header className={styles.sheetHeader}>
        <h2 id={titleId}>{title}</h2>
        <button
          aria-label={closeLabel}
          className={styles.closeButton}
          data-autofocus
          type="button"
          onClick={onClose}
        >
          <X aria-hidden="true" size={20} />
        </button>
      </header>
      <div className={styles.sheetBody}>{children}</div>
    </ModalLayer>
  );
}
