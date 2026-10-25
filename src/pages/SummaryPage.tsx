import { useMemo } from "react";
import { Page, PrimaryButton } from "../components/Page";
import { readSession } from "../lib/session";
import type { PageProps } from "./types";

export function SummaryPage({ scene, studyDay, repo, navigate }: PageProps) {
  const session = useMemo(readSession, []);
  const due = repo.due(studyDay);
  const active = repo.active();
  return (
    <Page eyebrow="2 MIN · 今日总结" title="不庆祝，只确认留下了什么。" back={() => navigate("home")}>
      <section className="summary-numbers">
        <div><b>{session?.masteredCount ?? 0}</b><span>种下</span></div>
        <div><b>{active.length}</b><span>待回收</span></div>
        <div><b>{session?.fixes.length ?? 0}</b><span>致命错误</span></div>
      </section>
      <section className="summary-scene">
        <span>DAY {String(scene.id).padStart(2, "0")}</span>
        <h2>{scene.title}</h2>
        <p>{scene.goal}</p>
      </section>
      <section className="tomorrow-card">
        <small>明天开头 2 分钟</small>
        <h3>{due.length ? `${due.length} 道弱点抢答题在等你` : "明天没有到期弱点"}</h3>
        <p>答对延长间隔；答错只回到 1 天，不追加惩罚。</p>
      </section>
      <PrimaryButton onClick={() => navigate("review")} disabled={!due.length}>现在先看一遍弱点</PrimaryButton>
      <div className="secondary-actions">
        <button onClick={() => navigate("notebook")}>打开弱点本</button>
        <button onClick={() => navigate("home")}>结束今天</button>
      </div>
    </Page>
  );
}
