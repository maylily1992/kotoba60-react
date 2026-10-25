import { useEffect, useRef, useState } from "react";
import { Page, PrimaryButton } from "../components/Page";
import { dialogueAudio } from "../data";
import { requestAiTurn } from "../lib/ai";
import { addFixes, addTurn, updateSession } from "../lib/session";
import { speakJapanese, startJapaneseRecognition } from "../lib/speech";
import type { RecognitionController } from "../lib/speech";
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
      emotion: "encouraging",
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
  const recognitionRef = useRef<RecognitionController | null>(null);
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

  function beginListen() {
    try {
      const recognition = startJapaneseRecognition({
        onInterim: setInput,
        expected: partnerLines[Math.min(turnIndex, partnerLines.length - 1)].jp,
        timeoutMs: 20_000,
      });
      recognitionRef.current = recognition;
      setHint("正在听，松开后确认识别文字。");
      recognition.result
        .then((result) => {
          setInput(result.transcript);
          setHint("");
        })
        .catch((error) => setHint(error instanceof Error ? error.message : "请改为文字输入"));
    } catch (error) {
      setHint(error instanceof Error ? error.message : "请使用文字输入");
    }
  }

  function endListen() {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
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
    let emotion: Emotion = "encouraging";
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

  function askForGuide() {
    const next = struggleCount + 1;
    setStruggleCount(next);
    setHint(nextKeyword(turnIndex));
    if (next >= 2) setSimpleMode(true);
  }

  return (
    <Page eyebrow="10 MIN · 引导式角色扮演" title={scene.place} back={() => navigate("home")}>
      <div className="pressure-bar">
        <span>ハルト · {simpleMode ? "简单引导" : emotionLabel[turns.at(-1)?.emotion ?? "encouraging"]}</span>
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
          <button
            className="mic-round"
            onPointerDown={(event) => { event.preventDefault(); beginListen(); }}
            onPointerUp={endListen}
            onPointerCancel={endListen}
            onPointerLeave={endListen}
            aria-label="按住说话，松开结束"
          >按住说</button>
          <button className="stuck-button" onClick={askForGuide}>需要引导</button>
          <PrimaryButton onClick={submit} disabled={busy || !input.trim()}>{busy ? "接话中" : "回答"}</PrimaryButton>
        </div>
      </div>
      {simpleMode && <div className="guided-frame"><b>句框</b><span>{learnerLines[Math.min(turnIndex, learnerLines.length - 1)].hint}</span></div>}
      <button className="text-button" onClick={() => playPartner(turnIndex)}>再听一遍这句话</button>
      <p className="privacy-note">默认按原生语速引导。浏览器识别文本可在提交前直接修改，不代表发音准确度。</p>
    </Page>
  );
}
