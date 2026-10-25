import { useRef, useState } from "react";
import { speechRecognitionAvailable, startJapaneseRecognition } from "../lib/speech";
import type { RecognitionController } from "../lib/speech";

export function MicDiagnostics() {
  const [status, setStatus] = useState("尚未测试");
  const [detail, setDetail] = useState("");
  const controllerRef = useRef<RecognitionController | null>(null);
  const supported = speechRecognitionAvailable();

  function begin() {
    setStatus("正在听…");
    setDetail("");
    try {
      const controller = startJapaneseRecognition({
        onInterim: (text) => setDetail(text),
        timeoutMs: 10_000,
      });
      controllerRef.current = controller;
      controller.result
        .then((result) => {
          setStatus(`识别成功 · ${Math.round(result.confidence * 100)}% 置信度`);
          setDetail(result.transcript);
        })
        .catch((error) => {
          setStatus("识别失败");
          setDetail(error instanceof Error ? error.message : "未知错误");
        });
    } catch (error) {
      setStatus("浏览器不支持");
      setDetail(error instanceof Error ? error.message : "请使用 Safari 或 Chrome");
    }
  }

  function end() {
    controllerRef.current?.stop();
    controllerRef.current = null;
  }

  return (
    <details className="mic-diagnostics">
      <summary>麦克风识别有问题？打开诊断</summary>
      <div className="diagnostic-body">
        <div><span>语音识别 API</span><b>{supported ? "可用" : "不可用"}</b></div>
        <div><span>安全连接</span><b>{window.isSecureContext ? "HTTPS" : "非 HTTPS"}</b></div>
        <div><span>运行模式</span><b>{window.matchMedia("(display-mode: standalone)").matches ? "主屏幕 App" : "浏览器页面"}</b></div>
        <p>识别失败时：iPhone 请确认“设置 → 通用 → 键盘 → 启用听写”，并优先用 Safari 打开；Android 优先用 Chrome。</p>
        <button
          className="diagnostic-mic"
          onPointerDown={(event) => {
            event.preventDefault();
            event.currentTarget.setPointerCapture(event.pointerId);
            begin();
          }}
          onPointerUp={(event) => {
            event.preventDefault();
            end();
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
              event.currentTarget.releasePointerCapture(event.pointerId);
            }
          }}
          onPointerCancel={end}
          onContextMenu={(event) => event.preventDefault()}
        >
          按住说「こんにちは」· 松开
        </button>
        <div className="diagnostic-result"><b>{status}</b><span>{detail}</span></div>
      </div>
    </details>
  );
}
