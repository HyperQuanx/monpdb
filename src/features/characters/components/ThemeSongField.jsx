import { useRef, useState } from "react";
import { Music, Trash2, Upload, Video } from "lucide-react";
import CustomAudioPlayer from "../../../shared/media/CustomAudioPlayer";
import {
  getYouTubeVideoId,
  isAudioSource,
  readFileAsDataUrl,
} from "../../../shared/media/mediaUtils";
import styles from "./ThemeSongField.module.css";

const MAX_AUDIO_SIZE_BYTES = 15 * 1024 * 1024; // 15MB

export default function ThemeSongField({ value, onChange }) {
  const fileInputRef = useRef(null);
  const [fileName, setFileName] = useState("");
  const [fileError, setFileError] = useState("");

  const trimmed = (value || "").trim();
  const isAudio = isAudioSource(trimmed);
  const youtubeId = getYouTubeVideoId(trimmed);

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_AUDIO_SIZE_BYTES) {
      setFileError("음악 파일 크기는 15MB 이하만 가능합니다.");
      return;
    }

    setFileError("");
    setFileName(file.name);

    try {
      const dataUrl = await readFileAsDataUrl(file);
      onChange("themeSong", dataUrl);
    } catch {
      setFileError("음악 파일을 읽는 중 오류가 발생했습니다.");
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleClear = () => {
    setFileName("");
    setFileError("");
    onChange("themeSong", "");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className={styles.container}>
      <label className={styles.label} htmlFor="themeSong">
        테마곡
      </label>

      <div className={styles.inputRow}>
        <input
          aria-label="테마곡"
          className={styles.textInput}
          disabled={isAudio && trimmed.startsWith("data:audio/")}
          id="themeSong"
          placeholder={
            isAudio && trimmed.startsWith("data:audio/")
              ? "음악 파일이 업로드되어 있습니다"
              : "유튜브 링크, 오디오 링크, 또는 곡 제목"
          }
          value={
            isAudio && trimmed.startsWith("data:audio/")
              ? fileName || "업로드된 음악 파일"
              : value || ""
          }
          onChange={(event) => {
            setFileName("");
            setFileError("");
            onChange("themeSong", event.target.value);
          }}
        />

        <input
          accept="audio/*,.mp3,.wav,.ogg,.m4a,.flac,.aac"
          className={styles.hiddenFileInput}
          id="themeSongFileInput"
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
        />

        <label
          className={styles.uploadButton}
          htmlFor="themeSongFileInput"
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              fileInputRef.current?.click();
            }
          }}
        >
          <Upload aria-hidden="true" size={15} />
          <span>음악 업로드</span>
        </label>

        {trimmed ? (
          <button
            aria-label="테마곡 삭제"
            className={styles.clearButton}
            title="테마곡 내용 삭제"
            type="button"
            onClick={handleClear}
          >
            <Trash2 aria-hidden="true" size={15} />
          </button>
        ) : null}
      </div>

      {fileError ? <p className={styles.errorText}>{fileError}</p> : null}

      {isAudio ? (
        <div className={styles.previewBox}>
          <div className={styles.previewHeader}>
            <Music aria-hidden="true" size={14} />
            <span>오디오 미리듣기</span>
          </div>
          <CustomAudioPlayer
            key={trimmed}
            src={trimmed}
            title={fileName || "업로드된 테마곡"}
          />
        </div>
      ) : null}

      {youtubeId ? (
        <div className={styles.youtubeNotice}>
          <Video aria-hidden="true" className={styles.youtubeIcon} size={16} />
          <span>유튜브 영상이 감지되었습니다 (상세 페이지에서 플레이어로 표시됩니다)</span>
        </div>
      ) : null}
    </div>
  );
}
