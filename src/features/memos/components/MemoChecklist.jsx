import { checklistProgress } from "../memos";
import styles from "./MemoChecklist.module.css";

/** Checklist whose items can be ticked in place (list card and detail). */
function MemoChecklist({ disabled = false, memo, onToggle }) {
  if (memo.checklist.length === 0) return null;
  const { done, total } = checklistProgress(memo.checklist);

  return (
    <div className={styles.root}>
      <p className={styles.progress}>
        체크리스트 {done}/{total} 완료
      </p>
      <ul aria-label={`${memo.title} 체크리스트`} className={styles.list}>
        {memo.checklist.map((item) => (
          <li key={item.id}>
            <label className={styles.item}>
              <input
                aria-label={`${memo.title}: ${item.text}`}
                checked={item.done}
                disabled={disabled}
                type="checkbox"
                onChange={() => onToggle(item.id)}
              />
              <span className={item.done ? styles.done : undefined}>{item.text}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default MemoChecklist;
