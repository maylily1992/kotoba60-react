import type {
  ReviewResult,
  WeakBookState,
  WeakItem,
  WeakStatus,
} from "../types";

export const WEAK_BOOK_KEY = "kotoba60:weak-book:v1";
export const WEAK_BOOK_VERSION = 1;
const MAX_HISTORY = 100;

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface CreateWeakItemInput {
  originalSentence: string;
  userError: string;
  fixReason: string;
  sceneId: string;
  studyDay: number;
  source: WeakItem["source"];
  hint?: string;
}

export function createEmptyWeakBook(): WeakBookState {
  return { version: WEAK_BOOK_VERSION, items: [] };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function makeId() {
  return globalThis.crypto?.randomUUID?.() ?? `weak-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function nextInterval(previousInterval: number, quality: number) {
  if (quality < 3) return 1;
  if (previousInterval <= 1) return 3;
  if (previousInterval <= 3) return 7;
  if (previousInterval <= 7) return 14;
  return 14;
}

export function nextEase(previousEase: number, quality: number) {
  const delta = 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
  return Number(clamp(previousEase + delta, 1.3, 2.8).toFixed(2));
}

/**
 * Simplified SM-2 using the app's study-day clock.
 * New items are due on day + 1. Successful intervals proceed 1 → 3 → 7 → 14 →
 * graduated. A quality below 3 resets the interval to 1.
 */
export function scheduleReview(
  item: WeakItem,
  quality: 0 | 1 | 2 | 3 | 4 | 5,
  studyDay: number,
  now = Date.now(),
) {
  const interval = nextInterval(item.interval, quality);
  const easeFactor = nextEase(item.easeFactor, quality);
  const previousInterval = item.interval;
  const graduated =
    quality >= 4 &&
    ((previousInterval >= 14 && interval >= 14) || (previousInterval >= 7 && interval >= 14 && quality === 5));
  const status: WeakStatus = graduated ? "graduated" : "active";
  const result: ReviewResult = {
    date: now,
    studyDay,
    quality,
    responseTimeMs: 0,
    userTranscript: "",
  };

  return {
    ...item,
    interval,
    easeFactor,
    nextReviewDay: graduated ? Number.MAX_SAFE_INTEGER : studyDay + interval,
    status,
    updatedAt: now,
    reviewHistory: [...item.reviewHistory, result].slice(-MAX_HISTORY),
  };
}

export function createWeakItem(input: CreateWeakItemInput, now = Date.now()): WeakItem {
  return {
    id: makeId(),
    originalSentence: input.originalSentence.trim(),
    userError: input.userError.trim(),
    fixReason: input.fixReason.trim(),
    sceneId: input.sceneId,
    dayAdded: input.studyDay,
    nextReviewDay: input.studyDay + 1,
    interval: 1,
    easeFactor: 2.5,
    reviewHistory: [],
    status: "active",
    createdAt: now,
    updatedAt: now,
    source: input.source,
    hint: input.hint,
  };
}

export function parseWeakBook(raw: string | null): WeakBookState {
  if (!raw) return createEmptyWeakBook();
  try {
    const parsed = JSON.parse(raw) as Partial<WeakBookState>;
    if (!Array.isArray(parsed.items)) return createEmptyWeakBook();
    const validItems = parsed.items.filter(
      (item): item is WeakItem =>
        Boolean(item) &&
        typeof item.id === "string" &&
        typeof item.originalSentence === "string" &&
        typeof item.nextReviewDay === "number" &&
        Array.isArray(item.reviewHistory),
    );
    return {
      version: typeof parsed.version === "number" ? parsed.version : WEAK_BOOK_VERSION,
      items: validItems.map((item) => ({
        ...item,
        interval: Number.isFinite(item.interval) ? item.interval : 1,
        easeFactor: Number.isFinite(item.easeFactor) ? item.easeFactor : 2.5,
        status: ["active", "graduated", "suspended"].includes(item.status)
          ? item.status
          : "active",
      })),
    };
  } catch {
    return createEmptyWeakBook();
  }
}

export class WeakBookRepository {
  constructor(
    private readonly storage: StorageLike,
    private readonly now: () => number = Date.now,
  ) {}

  load(): WeakBookState {
    return parseWeakBook(this.storage.getItem(WEAK_BOOK_KEY));
  }

  save(state: WeakBookState): void {
    this.storage.setItem(
      WEAK_BOOK_KEY,
      JSON.stringify({ ...state, version: WEAK_BOOK_VERSION }),
    );
  }

  list(): WeakItem[] {
    return this.load().items;
  }

  get(id: string): WeakItem | undefined {
    return this.list().find((item) => item.id === id);
  }

  upsert(input: CreateWeakItemInput): WeakItem {
    const state = this.load();
    const normalizedError = input.userError.replace(/\s+/g, "").trim();
    const duplicate = state.items.find(
      (item) =>
        item.sceneId === input.sceneId &&
        item.originalSentence === input.originalSentence.trim() &&
        item.userError.replace(/\s+/g, "").trim() === normalizedError &&
        item.status === "active",
    );
    if (duplicate) {
      duplicate.updatedAt = this.now();
      duplicate.nextReviewDay = Math.min(duplicate.nextReviewDay, input.studyDay + 1);
      this.save(state);
      return duplicate;
    }
    const item = createWeakItem(input, this.now());
    state.items.push(item);
    this.save(state);
    return item;
  }

  addManual(input: CreateWeakItemInput): WeakItem {
    return this.upsert(input);
  }

  due(studyDay: number): WeakItem[] {
    return this.list()
      .filter(
        (item) =>
          item.status === "active" &&
          item.nextReviewDay <= studyDay,
      )
      .sort((a, b) => a.nextReviewDay - b.nextReviewDay || a.createdAt - b.createdAt);
  }

  active(): WeakItem[] {
    return this.list().filter((item) => item.status === "active");
  }

  graduated(): WeakItem[] {
    return this.list().filter((item) => item.status === "graduated");
  }

  review(
    id: string,
    quality: 0 | 1 | 2 | 3 | 4 | 5,
    studyDay: number,
    responseTimeMs = 0,
    userTranscript = "",
  ): WeakItem | undefined {
    const state = this.load();
    const index = state.items.findIndex((item) => item.id === id);
    if (index < 0) return undefined;
    const next = scheduleReview(state.items[index], quality, studyDay, this.now());
    next.reviewHistory[next.reviewHistory.length - 1] = {
      ...next.reviewHistory[next.reviewHistory.length - 1],
      responseTimeMs,
      userTranscript,
    };
    state.items[index] = next;
    this.save(state);
    return next;
  }

  setStatus(id: string, status: WeakStatus): boolean {
    const state = this.load();
    const item = state.items.find((entry) => entry.id === id);
    if (!item) return false;
    item.status = status;
    item.updatedAt = this.now();
    this.save(state);
    return true;
  }

  remove(id: string): boolean {
    const state = this.load();
    const next = state.items.filter((item) => item.id !== id);
    if (next.length === state.items.length) return false;
    this.save({ ...state, items: next });
    return true;
  }

  clear(): void {
    this.storage.removeItem(WEAK_BOOK_KEY);
  }
}

export function exportWeakBook(state: WeakBookState): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      version: state.version,
      items: state.items,
    },
    null,
    2,
  );
}
