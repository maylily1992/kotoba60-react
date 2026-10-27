export type LineScope = "core" | "related" | "extension";

export interface CuratedLine {
  id: string;
  jp: string;
  kana: string;
  zh: string;
  speaker: string;
  function: string;
  grammar: string;
  note: string;
  sourceId?: string;
  scope?: LineScope;
}

export interface CuratedMicroScene {
  title: string;
  setting: string;
  lines: CuratedLine[];
}

export interface CuratedWord {
  jp: string;
  kana: string;
  zh: string;
  note?: string;
}

export interface CuratedGrammar {
  title: string;
  formula: string;
  explain: string;
  useWhen: string;
  contrast: string;
  mistake: string;
  example: string;
  kana: string;
}

export interface DaySource {
  name: string;
  license: string;
  url: string;
}

export interface CuratedDay {
  day: number;
  week: number;
  title: string;
  scene: string;
  goal: string;
  microScenes: CuratedMicroScene[];
  words: CuratedWord[];
  grammar: CuratedGrammar[];
  transfers: string[];
  anchors?: CuratedLine[];
  source?: DaySource;
}

export interface DayMeta {
  day: number;
  week: number;
  title: string;
  scene: string;
  goal: string;
}
