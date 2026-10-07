export const contentBelongsToMenu = (entry, menuItem) =>
  menuItem?.filterConfig?.scope === "all"
    ? entry?.type === menuItem.resourceType
    : entry?.menuItemId === menuItem?.id;

export const sameEndpoint = (first, second) =>
  Boolean(first && second) &&
  first.type === second.type &&
  first.id === second.id;

export const endpointKey = (endpoint) =>
  endpoint ? JSON.stringify([endpoint.type, endpoint.id]) : "";
