import { useMemo } from "react";
import { Link, useOutletContext, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { characterEditPath, characterListPath } from "../../../app/paths";
import {
  characterQueryKeys,
  characterRepository,
  menuQueryKeys,
  menuRepository,
  relationQueryKeys,
  relationRepository,
} from "../../../data/repositories/appRepositories";
import { Button, Skeleton } from "../../../shared/ui";
import { getReadableTextColor, sameEndpoint } from "../characterForm";
import CharacterPortrait from "../components/CharacterPortrait";
import styles from "./CharacterDetailPage.module.css";

const displayValue = (value) => value || "-";
const endpointKey = (endpoint) =>
  endpoint ? JSON.stringify([endpoint.type, endpoint.id]) : "";
const isAllRegion = (menuItem) =>
  menuItem.id === "characters00" || menuItem.filterConfig?.scope === "all";

function RelationList({ candidates, relations, source, type }) {
  const labels = new Map(
    candidates.map((candidate) => [
      endpointKey(candidate.endpoint),
      candidate.label,
    ]),
  );
  const visibleRelations = relations.filter((relation) =>
    type === "outgoing"
      ? sameEndpoint(relation.source, source)
      : !sameEndpoint(relation.source, source),
  );

  return (
    <section className={styles.relations} aria-labelledby={`${type}-relations`}>
      <h3 id={`${type}-relations`}>
        {type === "outgoing" ? "나가는 관계" : "들어오는 관계"}
      </h3>
      {visibleRelations.length === 0 ? (
        <p>연결된 관계가 없습니다.</p>
      ) : (
        <ul>
          {visibleRelations.map((relation) => {
            const other =
              type === "outgoing" ? relation.target : relation.source;
            return (
              <li key={relation.id}>
                <strong>
                  {labels.get(endpointKey(other)) ?? "알 수 없는 항목"}
                </strong>
                <span>
                  {relation.label} · {relation.relationType}
                </span>
                {relation.notes ? <small>{relation.notes}</small> : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function CharacterDetailContent({
  candidates,
  character,
  menuItem,
  menuItems,
  repository,
  relationRecords,
  workId,
}) {
  const queryClient = useQueryClient();
  const source = useMemo(
    () => ({ type: character.resourceType, id: character.id }),
    [character.id, character.resourceType],
  );
  const regionLabel =
    menuItems.find((item) => item.id === character.regionId)?.label ??
    character.regionName ??
    character.regionId;
  const profileTheme = character.profileTheme;
  const labelText = profileTheme.autoText
    ? getReadableTextColor(profileTheme.labelBackground)
    : profileTheme.labelText;
  const branchField =
    character.species === "마물" ? ["type", "마물 구분"] : ["gender", "성별"];
  const profileFields = [
    ["regionId", "지역", regionLabel],
    ["name", "이름", character.name],
    ["hanjaName", "한자 이름", character.hanjaName],
    ["englishName", "영문 이름", character.englishName],
    ["species", "종족", character.species],
    ["birthplace", "출생지", character.birthplace],
    [branchField[0], branchField[1], character[branchField[0]]],
    ["birthDate", "생년월일", character.birthDate],
    ["age", "나이", character.age],
    ["height", "키", character.height],
    ["weight", "몸무게", character.weight],
    ["occupation", "직업", character.occupation],
    ["alignment", "성향", character.alignment],
    ["affiliation", "소속", character.affiliation],
    ["faction", "파벌", character.faction],
    ["likes", "선호", character.likes],
    ["dislikes", "비호", character.dislikes],
    ["martialArts", "무공, 특성", character.martialArts],
    ["personality", "성격", character.personality],
    ["appearance", "외형", character.appearance],
    ["themeSong", "테마곡", character.themeSong],
    ["summary", "요약", character.summary],
    ["notes", "특이사항", character.notes],
    ["labelBackground", "라벨 배경색", profileTheme.labelBackground],
    ["labelText", "라벨 글자색", profileTheme.labelText],
    [
      "autoText",
      "글자색 자동 선택",
      profileTheme.autoText ? "사용" : "사용 안 함",
    ],
  ];

  const archiveMutation = useMutation({
    mutationFn: () =>
      character.archivedAt
        ? repository.restore(workId, character.id)
        : repository.archive(workId, character.id),
    onSuccess: async (updatedCharacter) => {
      queryClient.setQueryData(
        characterQueryKeys.detail(workId, character.id),
        updatedCharacter,
      );
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: characterQueryKeys.all(workId),
        }),
        queryClient.invalidateQueries({
          queryKey: relationQueryKeys.all(workId),
        }),
      ]);
    },
  });

  return (
    <article className={styles.page}>
      {character.archivedAt ? (
        <div className={styles.archivedBanner} role="status">
          <span>보관된 캐릭터입니다.</span>
          <Button
            disabled={archiveMutation.isPending}
            size="small"
            variant="secondary"
            onClick={() => archiveMutation.mutate()}
          >
            복원
          </Button>
        </div>
      ) : null}

      <div className={styles.actions}>
        {!character.archivedAt ? (
          <Button
            as={Link}
            size="small"
            to={characterEditPath(workId, menuItem.id, character.id)}
          >
            편집
          </Button>
        ) : null}
        {!character.archivedAt ? (
          <Button
            disabled={archiveMutation.isPending}
            size="small"
            variant="danger"
            onClick={() => archiveMutation.mutate()}
          >
            보관
          </Button>
        ) : null}
      </div>

      <div className={styles.sheet}>
        <header
          className={styles.nameHeader}
          style={{
            "--name-header-bg": profileTheme.labelBackground,
            "--name-header-text": labelText,
          }}
        >
          <h2>{character.name}</h2>
          <p>
            {displayValue(character.hanjaName)} |{" "}
            {displayValue(character.englishName)}
          </p>
        </header>
        <div className={styles.portraitFrame}>
          <CharacterPortrait character={character} />
        </div>
      </div>

      <dl
        className={styles.profileTable}
        style={{
          "--profile-label-bg": profileTheme.labelBackground,
          "--profile-label-text": labelText,
        }}
      >
        {profileFields.map(([key, label, value]) => (
          <div className={styles.profileRow} key={key}>
            <dt>{label}</dt>
            <dd>{displayValue(value)}</dd>
          </div>
        ))}
      </dl>

      <div className={styles.relationGrid}>
        <RelationList
          candidates={candidates}
          relations={relationRecords}
          source={source}
          type="outgoing"
        />
        <RelationList
          candidates={candidates}
          relations={relationRecords}
          source={source}
          type="incoming"
        />
      </div>

      {archiveMutation.isError ? (
        <p className={styles.inlineError} role="alert">
          보관 상태를 변경하지 못했습니다.
        </p>
      ) : null}

      <Link
        className={styles.backLink}
        to={characterListPath(workId, menuItem.id)}
      >
        {menuItem.label} 목록으로
      </Link>
    </article>
  );
}

function CharacterDetailPage({
  menus = menuRepository,
  relations = relationRepository,
  repository = characterRepository,
}) {
  const { menuItem } = useOutletContext();
  const { characterId, workId } = useParams();
  const characterQuery = useQuery({
    enabled: Boolean(characterId),
    networkMode: "always",
    queryKey: characterQueryKeys.detail(workId, characterId),
    queryFn: () => repository.get(workId, characterId),
    retry: false,
  });
  const menuItemsQuery = useQuery({
    networkMode: "always",
    queryKey: menuQueryKeys.items("characters", true),
    queryFn: () => menus.listItems("characters", { includeArchived: true }),
    retry: false,
  });
  const character = characterQuery.data;
  const matchesRegion = character
    ? isAllRegion(menuItem) || character.regionId === menuItem.id
    : false;
  const source = useMemo(
    () =>
      character
        ? { type: character.resourceType, id: character.id }
        : undefined,
    [character],
  );
  const relationsQuery = useQuery({
    enabled: Boolean(source && matchesRegion),
    networkMode: "always",
    queryKey: relationQueryKeys.list(workId, source),
    queryFn: () => relations.list(workId, source),
    retry: false,
  });
  const candidatesQuery = useQuery({
    enabled: Boolean(source && matchesRegion),
    networkMode: "always",
    queryKey: relationQueryKeys.candidates(workId, undefined),
    queryFn: () => relations.listCandidates(workId),
    retry: false,
  });
  const loading =
    characterQuery.isPending ||
    menuItemsQuery.isPending ||
    (matchesRegion && (relationsQuery.isPending || candidatesQuery.isPending));
  const failed =
    characterQuery.isError ||
    menuItemsQuery.isError ||
    relationsQuery.isError ||
    candidatesQuery.isError;

  if (loading) {
    return (
      <div aria-live="polite" className={styles.state} role="status">
        <Skeleton className={styles.loadingSkeleton} />
        <span>캐릭터를 불러오는 중입니다.</span>
      </div>
    );
  }

  if (failed || !character || !matchesRegion) {
    return (
      <section className={styles.state} role="alert">
        <p>현재 지역에서 캐릭터를 찾을 수 없습니다.</p>
        <Link to={characterListPath(workId, menuItem.id)}>
          {menuItem.label} 목록으로
        </Link>
      </section>
    );
  }

  return (
    <CharacterDetailContent
      candidates={candidatesQuery.data ?? []}
      character={character}
      key={`${character.id}:${character.version}`}
      menuItem={menuItem}
      menuItems={menuItemsQuery.data ?? []}
      relationRecords={relationsQuery.data ?? []}
      repository={repository}
      workId={workId}
    />
  );
}

export default CharacterDetailPage;
