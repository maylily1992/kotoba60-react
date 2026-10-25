import {
  dialogueAudio,
  grammarAudio,
  grammarModuleForScene,
  naturalAudio,
  verbsForScene,
  EXTRA_VERB_FORMS,
  FORM_GUIDE,
} from "../data";
import type { Scene } from "../types";

export interface FriendExpression {
  tone: "稳稳说" | "暖暖接" | "往前推";
  subtitle: string;
  jp: string;
  kana: string;
  zh: string;
  when: string;
  difference: string;
  grammar: string;
  audio: string;
  sourceIndex: number;
}

export interface FriendLesson {
  scene: Scene;
  intent: string;
  question: string;
  expressions: FriendExpression[];
  grammarTitle: string;
  grammarCore: string;
  caution: string;
  dialogue: Scene["dialogue"];
  words: Scene["words"];
  grammarExamples: Array<{ jp: string; kana: string; zh: string }>;
  grammarExampleAudio: string[];
  verbLabs: Array<{
    id: string;
    word: string;
    kana: string;
    meaning: string;
    group: string;
    example: { jp: string; kana: string; zh: string };
    forms: Array<{ label: string; jp: string; use: string }>;
  }>;
}

export function buildFriendLesson(scene: Scene): FriendLesson {
  const learners = scene.dialogue
    .map((line, index) => ({ line, index }))
    .filter((item) => item.line.side === "learner");
  const safe = learners[0];
  const push = learners.at(-1) ?? learners[1] ?? learners[0];
  const warm = scene.natural[0];
  const grammarModule = grammarModuleForScene(scene.id);
  const verbLabs = verbsForScene(scene.id).map((raw) => {
    const verb = raw as {
      id: string;
      word: string;
      kana: string;
      meaning: string;
      group: string;
      example: { jp: string; kana: string; zh: string };
      forms: Record<string, [string, string]>;
    };
    const mergedForms = {
      ...verb.forms,
      ...((EXTRA_VERB_FORMS as unknown as Record<string, Record<string, [string, string]>>)[verb.id] ?? {}),
    };
    return {
      id: verb.id,
      word: verb.word,
      kana: verb.kana,
      meaning: verb.meaning,
      group: verb.group,
      example: verb.example,
      forms: ["masu", "te", "nai", "potential", "ba", "passive"].map((key) => ({
        label: (FORM_GUIDE as Record<string, { label: string; use: string }>)[key].label,
        jp: mergedForms[key]?.[0] ?? "",
        use: (FORM_GUIDE as Record<string, { label: string; use: string }>)[key].use,
      })),
    };
  });
  return {
    scene,
    intent: scene.goal,
    question: `ハル带你来练习「${scene.category}」。你希望对方听懂你的意思，又不想显得生硬。先选哪一句？`,
    expressions: [
      {
        tone: "稳稳说",
        subtitle: "先把事情完成",
        jp: safe.line.jp,
        kana: safe.line.kana,
        zh: safe.line.zh,
        when: "第一次和店员、陌生人说话，或你不确定该多亲近时。",
        difference: "信息完整、礼貌安全，重点是让对方迅速知道你的需求。",
        grammar: `${scene.grammar.title}：${scene.grammar.explain}`,
        audio: dialogueAudio(scene.id, safe.index),
        sourceIndex: safe.index,
      },
      {
        tone: "暖暖接",
        subtitle: "先接住对方",
        jp: warm.jp,
        kana: warm.kana,
        zh: warm.zh,
        when: "对方刚说完一件事、你想表示听懂了，或气氛需要放松时。",
        difference: `它不一定新增任务信息，而是让对话“有人味”。${warm.note}`,
        grammar: "重点是反应语和省略。日常会话里，先接一句再问，比直接进入下一个请求更自然。",
        audio: naturalAudio(scene.id, 0),
        sourceIndex: 0,
      },
      {
        tone: "往前推",
        subtitle: "让对话继续",
        jp: push.line.jp,
        kana: push.line.kana,
        zh: push.line.zh,
        when: "对方已经理解你之后，用追问、确认或下一步动作维持交流。",
        difference: "它把主动权往前推，让交流从“答完”变成“继续”。",
        grammar: `${scene.grammar.title}的延伸：用问题或行动句收尾，避免只回答一个字。`,
        audio: dialogueAudio(scene.id, push.index),
        sourceIndex: push.index,
      },
    ],
    grammarTitle: scene.grammar.title,
    grammarCore: scene.grammar.explain,
    caution: scene.grammar.caution,
    dialogue: scene.dialogue,
    words: scene.words,
    grammarExamples: grammarModule.examples,
    grammarExampleAudio: grammarModule.examples.map((_, index) => grammarAudio(grammarModule.id, index)),
    verbLabs,
  };
}
