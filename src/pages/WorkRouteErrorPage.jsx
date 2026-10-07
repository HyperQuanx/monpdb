import { Link, useRouteError } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { Button, EmptyState } from "../shared/ui";
import styles from "./WorkRouteErrorPage.module.css";

function WorkRouteErrorPage() {
  const error = useRouteError();
  const isArchived = error?.message?.startsWith("Archived work");

  return (
    <main className={styles.page}>
      <EmptyState
        action={
          <Button as={Link} to="/">
            작품 선택으로 돌아가기
          </Button>
        }
        description={
          isArchived
            ? "보관된 작품은 관리 화면에서 복구한 뒤 다시 열 수 있습니다."
            : "존재하지 않거나 현재 열 수 없는 작품입니다."
        }
        icon={<AlertCircle size={26} />}
        title={isArchived ? "보관된 작품입니다" : "작품을 찾을 수 없습니다"}
      />
    </main>
  );
}

export default WorkRouteErrorPage;
