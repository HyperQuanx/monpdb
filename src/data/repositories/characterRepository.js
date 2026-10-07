const requiredMethods = [
  "list",
  "get",
  "create",
  "update",
  "archive",
  "restore",
  "storeImage",
];

/**
 * Runtime guard for the character repository contract used by the UI façade.
 * JavaScript has no interface keyword, so implementations are checked once at
 * the composition boundary and then consumed through this stable method set.
 */
export const assertCharacterRepository = (repository) => {
  for (const method of requiredMethods) {
    if (typeof repository?.[method] !== "function") {
      throw new TypeError(`Character repository is missing method: ${method}`);
    }
  }

  return repository;
};
