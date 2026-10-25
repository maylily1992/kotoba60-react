import { useState } from "react";
import { Page } from "../components/Page";
import type { PageProps } from "./types";

export function NotebookPage({ studyDay, repo, navigate, refresh }: PageProps) {
  const [tab, setTab] = useState<"active" | "due" | "graduated">("active");
  const [tick, setTick] = useState(0);
  void tick;
  const items =
    tab === "due" ? repo.due(studyDay) : tab === "graduated" ? repo.graduated() : repo.active();
  return (
    <Page eyebrow="WEAK BOOK · SRS" title="弱点不是收藏夹，是回收队列。" back={() => navigate("home")}>
      <div className="segment-tabs">
        <button className={tab === "active" ? "active" : ""} onClick={() => setTab("active")}>进行中 {repo.active().length}</button>
        <button className={tab === "due" ? "active" : ""} onClick={() => setTab("due")}>到期 {repo.due(studyDay).length}</button>
        <button className={tab === "graduated" ? "active" : ""} onClick={() => setTab("graduated")}>已毕业 {repo.graduated().length}</button>
      </div>
      {items.length === 0 ? (
        <div className="empty-book">这一类现在为空。</div>
      ) : (
        <div className="weak-card-list">
          {items.map((item) => (
            <article className="weak-card" key={item.id}>
              <div className="weak-card-head">
                <span>Day {item.dayAdded}</span>
                <b>下次 Day {item.nextReviewDay === Number.MAX_SAFE_INTEGER ? "—" : item.nextReviewDay}</b>
              </div>
              <h3>{item.originalSentence}</h3>
              <p>{item.fixReason}</p>
              <small>曾说出：{item.userError}</small>
              <div className="weak-card-actions">
                <button onClick={() => navigate("review")}>现在回收</button>
                <button onClick={() => { repo.setStatus(item.id, "suspended"); setTick((value) => value + 1); refresh(); }}>暂停</button>
                <button onClick={() => { repo.remove(item.id); setTick((value) => value + 1); refresh(); }}>删除</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </Page>
  );
}
