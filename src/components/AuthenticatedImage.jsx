import { useEffect, useState, useSyncExternalStore } from "react";
import { apiBaseUrl } from "../data/http/config";
import { accessHeaders, getAccessToken, subscribeSession, setPasswordSession } from "../data/http/passwordSession";

export default function AuthenticatedImage({ src, onError, ...props }) {
  const token = useSyncExternalStore(subscribeSession, getAccessToken, () => "");
  const protectedImage = typeof src === "string" && src.startsWith(`${apiBaseUrl}/images/`);
  const [loaded, setLoaded] = useState(null);
  useEffect(() => {
    if (!protectedImage || !token) return;
    const controller = new AbortController();
    let blobUrl;
    void fetch(src, { headers: accessHeaders(), signal: controller.signal }).then(async (response) => {
      if (response.status === 401) setPasswordSession(null);
      if (!response.ok) throw new Error("Image unavailable");
      const blob = await response.blob();
      if (controller.signal.aborted) return;
      blobUrl = URL.createObjectURL(blob); setLoaded({ src, token, url: blobUrl });
    }).catch(() => { if (!controller.signal.aborted) setLoaded({ src, token, failed: true }); });
    return () => { controller.abort(); if (blobUrl) URL.revokeObjectURL(blobUrl); };
  }, [src, token, protectedImage]);
  useEffect(() => {
    if (protectedImage && loaded?.src === src && loaded?.token === token && loaded.failed) onError?.();
  }, [loaded, src, token, protectedImage, onError]);
  const url = protectedImage ? loaded?.src === src && loaded?.token === token ? loaded.url : undefined : src;
  return <img {...props} src={url || undefined} onError={onError} />;
}
