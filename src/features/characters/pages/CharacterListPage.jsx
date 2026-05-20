import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { getCharacters } from "../api/charactersApi";
import {
  getCharacterRegion,
  getCharacterRegionFromPathname,
  getCharacterSpecies,
} from "../characters";
import styles from "./CharacterListPage.module.css";

const getCharacterDetailPath = (regionId, characterId) =>
  `/${regionId}/${characterId}`;

function CharacterListPage() {
  const { pathname } = useLocation();
  const [query, setQuery] = useState("");
  const region = getCharacterRegionFromPathname(pathname);

  const charactersQuery = useQuery({
    queryKey: ["characters", region.id, query],
    queryFn: () => getCharacters({ regionId: region.id, q: query }),
  });

  const characters = charactersQuery.data ?? [];

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Characters</span>
          <h2 className={styles.title}>{region.label}</h2>
        </div>
        <Link className={styles.addButton} to={`/${region.id}/new`}>
          <Plus aria-hidden="true" size={18} />
          <span>추가</span>
        </Link>
      </header>

      <label className={styles.search}>
        <Search aria-hidden="true" size={18} />
        <input
          type="search"
          value={query}
          placeholder="이름, 종족, 소속, 역할 검색"
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>

      {charactersQuery.isLoading ? (
        <p className={styles.state}>캐릭터를 불러오는 중입니다.</p>
      ) : null}

      {charactersQuery.isError ? (
        <p className={styles.state}>캐릭터를 불러오지 못했습니다.</p>
      ) : null}

      {!charactersQuery.isLoading &&
      !charactersQuery.isError &&
      characters.length === 0 ? (
        <p className={styles.state}>표시할 캐릭터가 없습니다.</p>
      ) : null}

      {characters.length > 0 ? (
        <div className={styles.grid}>
          {characters.map((character) => (
            <Link
              className={styles.card}
              key={character.id}
              to={getCharacterDetailPath(region.id, character.id)}
            >
              <div className={styles.cardTop}>
                <strong>{character.name}</strong>
                <span>
                  {character.regionName ??
                    getCharacterRegion(character.regionId).label}
                </span>
              </div>
              <dl className={styles.meta}>
                <div>
                  <dt>종족</dt>
                  <dd>
                    {getCharacterSpecies(character)}
                    {getCharacterSpecies(character) === "마물" &&
                    character.type
                      ? ` · ${character.type}`
                      : ""}
                  </dd>
                </div>
                <div>
                  <dt>소속</dt>
                  <dd>{character.affiliation || "-"}</dd>
                </div>
                <div>
                  <dt>직업</dt>
                  <dd>{character.occupation || "-"}</dd>
                </div>
                <div>
                  <dt>성향</dt>
                  <dd>{character.alignment || "-"}</dd>
                </div>
              </dl>
              <p>{character.summary || "-"}</p>
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export default CharacterListPage;
