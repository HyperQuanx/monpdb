import { useId, useState } from "react";
import clsx from "clsx";
import { DEFAULT_RELATION_TYPES } from "./relationTypes";
import styles from "./RelationPicker.module.css";

const endpointKey = (endpoint) =>
  endpoint ? JSON.stringify([endpoint.type, endpoint.id]) : "";

const sameEndpoint = (first, second) =>
  endpointKey(first) === endpointKey(second);

export function RelationPicker({
  candidates = [],
  className,
  disabled = false,
  label = "관계",
  onChange,
  relationTypes = DEFAULT_RELATION_TYPES,
  source,
  value = [],
  workId,
}) {
  const pickerId = useId();
  const [selectedCandidateKey, setSelectedCandidateKey] = useState("");
  const selectedTargets = new Set(
    value.map((relation) => endpointKey(relation.target)),
  );
  // Archived candidates may be passed only to resolve labels of existing
  // relations; they are never offered as new relation targets.
  const availableCandidates = candidates.filter(
    (candidate) =>
      !candidate.archivedAt &&
      (!workId || candidate.workId === workId) &&
      !sameEndpoint(candidate.endpoint, source) &&
      !selectedTargets.has(endpointKey(candidate.endpoint)),
  );
  const activeCandidateKey = availableCandidates.some(
    (candidate) => endpointKey(candidate.endpoint) === selectedCandidateKey,
  )
    ? selectedCandidateKey
    : endpointKey(availableCandidates[0]?.endpoint);

  const candidateByEndpoint = (endpoint) =>
    candidates.find((candidate) => sameEndpoint(candidate.endpoint, endpoint));

  const changeRelation = (index, patch) => {
    onChange?.(
      value.map((relation, relationIndex) =>
        relationIndex === index ? { ...relation, ...patch } : relation,
      ),
    );
  };

  const addRelation = () => {
    const candidate = availableCandidates.find(
      (item) => endpointKey(item.endpoint) === activeCandidateKey,
    );
    const relationType = relationTypes[0];

    if (!candidate || !relationType) {
      return;
    }

    onChange?.([
      ...value,
      {
        bidirectional: false,
        label: relationType.label,
        notes: "",
        relationType: relationType.value,
        target: { ...candidate.endpoint },
      },
    ]);
  };

  return (
    <section
      aria-labelledby={`${pickerId}-label`}
      className={clsx(styles.root, className)}
    >
      <h2 className={styles.heading} id={`${pickerId}-label`}>
        {label}
      </h2>
      <div className={styles.addRow}>
        <label className={styles.field} htmlFor={`${pickerId}-candidate`}>
          <span>관계 대상</span>
          <select
            aria-label="관계 대상 선택"
            className={styles.control}
            disabled={disabled || availableCandidates.length === 0}
            id={`${pickerId}-candidate`}
            value={activeCandidateKey}
            onChange={(event) => setSelectedCandidateKey(event.target.value)}
          >
            {availableCandidates.length === 0 ? (
              <option value="">추가할 수 있는 대상이 없습니다</option>
            ) : null}
            {availableCandidates.map((candidate) => (
              <option
                key={endpointKey(candidate.endpoint)}
                value={endpointKey(candidate.endpoint)}
              >
                {candidate.label}
              </option>
            ))}
          </select>
        </label>
        <button
          aria-label="관계 추가"
          className={styles.addButton}
          disabled={disabled || !activeCandidateKey || relationTypes.length === 0}
          type="button"
          onClick={addRelation}
        >
          관계 추가
        </button>
      </div>

      {value.length === 0 ? (
        <p className={styles.empty}>추가된 관계가 없습니다.</p>
      ) : (
        <div className={styles.list}>
          {value.map((relation, index) => {
            const candidate = candidateByEndpoint(relation.target);
            const candidateLabel = candidate?.label ?? "알 수 없는 대상";
            const rowId = `${pickerId}-relation-${index}`;

            return (
              <fieldset
                className={styles.relationCard}
                disabled={disabled}
                key={relation.id ?? `${endpointKey(relation.target)}-${index}`}
              >
                <legend className={styles.targetChip}>
                  <span aria-label={`${candidateLabel} 관계 대상`}>
                    {candidateLabel}
                  </span>
                </legend>
                <div className={styles.fields}>
                  <label className={styles.field} htmlFor={`${rowId}-type`}>
                    <span>관계 종류</span>
                    <select
                      aria-label={`${candidateLabel} 관계 종류`}
                      className={styles.control}
                      id={`${rowId}-type`}
                      value={relation.relationType}
                      onChange={(event) =>
                        changeRelation(index, {
                          relationType: event.target.value,
                        })
                      }
                    >
                      {relationTypes.map((relationType) => (
                        <option
                          key={relationType.value}
                          value={relationType.value}
                        >
                          {relationType.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={styles.field} htmlFor={`${rowId}-label`}>
                    <span>관계 이름</span>
                    <input
                      aria-label={`${candidateLabel} 관계 이름`}
                      className={styles.control}
                      id={`${rowId}-label`}
                      type="text"
                      value={relation.label}
                      onChange={(event) =>
                        changeRelation(index, { label: event.target.value })
                      }
                    />
                  </label>
                  <label className={styles.fieldWide} htmlFor={`${rowId}-notes`}>
                    <span>관계 메모</span>
                    <textarea
                      aria-label={`${candidateLabel} 관계 메모`}
                      className={styles.notes}
                      id={`${rowId}-notes`}
                      rows="2"
                      value={relation.notes ?? ""}
                      onChange={(event) =>
                        changeRelation(index, { notes: event.target.value })
                      }
                    />
                  </label>
                  <label className={styles.checkboxLabel}>
                    <input
                      aria-label={`${candidateLabel} 상호 관계`}
                      checked={Boolean(relation.bidirectional)}
                      type="checkbox"
                      onChange={(event) =>
                        changeRelation(index, {
                          bidirectional: event.target.checked,
                        })
                      }
                    />
                    <span>상호 관계</span>
                  </label>
                  <button
                    aria-label={`${candidateLabel} 관계 삭제`}
                    className={styles.removeButton}
                    type="button"
                    onClick={() =>
                      onChange?.(
                        value.filter(
                          (_, relationIndex) => relationIndex !== index,
                        ),
                      )
                    }
                  >
                    관계 삭제
                  </button>
                </div>
              </fieldset>
            );
          })}
        </div>
      )}
    </section>
  );
}
