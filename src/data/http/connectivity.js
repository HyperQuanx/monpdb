import { useSyncExternalStore } from "react";
import { Capacitor } from "@capacitor/core";
import { Network } from "@capacitor/network";
let reachable = true;
let nativeConnected;
const listeners = new Set();
export const isOnline = () => (nativeConnected ?? globalThis.navigator?.onLine !== false) && reachable;
export const markServerReachable = (value) => {
  if (reachable === value) return;
  reachable = value;
  listeners.forEach((listener) => listener());
};
const subscribe = (listener) => { listeners.add(listener); return () => listeners.delete(listener); };
if (typeof window !== "undefined") {
  window.addEventListener("offline", () => listeners.forEach((listener) => listener()));
  window.addEventListener("online", () => { reachable = true; listeners.forEach((listener) => listener()); });
  if (Capacitor.isNativePlatform()) {
    void Network.getStatus().then(({ connected }) => {
      nativeConnected = connected;
      listeners.forEach((listener) => listener());
    }).catch(() => {});
    void Network.addListener("networkStatusChange", ({ connected }) => {
      nativeConnected = connected;
      if (connected) reachable = true;
      listeners.forEach((listener) => listener());
    });
  }
}
export const useOnline = () => useSyncExternalStore(subscribe, isOnline, () => true);
