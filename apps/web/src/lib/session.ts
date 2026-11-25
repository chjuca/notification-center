import { useSyncExternalStore } from "react";

const STORAGE_KEY = "notification-center.token";
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function notify(): void {
  listeners.forEach((listener) => listener());
}

export function saveToken(token: string): void {
  window.localStorage.setItem(STORAGE_KEY, token);
  notify();
}

export function clearToken(): void {
  window.localStorage.removeItem(STORAGE_KEY);
  notify();
}

export function useToken(): string | null | undefined {
  return useSyncExternalStore(
    subscribe,
    () => window.localStorage.getItem(STORAGE_KEY),
    () => undefined,
  );
}
