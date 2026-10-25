import { describe, expect, it } from "vitest";
import {
  WEAK_BOOK_KEY,
  WeakBookRepository,
  createWeakItem,
  parseWeakBook,
  scheduleReview,
} from "./weakBook";
import type { StorageLike, CreateWeakItemInput } from "./weakBook";

class MemoryStorage implements StorageLike {
  data = new Map<string, string>();
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
}

const input: CreateWeakItemInput = {
  originalSentence: "新宿まで行きたいです。",
  userError: "新宿を行きたいです。",
  fixReason: "移动方向用へ。",
  sceneId: "2",
  studyDay: 10,
  source: "recall",
  hint: "へ",
};

describe("SM-2 weak book", () => {
  it("schedules a new item for the next study day", () => {
    const item = createWeakItem(input, 1000);
    expect(item.nextReviewDay).toBe(11);
    expect(item.interval).toBe(1);
    expect(item.status).toBe("active");
  });

  it("advances 1 → 3 → 7 → 14 and graduates after a strong final recall", () => {
    let item = createWeakItem(input, 1000);
    item = scheduleReview(item, 4, 11);
    expect(item.interval).toBe(3);
    item = scheduleReview(item, 4, 14);
    expect(item.interval).toBe(7);
    item = scheduleReview(item, 4, 21);
    expect(item.interval).toBe(14);
    item = scheduleReview(item, 5, 35);
    expect(item.interval).toBe(14);
    expect(item.status).toBe("graduated");
  });

  it("resets the interval after a failed recall and raises the due queue", () => {
    const repo = new WeakBookRepository(new MemoryStorage(), () => 5000);
    const created = repo.upsert(input);
    repo.review(created.id, 1, 11);
    expect(repo.get(created.id)?.interval).toBe(1);
    expect(repo.due(11)).toHaveLength(0);
    expect(repo.due(12)).toHaveLength(1);
  });

  it("deduplicates the same active scene/error pair", () => {
    const repo = new WeakBookRepository(new MemoryStorage(), () => 5000);
    const first = repo.upsert(input);
    const second = repo.upsert(input);
    expect(second.id).toBe(first.id);
    expect(repo.active()).toHaveLength(1);
  });

  it("recovers safely from corrupted persisted JSON", () => {
    const storage = new MemoryStorage();
    storage.setItem(WEAK_BOOK_KEY, "{broken");
    expect(parseWeakBook(storage.getItem(WEAK_BOOK_KEY))).toEqual({
      version: 1,
      items: [],
    });
  });
});
