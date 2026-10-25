import { useState } from "react";
import { Page, PrimaryButton, Reading } from "../components/Page";
import { recognizeJapanese } from "../lib/speech";
import type { PageProps } from "./types";

export function ReviewPage({ studyDay, repo, navigate, refresh }: PageProps) {
  const [items, setItems] = useState(() => repo.due(studyDay));
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState("");
  const [revealed, setRevealed] = useState(false);
  const current = items[index];

  async function listen() {
    try {
      const result = await recognizeJapanese({ onInterim: setInput });
      setInput(result.transcript);
      setRevealed(true);
    } catch {
      setRevealed(true);
    }
  }

  function rate(quality: 1 | 3 | 5) {
    if (!current) return;
    repo.review(current.id, quality, studyDay, 0, input);
    refresh();
    if (index >= items.length - 1) {
      setItems([]);
    } else {
      setIndex((value) => value + 1);
      setInput("");
      setRevealed(false);
    }
  }

  if (!current) {
    return (
      <Page eyebrow="2 MIN · 隔天回收" title="今天的弱点清零。" back={() => navigate("home")}>
        <section className="review-done">
          <b>回收完成</b>
          <p>答对的句子已经延长间隔；失败的会明天再来。</p>
          <PrimaryButton onClick={() => navigate("home")}>回到今天</PrimaryButton>
        </section>
      </Page>
    );
  }

  return (
    <Page eyebrow={`2 MIN · 隔天回收 ${index + 1}/${items.length}`} title={current.originalSentence === current.userError ? "把这句话重新说出来。" : "只给中文，把日语召回。"} back={() => navigate("home")}>
      <section className="review-prompt">
        <span>场景 {current.sceneId}</span>
        <h2>{current.fixReason}</h2>
        <p>在原句外，你曾经说成：{current.userError}</p>
        {current.hint && <small>关键词：{current.hint}</small>}
      </section>
      <textarea value={input} onChange={(event) => setInput(event.target.value)} placeholder="先大声说，再输入你实际说的内容。" />
      <div className="inline-actions">
        <button onClick={listen}>语音回答</button>
        <button onClick={() => setRevealed(true)}>想不起来，显示答案</button>
      </div>
      {revealed && (
        <section className="review-answer">
          <Reading jp={current.originalSentence} />
          <p>{current.fixReason}</p>
          <div className="quality-row">
            <button onClick={() => rate(1)}>没想起</button>
            <button onClick={() => rate(3)}>想起但有错</button>
            <button onClick={() => rate(5)}>完整说出</button>
          </div>
        </section>
      )}
    </Page>
  );
}
