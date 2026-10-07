import { Skeleton } from "../shared/ui";
import styles from "./RouteLoadingPage.module.css";

// Shown only while the first route chunk loads.
function RouteLoadingPage() {
  return (
    <div aria-live="polite" className={styles.loading} role="status">
      <Skeleton className={styles.line} />
      <span>화면을 불러오는 중입니다.</span>
    </div>
  );
}

export default RouteLoadingPage;
