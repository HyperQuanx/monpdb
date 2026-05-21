const defaultApiBaseUrl = "https://qbix-portfolio.shop:8443/api";
const apiBaseUrl = (
  import.meta.env.VITE_API_BASE_URL || defaultApiBaseUrl
).replace(/\/+$/, "");

const getJsonResponse = async (response) => {
  if (!response.ok) {
    let message = `Request failed: ${response.status}`;

    try {
      const errorBody = await response.json();
      message = errorBody.message || errorBody.error || message;
    } catch {
      // Keep the status-based fallback message.
    }

    throw new Error(message);
  }

  return response.json();
};

const fetchJson = async (url, options) =>
  getJsonResponse(await fetch(url, options));

export const getCharacters = async ({ regionId, q }) => {
  const url = new URL(`${apiBaseUrl}/characters`);

  if (regionId) {
    url.searchParams.set("regionId", regionId);
  }

  if (q) {
    url.searchParams.set("q", q);
  }

  return fetchJson(url);
};

export const getCharacter = async (characterId) =>
  fetchJson(`${apiBaseUrl}/characters/${characterId}`);

export const uploadCharacterImage = async (file) => {
  const formData = new FormData();
  formData.set("image", file);

  const uploadResult = await fetchJson(`${apiBaseUrl}/character-images`, {
    method: "POST",
    body: formData,
  });

  const imageUrl = uploadResult.imageUrl || uploadResult.url;

  if (!imageUrl) {
    throw new Error("Image upload response is missing imageUrl.");
  }

  return imageUrl;
};

export const createCharacter = async (characterData) =>
  fetchJson(`${apiBaseUrl}/characters`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(characterData),
  });

export const updateCharacter = async (characterId, updates) =>
  fetchJson(`${apiBaseUrl}/characters/${characterId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updates),
  });
