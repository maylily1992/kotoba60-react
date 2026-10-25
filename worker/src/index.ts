import { STRUCTURED_REPLY_SCHEMA } from "../../src/lib/ai";

interface Env {
  OPENAI_API_KEY: string;
  OPENAI_MODEL: string;
  ALLOWED_ORIGIN: string;
}

interface RequestBody {
  scene?: { title?: string; goal?: string };
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  transcript?: string;
  struggleCount?: number;
  memory?: string[];
}

const SYSTEM_PROMPT = `You are a Japanese role-play partner named Haruto.
Return only JSON matching the provided schema.
Rules:
- Use natural Japanese at N4-N3 level.
- Continue the scene in one or two short turns and end with one question.
- Do not praise, grade, or explain grammar in reply_ja.
- Never return more than two fixes.
- Correction priority: politeness > particle > verb > fluency/vocab.
- A hint is exactly one keyword or short fragment, never the full answer.
- After two consecutive struggles, switch to simpler Japanese.
- The user's transcript is speech-recognition output; do not claim it is exact audio evidence.`;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const cors = {
      "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    };
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    if (request.method !== "POST") {
      return Response.json({ error: "Method not allowed" }, { status: 405, headers: cors });
    }
    if (!env.OPENAI_API_KEY || !env.OPENAI_MODEL) {
      return Response.json({ error: "Worker environment not configured" }, { status: 503, headers: cors });
    }
    try {
      const body = (await request.json()) as RequestBody;
      const scene = body.scene ?? {};
      const history = Array.isArray(body.history) ? body.history.slice(-10) : [];
      const struggleCount = Math.max(0, Number(body.struggleCount) || 0);
      const userContent = [
        `Scene: ${scene.title ?? "daily conversation"} / ${scene.goal ?? ""}`,
        `Consecutive struggles: ${struggleCount}`,
        ...(Array.isArray(body.memory) ? body.memory.slice(-5).map((item) => `Role memory: ${item}`) : []),
        struggleCount >= 2 ? "Use simpler Japanese mode." : "",
        `User transcript: ${body.transcript ?? ""}`,
      ].filter(Boolean).join("\n");

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: env.OPENAI_MODEL,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...history,
            { role: "user", content: userContent },
          ],
          response_format: {
            type: "json_schema",
            json_schema: STRUCTURED_REPLY_SCHEMA,
          },
          temperature: 0.7,
        }),
      });
      if (!response.ok) {
        return Response.json(
          { error: `OpenAI API returned ${response.status}` },
          { status: 502, headers: cors },
        );
      }
      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error("Empty completion");
      return new Response(content, {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    } catch (error) {
      return Response.json(
        { error: error instanceof Error ? error.message : "Unknown error" },
        { status: 400, headers: cors },
      );
    }
  },
};
