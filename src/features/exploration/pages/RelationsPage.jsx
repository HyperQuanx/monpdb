import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Network, Search } from "lucide-react";
import clsx from "clsx";
import {
  explorationQueryKeys,
  explorationRepository,
} from "../../../data/repositories/appRepositories";
import { useDebouncedValue } from "../../../shared/hooks/useDebouncedValue";
import { entityDetailPath } from "../../../shared/navigation/entityPaths";
import { Input, Skeleton } from "../../../shared/ui";
import { KIND_LABELS, parseFocus } from "../exploration";
import styles from "./ExplorationPages.module.css";

const GRAPH_NODE_LIMIT = 36;
const RING_GAP = 120;
const keyOf = ({ type, id }) => `${type}:${id}`;
const shorten = (label, max = 9) => (label.length > max ? `${label.slice(0, max)}…` : label);

function FocusPicker({ onPick, repository, workId }) {
  const [query, setQuery] = useState("");
  const debounced = useDebouncedValue(query.trim(), 300);
  const resultsQuery = useQuery({
    enabled: Boolean(debounced),
    networkMode: "always",
    queryKey: explorationQueryKeys.search(workId, { limit: 8, q: debounced, scope: "focus" }),
    queryFn: () => repository.search(workId, { limit: 9, q: debounced }),
    staleTime: 0,
  });
  const candidates = (resultsQuery.data?.results ?? []).filter(({ kind }) => kind !== "memo").slice(0, 8);

  return (
    <div className={styles.section}>
      <label className={styles.search}>
        <Search aria-hidden="true" size={19} />
        <Input
          aria-label="관계를 볼 항목 검색"
          className={styles.searchInput}
          placeholder="캐릭터, 장소, 장면 이름으로 찾기"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      {debounced && resultsQuery.data && candidates.length === 0 ? (
        <p className={styles.empty}>찾은 항목이 없습니다.</p>
      ) : null}
      {candidates.length > 0 ? (
        <ul aria-label="관계 탐색 기준 후보" className={styles.pickList}>
          {candidates.map((entity) => (
            <li key={keyOf(entity.endpoint)}>
              <button
                className={styles.pickButton}
                type="button"
                onClick={() => {
                  setQuery("");
                  onPick(entity.endpoint);
                }}
              >
                <span>{entity.label}</span>
                <span className={styles.kindBadge}>{KIND_LABELS.get(entity.kind)}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

const describeVia = ({ edge, from }) => {
  const outgoing = keyOf(edge.source) === keyOf(from.endpoint);
  const direction = edge.bidirectional ? "상호" : outgoing ? "나가는" : "들어오는";
  return `${from.label}에서 ${direction} 관계 · ${edge.label}`;
};

function RelationList({ neighborhood, onFocus, workId }) {
  if (neighborhood.levels.length === 0) {
    return <p className={styles.empty}>연결된 항목이 없습니다.</p>;
  }
  return neighborhood.levels.map(({ depth, items }) => (
    <section aria-labelledby={`relation-level-${depth}`} className={styles.section} key={depth}>
      <h3 id={`relation-level-${depth}`}>
        {depth}단계 연결 · {items.length}개
      </h3>
      <ol className={styles.results}>
        {items.map(({ node, via }) => {
          const path = entityDetailPath(workId, node);
          return (
            <li className={styles.result} key={keyOf(node.endpoint)}>
              <div className={styles.resultMeta}>
                <span className={styles.kindBadge}>{KIND_LABELS.get(node.kind)}</span>
                {node.archivedAt ? <span className={styles.archivedBadge}>보관됨</span> : null}
              </div>
              {path ? <Link className={styles.resultLink} to={path}>{node.label}</Link> : <strong>{node.label}</strong>}
              <ul aria-label={`${node.label} 연결 경로`} className={styles.via}>
                {via.map((entry) => (
                  <li key={entry.edge.id}>
                    {describeVia(entry)}
                    {entry.edge.derived ? <span className={styles.derivedBadge}> 장면 정보</span> : null}
                  </li>
                ))}
              </ul>
              <div className={styles.resultActions}>
                <button
                  aria-label={`${node.label} 기준으로 관계 보기`}
                  className={styles.pickButton}
                  type="button"
                  onClick={() => onFocus(node.endpoint)}
                >
                  <span>이 항목 기준으로 보기</span>
                  <Network aria-hidden="true" size={16} />
                </button>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  ));
}

/** Radial layout: focus in the centre, each depth on its own ring. */
const layoutGraph = (neighborhood) => {
  const shown = [];
  for (const { depth, items } of neighborhood.levels) {
    for (const item of items) {
      if (shown.length >= GRAPH_NODE_LIMIT) break;
      shown.push({ depth, node: item.node });
    }
  }
  const maxDepth = Math.max(1, ...shown.map(({ depth }) => depth));
  const size = 2 * (RING_GAP * maxDepth + 80);
  const center = size / 2;
  const positions = new Map([[keyOf(neighborhood.focus.endpoint), { x: center, y: center }]]);
  for (let depth = 1; depth <= maxDepth; depth += 1) {
    const ring = shown.filter((entry) => entry.depth === depth);
    ring.forEach((entry, index) => {
      const angle = (2 * Math.PI * index) / ring.length - Math.PI / 2 + depth * 0.35;
      positions.set(keyOf(entry.node.endpoint), {
        x: center + Math.cos(angle) * RING_GAP * depth,
        y: center + Math.sin(angle) * RING_GAP * depth,
      });
    });
  }
  const hidden = neighborhood.levels.reduce((sum, { items }) => sum + items.length, 0) - shown.length;
  return { hidden, positions, shown, size };
};

function RelationGraph({ neighborhood, workId }) {
  const { hidden, positions, shown, size } = layoutGraph(neighborhood);
  const nodes = [{ depth: 0, node: neighborhood.focus }, ...shown];
  const edges = neighborhood.edges.filter(
    (edge) => positions.has(keyOf(edge.source)) && positions.has(keyOf(edge.target)),
  );

  return (
    <div className={styles.graphWrap}>
      <p className={styles.lead}>
        그래프는 한눈에 보는 보조 화면입니다. 노드는 Tab으로 이동해 열 수 있고, 연결 경로 설명은 목록 보기에서 확인할 수 있습니다.
      </p>
      <svg
        aria-label={`${neighborhood.focus.label} 관계 그래프`}
        className={styles.graph}
        role="group"
        viewBox={`0 0 ${size} ${size}`}
      >
        {edges.map((edge) => {
          const from = positions.get(keyOf(edge.source));
          const to = positions.get(keyOf(edge.target));
          return <line key={edge.id} x1={from.x} x2={to.x} y1={from.y} y2={to.y} />;
        })}
        {nodes.map(({ depth, node }) => {
          const { x, y } = positions.get(keyOf(node.endpoint));
          const path = entityDetailPath(workId, node);
          const label = `${KIND_LABELS.get(node.kind)} ${node.label}`;
          const content = (
            <>
              <circle cx={x} cy={y} r={depth === 0 ? 34 : 26} />
              <text textAnchor="middle" x={x} y={y + (depth === 0 ? 4 : 44)}>
                {shorten(node.label)}
              </text>
            </>
          );
          return (
            <g className={clsx(depth === 0 && styles.focusNode)} key={keyOf(node.endpoint)}>
              {path ? (
                <Link aria-label={label} to={path}>
                  <title>{label}</title>
                  {content}
                </Link>
              ) : (
                content
              )}
            </g>
          );
        })}
      </svg>
      {hidden > 0 ? (
        <p className={styles.status}>
          그래프에는 {GRAPH_NODE_LIMIT}개까지만 그립니다. 나머지 {hidden}개는 목록 보기에서 확인하세요.
        </p>
      ) : null}
    </div>
  );
}

function RelationsPage({ repository = explorationRepository }) {
  const { workId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const focus = parseFocus(searchParams.get("focus"));
  const depth = [1, 2, 3].includes(Number(searchParams.get("depth"))) ? Number(searchParams.get("depth")) : 1;
  const view = searchParams.get("view") === "graph" ? "graph" : "list";
  const includeArchived = searchParams.get("archived") === "1";
  const options = { depth, includeArchived };
  const neighborhoodQuery = useQuery({
    enabled: Boolean(focus),
    networkMode: "always",
    queryKey: explorationQueryKeys.neighborhood(workId, focus, options),
    queryFn: () => repository.getNeighborhood(workId, focus, options),
    staleTime: 0,
  });
  const update = (changes, { replace = true } = {}) =>
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        for (const [key, value] of Object.entries(changes)) {
          if (value) next.set(key, value);
          else next.delete(key);
        }
        return next;
      },
      { replace },
    );
  // Refocusing is a navigation step, so it gets its own history entry.
  const setFocus = (endpoint) => update({ focus: keyOf(endpoint) }, { replace: false });
  const neighborhood = neighborhoodQuery.data;
  const focusPath = neighborhood ? entityDetailPath(workId, neighborhood.focus) : null;
  const total = neighborhood?.levels.reduce((sum, { items }) => sum + items.length, 0) ?? 0;

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <span className={styles.eyebrow}>Relations</span>
        <h2 className={styles.title}>관계 탐색</h2>
        <p className={styles.lead}>
          한 항목을 기준으로 직접 연결과 장면 정보(POV·등장 인물·장소·복선)로 이어진 항목을 따라갑니다.
        </p>
      </header>

      <FocusPicker repository={repository} workId={workId} onPick={setFocus} />

      {!focus ? <p className={styles.hint}>관계를 볼 항목을 검색해 선택하세요.</p> : null}
      {focus && neighborhoodQuery.isPending ? (
        <div aria-live="polite" role="status">
          <Skeleton />
          <span className={styles.visuallyHidden}>관계를 불러오는 중입니다.</span>
        </div>
      ) : null}
      {neighborhoodQuery.isError ? (
        <p className={styles.error} role="alert">관계를 불러오지 못했습니다.</p>
      ) : null}
      {focus && neighborhoodQuery.isSuccess && !neighborhood ? (
        <p className={styles.error} role="alert">관계를 볼 항목을 찾을 수 없습니다.</p>
      ) : null}

      {neighborhood ? (
        <>
          <div className={styles.focusCard}>
            <div className={styles.resultMeta}>
              <span className={styles.kindBadge}>{KIND_LABELS.get(neighborhood.focus.kind)}</span>
              <span>탐색 기준</span>
            </div>
            <h3>
              {focusPath ? <Link className={styles.resultLink} to={focusPath}>{neighborhood.focus.label}</Link> : neighborhood.focus.label}
            </h3>
            <p aria-live="polite" className={styles.status} role="status">
              연결된 항목 {total}개{neighborhood.truncated > 0 ? ` (표시 한도 초과 ${neighborhood.truncated}개 생략)` : ""}
            </p>
          </div>

          <div className={styles.toolbar}>
            <div className={styles.filters}>
              <label className={styles.filterField}>
                <span>연결 단계</span>
                <select
                  aria-label="연결 단계"
                  value={depth}
                  onChange={(event) => update({ depth: event.target.value === "1" ? "" : event.target.value })}
                >
                  <option value="1">1단계 (직접 연결)</option>
                  <option value="2">2단계</option>
                  <option value="3">3단계</option>
                </select>
              </label>
              <label className={styles.checkboxField}>
                <input
                  checked={includeArchived}
                  type="checkbox"
                  onChange={(event) => update({ archived: event.target.checked ? "1" : "" })}
                />
                <span>보관 항목 포함</span>
              </label>
            </div>
            <div aria-label="보기 방식" className={styles.toggle} role="group">
              <button aria-pressed={view === "list"} type="button" onClick={() => update({ view: "" })}>
                목록 보기
              </button>
              <button aria-pressed={view === "graph"} type="button" onClick={() => update({ view: "graph" })}>
                그래프 보기
              </button>
            </div>
          </div>

          {view === "graph" ? (
            <RelationGraph neighborhood={neighborhood} workId={workId} />
          ) : (
            <RelationList neighborhood={neighborhood} workId={workId} onFocus={setFocus} />
          )}
        </>
      ) : null}
    </section>
  );
}

export default RelationsPage;
