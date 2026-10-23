import { useEffect, useRef, useState } from "react";
import { Music, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { formatAudioTime } from "./mediaUtils";
import styles from "./CustomAudioPlayer.module.css";

export default function CustomAudioPlayer({ src, title = "캐릭터 테마곡" }) {
  const audioRef = useRef(null);
  const progressBarRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
    };

    const handleTimeUpdate = () => {
      if (!isSeeking) {
        setCurrentTime(audio.currentTime);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleError = () => {
      setIsPlaying(false);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
    };
  }, [isSeeking, src]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleSeekChange = (event) => {
    const newTime = Number(event.target.value);
    setCurrentTime(newTime);
  };

  const handleSeekStart = () => {
    setIsSeeking(true);
  };

  const handleSeekEnd = (event) => {
    setIsSeeking(false);
    const audio = audioRef.current;
    if (!audio) return;
    const newTime = Number(event.target.value);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={styles.playerCard}>
      <audio ref={audioRef} preload="metadata" src={src} />

      <button
        aria-label={isPlaying ? "일시정지" : "재생"}
        className={styles.playButton}
        type="button"
        onClick={togglePlay}
      >
        {isPlaying ? (
          <Pause aria-hidden="true" className={styles.playIcon} size={18} />
        ) : (
          <Play aria-hidden="true" className={styles.playIcon} size={18} />
        )}
      </button>

      <div className={styles.mainSection}>
        <div className={styles.infoRow}>
          <div className={styles.trackInfo}>
            <Music aria-hidden="true" className={styles.musicIcon} size={14} />
            <span className={styles.trackTitle}>{title}</span>
          </div>

          <div className={styles.timeDisplay}>
            <span>{formatAudioTime(currentTime)}</span>
            <span className={styles.timeDivider}>/</span>
            <span>{formatAudioTime(duration)}</span>
          </div>
        </div>

        <div className={styles.progressContainer} ref={progressBarRef}>
          <div
            className={styles.progressFill}
            style={{ width: `${progressPercent}%` }}
          />
          <input
            aria-label="재생 위치 탐색"
            className={styles.seekSlider}
            max={duration || 100}
            min={0}
            step="0.1"
            type="range"
            value={currentTime}
            onChange={handleSeekChange}
            onMouseDown={handleSeekStart}
            onMouseUp={handleSeekEnd}
            onTouchEnd={handleSeekEnd}
            onTouchStart={handleSeekStart}
          />
        </div>
      </div>

      <button
        aria-label={isMuted ? "음소거 해제" : "음소거"}
        className={styles.muteButton}
        type="button"
        onClick={toggleMute}
      >
        {isMuted ? (
          <VolumeX aria-hidden="true" size={17} />
        ) : (
          <Volume2 aria-hidden="true" size={17} />
        )}
      </button>

      {isPlaying ? (
        <div className={styles.equalizer} aria-hidden="true">
          <span className={styles.bar1} />
          <span className={styles.bar2} />
          <span className={styles.bar3} />
        </div>
      ) : null}
    </div>
  );
}
