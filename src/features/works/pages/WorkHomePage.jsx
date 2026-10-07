import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, BookOpen, Layers3 } from "lucide-react";
import { Link, useRouteLoaderData } from "react-router-dom";
import { getMenuItemId } from "../../../app/menuSections";
import { workMenuPath } from "../../../app/paths";
import {
  menuQueryKeys,
  menuRepository,
} from "../../../data/repositories/appRepositories";
import { Card, Skeleton } from "../../../shared/ui";
import styles from "./WorkHomePage.module.css";

const statusLabels = {
  planning: "기획 중",
  writing: "집필 중",
  paused: "일시 중지",
  completed: "완결",
};

function WorkHomePage() {
  const work = useRouteLoaderData("work");
  const menuQuery = useQuery({
    networkMode: "always",
    queryKey: menuQueryKeys.tree(),
    queryFn: () => menuRepository.listTree(),
  });
  const menuSections = menuQuery.data ?? [];

  return (
    <section className={styles.page}>
      <header
        className={styles.hero}
        style={{ "--home-accent": work.accentColor }}
      >
        <p className={styles.eyebrow}>Current story</p>
        <h2>{work.title}</h2>
        {work.subtitle ? <p className={styles.subtitle}>{work.subtitle}</p> : null}
        <p className={styles.summary}>{work.summary || "작품 소개를 준비 중입니다."}</p>
        <div className={styles.meta}>
          <span>{work.genre || "장르 미정"}</span>
          <span>{statusLabels[work.status] ?? work.status}</span>
        </div>
      </header>

      <section aria-labelledby="workspace-sections" className={styles.sections}>
        <div className={styles.sectionHeader}>
          <Layers3 aria-hidden="true" size={20} />
          <h3 id="workspace-sections">작품 구성</h3>
        </div>
        {menuQuery.isLoading ? (
          <div aria-label="메뉴 로딩 중" role="status">
            <Skeleton className={styles.menuSkeleton} />
          </div>
        ) : (
          <div className={styles.grid}>
            {menuSections
              .filter((section) => section.items.length > 0)
              .map((section) => {
                const firstItem = section.items[0];
                return (
                  <Card
                    as={Link}
                    className={styles.sectionCard}
                    interactive
                    key={section.id}
                    to={workMenuPath(
                      work.id,
                      section.id,
                      getMenuItemId(firstItem),
                    )}
                  >
                    <BookOpen aria-hidden="true" size={20} />
                    <div>
                      <strong>{section.label}</strong>
                      <span>{section.items.length}개 메뉴</span>
                    </div>
                    <ArrowUpRight aria-hidden="true" size={18} />
                  </Card>
                );
              })}
          </div>
        )}
      </section>
    </section>
  );
}

export default WorkHomePage;
