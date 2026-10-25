import { useEffect, useMemo, useState } from "react";
import { SCENES } from "./data";
import { studyDayIndex } from "./lib/storage";
import { WeakBookRepository } from "./lib/weakBook";
import { HomePage } from "./pages/HomePage";
import { WakeupPage } from "./pages/WakeupPage";
import { RecallPage } from "./pages/RecallPage";
import { DialoguePage } from "./pages/DialoguePage";
import { FeedbackPage } from "./pages/FeedbackPage";
import { RepeatPage } from "./pages/RepeatPage";
import { SummaryPage } from "./pages/SummaryPage";
import { ReviewPage } from "./pages/ReviewPage";
import { NotebookPage } from "./pages/NotebookPage";
import type { PageProps, RouteName } from "./pages/types";

function routeFromLocation(): RouteName {
  const base = new URL(document.baseURI).pathname.replace(/\/$/, "");
  const path = location.pathname.startsWith(base)
    ? location.pathname.slice(base.length)
    : location.pathname;
  const segment = path.replace(/^\/+/, "").split("/")[0];
  const allowed: RouteName[] = [
    "home",
    "wakeup",
    "recall",
    "dialogue",
    "feedback",
    "repeat",
    "summary",
    "review",
    "notebook",
  ];
  if (!segment) return "home";
  return allowed.includes(segment as RouteName) ? (segment as RouteName) : "home";
}

export default function App() {
  const [route, setRoute] = useState<RouteName>(routeFromLocation);
  const [refreshTick, setRefreshTick] = useState(0);
  const [sceneOffset, setSceneOffset] = useState(() => {
    const saved = Number(localStorage.getItem("kotoba60:scene-offset") ?? "0");
    return Number.isFinite(saved) ? saved : 0;
  });
  const studyDay = useMemo(() => studyDayIndex(), []);
  const sceneIndex = (studyDay + sceneOffset) % SCENES.length;
  const scene = SCENES[sceneIndex];
  const previousScene = SCENES[(sceneIndex - 1 + SCENES.length) % SCENES.length];
  const repo = useMemo(() => new WeakBookRepository(localStorage), []);

  useEffect(() => {
    const redirect = sessionStorage.getItem("kotoba60:redirect");
    if (redirect) {
      sessionStorage.removeItem("kotoba60:redirect");
      const routeName = redirect.split("/").filter(Boolean).at(-1);
      setRoute((routeName as RouteName) || "home");
    }
    const pop = () => setRoute(routeFromLocation());
    addEventListener("popstate", pop);
    return () => removeEventListener("popstate", pop);
  }, []);

  function navigate(next: RouteName) {
    const base = new URL(document.baseURI).pathname;
    const target = next === "home" ? base : `${base}${next}`;
    history.pushState({}, "", target);
    setRoute(next);
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  const props: PageProps = {
    scene,
    previousScene,
    studyDay,
    repo,
    navigate,
    shuffleScene: () => {
      setSceneOffset((value) => {
        const next = (value + 1) % SCENES.length;
        localStorage.setItem("kotoba60:scene-offset", String(next));
        return next;
      });
      setRoute("home");
    },
    refresh: () => setRefreshTick((value) => value + 1),
  };

  void refreshTick;
  return (
    <div className="app-shell">
      <div className="grain" aria-hidden="true" />
      {route === "home" && <HomePage {...props} />}
      {route === "wakeup" && <WakeupPage {...props} />}
      {route === "recall" && <RecallPage {...props} />}
      {route === "dialogue" && <DialoguePage {...props} />}
      {route === "feedback" && <FeedbackPage {...props} />}
      {route === "repeat" && <RepeatPage {...props} />}
      {route === "summary" && <SummaryPage {...props} />}
      {route === "review" && <ReviewPage {...props} />}
      {route === "notebook" && <NotebookPage {...props} />}
      <nav className="quick-nav">
        <button onClick={() => navigate("home")}>今天</button>
        <button onClick={() => navigate("review")}>回收 · {repo.due(studyDay).length}</button>
        <button onClick={() => navigate("notebook")}>弱点本</button>
      </nav>
    </div>
  );
}
