import { useMemo } from "react";
import { Link, useOutletContext, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, ArrowLeft, Pencil, RotateCcw } from "lucide-react";
import {
  settingEditPath,
  settingListPath,
} from "../../../app/paths";
import {
  menuQueryKeys,
  menuRepository,
  relationQueryKeys,
  relationRepository,
  settingQueryKeys,
  settingRepository,
} from "../../../data/repositories/appRepositories";
import { RichTextRenderer } from "../../../shared/editor";
import { Button, Skeleton } from "../../../shared/ui";
import {
  SETTING_FIELD_LABELS,
  enabledSettingFields,
  endpointKey,
  isOwnerRelation,
  relationCandidatePath,
  sameEndpoint,
  settingBelongsToMenu,
} from "../settings";
import styles from "./SettingDetailPage.module.css";

const displayValue = (value) => value || "-";

function EntityLink({ candidate, endpoint, workId }) {
  if (!candidate) {
    return <strong>{`${endpoint.type}:${endpoint.id}`}</strong>;
  }
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
    <section aria-labelledby={`${direction}-setting-relations`} className={styles.relationSection}>
      <h3 id={`${direction}-setting-relations`}>{isOutgoing ? "나가는 관계" : "들어오는 관계"}</h3>
      {relations.length === 0 ? (
        <p className={styles.relationState}>연결된 관계가 없습니다.</p>
      ) : (
        <ul className={styles.relations}>
          {relations.map((relation) => {
            const other = isOutgoing ? relation.target : relation.source;
            return (
              <li key={relation.id}>
                <EntityLink candidate={candidateMap.get(endpointKey(other))} endpoint={other} workId={workId} />
                <span>{relation.label} · {relation.relationType}{relation.bidirectional ? " · 상호" : ""}</span>
                {relation.notes ? <small>{relation.notes}</small> : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function SettingDetailContent({
  candidateMap,
  categories,
  menuItem,
  relationRecords,
  repository,
  setting,
  workId,
}) {
  const queryClient = useQueryClient();
  const source = { type: setting.resourceType, id: setting.id };
  const category = categories.find(({ id }) => id === setting.categoryId);
  const categoryLabel = category?.label ?? setting.categoryName ?? setting.categoryId;
  const fields = enabledSettingFields(category);
  const outgoing = relationRecords.filter((relation) => sameEndpoint(relation.source, source));
  const owners = outgoing.filter(isOwnerRelation);
  const otherOutgoing = outgoing.filter((relation) => !isOwnerRelation(relation));
  const incoming = relationRecords.filter((relation) => !sameEndpoint(relation.source, source));
  const lifecycleMutation = useMutation({
    mutationFn: () =>
      setting.archivedAt
        ? repository.restore(workId, setting.id)
        : repository.archive(workId, setting.id),
    onSuccess: async (updated) => {
      queryClient.setQueryData(settingQueryKeys.detail(workId, setting.id), updated);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: settingQueryKeys.all(workId) }),
        queryClient.invalidateQueries({ queryKey: relationQueryKeys.all(workId) }),
      ]);
    },
  });

  return (
    <article className={styles.page}>
      {setting.archivedAt ? (
        <div className={styles.archivedBanner} role="status">
          <span>보관된 설정 자료입니다. 사용자와 관계는 유지됩니다.</span>
          <Button
            disabled={lifecycleMutation.isPending}
            size="small"
            variant="secondary"
            onClick={() => lifecycleMutation.mutate()}
          >
            <RotateCcw aria-hidden="true" size={17} />
            복원
          </Button>
        </div>
      ) : null}

      <header className={styles.header}>
        <div className={styles.headingGroup}>
          <span className={styles.eyebrow}>{categoryLabel}</span>
          <h2>{setting.title}</h2>
          <p>{displayValue(setting.summary)}</p>
        </div>
        {!setting.archivedAt ? (
          <div className={styles.actions}>
            <Button as={Link} size="small" to={settingEditPath(workId, menuItem.id, setting.id)} variant="secondary">
              <Pencil aria-hidden="true" size={17} />
              편집
            </Button>
            <Button
              disabled={lifecycleMutation.isPending}
              size="small"
              variant="danger"
              onClick={() => lifecycleMutation.mutate()}
            >
              <Archive aria-hidden="true" size={17} />
              보관
            </Button>
          </div>
        ) : null}
      </header>

      {lifecycleMutation.isError ? (
        <p className={styles.error} role="alert">보관 상태를 변경하지 못했습니다.</p>
      ) : null}

      <dl className={styles.meta}>
        <div><dt>분류</dt><dd>{categoryLabel}</dd></div>
        <div><dt>상태</dt><dd>{setting.status}</dd></div>
        {fields.includes("grade") ? (
          <div><dt>{SETTING_FIELD_LABELS.get("grade")}</dt><dd>{displayValue(setting.grade)}</dd></div>
        ) : null}
        {fields.includes("owners") ? (
          <div>
            <dt>{SETTING_FIELD_LABELS.get("owners")}</dt>
            <dd>
              {owners.length > 0 ? (
                <ul aria-label="사용자" className={styles.chips}>
                  {owners.map((relation) => (
                    <li key={relation.id}>
                      <EntityLink
                        candidate={candidateMap.get(endpointKey(relation.target))}
                        endpoint={relation.target}
                        workId={workId}
                      />
                    </li>
                  ))}
                </ul>
              ) : "-"}
            </dd>
          </div>
        ) : null}
        <div>
          <dt>태그</dt>
          <dd>
            {setting.tags.length > 0 ? (
              <ul aria-label="태그" className={styles.chips}>
                {setting.tags.map((tag) => <li key={tag}>{tag}</li>)}
              </ul>
            ) : "-"}
          </dd>
        </div>
      </dl>

      {["effect", "condition", "limitation"]
        .filter((key) => fields.includes(key))
        .map((key) => (
          <section aria-labelledby={`setting-${key}`} className={styles.panel} key={key}>
            <h3 id={`setting-${key}`}>{SETTING_FIELD_LABELS.get(key)}</h3>
            <p className={styles.preWrap}>{displayValue(setting[key])}</p>
          </section>
        ))}

      {setting.attributes.length > 0 ? (
        <section aria-labelledby="setting-attributes" className={styles.panel}>
          <h3 id="setting-attributes">추가 속성</h3>
          <dl className={styles.attributes}>
            {setting.attributes.map((attribute) => (
              <div key={attribute.id}>
                <dt>{attribute.label}</dt>
                <dd>{displayValue(attribute.value)}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      <section aria-labelledby="setting-body" className={styles.panel}>
        <h3 id="setting-body">본문</h3>
        <RichTextRenderer className={styles.body} value={setting.body} />
      </section>

      <div className={styles.relationGrid}>
        <RelationSection candidateMap={candidateMap} direction="outgoing" relations={otherOutgoing} workId={workId} />
        <RelationSection candidateMap={candidateMap} direction="incoming" relations={incoming} workId={workId} />
      </div>

      <Button as={Link} className={styles.backLink} to={settingListPath(workId, menuItem.id)} variant="ghost">
        <ArrowLeft aria-hidden="true" size={18} />
        {menuItem.label} 목록
      </Button>
    </article>
  );
}

function SettingDetailPage({
  menus = menuRepository,
  relations = relationRepository,
  repository = settingRepository,
}) {
  const { menuItem } = useOutletContext();
  const { settingId, workId } = useParams();
  const settingQuery = useQuery({
    enabled: Boolean(settingId),
    networkMode: "always",
    queryKey: settingQueryKeys.detail(workId, settingId),
    queryFn: () => repository.get(workId, settingId),
    retry: false,
  });
  const categoriesQuery = useQuery({
    networkMode: "always",
    queryKey: menuQueryKeys.items("setting", true),
    queryFn: () => menus.listItems("setting", { includeArchived: true }),
    retry: false,
  });
  const setting = settingQuery.data;
  const matchesMenu = setting ? settingBelongsToMenu(setting, menuItem) : false;
  const source = useMemo(
    () => (setting ? { type: setting.resourceType, id: setting.id } : undefined),
    [setting],
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
      new Map(
        (candidatesQuery.data ?? []).map((candidate) => [
          endpointKey(candidate.endpoint),
          candidate,
        ]),
      ),
    [candidatesQuery.data],
  );
  const failed =
    settingQuery.isError ||
    categoriesQuery.isError ||
    relationsQuery.isError ||
    candidatesQuery.isError;
  const loading =
    !failed &&
    (settingQuery.isPending ||
      categoriesQuery.isPending ||
      (matchesMenu && (relationsQuery.isPending || candidatesQuery.isPending)));

  if (loading) {
    return (
      <div aria-live="polite" className={styles.state} role="status">
        <Skeleton className={styles.loadingSkeleton} />
        <span>설정 자료를 불러오는 중입니다.</span>
      </div>
    );
  }

  if (failed || !setting || !matchesMenu) {
    return (
      <section className={styles.state} role="alert">
        <p>현재 분류에서 설정 자료를 찾을 수 없습니다.</p>
        <Link to={settingListPath(workId, menuItem.id)}>{menuItem.label} 목록으로</Link>
      </section>
    );
  }

  return (
    <SettingDetailContent
      candidateMap={candidateMap}
      categories={categoriesQuery.data ?? []}
      key={`${setting.id}:${setting.version}`}
      menuItem={menuItem}
      relationRecords={relationsQuery.data ?? []}
      repository={repository}
      setting={setting}
      workId={workId}
    />
  );
}

export default SettingDetailPage;
