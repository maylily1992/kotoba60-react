import { describe, expect, it } from "vitest";
import { DAYS, TOTAL_SENTENCES } from "./sentenceBank";

describe("60-day sentence bank", () => {
  it("contains exactly 60 days and 6000 cards", () => {
    expect(DAYS).toHaveLength(60);
    expect(TOTAL_SENTENCES).toBe(6000);
  });

  it("gives every day exactly 100 unique sentence cards", () => {
    for (const day of DAYS) {
      expect(day.cards, `day ${day.day}`).toHaveLength(100);
      expect(new Set(day.cards.map((card) => card.jp)).size, `day ${day.day}`).toBe(100);
    }
  });

  it("includes words, grammar summaries and related expressions for each day", () => {
    for (const day of DAYS) {
      expect(day.items).toHaveLength(5);
      expect(day.frames).toHaveLength(20);
      expect(day.grammarSummary.length).toBeGreaterThanOrEqual(16);
      expect(day.grammarSummary.length).toBeLessThanOrEqual(20);
      expect(day.cards.every((card) => card.kana && card.zh && card.why && card.related.length > 0)).toBe(true);
    }
  });
});
