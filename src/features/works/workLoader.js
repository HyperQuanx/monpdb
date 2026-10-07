import { workRepository } from "../../data/repositories/appRepositories";

export const createRequireActiveWork = (repository) => async ({ params }) =>
  repository.select(params.workId);

export const requireActiveWork = createRequireActiveWork(workRepository);
