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
  grammars?: {
    addFromString(value: string, weight?: number): void;
  };
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type RecognitionConstructor = new () => BrowserRecognition;
type GrammarConstructor = new () => BrowserRecognition["grammars"];

declare global {
  interface Window {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
    SpeechGrammarList?: GrammarConstructor;
    webkitSpeechGrammarList?: GrammarConstructor;
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
  recognition.continuous = true;
  recognition.maxAlternatives = 5;

  const Grammar = window.SpeechGrammarList || window.webkitSpeechGrammarList;
  if (Grammar && recognition.grammars && options?.expected) {
    try {
      recognition.grammars.addFromString(`#JSGF V1.0; grammar phrase; public <phrase> = ${options.expected};`, 0.7);
    } catch {
      // Grammars are optional and browser support varies.
    }
  }

  let finalText = "";
  let confidence = 0;
  let alternatives: string[] = [];
  let settled = false;
  let timeout = 0;
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
    if (finalText || alternatives.length) {
      resolvePromise({
        transcript: alternatives[0] || finalText,
        confidence,
        alternatives,
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
      options?.onInterim?.(candidates[0] || "");
      return;
    }
    const best = latest[0];
    finalText = `${finalText} ${best.transcript}`.trim();
    confidence = Math.max(confidence, best.confidence || 0);
    alternatives = Array.from(new Set([...alternatives, ...candidates])).slice(0, 5);
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
      try { recognition.stop(); } catch { finish(); }
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
  utterance.rate = rate;
  utterance.pitch = 1.18;
  const voice = synth.getVoices().find((item) => item.lang.toLowerCase().startsWith("ja"));
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
  recorder.ondataavailable = (event) => {
    if (event.data.size) chunks.push(event.data);
  };
  recorder.start();
  return {
    stop: () => {
      return new Promise((resolve) => {
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
    },
    abort: () => {
      if (recorder.state === "recording") recorder.stop();
      stream.getTracks().forEach((track) => track.stop());
    },
  };
}
