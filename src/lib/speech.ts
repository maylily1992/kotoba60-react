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

export function recognizeJapanese(options?: {
  onInterim?: (text: string) => void;
  timeoutMs?: number;
}): Promise<{ transcript: string; confidence: number }> {
  const Constructor = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Constructor) {
    return Promise.reject(new Error("当前浏览器不支持 Web Speech 日语识别"));
  }
  return new Promise((resolve, reject) => {
    const recognition = new Constructor();
    recognition.lang = "ja-JP";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 3;
    let finalText = "";
    let confidence = 0;
    const timeout = window.setTimeout(() => recognition.abort(), options?.timeoutMs ?? 12_000);

    recognition.onresult = (event) => {
      const result = event.results[event.results.length - 1];
      const best = result[0];
      if (!result.isFinal) {
        options?.onInterim?.(best.transcript);
        return;
      }
      finalText = best.transcript;
      confidence = best.confidence;
    };
    recognition.onerror = (event) => {
      window.clearTimeout(timeout);
      reject(new Error(`语音识别失败：${event.error}`));
    };
    recognition.onend = () => {
      window.clearTimeout(timeout);
      if (!finalText) reject(new Error("没有识别到日语，请再说一次"));
      else resolve({ transcript: finalText, confidence });
    };
    recognition.start();
  });
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
