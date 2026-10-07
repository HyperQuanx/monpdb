const requiredMethods = [
  "list",
  "get",
  "create",
  "update",
  "move",
  "archive",
  "restore",
];

/**
 * Runtime guard for the Plot scene repository contract used at composition
 * boundaries until a static interface or HTTP implementation is introduced.
 */
export const assertPlotRepository = (repository) => {
  for (const method of requiredMethods) {
    if (typeof repository?.[method] !== "function") {
      throw new TypeError(`Plot repository is missing method: ${method}`);
    }
  }

  return repository;
};
