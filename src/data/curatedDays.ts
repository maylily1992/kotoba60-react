import { CURATED_DAY_ONE } from "./curatedScene";
import type { CuratedDay, CuratedLine, DayMeta } from "./curatedDayTypes";
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
const cache = new Map<number, CuratedDay>([[1, DAY_ONE]]);

export async function loadCuratedDay(day: number): Promise<CuratedDay> {
  const cached = cache.get(day);
  if (cached) return cached;
  const key = `./generated/day-${String(day).padStart(2, "0")}.ts`;
  const loader = modules[key];
  if (!loader) throw new Error(`没有找到第 ${day} 天课程`);
  const loaded = (await loader()).default;
  cache.set(day, loaded);
  return loaded;
}

export const TOTAL_DAY_COUNT = DAY_META.length;
