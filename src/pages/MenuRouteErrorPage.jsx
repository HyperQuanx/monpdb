import { AlertCircle } from "lucide-react";
import { Link, useParams, useRouteError } from "react-router-dom";
import { Button, EmptyState } from "../shared/ui";
import { workHomePath } from "../app/paths";
import styles from "./WorkRouteErrorPage.module.css";

function MenuRouteErrorPage() {
  const { workId } = useParams();
  const error = useRouteError();
  const isArchived = error?.message?.includes("archived");

  return (
    <main className={styles.page}>
      <EmptyState
        action={
          <Button as={Link} to={workHomePath(workId)}>
            작품 홈으로 돌아가기
          </Button>
        }
        description={
          isArchived
            ? "보관된 메뉴와 데이터는 메뉴 관리에서 복구할 수 있습니다."
            : "등록되지 않았거나 현재 작품에서 사용할 수 없는 메뉴입니다."
        }
        icon={<AlertCircle size={26} />}
        title={isArchived ? "보관된 메뉴입니다" : "메뉴를 찾을 수 없습니다"}
      />
    </main>
  );
}

export default MenuRouteErrorPage;
