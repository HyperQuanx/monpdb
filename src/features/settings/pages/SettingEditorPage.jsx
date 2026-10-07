import { flushSync } from "react-dom";
import { useId, useMemo, useRef, useState } from "react";
import {
  Link,
  useNavigate,
  useOutletContext,
  useParams,
} from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Save, Trash2 } from "lucide-react";
import { settingDetailPath, settingListPath } from "../../../app/paths";
import {
  menuQueryKeys,
  menuRepository,
  relationQueryKeys,
  relationRepository,
  settingQueryKeys,
  settingRepository,
} from "../../../data/repositories/appRepositories";
import {
  EMPTY_TIPTAP_DOCUMENT,
  RichTextEditor,
  normalizeTiptapDocument,
} from "../../../shared/editor";
import { UnsavedChangesGuard } from "../../../shared/hooks";
import { RelationPicker } from "../../../shared/relations";
import { Button, Input, Skeleton } from "../../../shared/ui";
import {
  OWNER_RELATION_LABEL,
  SETTING_FIELD_LABELS,
  SETTING_OWNER_RELATION_TYPE,
  editableRelation,
  enabledSettingFields,
  endpointKey,
  isAllSettingCategory,
  isConcreteSettingCategory,
  isOwnerRelation,
  normalizeRelationDrafts,
  parseCommaSeparated,
  sameEndpoint,
  settingBelongsToMenu,
} from "../settings";
import styles from "./SettingEditorPage.module.css";

const draftSnapshot = (draft) =>
  JSON.stringify({
    ...draft,
    body: normalizeTiptapDocument(draft.body),
    relations: draft.relations.map(editableRelation),
  });

const candidateLabel = (candidate) =>
  `${candidate.label}${candidate.archivedAt ? " (보관됨)" : ""}`;

const textFields = [
  ["effect", 3],
  ["condition", 3],
  ["limitation", 3],
];

function SettingEditorForm({
  candidates,
  categories,
  connected,
  entry,
  menuItem,
  relationRepository: relations,
  repository,
  route,
}) {
  const { menuItemId, settingId, workId } = route;
  const isEdit = Boolean(settingId);
  const source = entry ? { type: entry.resourceType, id: entry.id } : undefined;
  const outgoing = connected.filter((relation) => sameEndpoint(relation.source, source));
  const ownerRelations = outgoing.filter(isOwnerRelation);
  const incoming = connected.filter((relation) => !sameEndpoint(relation.source, source));
  const initialDraft = {
    attributes: (entry?.attributes ?? []).map((attribute) => ({ ...attribute })),
    body: normalizeTiptapDocument(entry?.body ?? EMPTY_TIPTAP_DOCUMENT),
    categoryId:
      entry?.categoryId ?? (isConcreteSettingCategory(menuItem) ? menuItem.id : ""),
    condition: entry?.condition ?? "",
    effect: entry?.effect ?? "",
    grade: entry?.grade ?? "",
    limitation: entry?.limitation ?? "",
    ownerIds: ownerRelations.map(({ target }) => target.id),
    relations: outgoing.filter((relation) => !isOwnerRelation(relation)).map(editableRelation),
    status: entry?.status ?? "draft",
    summary: entry?.summary ?? "",
    tags: entry?.tags?.join(", ") ?? "",
    title: entry?.title ?? "",
  };
  const [draft, setDraft] = useState(initialDraft);
  const [relationDrafts, setRelationDrafts] = useState(initialDraft.relations);
  const [titleError, setTitleError] = useState("");
  const [categoryError, setCategoryError] = useState("");
  const [attributeError, setAttributeError] = useState("");
  const [formError, setFormError] = useState("");
  const [savedSnapshot, setSavedSnapshot] = useState(() => draftSnapshot(initialDraft));
  const createdRef = useRef(null);
  const titleRef = useRef(null);
  const categoryRef = useRef(null);
  const attributeListRef = useRef(null);
  const titleErrorId = useId();
  const categoryErrorId = useId();
  const attributeErrorId = useId();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentSnapshot = draftSnapshot({ ...draft, relations: relationDrafts });
  const isDirty = currentSnapshot !== savedSnapshot;
  const cancelPath = isEdit
    ? settingDetailPath(workId, menuItemId, settingId)
    : settingListPath(workId, menuItemId);
  const concreteCategories = categories.filter(isConcreteSettingCategory);
  const selectedCategory = categories.find(({ id }) => id === draft.categoryId);
  const fields = enabledSettingFields(selectedCategory);
  const hiddenFields = [...SETTING_FIELD_LABELS.keys()].filter((key) => !fields.includes(key));
  const ownerOptions = candidates.filter(
    (candidate) =>
      candidate.endpoint.type === "character" &&
      (!candidate.archivedAt || draft.ownerIds.includes(candidate.endpoint.id)),
  );
  const pickerCandidates = candidates.map((candidate) => ({
    ...candidate,
    label: candidateLabel(candidate),
  }));
  const incomingLabels = new Map(
    pickerCandidates.map((candidate) => [endpointKey(candidate.endpoint), candidate.label]),
  );

  const setField = (field) => (event) => {
    const value = event.target.value;
    setDraft((current) => ({ ...current, [field]: value }));
  };
  const toggleOwner = (characterId) =>
    setDraft((current) => ({
      ...current,
      ownerIds: current.ownerIds.includes(characterId)
        ? current.ownerIds.filter((id) => id !== characterId)
        : [...current.ownerIds, characterId],
    }));
  const updateAttribute = (index, patch) => {
    setDraft((current) => ({
      ...current,
      attributes: current.attributes.map((attribute, attributeIndex) =>
        attributeIndex === index ? { ...attribute, ...patch } : attribute,
      ),
    }));
    if (attributeError) setAttributeError("");
  };

  const saveMutation = useMutation({
    mutationFn: async ({ payload, relationUpdates }) => {
      let saved;
      if (isEdit) {
        saved = await repository.update(workId, settingId, payload);
      } else if (createdRef.current) {
        saved = await repository.update(workId, createdRef.current.id, payload);
      } else {
        saved = await repository.create(workId, payload);
        createdRef.current = saved;
      }
      await relations.replaceOutgoing(
        workId,
        { type: saved.resourceType, id: saved.id },
        relationUpdates,
      );
      return saved;
    },
    onSuccess: async (saved) => {
      queryClient.setQueryData(settingQueryKeys.detail(workId, saved.id), saved);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: settingQueryKeys.all(workId) }),
        queryClient.invalidateQueries({ queryKey: relationQueryKeys.all(workId) }),
      ]);
      flushSync(() => setSavedSnapshot(currentSnapshot));
      const destination = isAllSettingCategory(menuItem) ? menuItem.id : saved.categoryId;
      navigate(settingDetailPath(workId, destination, saved.id), { replace: true });
    },
    onError: (error) => setFormError(error?.message || "설정 자료를 저장하지 못했습니다."),
  });

  const handleSubmit = (event) => {
    event.preventDefault();
    setFormError("");
    const title = draft.title.trim();
    if (!title) {
      setTitleError("이름을 입력해 주세요.");
      titleRef.current?.focus();
      return;
    }
    setTitleError("");
    if (!concreteCategories.some(({ id }) => id === draft.categoryId)) {
      setCategoryError("설정 분류를 선택해 주세요.");
      categoryRef.current?.focus();
      return;
    }
    setCategoryError("");
    const blankIndex = draft.attributes.findIndex(({ label }) => !label.trim());
    if (blankIndex >= 0) {
      setAttributeError(`속성 ${blankIndex + 1}의 이름을 입력해 주세요.`);
      attributeListRef.current?.querySelectorAll("[data-attribute-label]")[blankIndex]?.focus();
      return;
    }
    setAttributeError("");

    let pickerUpdates;
    try {
      pickerUpdates = normalizeRelationDrafts(relationDrafts, source);
    } catch (error) {
      setFormError(error.message);
      return;
    }
    // Owners are stored as owner relations; keep existing ids to preserve them.
    const ownerUpdates = draft.ownerIds.map((characterId) => {
      const existing = ownerRelations.find(({ target }) => target.id === characterId);
      return {
        ...(existing ? { id: existing.id } : {}),
        bidirectional: false,
        label: existing?.label ?? OWNER_RELATION_LABEL,
        notes: existing?.notes ?? "",
        relationType: SETTING_OWNER_RELATION_TYPE,
        target: { type: "character", id: characterId },
      };
    });

    saveMutation.mutate({
      payload: {
        attributes: draft.attributes.map((attribute) => ({
          ...(attribute.id ? { id: attribute.id } : {}),
          label: attribute.label.trim(),
          value: attribute.value ?? "",
        })),
        body: normalizeTiptapDocument(draft.body),
        categoryId: draft.categoryId,
        condition: draft.condition.trim(),
        effect: draft.effect.trim(),
        grade: draft.grade.trim(),
        limitation: draft.limitation.trim(),
        status: draft.status.trim() || "draft",
        summary: draft.summary.trim(),
        tags: parseCommaSeparated(draft.tags),
        title,
      },
      relationUpdates: [...pickerUpdates, ...ownerUpdates],
    });
  };

  return (
    <>
      <form
        aria-label={`${menuItem.label} 설정 자료 ${isEdit ? "편집" : "추가"}`}
        className={styles.form}
        noValidate
        onSubmit={handleSubmit}
      >
        <header className={styles.header}>
          <span className={styles.eyebrow}>{menuItem.label}</span>
          <h2>{isEdit ? "설정 자료 편집" : "새 설정 자료 추가"}</h2>
        </header>

        <div className={styles.fieldGrid}>
          <label className={styles.field}>
            <span>분류 <strong aria-hidden="true">*</strong></span>
            <select
              aria-describedby={categoryError ? categoryErrorId : undefined}
              aria-invalid={Boolean(categoryError)}
              className={styles.control}
              ref={categoryRef}
              value={draft.categoryId}
              onChange={(event) => {
                setField("categoryId")(event);
                if (categoryError) setCategoryError("");
              }}
            >
              <option value="">분류 선택</option>
              {concreteCategories.map((category) => (
                <option key={category.id} value={category.id}>{category.label}</option>
              ))}
            </select>
            {categoryError ? <span className={styles.fieldError} id={categoryErrorId} role="alert">{categoryError}</span> : null}
          </label>
          <label className={styles.field}>
            <span>상태</span>
            <Input className={styles.control} value={draft.status} onChange={setField("status")} />
          </label>
        </div>

        <label className={styles.field}>
          <span>이름 <strong aria-hidden="true">*</strong></span>
          <Input
            aria-describedby={titleError ? titleErrorId : undefined}
            aria-invalid={Boolean(titleError)}
            autoFocus
            className={styles.control}
            ref={titleRef}
            value={draft.title}
            onChange={(event) => {
              setField("title")(event);
              if (titleError) setTitleError("");
            }}
          />
          {titleError ? <span className={styles.fieldError} id={titleErrorId} role="alert">{titleError}</span> : null}
        </label>

        <label className={styles.field}>
          <span>요약</span>
          <textarea className={styles.textarea} rows="3" value={draft.summary} onChange={setField("summary")} />
        </label>

        {fields.includes("grade") ? (
          <label className={styles.field}>
            <span>{SETTING_FIELD_LABELS.get("grade")}</span>
            <Input className={styles.control} placeholder="예: 상급, S, 3성" value={draft.grade} onChange={setField("grade")} />
          </label>
        ) : null}
        {textFields
          .filter(([key]) => fields.includes(key))
          .map(([key, rows]) => (
            <label className={styles.field} key={key}>
              <span>{SETTING_FIELD_LABELS.get(key)}</span>
              <textarea className={styles.textarea} rows={rows} value={draft[key]} onChange={setField(key)} />
            </label>
          ))}

        {fields.includes("owners") ? (
          <fieldset className={styles.fieldset}>
            <legend>{SETTING_FIELD_LABELS.get("owners")}</legend>
            {ownerOptions.length === 0 ? (
              <p className={styles.helper}>선택할 수 있는 인물이 없습니다.</p>
            ) : (
              <div className={styles.checkboxGrid}>
                {ownerOptions.map((candidate) => (
                  <label className={styles.checkboxLabel} key={candidate.endpoint.id}>
                    <input
                      checked={draft.ownerIds.includes(candidate.endpoint.id)}
                      type="checkbox"
                      onChange={() => toggleOwner(candidate.endpoint.id)}
                    />
                    <span>{candidateLabel(candidate)}</span>
                  </label>
                ))}
              </div>
            )}
          </fieldset>
        ) : null}
        {hiddenFields.length > 0 ? (
          <p className={styles.helper}>
            이 분류에서 숨긴 필드({hiddenFields.map((key) => SETTING_FIELD_LABELS.get(key)).join(", ")})의 기존 값은 그대로 보존됩니다.
          </p>
        ) : null}

        <fieldset className={styles.fieldset} ref={attributeListRef}>
          <legend>추가 속성</legend>
          <p className={styles.helper}>분류마다 필요한 항목(예: 공격력, 재질)을 자유롭게 추가합니다.</p>
          {draft.attributes.map((attribute, index) => {
            const number = index + 1;
            return (
              <div className={styles.clueRow} key={attribute.id ?? `new-${index}`}>
                <label className={styles.field}>
                  <span>이름</span>
                  <Input
                    aria-describedby={attributeError ? attributeErrorId : undefined}
                    aria-label={`속성 ${number} 이름`}
                    className={styles.control}
                    data-attribute-label=""
                    value={attribute.label}
                    onChange={(event) => updateAttribute(index, { label: event.target.value })}
                  />
                </label>
                <label className={styles.field}>
                  <span>값</span>
                  <Input
                    aria-label={`속성 ${number} 값`}
                    className={styles.control}
                    value={attribute.value}
                    onChange={(event) => updateAttribute(index, { value: event.target.value })}
                  />
                </label>
                <Button
                  aria-label={`속성 ${number} 삭제`}
                  className={styles.clueRemove}
                  size="small"
                  variant="ghost"
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      attributes: current.attributes.filter((_, attributeIndex) => attributeIndex !== index),
                    }))
                  }
                >
                  <Trash2 aria-hidden="true" size={17} />
                  삭제
                </Button>
              </div>
            );
          })}
          {attributeError ? <span className={styles.fieldError} id={attributeErrorId} role="alert">{attributeError}</span> : null}
          <Button
            className={styles.clueAdd}
            size="small"
            variant="secondary"
            onClick={() =>
              setDraft((current) => ({
                ...current,
                attributes: [...current.attributes, { label: "", value: "" }],
              }))
            }
          >
            <Plus aria-hidden="true" size={17} />
            속성 추가
          </Button>
        </fieldset>

        <label className={styles.field}>
          <span>태그</span>
          <Input aria-label="태그" className={styles.control} placeholder="쉼표로 구분" value={draft.tags} onChange={setField("tags")} />
        </label>

        <RichTextEditor
          className={styles.editor}
          description="설정 자료 본문을 작성합니다. 제목, 목록, 굵게 등 서식을 적용할 수 있습니다."
          value={draft.body}
          onChange={(body) => setDraft((current) => ({ ...current, body }))}
        />

        <RelationPicker
          candidates={pickerCandidates}
          className={styles.relationPicker}
          disabled={saveMutation.isPending}
          source={source}
          value={relationDrafts}
          workId={workId}
          onChange={setRelationDrafts}
        />

        {incoming.length > 0 ? (
          <section aria-labelledby="incoming-setting-relations" className={styles.incoming}>
            <h3 id="incoming-setting-relations">들어오는 관계</h3>
            <p>다른 항목에서 연결한 관계는 저장해도 유지됩니다.</p>
            <ul>
              {incoming.map((relation) => (
                <li key={relation.id}>
                  <strong>{incomingLabels.get(endpointKey(relation.source)) ?? `${relation.source.type}:${relation.source.id}`}</strong>
                  <span>{relation.label}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {formError ? <p className={styles.formError} role="alert">{formError}</p> : null}

        <div className={styles.actions}>
          <Button as={Link} to={cancelPath} variant="secondary">취소</Button>
          <Button disabled={saveMutation.isPending} type="submit">
            <Save aria-hidden="true" size={18} />
            {saveMutation.isPending ? "저장 중…" : "저장"}
          </Button>
        </div>
      </form>
      <UnsavedChangesGuard isDirty={isDirty} />
    </>
  );
}

function SettingEditorPage({
  menus = menuRepository,
  relations = relationRepository,
  repository = settingRepository,
}) {
  const { menuItem } = useOutletContext();
  const route = useParams();
  const { settingId, workId } = route;
  const isEdit = Boolean(settingId);
  const entryQuery = useQuery({
    enabled: isEdit,
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
  const entry = entryQuery.data;
  const matchesMenu = entry ? settingBelongsToMenu(entry, menuItem) : !isEdit;
  const source = useMemo(
    () => (entry ? { type: entry.resourceType, id: entry.id } : undefined),
    [entry],
  );
  const connectedQuery = useQuery({
    enabled: Boolean(isEdit && source && matchesMenu),
    networkMode: "always",
    queryKey: relationQueryKeys.list(workId, source),
    queryFn: () => relations.list(workId, source),
    retry: false,
  });
  const candidatesQuery = useQuery({
    enabled: Boolean(matchesMenu && (!isEdit || source)),
    networkMode: "always",
    queryKey: relationQueryKeys.candidates(workId, source),
    queryFn: () => relations.listCandidates(workId, source, { includeArchived: true }),
    retry: false,
  });
  const failed =
    categoriesQuery.isError ||
    (isEdit && entryQuery.isError) ||
    connectedQuery.isError ||
    candidatesQuery.isError;
  const loading =
    !failed &&
    (categoriesQuery.isPending ||
      (isEdit && entryQuery.isPending) ||
      (isEdit && connectedQuery.isPending) ||
      candidatesQuery.isPending);

  if (loading) {
    return (
      <div aria-live="polite" className={styles.state} role="status">
        <Skeleton className={styles.loadingSkeleton} />
        <span>설정 자료 편집기를 준비하는 중입니다.</span>
      </div>
    );
  }

  if (failed || !matchesMenu || (isEdit && !entry)) {
    return (
      <div className={styles.state} role="alert">
        <p>현재 분류에서 편집할 설정 자료를 불러오지 못했습니다.</p>
        <Button as={Link} size="small" to={settingListPath(workId, route.menuItemId)} variant="secondary">
          목록으로 돌아가기
        </Button>
      </div>
    );
  }

  return (
    <SettingEditorForm
      candidates={candidatesQuery.data ?? []}
      categories={categoriesQuery.data ?? []}
      connected={connectedQuery.data ?? []}
      entry={entry}
      key={`${entry?.id ?? "new"}:${entry?.version ?? 0}`}
      menuItem={menuItem}
      relationRepository={relations}
      repository={repository}
      route={route}
    />
  );
}

export default SettingEditorPage;
