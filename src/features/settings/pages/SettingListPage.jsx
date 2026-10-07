import { useEffect, useMemo, useState } from "react";
import {
  Link,
  useOutletContext,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Sparkles } from "lucide-react";
import { settingCreatePath, settingDetailPath } from "../../../app/paths";
import {
  menuQueryKeys,
  menuRepository,
  relationQueryKeys,
  relationRepository,
  settingQueryKeys,
  settingRepository,
} from "../../../data/repositories/appRepositories";
import { useDebouncedValue } from "../../../shared/hooks/useDebouncedValue";
import { Button, Card, EmptyState, Input, Skeleton } from "../../../shared/ui";
import {
  SETTING_FIELD_LABELS,
  enabledSettingFields,
  endpointKey,
  isAllSettingCategory,
} from "../settings";
import styles from "./SettingListPage.module.css";

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

const emptyCopy = ({ archiveStatus, hasFilters, label }) => {
  if (archiveStatus === "archived") {
    return { description: "보관한 설정 자료가 아직 없습니다.", title: "보관된 설정 자료가 없습니다." };
  }
  if (hasFilters) {
    return { description: "검색어나 등급, 사용자 조건을 바꿔 보세요.", title: "조건에 맞는 설정 자료가 없습니다." };
  }
  return { description: `${label}에 첫 설정 자료를 추가해 보세요.`, title: "등록된 설정 자료가 없습니다." };
};

function SettingListPage({
  menus = menuRepository,
  relations = relationRepository,
  repository = settingRepository,
}) {
  const { menuItem } = useOutletContext();
  const { workId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useUrlBackedValue(searchParams.get("q") ?? "");
  const [grade, setGrade] = useUrlBackedValue(searchParams.get("grade") ?? "");
  const debouncedQuery = useDebouncedValue(query, 300);
  const debouncedGrade = useDebouncedValue(grade, 300);
  const owner = searchParams.get("owner") ?? "";
  const requestedArchive = searchParams.get("archive") ?? "active";
  const archiveStatus = archiveOptions.some(([value]) => value === requestedArchive)
    ? requestedArchive
    : "active";
  const isAll = isAllSettingCategory(menuItem);
  const queryClient = useQueryClient();

  const categoriesQuery = useQuery({
    networkMode: "always",
    queryKey: menuQueryKeys.items("setting", true),
    queryFn: () => menus.listItems("setting", { includeArchived: true }),
    retry: false,
  });
  const settingsQuery = useQuery({
    networkMode: "always",
    queryKey: settingQueryKeys.list(workId, menuItem.id, debouncedQuery, {
      archiveStatus,
      grade: debouncedGrade,
      ownerCharacterId: owner,
    }),
    queryFn: () =>
      repository.list({
        archiveStatus,
        categoryId: menuItem.id,
        grade: debouncedGrade,
        ownerCharacterId: owner,
        q: debouncedQuery,
        workId,
      }),
  });
  const ownersQuery = useQuery({
    networkMode: "always",
    queryKey: settingQueryKeys.owners(workId),
    queryFn: () => repository.listOwners(workId),
  });
  const candidatesQuery = useQuery({
    networkMode: "always",
    queryKey: relationQueryKeys.candidates(workId, undefined),
    queryFn: () => relations.listCandidates(workId, undefined, { includeArchived: true }),
    retry: false,
  });
  const restoreMutation = useMutation({
    mutationFn: (settingId) => repository.restore(workId, settingId),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: settingQueryKeys.all(workId) }),
        queryClient.invalidateQueries({ queryKey: relationQueryKeys.all(workId) }),
      ]),
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
    if (debouncedQuery !== query || debouncedGrade !== grade) return;
    if (
      (searchParams.get("q") ?? "") === debouncedQuery &&
      (searchParams.get("grade") ?? "") === debouncedGrade
    ) {
      return;
    }
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (debouncedQuery) next.set("q", debouncedQuery);
        else next.delete("q");
        if (debouncedGrade) next.set("grade", debouncedGrade);
        else next.delete("grade");
        return next;
      },
      { replace: true },
    );
  }, [debouncedGrade, debouncedQuery, grade, query, searchParams, setSearchParams]);

  const categories = useMemo(
    () => new Map((categoriesQuery.data ?? []).map((category) => [category.id, category])),
    [categoriesQuery.data],
  );
  const labels = useMemo(
    () =>
      new Map(
        (candidatesQuery.data ?? []).map((candidate) => [
          endpointKey(candidate.endpoint),
          candidate,
        ]),
      ),
    [candidatesQuery.data],
  );
  const characterOptions = (candidatesQuery.data ?? []).filter(
    (candidate) => candidate.endpoint.type === "character" && !candidate.archivedAt,
  );
  const settings = settingsQuery.data ?? [];
  const owners = ownersQuery.data ?? {};
  const loading =
    settingsQuery.isLoading ||
    categoriesQuery.isLoading ||
    ownersQuery.isLoading ||
    candidatesQuery.isLoading;
  const failed =
    settingsQuery.isError ||
    categoriesQuery.isError ||
    ownersQuery.isError ||
    candidatesQuery.isError;
  const hasFilters = Boolean(
    debouncedQuery || debouncedGrade || owner || archiveStatus !== "active",
  );
  const empty = emptyCopy({ archiveStatus, hasFilters, label: menuItem.label });

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Setting</span>
          <h2 className={styles.title}>{menuItem.label}</h2>
        </div>
        <Button as={Link} size="small" to={settingCreatePath(workId, menuItem.id)}>
          <Plus aria-hidden="true" size={18} />
          추가
        </Button>
      </header>

      <div className={styles.filters}>
        <label className={styles.search}>
          <Search aria-hidden="true" size={19} />
          <Input
            aria-label="설정 검색"
            className={styles.searchInput}
            placeholder="이름, 효과, 조건, 속성 검색"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label className={styles.filterField}>
          <span>등급</span>
          <Input
            aria-label="설정 등급 필터"
            value={grade}
            onChange={(event) => setGrade(event.target.value)}
          />
        </label>
        <label className={styles.filterField}>
          <span>사용자</span>
          <select
            aria-label="설정 사용자 필터"
            value={owner}
            onChange={(event) => setFilter("owner", event.target.value)}
          >
            <option value="">전체 사용자</option>
            {characterOptions.map((candidate) => (
              <option key={candidate.endpoint.id} value={candidate.endpoint.id}>
                {candidate.label}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.filterField}>
          <span>보관 상태</span>
          <select
            aria-label="설정 보관 상태 필터"
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
          <span>설정 자료를 불러오는 중입니다.</span>
        </div>
      ) : null}
      {failed ? (
        <p className={styles.errorState} role="alert">설정 자료를 불러오지 못했습니다.</p>
      ) : null}
      {!loading && !failed && settings.length === 0 ? (
        <EmptyState
          className={styles.emptyState}
          description={empty.description}
          headingLevel={3}
          icon={<Sparkles size={24} />}
          title={empty.title}
        />
      ) : null}

      {!loading && !failed && settings.length > 0 ? (
        <ul className={styles.sceneList}>
          {settings.map((setting) => {
            const category = categories.get(setting.categoryId);
            const fields = enabledSettingFields(category);
            const ownerNames = (owners[setting.id] ?? [])
              .map((id) => labels.get(endpointKey({ type: "character", id }))?.label)
              .filter(Boolean)
              .join(", ");
            return (
              <li className={styles.sceneItem} key={setting.id}>
                <Card as="article" className={styles.card}>
                  <Link
                    className={styles.cardLink}
                    to={settingDetailPath(workId, menuItem.id, setting.id)}
                  >
                    <div className={styles.cardHeader}>
                      <strong>{setting.title}</strong>
                      {isAll ? (
                        <span className={styles.statusBadge}>
                          {category?.label ?? setting.categoryName ?? setting.categoryId}
                        </span>
                      ) : null}
                    </div>
                    <dl className={styles.meta}>
                      {fields.includes("grade") ? (
                        <div><dt>{SETTING_FIELD_LABELS.get("grade")}</dt><dd>{setting.grade || "-"}</dd></div>
                      ) : null}
                      {fields.includes("effect") ? (
                        <div><dt>{SETTING_FIELD_LABELS.get("effect")}</dt><dd>{setting.effect || "-"}</dd></div>
                      ) : null}
                      {fields.includes("owners") ? (
                        <div><dt>{SETTING_FIELD_LABELS.get("owners")}</dt><dd>{ownerNames || "-"}</dd></div>
                      ) : null}
                    </dl>
                    <p>{setting.summary || "-"}</p>
                    {setting.archivedAt ? (
                      <div className={styles.badges}>
                        <span className={styles.archivedBadge}>보관됨</span>
                      </div>
                    ) : null}
                  </Link>
                  {setting.archivedAt ? (
                    <Button
                      aria-label={`${setting.title} 복원`}
                      className={styles.restoreButton}
                      disabled={restoreMutation.isPending}
                      size="small"
                      variant="secondary"
                      onClick={() => restoreMutation.mutate(setting.id)}
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
      {restoreMutation.isError ? (
        <p className={styles.inlineError} role="alert">설정 자료를 복원하지 못했습니다.</p>
      ) : null}
    </section>
  );
}

export default SettingListPage;
