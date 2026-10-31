import { CURATED_DAY_ONE } from "./curatedScene";
import type { CuratedDay, CuratedLine, DayMeta, LineToken } from "./curatedDayTypes";
import { DAY_META } from "./generated/manifest";

export { DAY_META };
export type { CuratedDay, CuratedLine, DayMeta };

const DAY_ONE: CuratedDay = {
  ...CURATED_DAY_ONE,
  week: 1,
  microScenes: CURATED_DAY_ONE.microScenes.map((micro, microIndex) => ({
    ...micro,
    lines: micro.lines.map((line, lineIndex) => ({
      ...line,
      id: `d01-l${String(
        CURATED_DAY_ONE.microScenes
          .slice(0, microIndex)
          .reduce((count, item) => count + item.lines.length, 0) +
          lineIndex +
          1,
      ).padStart(3, "0")}`,
      sourceId: `manual-d01-${microIndex + 1}-${lineIndex + 1}`,
      scope: "core",
    })),
  })),
  source: {
    name: "Kotoba60 hand-authored scene",
    license: "Original",
    url: "https://maylily1992.github.io/kotoba60-react/",
  },
};

const modules = import.meta.glob<{ default: CuratedDay }>("./generated/day-*.ts");
const tokenModules = import.meta.glob<{ default: Record<string, LineToken[]> }>(
  "./tokens/day-*.ts",
);
const cache = new Map<number, CuratedDay>();

export async function loadCuratedDay(day: number): Promise<CuratedDay> {
  const cached = cache.get(day);
  if (cached) return cached;
  if (day === 1) {
    const tokenLoader = tokenModules["./tokens/day-01.ts"];
    const tokenPayload = tokenLoader ? await tokenLoader() : { default: {} };
    const result = { ...DAY_ONE, tokens: tokenPayload.default };
    cache.set(day, result);
    return result;
  }
  const key = `./generated/day-${String(day).padStart(2, "0")}.ts`;
  const loader = modules[key];
  if (!loader) throw new Error(`没有找到第 ${day} 天课程`);
  const tokenKey = `./tokens/day-${String(day).padStart(2, "0")}.ts`;
  const tokenLoader = tokenModules[tokenKey];
  const [loaded, tokenPayload] = await Promise.all([
    loader(),
    tokenLoader ? tokenLoader() : Promise.resolve({ default: {} }),
  ]);
  const result = { ...loaded.default, tokens: tokenPayload.default };
  cache.set(day, result);
  return result;
}

export const TOTAL_DAY_COUNT = DAY_META.length;
