import { useMemo, useState } from "react";
import { getCharacterCoverImage } from "../characters";
import styles from "./CharacterPortrait.module.css";
import { isHttpMode } from "../../../data/http/config";
import { useOnline } from "../../../data/http/connectivity";

function CharacterPortrait({
  alt,
  character,
  className,
  previewUrl = "",
}) {
  const online = useOnline();
  const fallbackUrl = useMemo(
    () => getCharacterCoverImage({ ...character, imageUrl: "" }),
    [character],
  );
  const preferredUrl = previewUrl || character?.imageUrl || fallbackUrl;
  const [failedUrl, setFailedUrl] = useState("");
  const usesFallback = failedUrl === preferredUrl && preferredUrl !== fallbackUrl;
  if (isHttpMode && !online) return <span className={className} role="img" aria-label={`${character?.name || "캐릭터"} · 오프라인 이미지 표시 안 함`}>이미지</span>;

  return (
    <>
      <img
        alt={alt ?? `${character?.name || "캐릭터"} 초상`}
        className={className}
        src={usesFallback ? fallbackUrl : preferredUrl}
        onError={() => {
          if (!usesFallback && preferredUrl !== fallbackUrl) {
            setFailedUrl(preferredUrl);
          }
        }}
      />
      {usesFallback ? (
        <span className={styles.status} role="status">
          초상 이미지를 불러오지 못해 기본 이미지를 표시합니다.
        </span>
      ) : null}
    </>
  );
}

export default CharacterPortrait;
