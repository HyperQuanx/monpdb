const requiredMethods = [
  "list",
  "get",
  "create",
  "update",
  "archive",
  "restore",
  "listOwners",
];

/**
 * Runtime guard for the Setting repository contract used at composition
 * boundaries until a static interface or HTTP implementation is introduced.
 */
export const assertSettingRepository = (repository) => {
  for (const method of requiredMethods) {
    if (typeof repository?.[method] !== "function") {
      throw new TypeError(`Setting repository is missing method: ${method}`);
    }
  }

  return repository;
};
