import { Link, useOutletContext, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { Archive, ArrowLeft, Pencil, Pin, PinOff, RotateCcw } from "lucide-react";
import { memoEditPath, memoListPath } from "../../../app/paths";
import {
  memoQueryKeys,
  memoRepository,
} from "../../../data/repositories/appRepositories";
import { Button, Skeleton } from "../../../shared/ui";
import MemoChecklist from "../components/MemoChecklist";
import colorStyles from "../components/memoColors.module.css";
import { MEMO_COLOR_LABELS, formatMemoDate, memoBelongsToMenu } from "../memos";
import styles from "./MemoDetailPage.module.css";

function MemoDetailPage({ repository = memoRepository }) {
  const { menuItem } = useOutletContext();
  const { memoId, workId } = useParams();
  const queryClient = useQueryClient();
  const memoQuery = useQuery({
    networkMode: "always",
    queryKey: memoQueryKeys.detail(workId, memoId),
    queryFn: () => repository.get(workId, memoId),
    retry: false,
  });
  const onSaved = async (updated) => {
    queryClient.setQueryData(memoQueryKeys.detail(workId, memoId), updated);
    await queryClient.invalidateQueries({ queryKey: memoQueryKeys.all(workId) });
  };
  const lifecycleMutation = useMutation({
    mutationFn: (memo) =>
      memo.archivedAt ? repository.restore(workId, memo.id) : repository.archive(workId, memo.id),
    onSuccess: onSaved,
  });
  const pinMutation = useMutation({
    mutationFn: (memo) => repository.setPinned(workId, memo.id, !memo.pinned),
    onSuccess: onSaved,
  });
  const checklistMutation = useMutation({
    mutationFn: (itemId) => repository.toggleChecklistItem(workId, memoId, itemId),
    onSuccess: onSaved,
  });
  const memo = memoQuery.data;

  if (memoQuery.isPending) {
    return (
      <div aria-live="polite" className={styles.state} role="status">
        <Skeleton className={styles.loadingSkeleton} />
        <span>메모를 불러오는 중입니다.</span>
      </div>
    );
  }

  if (memoQuery.isError || !memo || !memoBelongsToMenu(memo, menuItem)) {
    return (
      <section className={styles.state} role="alert">
        <p>현재 메뉴에서 메모를 찾을 수 없습니다.</p>
        <Link to={memoListPath(workId, menuItem.id)}>{menuItem.label} 목록으로</Link>
      </section>
    );
  }

  const busy = lifecycleMutation.isPending || pinMutation.isPending || checklistMutation.isPending;
  const failure = [lifecycleMutation, pinMutation, checklistMutation].find((mutation) => mutation.isError);

  return (
    <article className={styles.page}>
      {memo.archivedAt ? (
        <div className={styles.archivedBanner} role="status">
          <span>보관된 메모입니다.</span>
          <Button disabled={busy} size="small" variant="secondary" onClick={() => lifecycleMutation.mutate(memo)}>
            <RotateCcw aria-hidden="true" size={17} />
            복원
          </Button>
        </div>
      ) : null}

      <header className={styles.header}>
        <div className={styles.headingGroup}>
          <span className={styles.eyebrow}>
            {menuItem.label}
            {memo.pinned ? " · 고정됨" : ""}
          </span>
          <h2>{memo.title}</h2>
          <p>
            <time dateTime={memo.updatedAt}>{formatMemoDate(memo.updatedAt)}</time> 수정
          </p>
        </div>
        {!memo.archivedAt ? (
          <div className={styles.actions}>
            <Button
              aria-pressed={memo.pinned}
              disabled={busy}
              size="small"
              variant="secondary"
              onClick={() => pinMutation.mutate(memo)}
            >
              {memo.pinned ? <PinOff aria-hidden="true" size={17} /> : <Pin aria-hidden="true" size={17} />}
              {memo.pinned ? "고정 해제" : "고정"}
            </Button>
            <Button as={Link} size="small" to={memoEditPath(workId, menuItem.id, memo.id)} variant="secondary">
              <Pencil aria-hidden="true" size={17} />
              편집
            </Button>
            <Button disabled={busy} size="small" variant="danger" onClick={() => lifecycleMutation.mutate(memo)}>
              <Archive aria-hidden="true" size={17} />
              보관
            </Button>
          </div>
        ) : null}
      </header>

      <section aria-labelledby="memo-content" className={clsx(styles.panel, colorStyles[memo.color])}>
        <h3 id="memo-content">내용</h3>
        <p className={styles.preWrap}>{memo.text || "-"}</p>
        <MemoChecklist
          disabled={busy || Boolean(memo.archivedAt)}
          memo={memo}
          onToggle={(itemId) => checklistMutation.mutate(itemId)}
        />
      </section>

      <dl className={styles.meta}>
        <div><dt>색상</dt><dd>{MEMO_COLOR_LABELS.get(memo.color)}</dd></div>
        <div>
          <dt>태그</dt>
          <dd>
            {memo.tags.length > 0 ? (
              <ul aria-label="태그" className={styles.chips}>
                {memo.tags.map((tag) => <li key={tag}>{tag}</li>)}
              </ul>
            ) : "-"}
          </dd>
        </div>
      </dl>

      {failure ? <p className={styles.error} role="alert">{failure.error.message}</p> : null}

      <Button as={Link} className={styles.backLink} to={memoListPath(workId, menuItem.id)} variant="ghost">
        <ArrowLeft aria-hidden="true" size={18} />
        {menuItem.label} 목록
      </Button>
    </article>
  );
}

export default MemoDetailPage;
