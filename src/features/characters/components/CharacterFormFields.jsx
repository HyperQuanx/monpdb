import TextareaAutosize from "react-textarea-autosize";
import {
  characterGenderOptions,
  characterSpeciesOptions,
} from "../characters";
import {
  characterLongFields,
  characterTextFields,
} from "../characterForm";
import ThemeSongField from "./ThemeSongField";
import styles from "../pages/CharacterEditorPage.module.css";

function CharacterFormFields({
  draft,
  nameError,
  nameErrorId,
  nameRef,
  onChange,
  regions,
}) {
  const isMonster = draft.species === "마물";

  return (
    <>
      <div className={styles.field}>
        <label htmlFor="regionId">지역</label>
        <select
          id="regionId"
          required
          value={draft.regionId}
          onChange={(event) => onChange("regionId", event.target.value)}
        >
          <option value="">지역 선택</option>
          {regions.map((region) => (
            <option key={region.id} value={region.id}>
              {region.label}
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
            onChange={(event) => onChange("species", event.target.value)}
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
            {isMonster ? "마물 구분" : "성별"}
          </label>
          {isMonster ? (
            <input
              id="type"
              value={draft.type}
              onChange={(event) => onChange("type", event.target.value)}
            />
          ) : (
            <select
              id="gender"
              value={draft.gender}
              onChange={(event) => onChange("gender", event.target.value)}
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

      <div className={styles.grid}>
        {characterTextFields
          .filter(([key]) => key !== "themeSong")
          .map(([key, label, required]) => (
            <div className={styles.field} key={key}>
              <label htmlFor={key}>
                {label} {required ? <strong aria-hidden="true">*</strong> : null}
              </label>
              <input
                aria-describedby={key === "name" && nameError ? nameErrorId : undefined}
                aria-invalid={key === "name" ? Boolean(nameError) : undefined}
                aria-label={label}
                id={key}
                ref={key === "name" ? nameRef : undefined}
                value={draft[key]}
                onChange={(event) => onChange(key, event.target.value)}
              />
              {key === "name" && nameError ? (
                <span className={styles.fieldError} id={nameErrorId} role="alert">
                  {nameError}
                </span>
              ) : null}
            </div>
          ))}
        <ThemeSongField value={draft.themeSong} onChange={onChange} />
      </div>

      <div className={styles.grid}>
        {characterLongFields.map(([key, label]) => (
          <div className={`${styles.field} ${styles.fullField}`} key={key}>
            <label htmlFor={key}>{label}</label>
            <TextareaAutosize
              aria-label={label}
              id={key}
              maxRows={12}
              minRows={4}
              value={draft[key]}
              onChange={(event) => onChange(key, event.target.value)}
            />
          </div>
        ))}
      </div>

      <fieldset className={styles.themeFields}>
        <legend>프로필 표 테마</legend>
        <label>
          <span>라벨 배경색</span>
          <input
            aria-label="라벨 배경색"
            type="color"
            value={draft.profileTheme.labelBackground}
            onChange={(event) =>
              onChange("profileTheme", {
                ...draft.profileTheme,
                labelBackground: event.target.value,
              })
            }
          />
        </label>
        <label className={styles.checkLabel}>
          <input
            checked={draft.profileTheme.autoText}
            type="checkbox"
            onChange={(event) =>
              onChange("profileTheme", {
                ...draft.profileTheme,
                autoText: event.target.checked,
              })
            }
          />
          <span>라벨 글자색 자동 선택</span>
        </label>
        {!draft.profileTheme.autoText ? (
          <label>
            <span>라벨 글자색</span>
            <input
              aria-label="라벨 글자색"
              type="color"
              value={draft.profileTheme.labelText}
              onChange={(event) =>
                onChange("profileTheme", {
                  ...draft.profileTheme,
                  labelText: event.target.value,
                })
              }
            />
          </label>
        ) : null}
      </fieldset>
    </>
  );
}

export default CharacterFormFields;
