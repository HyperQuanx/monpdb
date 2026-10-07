import { useEffect, useMemo, useState } from "react";
import {
  Link,
  useOutletContext,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Lightbulb, Plus, Search } from "lucide-react";
import { ideaCreatePath, ideaDetailPath } from "../../../app/paths";
import {
  ideaQueryKeys,
  ideaRepository,
  menuQueryKeys,
  menuRepository,
  relationQueryKeys,
  relationRepository,
} from "../../../data/repositories/appRepositories";
import { useDebouncedValue } from "../../../shared/hooks/useDebouncedValue";
import { Button, Card, EmptyState, Input, Skeleton } from "../../../shared/ui";
import {
  IDEA_PRIORITIES,
  IDEA_PRIORITY_LABELS,
  IDEA_STATUSES,
  IDEA_STATUS_LABELS,
  endpointKey,
  isAllIdeaCategory,
  isConcreteIdeaCategory,
} from "../ideas";
import styles from "./IdeaListPage.module.css";

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

function QuickAddIdea({ categories, menuItem, onAdded, repository, workId }) {
  const isAll = isAllIdeaCategory(menuItem);
  const concrete = categories.filter(isConcreteIdeaCategory);
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const selectedCategory = isAll ? categoryId || concrete[0]?.id || "" : menuItem.id;
  const mutation = useMutation({
    mutationFn: () =>
      repository.create(workId, { categoryId: selectedCategory, title: title.trim() }),
    onSuccess: async (idea) => {
      setTitle("");
      await onAdded(idea);
    },
  });

  return (
    <form
      aria-label="아이디어 빠른 추가"
      className={styles.quickAdd}
      onSubmit={(event) => {
        event.preventDefault();
        if (title.trim() && selectedCategory) mutation.mutate();
      }}
    >
      <Input
        aria-label="빠른 추가할 아이디어"
        className={styles.quickInput}
        placeholder="떠오른 아이디어를 바로 적어 두세요"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
      />
      {isAll ? (
        <select
          aria-label="빠른 추가 유형"
          className={styles.quickSelect}
          value={selectedCategory}
          onChange={(event) => setCategoryId(event.target.value)}
        >
          {concrete.map((category) => (
            <option key={category.id} value={category.id}>{category.label}</option>
          ))}
        </select>
      ) : null}
      <Button disabled={!title.trim() || mutation.isPending} type="submit">
        <Plus aria-hidden="true" size={18} />
        빠른 추가
      </Button>
      {mutation.isError ? (
        <p className={styles.inlineError} role="alert">{mutation.error.message}</p>
      ) : null}
    </form>
  );
}

function IdeaListPage({
  menus = menuRepository,
  relations = relationRepository,
  repository = ideaRepository,
}) {
  const { menuItem } = useOutletContext();
  const { workId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useUrlBackedValue(searchParams.get("q") ?? "");
  const debouncedQuery = useDebouncedValue(query, 300);
  const priority = searchParams.get("priority") ?? "";
  const status = searchParams.get("status") ?? "";
  const requestedArchive = searchParams.get("archive") ?? "active";
  const archiveStatus = archiveOptions.some(([value]) => value === requestedArchive)
    ? requestedArchive
    : "active";
  const isAll = isAllIdeaCategory(menuItem);
  const queryClient = useQueryClient();
  const [announcement, setAnnouncement] = useState("");

  const categoriesQuery = useQuery({
    networkMode: "always",
    queryKey: menuQueryKeys.items("idea", true),
    queryFn: () => menus.listItems("idea", { includeArchived: true }),
    retry: false,
  });
  const ideasQuery = useQuery({
    networkMode: "always",
    queryKey: ideaQueryKeys.list(workId, menuItem.id, debouncedQuery, {
      archiveStatus,
      priority,
      status,
    }),
    queryFn: () =>
      repository.list({
        archiveStatus,
        categoryId: menuItem.id,
        priority,
        q: debouncedQuery,
        status,
        workId,
      }),
  });
  const candidatesQuery = useQuery({
    networkMode: "always",
    queryKey: relationQueryKeys.candidates(workId, undefined),
    queryFn: () => relations.listCandidates(workId, undefined, { includeArchived: true }),
    retry: false,
  });
  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ideaQueryKeys.all(workId) }),
      queryClient.invalidateQueries({ queryKey: relationQueryKeys.all(workId) }),
    ]);
  const restoreMutation = useMutation({
    mutationFn: (ideaId) => repository.restore(workId, ideaId),
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

  const categories = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data]);
  const categoryLabels = new Map(categories.map((category) => [category.id, category.label]));
  const labels = new Map(
    (candidatesQuery.data ?? []).map((candidate) => [endpointKey(candidate.endpoint), candidate]),
  );
  const ideas = ideasQuery.data ?? [];
  const loading = ideasQuery.isLoading || categoriesQuery.isLoading || candidatesQuery.isLoading;
  const failed = ideasQuery.isError || categoriesQuery.isError || candidatesQuery.isError;
  const hasFilters = Boolean(debouncedQuery || priority || status || archiveStatus !== "active");

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Idea</span>
          <h2 className={styles.title}>{menuItem.label}</h2>
        </div>
        <Button as={Link} size="small" to={ideaCreatePath(workId, menuItem.id)} variant="secondary">
          <Plus aria-hidden="true" size={18} />
          추가
        </Button>
      </header>

      {!categoriesQuery.isLoading ? (
        <QuickAddIdea
          categories={categories}
          menuItem={menuItem}
          repository={repository}
          workId={workId}
          onAdded={async (idea) => {
            setAnnouncement(`"${idea.title}" 아이디어를 추가했습니다.`);
            await invalidate();
          }}
        />
      ) : null}
      <p aria-live="polite" className={styles.visuallyHidden}>{announcement}</p>

      <div className={styles.filters}>
        <label className={styles.search}>
          <Search aria-hidden="true" size={19} />
          <Input
            aria-label="아이디어 검색"
            className={styles.searchInput}
            placeholder="제목, 요약, 출처, 태그 검색"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label className={styles.filterField}>
          <span>우선순위</span>
          <select
            aria-label="아이디어 우선순위 필터"
            value={priority}
            onChange={(event) => setFilter("priority", event.target.value)}
          >
            <option value="">전체 우선순위</option>
            {IDEA_PRIORITIES.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label className={styles.filterField}>
          <span>상태</span>
          <select
            aria-label="아이디어 상태 필터"
            value={status}
            onChange={(event) => setFilter("status", event.target.value)}
          >
            <option value="">전체 상태</option>
            {IDEA_STATUSES.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label className={styles.filterField}>
          <span>보관 상태</span>
          <select
            aria-label="아이디어 보관 상태 필터"
            value={archiveStatus}
            onChange={(event) =>
              setFilter("archive", event.target.value === "active" ? "" : event.target.value)
            }
          >
            {archiveOptions.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
      </div>

      {loading ? (
        <div aria-live="polite" className={styles.loadingState} role="status">
          <Skeleton className={styles.loadingSkeleton} />
          <span>아이디어를 불러오는 중입니다.</span>
        </div>
      ) : null}
      {failed ? <p className={styles.errorState} role="alert">아이디어를 불러오지 못했습니다.</p> : null}
      {!loading && !failed && ideas.length === 0 ? (
        <EmptyState
          className={styles.emptyState}
          description={
            hasFilters ? "검색어나 우선순위, 상태 조건을 바꿔 보세요." : "위의 빠른 추가로 첫 아이디어를 적어 보세요."
          }
          headingLevel={3}
          icon={<Lightbulb size={24} />}
          title={hasFilters ? "조건에 맞는 아이디어가 없습니다." : "등록된 아이디어가 없습니다."}
        />
      ) : null}

      {!loading && !failed && ideas.length > 0 ? (
        <ul className={styles.sceneList}>
          {ideas.map((idea) => {
            const converted = idea.convertedTo
              ? labels.get(endpointKey(idea.convertedTo))
              : null;
            return (
              <li className={styles.sceneItem} key={idea.id}>
                <Card as="article" className={styles.card}>
                  <Link className={styles.cardLink} to={ideaDetailPath(workId, menuItem.id, idea.id)}>
                    <div className={styles.cardHeader}>
                      <strong>{idea.title}</strong>
                      <span className={styles.statusBadge}>{IDEA_STATUS_LABELS.get(idea.status)}</span>
                    </div>
                    <dl className={styles.meta}>
                      {isAll ? (
                        <div><dt>유형</dt><dd>{categoryLabels.get(idea.categoryId) ?? idea.categoryName}</dd></div>
                      ) : null}
                      <div><dt>우선</dt><dd>{IDEA_PRIORITY_LABELS.get(idea.priority)}</dd></div>
                      <div><dt>출처</dt><dd>{idea.source || "-"}</dd></div>
                      {converted ? (
                        <div><dt>변환</dt><dd>{converted.label}</dd></div>
                      ) : null}
                    </dl>
                    <p>{idea.summary || "-"}</p>
                    {idea.archivedAt ? (
                      <div className={styles.badges}>
                        <span className={styles.archivedBadge}>보관됨</span>
                      </div>
                    ) : null}
                  </Link>
                  {idea.archivedAt ? (
                    <Button
                      aria-label={`${idea.title} 복원`}
                      className={styles.restoreButton}
                      disabled={restoreMutation.isPending}
                      size="small"
                      variant="secondary"
                      onClick={() => restoreMutation.mutate(idea.id)}
                    >
                      복원
                    </Button>
                  ) : null}
                </Card>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}

export default IdeaListPage;
