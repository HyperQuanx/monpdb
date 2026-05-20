import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import TextareaAutosize from "react-textarea-autosize";
import {
  getCharacter,
  updateCharacter,
  uploadCharacterImage,
} from "../api/charactersApi";
import {
  characterGenderOptions,
  characterSpeciesOptions,
  getCharacterCoverImage,
  getCharacterRegionFromPathname,
  getCharacterSpecies,
  getProfileFields,
  profileDraftKeys,
} from "../characters";
import styles from "./CharacterDetailPage.module.css";

const defaultProfileTheme = {
  labelBackground: "#111111",
  labelText: "#ffffff",
  autoText: true,
};

const displayValue = (value) => {
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(", ") : "-";
  }

  return value || "-";
};

const getEditableValue = (value) => {
  if (Array.isArray(value)) {
    return value.join(", ");
  }

  return value ?? "";
};

const getProfileDraft = (character) => {
  const species = getCharacterSpecies(character);

  return {
    ...Object.fromEntries(
      profileDraftKeys.map((key) => [key, getEditableValue(character[key])]),
    ),
    species,
    gender:
      species === "인간" ? character.gender || "남" : character.gender || "",
    type: character.type || (species === "마물" ? "마물" : ""),
  };
};

const getProfileUpdatePayload = (profileDraft, profileTheme) => {
  const species = profileDraft.species === "마물" ? "마물" : "인간";

  return {
    ...profileDraft,
    species,
    gender: species === "인간" ? profileDraft.gender || "남" : "",
    type: species === "마물" ? profileDraft.type || "마물" : "",
    profileTheme,
  };
};

const getReadableTextColor = (backgroundColor) => {
  const hex = backgroundColor.replace("#", "");
  const normalized =
    hex.length === 3
      ? hex
          .split("")
          .map((value) => value + value)
          .join("")
      : hex;

  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  const brightness = (red * 299 + green * 587 + blue * 114) / 1000;

  return brightness > 150 ? "#111111" : "#ffffff";
};

function CharacterDetailPage() {
  const { pathname } = useLocation();
  const { characterId } = useParams();
  const region = getCharacterRegionFromPathname(pathname);

  const characterQuery = useQuery({
    queryKey: ["character", characterId],
    queryFn: () => getCharacter(characterId),
    enabled: Boolean(characterId),
    retry: false,
  });

  const character = characterQuery.data;

  if (characterQuery.isLoading) {
    return <p className={styles.state}>캐릭터를 불러오는 중입니다.</p>;
  }

  if (characterQuery.isError || !character) {
    return (
      <section className={styles.state}>
        <p>캐릭터를 찾을 수 없습니다.</p>
        <Link to={region.path}>목록으로 돌아가기</Link>
      </section>
    );
  }

  return (
    <CharacterDetailContent
      character={character}
      key={character.id}
      region={region}
    />
  );
}

function CharacterDetailContent({ character, region }) {
  const queryClient = useQueryClient();
  const baseTheme = useMemo(
    () => ({
      ...defaultProfileTheme,
      ...character.profileTheme,
    }),
    [character.profileTheme],
  );
  const [isEditing, setIsEditing] = useState(false);
  const [profileDraft, setProfileDraft] = useState(() =>
    getProfileDraft(character),
  );
  const [profileTheme, setProfileTheme] = useState(baseTheme);
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const visibleCharacter = isEditing
    ? {
        ...character,
        ...profileDraft,
      }
    : character;
  const profileFields = getProfileFields(visibleCharacter);
  const portraitSrc = imagePreviewUrl || getCharacterCoverImage(visibleCharacter);
  const labelTextColor = profileTheme.autoText
    ? getReadableTextColor(profileTheme.labelBackground)
    : profileTheme.labelText;

  useEffect(() => {
    if (!imagePreviewUrl) {
      return undefined;
    }

    return () => {
      URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  const updateCharacterMutation = useMutation({
    mutationFn: async ({ updates, imageFile }) => {
      const nextUpdates = { ...updates };

      if (imageFile) {
        nextUpdates.imageUrl = await uploadCharacterImage(imageFile);
      }

      return updateCharacter(character.id, nextUpdates);
    },
    onSuccess: (updatedCharacter) => {
      queryClient.setQueryData(["character", character.id], updatedCharacter);
      queryClient.invalidateQueries({ queryKey: ["characters"] });
      setProfileDraft(getProfileDraft(updatedCharacter));
      setProfileTheme({
        ...defaultProfileTheme,
        ...updatedCharacter.profileTheme,
      });
      setSelectedImageFile(null);
      setImagePreviewUrl("");
      setIsEditing(false);
    },
  });

  const handleEditToggle = () => {
    if (isEditing) {
      setProfileDraft(getProfileDraft(character));
      setProfileTheme(baseTheme);
      setSelectedImageFile(null);
      setImagePreviewUrl("");
      setIsEditing(false);
      return;
    }

    setIsEditing(true);
  };

  const handleDraftChange = (key, value) => {
    setProfileDraft((current) => ({
      ...current,
      [key]: value,
      ...(key === "species" && value === "마물" && !current.type
        ? { type: "마물" }
        : {}),
      ...(key === "species" && value === "인간" && !current.gender
        ? { gender: "남" }
        : {}),
    }));
  };

  const handleImageFileChange = (file) => {
    if (!file) {
      return;
    }

    setSelectedImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
  };

  const handleImageClear = () => {
    setSelectedImageFile(null);
    setImagePreviewUrl("");
    handleDraftChange("imageUrl", "");
  };

  const handleSave = () => {
    updateCharacterMutation.mutate({
      updates: getProfileUpdatePayload(profileDraft, profileTheme),
      imageFile: selectedImageFile,
    });
  };

  const handleReset = () => {
    setProfileDraft(getProfileDraft(character));
    setProfileTheme(baseTheme);
    setSelectedImageFile(null);
    setImagePreviewUrl("");
  };

  return (
    <article className={styles.page}>
      <div className={styles.actions}>
        <button
          className={styles.editButton}
          type="button"
          onClick={handleEditToggle}
        >
          {isEditing ? "Close" : "Edit"}
        </button>
      </div>

      {isEditing ? (
        <section className={styles.editor} aria-label="Character editor">
          <div className={styles.imageEditor}>
            <span className={styles.editorLabel}>초상 이미지</span>
            <div className={styles.imagePreview}>
              <img src={portraitSrc} alt={`${visibleCharacter.name} 초상`} />
            </div>
            <div className={styles.imageActions}>
              <label className={styles.fileButton}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    handleImageFileChange(event.target.files?.[0])
                  }
                />
                <span>파일 선택</span>
              </label>
              <button type="button" onClick={handleImageClear}>
                비우기
              </button>
            </div>
            <label className={styles.imageUrlField}>
              <span>이미지 URL</span>
              <input
                value={profileDraft.imageUrl}
                onChange={(event) =>
                  handleDraftChange("imageUrl", event.target.value)
                }
              />
            </label>
          </div>

          <label>
            <span>표 제목 배경</span>
            <input
              type="color"
              value={profileTheme.labelBackground}
              onChange={(event) =>
                setProfileTheme((current) => ({
                  ...current,
                  labelBackground: event.target.value,
                }))
              }
            />
          </label>

          <label className={styles.checkLabel}>
            <input
              type="checkbox"
              checked={profileTheme.autoText}
              onChange={(event) =>
                setProfileTheme((current) => ({
                  ...current,
                  autoText: event.target.checked,
                }))
              }
            />
            <span>글씨 색 자동 선택</span>
          </label>

          {!profileTheme.autoText ? (
            <label>
              <span>표 제목 글씨</span>
              <input
                type="color"
                value={profileTheme.labelText}
                onChange={(event) =>
                  setProfileTheme((current) => ({
                    ...current,
                    labelText: event.target.value,
                  }))
                }
              />
            </label>
          ) : null}

          <div className={styles.editorActions}>
            <button
              type="button"
              disabled={updateCharacterMutation.isPending}
              onClick={handleSave}
            >
              {updateCharacterMutation.isPending ? "Saving" : "Save"}
            </button>
            <button type="button" onClick={handleReset}>
              Reset
            </button>
          </div>

          {updateCharacterMutation.isError ? (
            <p className={styles.editorError}>저장하지 못했습니다.</p>
          ) : null}
        </section>
      ) : null}

      <div className={styles.sheet}>
        <header className={styles.nameHeader}>
          <h2>{visibleCharacter.name}</h2>
          <p>
            {displayValue(visibleCharacter.hanjaName)} |{" "}
            {displayValue(visibleCharacter.englishName)}
          </p>
        </header>

        <div className={styles.portraitFrame}>
          <img src={portraitSrc} alt={`${visibleCharacter.name} 초상`} />
        </div>
      </div>

      <dl
        className={styles.profileTable}
        style={{
          "--profile-label-bg": profileTheme.labelBackground,
          "--profile-label-text": labelTextColor,
        }}
      >
        {profileFields.map(([key, label]) => (
          <div className={styles.profileRow} key={key}>
            <dt>{label}</dt>
            <dd>
              {isEditing ? (
                renderProfileEditor({
                  keyName: key,
                  label,
                  value: profileDraft[key] ?? "",
                  onChange: handleDraftChange,
                })
              ) : (
                displayValue(visibleCharacter[key])
              )}
            </dd>
          </div>
        ))}
      </dl>

      <Link className={styles.backLink} to={region.path}>
        {region.label} 목록으로
      </Link>
    </article>
  );
}

function renderProfileEditor({ keyName, label, value, onChange }) {
  if (keyName === "species") {
    return (
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(keyName, event.target.value)}
      >
        {characterSpeciesOptions.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  if (keyName === "gender") {
    return (
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(keyName, event.target.value)}
      >
        {characterGenderOptions.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  return (
    <TextareaAutosize
      aria-label={label}
      minRows={2}
      maxRows={8}
      value={value}
      onChange={(event) => onChange(keyName, event.target.value)}
    />
  );
}

export default CharacterDetailPage;
