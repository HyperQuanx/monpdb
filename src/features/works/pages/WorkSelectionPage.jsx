import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, LibraryBig } from "lucide-react";
import { workHomePath } from "../../../app/paths";
import {
  workQueryKeys,
  workRepository,
} from "../../../data/repositories/appRepositories";
import { Button, Card, EmptyState, Skeleton } from "../../../shared/ui";
import styles from "./WorkSelectionPage.module.css";
import { isHttpMode } from "../../../data/http/config";
import { useOnline } from "../../../data/http/connectivity";

const statusLabels = {
  planning: "기획 중",
  writing: "집필 중",
  paused: "일시 중지",
  completed: "완결",
};

function WorkSelectionPage({ repository = workRepository }) {
  const online = useOnline();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const worksQuery = useQuery({
    networkMode: "always",
    queryKey: workQueryKeys.list(false),
    queryFn: () => repository.list(),
  });
  const selectMutation = useMutation({
    networkMode: "always",
    mutationFn: (workId) => repository.select(workId),
    onSuccess: (work) => {
      queryClient.setQueryData(workQueryKeys.selected(), work);
      navigate(workHomePath(work.id));
    },
  });
  const works = worksQuery.data ?? [];

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.brand} aria-label="MONP Storage">
          <img
            alt=""
            aria-hidden="true"
            src="/defaultImage/monp_main_icon.png"
          />
          <span>MONP Storage</span>
        </div>
        <p className={styles.eyebrow}>Your story universe</p>
        <h1>작품을 선택하세요</h1>
        <p className={styles.intro}>
          기록하고 싶은 세계를 선택하면 캐릭터와 설정, 플롯이 담긴 작업
          공간으로 이동합니다.
        </p>
      </section>

      {worksQuery.isLoading ? (
        <div aria-live="polite" className={styles.loading} role="status">
          <Skeleton className={styles.loadingCover} />
          <span>작품을 불러오는 중입니다.</span>
        </div>
      ) : null}

      {worksQuery.isError ? (
        <p className={styles.error} role="alert">
          작품을 불러오지 못했습니다.
        </p>
      ) : null}

      {!worksQuery.isLoading && !worksQuery.isError && works.length === 0 ? (
        <EmptyState
          action={
            <Button as={Link} to="/works/manage">
              작품 관리 열기
            </Button>
          }
          className={styles.empty}
          description="관리 화면에서 첫 번째 작품을 만들거나 보관된 작품을 복구하세요."
          icon={<LibraryBig size={24} />}
          title="선택할 작품이 없습니다"
        />
      ) : null}

      {works.length > 0 ? (
        <section aria-label="작품 목록" className={styles.grid}>
          {works.map((work) => (
            <Card
              as="article"
              className={styles.card}
              interactive
              key={work.id}
              style={{ "--work-accent": work.accentColor }}
            >
              <div className={styles.cover}>
                {work.cover && (!isHttpMode || online) ? (
                  <img alt={`${work.title} 표지`} src={work.cover} />
                ) : (
                  <div aria-hidden="true" className={styles.coverFallback}>
                    {work.title.slice(0, 1)}
                  </div>
                )}
                <span className={styles.status}>
                  {statusLabels[work.status] ?? work.status}
                </span>
              </div>
              <div className={styles.content}>
                <div>
                  <p className={styles.genre}>{work.genre || "장르 미정"}</p>
                  <h2>{work.title}</h2>
                  {work.subtitle ? <p className={styles.subtitle}>{work.subtitle}</p> : null}
                </div>
                <p className={styles.summary}>{work.summary || "아직 소개가 없습니다."}</p>
                <Button
                  aria-label={`${work.title} 열기`}
                  disabled={selectMutation.isPending}
                  onClick={() => selectMutation.mutate(work.id)}
                >
                  작품 열기
                  <ArrowRight aria-hidden="true" size={18} />
                </Button>
              </div>
            </Card>
          ))}
        </section>
      ) : null}

      {selectMutation.isError ? (
        <p className={styles.error} role="alert">
          선택한 작품을 열 수 없습니다.
        </p>
      ) : null}
    </main>
  );
}

export default WorkSelectionPage;
