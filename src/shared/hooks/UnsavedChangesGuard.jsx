import { useRef } from "react";
import { Button, Dialog } from "../ui";
import { useUnsavedChanges } from "./useUnsavedChanges";
import styles from "./useUnsavedChanges.module.css";

export function UnsavedChangesGuard({
  description = "저장하지 않은 변경사항이 있습니다. 페이지를 나가면 변경사항이 사라집니다.",
  isDirty,
  title = "변경사항을 버리시겠습니까?",
}) {
  const blocker = useUnsavedChanges(isDirty);
  const continueEditingRef = useRef(null);
  const isBlocked = blocker.state === "blocked";

  const resetNavigation = () => {
    if (blocker.state === "blocked") {
      blocker.reset();
    }
  };

  const discardChanges = () => {
    if (blocker.state === "blocked") {
      blocker.proceed();
    }
  };

  return (
    <Dialog
      description={description}
      initialFocusRef={continueEditingRef}
      open={isBlocked}
      title={title}
      onClose={resetNavigation}
    >
      <div className={styles.actions}>
        <Button ref={continueEditingRef} variant="primary" onClick={resetNavigation}>
          계속 편집
        </Button>
        <Button variant="danger" onClick={discardChanges}>
          변경사항 버리기
        </Button>
      </div>
    </Dialog>
  );
}
