import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArchiveRestore, BookPlus, Pencil, RotateCcw } from "lucide-react";
import {
  workQueryKeys,
  workRepository,
} from "../../../data/repositories/appRepositories";
import { Button, Card, EmptyState, Input, Skeleton } from "../../../shared/ui";
import styles from "./WorkManagePage.module.css";

const initialDraft = {
  title: "",
  subtitle: "",
  cover: "",
  summary: "",
  genre: "",
  status: "planning",
  accentColor: "#55565e",
};

const statusLabels = {
  planning: "기획 중",
  writing: "집필 중",
  paused: "일시 중지",
  completed: "완결",
};

function WorkManagePage({ repository = workRepository }) {
  const queryClient = useQueryClient();
  const [editingWorkId, setEditingWorkId] = useState(null);
  const [draft, setDraft] = useState(initialDraft);
  const worksQuery = useQuery({
    networkMode: "always",
    queryKey: workQueryKeys.list(true),
    queryFn: () => repository.list({ includeArchived: true }),
  });

  const refreshWorks = (work) => {
    queryClient.setQueryData(workQueryKeys.detail(work.id), work);
    queryClient.invalidateQueries({ queryKey: workQueryKeys.lists() });
  };

  const saveMutation = useMutation({
    networkMode: "always",
    mutationFn: () =>
      editingWorkId
        ? repository.update(editingWorkId, draft)
        : repository.create({ ...draft, slug: `work-${crypto.randomUUID()}` }),
    onSuccess: (work) => {
      refreshWorks(work);
      setEditingWorkId(null);
      setDraft(initialDraft);
    },
  });

  const archiveMutation = useMutation({
    networkMode: "always",
    mutationFn: (workId) => repository.archive(workId),
    onSuccess: (work) => {
      refreshWorks(work);
      const selectedWork = queryClient.getQueryData(workQueryKeys.selected());
      if (selectedWork?.id === work.id) {
        queryClient.removeQueries({
          exact: true,
          queryKey: workQueryKeys.selected(),
        });
      }
    },
  });

  const restoreMutation = useMutation({
    networkMode: "always",
    mutationFn: (workId) => repository.restore(workId),
    onSuccess: refreshWorks,
  });

  const works = worksQuery.data ?? [];
  const activeWorks = works.filter(({ archivedAt }) => !archivedAt);
  const archivedWorks = works.filter(({ archivedAt }) => archivedAt);

  const handleDraftChange = (key, value) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const handleEdit = (work) => {
    setEditingWorkId(work.id);
    setDraft({
      title: work.title,
      slug: work.slug,
      subtitle: work.subtitle,
      cover: work.cover,
      summary: work.summary,
      genre: work.genre,
      status: work.status,
      accentColor: work.accentColor,
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    saveMutation.mutate();
  };

  const handleReset = () => {
    setEditingWorkId(null);
    setDraft(initialDraft);
    saveMutation.reset();
  };

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Library settings</p>
          <h2>작품 관리</h2>
          <p>작품은 이 세션에서만 변경되며 새로고침하면 초기화됩니다.</p>
        </div>
        <Button as={Link} to="/" variant="secondary">
          선택 화면
        </Button>
      </header>

      <Card as="form" className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.formHeader}>
          <BookPlus aria-hidden="true" size={22} />
          <h3>{editingWorkId ? "작품 수정" : "새 작품 추가"}</h3>
        </div>

        <div className={styles.fields}>
          <label>
            <span>작품명</span>
            <Input
              required
              value={draft.title}
              onChange={(event) => handleDraftChange("title", event.target.value)}
            />
          </label>
          <label>
            <span>부제</span>
            <Input
              value={draft.subtitle}
              onChange={(event) => handleDraftChange("subtitle", event.target.value)}
            />
          </label>
          <label>
            <span>장르</span>
            <Input
              value={draft.genre}
              onChange={(event) => handleDraftChange("genre", event.target.value)}
            />
          </label>
          <label>
            <span>진행 상태</span>
            <select
              value={draft.status}
              onChange={(event) => handleDraftChange("status", event.target.value)}
            >
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>강조 색상</span>
            <input
              type="color"
              value={draft.accentColor}
              onChange={(event) =>
                handleDraftChange("accentColor", event.target.value)
              }
            />
          </label>
          <label className={styles.fullField}>
            <span>표지 이미지 URL</span>
            <Input
              value={draft.cover}
              onChange={(event) => handleDraftChange("cover", event.target.value)}
            />
          </label>
          <label className={styles.fullField}>
            <span>작품 소개</span>
            <textarea
              rows={4}
              value={draft.summary}
              onChange={(event) => handleDraftChange("summary", event.target.value)}
            />
          </label>
        </div>

        {saveMutation.isError ? (
          <p className={styles.error} role="alert">
            {saveMutation.error.message}
          </p>
        ) : null}

        <div className={styles.formActions}>
          {editingWorkId ? (
            <Button type="button" variant="secondary" onClick={handleReset}>
              취소
            </Button>
          ) : null}
          <Button
            disabled={saveMutation.isPending || !draft.title.trim()}
            type="submit"
          >
            {editingWorkId ? "변경 저장" : "작품 추가"}
          </Button>
        </div>
      </Card>

      {worksQuery.isLoading ? (
        <div aria-live="polite" className={styles.loading} role="status">
          <Skeleton className={styles.loadingLine} />
          <span>작품을 불러오는 중입니다.</span>
        </div>
      ) : null}

      {worksQuery.isError ? (
        <p className={styles.error} role="alert">
          작품을 불러오지 못했습니다.
        </p>
      ) : null}

      {!worksQuery.isLoading && !worksQuery.isError ? (
        <>
          <WorkGroup
            actionLabel="보관"
            icon={<Pencil size={18} />}
            title="사용 중인 작품"
            works={activeWorks}
            onArchive={(workId) => archiveMutation.mutate(workId)}
            onEdit={handleEdit}
          />
          <WorkGroup
            archived
            actionLabel="복구"
            icon={<ArchiveRestore size={18} />}
            title="보관된 작품"
            works={archivedWorks}
            onRestore={(workId) => restoreMutation.mutate(workId)}
          />
        </>
      ) : null}
    </section>
  );
}

function WorkGroup({ archived = false, title, works, onArchive, onEdit, onRestore }) {
  return (
    <section aria-label={title} className={styles.group}>
      <div className={styles.groupHeader}>
        <h3>{title}</h3>
        <span>{works.length}</span>
      </div>

      {works.length === 0 ? (
        <EmptyState
          className={styles.groupEmpty}
          description={
            archived
              ? "보관한 작품이 없습니다."
              : "새 작품을 추가하면 여기에 표시됩니다."
          }
          headingLevel={4}
          icon={archived ? <RotateCcw size={22} /> : <BookPlus size={22} />}
          title={archived ? "보관함이 비어 있습니다" : "사용 중인 작품이 없습니다"}
        />
      ) : (
        <div className={styles.workList}>
          {works.map((work) => (
            <Card as="article" className={styles.workCard} key={work.id}>
              <span
                aria-hidden="true"
                className={styles.accent}
                style={{ backgroundColor: work.accentColor }}
              />
              <div className={styles.workInfo}>
                <h4>{work.title}</h4>
                <p>{work.subtitle || work.genre || "설명 없음"}</p>
              </div>
              <div className={styles.workActions}>
                {archived ? (
                  <Button
                    aria-label={`${work.title} 복구`}
                    size="small"
                    variant="secondary"
                    onClick={() => onRestore(work.id)}
                  >
                    복구
                  </Button>
                ) : (
                  <>
                    <Button
                      aria-label={`${work.title} 수정`}
                      size="small"
                      variant="secondary"
                      onClick={() => onEdit(work)}
                    >
                      수정
                    </Button>
                    <Button
                      aria-label={`${work.title} 보관`}
                      size="small"
                      variant="ghost"
                      onClick={() => onArchive(work.id)}
                    >
                      보관
                    </Button>
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

export default WorkManagePage;
