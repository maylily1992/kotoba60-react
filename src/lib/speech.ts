interface RecognitionAlternative {
  transcript: string;
  confidence: number;
}
interface RecognitionResult {
  isFinal: boolean;
  length: number;
  [index: number]: RecognitionAlternative;
}
interface RecognitionEvent {
  results: { length: number; [index: number]: RecognitionResult };
}
interface RecognitionErrorEvent {
  error: string;
}
interface BrowserRecognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type RecognitionConstructor = new () => BrowserRecognition;

declare global {
  interface Window {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  }
}

export function speechRecognitionAvailable() {
  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export interface RecognitionController {
  result: Promise<{
    transcript: string;
    confidence: number;
    alternatives: string[];
  }>;
  stop: () => void;
  abort: () => void;
}

export function startJapaneseRecognition(options?: {
  onInterim?: (text: string) => void;
  expected?: string;
  timeoutMs?: number;
}): RecognitionController {
  const Constructor = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Constructor) {
    throw new Error("当前浏览器不支持 Web Speech 日语识别");
  }
  const recognition = new Constructor();
  recognition.lang = "ja-JP";
  recognition.interimResults = true;
  // Short, push-to-talk utterances finalize more reliably with a single-result session.
  recognition.continuous = false;
  recognition.maxAlternatives = 5;

  let finalText = "";
  let confidence = 0;
  let alternatives: string[] = [];
  let interimText = "";
  let settled = false;
  let timeout = 0;
  let stopFallback = 0;
  let resolvePromise!: RecognitionController["result"] extends Promise<infer T> ? (value: T) => void : never;
  let rejectPromise!: (reason?: unknown) => void;
  const result = new Promise<{
    transcript: string;
    confidence: number;
    alternatives: string[];
  }>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });

  const finish = (sessionError?: string) => {
    if (settled) return;
    settled = true;
    window.clearTimeout(timeout);
    window.clearTimeout(stopFallback);
    if (finalText || alternatives.length || interimText) {
      resolvePromise({
        transcript: alternatives[0] || finalText || interimText,
        confidence,
        alternatives: alternatives.length ? alternatives : [interimText],
      });
    } else if (sessionError) {
      rejectPromise(new Error(sessionError));
    } else {
      rejectPromise(new Error("没有听到完整日语。请靠近麦克风，稍停一下再说。"));
    }
  };

  recognition.onresult = (event) => {
    const latest = event.results[event.results.length - 1];
    const candidates = Array.from({ length: latest.length }, (_, index) => latest[index].transcript.trim()).filter(Boolean);
    if (!latest.isFinal) {
      interimText = candidates[0] || interimText;
      options?.onInterim?.(interimText);
      return;
    }
    const best = latest[0];
    finalText = `${finalText} ${best.transcript}`.trim();
    confidence = Math.max(confidence, best.confidence || 0);
    alternatives = Array.from(new Set([...alternatives, ...candidates])).slice(0, 5);
    interimText = "";
    options?.onInterim?.(alternatives[0]);
  };
  recognition.onerror = (event) => {
    const errors: Record<string, string> = {
      "no-speech": "没有检测到说话声。请看到“正在听”后再开口。",
      "audio-capture": "没有找到麦克风，或系统没有授予麦克风权限。",
      network: "浏览器语音服务暂时不可用，请重试或使用文字校正。",
      "not-allowed": "麦克风权限被拒绝。请在浏览器设置中允许麦克风。",
      aborted: "本次识别已中止。",
    };
    finish(errors[event.error] || `语音识别失败：${event.error}`);
  };
  recognition.onend = () => finish();

  try {
    recognition.start();
  } catch (error) {
    finish(error instanceof Error ? error.message : "无法启动语音识别");
  }
  timeout = window.setTimeout(() => recognition.stop(), options?.timeoutMs ?? 15_000);

  return {
    result,
    stop: () => {
      try {
        recognition.stop();
        stopFallback = window.setTimeout(() => finish(), 650);
      } catch {
        finish();
      }
    },
    abort: () => {
      try { recognition.abort(); } catch { finish(); }
    },
  };
}

export function recognizeJapanese(options?: {
  onInterim?: (text: string) => void;
  expected?: string;
  timeoutMs?: number;
}) {
  return startJapaneseRecognition(options).result;
}

export function recordingSupported() {
  return Boolean(navigator.mediaDevices?.getUserMedia) && "MediaRecorder" in window;
}

export function speakJapanese(text: string, rate = 1) {
  const synth = window.speechSynthesis;
  if (!synth) return;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "ja-JP";
  utterance.rate = Math.min(1.08, Math.max(0.82, rate));
  utterance.pitch = 1.18;
  utterance.volume = 1;
  const japaneseVoices = synth.getVoices().filter((item) => item.lang.toLowerCase().startsWith("ja"));
  const preferred = ["otoya", "takumi", "hattori", "ichiro", "male", "男性"];
  const voice =
    japaneseVoices.find((item) => preferred.some((name) => item.name.toLowerCase().includes(name))) ??
    japaneseVoices[0];
  if (voice) utterance.voice = voice;
  synth.speak(utterance);
}

export async function startRecording(): Promise<{
  stop: () => Promise<{ blob: Blob; durationMs: number }>;
  abort: () => void;
}> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const recorder = new MediaRecorder(stream);
  const chunks: BlobPart[] = [];
  const startedAt = performance.now();
  let stopped: Promise<{ blob: Blob; durationMs: number }> | null = null;
  recorder.ondataavailable = (event) => {
    if (event.data.size) chunks.push(event.data);
  };
  recorder.start();
  return {
    stop: () => {
      if (stopped) return stopped;
      stopped = new Promise((resolve) => {
        const finish = () => {
          stream.getTracks().forEach((track) => track.stop());
          resolve({
            blob: new Blob(chunks, { type: recorder.mimeType || "audio/webm" }),
            durationMs: Math.round(performance.now() - startedAt),
          });
        };
        recorder.addEventListener("stop", finish, { once: true });
        if (recorder.state === "recording") recorder.stop();
        else finish();
      });
      return stopped;
    },
    abort: () => {
      if (stopped) {
        void stopped;
        return;
      }
      stopped = Promise.resolve({
        blob: new Blob(chunks, { type: recorder.mimeType || "audio/webm" }),
        durationMs: Math.round(performance.now() - startedAt),
      });
      if (recorder.state === "recording") recorder.stop();
      stream.getTracks().forEach((track) => track.stop());
    },
  };
}
