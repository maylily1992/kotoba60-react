import { describe, expect, it } from "vitest";
import { casualVersion, migrationAnswers } from "./CuratedApp";
import type { CuratedLine } from "../data/curatedDayTypes";

type CardFixture = CuratedLine & {
  day: number;
  scene: string;
  dayTitle: string;
  micro: string;
  setting: string;
};

const card: CardFixture = {
  id: "d03-l010",
  day: 3,
  scene: "酒店前台",
  dayTitle: "酒店入住",
  micro: "提出需求",
  setting: "把预约和支付方式说清楚。",
  jp: "ホテルの予約をお願いします。",
  kana: "ほてるのよやくをおねがいします。",
  zh: "麻烦帮我预约酒店。",
  speaker: "你",
  function: "提出需求",
  grammar: "〜てください",
  note: "先说对象，再说请求。",
  scope: "core",
};

describe("migration answer readings", () => {
  it("provides hiragana for the casual-answer transformation", () => {
    const answer = casualVersion(card);
    expect(answer.jp).toBe("ホテルの予約、お願い。");
    expect(answer.kana).toBe("ほてるのよやく、おねがい。");
    expect(answer.kana).not.toMatch(/[\u3400-\u9fffA-Za-z\u30a1-\u30f6]/);
  });

  it("gives every migration answer both Japanese and hiragana", () => {
    const answers = migrationAnswers(card, []);
    expect(answers).toHaveLength(3);
    for (const item of answers) {
      expect(item.answer.jp.length).toBeGreaterThan(0);
      expect(item.answer.kana.length).toBeGreaterThan(0);
      expect(item.answer.kana).not.toMatch(/[\u3400-\u9fffA-Za-z\u30a1-\u30f6]/);
    }
  });
});
