"use client";

import * as React from "react";
import type { AuthSessionPayload } from "@/lib/api/auth";

const ADMIN_STORAGE_KEY = "thynk.admin.session";
const ADMIN_EVENT_NAME = "thynk-admin-session-change";

export type AdminSession = AuthSessionPayload;

function notify() {
  window.dispatchEvent(new Event(ADMIN_EVENT_NAME));
}

export function writeAdminSession(session: AdminSession) {
  window.localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(session));
  notify();
}

export function clearAdminSession() {
  window.localStorage.removeItem(ADMIN_STORAGE_KEY);
  notify();
}

export function readAdminSession(): AdminSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(ADMIN_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AdminSession;
  } catch {
    window.localStorage.removeItem(ADMIN_STORAGE_KEY);
    return null;
  }
}

let _cachedJson: string | null = null;
let _cachedSession: AdminSession | null = null;

function getSnapshot(): AdminSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(ADMIN_STORAGE_KEY);
  if (raw === _cachedJson) return _cachedSession;
  _cachedJson = raw;
  if (!raw) { _cachedSession = null; return null; }
  try { _cachedSession = JSON.parse(raw) as AdminSession; }
  catch { window.localStorage.removeItem(ADMIN_STORAGE_KEY); _cachedJson = null; _cachedSession = null; }
  return _cachedSession;
}

export function useAdminSession() {
  const subscribe = React.useCallback((onChange: () => void) => {
    window.addEventListener(ADMIN_EVENT_NAME, onChange);
    return () => window.removeEventListener(ADMIN_EVENT_NAME, onChange);
  }, []);
  return React.useSyncExternalStore(subscribe, getSnapshot, () => null);
}
