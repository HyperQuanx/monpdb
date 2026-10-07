import { IDEA_ORIGIN_RELATION_TYPE } from "../../domain/schemas";

export const IDEA_ORIGIN_RELATION_LABEL = "원본 아이디어";

/**
 * Supported conversion targets. Each maps an idea onto the target's create
 * payload; `categoryField` is the target's category/region/chapter key.
 */
export const IDEA_CONVERSION_TARGETS = Object.freeze({
  plot: Object.freeze({ label: "플롯 장면", sectionId: "plot", categoryField: "chapterId" }),
  setting: Object.freeze({ label: "설정 자료", sectionId: "setting", categoryField: "categoryId" }),
  world: Object.freeze({ label: "세계관", sectionId: "world", categoryField: "regionId" }),
});

const payloadFor = (targetType, idea, categoryId) => {
  const shared = {
    body: structuredClone(idea.body),
    summary: idea.summary,
    tags: [...idea.tags],
    title: idea.title,
  };
  if (targetType === "plot") {
    return { ...shared, chapterId: categoryId, status: "planned" };
  }
  if (targetType === "setting") {
    return { ...shared, categoryId };
  }
  return { ...shared, category: "region", regionId: categoryId };
};

/**
 * Converts an idea into a Plot scene, Setting entry, or World entry. The new
 * target gets an `idea-origin` relation back to the idea, and the idea becomes
 * `adopted` with a link to the target. If a later step fails, the created
 * target is archived so no orphaned active record remains.
 */
export const createIdeaConverter = ({ ideas, plots, relations, settings, worlds }) => {
  const targetRepositories = { plot: plots, setting: settings, world: worlds };

  return {
    async convert(workId, ideaId, { targetType, categoryId } = {}) {
      const repository = targetRepositories[targetType];
      if (!repository || !IDEA_CONVERSION_TARGETS[targetType]) {
        throw new Error(`Unsupported idea conversion target: ${targetType}`);
      }
      const idea = await ideas.get(workId, ideaId);
      if (idea.archivedAt) {
        throw new Error(`Archived idea cannot be converted: ${ideaId}`);
      }
      if (idea.status === "adopted" || idea.status === "discarded") {
        throw new Error(`Idea cannot be converted from status ${idea.status}: ${ideaId}`);
      }

      const target = await repository.create(workId, payloadFor(targetType, idea, categoryId));
      const endpoint = { type: target.resourceType, id: target.id };
      let relation = null;
      try {
        relation = await relations.create(workId, {
          bidirectional: false,
          label: IDEA_ORIGIN_RELATION_LABEL,
          notes: "",
          relationType: IDEA_ORIGIN_RELATION_TYPE,
          source: endpoint,
          target: { type: "idea", id: idea.id },
        });
        const adopted = await ideas.markConverted(workId, idea.id, endpoint);
        return { idea: adopted, relation, target };
      } catch (error) {
        // Best-effort compensation; the original error is what callers need.
        if (relation) await relations.archive(workId, relation.id).catch(() => {});
        await repository.archive(workId, target.id).catch(() => {});
        throw error;
      }
    },
  };
};
