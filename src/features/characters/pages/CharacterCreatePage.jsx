import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import TextareaAutosize from "react-textarea-autosize";
import { characterRegions } from "../../../app/menuSections";
import { createCharacter, uploadCharacterImage } from "../api/charactersApi";
import {
  characterGenderOptions,
  characterSpeciesOptions,
  getCharacterCoverImage,
  getCharacterRegion,
  getCharacterRegionFromPathname,
} from "../characters";
import styles from "./CharacterCreatePage.module.css";

const defaultProfileTheme = {
  labelBackground: "#111111",
  labelText: "#ffffff",
  autoText: true,
};

const textFields = [
  ["name", "이름", true],
  ["hanjaName", "한자 이름"],
  ["englishName", "영문 이름"],
  ["birthplace", "출생지"],
  ["birthDate", "생년월일"],
  ["age", "나이"],
  ["height", "키"],
  ["weight", "몸무게"],
  ["occupation", "직업"],
  ["alignment", "성향"],
  ["affiliation", "소속"],
  ["faction", "파벌"],
  ["themeSong", "테마곡"],
];

const longFields = [
  ["likes", "선호"],
  ["dislikes", "비호"],
  ["martialArts", "무공, 특성"],
  ["personality", "성격"],
  ["appearance", "외형"],
  ["summary", "요약"],
  ["notes", "특이사항"],
];

const getInitialDraft = (regionId) => {
  const region = getCharacterRegion(regionId);

  return {
    regionId: region.id === "characters00" ? "" : region.id,
    name: "",
    hanjaName: "",
    englishName: "",
    imageUrl: "",
    species: "인간",
    gender: "남",
    type: "",
    birthplace: "",
    birthDate: "",
    age: "",
    height: "",
    weight: "",
    occupation: "",
    alignment: "",
    affiliation: "",
    faction: "",
    likes: "",
    dislikes: "",
    martialArts: "",
    personality: "",
    appearance: "",
    themeSong: "",
    summary: "",
    notes: "",
  };
};

const getCreatePayload = (draft) => {
  const species = draft.species === "마물" ? "마물" : "인간";

  return {
    ...draft,
    species,
    name: draft.name.trim(),
    gender: species === "인간" ? draft.gender || "남" : "",
    type: species === "마물" ? draft.type || "마물" : "",
    profileTheme: defaultProfileTheme,
  };
};

function CharacterCreatePage() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const region = getCharacterRegionFromPathname(pathname);
  const [draft, setDraft] = useState(() => getInitialDraft(region.id));
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const imageSrc = imagePreviewUrl || getCharacterCoverImage(draft);

  useEffect(() => {
    if (!imagePreviewUrl) {
      return undefined;
    }

    return () => {
      URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  const createCharacterMutation = useMutation({
    mutationFn: async ({ characterData, imageFile }) => {
      const nextCharacterData = { ...characterData };

      if (imageFile) {
        nextCharacterData.imageUrl = await uploadCharacterImage(imageFile);
      }

      return createCharacter(nextCharacterData);
    },
    onSuccess: (createdCharacter) => {
      queryClient.invalidateQueries({ queryKey: ["characters"] });

      const targetRegion = getCharacterRegion(createdCharacter.regionId);
      navigate(`/${targetRegion.id}/${createdCharacter.id}`);
    },
  });

  const handleChange = (key, value) => {
    setDraft((current) => ({
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
    handleChange("imageUrl", "");
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!draft.name.trim()) {
      return;
    }

    createCharacterMutation.mutate({
      characterData: getCreatePayload(draft),
      imageFile: selectedImageFile,
    });
  };

  const isMonster = draft.species === "마물";

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>New Character</span>
          <h2 className={styles.title}>
            {region.id === "characters00" ? "캐릭터 추가" : region.label}
          </h2>
        </div>
        <Link className={styles.backLink} to={region.path}>
          목록
        </Link>
      </header>

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.field}>
          <label htmlFor="regionId">지역</label>
          <select
            id="regionId"
            value={draft.regionId}
            onChange={(event) => handleChange("regionId", event.target.value)}
          >
            <option value="">선택 안 함</option>
            {characterRegions
              .filter((characterRegion) => characterRegion.id !== "characters00")
              .map((characterRegion) => (
                <option key={characterRegion.id} value={characterRegion.id}>
                  {characterRegion.label}
                </option>
              ))}
          </select>
        </div>

        <div className={styles.inlineFields}>
          <div className={styles.field}>
            <label htmlFor="species">종족</label>
            <select
              id="species"
              value={draft.species}
              onChange={(event) => handleChange("species", event.target.value)}
            >
              {characterSpeciesOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label htmlFor={isMonster ? "type" : "gender"}>
              {isMonster ? "구분" : "성별"}
            </label>
            {isMonster ? (
              <input
                id="type"
                value={draft.type}
                onChange={(event) => handleChange("type", event.target.value)}
              />
            ) : (
              <select
                id="gender"
                value={draft.gender}
                onChange={(event) =>
                  handleChange("gender", event.target.value)
                }
              >
                {characterGenderOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        <section className={styles.imageSection} aria-label="초상 이미지">
          <div className={styles.imagePreview}>
            <img src={imageSrc} alt="캐릭터 초상 미리보기" />
          </div>
          <div className={styles.imageControls}>
            <label className={styles.fileButton}>
              <input
                type="file"
                accept="image/*"
                onChange={(event) =>
                  handleImageFileChange(event.target.files?.[0])
                }
              />
              <span>사진 선택</span>
            </label>
            <button type="button" onClick={handleImageClear}>
              비우기
            </button>
          </div>
          <div className={styles.field}>
            <label htmlFor="imageUrl">이미지 URL</label>
            <input
              id="imageUrl"
              value={draft.imageUrl}
              onChange={(event) => handleChange("imageUrl", event.target.value)}
            />
          </div>
        </section>

        <div className={styles.grid}>
          {textFields.map(([key, label, required]) => (
            <div className={styles.field} key={key}>
              <label htmlFor={key}>{label}</label>
              <input
                id={key}
                required={Boolean(required)}
                value={draft[key]}
                onChange={(event) => handleChange(key, event.target.value)}
              />
            </div>
          ))}
        </div>

        <div className={styles.grid}>
          {longFields.map(([key, label]) => (
            <div className={`${styles.field} ${styles.fullField}`} key={key}>
              <label htmlFor={key}>{label}</label>
              <TextareaAutosize
                id={key}
                minRows={4}
                maxRows={12}
                value={draft[key]}
                onChange={(event) => handleChange(key, event.target.value)}
              />
            </div>
          ))}
        </div>

        {createCharacterMutation.isError ? (
          <p className={styles.error}>캐릭터를 추가하지 못했습니다.</p>
        ) : null}

        <div className={styles.actions}>
          <button
            type="submit"
            disabled={!draft.name.trim() || createCharacterMutation.isPending}
          >
            {createCharacterMutation.isPending ? "Saving" : "Save"}
          </button>
        </div>
      </form>
    </section>
  );
}

export default CharacterCreatePage;
