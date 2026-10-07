import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Upload } from "lucide-react";
import {
  COLLECTION_LABELS,
  parseWorkBackup,
} from "../../../data/backup/workBackup";
import { backupService } from "../../../data/repositories/appRepositories";
import { Button } from "../../../shared/ui";
import styles from "../../exploration/pages/ExplorationPages.module.css";

const downloadJson = (fileName, data) => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const errorDetails = (error) => ({ details: error.details ?? [], message: error.message });

function BackupPage({ service = backupService, download = downloadJson }) {
  const { workId } = useParams();
  const queryClient = useQueryClient();
  const [exportInfo, setExportInfo] = useState(null);
  const [file, setFile] = useState(null);
  const [mode, setMode] = useState("merge");
  const [conflict, setConflict] = useState("keep");
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [result, setResult] = useState(null);
  const loadQuery = useQuery({
    queryKey: ["backup", workId],
    enabled: Boolean(service.load),
    networkMode: "always",
    queryFn: async () => { await service.load(workId); return true; },
    retry: false,
  });

  const preview = useMemo(() => {
    if (service.load && !loadQuery.dataUpdatedAt) return null;
    if (!file?.backup) return null;
    try {
      return { summary: service.preview(file.backup, workId, { conflict, mode }) };
    } catch (error) {
      return { error: errorDetails(error) };
    }
  }, [conflict, file, mode, service, workId, loadQuery.dataUpdatedAt]);

  const handleExport = async () => {
    let backup;
    try { backup = await service.exportWork(workId); }
    catch (error) { setResult({ error: errorDetails(error) }); return; }
    const date = backup.exportedAt.slice(0, 10);
    download(`monp-${backup.work.slug ?? workId}-${date}.json`, backup);
    setExportInfo({
      counts: Object.values(backup.data).reduce((sum, items) => sum + items.length, 0),
      omitted: backup.images.filter(({ status }) => status === "omitted-upload").length,
    });
  };

  const handleFile = async (event) => {
    const selected = event.target.files?.[0];
    setResult(null);
    setConfirmReplace(false);
    if (!selected) return setFile(null);
    const text = await selected.text();
    try {
      setFile({ backup: parseWorkBackup(text), name: selected.name });
    } catch (error) {
      setFile({ error: errorDetails(error), name: selected.name });
    }
  };

  const handleImport = async () => {
    try {
      const summary = await service.importWork(file.backup, workId, { conflict, mode });
      await queryClient.invalidateQueries();
      setResult({ added: summary.reduce((sum, { added }) => sum + added, 0) });
      setFile(null);
    } catch (error) {
      setResult({ error: errorDetails(error) });
    }
  };

  const error = file?.error ?? preview?.error ?? result?.error ?? (loadQuery.error ? errorDetails(loadQuery.error) : null);
  const canImport = Boolean(preview?.summary) && (mode !== "replace" || confirmReplace);

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <span className={styles.eyebrow}>Backup</span>
        <h2 className={styles.title}>백업과 가져오기</h2>
        <p className={styles.lead}>
          현재 작품을 JSON 파일로 내보내거나 백업 파일에서 가져옵니다. 업로드한 이미지 파일은 백업에 포함하지 않고 목록만 남깁니다.
        </p>
      </header>

      <section aria-labelledby="backup-export" className={styles.section}>
        <h3 id="backup-export">내보내기</h3>
        <div className={styles.resultActions}>
          <Button disabled={Boolean(service.load) && loadQuery.isPending} onClick={handleExport}>
            <Download aria-hidden="true" size={17} />
            JSON으로 내보내기
          </Button>
        </div>
        {exportInfo ? (
          <p aria-live="polite" className={styles.status} role="status">
            항목 {exportInfo.counts}개를 내보냈습니다.
            {exportInfo.omitted > 0 ? ` 업로드 이미지 ${exportInfo.omitted}개는 포함하지 않았습니다.` : ""}
          </p>
        ) : null}
      </section>

      <section aria-labelledby="backup-import" className={styles.section}>
        <h3 id="backup-import">가져오기</h3>
        <label className={styles.filterField}>
          <span>백업 파일 선택</span>
          <input accept="application/json,.json" aria-label="백업 파일 선택" type="file" onChange={handleFile} />
        </label>

        {file?.backup ? (
          <>
            <p className={styles.status}>
              {file.name} · {file.backup.work.title} · v{file.backup.version} · {file.backup.exportedAt}
            </p>
            <fieldset className={styles.filters}>
              <legend>가져오기 방식</legend>
              <label className={styles.checkboxField}>
                <input checked={mode === "merge"} name="backup-mode" type="radio" onChange={() => setMode("merge")} />
                <span>병합 (현재 데이터 유지)</span>
              </label>
              <label className={styles.checkboxField}>
                <input checked={mode === "replace"} name="backup-mode" type="radio" onChange={() => setMode("replace")} />
                <span>교체 (백업 내용으로 바꾸기)</span>
              </label>
            </fieldset>
            {mode === "merge" ? (
              <fieldset className={styles.filters}>
                <legend>같은 항목이 다를 때</legend>
                <label className={styles.checkboxField}>
                  <input checked={conflict === "keep"} name="backup-conflict" type="radio" onChange={() => setConflict("keep")} />
                  <span>현재 내용 유지</span>
                </label>
                <label className={styles.checkboxField}>
                  <input checked={conflict === "overwrite"} name="backup-conflict" type="radio" onChange={() => setConflict("overwrite")} />
                  <span>백업으로 덮어쓰기</span>
                </label>
              </fieldset>
            ) : (
              <label className={styles.checkboxField}>
                <input checked={confirmReplace} type="checkbox" onChange={(event) => setConfirmReplace(event.target.checked)} />
                <span>현재 작품의 데이터를 백업 내용으로 교체합니다</span>
              </label>
            )}
          </>
        ) : null}

        {preview?.summary ? (
          <table aria-label="가져오기 미리보기">
            <thead>
              <tr><th scope="col">항목</th><th scope="col">백업</th><th scope="col">추가</th><th scope="col">충돌</th><th scope="col">삭제</th></tr>
            </thead>
            <tbody>
              {preview.summary.map((row) => (
                <tr key={row.collection}>
                  <th scope="row">{COLLECTION_LABELS.get(row.collection)}</th>
                  <td>{row.total}</td><td>{row.added}</td><td>{row.conflicts}</td><td>{row.removed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}

        {error ? (
          <div className={styles.error} role="alert">
            <p>{error.message}</p>
            {error.details.length > 0 ? (
              <ul aria-label="문제 목록">{error.details.map((detail) => <li key={detail}>{detail}</li>)}</ul>
            ) : null}
          </div>
        ) : null}

        {file?.backup ? (
          <div className={styles.resultActions}>
            <Button disabled={!canImport} onClick={handleImport}>
              <Upload aria-hidden="true" size={17} />
              가져오기 실행
            </Button>
          </div>
        ) : null}
        {result && !result.error ? (
          <p aria-live="polite" className={styles.status} role="status">가져오기를 완료했습니다. 새 항목 {result.added}개.</p>
        ) : null}
      </section>
    </section>
  );
}

export default BackupPage;
