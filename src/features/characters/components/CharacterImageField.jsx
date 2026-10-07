import { useEffect, useState } from "react";
import { MAX_CHARACTER_IMAGE_SIZE_BYTES } from "../../../data/repositories/fixtureCharacterRepository";
import CharacterPortrait from "./CharacterPortrait";
import styles from "../pages/CharacterEditorPage.module.css";

function CharacterImageField({
  character,
  error,
  file,
  onError,
  onFileChange,
  onImageUrlChange,
}) {
  const [previewUrl, setPreviewUrl] = useState("");

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  const handleFile = (nextFile) => {
    if (!nextFile) return;
    if (!nextFile.type.toLocaleLowerCase().startsWith("image/")) {
      onFileChange(null);
      setPreviewUrl("");
      onError("이미지 형식의 파일을 선택해 주세요.");
      return;
    }
    if (nextFile.size > MAX_CHARACTER_IMAGE_SIZE_BYTES) {
      onFileChange(null);
      setPreviewUrl("");
      onError("이미지 파일은 5MB 이하여야 합니다.");
      return;
    }

    try {
      const nextUrl = URL.createObjectURL(nextFile);
      onError("");
      onFileChange(nextFile);
      setPreviewUrl(nextUrl);
    } catch {
      onFileChange(null);
      setPreviewUrl("");
      onError("이미지 미리보기를 만들지 못했습니다.");
    }
  };

  const clearImage = () => {
    onFileChange(null);
    setPreviewUrl("");
    onImageUrlChange("");
    onError("");
  };

  return (
    <section aria-label="초상 이미지" className={styles.imageSection}>
      <div className={styles.imagePreview}>
        <CharacterPortrait
          alt={`${character.name || "캐릭터"} 초상 미리보기`}
          character={character}
          previewUrl={previewUrl}
        />
      </div>
      <div className={styles.imageControls}>
        <label className={styles.fileButton}>
          <input
            accept="image/*"
            aria-label="초상 이미지 파일"
            type="file"
            onChange={(event) => handleFile(event.target.files?.[0])}
          />
          <span>사진 선택</span>
        </label>
        <button type="button" onClick={clearImage}>
          이미지 비우기
        </button>
      </div>
      <label className={styles.field} htmlFor="imageUrl">
        <span>이미지 URL</span>
        <input
          id="imageUrl"
          type="url"
          value={character.imageUrl}
          onChange={(event) => onImageUrlChange(event.target.value)}
        />
        {file ? <small>선택한 파일이 이미지 URL보다 우선 저장됩니다.</small> : null}
      </label>
      {error ? (
        <p className={styles.fieldError} role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}

export default CharacterImageField;
