import { flushSync } from "react-dom";
import { useId, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import {
  characterDetailPath,
  characterListPath,
} from "../../../app/paths";
import {
  characterQueryKeys,
  characterRepository,
  menuQueryKeys,
  menuRepository,
  relationQueryKeys,
  relationRepository,
} from "../../../data/repositories/appRepositories";
import { UnsavedChangesGuard } from "../../../shared/hooks/UnsavedChangesGuard";
import { RelationPicker } from "../../../shared/relations/RelationPicker";
import { Button, Skeleton } from "../../../shared/ui";
import {
  characterDraftSnapshot,
  createCharacterDraft,
  editableRelation,
  normalizeCharacterPayload,
  normalizeRelationDrafts,
  sameEndpoint,
} from "../characterForm";
import CharacterFormFields from "../components/CharacterFormFields";
import CharacterImageField from "../components/CharacterImageField";
import styles from "./CharacterEditorPage.module.css";

const isAllRegion = (menuItem) =>
  menuItem.id === "characters00" || menuItem.filterConfig?.scope === "all";

const isConcreteCharacterRegion = (menuItem) =>
  menuItem.sectionId === "characters" &&
  menuItem.resourceType === "character" &&
  menuItem.filterConfig?.scope === "category" &&
  !menuItem.archivedAt;

const endpointKey = (endpoint) =>
  endpoint ? JSON.stringify([endpoint.type, endpoint.id]) : "";

function CharacterEditorForm({
  candidates,
  character,
  connected,
  menuItem,
  regions,
  relations,
  repository,
  route,
}) {
  const { characterId, workId } = route;
  const isEdit = Boolean(characterId);
  const source = character
    ? { type: character.resourceType, id: character.id }
    : undefined;
  const outgoing = connected
    .filter((relation) => sameEndpoint(relation.source, source))
    .map(editableRelation);
  const incoming = connected.filter(
    (relation) => !sameEndpoint(relation.source, source),
  );
  const initialDraft = createCharacterDraft(
    character,
    isAllRegion(menuItem) ? "" : menuItem.id,
  );
  const [draft, setDraft] = useState(initialDraft);
  const [relationDrafts, setRelationDrafts] = useState(outgoing);
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [imageError, setImageError] = useState("");
  const [nameError, setNameError] = useState("");
  const [formError, setFormError] = useState("");
  const initialSnapshot = characterDraftSnapshot(initialDraft, outgoing, null);
  const [savedSnapshot, setSavedSnapshot] = useState(initialSnapshot);
  const createdCharacterRef = useRef(null);
  const nameRef = useRef(null);
  const nameErrorId = useId();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentSnapshot = characterDraftSnapshot(
    draft,
    relationDrafts,
    selectedImageFile,
  );
  const isDirty = currentSnapshot !== savedSnapshot;
  const cancelPath = isEdit
    ? characterDetailPath(workId, menuItem.id, characterId)
    : characterListPath(workId, menuItem.id);
  const candidateLabels = new Map(
    candidates.map((candidate) => [endpointKey(candidate.endpoint), candidate.label]),
  );

  const saveMutation = useMutation({
    networkMode: "always",
    mutationFn: async ({ imageFile, payload, relationUpdates }) => {
      const nextPayload = { ...payload };
      if (imageFile) {
        nextPayload.imageUrl = await repository.storeImage(imageFile);
      }

      let savedCharacter;
      if (isEdit) {
        savedCharacter = await repository.update(workId, characterId, nextPayload);
      } else if (createdCharacterRef.current) {
        savedCharacter = await repository.update(
          workId,
          createdCharacterRef.current.id,
          nextPayload,
        );
      } else {
        savedCharacter = await repository.create(workId, nextPayload);
        createdCharacterRef.current = savedCharacter;
      }

      await relations.replaceOutgoing(
        workId,
        { type: savedCharacter.resourceType, id: savedCharacter.id },
        relationUpdates,
      );
      return savedCharacter;
    },
    onSuccess: async (savedCharacter) => {
      queryClient.setQueryData(
        characterQueryKeys.detail(workId, savedCharacter.id),
        savedCharacter,
      );
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: characterQueryKeys.all(workId),
        }),
        queryClient.invalidateQueries({
          queryKey: relationQueryKeys.all(workId),
        }),
      ]);
      flushSync(() => setSavedSnapshot(currentSnapshot));
      const targetRegionId =
        isEdit && isAllRegion(menuItem)
          ? menuItem.id
          : savedCharacter.regionId;
      navigate(
        characterDetailPath(workId, targetRegionId, savedCharacter.id),
        { replace: true },
      );
    },
    onError: (error) => {
      setFormError(error?.message || "캐릭터를 저장하지 못했습니다.");
    },
  });

  const handleChange = (key, value) => {
    setDraft((current) => {
      if (key === "species") {
        return value === "마물"
          ? { ...current, species: value, gender: "", type: current.type || "마물" }
          : { ...current, species: value, gender: current.gender || "남", type: "" };
      }
      return { ...current, [key]: value };
    });
    if (key === "name" && nameError) setNameError("");
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setFormError("");
    if (!draft.name.trim()) {
      setNameError("이름을 입력해 주세요.");
      nameRef.current?.focus();
      return;
    }
    if (!draft.regionId) {
      setFormError("저장할 지역을 선택해 주세요.");
      return;
    }

    let relationUpdates;
    try {
      relationUpdates = normalizeRelationDrafts(relationDrafts, source);
    } catch (error) {
      setFormError(error.message);
      return;
    }

    saveMutation.mutate({
      imageFile: selectedImageFile,
      payload: normalizeCharacterPayload(draft),
      relationUpdates,
    });
  };

  return (
    <>
      <section className={styles.page}>
        <header className={styles.header}>
          <div>
            <span className={styles.eyebrow}>{menuItem.label}</span>
            <h2 className={styles.title}>
              {isEdit ? "캐릭터 편집" : "캐릭터 추가"}
            </h2>
          </div>
          <Button as={Link} size="small" to={cancelPath} variant="secondary">
            취소
          </Button>
        </header>

        <form
          aria-label={isEdit ? "캐릭터 편집" : "캐릭터 추가"}
          className={styles.form}
          noValidate
          onSubmit={handleSubmit}
        >
          <CharacterFormFields
            draft={draft}
            nameError={nameError}
            nameErrorId={nameErrorId}
            nameRef={nameRef}
            regions={regions}
            onChange={handleChange}
          />

          <CharacterImageField
            character={draft}
            error={imageError}
            file={selectedImageFile}
            onError={setImageError}
            onFileChange={setSelectedImageFile}
            onImageUrlChange={(value) => handleChange("imageUrl", value)}
          />

          <RelationPicker
            candidates={candidates}
            disabled={saveMutation.isPending}
            label="나가는 관계"
            source={source}
            value={relationDrafts}
            workId={workId}
            onChange={setRelationDrafts}
          />

          {incoming.length > 0 ? (
            <section className={styles.incoming} aria-labelledby="incoming-title">
              <h3 id="incoming-title">들어오는 관계</h3>
              <p>다른 항목에서 연결한 관계는 여기에서 변경되지 않습니다.</p>
              <ul>
                {incoming.map((relation) => (
                  <li key={relation.id}>
                    <span>
                      {candidateLabels.get(endpointKey(relation.source)) ??
                        "알 수 없는 항목"}
                      {" · "}
                      {relation.label}
                    </span>
                    {relation.notes ? <small>{relation.notes}</small> : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {formError ? (
            <p className={styles.error} role="alert">
              {formError}
            </p>
          ) : null}

          <div className={styles.actions}>
            <Button as={Link} to={cancelPath} variant="secondary">
              취소
            </Button>
            <Button disabled={saveMutation.isPending} type="submit">
              <Save aria-hidden="true" size={18} />
              {saveMutation.isPending ? "저장 중…" : "저장"}
            </Button>
          </div>
        </form>
      </section>
      <UnsavedChangesGuard isDirty={isDirty} />
    </>
  );
}

function CharacterEditorPage({
  menus = menuRepository,
  relations = relationRepository,
  repository = characterRepository,
}) {
  const { menuItem } = useOutletContext();
  const route = useParams();
  const { characterId, workId } = route;
  const isEdit = Boolean(characterId);
  const characterQuery = useQuery({
    enabled: isEdit,
    networkMode: "always",
    queryKey: characterQueryKeys.detail(workId, characterId),
    queryFn: () => repository.get(workId, characterId),
    retry: false,
  });
  const regionsQuery = useQuery({
    networkMode: "always",
    queryKey: menuQueryKeys.items("characters"),
    queryFn: () => menus.listItems("characters"),
    retry: false,
  });
  const character = characterQuery.data;
  const matchesRegion = character
    ? isAllRegion(menuItem) || character.regionId === menuItem.id
    : !isEdit;
  const source = useMemo(
    () =>
      character
        ? { type: character.resourceType, id: character.id }
        : undefined,
    [character],
  );
  const connectedQuery = useQuery({
    enabled: Boolean(isEdit && source && matchesRegion && !character?.archivedAt),
    networkMode: "always",
    queryKey: relationQueryKeys.list(workId, source),
    queryFn: () => relations.list(workId, source),
    retry: false,
  });
  const candidatesQuery = useQuery({
    enabled: Boolean(matchesRegion && (!isEdit || (source && !character?.archivedAt))),
    networkMode: "always",
    queryKey: relationQueryKeys.candidates(workId, source),
    queryFn: () => relations.listCandidates(workId, source),
    retry: false,
  });
  const regions = (regionsQuery.data ?? []).filter(isConcreteCharacterRegion);
  const loading =
    regionsQuery.isPending ||
    candidatesQuery.isPending ||
    (isEdit && (characterQuery.isPending || connectedQuery.isPending));
  const failed =
    regionsQuery.isError ||
    candidatesQuery.isError ||
    connectedQuery.isError ||
    (isEdit && characterQuery.isError);

  if (loading) {
    return (
      <div aria-live="polite" className={styles.state} role="status">
        <Skeleton className={styles.loadingSkeleton} />
        <span>캐릭터 편집기를 준비하는 중입니다.</span>
      </div>
    );
  }

  if (
    failed ||
    !matchesRegion ||
    (isEdit && (!character || character.archivedAt))
  ) {
    return (
      <div className={styles.state} role="alert">
        <p>현재 지역에서 편집할 캐릭터를 불러오지 못했습니다.</p>
        <Button
          as={Link}
          size="small"
          to={characterListPath(workId, menuItem.id)}
          variant="secondary"
        >
          {menuItem.label} 목록으로
        </Button>
      </div>
    );
  }

  return (
    <CharacterEditorForm
      candidates={candidatesQuery.data ?? []}
      character={character}
      connected={connectedQuery.data ?? []}
      key={`${character?.id ?? "new"}:${character?.version ?? 0}`}
      menuItem={menuItem}
      regions={regions}
      relations={relations}
      repository={repository}
      route={route}
    />
  );
}

export default CharacterEditorPage;
