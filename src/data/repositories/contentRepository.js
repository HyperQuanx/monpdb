const requiredMethods = [
  "list",
  "get",
  "create",
  "update",
  "archive",
  "restore",
];

/**
 * Runtime guard for the shared content repository contract.
 */
export const assertContentRepository = (repository) => {
  for (const method of requiredMethods) {
    if (typeof repository?.[method] !== "function") {
      throw new TypeError(`Content repository is missing method: ${method}`);
    }
  }

  return repository;
};
