const requiredMethods = [
  "list",
  "get",
  "create",
  "update",
  "archive",
  "restore",
];

/**
 * Runtime guard for the World repository contract used at composition
 * boundaries until a static interface or HTTP implementation is introduced.
 */
export const assertWorldRepository = (repository) => {
  for (const method of requiredMethods) {
    if (typeof repository?.[method] !== "function") {
      throw new TypeError(`World repository is missing method: ${method}`);
    }
  }

  return repository;
};
