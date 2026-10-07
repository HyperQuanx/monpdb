const requiredMethods = [
  "list",
  "get",
  "create",
  "update",
  "archive",
  "restore",
  "select",
];

export const assertWorkRepository = (repository) => {
  for (const method of requiredMethods) {
    if (typeof repository?.[method] !== "function") {
      throw new TypeError(`Work repository is missing method: ${method}`);
    }
  }

  return repository;
};
