import { ExternalLink, Video } from "lucide-react";
import CustomAudioPlayer from "./CustomAudioPlayer";
import { getYouTubeVideoId, isAudioSource } from "./mediaUtils";
import styles from "./ThemeSongPlayer.module.css";

export default function ThemeSongPlayer({ value, characterName = "" }) {
  if (!value || typeof value !== "string" || !value.trim()) {
    return <span className={styles.empty}>-</span>;
  }

  const trimmed = value.trim();
  const youtubeId = getYouTubeVideoId(trimmed);

  if (youtubeId) {
    return (
      <div className={styles.youtubeContainer}>
        <div className={styles.youtubeFrame}>
          <iframe
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            loading="lazy"
            src={`https://www.youtube-nocookie.com/embed/${youtubeId}`}
            title={`${characterName ? `${characterName} - ` : ""}테마곡 영상`}
          />
        </div>
        <a
          className={styles.youtubeLink}
          href={`https://www.youtube.com/watch?v=${youtubeId}`}
          rel="noopener noreferrer"
          target="_blank"
        >
          <Video aria-hidden="true" size={15} />
          <span>YouTube에서 열기</span>
          <ExternalLink aria-hidden="true" size={12} />
        </a>
      </div>
    );
  }

  if (isAudioSource(trimmed)) {
    return (
      <div className={styles.audioContainer}>
        <CustomAudioPlayer
          key={trimmed}
          src={trimmed}
          title={characterName ? `${characterName} 테마곡` : "테마곡"}
        />
      </div>
    );
  }

  // Check if it's a generic web URL
  const isUrl = /^https?:\/\//i.test(trimmed);
  if (isUrl) {
    return (
      <a
        className={styles.webLink}
        href={trimmed}
        rel="noopener noreferrer"
        target="_blank"
      >
        <span>{trimmed}</span>
        <ExternalLink aria-hidden="true" size={13} />
      </a>
    );
  }

  return <span className={styles.textValue}>{trimmed}</span>;
}
