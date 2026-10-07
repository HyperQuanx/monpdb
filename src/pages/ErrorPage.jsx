import { Link, isRouteErrorResponse, useRouteError } from "react-router-dom";
import { AlertCircle, SearchX } from "lucide-react";
import { Button, EmptyState } from "../shared/ui";
import styles from "./WorkRouteErrorPage.module.css";

/**
 * Root error boundary: unknown URLs (404) and unexpected render/loader
 * failures, including a route chunk that failed to download.
 */
function ErrorPage() {
  const error = useRouteError();
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  const chunkFailed =
    error instanceof TypeError && /dynamically imported module|Importing a module script/i.test(error.message);

  const title = notFound
    ? "페이지를 찾을 수 없습니다"
    : chunkFailed
      ? "화면을 불러오지 못했습니다"
      : "문제가 발생했습니다";
  const description = notFound
    ? "주소가 바뀌었거나 없는 페이지입니다. 작품 선택 화면에서 다시 찾아 주세요."
    : chunkFailed
      ? "네트워크 연결을 확인한 뒤 새로고침해 주세요."
      : "잠시 후 다시 시도해 주세요. 문제가 계속되면 새로고침해 주세요.";

  return (
    <main className={styles.page}>
      <EmptyState
        action={
          <div className={styles.actions}>
            <Button as={Link} to="/">
              작품 선택으로 돌아가기
            </Button>
            {!notFound ? (
              <Button variant="secondary" onClick={() => window.location.reload()}>
                새로고침
              </Button>
            ) : null}
          </div>
        }
        description={description}
        icon={notFound ? <SearchX size={26} /> : <AlertCircle size={26} />}
        title={title}
      />
    </main>
  );
}

export default ErrorPage;
