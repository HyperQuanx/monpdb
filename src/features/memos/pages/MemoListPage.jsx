import { useEffect, useState } from "react";
import {
  Link,
  useOutletContext,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { NotebookPen, Pin, PinOff, Plus, Search } from "lucide-react";
import { memoCreatePath, memoDetailPath } from "../../../app/paths";
import {
  memoQueryKeys,
  memoRepository,
} from "../../../data/repositories/appRepositories";
import { useDebouncedValue } from "../../../shared/hooks/useDebouncedValue";
import { Button, Card, EmptyState, Input, Skeleton } from "../../../shared/ui";
import MemoChecklist from "../components/MemoChecklist";
import colorStyles from "../components/memoColors.module.css";
import { MEMO_COLORS, formatMemoDate } from "../memos";
import styles from "./MemoListPage.module.css";

const archiveOptions = [
  ["active", "활성"],
  ["archived", "보관됨"],
  ["all", "전체"],
];

const useUrlBackedValue = (urlValue) => {
  const [draft, setDraft] = useState({ source: urlValue, value: urlValue });
  const value = draft.source === urlValue ? draft.value : urlValue;
  return [value, (nextValue) => setDraft({ source: urlValue, value: nextValue })];
};

function MemoListPage({ repository = memoRepository }) {
  const { menuItem } = useOutletContext();
  const { workId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useUrlBackedValue(searchParams.get("q") ?? "");
  const debouncedQuery = useDebouncedValue(query, 300);
  const color = searchParams.get("color") ?? "";
  const requestedArchive = searchParams.get("archive") ?? "active";
  const archiveStatus = archiveOptions.some(([value]) => value === requestedArchive)
    ? requestedArchive
    : "active";
  const [quickTitle, setQuickTitle] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const queryClient = useQueryClient();

  const memosQuery = useQuery({
    networkMode: "always",
    queryKey: memoQueryKeys.list(workId, menuItem.id, debouncedQuery, { archiveStatus, color }),
    queryFn: () =>
      repository.list({ archiveStatus, color, menuItemId: menuItem.id, q: debouncedQuery, workId }),
  });
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: memoQueryKeys.all(workId) });
  const quickAdd = useMutation({
    mutationFn: () => repository.create(workId, { menuItemId: menuItem.id, title: quickTitle.trim() }),
    onSuccess: async (memo) => {
      setQuickTitle("");
      setAnnouncement(`"${memo.title}" 메모를 추가했습니다.`);
      await invalidate();
    },
  });
  const pinMutation = useMutation({
    mutationFn: (memo) => repository.setPinned(workId, memo.id, !memo.pinned),
    onSuccess: invalidate,
  });
  const checklistMutation = useMutation({
    mutationFn: ({ itemId, memoId }) => repository.toggleChecklistItem(workId, memoId, itemId),
    onSuccess: invalidate,
  });
  const restoreMutation = useMutation({
    mutationFn: (memoId) => repository.restore(workId, memoId),
    onSuccess: invalidate,
  });

  const setFilter = (key, value) => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true },
    );
  };

  useEffect(() => {
    // Only push settled user edits; external URL changes must not be reverted.
    if (debouncedQuery !== query) return;
    if ((searchParams.get("q") ?? "") === debouncedQuery) return;
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (debouncedQuery) next.set("q", debouncedQuery);
        else next.delete("q");
        return next;
      },
      { replace: true },
    );
  }, [debouncedQuery, query, searchParams, setSearchParams]);

  const memos = memosQuery.data ?? [];
  const hasFilters = Boolean(debouncedQuery || color || archiveStatus !== "active");
  const busy = pinMutation.isPending || checklistMutation.isPending || restoreMutation.isPending;
  const mutationError = [quickAdd, pinMutation, checklistMutation, restoreMutation].find(
    (mutation) => mutation.isError,
  );

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Memo</span>
          <h2 className={styles.title}>{menuItem.label}</h2>
        </div>
        <Button as={Link} size="small" to={memoCreatePath(workId, menuItem.id)} variant="secondary">
          <Plus aria-hidden="true" size={18} />
          추가
        </Button>
      </header>

      <form
        aria-label="메모 빠른 추가"
        className={styles.quickAdd}
        onSubmit={(event) => {
          event.preventDefault();
          if (quickTitle.trim()) quickAdd.mutate();
        }}
      >
        <Input
          aria-label="빠른 추가할 메모"
          className={styles.quickInput}
          placeholder="잊기 전에 한 줄로 적어 두세요"
          value={quickTitle}
          onChange={(event) => setQuickTitle(event.target.value)}
        />
        <Button disabled={!quickTitle.trim() || quickAdd.isPending} type="submit">
          <Plus aria-hidden="true" size={18} />
          빠른 추가
        </Button>
      </form>
      <p aria-live="polite" className={styles.visuallyHidden}>{announcement}</p>

      <div className={styles.filters}>
        <label className={styles.search}>
          <Search aria-hidden="true" size={19} />
          <Input
            aria-label="메모 검색"
            className={styles.searchInput}
            placeholder="제목, 내용, 체크리스트, 태그 검색"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label className={styles.filterField}>
          <span>색상</span>
          <select aria-label="메모 색상 필터" value={color} onChange={(event) => setFilter("color", event.target.value)}>
            <option value="">전체 색상</option>
            {MEMO_COLORS.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label className={styles.filterField}>
          <span>보관 상태</span>
          <select
            aria-label="메모 보관 상태 필터"
            value={archiveStatus}
            onChange={(event) => setFilter("archive", event.target.value === "active" ? "" : event.target.value)}
          >
            {archiveOptions.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
      </div>

      {memosQuery.isLoading ? (
        <div aria-live="polite" className={styles.loadingState} role="status">
          <Skeleton className={styles.loadingSkeleton} />
          <span>메모를 불러오는 중입니다.</span>
        </div>
      ) : null}
      {memosQuery.isError ? <p className={styles.errorState} role="alert">메모를 불러오지 못했습니다.</p> : null}
      {!memosQuery.isLoading && !memosQuery.isError && memos.length === 0 ? (
        <EmptyState
          className={styles.emptyState}
          description={hasFilters ? "검색어나 색상 조건을 바꿔 보세요." : "위의 빠른 추가로 첫 메모를 남겨 보세요."}
          headingLevel={3}
          icon={<NotebookPen size={24} />}
          title={hasFilters ? "조건에 맞는 메모가 없습니다." : "등록된 메모가 없습니다."}
        />
      ) : null}

      {memos.length > 0 ? (
        <ul className={styles.sceneList}>
          {memos.map((memo) => (
            <li className={styles.sceneItem} key={memo.id}>
              <Card as="article" className={clsx(styles.card, styles.memoCard, colorStyles[memo.color])}>
                <div className={styles.memoHeader}>
                  <Link className={styles.memoTitle} to={memoDetailPath(workId, menuItem.id, memo.id)}>
                    {memo.title}
                  </Link>
                  {!memo.archivedAt ? (
                    <Button
                      aria-label={memo.pinned ? `${memo.title} 고정 해제` : `${memo.title} 고정`}
                      aria-pressed={memo.pinned}
                      className={styles.pinButton}
                      disabled={busy}
                      size="small"
                      variant="ghost"
                      onClick={() => pinMutation.mutate(memo)}
                    >
                      {memo.pinned ? <Pin aria-hidden="true" size={18} /> : <PinOff aria-hidden="true" size={18} />}
                    </Button>
                  ) : null}
                </div>
                <div className={styles.badges}>
                  {memo.pinned ? <span className={styles.statusBadge}>고정됨</span> : null}
                  {memo.archivedAt ? <span className={styles.archivedBadge}>보관됨</span> : null}
                </div>
                {memo.text ? <p className={styles.memoText}>{memo.text}</p> : null}
                <MemoChecklist
                  disabled={busy || Boolean(memo.archivedAt)}
                  memo={memo}
                  onToggle={(itemId) => checklistMutation.mutate({ itemId, memoId: memo.id })}
                />
                {memo.tags.length > 0 ? (
                  <p className={styles.memoTags}>{memo.tags.map((tag) => `#${tag}`).join(" ")}</p>
                ) : null}
                <p className={styles.memoDate}>
                  <time dateTime={memo.updatedAt}>{formatMemoDate(memo.updatedAt)}</time>
                </p>
                {memo.archivedAt ? (
                  <Button
                    aria-label={`${memo.title} 복원`}
                    className={styles.restoreButton}
                    disabled={busy}
                    size="small"
                    variant="secondary"
                    onClick={() => restoreMutation.mutate(memo.id)}
                  >
                    복원
                  </Button>
                ) : null}
              </Card>
            </li>
          ))}
        </ul>
      ) : null}
      {mutationError ? (
        <p className={styles.inlineError} role="alert">{mutationError.error.message}</p>
      ) : null}
    </section>
  );
}

export default MemoListPage;
