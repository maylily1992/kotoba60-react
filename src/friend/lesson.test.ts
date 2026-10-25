import { describe, expect, it } from "vitest";
import { SCENES } from "../data";
import { buildFriendLesson } from "./lesson";

describe("friend lesson builder", () => {
  it("builds one intent with three distinct expression temperatures", () => {
    const lesson = buildFriendLesson(SCENES[0]);
    expect(lesson.expressions).toHaveLength(3);
    expect(new Set(lesson.expressions.map((item) => item.tone)).size).toBe(3);
    expect(lesson.expressions.every((item) => item.jp && item.kana && item.when)).toBe(true);
  });

  it("contains enough dense material for a full lesson", () => {
    const lesson = buildFriendLesson(SCENES[10]);
    expect(lesson.dialogue).toHaveLength(6);
    expect(lesson.words).toHaveLength(6);
    expect(lesson.grammarExamples).toHaveLength(6);
    expect(lesson.verbLabs).toHaveLength(3);
    expect(lesson.verbLabs.every((verb) => verb.forms.length >= 6)).toBe(true);
  });
});
