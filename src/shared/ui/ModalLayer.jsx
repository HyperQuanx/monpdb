import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import styles from "./overlay.module.css";

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export function ModalLayer({
  children,
  className,
  labelledBy,
  describedBy,
  id,
  initialFocusRef,
  onClose,
  open,
  panelClassName,
}) {
  const panelRef = useRef(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const previouslyFocused = document.activeElement;
    const appRoot = document.getElementById("root");
    const rootWasInert = appRoot?.hasAttribute("inert") ?? false;
    const bodyStyles = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
    };
    const scrollY = window.scrollY;

    appRoot?.setAttribute("inert", "");
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";

    const focusInitialElement = () => {
      const panel = panelRef.current;
      const target =
        initialFocusRef?.current ??
        panel?.querySelector("[data-autofocus]") ??
        panel?.querySelector(focusableSelector) ??
        panel;
      target?.focus();
    };

    queueMicrotask(focusInitialElement);

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusableElements = Array.from(
        panelRef.current?.querySelectorAll(focusableSelector) ?? [],
      );

      if (focusableElements.length === 0) {
        event.preventDefault();
        panelRef.current?.focus();
        return;
      }

      const first = focusableElements[0];
      const last = focusableElements.at(-1);

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = bodyStyles.overflow;
      document.body.style.position = bodyStyles.position;
      document.body.style.top = bodyStyles.top;
      document.body.style.width = bodyStyles.width;

      if (!rootWasInert) {
        appRoot?.removeAttribute("inert");
      }
      if (scrollY > 0) {
        window.scrollTo({ top: scrollY });
      }

      queueMicrotask(() => previouslyFocused?.focus());
    };
  }, [initialFocusRef, open]);

  if (!open) {
    return null;
  }

  return createPortal(
    <div
      className={clsx(styles.backdrop, className)}
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) {
          onClose();
        }
      }}
    >
      <section
        aria-describedby={describedBy}
        aria-labelledby={labelledBy}
        aria-modal="true"
        className={clsx(styles.panel, panelClassName)}
        id={id}
        ref={panelRef}
        role="dialog"
        tabIndex={-1}
      >
        {children}
      </section>
    </div>,
    document.body,
  );
}
