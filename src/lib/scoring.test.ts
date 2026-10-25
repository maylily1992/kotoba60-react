import { describe, expect, it } from "vitest";
import { isRecallPassing, scoreRecall, textSimilarity } from "./scoring";

describe("speech transcript scoring", () => {
  it("treats katakana and hiragana spellings as equivalent", () => {
    expect(textSimilarity("コーヒーを飲みます。", "こーひーを飲みます")).toBe(1);
  });

  it("uses the kana reading when speech recognition returns kana instead of kanji", () => {
    const result = scoreRecall({
      expected: "昨日、日本に来ました。",
      expectedKana: "きのう、にほんにきました。",
      transcript: "きのう にほんに きました",
      latencyMs: 2200,
      durationMs: 2600,
    });
    expect(result.textScore).toBeGreaterThan(0.95);
    expect(isRecallPassing(result)).toBe(true);
  });

  it("does not pass an unrelated transcript after a fast response", () => {
    const result = scoreRecall({
      expected: "トイレはどこですか。",
      expectedKana: "トイレはどこですか。",
      transcript: "今日はいい天気ですね",
      latencyMs: 300,
      durationMs: 1800,
    });
    expect(result.textScore).toBeLessThan(0.35);
    expect(isRecallPassing(result)).toBe(false);
  });
});
