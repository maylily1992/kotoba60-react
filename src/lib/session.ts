import type { DialogueTurn, FixItem, SessionFeedback } from "../types";

const SESSION_KEY = "kotoba60:session:v1";

export interface ActiveSession {
  id: string;
  sceneId: number;
  studyDay: number;
  startedAt: number;
  turns: DialogueTurn[];
  fixes: FixItem[];
  masteredCount: number;
  struggleCount: number;
}

function newId() {
  return globalThis.crypto?.randomUUID?.() ?? `session-${Date.now()}`;
}

export function createSession(sceneId: number, studyDay: number): ActiveSession {
  const session: ActiveSession = {
    id: newId(),
    sceneId,
    studyDay,
    startedAt: Date.now(),
    turns: [],
    fixes: [],
    masteredCount: 0,
    struggleCount: 0,
  };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function readSession(): ActiveSession | null {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ActiveSession;
  } catch {
    return null;
  }
}

export function updateSession(patch: Partial<ActiveSession>): ActiveSession {
  const current = readSession() ?? createSession(0, 0);
  const next = { ...current, ...patch };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(next));
  return next;
}

export function addTurn(turn: DialogueTurn) {
  const current = readSession();
  if (!current) return;
  updateSession({ turns: [...current.turns, turn].slice(-40) });
}

export function addFixes(fixes: FixItem[]) {
  const current = readSession();
  if (!current) return;
  const existing = new Set(current.fixes.map((fix) => `${fix.bad}|${fix.natural}`));
  const next = [...current.fixes];
  for (const fix of fixes) {
    const key = `${fix.bad}|${fix.natural}`;
    if (!existing.has(key) && next.length < 2) {
      next.push(fix);
      existing.add(key);
    }
  }
  updateSession({ fixes: next });
}

export function finishSession(extra?: Partial<SessionFeedback>) {
  const current = readSession();
  if (!current) return null;
  return {
    sessionId: current.id,
    dayIndex: current.studyDay,
    fixes: current.fixes.slice(0, 2),
    masteredCount: current.masteredCount,
    struggleCount: current.struggleCount,
    totalTurns: current.turns.length,
    weakPoints: current.fixes.map((fix) => fix.focus),
    ...extra,
  } satisfies SessionFeedback;
}
