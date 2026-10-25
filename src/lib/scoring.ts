import type { RecallScore } from "../types";

function normalizeJapanese(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[、。！？!?「」『』（）()\s・,.]/g, "")
    .toLowerCase();
}

function levenshtein(a: string, b: string) {
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = previous[0];
    previous[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const temporary = previous[j];
      previous[j] = Math.min(
        previous[j] + 1,
        previous[j - 1] + 1,
        diagonal + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      diagonal = temporary;
    }
  }
  return previous[b.length];
}

export function textSimilarity(expected: string, actual: string) {
  const a = normalizeJapanese(expected);
  const b = normalizeJapanese(actual);
  if (!a && !b) return 1;
  const distance = levenshtein(a, b);
  return Math.max(0, 1 - distance / Math.max(a.length, b.length, 1));
}

export function scoreRecall(input: {
  expected: string;
  transcript: string;
  latencyMs: number;
  durationMs: number;
}): RecallScore {
  const textScore = textSimilarity(input.expected, input.transcript);
  const latencyScore = Math.max(0, Math.min(1, 1 - Math.max(0, input.latencyMs - 1_000) / 6_000));
  const expectedDuration = Math.max(1_500, normalizeJapanese(input.expected).length * 180);
  const durationRatio = input.durationMs / expectedDuration;
  const deliveryScore = Math.max(0, 1 - Math.min(1, Math.abs(1 - durationRatio)));
  const overall = textScore * 0.65 + latencyScore * 0.2 + deliveryScore * 0.15;
  return {
    overall: Number(overall.toFixed(3)),
    textScore: Number(textScore.toFixed(3)),
    latencyScore: Number(latencyScore.toFixed(3)),
    deliveryScore: Number(deliveryScore.toFixed(3)),
  };
}

export function isRecallPassing(score: RecallScore) {
  return score.textScore >= 0.65 && score.overall >= 0.6;
}
