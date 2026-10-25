import { useEffect, useMemo } from "react";
import { Page, PrimaryButton } from "../components/Page";
import { readSession } from "../lib/session";
import type { PageProps } from "./types";

const focusLabel: Record<string, string> = {
  politeness: "语体",
  particle: "助词",
  verb: "动词",
  vocab: "词汇",
  fluency: "流畅",
};

export function FeedbackPage({ scene, studyDay, repo, navigate, refresh }: PageProps) {
  const session = useMemo(readSession, []);
  const fixes = session?.fixes.slice(0, 2) ?? [];

  useEffect(() => {
    if (!session) return;
    for (const fix of fixes) {
      repo.upsert({
        originalSentence: fix.natural,
        userError: fix.bad,
        fixReason: fix.why,
        sceneId: String(scene.id),
        studyDay,
        source: "dialogue",
      });
    }
    refresh();
  }, []);

  return (
    <Page eyebrow="5 MIN · 精准纠错" title="只处理最致命的两处。" back={() => navigate("home")}>
      {fixes.length === 0 ? (
        <section className="feedback-empty">
          <div>0</div>
          <h2>这一轮没有确认到可归因错误</h2>
          <p>浏览器只提供转写文本；没有证据时，不制造“AI 觉得你有问题”的假纠错。</p>
          <PrimaryButton onClick={() => navigate("repeat")}>换角色重说</PrimaryButton>
        </section>
      ) : (
        <div className="fix-list">
          {fixes.map((fix, index) => (
            <article className="fix-card" key={`${fix.bad}-${index}`}>
              <div className="fix-index">0{index + 1}</div>
              <span className="focus-tag">{focusLabel[fix.focus] ?? fix.focus}</span>
              <div><small>你说的</small><b>{fix.bad}</b></div>
              <div className="natural-line"><small>这样说更自然</small><b>{fix.natural}</b></div>
              <p>{fix.why}</p>
            </article>
          ))}
          <PrimaryButton onClick={() => navigate("repeat")}>用新说法再试一次</PrimaryButton>
        </div>
      )}
    </Page>
  );
}
