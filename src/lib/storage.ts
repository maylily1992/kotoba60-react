import type { SchemaMeta } from "../types";

const SCHEMA_KEY = "kotoba60:schema";
const CURRENT_VERSION = 1;

export function localDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function readSchema(): SchemaMeta {
  const raw = localStorage.getItem(SCHEMA_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as SchemaMeta;
      if (parsed.version <= CURRENT_VERSION && parsed.studyDayZero) return parsed;
    } catch {
      // Preserve corrupted data under a backup key before repairing.
    }
    localStorage.setItem(`kotoba60:backup:${Date.now()}`, raw);
  }
  const created: SchemaMeta = {
    version: CURRENT_VERSION,
    createdAt: Date.now(),
    studyDayZero: localDateKey(),
  };
  localStorage.setItem(SCHEMA_KEY, JSON.stringify(created));
  return created;
}

export function studyDayIndex(now = new Date(), schema = readSchema()) {
  const zero = new Date(`${schema.studyDayZero}T00:00:00`);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.floor((today.getTime() - zero.getTime()) / 86_400_000));
}

export function loadJson<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    localStorage.setItem(`kotoba60:backup:${Date.now()}`, raw);
    return fallback;
  }
}

export function saveJson(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function clearAppData() {
  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const key = localStorage.key(index);
    if (key?.startsWith("kotoba60:")) localStorage.removeItem(key);
  }
}
