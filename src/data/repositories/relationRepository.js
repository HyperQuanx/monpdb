const requiredMethods = [
  "list",
  "listCandidates",
  "create",
  "replaceOutgoing",
  "archive",
  "restore",
];

/**
 * Runtime guard for the typed relation repository contract.
 */
export const assertRelationRepository = (repository) => {
  for (const method of requiredMethods) {
    if (typeof repository?.[method] !== "function") {
      throw new TypeError(`Relation repository is missing method: ${method}`);
    }
  }

  return repository;
};
