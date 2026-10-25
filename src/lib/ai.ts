import type { AiStructuredReply, FixItem, FixFocus } from "../types";

const focusPriority: Record<string, number> = {
  politeness: 0,
  particle: 1,
  verb: 2,
  vocab: 3,
  fluency: 4,
};

const validFocus = new Set<FixFocus>(["particle", "verb", "politeness", "fluency", "vocab"]);

export const STRUCTURED_REPLY_SCHEMA = {
  name: "kotoba60_turn",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["reply_ja", "fix", "hint", "emotion"],
    properties: {
      reply_ja: { type: "string" },
      fix: {
        type: "array",
        maxItems: 2,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["bad", "why", "natural", "focus"],
          properties: {
            bad: { type: "string" },
            why: { type: "string" },
            natural: { type: "string" },
            focus: {
              type: "string",
              enum: ["particle", "verb", "politeness", "fluency", "vocab"],
            },
          },
        },
      },
      hint: { type: "string" },
      emotion: {
        type: "string",
        enum: ["neutral", "confused", "encouraging", "impatient"],
      },
    },
  },
} as const;

export function validateStructuredReply(value: unknown): AiStructuredReply {
  if (!value || typeof value !== "object") throw new Error("AI 返回不是对象");
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.reply_ja !== "string" || !candidate.reply_ja.trim()) {
    throw new Error("AI 返回缺少 reply_ja");
  }
  const fixes = Array.isArray(candidate.fix)
    ? candidate.fix
        .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
        .filter(
          (item) =>
            typeof item.bad === "string" &&
            typeof item.why === "string" &&
            typeof item.natural === "string" &&
            typeof item.focus === "string" &&
            validFocus.has(item.focus as FixFocus),
        )
        .map(
          (item): FixItem => ({
            bad: item.bad as string,
            why: item.why as string,
            natural: item.natural as string,
            focus: item.focus as FixFocus,
          }),
        )
        .sort((a, b) => (focusPriority[a.focus] ?? 9) - (focusPriority[b.focus] ?? 9))
        .slice(0, 2)
    : [];
  const emotion = ["neutral", "confused", "encouraging", "impatient"].includes(String(candidate.emotion))
    ? (candidate.emotion as AiStructuredReply["emotion"])
    : "neutral";
  return {
    reply_ja: candidate.reply_ja,
    fix: fixes,
    hint: typeof candidate.hint === "string" ? candidate.hint : "",
    emotion,
  };
}

export async function requestAiTurn(input: {
  proxyUrl: string;
  sceneTitle: string;
  sceneGoal: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  transcript: string;
  struggleCount: number;
  memory: string[];
}): Promise<AiStructuredReply> {
  if (!input.proxyUrl) throw new Error("未配置 AI 代理");
  const response = await fetch(input.proxyUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      scene: { title: input.sceneTitle, goal: input.sceneGoal },
      history: input.history,
      transcript: input.transcript,
      struggleCount: input.struggleCount,
      memory: input.memory,
    }),
  });
  if (!response.ok) throw new Error(`AI 代理返回 ${response.status}`);
  return validateStructuredReply(await response.json());
}
