import { useEffect, useSyncExternalStore } from "react";
import { useLocation } from "react-router-dom";
import { parseEntityDetailPath } from "./entityPaths";

/**
 * Session-scoped "recently viewed" list per work. Like the fixture data it
 * lives for one SPA session; it holds only references, never content.
 */
export const createRecentViewStore = ({ limit = 20, now = () => new Date().toISOString() } = {}) => {
  let views = new Map();
  const listeners = new Set();
  const emit = () => listeners.forEach((listener) => listener());

  return {
    record(workId, { kind, id }) {
      const current = views.get(workId) ?? [];
      const next = [
        { id, kind, viewedAt: now() },
        ...current.filter((view) => !(view.kind === kind && view.id === id)),
      ].slice(0, limit);
      views = new Map(views).set(workId, next);
      emit();
    },
    list(workId) {
      return views.get(workId) ?? EMPTY;
    },
    clear(workId) {
      views = new Map(views);
      views.delete(workId);
      emit();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
};

const EMPTY = Object.freeze([]);

export const recentViewStore = createRecentViewStore();

export const useRecentViews = (workId, store = recentViewStore) =>
  useSyncExternalStore(
    store.subscribe,
    () => store.list(workId),
    () => store.list(workId),
  );

/** Records a view whenever the location is an entity detail page. */
export const useRecordRecentView = (store = recentViewStore) => {
  const { pathname } = useLocation();
  useEffect(() => {
    const reference = parseEntityDetailPath(pathname);
    if (reference) store.record(reference.workId, reference);
  }, [pathname, store]);
};
