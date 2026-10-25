import { useMemo, useRef, useState } from "react";
import { Page, PrimaryButton } from "../components/Page";
import { dialogueAudio } from "../data";
import { textSimilarity } from "../lib/scoring";
import type { PageProps } from "./types";

export function WakeupPage({ scene, navigate }: PageProps) {
  const [state, setState] = useState<"idle" | "playing" | "question" | "answer">("idle");
  const [answer, setAnswer] = useState("");
  const [listened, setListened] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const question = scene.dialogue[0];
  const correct = useMemo(
    () => textSimilarity(question.zh, answer) >= 0.18 || answer.includes("问") || answer.includes("什么"),
    [answer, question.zh],
  );

  async function play() {
    setState("playing");
    for (const index of [0, 1, 2]) {
      await new Promise<void>((resolve) => {
        const audio = new Audio(dialogueAudio(scene.id, index));
        audioRef.current = audio;
        audio.onended = () => resolve();
        audio.onerror = () => resolve();
        void audio.play().catch(() => resolve());
      });
    }
    setListened(true);
    setState("question");
  }

  return (
    <Page eyebrow="0–2 MIN · 晨间唤醒" title="先只听，不跟读。" back={() => navigate("home")}>
      <section className={`wake-card ${state}`}>
        <div className="wave" aria-hidden="true">
          {Array.from({ length: 20 }, (_, index) => <i key={index} style={{ height: `${12 + ((index * 17) % 46)}px` }} />)}
        </div>
        <p>{state === "playing" ? "正在播放原生语速…" : "15–20 秒语流，没有字幕。"}</p>
        {state === "idle" && <PrimaryButton onClick={play}>开始播放</PrimaryButton>}
        {state === "playing" && <button className="text-button" onClick={() => { audioRef.current?.pause(); setState("question"); setListened(true); }}>跳过音频，直接回答</button>}
      </section>

      {(state === "question" || state === "answer") && (
        <section className="question-card">
          <div className="section-label">只回答你听到的内容</div>
          <h2>刚才对方问了什么？用中文猜。</h2>
          <textarea value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="不要求完整，只写你抓住的意思。" />
          <PrimaryButton onClick={() => setState("answer")} disabled={!answer.trim()}>提交猜测</PrimaryButton>
        </section>
      )}

      {state === "answer" && (
        <section className={`reveal-card ${correct ? "pass" : "fail"}`}>
          <span>{correct ? "听出来了" : "这正是昨天要回收的语流"}</span>
          <b>{question.jp}</b>
          <small>{question.kana}</small>
          <p>{question.zh}</p>
          <button onClick={play}>再听一遍</button>
          <PrimaryButton onClick={() => navigate("recall")}>
            {correct ? "进入主动回忆" : "带着它进入主动回忆"}
          </PrimaryButton>
        </section>
      )}
      {listened && state === "question" && <p className="privacy-note">音频只用于听辨；原始作品记录保存在本机。</p>}
    </Page>
  );
}
