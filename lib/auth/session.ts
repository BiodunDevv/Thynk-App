"use client";

import * as React from "react";

import type { AuthSessionPayload } from "@/lib/api/auth";

const AUTH_STORAGE_KEY = "thynk.auth.session";
const AUTH_EVENT_NAME = "thynk-auth-session-change";

export type AuthSession = AuthSessionPayload;

function notifyAuthChange() {
  window.dispatchEvent(new Event(AUTH_EVENT_NAME));
}

export function getMockAuthState() {
  return null as AuthSession | null;
}

export function readStoredSession(): AuthSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.localStorage.getItem(AUTH_STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as AuthSession;
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

export function writeStoredSession(session: AuthSession) {
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  notifyAuthChange();
}

export function clearStoredSession() {
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  notifyAuthChange();
}

export function getAccessToken() {
  return readStoredSession()?.tokens.access_token ?? null;
}

let cachedSessionJson: string | null = null;
let cachedSession: AuthSession | null = null;

function getSnapshotStable(): AuthSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (raw === cachedSessionJson) return cachedSession;
  cachedSessionJson = raw;
  if (!raw) {
    cachedSession = null;
    return null;
  }
  try {
    cachedSession = JSON.parse(raw) as AuthSession;
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    cachedSessionJson = null;
    cachedSession = null;
  }
  return cachedSession;
}

const serverSnapshot = null as AuthSession | null;

export function useAuthSession() {
  const subscribe = React.useCallback((onStoreChange: () => void) => {
    window.addEventListener(AUTH_EVENT_NAME, onStoreChange);
    return () => {
      window.removeEventListener(AUTH_EVENT_NAME, onStoreChange);
    };
  }, []);

  return React.useSyncExternalStore(
    subscribe,
    getSnapshotStable,
    () => serverSnapshot,
  );
}

