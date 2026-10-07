import { useState } from "react";
import { Link, useOutletContext, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FileText, Plus, Search } from "lucide-react";
import {
  workEntryDetailPath,
  workEntryNewPath,
} from "../../../app/paths";
import {
  contentQueryKeys,
  contentRepository,
} from "../../../data/repositories/appRepositories";
import { Button, Card, EmptyState, Input, Skeleton } from "../../../shared/ui";
import styles from "./ContentListPage.module.css";

function ContentListPage({ repository = contentRepository }) {
  const { menuItem } = useOutletContext();
  const { menuItemId, sectionId, workId } = useParams();
  const [query, setQuery] = useState("");
  const contentsQuery = useQuery({
    networkMode: "always",
    queryKey: contentQueryKeys.list(workId, menuItemId, query),
    queryFn: () => repository.list({ workId, menuItemId, q: query }),
  });
  const entries = contentsQuery.data ?? [];

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headingGroup}>
          <span className={styles.eyebrow}>Content</span>
          <h2 className={styles.title}>{menuItem.label}</h2>
        </div>
        <Button
          as={Link}
          size="small"
          to={workEntryNewPath(workId, sectionId, menuItemId)}
        >
          <Plus aria-hidden="true" size={18} />
          <span>추가</span>
        </Button>
      </header>

      <label className={styles.search}>
        <Search aria-hidden="true" size={19} />
        <Input
          aria-label={`${menuItem.label} 검색`}
          className={styles.searchInput}
          placeholder="제목, 요약, 태그 검색"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>

      {contentsQuery.isPending ? (
        <div aria-live="polite" className={styles.state} role="status">
          <Skeleton className={styles.loadingSkeleton} />
          <span>{menuItem.label} 항목을 불러오는 중입니다.</span>
        </div>
      ) : null}

      {contentsQuery.isError ? (
        <p className={styles.errorState} role="alert">
          {menuItem.label} 항목을 불러오지 못했습니다.
        </p>
      ) : null}

      {!contentsQuery.isPending &&
      !contentsQuery.isError &&
      entries.length === 0 ? (
        <EmptyState
          action={
            <Button
              as={Link}
              size="small"
              to={workEntryNewPath(workId, sectionId, menuItemId)}
            >
              첫 항목 추가
            </Button>
          }
          className={styles.emptyState}
          description="검색어를 바꾸거나 새로운 항목을 추가해 보세요."
          headingLevel={3}
          icon={<FileText aria-hidden="true" size={24} />}
          title={`표시할 ${menuItem.label} 항목이 없습니다.`}
        />
      ) : null}

      {entries.length > 0 ? (
        <div className={styles.grid}>
          {entries.map((entry) => (
            <Card
              as={Link}
              className={styles.card}
              interactive
              key={entry.id}
              to={workEntryDetailPath(
                workId,
                sectionId,
                menuItemId,
                entry.id,
              )}
            >
              <div className={styles.cardHeader}>
                <strong>{entry.title}</strong>
                <span>{entry.status}</span>
              </div>
              <p>{entry.summary || "요약이 없습니다."}</p>
              {entry.tags.length > 0 ? (
                <ul aria-label={`${entry.title} 태그`} className={styles.tags}>
                  {entry.tags.map((tag) => (
                    <li key={tag}>{tag}</li>
                  ))}
                </ul>
              ) : null}
            </Card>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export default ContentListPage;
