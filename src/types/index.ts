export type RecallStatus = "mastered" | "struggling" | "failed";
export type WeakStatus = "active" | "graduated" | "suspended";
export type FixFocus = "particle" | "verb" | "politeness" | "fluency" | "vocab";
export type Emotion = "neutral" | "confused" | "encouraging" | "impatient";

export interface Attempt {
  timestamp: number;
  userAudio: string;
  transcript: string;
  score: number;
  latencyMs: number;
  textScore?: number;
  deliveryScore?: number;
}

export interface RecallItem {
  id: string;
  sceneId: string;
  cn: string;
  ja: string;
  kana?: string;
  hint: string;
  attempts: Attempt[];
  status: RecallStatus;
  bestTimeMs: number;
}

export interface FixItem {
  bad: string;
  why: string;
  natural: string;
  focus: FixFocus;
}

export interface DialogueTurn {
  speaker: "user" | "ai";
  textJa: string;
  textCn?: string;
  audioUrl?: string;
  userTranscript?: string;
  fix?: FixItem[];
  hint?: string;
  emotion?: Emotion;
}

export interface ReviewResult {
  date: number;
  studyDay: number;
  quality: 0 | 1 | 2 | 3 | 4 | 5;
  responseTimeMs: number;
  userTranscript: string;
}

export interface WeakItem {
  id: string;
  originalSentence: string;
  userError: string;
  fixReason: string;
  sceneId: string;
  dayAdded: number;
  nextReviewDay: number;
  interval: number;
  easeFactor: number;
  reviewHistory: ReviewResult[];
  status: WeakStatus;
  createdAt: number;
  updatedAt: number;
  source: "recall" | "dialogue" | "repeat" | "manual";
  hint?: string;
}

export interface SessionFeedback {
  sessionId: string;
  dayIndex: number;
  fixes: FixItem[];
  masteredCount: number;
  struggleCount: number;
  totalTurns: number;
  weakPoints: string[];
}

export interface SceneLine {
  side: "partner" | "learner";
  speaker: string;
  jp: string;
  kana: string;
  zh: string;
  hint?: string;
}

export interface Vocabulary {
  jp: string;
  kana: string;
  zh: string;
  note: string;
}

export interface GrammarExample {
  jp: string;
  kana: string;
  zh: string;
}

export interface Scene {
  id: number;
  week: number;
  day: number;
  category: string;
  title: string;
  place: string;
  goal: string;
  dialogue: SceneLine[];
  words: Vocabulary[];
  grammar: {
    title: string;
    explain: string;
    examples: GrammarExample[];
    caution: string;
  };
  attention: string[];
  natural: Array<{ jp: string; kana: string; zh: string; note: string }>;
  variations: Array<{ setup: string; task: string }>;
}

export interface AiStructuredReply {
  reply_ja: string;
  fix: FixItem[];
  hint: string;
  emotion: Emotion;
}

export interface WeakBookState {
  version: number;
  items: WeakItem[];
}

export interface SchemaMeta {
  version: number;
  createdAt: number;
  studyDayZero: string;
  migratedAt?: number;
}

export interface RecallScore {
  overall: number;
  textScore: number;
  latencyScore: number;
  deliveryScore: number;
}

export interface UserFact {
  id: string;
  key: string;
  value: string;
  evidence: string;
  confirmed: boolean;
  updatedAt: number;
}
