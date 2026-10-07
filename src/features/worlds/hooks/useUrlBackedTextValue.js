import { useState } from "react";

export const useUrlBackedTextValue = (urlValue) => {
  const [draft, setDraft] = useState({ source: urlValue, value: urlValue });
  const value = draft.source === urlValue ? draft.value : urlValue;

  return [
    value,
    (nextValue) => setDraft({ source: urlValue, value: nextValue }),
  ];
};
