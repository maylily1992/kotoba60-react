import { useEffect, useMemo, useRef, useState } from "react";
import { Page, PrimaryButton } from "../components/Page";
import type { Attempt, RecallScore } from "../types";
import { scoreRecall, isRecallPassing } from "../lib/scoring";
import {
  recordingSupported,
  speechRecognitionAvailable,
  startJapaneseRecognition,
  startRecording,
} from "../lib/speech";
import type { RecognitionController } from "../lib/speech";
import { saveRecording } from "../lib/db";
import { createSession, readSession, updateSession } from "../lib/session";
import type { PageProps } from "./types";

type Phase = "ready" | "recording" | "confirm" | "scored";

export function RecallPage({ scene, studyDay, repo, navigate, refresh }: PageProps) {
  const learnerLines = useMemo(() => scene.dialogue.filter((line) => line.side === "learner"), [scene]);
  const [itemIndex, setItemIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("ready");
  const [countdown, setCountdown] = useState(3);
  const [transcript, setTranscript] = useState("");
  const [alternatives, setAlternatives] = useState<string[]>([]);
  const [recordingUrl, setRecordingUrl] = useState("");
  const [manualText, setManualText] = useState("");
  const [score, setScore] = useState<RecallScore | null>(null);
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [showHint, setShowHint] = useState(false);
  const [showKana, setShowKana] = useState(false);
  const startedAt = useRef(0);
  const recognitionRef = useRef<RecognitionController | null>(null);
  const recordingRef = useRef<{ stop: () => Promise<{ blob: Blob; durationMs: number }> } | null>(null);
  const releaseRequested = useRef(false);
  const line = learnerLines[itemIndex];
  const mastered = score ? isRecallPassing(score) : false;
  const finalFailure = attempts.length >= 3 && !mastered;

  useEffect(() => {
    createSession(scene.id, studyDay);
  }, [scene.id, studyDay]);

  function resetItem() {
    setPhase("ready");
    setTranscript("");
    setAlternatives([]);
    setRecordingUrl("");
    setManualText("");
    setScore(null);
    setError("");
    setAttempts([]);
    setShowHint(false);
    setShowKana(false);
    setCountdown(3);
  }

  function nextItem() {
    if (itemIndex < learnerLines.length - 1) {
      setItemIndex((value) => value + 1);
      resetItem();
    } else {
      navigate("dialogue");
    }
  }

  function addFailedToWeakBook(userError = transcript || manualText) {
    repo.upsert({
      originalSentence: line.jp,
      userError: userError || "（三次未完成）",
      fixReason: `主动回忆三次未通过：${line.zh}`,
      sceneId: String(scene.id),
      studyDay,
      source: "recall",
      hint: getHint(line.hint),
    });
    refresh();
  }

  function getHint(raw?: string) {
    return (raw || line.kana.slice(0, Math.min(3, line.kana.length))).split("｜")[0];
  }

  async function beginHold() {
    if (phase === "recording") return;
    setError("");
    setPhase("recording");
    startedAt.current = performance.now();
    releaseRequested.current = false;
    try {
      if (!speechRecognitionAvailable()) {
        setError("此浏览器只有文字模式。请先大声说，再输入刚才说出的内容。");
        setPhase("ready");
        return;
      }
      const recognition = startJapaneseRecognition({
        onInterim: setTranscript,
        expected: line.jp,
        timeoutMs: 20_000,
      });
      recognitionRef.current = recognition;
      const recorder = recordingSupported() ? await startRecording().catch(() => null) : null;
      recordingRef.current = recorder;
      const result = await recognition.result;
      const recording = recorder ? await recorder.stop() : null;
      if (recording?.blob.size) {
        const objectUrl = URL.createObjectURL(recording.blob);
        setRecordingUrl(objectUrl);
        await saveRecording({
          id: crypto.randomUUID(),
          sessionId: `recall-${scene.id}-${studyDay}`,
          blob: recording.blob,
          mimeType: recording.blob.type,
          durationMs: recording.durationMs,
          createdAt: Date.now(),
        }).catch(() => undefined);
      }
      setTranscript(result.transcript);
      setAlternatives(result.alternatives);
      setPhase("confirm");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "没有识别到日语");
      setPhase("ready");
    } finally {
      recognitionRef.current = null;
      recordingRef.current = null;
    }
  }

  function endHold() {
    releaseRequested.current = true;
    recognitionRef.current?.stop();
  }

  function scoreAnswer(value = transcript) {
    const latencyMs = Math.max(0, performance.now() - startedAt.current);
    const result = scoreRecall({
      expected: line.jp,
      expectedKana: line.kana,
      transcript: value,
      latencyMs,
      durationMs: Math.max(1200, value.length * 250),
    });
    const attempt: Attempt = {
      timestamp: Date.now(),
      userAudio: "",
      transcript: value,
      score: result.overall,
      latencyMs,
      textScore: result.textScore,
      deliveryScore: result.deliveryScore,
    };
    setAttempts((items) => [...items, attempt]);
    setScore(result);
    setPhase("scored");
    if (isRecallPassing(result)) {
      updateSession({ masteredCount: (readSession()?.masteredCount ?? 0) + 1 });
    } else {
      updateSession({ struggleCount: (readSession()?.struggleCount ?? 0) + 1 });
    }
    if (attempts.length + 1 >= 2) setShowKana(true);
    if (attempts.length + 1 >= 3 && !isRecallPassing(result)) addFailedToWeakBook(value);
  }

  return (
    <Page eyebrow={`3 MIN · 主动回忆 ${itemIndex + 1}/${learnerLines.length}`} title={line.zh} back={() => navigate("home")}>
      <section className={`recall-stage ${phase}`}>
        <p className="recall-instruction">闭眼，把日语说完整。没有假名提示。</p>
        {phase === "ready" && (
          <>
            <button
              className="mic-orb"
              onPointerDown={(event) => { event.preventDefault(); void beginHold(); }}
              onPointerUp={endHold}
              onPointerCancel={endHold}
              onPointerLeave={endHold}
              aria-label="按住说话，松开结束"
            >
              <span>●</span>
            </button>
            <p className="hold-hint">按住说话 · 松开识别</p>
            <input
              className="text-fallback"
              value={manualText}
              onChange={(event) => setManualText(event.target.value)}
              placeholder="识别不可用时：先说出，再输入刚才说的日语"
            />
            {manualText.trim() && <button className="text-button" onClick={() => { startedAt.current = performance.now(); setTranscript(manualText); scoreAnswer(manualText); }}>提交文字</button>}
          </>
        )}
        {phase === "recording" && <div className="recording-state"><i /> 正在听你说…</div>}
        {phase === "confirm" && (
          <div className="confirm-panel">
            <span>识别结果 · 请确认或直接修改错字</span>
            <textarea value={transcript} onChange={(event) => setTranscript(event.target.value)} />
            {alternatives.length > 1 && (
              <div className="alternative-list">
                {alternatives.map((item, index) => <button key={`${item}-${index}`} onClick={() => setTranscript(item)}>{item}</button>)}
              </div>
            )}
            {recordingUrl && <audio controls src={recordingUrl} />}
            <PrimaryButton onClick={() => scoreAnswer(transcript)} disabled={!transcript.trim()}>识别正确，开始评分</PrimaryButton>
          </div>
        )}
        {phase === "scored" && score && (
          <div className={`score-panel ${mastered ? "pass" : "fail"}`}>
            <div className="score-main">{Math.round(score.overall * 100)}</div>
            <div className="score-parts">
              <span>文本 {Math.round(score.textScore * 100)}</span>
              <span>反应 {Math.round(score.latencyScore * 100)}</span>
              <span>节奏代理 {Math.round(score.deliveryScore * 100)}</span>
            </div>
            <p>“节奏代理”来自录音时长与句长比例，不是音素级发音评分。</p>
            <div className="attempt-line">尝试 {attempts.length}/3</div>
          </div>
        )}
      </section>

      {transcript && <div className="transcript-box"><span>识别结果</span><b>{transcript}</b></div>}
      {error && <p className="inline-error">{error}</p>}

      {!mastered && phase !== "recording" && phase !== "confirm" && (
        <div className="hint-row">
          <button className="secondary-button" onClick={() => setShowHint(true)}>卡住了 · 给 1 个关键词</button>
          {showHint && <div className="hint-fragment">{getHint(line.hint)}</div>}
          {showKana && <div className="kana-reveal">{line.kana}</div>}
        </div>
      )}

      {phase === "scored" && mastered && (
        <div className="success-bar">
          <b>种下了 ✓</b>
          <PrimaryButton onClick={nextItem}>{itemIndex === learnerLines.length - 1 ? "进入高压对话" : "下一句"}</PrimaryButton>
        </div>
      )}
      {phase === "scored" && !mastered && attempts.length < 3 && (
        <PrimaryButton onClick={() => { setPhase("ready"); setScore(null); setTranscript(""); }}>再试一次</PrimaryButton>
      )}
      {finalFailure && (
        <div className="failure-bar">
          <b>今天未掌握 · 已进入弱点本</b>
          <PrimaryButton onClick={nextItem}>{itemIndex === learnerLines.length - 1 ? "进入对话" : "下一句"}</PrimaryButton>
        </div>
      )}
    </Page>
  );
}
