import { useMemo, useRef, useState } from "react";
import { dialogueAudio, SCENES } from "../data";
import { LOCAL_FLAVORS } from "../data/localFlavor";
import { textSimilarity } from "../lib/scoring";
import {
  speechRecognitionAvailable,
  speakJapanese,
  startJapaneseRecognition,
} from "../lib/speech";
import type { RecognitionController } from "../lib/speech";
import type { FriendExpression } from "./lesson";
import { buildFriendLesson } from "./lesson";
import { HaruAvatar } from "./HaruAvatar";

type View = "home" | "lesson" | "notebook";
type LessonStep = "meet" | "shadow" | "grammar" | "choose" | "speak" | "drill" | "done";

interface SavedExpression extends FriendExpression {
  id: string;
  sceneId: number;
  sceneTitle: string;
  intent: string;
  savedAt: number;
}

const SAVED_KEY = "kotoba60:haru-sentences:v1";

function readSaved(): SavedExpression[] {
  try {
    const value = JSON.parse(localStorage.getItem(SAVED_KEY) ?? "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function FriendApp() {
  const [view, setView] = useState<View>("home");
  const [sceneOffset, setSceneOffset] = useState(
    () => Number(localStorage.getItem("kotoba60:haru-offset") ?? "0") || 0,
  );
  const [step, setStep] = useState<LessonStep>("meet");
  const [chosenIndex, setChosenIndex] = useState(0);
  const [saved, setSaved] = useState<SavedExpression[]>(readSaved);
  const dayIndex = useMemo(() => {
    const value = localStorage.getItem("kotoba60:haru-start");
    const start = value ? new Date(value) : new Date();
    if (!value) localStorage.setItem("kotoba60:haru-start", start.toISOString());
    return Math.max(0, Math.floor((Date.now() - start.getTime()) / 86_400_000));
  }, []);
  const scene = SCENES[(dayIndex + sceneOffset) % SCENES.length];
  const lesson = useMemo(() => buildFriendLesson(scene), [scene]);
  const flavor = LOCAL_FLAVORS[(dayIndex + sceneOffset) % LOCAL_FLAVORS.length];

  function changeScene() {
    const next = (sceneOffset + 1) % SCENES.length;
    localStorage.setItem("kotoba60:haru-offset", String(next));
    setSceneOffset(next);
    setStep("meet");
    setChosenIndex(0);
  }

  function startLesson() {
    setStep("meet");
    setChosenIndex(0);
    setView("lesson");
  }

  function saveExpression(expression: FriendExpression) {
    if (saved.some((item) => item.sceneId === scene.id && item.jp === expression.jp)) return;
    const next = [
      ...saved,
      {
        ...expression,
        id: crypto.randomUUID(),
        sceneId: scene.id,
        sceneTitle: scene.title,
        intent: lesson.intent,
        savedAt: Date.now(),
      },
    ];
    setSaved(next);
    localStorage.setItem(SAVED_KEY, JSON.stringify(next));
  }

  function removeSaved(id: string) {
    const next = saved.filter((item) => item.id !== id);
    setSaved(next);
    localStorage.setItem(SAVED_KEY, JSON.stringify(next));
  }

  return (
    <div className="friend-shell">
      <div className="paper-noise" aria-hidden="true" />
      <main className="friend-main">
        {view === "home" && (
          <HomeView
            lesson={lesson}
            flavor={flavor}
            dayIndex={dayIndex}
            onStart={startLesson}
            onChangeScene={changeScene}
            onNotebook={() => setView("notebook")}
          />
        )}
        {view === "lesson" && (
          <LessonView
            lesson={lesson}
            step={step}
            setStep={setStep}
            chosenIndex={chosenIndex}
            onChoose={setChosenIndex}
            onSave={saveExpression}
            onBack={() => setView("home")}
          />
        )}
        {view === "notebook" && (
          <NotebookView saved={saved} onRemove={removeSaved} onHome={() => setView("home")} />
        )}
      </main>
      <nav className="friend-nav">
        <button className={view === "home" ? "active" : ""} onClick={() => setView("home")}>
          <span>◌</span>今天
        </button>
        <button className={view === "lesson" ? "active" : ""} onClick={startLesson}>
          <span>声</span>跟ハル说
        </button>
        <button className={view === "notebook" ? "active" : ""} onClick={() => setView("notebook")}>
          <span>✦</span>我们的话
        </button>
      </nav>
    </div>
  );
}

function HomeView({
  lesson,
  flavor,
  dayIndex,
  onStart,
  onChangeScene,
  onNotebook,
}: {
  lesson: ReturnType<typeof buildFriendLesson>;
  flavor: (typeof LOCAL_FLAVORS)[number];
  dayIndex: number;
  onStart: () => void;
  onChangeScene: () => void;
  onNotebook: () => void;
}) {
  return (
    <div className="home-view page-transition">
      <header className="friend-top">
        <div className="mini-brand">KOT<span>O</span>BA / 60</div>
        <button onClick={onNotebook}>我们的话</button>
      </header>

      <section className="haru-hello">
        <HaruAvatar />
        <div className="hello-bubble">
          <small>ハル · 12岁 · 你的日语朋友</small>
          <p>今天只用一种说法，<br />跟我把这一小步走稳就好。</p>
        </div>
      </section>

      <div className="day-stamp">DAY {String(dayIndex + 1).padStart(2, "0")}</div>
      <h1>{lesson.scene.category}</h1>
      <p className="home-intent">{lesson.intent}</p>

      <section className="today-story-card">
        <div>
          <span>今天的小故事</span>
          <h2>{lesson.scene.place}</h2>
          <p>{lesson.scene.title}</p>
        </div>
        <button onClick={() => new Audio(dialogueAudio(lesson.scene.id, 0)).play()}>▶ 先听ハル</button>
      </section>

      <div className="three-ways-label">一个意图，三种温度</div>
      <div className="density-note">3 核心说法 · 6 句完整对话 · 6 句语法对照 · 3 个动词变形</div>
      <div className="way-preview">
        {lesson.expressions.map((expression, index) => (
          <div key={expression.tone}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <b>{expression.tone}</b>
            <small>{expression.subtitle}</small>
          </div>
        ))}
      </div>

      <div className="hour-map">
        <span>8 分听温度</span><span>10 分跟读</span><span>10 分语法</span>
        <span>12 分情境</span><span>12 分开囗</span><span>5 分变式</span><span>3 分收束</span>
      </div>

      <button className="main-cta" onClick={onStart}>
        和ハル开始今天的 60 分钟 <span>→</span>
      </button>

      <section className="local-moment">
        <div>
          <span>今天路过 {flavor.region}</span>
          <button onClick={() => speakJapanese(flavor.phrase)}>听</button>
        </div>
        <h3>{flavor.phrase}</h3>
        <p>{flavor.meaning} · {flavor.use}</p>
      </section>

      <button className="quiet-button" onClick={onChangeScene}>今天想换一个场景</button>
    </div>
  );
}

function LessonView({
  lesson,
  step,
  setStep,
  chosenIndex,
  onChoose,
  onSave,
  onBack,
}: {
  lesson: ReturnType<typeof buildFriendLesson>;
  step: LessonStep;
  setStep: (step: LessonStep) => void;
  chosenIndex: number;
  onChoose: (index: number) => void;
  onSave: (item: FriendExpression) => void;
  onBack: () => void;
}) {
  const [choiceRound, setChoiceRound] = useState(0);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const contexts = [
    {
      text: `你第一次走进「${lesson.scene.place}」，只想把事情稳稳办成。`,
      answer: 0,
      why: "陌生人或服务场景，先让信息完整、语体安全。",
    },
    {
      text: "对方刚刚告诉你一件事。你听懂了，也想让气氛松一点。",
      answer: 1,
      why: "熟人会话不是每句都要索取信息，先接住对方更重要。",
    },
    {
      text: "对方已经理解了你的意思。你想把对话继续往前推一步。",
      answer: 2,
      why: "补一个追问或行动句，交流才会从“答完”变成“聊起来”。",
    },
  ];
  const context = contexts[choiceRound];

  function chooseAnswer(index: number) {
    onChoose(index);
    setFeedback(index === context.answer ? "correct" : "wrong");
  }

  function nextContext() {
    if (choiceRound < contexts.length - 1) {
      setChoiceRound((value) => value + 1);
      onChoose(0);
      setFeedback(null);
    } else {
      onChoose(context.answer);
      setStep("speak");
    }
  }

  return (
    <div className="lesson-view page-transition">
      <header className="lesson-top">
        <button onClick={onBack}>←</button>
        <div className="step-dots">
          {(["meet", "shadow", "grammar", "choose", "speak", "drill"] as LessonStep[]).map((item, index, list) => {
            const currentIndex = step === "done" ? list.length : list.indexOf(step);
            return <i key={item} className={step === item ? "active" : currentIndex > index ? "done" : ""} />;
          })}
        </div>
        <span>ハルと</span>
      </header>

      {step === "meet" && (
        <>
          <section className="story-header">
            <span>{lesson.scene.place}</span>
            <h1>{lesson.scene.title}</h1>
            <p>今天要完成的意图：{lesson.intent}</p>
          </section>
          <HaruChatBubble text="まず、三つの言い方を聞いてみよう。どれが一番しっくりくる？" zh="先听三种说法，看看哪一种最适合现在的场景。" />
          <div className="expression-cards">
            {lesson.expressions.map((expression, index) => (
              <ExpressionCard key={expression.tone} expression={expression} index={index} />
            ))}
          </div>
          <button className="main-cta" onClick={() => setStep("shadow")}>先听一遍 · 进入整段跟读 <span>→</span></button>
        </>
      )}

      {step === "shadow" && <ShadowStep lesson={lesson} onNext={() => setStep("grammar")} />}
      {step === "grammar" && <GrammarStep lesson={lesson} onNext={() => setStep("choose")} />}

      {step === "choose" && (
        <>
          <section className="choose-intro">
            <span>三温度匹配 · 第 {choiceRound + 1}/3 题</span>
            <h1>{context.text}</h1>
          </section>
          <div className="choice-list">
            {lesson.expressions.map((expression, index) => (
              <button key={expression.tone} className={chosenIndex === index ? "selected" : ""} onClick={() => chooseAnswer(index)}>
                <span>{expression.tone}</span>
                <b>{expression.jp}</b>
                <small>{expression.when}</small>
              </button>
            ))}
          </div>
          {feedback && (
            <section className={`difference-panel ${feedback}`}>
              <span>{feedback === "correct" ? "选对了" : "先别急，换一种温度"}</span>
              <h2>{feedback === "correct" ? lesson.expressions[context.answer].tone : "这句话适合另一个时刻"}</h2>
              <p>{feedback === "correct" ? context.why : "这句话本身没错，但它处理的是另一种社会距离。再看一次当前场景。"}</p>
              {feedback === "correct" && (
                <div className="grammar-note">
                  <b>{lesson.grammarTitle}</b>
                  <p>{lesson.grammarCore}</p>
                  <small>{lesson.caution}</small>
                </div>
              )}
              {feedback === "correct" ? (
                <button className="main-cta" onClick={nextContext}>
                  {choiceRound === contexts.length - 1 ? "带着这种判断去开口" : "下一情境"} <span>→</span>
                </button>
              ) : (
                <button className="main-cta" onClick={() => { setFeedback(null); onChoose(0); }}>再看一遍，重新选 <span>↻</span></button>
              )}
            </section>
          )}
          {!feedback && <p className="choice-footnote">先判断关系，再判断语法。点下面三个温度按钮作答。</p>}
        </>
      )}

      {step === "speak" && (
        <SpeakStep expression={lesson.expressions[chosenIndex]} onComplete={() => setStep("drill")} onSave={onSave} />
      )}

      {step === "drill" && <DrillStep lesson={lesson} onComplete={() => setStep("done")} />}

      {step === "done" && (
        <section className="lesson-done">
          <HaruAvatar size="small" />
          <span>ハル听到了</span>
          <h1>今天这句话，<br />已经属于你了。</h1>
          <p>不用打卡。明天遇见相似场景时，能想起其中一种说法就够了。</p>
          <button className="main-cta" onClick={onBack}>回到ハル的房间 <span>↗</span></button>
        </section>
      )}
    </div>
  );
}

function ExpressionCard({ expression, index }: { expression: FriendExpression; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <article className={`expression-card tone-${index}`}>
      <div className="expression-top">
        <span>{expression.tone}</span>
        <button onClick={() => new Audio(expression.audio).play()}>▶</button>
      </div>
      <h2>{expression.jp}</h2>
      <p className="kana">{expression.kana}</p>
      <p className="meaning">{expression.zh}</p>
      <button className="why-toggle" onClick={() => setOpen((value) => !value)}>
        {open ? "收起区别" : "它和另外两句差在哪？"}
      </button>
      {open && (
        <div className="expression-why">
          <p><b>什么时候用</b>{expression.when}</p>
          <p><b>语气区别</b>{expression.difference}</p>
          <p><b>语法</b>{expression.grammar}</p>
        </div>
      )}
    </article>
  );
}

function DeepDive({ lesson, open = false }: { lesson: ReturnType<typeof buildFriendLesson>; open?: boolean }) {
  const [expanded, setExpanded] = useState(open);
  return (
    <details className="deep-dive" open={expanded} onToggle={(event) => setExpanded(event.currentTarget.open)}>
      <summary>
        <span>今天真正学多少？</span>
        <b>再展开 15 句精准材料</b>
        <small>主线不被淹没，想学深时再打开</small>
      </summary>
      <div className="deep-body">
        <section>
          <h3>整段对话 · 抓语流</h3>
          {lesson.dialogue.map((line, index) => (
            <div className="deep-line" key={`${line.jp}-${index}`}>
              <span>{line.speaker}</span>
              <div><b>{line.jp}</b><small>{line.kana}</small><p>{line.zh}</p></div>
              <button onClick={() => new Audio(dialogueAudio(lesson.scene.id, index)).play()}>▶</button>
            </div>
          ))}
        </section>
        <section>
          <h3>今天会换的词</h3>
          <div className="word-grid">
            {lesson.words.map((word) => (
              <div key={word.jp}><b>{word.jp}</b><span>{word.kana}</span><small>{word.zh}</small></div>
            ))}
          </div>
        </section>
        <section>
          <h3><span>语法不是定义，是比较</span>{lesson.grammarTitle}</h3>
          <p className="deep-grammar">{lesson.grammarCore}</p>
          {lesson.grammarExamples.map((example, index) => (
            <div className="deep-line grammar-line" key={example.jp}>
              <div><b>{example.jp}</b><small>{example.kana}</small><p>{example.zh}</p></div>
              <button onClick={() => new Audio(lesson.grammarExampleAudio[index]).play()}>▶</button>
            </div>
          ))}
          <div className="deep-caution">{lesson.caution}</div>
        </section>
        <section>
          <h3>今天顺手拆 3 个动词</h3>
          {lesson.verbLabs.map((verb) => (
            <article className="verb-lab" key={verb.id}>
              <div className="verb-title"><b>{verb.word}</b><span>{verb.kana} · {verb.group} · {verb.meaning}</span></div>
              <div className="form-list">
                {verb.forms.map((form) => (
                  <div key={form.label}><span>{form.label}</span><b>{form.jp}</b></div>
                ))}
              </div>
              <p>{verb.example.jp} <small>{verb.example.zh}</small></p>
            </article>
          ))}
        </section>
      </div>
    </details>
  );
}

function ShadowStep({
  lesson,
  onNext,
}: {
  lesson: ReturnType<typeof buildFriendLesson>;
  onNext: () => void;
}) {
  const [completed, setCompleted] = useState<Set<number>>(new Set());
  function mark(index: number) {
    setCompleted((current) => new Set(current).add(index));
  }
  return (
    <>
      <section className="step-intro">
        <span>10 MIN · 语流跟读</span>
        <h1>先让嘴巴认识节奏，<br />再理解每个词。</h1>
        <p>每句先听一遍，再跟着说两遍。不要看单个词，抓一整块语流。</p>
      </section>
      <div className="shadow-list">
        {lesson.dialogue.map((line, index) => (
          <article key={`${line.jp}-${index}`} className={completed.has(index) ? "done" : ""}>
            <div className="shadow-meta"><span>{line.speaker}</span><small>{line.zh}</small></div>
            <h3>{line.jp}</h3>
            <p>{line.kana}</p>
            <div>
              <button onClick={() => new Audio(dialogueAudio(lesson.scene.id, index)).play()}>▶ 原速听</button>
              <button onClick={() => mark(index)}>{completed.has(index) ? "✓ 已跟读" : "跟读完成"}</button>
            </div>
          </article>
        ))}
      </div>
      <div className="step-progress-copy">{completed.size} / {lesson.dialogue.length} 句完成跟读</div>
      <button className="main-cta" onClick={onNext} disabled={completed.size < lesson.dialogue.length}>进入语法拆解 <span>→</span></button>
    </>
  );
}

function GrammarStep({
  lesson,
  onNext,
}: {
  lesson: ReturnType<typeof buildFriendLesson>;
  onNext: () => void;
}) {
  return (
    <>
      <section className="step-intro">
        <span>10 MIN · 知其所以然</span>
        <h1>不是背规则，<br />是知道为什么换一句。</h1>
        <p>先看今天这几种说法如何改变礼貌、距离和推进力，再听 6 句同语法家族的真实句。</p>
      </section>
      <section className="grammar-explained">
        <span>今天的核心语法</span>
        <h2>{lesson.grammarTitle}</h2>
        <p>{lesson.grammarCore}</p>
        <small>{lesson.caution}</small>
      </section>
      <DeepDive lesson={lesson} open />
      <button className="main-cta" onClick={onNext}>进入三温度情境判断 <span>→</span></button>
    </>
  );
}

function DrillStep({
  lesson,
  onComplete,
}: {
  lesson: ReturnType<typeof buildFriendLesson>;
  onComplete: () => void;
}) {
  const [done, setDone] = useState<Set<number>>(new Set());
  const tasks = [
    ...lesson.scene.variations,
    {
      setup: "对方突然说得很快，你只抓住了一半。",
      task: "不要沉默：先请对方再说一次，再用今天学到的表达完成任务。",
    },
  ];
  return (
    <>
      <section className="step-intro">
        <span>5 MIN · 换条件重说</span>
        <h1>会一句，不算会。<br />换个人还会，才算。</h1>
        <p>每张卡先大声说，再点完成。ハル不打断，只等你自己把话说完整。</p>
      </section>
      <div className="drill-list">
        {tasks.map((task, index) => (
          <article key={task.setup} className={done.has(index) ? "done" : ""}>
            <span>变式 {index + 1}</span>
            <h3>{task.setup}</h3>
            <p>{task.task}</p>
            <button onClick={() => setDone((current) => new Set(current).add(index))}>
              {done.has(index) ? "✓ 已说完整" : "开口说完"}
            </button>
          </article>
        ))}
      </div>
      <button className="main-cta" onClick={onComplete} disabled={done.size < tasks.length}>完成今天的 60 分钟 <span>→</span></button>
    </>
  );
}

function SpeakStep({
  expression,
  onComplete,
  onSave,
}: {
  expression: FriendExpression;
  onComplete: () => void;
  onSave: (item: FriendExpression) => void;
}) {
  const [phase, setPhase] = useState<"idle" | "listening" | "confirm" | "scored">("idle");
  const [transcript, setTranscript] = useState("");
  const [alternatives, setAlternatives] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const controllerRef = useRef<RecognitionController | null>(null);

  function begin() {
    if (!speechRecognitionAvailable()) {
      setPhase("confirm");
      setTranscript("");
      return;
    }
    try {
      setPhase("listening");
      setTranscript("");
      const controller = startJapaneseRecognition({
        onInterim: setTranscript,
        timeoutMs: 20_000,
      });
      controllerRef.current = controller;
      controller.result
        .then((result) => {
          setTranscript(result.transcript);
          setAlternatives(result.alternatives);
          setPhase("confirm");
        })
        .catch(() => setPhase("confirm"));
    } catch {
      setPhase("confirm");
    }
  }

  function end() {
    controllerRef.current?.stop();
    controllerRef.current = null;
  }

  function evaluate() {
    const result = Math.max(textSimilarity(expression.jp, transcript), textSimilarity(expression.kana, transcript));
    setScore(result);
    setPhase("scored");
    if (result >= 0.58) onSave(expression);
  }

  return (
    <>
      <HaruChatBubble text="ゆっくりでいいよ。言えたら、指を離してね。" zh="慢一点没关系。说完再松开手指。" />
      <section className="speak-card">
        <span>你要说</span>
        <h1>{expression.jp}</h1>
        <p>{expression.kana}</p>
        <small>{expression.zh}</small>
      </section>
      <button
        className={`talk-button ${phase === "listening" ? "listening" : ""}`}
        onPointerDown={(event) => {
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          begin();
        }}
        onPointerUp={(event) => {
          event.preventDefault();
          event.stopPropagation();
          end();
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
        }}
        onPointerCancel={end}
        onContextMenu={(event) => event.preventDefault()}
      >
        <span>{phase === "listening" ? "正在听 · 松开结束" : "按住说 · 松开结束"}</span>
        <i />
      </button>
      {phase === "confirm" && (
        <section className="transcript-card">
          <label>识别结果，可直接改错字</label>
          <textarea value={transcript} onChange={(event) => setTranscript(event.target.value)} placeholder="也可以直接输入刚才说出的日语。" />
          {alternatives.length > 1 && (
            <div className="alternatives">
              {alternatives.map((item) => <button key={item} onClick={() => setTranscript(item)}>{item}</button>)}
            </div>
          )}
          <button className="main-cta" onClick={evaluate} disabled={!transcript.trim()}>这句就是我说的 <span>→</span></button>
        </section>
      )}
      {phase === "scored" && (
        <section className={`speak-result ${score >= 0.58 ? "good" : "retry"}`}>
          <span>{Math.round(score * 100)}</span>
          <h2>{score >= 0.58 ? "听懂了，也跟上节奏了" : "这次和原句差得有点远"}</h2>
          <p>{score >= 0.58 ? "ハル已经把这句话放进“我们的话”。" : "先不用重来整段，只把句尾顺一遍。"}</p>
          {score < 0.58 ? (
            <button className="main-cta" onClick={() => setPhase("idle")}>再按住说一次 <span>↻</span></button>
          ) : (
            <button className="main-cta" onClick={onComplete}>收下这句话 <span>↗</span></button>
          )}
        </section>
      )}
    </>
  );
}

function HaruChatBubble({ text, zh }: { text: string; zh: string }) {
  return (
    <div className="haru-chat">
      <HaruAvatar size="small" />
      <div>
        <p>{text}</p>
        <small>{zh}</small>
        <button onClick={() => speakJapanese(text, 1.02)}>▶ 听ハル</button>
      </div>
    </div>
  );
}

function NotebookView({
  saved,
  onRemove,
  onHome,
}: {
  saved: SavedExpression[];
  onRemove: (id: string) => void;
  onHome: () => void;
}) {
  return (
    <div className="notebook-view page-transition">
      <header className="lesson-top"><button onClick={onHome}>←</button><span>私たちの言葉</span></header>
      <HaruChatBubble text="君が使った言葉、ちゃんとここに残してあるよ。" zh="你真正说出口的句子，我会替你留在这里。" />
      {saved.length === 0 ? (
        <div className="empty-notebook">
          <span>まだ空っぽ</span>
          <p>和ハル练完第一句后，这里就会出现你们共同留下的表达。</p>
        </div>
      ) : (
        <div className="saved-list">
          {saved.slice().reverse().map((item) => (
            <article key={item.id}>
              <div><span>{item.tone}</span><small>DAY {String(item.sceneId).padStart(2, "0")}</small></div>
              <h2>{item.jp}</h2>
              <p className="kana">{item.kana}</p>
              <p>{item.zh}</p>
              <small>{item.difference}</small>
              <div className="saved-buttons">
                <button onClick={() => new Audio(item.audio).play()}>▶ 听</button>
                <button onClick={() => onRemove(item.id)}>移出</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
