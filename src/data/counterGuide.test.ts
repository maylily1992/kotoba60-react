import { describe, expect, it } from "vitest";
import { getCounterGuide } from "./counterGuide";

describe("counter guide", () => {
  it("shows the complete day reading table when a date expression appears", () => {
    const guide = getCounterGuide("6月3日に予約したいです。");
    expect(guide?.activeLabel).toBe("3日");
    expect(guide?.rows).toHaveLength(12);
    expect(guide?.rows.find((row) => row.label === "1日")?.kana).toBe("ついたち");
    expect(guide?.rows.find((row) => row.label === "100日")?.kana).toBe("ひゃくにち");
  });

  it("does not mistake 今日 or 明日 for a counter expression", () => {
    expect(getCounterGuide("今日は予約があります。")).toBeNull();
    expect(getCounterGuide("明日また来ます。")).toBeNull();
  });

  it("handles 何日 as a question expression", () => {
    expect(getCounterGuide("何日まで泊まりますか。")?.activeLabel).toBe("何日");
  });
});
