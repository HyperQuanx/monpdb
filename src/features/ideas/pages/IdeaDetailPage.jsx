import { useMemo, useState } from "react";
import {
  Link,
  useNavigate,
  useOutletContext,
  useParams,
} from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, ArrowLeft, Pencil, RotateCcw, Shuffle } from "lucide-react";
import { ideaEditPath, ideaListPath } from "../../../app/paths";
import {
  ideaConverter as defaultConverter,
  ideaQueryKeys,
  ideaRepository,
  menuQueryKeys,
  menuRepository,
  plotQueryKeys,
  relationQueryKeys,
  relationRepository,
  settingQueryKeys,
  worldQueryKeys,
} from "../../../data/repositories/appRepositories";
import { RichTextRenderer } from "../../../shared/editor";
import { Button, Skeleton } from "../../../shared/ui";
import {
  IDEA_CONVERSION_TARGETS,
  IDEA_PRIORITY_LABELS,
  IDEA_STATUS_LABELS,
  IDEA_STATUS_TRANSITIONS,
  IDEA_TRANSITION_ACTIONS,
  conversionTargetPath,
  endpointKey,
  ideaBelongsToMenu,
  relationCandidatePath,
  sameEndpoint,
} from "../ideas";
import styles from "./IdeaDetailPage.module.css";

const displayValue = (value) => value || "-";
const isConcreteTargetMenu = (item, sectionId) =>
  item.sectionId === sectionId &&
  item.filterConfig?.scope === "category" &&
  !item.archivedAt;

function EntityLink({ candidate, endpoint, workId }) {
  if (!candidate) return <strong>{`${endpoint.type}:${endpoint.id}`}</strong>;
  const path = relationCandidatePath(workId, candidate);
  return (
    <span className={styles.relationTarget}>
      {path ? <Link to={path}>{candidate.label}</Link> : <strong>{candidate.label}</strong>}
      {candidate.archivedAt ? <span className={styles.archivedBadge}>보관됨</span> : null}
    </span>
  );
}

function RelationSection({ candidateMap, direction, relations, workId }) {
  const isOutgoing = direction === "outgoing";
  return (
    <section aria-labelledby={`${direction}-idea-relations`} className={styles.relationSection}>
      <h3 id={`${direction}-idea-relations`}>{isOutgoing ? "나가는 관계" : "들어오는 관계"}</h3>
      {relations.length === 0 ? (
        <p className={styles.relationState}>연결된 관계가 없습니다.</p>
      ) : (
        <ul className={styles.relations}>
          {relations.map((relation) => {
            const other = isOutgoing ? relation.target : relation.source;
            return (
              <li key={relation.id}>
                <EntityLink candidate={candidateMap.get(endpointKey(other))} endpoint={other} workId={workId} />
                <span>{relation.label} · {relation.relationType}</span>
                {relation.notes ? <small>{relation.notes}</small> : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function ConversionPanel({ converter, idea, menus, onConverted, workId }) {
  const [targetType, setTargetType] = useState("plot");
  const [categoryId, setCategoryId] = useState("");
  const target = IDEA_CONVERSION_TARGETS[targetType];
  const menusQuery = useQuery({
    networkMode: "always",
    queryKey: menuQueryKeys.items(target.sectionId),
    queryFn: () => menus.listItems(target.sectionId),
    retry: false,
  });
  const options = (menusQuery.data ?? []).filter((item) =>
    isConcreteTargetMenu(item, target.sectionId),
  );
  const selectedCategory = options.some(({ id }) => id === categoryId)
    ? categoryId
    : options[0]?.id ?? "";
  const mutation = useMutation({
    mutationFn: () =>
      converter.convert(workId, idea.id, { categoryId: selectedCategory, targetType }),
    onSuccess: onConverted,
  });

  return (
    <section aria-labelledby="idea-convert" className={styles.panel}>
      <h3 id="idea-convert">다른 항목으로 변환</h3>
      <p className={styles.relationState}>
        변환하면 새 항목이 만들어지고, 새 항목에서 이 아이디어로 가는 &quot;원본 아이디어&quot; 관계가 남습니다. 아이디어는 채택 상태가 됩니다.
      </p>
      <div className={styles.convertRow}>
        <label className={styles.convertField}>
          <span>변환 대상</span>
          <select value={targetType} onChange={(event) => setTargetType(event.target.value)}>
            {Object.entries(IDEA_CONVERSION_TARGETS).map(([value, { label }]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label className={styles.convertField}>
          <span>대상 분류</span>
          <select
            disabled={options.length === 0}
            value={selectedCategory}
            onChange={(event) => setCategoryId(event.target.value)}
          >
            {options.map((item) => (
              <option key={item.id} value={item.id}>{item.label}</option>
            ))}
          </select>
        </label>
        <Button
          disabled={!selectedCategory || mutation.isPending}
          size="small"
          onClick={() => mutation.mutate()}
        >
          <Shuffle aria-hidden="true" size={17} />
          {mutation.isPending ? "변환 중…" : "변환"}
        </Button>
      </div>
      {mutation.isError ? (
        <p className={styles.error} role="alert">{mutation.error.message}</p>
      ) : null}
    </section>
  );
}

function IdeaDetailContent({
  candidateMap,
  categories,
  converter,
  idea,
  menuItem,
  menus,
  relationRecords,
  repository,
  workId,
}) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const source = { type: idea.resourceType, id: idea.id };
  const categoryLabel =
    categories.find(({ id }) => id === idea.categoryId)?.label ?? idea.categoryName ?? idea.categoryId;
  const outgoing = relationRecords.filter((relation) => sameEndpoint(relation.source, source));
  const incoming = relationRecords.filter((relation) => !sameEndpoint(relation.source, source));
  const converted = idea.convertedTo ? candidateMap.get(endpointKey(idea.convertedTo)) : null;
  const convertedPath = converted
    ? conversionTargetPath(workId, idea.convertedTo, converted.menuItemId)
    : null;
  const invalidateAll = () =>
    Promise.all(
      [ideaQueryKeys, plotQueryKeys, settingQueryKeys, worldQueryKeys, relationQueryKeys].map(
        (keys) => queryClient.invalidateQueries({ queryKey: keys.all(workId) }),
      ),
    );
  const setIdea = (updated) =>
    queryClient.setQueryData(ideaQueryKeys.detail(workId, idea.id), updated);
  const lifecycleMutation = useMutation({
    mutationFn: () =>
      idea.archivedAt ? repository.restore(workId, idea.id) : repository.archive(workId, idea.id),
    onSuccess: async (updated) => {
      setIdea(updated);
      await invalidateAll();
    },
  });
  const transitionMutation = useMutation({
    mutationFn: (nextStatus) => repository.transition(workId, idea.id, nextStatus),
    onSuccess: async (updated) => {
      setIdea(updated);
      await invalidateAll();
    },
  });
  const canConvert = !idea.archivedAt && !["adopted", "discarded"].includes(idea.status);

  return (
    <article className={styles.page}>
      {idea.archivedAt ? (
        <div className={styles.archivedBanner} role="status">
          <span>보관된 아이디어입니다. 관계는 유지됩니다.</span>
          <Button disabled={lifecycleMutation.isPending} size="small" variant="secondary" onClick={() => lifecycleMutation.mutate()}>
            <RotateCcw aria-hidden="true" size={17} />
            복원
          </Button>
        </div>
      ) : null}

      <header className={styles.header}>
        <div className={styles.headingGroup}>
          <span className={styles.eyebrow}>{categoryLabel}</span>
          <h2>{idea.title}</h2>
          <p>{displayValue(idea.summary)}</p>
        </div>
        {!idea.archivedAt ? (
          <div className={styles.actions}>
            <Button as={Link} size="small" to={ideaEditPath(workId, menuItem.id, idea.id)} variant="secondary">
              <Pencil aria-hidden="true" size={17} />
              편집
            </Button>
            <Button disabled={lifecycleMutation.isPending} size="small" variant="danger" onClick={() => lifecycleMutation.mutate()}>
              <Archive aria-hidden="true" size={17} />
              보관
            </Button>
          </div>
        ) : null}
      </header>

      <dl className={styles.meta}>
        <div><dt>유형</dt><dd>{categoryLabel}</dd></div>
        <div><dt>우선순위</dt><dd>{IDEA_PRIORITY_LABELS.get(idea.priority)}</dd></div>
        <div><dt>상태</dt><dd>{IDEA_STATUS_LABELS.get(idea.status)}</dd></div>
        <div><dt>출처</dt><dd>{displayValue(idea.source)}</dd></div>
        <div>
          <dt>태그</dt>
          <dd>
            {idea.tags.length > 0 ? (
              <ul aria-label="태그" className={styles.chips}>
                {idea.tags.map((tag) => <li key={tag}>{tag}</li>)}
              </ul>
            ) : "-"}
          </dd>
        </div>
      </dl>

      {idea.status === "adopted" ? (
        <section aria-labelledby="idea-adopted" className={styles.panel}>
          <h3 id="idea-adopted">채택 결과</h3>
          <p className={styles.inlineValues}>
            <span>변환 결과</span>
            {convertedPath ? <Link to={convertedPath}>{converted.label}</Link> : <strong>{converted?.label ?? "알 수 없는 항목"}</strong>}
            {converted?.archivedAt ? <span className={styles.archivedBadge}>보관됨</span> : null}
          </p>
        </section>
      ) : null}

      {!idea.archivedAt && IDEA_STATUS_TRANSITIONS[idea.status].length > 0 ? (
        <section aria-labelledby="idea-status" className={styles.panel}>
          <h3 id="idea-status">발전 단계</h3>
          <div className={styles.transitionRow}>
            {IDEA_STATUS_TRANSITIONS[idea.status].map((nextStatus) => (
              <Button
                disabled={transitionMutation.isPending}
                key={nextStatus}
                size="small"
                variant="secondary"
                onClick={() => transitionMutation.mutate(nextStatus)}
              >
                {IDEA_TRANSITION_ACTIONS[nextStatus]}
              </Button>
            ))}
          </div>
          {transitionMutation.isError ? (
            <p className={styles.error} role="alert">{transitionMutation.error.message}</p>
          ) : null}
        </section>
      ) : null}

      {canConvert ? (
        <ConversionPanel
          converter={converter}
          idea={idea}
          menus={menus}
          workId={workId}
          onConverted={async ({ idea: adopted, target }) => {
            setIdea(adopted);
            await invalidateAll();
            navigate(conversionTargetPath(workId, { type: target.resourceType, id: target.id }, target.menuItemId));
          }}
        />
      ) : null}

      <section aria-labelledby="idea-body" className={styles.panel}>
        <h3 id="idea-body">본문</h3>
        <RichTextRenderer className={styles.body} value={idea.body} />
      </section>

      <div className={styles.relationGrid}>
        <RelationSection candidateMap={candidateMap} direction="outgoing" relations={outgoing} workId={workId} />
        <RelationSection candidateMap={candidateMap} direction="incoming" relations={incoming} workId={workId} />
      </div>

      <Button as={Link} className={styles.backLink} to={ideaListPath(workId, menuItem.id)} variant="ghost">
        <ArrowLeft aria-hidden="true" size={18} />
        {menuItem.label} 목록
      </Button>
    </article>
  );
}

function IdeaDetailPage({
  converter = defaultConverter,
  menus = menuRepository,
  relations = relationRepository,
  repository = ideaRepository,
}) {
  const { menuItem } = useOutletContext();
  const { ideaId, workId } = useParams();
  const ideaQuery = useQuery({
    enabled: Boolean(ideaId),
    networkMode: "always",
    queryKey: ideaQueryKeys.detail(workId, ideaId),
    queryFn: () => repository.get(workId, ideaId),
    retry: false,
  });
  const categoriesQuery = useQuery({
    networkMode: "always",
    queryKey: menuQueryKeys.items("idea", true),
    queryFn: () => menus.listItems("idea", { includeArchived: true }),
    retry: false,
  });
  const idea = ideaQuery.data;
  const matchesMenu = idea ? ideaBelongsToMenu(idea, menuItem) : false;
  const source = useMemo(
    () => (idea ? { type: idea.resourceType, id: idea.id } : undefined),
    [idea],
  );
  const relationsQuery = useQuery({
    enabled: Boolean(source && matchesMenu),
    networkMode: "always",
    queryKey: relationQueryKeys.list(workId, source),
    queryFn: () => relations.list(workId, source),
    retry: false,
  });
  const candidatesQuery = useQuery({
    enabled: Boolean(source && matchesMenu),
    networkMode: "always",
    queryKey: relationQueryKeys.candidates(workId, undefined),
    queryFn: () => relations.listCandidates(workId, undefined, { includeArchived: true }),
    retry: false,
  });
  const candidateMap = useMemo(
    () =>
      new Map((candidatesQuery.data ?? []).map((candidate) => [endpointKey(candidate.endpoint), candidate])),
    [candidatesQuery.data],
  );
  const failed =
    ideaQuery.isError || categoriesQuery.isError || relationsQuery.isError || candidatesQuery.isError;
  const loading =
    !failed &&
    (ideaQuery.isPending ||
      categoriesQuery.isPending ||
      (matchesMenu && (relationsQuery.isPending || candidatesQuery.isPending)));

  if (loading) {
    return (
      <div aria-live="polite" className={styles.state} role="status">
        <Skeleton className={styles.loadingSkeleton} />
        <span>아이디어를 불러오는 중입니다.</span>
      </div>
    );
  }

  if (failed || !idea || !matchesMenu) {
    return (
      <section className={styles.state} role="alert">
        <p>현재 유형에서 아이디어를 찾을 수 없습니다.</p>
        <Link to={ideaListPath(workId, menuItem.id)}>{menuItem.label} 목록으로</Link>
      </section>
    );
  }

  return (
    <IdeaDetailContent
      candidateMap={candidateMap}
      categories={categoriesQuery.data ?? []}
      converter={converter}
      idea={idea}
      key={`${idea.id}:${idea.version}`}
      menuItem={menuItem}
      menus={menus}
      relationRecords={relationsQuery.data ?? []}
      repository={repository}
      workId={workId}
    />
  );
}

export default IdeaDetailPage;
