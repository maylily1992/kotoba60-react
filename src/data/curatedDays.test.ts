import { describe, expect, it } from "vitest";
import { DAY_META, loadCuratedDay } from "./curatedDays";
import type { CuratedDay, CuratedLine } from "./curatedDayTypes";
import { SCENE_CULTURE } from "./sceneCulture";

function normalize(text: string) {
  return text.replace(/[\s、。，．！？!?「」『』（）()・…ー~〜]/g, "");
}

function trigrams(text: string) {
  const normalized = normalize(text);
  if (normalized.length <= 3) return new Set([normalized]);
  return new Set(
    Array.from({ length: normalized.length - 2 }, (_, index) => normalized.slice(index, index + 3)),
  );
}

function jaccard(left: Set<string>, right: Set<string>) {
  const overlap = [...left].filter((item) => right.has(item)).length;
  return overlap / (left.size + right.size - overlap);
}

describe("complete curated 60-day atlas", () => {
  it("opens all 60 days with at least 100 independent lines per day", async () => {
    const days = await Promise.all(
      Array.from({ length: 60 }, (_, index) => loadCuratedDay(index + 1)),
    );

    expect(DAY_META).toHaveLength(60);
    expect(days.map((day) => day.day)).toEqual(Array.from({ length: 60 }, (_, index) => index + 1));

    const counts = days.map((day) =>
      day.microScenes.reduce((total, micro) => total + micro.lines.length, 0),
    );
    expect(counts.every((count) => count >= 100)).toBe(true);
    expect(counts[0]).toBe(104);
    expect(counts.reduce((sum, count) => sum + count, 0)).toBe(6476);
  });

  it("keeps Japanese, kana, Chinese, grammar, and stable ids complete", async () => {
    const days = await Promise.all(
      Array.from({ length: 60 }, (_, index) => loadCuratedDay(index + 1)),
    );
    const lines = days.flatMap((day) =>
      day.microScenes.flatMap((micro) => micro.lines),
    );
    const ids = lines.map((line) => line.id);
    const japanese = lines.map((line) => normalize(line.jp));

    expect(new Set(ids).size).toBe(lines.length);
    expect(new Set(japanese).size).toBe(lines.length);
    expect(
      lines.every(
        (line) =>
          line.jp &&
          line.kana &&
          line.zh &&
          line.grammar &&
          line.note &&
          !/[\u3400-\u9fffA-Za-z]/.test(line.kana),
      ),
    ).toBe(true);
  });

  it("does not repeat near-identical sentence skeletons within one day", async () => {
    const days = await Promise.all(
      Array.from({ length: 60 }, (_, index) => loadCuratedDay(index + 1)),
    );

    for (const day of days) {
      const lines = day.microScenes.flatMap((micro) => micro.lines);
      const grams = lines.map((line) => trigrams(line.jp));
      let nearPairs = 0;
      for (let left = 0; left < grams.length; left += 1) {
        for (let right = left + 1; right < grams.length; right += 1) {
          if (jaccard(grams[left], grams[right]) > 0.84) nearPairs += 1;
        }
      }
      expect(nearPairs).toBeLessThan(4);
    }
  });

  it("gives every day vocabulary, detailed grammar, and transfer prompts", async () => {
    const days = await Promise.all(
      Array.from({ length: 60 }, (_, index) => loadCuratedDay(index + 1)),
    );

    for (const day of days) {
      expect(day.words.length).toBeGreaterThanOrEqual(10);
      expect(day.grammar.length).toBeGreaterThanOrEqual(5);
      expect(day.transfers.length).toBeGreaterThanOrEqual(5);
      expect(day.grammar.every((item) =>
        item.formula && item.useWhen && item.contrast && item.mistake && item.example && item.kana
      )).toBe(true);
    }
  });

  it("gives every scene a local-culture note for per-line explanations", () => {
    expect(Object.keys(SCENE_CULTURE)).toHaveLength(60);
    expect(
      Array.from({ length: 60 }, (_, index) => index + 1).every(
        (day) => SCENE_CULTURE[day]?.title && SCENE_CULTURE[day]?.text,
      ),
    ).toBe(true);
  });

  it("keeps Day 01 as a fully hand-authored airport scene", async () => {
    const day: CuratedDay = await loadCuratedDay(1);
    const lines: CuratedLine[] = day.microScenes.flatMap((micro) => micro.lines);

    expect(day.microScenes).toHaveLength(13);
    expect(lines).toHaveLength(104);
    expect(lines.every((line) => line.sourceId?.startsWith("manual-d01"))).toBe(true);
    expect(lines.some((line) => line.jp.includes("パッケージを見せましょうか"))).toBe(true);
    expect(lines.some((line) => line.jp.includes("店の外に出て右に行くと"))).toBe(true);
  });
});
