const requiredMethods = [
  "listTree",
  "listSections",
  "getSection",
  "createSection",
  "updateSection",
  "reorderSections",
  "archiveSection",
  "restoreSection",
  "listItems",
  "getItem",
  "createItem",
  "updateItem",
  "reorderItems",
  "archiveItem",
  "restoreItem",
  "requireActiveItem",
];

export const assertMenuRepository = (repository) => {
  for (const method of requiredMethods) {
    if (typeof repository?.[method] !== "function") {
      throw new TypeError(`Menu repository is missing method: ${method}`);
    }
  }

  return repository;
};
