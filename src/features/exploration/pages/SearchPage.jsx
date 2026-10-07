import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import {
  explorationQueryKeys,
  explorationRepository,
  menuRepository,
} from "../../../data/repositories/appRepositories";
import { useDebouncedValue } from "../../../shared/hooks/useDebouncedValue";
import { Input, Skeleton } from "../../../shared/ui";
import EntityResult from "../components/EntityResult";
import { KIND_LABELS, sectionsForKind, statusLabel } from "../exploration";
import { useMenuLabels } from "../useMenuLabels";
import styles from "./ExplorationPages.module.css";

const useUrlBackedValue = (urlValue) => {
  const [draft, setDraft] = useState({ source: urlValue, value: urlValue });
  const value = draft.source === urlValue ? draft.value : urlValue;
  return [value, (nextValue) => setDraft({ source: urlValue, value: nextValue })];
};

function SearchPage({ menus = menuRepository, repository = explorationRepository }) {
  const { workId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useUrlBackedValue(searchParams.get("q") ?? "");
  const debouncedQuery = useDebouncedValue(query, 300);
  const kind = searchParams.get("kind") ?? "";
  const menuItemId = searchParams.get("menu") ?? "";
  const status = searchParams.get("status") ?? "";
  const includeArchived = searchParams.get("archived") === "1";
  const [archivedChecked, setArchivedChecked] = useUrlBackedValue(includeArchived);
  const { labels: menuLabels, tree } = useMenuLabels(menus);
  const hasCriteria = Boolean(debouncedQuery.trim() || kind || menuItemId || status);
  const filters = {
    includeArchived,
    kind,
    menuItemId,
    q: debouncedQuery.trim(),
    status,
  };
  const searchQuery = useQuery({
    enabled: hasCriteria,
    networkMode: "always",
    queryKey: explorationQueryKeys.search(workId, filters),
    queryFn: () => repository.search(workId, filters),
    staleTime: 0,
  });

  const updateParams = (changes) => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        for (const [key, value] of Object.entries(changes)) {
          if (value) next.set(key, value);
          else next.delete(key);
        }
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

  const menuSections = sectionsForKind(tree, kind);
  const data = searchQuery.data;
  const statuses = data?.statuses ?? [];

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <span className={styles.eyebrow}>Search</span>
        <h2 className={styles.title}>통합 검색</h2>
        <p className={styles.lead}>
          캐릭터·세계관·플롯·설정·아이디어·메모를 한 번에 찾습니다. 띄어쓰기가 달라도, 초성(예: ㅇㅎ)으로도 찾을 수 있습니다.
        </p>
      </header>

      <label className={styles.search}>
        <Search aria-hidden="true" size={19} />
        <Input
          aria-label="통합 검색어"
          autoFocus
          className={styles.searchInput}
          placeholder="이름, 요약, 본문, 태그 검색"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>

      <div className={styles.filters}>
        <label className={styles.filterField}>
          <span>항목 유형</span>
          <select
            aria-label="항목 유형 필터"
            value={kind}
            onChange={(event) => updateParams({ kind: event.target.value, menu: "", status: "" })}
          >
            <option value="">전체 유형</option>
            {[...KIND_LABELS].map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label className={styles.filterField}>
          <span>메뉴</span>
          <select
            aria-label="메뉴 필터"
            value={menuItemId}
            onChange={(event) => updateParams({ menu: event.target.value })}
          >
            <option value="">전체 메뉴</option>
            {menuSections.map((section) => (
              <optgroup key={section.id} label={section.label}>
                {section.items.map((item) => (
                  <option key={item.id} value={item.id}>{item.label}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <label className={styles.filterField}>
          <span>상태</span>
          <select
            aria-label="상태 필터"
            disabled={statuses.length === 0 && !status}
            value={status}
            onChange={(event) => updateParams({ status: event.target.value })}
          >
            <option value="">전체 상태</option>
            {[...new Set([...statuses, ...(status ? [status] : [])])].map((value) => (
              <option key={value} value={value}>{statusLabel(kind, value)}</option>
            ))}
          </select>
        </label>
        <label className={styles.checkboxField}>
          <input
            checked={archivedChecked}
            type="checkbox"
            onChange={(event) => {
              setArchivedChecked(event.target.checked);
              updateParams({ archived: event.target.checked ? "1" : "" });
            }}
          />
          <span>보관 항목 포함</span>
        </label>
      </div>

      {!hasCriteria ? (
        <p className={styles.hint}>검색어를 입력하거나 유형·메뉴를 골라 보세요.</p>
      ) : null}
      {hasCriteria && searchQuery.isPending ? (
        <div aria-live="polite" role="status">
          <Skeleton />
          <span className={styles.visuallyHidden}>검색 중입니다.</span>
        </div>
      ) : null}
      {searchQuery.isError ? (
        <p className={styles.error} role="alert">검색하지 못했습니다.</p>
      ) : null}
      {hasCriteria && data ? (
        <>
          <p aria-live="polite" className={styles.status} role="status">
            검색 결과 {data.total}건
          </p>
          {data.results.length === 0 ? (
            <p className={styles.empty}>조건에 맞는 항목이 없습니다.</p>
          ) : (
            <ol aria-label="검색 결과" className={styles.results}>
              {data.results.map((entity) => (
                <EntityResult
                  entity={entity}
                  key={`${entity.kind}:${entity.endpoint.id}`}
                  menuLabels={menuLabels}
                  workId={workId}
                />
              ))}
            </ol>
          )}
        </>
      ) : null}
    </section>
  );
}

export default SearchPage;
