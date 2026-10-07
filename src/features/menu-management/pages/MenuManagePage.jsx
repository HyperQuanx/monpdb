import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArchiveRestore, GripVertical, Plus } from "lucide-react";
import {
  menuQueryKeys,
  menuRepository,
} from "../../../data/repositories/appRepositories";
import { Button, Card, EmptyState, Input, Skeleton } from "../../../shared/ui";
import {
  SETTING_FIELDS,
  enabledSettingFields,
} from "../../settings/settings";
import styles from "./MenuManagePage.module.css";

const emptyNewItem = () => ({
  label: "",
  slug: "",
  resourceType: "",
  fields: SETTING_FIELDS.map(([key]) => key),
});

// A section's items share one resource type; empty custom sections choose one.
const sectionResourceType = (section) => {
  const types = new Set((section?.items ?? []).map(({ resourceType }) => resourceType));
  return types.size === 1 ? [...types][0] : "";
};

function SettingFieldsFieldset({ legend, value, onChange }) {
  return (
    <fieldset className={styles.fieldset}>
      <legend>{legend}</legend>
      {SETTING_FIELDS.map(([key, label]) => (
        <label className={styles.checkboxLabel} key={key}>
          <input
            aria-label={`${legend}: ${label}`}
            checked={value.includes(key)}
            type="checkbox"
            onChange={(event) =>
              onChange(
                event.target.checked
                  ? SETTING_FIELDS.map(([fieldKey]) => fieldKey).filter(
                      (fieldKey) => fieldKey === key || value.includes(fieldKey),
                    )
                  : value.filter((fieldKey) => fieldKey !== key),
              )
            }
          />
          <span>{label}</span>
        </label>
      ))}
    </fieldset>
  );
}

const resourceTypeOptions = [
  ["generic", "범용"],
  ["character", "캐릭터"],
  ["world", "세계관"],
  ["plot", "플롯"],
  ["setting", "설정 자료"],
  ["idea", "아이디어"],
  ["memo", "메모"],
];

const moveId = (items, itemId, direction) => {
  const ids = items.map(({ id }) => id);
  const currentIndex = ids.indexOf(itemId);
  const targetIndex = currentIndex + direction;
  if (currentIndex < 0 || targetIndex < 0 || targetIndex >= ids.length) {
    return null;
  }
  const [moved] = ids.splice(currentIndex, 1);
  ids.splice(targetIndex, 0, moved);
  return ids;
};

const reorderAtTarget = (items, draggedId, targetId) => {
  const ids = items.map(({ id }) => id);
  const from = ids.indexOf(draggedId);
  const to = ids.indexOf(targetId);
  if (from < 0 || to < 0 || from === to) {
    return null;
  }
  const [moved] = ids.splice(from, 1);
  ids.splice(to, 0, moved);
  return ids;
};

function MenuManagePage({ repository = menuRepository }) {
  const queryClient = useQueryClient();
  const [selectedSectionId, setSelectedSectionId] = useState("characters");
  const [newSectionLabel, setNewSectionLabel] = useState("");
  const [sectionDraft, setSectionDraft] = useState(null);
  const [itemDraft, setItemDraft] = useState(null);
  const [newItem, setNewItem] = useState(emptyNewItem);
  const [dragged, setDragged] = useState(null);
  const [announcement, setAnnouncement] = useState("");

  const menuQuery = useQuery({
    networkMode: "always",
    queryKey: [...menuQueryKeys.all(), "manage"],
    queryFn: () => repository.listTree({ includeArchived: true }),
  });

  const mutation = useMutation({
    networkMode: "always",
    mutationFn: ({ args, method }) => repository[method](...args),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: menuQueryKeys.all() });
    },
  });

  const tree = menuQuery.data ?? [];
  const activeSections = tree.filter(({ archivedAt }) => !archivedAt);
  const archivedSections = tree.filter(({ archivedAt }) => archivedAt);
  const selectedSection =
    activeSections.find(({ id }) => id === selectedSectionId) ??
    activeSections[0];
  const activeItems = (selectedSection?.items ?? []).filter(
    ({ archivedAt }) => !archivedAt,
  );
  const selectedSectionType = sectionResourceType(selectedSection);
  const newItemType = selectedSectionType || newItem.resourceType || "generic";
  const resourceTypeLabels = new Map(resourceTypeOptions);
  const archivedItems = tree.flatMap((section) =>
    section.items
      .filter(({ archivedAt }) => archivedAt)
      .map((item) => ({ ...item, sectionLabel: section.label })),
  );

  const runMutation = (method, args, message) => {
    mutation.mutate(
      { method, args },
      { onSuccess: () => message && setAnnouncement(message) },
    );
  };

  const handleMoveSection = (sectionId, direction) => {
    const ids = moveId(activeSections, sectionId, direction);
    if (ids) {
      runMutation("reorderSections", [ids], "섹션 순서를 변경했습니다.");
    }
  };

  const handleMoveItem = (itemId, direction) => {
    const ids = moveId(activeItems, itemId, direction);
    if (ids) {
      runMutation(
        "reorderItems",
        [selectedSection.id, ids],
        "메뉴 순서를 변경했습니다.",
      );
    }
  };

  const handleDrop = (type, targetId, items) => {
    if (dragged?.type !== type) {
      return;
    }
    const ids = reorderAtTarget(items, dragged.id, targetId);
    setDragged(null);
    if (!ids) {
      return;
    }
    if (type === "section") {
      runMutation("reorderSections", [ids], "섹션을 이동했습니다.");
    } else {
      runMutation(
        "reorderItems",
        [selectedSection.id, ids],
        "메뉴를 이동했습니다.",
      );
    }
  };

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Global menu template</p>
          <h2>메뉴 관리</h2>
          <p>변경한 구조는 모든 작품에 공통으로 즉시 적용됩니다.</p>
        </div>
        <Button as={Link} to="/" variant="secondary">
          작품 선택
        </Button>
      </header>

      <Card
        as="form"
        className={styles.createSection}
        onSubmit={(event) => {
          event.preventDefault();
          runMutation(
            "createSection",
            [{ label: newSectionLabel }],
            "새 섹션을 추가했습니다.",
          );
          setNewSectionLabel("");
        }}
      >
        <label>
          <span>새 섹션 이름</span>
          <Input
            required
            value={newSectionLabel}
            onChange={(event) => setNewSectionLabel(event.target.value)}
          />
        </label>
        <Button disabled={!newSectionLabel.trim()} type="submit">
          <Plus aria-hidden="true" size={18} /> 섹션 추가
        </Button>
      </Card>

      {menuQuery.isLoading ? (
        <div className={styles.loading} role="status">
          <Skeleton className={styles.loadingLine} />
          메뉴를 불러오는 중입니다.
        </div>
      ) : null}

      {menuQuery.isError ? (
        <p className={styles.error} role="alert">
          메뉴를 불러오지 못했습니다.
        </p>
      ) : null}

      {!menuQuery.isLoading && !menuQuery.isError ? (
        <div className={styles.workspace}>
          <section aria-label="사용 중인 섹션" className={styles.sectionPanel}>
            <h3>섹션</h3>
            <div className={styles.rows}>
              {activeSections.map((section, index) => (
                <Card
                  as="article"
                  className={styles.row}
                  data-section-id={section.id}
                  draggable
                  key={section.id}
                  onDragOver={(event) => event.preventDefault()}
                  onDragStart={() =>
                    setDragged({ id: section.id, type: "section" })
                  }
                  onDrop={() => handleDrop("section", section.id, activeSections)}
                >
                  <GripVertical aria-hidden="true" size={18} />
                  <button
                    aria-label={`${section.label} 섹션 선택`}
                    className={styles.selectButton}
                    type="button"
                    onClick={() => setSelectedSectionId(section.id)}
                  >
                    {section.label}
                  </button>
                  <RowActions
                    canMoveDown={index < activeSections.length - 1}
                    canMoveUp={index > 0}
                    label={section.label}
                    type="섹션"
                    onArchive={() =>
                      runMutation(
                        "archiveSection",
                        [section.id],
                        `${section.label} 섹션을 보관했습니다.`,
                      )
                    }
                    onEdit={() =>
                      setSectionDraft({
                        id: section.id,
                        icon: section.icon,
                        label: section.label,
                      })
                    }
                    onMoveDown={() => handleMoveSection(section.id, 1)}
                    onMoveUp={() => handleMoveSection(section.id, -1)}
                  />
                </Card>
              ))}
            </div>
          </section>

          <section aria-label="선택한 섹션의 메뉴" className={styles.itemPanel}>
            <h3>{selectedSection?.label ?? "메뉴"}</h3>

            {sectionDraft?.id === selectedSection?.id ? (
              <EditorForm
                label="섹션 이름"
                submitLabel="섹션 변경 저장"
                value={sectionDraft.label}
                onCancel={() => setSectionDraft(null)}
                onChange={(label) =>
                  setSectionDraft((current) => ({ ...current, label }))
                }
                onSubmit={() => {
                  runMutation("updateSection", [sectionDraft.id, sectionDraft]);
                  setSectionDraft(null);
                }}
              />
            ) : null}

            {selectedSection ? (
              <Card
                as="form"
                className={styles.itemCreate}
                onSubmit={(event) => {
                  event.preventDefault();
                  runMutation(
                    "createItem",
                    [
                      selectedSection.id,
                      {
                        label: newItem.label,
                        slug: newItem.slug,
                        resourceType: newItemType,
                        ...(newItemType === "setting"
                          ? { filterConfig: { fields: newItem.fields } }
                          : {}),
                      },
                    ],
                    "새 메뉴를 추가했습니다.",
                  );
                  setNewItem(emptyNewItem());
                }}
              >
                <label>
                  <span>새 메뉴 이름</span>
                  <Input
                    required
                    value={newItem.label}
                    onChange={(event) =>
                      setNewItem((current) => ({
                        ...current,
                        label: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  <span>새 메뉴 슬러그</span>
                  <Input
                    pattern="[a-z0-9-]+"
                    required
                    value={newItem.slug}
                    onChange={(event) =>
                      setNewItem((current) => ({
                        ...current,
                        slug: event.target.value,
                      }))
                    }
                  />
                </label>
                {selectedSectionType ? (
                  <p className={styles.typeNote}>
                    메뉴 유형: {resourceTypeLabels.get(selectedSectionType) ?? selectedSectionType} (섹션 기본)
                  </p>
                ) : (
                  <label>
                    <span>메뉴 유형</span>
                    <select
                      value={newItemType}
                      onChange={(event) =>
                        setNewItem((current) => ({
                          ...current,
                          resourceType: event.target.value,
                        }))
                      }
                    >
                      {resourceTypeOptions.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {newItemType === "setting" ? (
                  <SettingFieldsFieldset
                    legend="새 메뉴에 표시할 필드"
                    value={newItem.fields}
                    onChange={(fields) =>
                      setNewItem((current) => ({ ...current, fields }))
                    }
                  />
                ) : null}
                <Button type="submit">메뉴 추가</Button>
              </Card>
            ) : null}

            {itemDraft ? (
              <EditorForm
                extra={
                  itemDraft.resourceType === "setting" &&
                  itemDraft.filterConfig?.scope === "category" ? (
                    <SettingFieldsFieldset
                      legend="이 메뉴에 표시할 필드"
                      value={enabledSettingFields(itemDraft)}
                      onChange={(fields) =>
                        setItemDraft((current) => ({
                          ...current,
                          filterConfig: { ...current.filterConfig, fields },
                        }))
                      }
                    />
                  ) : null
                }
                label="메뉴 이름"
                secondaryLabel="메뉴 슬러그"
                secondaryValue={itemDraft.slug}
                submitLabel="메뉴 변경 저장"
                value={itemDraft.label}
                onCancel={() => setItemDraft(null)}
                onChange={(label) =>
                  setItemDraft((current) => ({ ...current, label }))
                }
                onSecondaryChange={(slug) =>
                  setItemDraft((current) => ({ ...current, slug }))
                }
                onSubmit={() => {
                  runMutation("updateItem", [itemDraft.id, itemDraft]);
                  setItemDraft(null);
                }}
              />
            ) : null}

            <div className={styles.rows}>
              {activeItems.map((item, index) => (
                <Card
                  as="article"
                  className={styles.row}
                  data-menu-item-id={item.id}
                  draggable
                  key={item.id}
                  onDragOver={(event) => event.preventDefault()}
                  onDragStart={() => setDragged({ id: item.id, type: "item" })}
                  onDrop={() => handleDrop("item", item.id, activeItems)}
                >
                  <GripVertical aria-hidden="true" size={18} />
                  <div className={styles.itemName}>
                    <strong>{item.label}</strong>
                    <span>{item.id}</span>
                  </div>
                  <RowActions
                    canMoveDown={index < activeItems.length - 1}
                    canMoveUp={index > 0}
                    label={item.label}
                    type="메뉴"
                    onArchive={() =>
                      runMutation(
                        "archiveItem",
                        [item.id],
                        `${item.label} 메뉴를 보관했습니다.`,
                      )
                    }
                    onEdit={() => setItemDraft(item)}
                    onMoveDown={() => handleMoveItem(item.id, 1)}
                    onMoveUp={() => handleMoveItem(item.id, -1)}
                  />
                </Card>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      <section aria-label="보관된 섹션" className={styles.archivePanel}>
        <h3>보관된 섹션</h3>
        {archivedSections.map((section) => (
          <ArchiveRow
            key={section.id}
            label={section.label}
            onRestore={() =>
              runMutation("restoreSection", [section.id], "섹션을 복구했습니다.")
            }
          />
        ))}
      </section>

      <section aria-label="보관된 메뉴" className={styles.archivePanel}>
        <h3>보관된 메뉴</h3>
        {archivedItems.length === 0 ? (
          <EmptyState
            description="보관한 메뉴가 없습니다."
            headingLevel={4}
            icon={<ArchiveRestore size={22} />}
            title="메뉴 보관함이 비어 있습니다"
          />
        ) : (
          archivedItems.map((item) => (
            <ArchiveRow
              key={item.id}
              label={item.label}
              meta={item.sectionLabel}
              onRestore={() =>
                runMutation("restoreItem", [item.id], "메뉴를 복구했습니다.")
              }
            />
          ))
        )}
      </section>

      {mutation.isError ? (
        <p className={styles.error} role="alert">
          {mutation.error.message}
        </p>
      ) : null}
      <p aria-live="polite" className={styles.announcement}>
        {announcement}
      </p>
    </section>
  );
}

function RowActions({
  canMoveDown,
  canMoveUp,
  label,
  onArchive,
  onEdit,
  onMoveDown,
  onMoveUp,
  type,
}) {
  return (
    <div className={styles.rowActions}>
      <Button
        aria-label={`${label} 위로 이동`}
        disabled={!canMoveUp}
        size="small"
        variant="ghost"
        onClick={onMoveUp}
      >
        ↑
      </Button>
      <Button
        aria-label={`${label} 아래로 이동`}
        disabled={!canMoveDown}
        size="small"
        variant="ghost"
        onClick={onMoveDown}
      >
        ↓
      </Button>
      <Button
        aria-label={`${label} ${type} 수정`}
        size="small"
        variant="secondary"
        onClick={onEdit}
      >
        수정
      </Button>
      <Button
        aria-label={`${label} ${type} 보관`}
        size="small"
        variant="ghost"
        onClick={onArchive}
      >
        보관
      </Button>
    </div>
  );
}

function EditorForm({
  extra = null,
  label,
  onCancel,
  onChange,
  onSecondaryChange,
  onSubmit,
  secondaryLabel,
  secondaryValue,
  submitLabel,
  value,
}) {
  return (
    <Card
      as="form"
      className={styles.editor}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <label>
        <span>{label}</span>
        <Input required value={value} onChange={(event) => onChange(event.target.value)} />
      </label>
      {secondaryLabel ? (
        <label>
          <span>{secondaryLabel}</span>
          <Input
            required
            value={secondaryValue}
            onChange={(event) => onSecondaryChange(event.target.value)}
          />
        </label>
      ) : null}
      {extra}
      <div className={styles.editorActions}>
        <Button type="button" variant="secondary" onClick={onCancel}>
          취소
        </Button>
        <Button type="submit">{submitLabel}</Button>
      </div>
    </Card>
  );
}

function ArchiveRow({ label, meta, onRestore }) {
  return (
    <Card as="article" className={styles.archiveRow}>
      <div>
        <strong>{label}</strong>
        {meta ? <span>{meta}</span> : null}
      </div>
      <Button
        aria-label={`${label} 메뉴 복구`}
        size="small"
        variant="secondary"
        onClick={onRestore}
      >
        복구
      </Button>
    </Card>
  );
}

export default MenuManagePage;
