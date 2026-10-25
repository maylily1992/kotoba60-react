import { describe, expect, it } from "vitest";
import { CURATED_DAY_ONE, CURATED_DAY_ONE_CARD_COUNT } from "./curatedScene";

describe("curated Day 01", () => {
  it("contains a full airport journey without combinatorial duplicates", () => {
    expect(CURATED_DAY_ONE.microScenes).toHaveLength(10);
    expect(CURATED_DAY_ONE_CARD_COUNT).toBe(80);
    const sentences = CURATED_DAY_ONE.microScenes.flatMap((scene) => scene.lines.map((line) => line.jp));
    expect(new Set(sentences).size).toBe(80);
  });

  it("provides kana, Chinese, grammar and usage notes for every line", () => {
    const lines = CURATED_DAY_ONE.microScenes.flatMap((scene) => scene.lines);
    expect(lines.every((line) => line.jp && line.kana && line.zh && line.grammar && line.note)).toBe(true);
  });

  it("summarizes vocabulary, grammar and transfer exercises", () => {
    expect(CURATED_DAY_ONE.words.length).toBeGreaterThanOrEqual(8);
    expect(CURATED_DAY_ONE.grammar.length).toBeGreaterThanOrEqual(5);
    expect(CURATED_DAY_ONE.transfers.length).toBeGreaterThanOrEqual(5);
  });
});
