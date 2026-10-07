import { useEffect, useMemo, useState } from "react";
import {
  Link,
  useOutletContext,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Users } from "lucide-react";
import {
  characterCreatePath,
  characterDetailPath,
} from "../../../app/paths";
import {
  characterQueryKeys,
  characterRepository,
  menuQueryKeys,
  menuRepository,
  relationQueryKeys,
} from "../../../data/repositories/appRepositories";
import { useDebouncedValue } from "../../../shared/hooks/useDebouncedValue";
import { Button, Card, EmptyState, Input, Skeleton } from "../../../shared/ui";
import CharacterPortrait from "../components/CharacterPortrait";
import { getCharacterSpecies } from "../characters";
import styles from "./CharacterListPage.module.css";

const archiveOptions = [
  ["active", "활성"],
  ["archived", "보관됨"],
  ["all", "전체"],
];

const useUrlBackedTextValue = (urlValue) => {
  const [draft, setDraft] = useState({ source: urlValue, value: urlValue });
  const value = draft.source === urlValue ? draft.value : urlValue;

  return [
    value,
    (nextValue) => setDraft({ source: urlValue, value: nextValue }),
  ];
};

function CharacterListPage({
  menus = menuRepository,
  relationKeys = relationQueryKeys,
  repository = characterRepository,
}) {
  const { menuItem } = useOutletContext();
  const { workId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlQuery = searchParams.get("q") ?? "";
  const urlAffiliation = searchParams.get("affiliation") ?? "";
  const [query, setQuery] = useUrlBackedTextValue(urlQuery);
  const [affiliation, setAffiliation] = useUrlBackedTextValue(urlAffiliation);
  const species = searchParams.get("species") ?? "";
  const requestedArchive = searchParams.get("archive") ?? "active";
  const archiveStatus = archiveOptions.some(([value]) => value === requestedArchive)
    ? requestedArchive
    : "active";
  const debouncedQuery = useDebouncedValue(query, 300);
  const debouncedAffiliation = useDebouncedValue(affiliation, 300);
  const queryClient = useQueryClient();

  const menuItemsQuery = useQuery({
    networkMode: "always",
    queryKey: menuQueryKeys.items("characters"),
    queryFn: () => menus.listItems("characters"),
    retry: false,
  });
  const regionLabels = useMemo(
    () =>
      new Map(
        (menuItemsQuery.data ?? []).map((item) => [item.id, item.label]),
      ),
    [menuItemsQuery.data],
  );
  const charactersQuery = useQuery({
    networkMode: "always",
    queryKey: characterQueryKeys.list(
      workId,
      menuItem.id,
      debouncedQuery,
      { affiliation: debouncedAffiliation, archiveStatus, species },
    ),
    queryFn: () =>
      repository.list({
        affiliation: debouncedAffiliation,
        archiveStatus,
        q: debouncedQuery,
        regionId: menuItem.id,
        species,
        workId,
      }),
  });
  const restoreMutation = useMutation({
    mutationFn: (characterId) => repository.restore(workId, characterId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: characterQueryKeys.all(workId),
        }),
        queryClient.invalidateQueries({
          queryKey: relationKeys.all(workId),
        }),
      ]);
    },
  });
  const characters = charactersQuery.data ?? [];

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
    if (debouncedQuery !== query || debouncedAffiliation !== affiliation) return;
    const currentQuery = searchParams.get("q") ?? "";
    const currentAffiliation = searchParams.get("affiliation") ?? "";
    if (
      currentQuery === debouncedQuery &&
      currentAffiliation === debouncedAffiliation
    ) {
      return;
    }

    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (debouncedQuery) next.set("q", debouncedQuery);
        else next.delete("q");
        if (debouncedAffiliation) {
          next.set("affiliation", debouncedAffiliation);
        } else {
          next.delete("affiliation");
        }
        return next;
      },
      { replace: true },
    );
  }, [
    affiliation,
    debouncedAffiliation,
    debouncedQuery,
    query,
    searchParams,
    setSearchParams,
  ]);

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Characters</span>
          <h2 className={styles.title}>{menuItem.label}</h2>
        </div>
        <Button as={Link} size="small" to={characterCreatePath(workId, menuItem.id)}>
          <Plus aria-hidden="true" size={18} />
          <span>추가</span>
        </Button>
      </header>

      <div className={styles.filters}>
        <label className={styles.search}>
          <Search aria-hidden="true" size={19} />
          <Input
            aria-label="캐릭터 검색"
            className={styles.searchInput}
            placeholder="이름, 종족, 소속, 역할 검색"
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
            }}
          />
        </label>
        <label className={styles.filterField}>
          <span>종족</span>
          <select
            aria-label="종족 필터"
            value={species}
            onChange={(event) => setFilter("species", event.target.value)}
          >
            <option value="">전체 종족</option>
            <option value="인간">인간</option>
            <option value="마물">마물</option>
          </select>
        </label>
        <label className={styles.filterField}>
          <span>소속</span>
          <Input
            aria-label="소속 필터"
            value={affiliation}
            onChange={(event) => {
              setAffiliation(event.target.value);
            }}
          />
        </label>
        <label className={styles.filterField}>
          <span>보관 상태</span>
          <select
            aria-label="보관 상태 필터"
            value={archiveStatus}
            onChange={(event) => setFilter("archive", event.target.value, "active")}
          >
            {archiveOptions.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
      </div>

      {charactersQuery.isLoading || menuItemsQuery.isLoading ? (
        <div aria-live="polite" className={styles.loadingState} role="status">
          <Skeleton className={styles.loadingSkeleton} />
          <span>캐릭터를 불러오는 중입니다.</span>
        </div>
      ) : null}

      {charactersQuery.isFetching && !charactersQuery.isLoading ? (
        <span className={styles.queryStatus} role="status">검색 결과 갱신 중</span>
      ) : null}

      {charactersQuery.isError || menuItemsQuery.isError ? (
        <p className={styles.errorState} role="alert">
          캐릭터를 불러오지 못했습니다.
        </p>
      ) : null}

      {!charactersQuery.isLoading &&
      !charactersQuery.isError &&
      characters.length === 0 ? (
        <EmptyState
          className={styles.emptyState}
          description="검색어나 지역을 바꾸거나 새로운 캐릭터를 추가해 보세요."
          headingLevel={3}
          icon={<Users size={24} />}
          title="표시할 캐릭터가 없습니다."
        />
      ) : null}

      {characters.length > 0 ? (
        <div className={styles.grid}>
          {characters.map((character) => (
            <Card as="article" className={styles.card} key={character.id}>
              <Link
                className={styles.cardLink}
                to={characterDetailPath(workId, menuItem.id, character.id)}
              >
                <div className={styles.cardPortrait}>
                  <CharacterPortrait character={character} />
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.cardTop}>
                    <strong>{character.name}</strong>
                    <span>
                      {regionLabels.get(character.regionId) ??
                        character.regionName ??
                        character.regionId}
                    </span>
                  </div>
                  {character.archivedAt ? (
                    <span className={styles.archivedBadge}>보관됨</span>
                  ) : null}
                  <dl className={styles.meta}>
                    <div>
                      <dt>종족</dt>
                      <dd>
                        {getCharacterSpecies(character)}
                        {getCharacterSpecies(character) === "마물" && character.type
                          ? ` · ${character.type}`
                          : ""}
                      </dd>
                    </div>
                    <div><dt>소속</dt><dd>{character.affiliation || "-"}</dd></div>
                    <div><dt>직업</dt><dd>{character.occupation || "-"}</dd></div>
                    <div><dt>성향</dt><dd>{character.alignment || "-"}</dd></div>
                  </dl>
                  <p>{character.summary || "-"}</p>
                </div>
              </Link>
              {character.archivedAt ? (
                <Button
                  aria-label={`${character.name} 복원`}
                  className={styles.restoreButton}
                  disabled={restoreMutation.isPending}
                  size="small"
                  variant="secondary"
                  onClick={() => restoreMutation.mutate(character.id)}
                >
                  복원
                </Button>
              ) : null}
            </Card>
          ))}
        </div>
      ) : null}
      {restoreMutation.isError ? (
        <p className={styles.inlineError} role="alert">캐릭터를 복원하지 못했습니다.</p>
      ) : null}
    </section>
  );
}

export default CharacterListPage;
