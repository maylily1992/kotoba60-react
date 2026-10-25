import { useEffect, useRef, useState } from "react";
import { Page, PrimaryButton } from "../components/Page";
import { dialogueAudio } from "../data";
import { requestAiTurn } from "../lib/ai";
import { addFixes, addTurn, updateSession } from "../lib/session";
import { recognizeJapanese, speakJapanese } from "../lib/speech";
import { textSimilarity } from "../lib/scoring";
import type { DialogueTurn, Emotion, FixItem } from "../types";
import type { PageProps } from "./types";

const emotionLabel: Record<Emotion, string> = {
  neutral: "正常",
  confused: "有点困惑",
  encouraging: "更有耐心",
  impatient: "追问加快",
};

export function DialoguePage({ scene, previousScene, studyDay, navigate }: PageProps) {
  const partnerLines = scene.dialogue.filter((line) => line.side === "partner");
  const learnerLines = scene.dialogue.filter((line) => line.side === "learner");
  const [turnIndex, setTurnIndex] = useState(0);
  const [turns, setTurns] = useState<DialogueTurn[]>([
    {
      speaker: "ai",
      textJa: partnerLines[0].jp,
      textCn: partnerLines[0].zh,
      audioUrl: dialogueAudio(scene.id, 0),
      emotion: "neutral",
    },
  ]);
  const [input, setInput] = useState("");
  const [hint, setHint] = useState("");
  const [struggleCount, setStruggleCount] = useState(0);
  const [simpleMode, setSimpleMode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [proxyUrl, setProxyUrl] = useState(() => localStorage.getItem("kotoba60:ai-proxy") ?? "");
  const [showSettings, setShowSettings] = useState(false);
  const [memory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("kotoba60:role-memory:v1") ?? "[]") as string[];
    } catch {
      return [];
    }
  });
  const inputRef = useRef("");
  const hintTimer = useRef<number | null>(null);

  useEffect(() => {
    updateSession({ sceneId: scene.id, studyDay });
  }, [scene.id, studyDay]);

  useEffect(() => {
    inputRef.current = input;
  }, [input]);

  useEffect(() => {
    playPartner(turnIndex);
    window.clearTimeout(hintTimer.current ?? undefined);
    hintTimer.current = window.setTimeout(() => {
      if (!inputRef.current.trim()) setHint(partnerLines[Math.min(turnIndex, partnerLines.length - 1)].hint ?? nextKeyword(turnIndex));
    }, 5000);
    return () => window.clearTimeout(hintTimer.current ?? undefined);
  }, [turnIndex]);

  function nextKeyword(index: number) {
    return learnerLines[Math.min(index, learnerLines.length - 1)]?.hint?.split("｜")[0] ?? "もう一度";
  }

  function playPartner(index: number, rate = 1) {
    const line = partnerLines[Math.min(index, partnerLines.length - 1)];
    const audio = new Audio(dialogueAudio(scene.id, index * 2));
    audio.playbackRate = rate;
    if (rate !== 1) {
      audio.onerror = () => speakJapanese(line.jp, rate);
      void audio.play().catch(() => speakJapanese(line.jp, rate));
    } else {
      audio.onerror = () => speakJapanese(line.jp, 1);
      void audio.play().catch(() => speakJapanese(line.jp, 1));
    }
  }

  async function listen() {
    try {
      const result = await recognizeJapanese({ onInterim: setInput, timeoutMs: 10_000 });
      setInput(result.transcript);
      setHint("");
    } catch (error) {
      setHint(error instanceof Error ? error.message : "请改为文字输入");
    }
  }

  async function submit() {
    const transcript = input.trim();
    if (!transcript || busy) return;
    if (/もう一回|もういちど/.test(transcript)) {
      playPartner(turnIndex);
      setInput("");
      setHint("听这一遍的句尾升降，再回答。");
      return;
    }
    setBusy(true);
    setHint("");
    addTurn({ speaker: "user", textJa: transcript, userTranscript: transcript });
    const prior = turns.map((turn) => ({
      role: turn.speaker === "ai" ? ("assistant" as const) : ("user" as const),
      content: turn.textJa,
    }));
    let responseText = partnerLines[Math.min(turnIndex + 1, partnerLines.length - 1)]?.jp ?? "はい、わかりました。";
    let emotion: Emotion = simpleMode ? "encouraging" : "neutral";
    let fixes: FixItem[] = [];
    let nextHint = "";
    if (proxyUrl) {
      try {
        const result = await requestAiTurn({
          proxyUrl,
          sceneTitle: scene.title,
          sceneGoal: scene.goal,
          history: prior,
          transcript,
          struggleCount,
          memory: [
            `前回の場面: ${previousScene.title} / ${previousScene.goal}`,
            ...memory,
          ],
        });
        responseText = result.reply_ja;
        emotion = result.emotion;
        fixes = result.fix;
        nextHint = result.hint;
        if (fixes.length) addFixes(fixes);
      } catch {
        setHint("AI 代理不可用，继续使用预写场景。");
      }
    }
    if (!proxyUrl && textSimilarity(learnerLines[Math.min(turnIndex, learnerLines.length - 1)].jp, transcript) < 0.58) {
      fixes = [{
        bad: transcript,
        natural: learnerLines[Math.min(turnIndex, learnerLines.length - 1)].jp,
        why: "与当前任务目标表达差距较大；先用场景示范把任务完成。",
        focus: "fluency",
      }];
      addFixes(fixes);
    }
    const nextTurn: DialogueTurn = {
      speaker: "ai",
      textJa: responseText,
      emotion,
      fix: fixes,
      hint: nextHint,
    };
    setTurns((items) => [...items, { speaker: "user", textJa: transcript, userTranscript: transcript }, nextTurn]);
    addTurn(nextTurn);
    speakJapanese(responseText, simpleMode ? 0.92 : 1);
    setInput("");
    setStruggleCount(0);
    if (turnIndex >= partnerLines.length - 1) {
      localStorage.setItem(
        "kotoba60:role-memory:v1",
        JSON.stringify(Array.from(new Set([`${scene.title} / ${scene.goal}`, ...memory])).slice(0, 12)),
      );
      navigate("feedback");
      return;
    }
    setTurnIndex((value) => value + 1);
    setBusy(false);
  }

  function markStruggle() {
    const next = struggleCount + 1;
    setStruggleCount(next);
    setHint(nextKeyword(turnIndex));
    if (next >= 2) setSimpleMode(true);
  }

  return (
    <Page eyebrow="10 MIN · 高压角色扮演" title={scene.place} back={() => navigate("home")}>
      <div className="pressure-bar">
        <span>ハルト · {simpleMode ? "简单模式" : emotionLabel[turns.at(-1)?.emotion ?? "neutral"]}</span>
        <button onClick={() => setShowSettings((value) => !value)}>AI 设置</button>
      </div>
      <p className="role-memory">ハルト记得前一次：{previousScene.title}</p>
      {showSettings && (
        <div className="dialog-settings">
          <label>AI 代理地址<input value={proxyUrl} onChange={(event) => setProxyUrl(event.target.value)} placeholder="https://your-worker.workers.dev" /></label>
          <button onClick={() => { localStorage.setItem("kotoba60:ai-proxy", proxyUrl.trim()); setShowSettings(false); }}>保存，仅存本机</button>
        </div>
      )}
      <div className="dialogue-log">
        {turns.map((turn, index) => (
          <div className={`dialogue-bubble ${turn.speaker}`} key={`${turn.speaker}-${index}`}>
            <span>{turn.speaker === "ai" ? "ハルト" : "你"}</span>
            <b>{turn.textJa}</b>
            {turn.speaker === "ai" && <button className="audio-mini" onClick={() => playPartner(Math.floor(index / 2))}>▶ 原速</button>}
          </div>
        ))}
      </div>
      {hint && <div className="dialog-hint"><small>关键词</small><b>{hint}</b></div>}
      <div className="dialogue-compose">
        <textarea value={input} onChange={(event) => setInput(event.target.value)} placeholder="直接说日语。说「もう一回」可让对方重复。" />
        <div>
          <button className="mic-round" onClick={listen}>声</button>
          <button className="stuck-button" onClick={markStruggle}>卡住</button>
          <PrimaryButton onClick={submit} disabled={busy || !input.trim()}>{busy ? "接话中" : "回答"}</PrimaryButton>
        </div>
      </div>
      <button className="text-button" onClick={() => playPartner(turnIndex, 1.14)}>更快一遍 · 压力变式</button>
      <p className="privacy-note">原生语速默认 100%。浏览器识别文本不等于发音准确度。</p>
    </Page>
  );
}
