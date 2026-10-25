import { DAILY_SCENES } from "./scenes.js";
import {
  FORM_GUIDE,
  GRAMMAR_MODULES,
  VERB_BANK,
  SCENE_VERB_IDS,
  EXTRA_VERB_FORMS,
} from "./grammar.js";
import type { Scene } from "../types";

export const SCENES = DAILY_SCENES as Scene[];
export const AUDIO_BASE = `${import.meta.env.BASE_URL}audio/`;
export { FORM_GUIDE, GRAMMAR_MODULES, VERB_BANK, SCENE_VERB_IDS, EXTRA_VERB_FORMS };

export function dialogueAudio(sceneId: number, index: number) {
  return `${AUDIO_BASE}s${String(sceneId).padStart(2, "0")}-l${index + 1}.mp3`;
}

export function naturalAudio(sceneId: number, index: number) {
  return `${AUDIO_BASE}s${String(sceneId).padStart(2, "0")}-n${index + 1}.mp3`;
}

export function grammarAudio(moduleId: string, index: number) {
  return `${AUDIO_BASE}grammar-${moduleId}-${index + 1}.mp3`;
}

export function verbAudio(verbId: string) {
  return `${AUDIO_BASE}verb-${verbId}.mp3`;
}

export function grammarModuleForScene(sceneId: number) {
  return GRAMMAR_MODULES[(sceneId - 1) % GRAMMAR_MODULES.length] as {
    id: string;
    title: string;
    premise: string;
    examples: Array<{ jp: string; kana: string; zh: string }>;
  };
}

export function verbsForScene(sceneId: number) {
  return ((SCENE_VERB_IDS as string[][])[sceneId - 1] ?? [])
    .map((id) => (VERB_BANK as Array<Record<string, unknown>>).find((verb) => verb.id === id))
    .filter(Boolean);
}
