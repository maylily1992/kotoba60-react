import { Page, PrimaryButton } from "../components/Page";
import type { PageProps } from "./types";

export function HomePage({ scene, studyDay, repo, navigate, refresh }: PageProps) {
  const due = repo.due(studyDay);
  const active = repo.active();
  return (
    <Page className="home-page">
      <div className="home-mark">K60</div>
      <p className="eyebrow">DAY {String(scene.id).padStart(2, "0")} / {scene.category}</p>
      <h1>每天把一句日语<br />种进身体里。</h1>
      <p className="lead">不考你认不认得，只考你张嘴来不来得及。</p>

      <section className="scene-ticket">
        <div>
          <span>{scene.place}</span>
          <b>{scene.title}</b>
          <p>{scene.goal}</p>
        </div>
        <div className="ticket-number">{String(scene.id).padStart(2, "0")}</div>
      </section>

      <div className="home-metrics">
        <div><b>{due.length}</b><span>到期弱点</span></div>
        <div><b>{active.length}</b><span>仍在回收</span></div>
      </div>

      <PrimaryButton onClick={() => navigate("wakeup")}>开始 25 分钟核心日课</PrimaryButton>
      <div className="secondary-actions">
        <button onClick={() => navigate("review")} disabled={!due.length}>
          回收弱点 {due.length ? `· ${due.length}` : ""}
        </button>
        <button onClick={() => navigate("notebook")}>弱点本</button>
      </div>

      {active.length > 0 && (
        <section className="home-weak">
          <div className="section-label">昨天留下的</div>
          {active.slice(0, 3).map((item) => (
            <div className="weak-line" key={item.id}>
              <span>{item.originalSentence}</span>
              <small>{item.fixReason}</small>
            </div>
          ))}
          <button
            className="text-button"
            onClick={() => {
              if (confirm("清除所有本机弱点记录？")) {
                repo.clear();
                refresh();
              }
            }}
          >
            清除本机记录
          </button>
        </section>
      )}
    </Page>
  );
}
