import { useEffect, useMemo } from "react";
import {
  Link,
  useOutletContext,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Globe2, Plus, Search } from "lucide-react";
import {
  worldCreatePath,
  worldDetailPath,
} from "../../../app/paths";
import {
  menuQueryKeys,
  menuRepository,
  relationQueryKeys,
  worldQueryKeys,
  worldRepository,
} from "../../../data/repositories/appRepositories";
import { useDebouncedValue } from "../../../shared/hooks/useDebouncedValue";
import { Button, Card, EmptyState, Input, Skeleton } from "../../../shared/ui";
import { WORLD_CATEGORIES, WORLD_CATEGORY_LABELS } from "../worlds";
import { useUrlBackedTextValue } from "../hooks/useUrlBackedTextValue";
import styles from "./WorldListPage.module.css";

const archiveOptions = [
  ["active", "활성"],
  ["archived", "보관됨"],
  ["all", "전체"],
];

const emptyCopy = ({ archiveStatus, hasFilters }) => {
  if (archiveStatus === "archived") {
    return {
      description: "보관한 세계관 기록이 아직 없습니다.",
      title: "보관된 세계관이 없습니다.",
    };
  }
  if (hasFilters) {
    return {
      description: "검색어나 분류, 시대, 보관 상태를 바꿔 보세요.",
      title: "조건에 맞는 세계관이 없습니다.",
    };
  }
  return {
    description: "새로운 세계관 기록을 추가해 보세요.",
    title: "등록된 세계관이 없습니다.",
  };
};

function WorldListPage({
  menus = menuRepository,
  relationKeys = relationQueryKeys,
  repository = worldRepository,
}) {
  const { menuItem } = useOutletContext();
  const { workId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlQuery = searchParams.get("q") ?? "";
  const urlEra = searchParams.get("era") ?? "";
  const [query, setQuery] = useUrlBackedTextValue(urlQuery);
  const [era, setEra] = useUrlBackedTextValue(urlEra);
  const category = searchParams.get("category") ?? "";
  const requestedArchive = searchParams.get("archive") ?? "active";
  const archiveStatus = archiveOptions.some(([value]) => value === requestedArchive)
    ? requestedArchive
    : "active";
  const debouncedQuery = useDebouncedValue(query, 300);
  const debouncedEra = useDebouncedValue(era, 300);
  const queryClient = useQueryClient();

  const menuItemsQuery = useQuery({
    networkMode: "always",
    queryKey: menuQueryKeys.items("world", true),
    queryFn: () => menus.listItems("world", { includeArchived: true }),
    retry: false,
  });
  const regionLabels = useMemo(
    () => new Map((menuItemsQuery.data ?? []).map((item) => [item.id, item.label])),
    [menuItemsQuery.data],
  );
  const worldsQuery = useQuery({
    networkMode: "always",
    queryKey: worldQueryKeys.list(workId, menuItem.id, debouncedQuery, {
      archiveStatus,
      category,
      era: debouncedEra,
    }),
    queryFn: () =>
      repository.list({
        archiveStatus,
        category,
        era: debouncedEra,
        q: debouncedQuery,
        regionId: menuItem.id,
        workId,
      }),
  });
  const restoreMutation = useMutation({
    mutationFn: (worldId) => repository.restore(workId, worldId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: worldQueryKeys.all(workId) }),
        queryClient.invalidateQueries({ queryKey: relationKeys.all(workId) }),
      ]);
    },
  });

  const setFilter = (key, value, defaultValue = "") => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (!value || value === defaultValue) next.delete(key);
        else next.set(key, value);
        return next;
      },
      { replace: true },
    );
  };

  useEffect(() => {
    // Only push settled user edits to the URL. When the URL changes externally
    // (navigation, back/forward), the debounced values lag behind and must not
    // overwrite the new URL state.
    if (debouncedQuery !== query || debouncedEra !== era) return;
    const currentQuery = searchParams.get("q") ?? "";
    const currentEra = searchParams.get("era") ?? "";
    if (currentQuery === debouncedQuery && currentEra === debouncedEra) return;

    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (debouncedQuery) next.set("q", debouncedQuery);
        else next.delete("q");
        if (debouncedEra) next.set("era", debouncedEra);
        else next.delete("era");
        return next;
      },
      { replace: true },
    );
  }, [debouncedEra, debouncedQuery, era, query, searchParams, setSearchParams]);

  const worlds = worldsQuery.data ?? [];
  const loading = worldsQuery.isLoading || menuItemsQuery.isLoading;
  const failed = worldsQuery.isError || menuItemsQuery.isError;
  const hasFilters = Boolean(debouncedQuery || category || debouncedEra || archiveStatus !== "active");
  const empty = emptyCopy({ archiveStatus, hasFilters });

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>World</span>
          <h2 className={styles.title}>{menuItem.label}</h2>
        </div>
        <Button as={Link} size="small" to={worldCreatePath(workId, menuItem.id)}>
          <Plus aria-hidden="true" size={18} />
          추가
        </Button>
      </header>

      <div className={styles.filters}>
        <label className={styles.search}>
          <Search aria-hidden="true" size={19} />
          <Input
            aria-label="세계관 검색"
            className={styles.searchInput}
            placeholder="제목, 요약, 규칙, 역사, 문화 검색"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label className={styles.filterField}>
          <span>분류</span>
          <select
            aria-label="세계관 분류 필터"
            value={category}
            onChange={(event) => setFilter("category", event.target.value)}
          >
            <option value="">전체 분류</option>
            {WORLD_CATEGORIES.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label className={styles.filterField}>
          <span>시대</span>
          <Input
            aria-label="세계관 시대 필터"
            value={era}
            onChange={(event) => setEra(event.target.value)}
          />
        </label>
        <label className={styles.filterField}>
          <span>보관 상태</span>
          <select
            aria-label="세계관 보관 상태 필터"
            value={archiveStatus}
            onChange={(event) => setFilter("archive", event.target.value, "active")}
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
          <span>세계관을 불러오는 중입니다.</span>
        </div>
      ) : null}
      {worldsQuery.isFetching && !worldsQuery.isLoading ? (
        <span className={styles.queryStatus} role="status">검색 결과 갱신 중</span>
      ) : null}
      {failed ? (
        <p className={styles.errorState} role="alert">세계관을 불러오지 못했습니다.</p>
      ) : null}
      {!loading && !failed && worlds.length === 0 ? (
        <EmptyState
          className={styles.emptyState}
          description={empty.description}
          headingLevel={3}
          icon={<Globe2 size={24} />}
          title={empty.title}
        />
      ) : null}

      {worlds.length > 0 ? (
        <div className={styles.grid}>
          {worlds.map((world) => (
            <Card as="article" className={styles.card} key={world.id}>
              <Link
                className={styles.cardLink}
                to={worldDetailPath(workId, menuItem.id, world.id)}
              >
                <div className={styles.cardHeader}>
                  <strong>{world.title}</strong>
                  <span>{WORLD_CATEGORY_LABELS.get(world.category) ?? world.category}</span>
                </div>
                <dl className={styles.meta}>
                  <div><dt>지역</dt><dd>{regionLabels.get(world.regionId) ?? world.regionName ?? world.regionId}</dd></div>
                  <div><dt>시대</dt><dd>{world.era || "-"}</dd></div>
                  <div><dt>상태</dt><dd>{world.status}</dd></div>
                  <div><dt>세력</dt><dd>{world.factions.join(", ") || "-"}</dd></div>
                  <div><dt>장소</dt><dd>{world.places.join(", ") || "-"}</dd></div>
                </dl>
                <p>{world.summary || "-"}</p>
                {world.archivedAt ? <span className={styles.archivedBadge}>보관됨</span> : null}
              </Link>
              {world.archivedAt ? (
                <Button
                  aria-label={`${world.title} 복원`}
                  className={styles.restoreButton}
                  disabled={restoreMutation.isPending}
                  size="small"
                  variant="secondary"
                  onClick={() => restoreMutation.mutate(world.id)}
                >
                  복원
                </Button>
              ) : null}
            </Card>
          ))}
        </div>
      ) : null}
      {restoreMutation.isError ? (
        <p className={styles.inlineError} role="alert">세계관을 복원하지 못했습니다.</p>
      ) : null}
    </section>
  );
}

export default WorldListPage;
