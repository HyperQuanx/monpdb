import { useCallback } from "react";
import { useBeforeUnload, useBlocker } from "react-router-dom";

export function useUnsavedChanges(isDirty) {
  const shouldBlock = Boolean(isDirty);
  const blocker = useBlocker(shouldBlock);

  useBeforeUnload(
    useCallback(
      (event) => {
        if (!shouldBlock) {
          return;
        }

        event.preventDefault();
        event.returnValue = "";
      },
      [shouldBlock],
    ),
  );

  return blocker;
}
