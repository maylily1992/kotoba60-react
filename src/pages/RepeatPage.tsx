import { useMemo, useState } from "react";
import { Page, PrimaryButton } from "../components/Page";
import { readSession } from "../lib/session";
import { recognizeJapanese } from "../lib/speech";
import { isRecallPassing, scoreRecall } from "../lib/scoring";
import type { PageProps } from "./types";

export function RepeatPage({ scene, studyDay, repo, navigate, refresh }: PageProps) {
  const session = useMemo(readSession, []);
  const fixes = session?.fixes ?? [];
  const learners = scene.dialogue.filter((line) => line.side === "learner");
  const target = fixes.at(-1)?.natural ?? learners.at(-1)?.jp ?? scene.natural[0].jp;
  const [input, setInput] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [result, setResult] = useState<ReturnType<typeof scoreRecall> | null>(null);
  const prompt = scene.variations[0]?.setup ?? "同样的场景，对方开始催促。";

  function evaluate() {
    const score = scoreRecall({
      expected: target,
      transcript: input,
      latencyMs: 2500,
      durationMs: Math.max(1400, input.length * 220),
    });
    setResult(score);
    setAttempts((value) => value + 1);
    if (!isRecallPassing(score)) {
      repo.upsert({
        originalSentence: target,
        userError: input || "（重说失败）",
        fixReason: "压力变式下未能自然重说。",
        sceneId: String(scene.id),
        studyDay,
        source: "repeat",
      });
      refresh();
    }
  }

  async function listen() {
    try {
      const result = await recognizeJapanese({ onInterim: setInput });
      setInput(result.transcript);
    } catch {
      // Text input remains available.
    }
  }

  return (
    <Page eyebrow="3 MIN · 重说训练" title={prompt} back={() => navigate("home")}>
      <section className="repeat-card">
        <span>新角色 · 更急的银行职员</span>
        <h2>{scene.variations[0]?.task ?? "不要想答案，直接把刚才的正确说法还回去。"}</h2>
        <p>目标表达：{fixes.at(-1)?.natural ?? "保持自然语体"}</p>
        <textarea value={input} onChange={(event) => setInput(event.target.value)} placeholder="现在再说一遍。" />
        <div className="inline-actions">
          <button onClick={listen}>语音输入</button>
          <PrimaryButton onClick={evaluate} disabled={!input.trim()}>说完了</PrimaryButton>
        </div>
      </section>
      {result && (
        <section className={`repeat-result ${isRecallPassing(result) ? "pass" : "fail"}`}>
          <b>{isRecallPassing(result) ? "种下了 ✓" : "还没长稳"}</b>
          <span>文本 {Math.round(result.textScore * 100)} · 反应 {Math.round(result.latencyScore * 100)}</span>
          <p>正确说法：{target}</p>
          {!isRecallPassing(result) && attempts < 2 && (
            <button onClick={() => { setResult(null); setInput(""); }}>再重说一次</button>
          )}
          {(isRecallPassing(result) || attempts >= 2) && (
            <PrimaryButton onClick={() => navigate("summary")}>进入今日总结</PrimaryButton>
          )}
        </section>
      )}
    </Page>
  );
}
