import { useEffect, useMemo, useState } from "react";
import {
  DAY_META,
  loadCuratedDay,
  TOTAL_DAY_COUNT,
  type CuratedDay,
  type CuratedLine,
} from "../data/curatedDays";
import type { CuratedGrammar, LineScope, LineToken } from "../data/curatedDayTypes";
import { getCounterGuide } from "../data/counterGuide";
import { SCENE_CULTURE } from "../data/sceneCulture";
import { speakJapanese } from "../lib/speech";

type Tab = "cards" | "summary" | "favorites";
type ScopeFilter = "all" | "core" | "extension";

type Card = CuratedLine & {
  day: number;
  scene: string;
  dayTitle: string;
  micro: string;
  setting: string;
};

type SavedCard = Card & { scene?: string; dayTitle?: string };

const FAVORITES_KEY = "kotoba60:curated-favorites:v1";
const MASTERED_KEY = "kotoba60:mastered-lines:v1";
const ACTIVE_DAY_KEY = "kotoba60:active-day:v1";

function readActiveDay() {
  const value = Number(localStorage.getItem(ACTIVE_DAY_KEY));
  return Number.isInteger(value) && value >= 1 && value <= 60 ? value : 1;
}

function readFavorites(): SavedCard[] {
  try {
    const value = JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((item) => item?.jp) : [];
  } catch {
    return [];
  }
}

function readMastered(): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(MASTERED_KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function buildCards(day: CuratedDay): Card[] {
  return day.microScenes.flatMap((micro) =>
    micro.lines.map((line) => ({
      ...line,
      day: day.day,
      scene: day.scene,
      dayTitle: day.title,
      micro: micro.title,
      setting: micro.setting,
    })),
  );
}

function sameLine(left: { id?: string; jp: string }, right: { id?: string; jp: string }) {
  return left.id === right.id || left.jp === right.jp;
}

function scopeLabel(scope?: LineScope) {
  if (scope === "core") return "场景核心";
  if (scope === "related") return "同场景扩展";
  return "迁移补充";
}

export function CuratedApp() {
  const [selectedDay, setSelectedDay] = useState(readActiveDay);
  const [day, setDay] = useState<CuratedDay | null>(null);
  const [tab, setTab] = useState<Tab>("cards");
  const [microFilter, setMicroFilter] = useState("全部");
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>("all");
  const [query, setQuery] = useState("");
  const [showDays, setShowDays] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [favorites, setFavorites] = useState<SavedCard[]>(readFavorites);
  const [mastered, setMastered] = useState<string[]>(readMastered);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setError("");
    localStorage.setItem(ACTIVE_DAY_KEY, String(selectedDay));
    loadCuratedDay(selectedDay)
      .then((loaded) => {
        if (live) setDay(loaded);
      })
      .catch((reason: unknown) => {
        if (live) setError(reason instanceof Error ? reason.message : "课程载入失败");
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [selectedDay]);

  const cards = useMemo(() => (day ? buildCards(day) : []), [day]);
  const masteredToday = cards.filter((card) => mastered.includes(card.id)).length;
  const coreCount = cards.filter((card) => card.scope === "core").length;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cards.filter((card) => {
      const microMatch = microFilter === "全部" || card.micro === microFilter;
      const scopeMatch =
        scopeFilter === "all" ||
        (scopeFilter === "core" && card.scope === "core") ||
        (scopeFilter === "extension" && card.scope !== "core");
      const textMatch =
        !q ||
        [card.jp, card.kana, card.zh, card.grammar, card.function, card.note]
          .join(" ")
          .toLowerCase()
          .includes(q);
      return microMatch && scopeMatch && textMatch;
    });
  }, [cards, microFilter, query, scopeFilter]);

  function chooseDay(nextDay: number) {
    setSelectedDay(nextDay);
    setShowDays(false);
    setTab("cards");
    setMicroFilter("全部");
    setScopeFilter("all");
    setQuery("");
  }

  function toggleFavorite(card: SavedCard) {
    const exists = favorites.some((item) => sameLine(item, card));
    const next = exists
      ? favorites.filter((item) => !sameLine(item, card))
      : [...favorites, card];
    setFavorites(next);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
  }

  function toggleMastered(card: Card) {
    const exists = mastered.includes(card.id);
    const next = exists
      ? mastered.filter((item) => item !== card.id)
      : [...mastered, card.id];
    setMastered(next);
    localStorage.setItem(MASTERED_KEY, JSON.stringify(next));
  }

  return (
    <div className="curated-shell">
      <header className="curated-header">
        <div className="curated-brand">
          <span>✿</span>
          <div>
            <b>ことば六十</b>
            <small>KOTOBA60 · EVERYDAY JAPAN</small>
          </div>
        </div>
        <button className="curated-day-button" onClick={() => setShowDays((value) => !value)}>
          DAY {String(selectedDay).padStart(2, "0")} <span>{showDays ? "×" : "⌄"}</span>
        </button>
      </header>

      {showDays && (
        <section className="curated-days-sheet" aria-label="60天地图">
          <div className="days-sheet-head">
            <div>
              <b>60 天，一条完整的日本生活路线</b>
              <small>不是换词练习：每一天都有一个真实任务和完整表达库。</small>
            </div>
            <button onClick={() => setShowDays(false)}>关闭</button>
          </div>
          <div className="days-weeks">
            {Array.from({ length: 6 }, (_, index) => index + 1).map((week) => (
              <div className="days-week" key={week}>
                <span>WEEK {String(week).padStart(2, "0")}</span>
                <div className="curated-days-grid">
                  {DAY_META.filter((item) => item.week === week).map((item) => (
                    <button
                      key={item.day}
                      className={item.day === selectedDay ? "active" : ""}
                      onClick={() => chooseDay(item.day)}
                      aria-label={`第${item.day}天 ${item.title}`}
                    >
                      <b>{String(item.day).padStart(2, "0")}</b>
                      <small>{item.scene}</small>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="days-footnote">
            全部 {TOTAL_DAY_COUNT} 天已开放。可先按旅行顺序学，也可直接跳到明天要用的场景。
          </p>
        </section>
      )}

      <main className="curated-main">
        {loading && <LoadingDay day={selectedDay} />}
        {error && (
          <div className="curated-error">
            <b>这一页没有载入成功</b>
            <p>{error}</p>
            <button onClick={() => window.location.reload()}>重新载入</button>
          </div>
        )}
        {!loading && !error && day && (
          <>
            <section className="curated-hero">
              <div className="hero-flower">✿</div>
              <span>
                DAY {String(day.day).padStart(2, "0")} · WEEK {day.week} · {day.scene}
              </span>
              <h1>{day.title}</h1>
              <p>{day.goal}</p>
              <div className="hero-numbers">
                <div>
                  <b>{cards.length}</b>
                  <span>独立表达</span>
                </div>
                <div>
                  <b>{day.microScenes.length}</b>
                  <span>交流功能</span>
                </div>
                <div>
                  <b>{day.grammar.length}</b>
                  <span>语法系统</span>
                </div>
              </div>
              <div className="study-progress">
                <div>
                  <span>今天已经开口说顺</span>
                  <b>{masteredToday} / {cards.length}</b>
                </div>
                <i>
                  <em style={{ width: `${cards.length ? (masteredToday / cards.length) * 100 : 0}%` }} />
                </i>
                <small>点开任意句子，用「这句说顺了」记录真实练习，不靠自动打卡。</small>
              </div>
            </section>

            <div className="hero-shortcuts">
              <button onClick={() => { setTab("cards"); setScopeFilter("core"); }}>
                <span>01</span><b>先学 {coreCount} 句场景核心</b>
              </button>
              <button onClick={() => setTab("summary")}>
                <span>02</span><b>看 60 分钟练法</b>
              </button>
            </div>

            <nav className="curated-tabs">
              <button className={tab === "cards" ? "active" : ""} onClick={() => setTab("cards")}>
                场景对话 <span>{cards.length}</span>
              </button>
              <button className={tab === "summary" ? "active" : ""} onClick={() => setTab("summary")}>
                今日总结
              </button>
              <button className={tab === "favorites" ? "active" : ""} onClick={() => setTab("favorites")}>
                我的收藏 <span>{favorites.length}</span>
              </button>
            </nav>

            {tab === "cards" && (
              <>
                <div className="curated-search">
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="搜索日语、假名、中文、语法或功能…"
                    aria-label="搜索今天的句子"
                  />
                </div>
                <div className="scope-switch">
                  <button
                    className={scopeFilter === "all" ? "active" : ""}
                    onClick={() => setScopeFilter("all")}
                  >
                    全部 {cards.length}
                  </button>
                  <button
                    className={scopeFilter === "core" ? "active" : ""}
                    onClick={() => setScopeFilter("core")}
                  >
                    场景核心 {coreCount}
                  </button>
                  <button
                    className={scopeFilter === "extension" ? "active" : ""}
                    onClick={() => setScopeFilter("extension")}
                  >
                    迁移补充 {cards.length - coreCount}
                  </button>
                </div>
                <div className="micro-chips">
                  {["全部", ...day.microScenes.map((micro) => micro.title)].map((micro) => (
                    <button
                      key={micro}
                      className={microFilter === micro ? "active" : ""}
                      onClick={() => setMicroFilter(micro)}
                    >
                      {micro}
                    </button>
                  ))}
                </div>
                <div className="curated-count">
                  当前 {filtered.length} 句 · {microFilter}
                  {scopeFilter === "core" ? " · 先学完这些" : ""}
                </div>
                <div className="curated-list">
                  {filtered.map((card, index) => (
                    <CuratedCard
                      key={card.id}
                      card={card}
                      index={index}
                      grammarGuides={day.grammar}
                      tokens={day.tokens?.[card.id] ?? []}
                      siblings={cards}
                      culture={SCENE_CULTURE[day.day]}
                      saved={favorites.some((item) => sameLine(item, card))}
                      mastered={mastered.includes(card.id)}
                      onSave={() => toggleFavorite(card)}
                      onMastered={() => toggleMastered(card)}
                    />
                  ))}
                </div>
                {filtered.length === 0 && (
                  <div className="curated-empty compact">
                    <span>の</span>
                    <p>没有找到这句。换个短一点的词试试，例如「予約」「お願い」「ですか」。</p>
                  </div>
                )}
              </>
            )}

            {tab === "summary" && (
              <CuratedSummary day={day} cards={cards} masteredToday={masteredToday} />
            )}
            {tab === "favorites" && (
              <Favorites
                cards={favorites}
                mastered={mastered}
                onRemove={toggleFavorite}
                onMastered={(card) => {
                  if (mastered.includes(card.id)) {
                    const next = mastered.filter((item) => item !== card.id);
                    setMastered(next);
                    localStorage.setItem(MASTERED_KEY, JSON.stringify(next));
                  } else {
                    const next = [...mastered, card.id];
                    setMastered(next);
                    localStorage.setItem(MASTERED_KEY, JSON.stringify(next));
                  }
                }}
                onBrowse={() => setTab("cards")}
              />
            )}
          </>
        )}
      </main>

      <nav className="curated-nav">
        <button className={tab === "cards" ? "active" : ""} onClick={() => setTab("cards")}>
          <span>✿</span>对话
        </button>
        <button className={tab === "summary" ? "active" : ""} onClick={() => setTab("summary")}>
          <span>の</span>总结
        </button>
        <button className={tab === "favorites" ? "active" : ""} onClick={() => setTab("favorites")}>
          <span>♡</span>收藏
        </button>
      </nav>
    </div>
  );
}

function LoadingDay({ day }: { day: number }) {
  return (
    <div className="curated-loading" aria-live="polite">
      <span>✿</span>
      <b>正在翻开 DAY {String(day).padStart(2, "0")}</b>
      <p>句子、假名、语法和小场景正在一起就位。</p>
    </div>
  );
}

function CuratedCard({
  card,
  index,
  grammarGuides,
  tokens,
  siblings,
  culture,
  saved,
  mastered,
  onSave,
  onMastered,
}: {
  card: Card;
  index: number;
  grammarGuides: CuratedGrammar[];
  tokens: LineToken[];
  siblings: Card[];
  culture: { title: string; text: string };
  saved: boolean;
  mastered: boolean;
  onSave: () => void;
  onMastered: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <article className={`curated-card ${open ? "open" : ""} ${mastered ? "mastered" : ""}`}>
      <div className="curated-card-main">
        <button
          className="curated-card-toggle"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
        >
          <span className="curated-index">{String(index + 1).padStart(2, "0")}</span>
          <span className="curated-text">
            <span className={`scope-badge ${card.scope ?? "extension"}`}>{scopeLabel(card.scope)}</span>
            <b>{card.jp}</b>
            <em>{card.kana}</em>
            <small>{card.zh}</small>
          </span>
          <span className="curated-plus">{open ? "−" : "+"}</span>
        </button>
        <button
          className={`curated-heart ${saved ? "saved" : ""}`}
          onClick={onSave}
          aria-label={saved ? "取消收藏" : "收藏这句"}
        >
          {saved ? "♥" : "♡"}
        </button>
        <button
          className="curated-inline-listen"
          onClick={() => speakJapanese(card.jp, 1)}
          aria-label={`朗读：${card.jp}`}
          title="朗读这句"
        >
          <b>♪</b>
          <small>听</small>
        </button>
      </div>
      {open && (
        <div className="curated-detail">
          <div className="context-line">
            <span>场景</span><b>{card.micro}</b>
          </div>
          <div className="context-line">
            <span>谁说</span><b>{card.speaker}</b>
          </div>
          <div className="detail-pair">
            <div><span>交流功能</span><b>{card.function}</b></div>
            <div><span>语法定位</span><b>{card.grammar}</b></div>
          </div>
          <p>{card.setting}</p>
          <div className="curated-note">
            <b>为什么这样说</b><span>{card.note}</span>
          </div>
          <LineLearningPanel
            card={card}
            guides={grammarGuides}
            tokens={tokens}
            siblings={siblings}
            culture={culture}
          />
          <div className="card-actions">
            <button
              className={`master-button ${mastered ? "done" : ""}`}
              onClick={onMastered}
            >
              {mastered ? "✓ 这句说顺了" : "○ 这句说顺了"}
            </button>
          </div>
          {card.sourceId && !String(card.sourceId).startsWith("manual") && (
            <small className="line-source">语料来源 Tatoeba · #{card.sourceId}</small>
          )}
        </div>
      )}
    </article>
  );
}

type GrammarGuide = Pick<CuratedGrammar, "formula" | "useWhen" | "contrast" | "mistake">;

const QUICK_GRAMMAR: Record<string, GrammarGuide> = {
  "〜てください": {
    formula: "动词て形 + ください",
    useWhen: "把操作步骤或请求说清楚，适合店员、站务员和柜台人员。",
    contrast: "比命令形温和；比「〜てもらえますか」更像标准流程或直接请求。",
    mistake: "辞书形不能直接接「ください」，必须先变成て形。",
  },
  "〜てもらえますか": {
    formula: "动词て形 + もらえますか",
    useWhen: "请别人为自己做一件事，并把选择空间留给对方。",
    contrast: "比「〜てください」柔和；「〜ていただけますか」更正式。",
    mistake: "不要把て形写成辞书形；也不要漏掉句尾的「か」。",
  },
  "〜ませんか": {
    formula: "动词ます形去ます + ませんか",
    useWhen: "邀请、提议或试探对方意愿，语气比「ましょう」更留余地。",
    contrast: "「〜ましょう」像双方已经决定；「〜ませんか」把决定权交回去。",
    mistake: "不要写成「行くませんか」，应是「行きませんか」。",
  },
  "〜ましょうか": {
    formula: "动词ます形去ます + ましょうか",
    useWhen: "主动提出帮忙，或确认接下来由谁做什么。",
    contrast: "「〜ますか」问事实；「〜ましょうか」常含有“我可以来做”。",
    mistake: "这不是单纯未来时；重点是提议、承担或确认下一步。",
  },
  "〜たいです": {
    formula: "动词ます形去ます + たいです",
    useWhen: "表达自己当下想做的动作，点餐、购物和说明需求时高频。",
    contrast: "「〜つもりです」更强调计划；「〜たいです」强调愿望。",
    mistake: "否定要说「たくないです」；第三人称愿望需要额外说明。",
  },
  "可能形": {
    formula: "五段动词え段 + る／一段动词去る + られる／する→できる",
    useWhen: "确认能力、设备是否可用或某件事是否允许完成。",
    contrast: "「〜ことができます」更完整正式；可能形更短、更口语。",
    mistake: "不要把可能形和被动形混用；助词和语境会一起改变。",
  },
  "〜ています": {
    formula: "动词て形 + います",
    useWhen: "表示动作正在进行，也常表示动作完成后留下的状态。",
    contrast: "「〜ます」说习惯或未来；「〜ています」更贴近眼前的持续状态。",
    mistake: "不要一律翻成“正在”，例如「持っています」常是“拿着/拥有”。",
  },
  "〜ておきます": {
    formula: "动词て形 + おきます",
    useWhen: "提前做准备，让之后的行动更顺。",
    contrast: "「〜てしまいます」强调完成或遗憾；「〜ておきます」强调预备。",
    mistake: "口语里可能缩成「〜ときます」，不要误听成普通动词。",
  },
  "〜てしまいます": {
    formula: "动词て形 + しまいます",
    useWhen: "强调彻底完成，或表达不小心、遗憾的结果。",
    contrast: "「〜ておきます」是有意准备；「〜てしまいます」更像已经发生的结果。",
    mistake: "正式场合少用过度口语化的「〜ちゃう／〜じゃう」。",
  },
  "〜たことがあります": {
    formula: "动词た形 + ことがあります",
    useWhen: "谈经历，重点是有没有发生过，而不是具体发生时间。",
    contrast: "「〜ました」说某个确定时间；这个句型不谈具体时间。",
    mistake: "刚刚发生的事不要用经历句型。",
  },
  "〜つもりです": {
    formula: "动词辞书形／ない形 + つもりです",
    useWhen: "表达自己已经形成的意图或打算。",
    contrast: "「〜予定です」可以是客观日程；「〜つもりです」更偏本人意志。",
    mistake: "不要直接用它推断别人内心，除非上下文明确。",
  },
  "〜予定です": {
    formula: "名词 + の／动词辞书形 + 予定です",
    useWhen: "说明已经安排好的计划、预计到达或公共日程。",
    contrast: "「〜つもりです」偏个人意志；「〜予定です」更适合日程。",
    mistake: "动词后直接接「予定」，不要多加「の」。",
  },
  "〜かもしれません": {
    formula: "普通形 + かもしれません",
    useWhen: "表示可能但不肯定，为判断保留余地。",
    contrast: "「〜でしょう」把握更高；「〜かもしれません」更不确定。",
    mistake: "礼貌句尾已经包含「です」，不要再说「ですかもしれません」。",
  },
  "〜でしょう": {
    formula: "普通形 + でしょう",
    useWhen: "根据现场信息做较高把握的推测，或寻求对方同意。",
    contrast: "「〜と思います」明确是说话人的判断；「でしょう」更像共同推测。",
    mistake: "名词和な形容词不要重复接「ですでしょう」。",
  },
  "〜んです": {
    formula: "普通形 + んです；名词／な形容词加「な」",
    useWhen: "说明背景、困难或原因，让句子带有“请接着听/请回应”的感觉。",
    contrast: "普通礼貌体只是陈述；「〜んです」更强调解释和谈话铺垫。",
    mistake: "不要堆成「んですです」，句尾只保留一套礼貌体。",
  },
  "〜ので": {
    formula: "普通形 + ので；名词／な形容词加「な」",
    useWhen: "说明较柔和的客观原因，适合取消、迟到、换房和忌口。",
    contrast: "「〜から」更主观直接；「〜ので」更适合服务场景。",
    mistake: "表目的时通常用「ために」，不要全部用「ので」。",
  },
  "〜のに": {
    formula: "普通形 + のに",
    useWhen: "事实与期待相反时表达意外、遗憾或轻微不满。",
    contrast: "「〜けど」只是转折；「〜のに」的情绪更明显。",
    mistake: "服务场景里语气容易变重，先陈述事实，再决定是否使用。",
  },
  "〜たら": {
    formula: "动词／形容词た形 + ら",
    useWhen: "前项成立后出现后项，也用于现场发现和一次性假设。",
    contrast: "「〜と」更像自然规律；「〜たら」适合具体现场条件。",
    mistake: "这里的「た」不表示过去，整个句子仍可谈未来。",
  },
  "〜なら": {
    formula: "名词／普通形 + なら",
    useWhen: "承接对方刚提到的话题，再给出判断、建议或追问。",
    contrast: "「〜たら」提出条件；「〜なら」更像“既然你说到这个”。",
    mistake: "不要把它机械等同于中文“如果”，重点常在承接话题。",
  },
  "〜ば": {
    formula: "动词ば形／い形容词词干 + ければ",
    useWhen: "表示条件，也常组成「〜ばいいですか」询问最佳做法。",
    contrast: "「〜と」偏自然结果；「〜ば」更强调条件是否满足。",
    mistake: "五段动词不能直接辞书形加「ば」。",
  },
  "〜と": {
    formula: "动词辞书形 + と",
    useWhen: "表示一做前项就自然出现后项，或恒定、规则化的结果。",
    contrast: "「〜たら」适合一次性条件；「〜と」更像自然结果。",
    mistake: "后项通常不直接接自己的意志请求。",
  },
  "〜ながら": {
    formula: "动词ます形去ます + ながら",
    useWhen: "同一个主体同时做两个动作，后项通常是主要动作。",
    contrast: "前项是伴随背景，不是两个完全并列的动作。",
    mistake: "前后动作不是同一主体时，不能直接使用。",
  },
  "〜ために": {
    formula: "名词 + の／动词辞书形 + ために",
    useWhen: "说明目的，也可接名词化原因表示“因为”。",
    contrast: "目的和原因接续相同，必须靠上下文判断。",
    mistake: "名词目的不要漏掉「の」，例如「観光ために」不自然。",
  },
  "〜ように": {
    formula: "动词辞书形／ない形 + ように",
    useWhen: "表示为了让能力、状态或习惯成立。",
    contrast: "可意志控制的目的多用「ために」；能力变化常用「ように」。",
    mistake: "「〜ようにする」是尽量做到，不是已经完成。",
  },
  "〜すぎます": {
    formula: "形容词词干／动词ます形去ます + すぎます",
    useWhen: "程度超过合适范围，常带“太多、太烫、太贵”的评价。",
    contrast: "「とても」只说程度高；「〜すぎる」明确超过界限。",
    mistake: "い形容词去「い」，な形容词和动词直接接「すぎる」。",
  },
  "〜やすい／にくい": {
    formula: "动词ます形去ます + やすい／にくい",
    useWhen: "表示动作做起来容易或困难。",
    contrast: "这是派生い形容词，会继续按い形容词变化。",
    mistake: "「〜にくい」是“难做”，不是“不要做”。",
  },
  "〜ほうがいい": {
    formula: "动词た形／ない形 + ほうがいい",
    useWhen: "给出建议；肯定建议常用た形，否定建议用ない形。",
    contrast: "「〜てください」直接要求；「〜ほうがいい」是在给判断。",
    mistake: "肯定建议不要说成辞书形接「ほうがいい」。",
  },
  "〜より": {
    formula: "AよりBのほうが…",
    useWhen: "比较两个对象，说明B在某方面更突出。",
    contrast: "「〜ほど」常用于程度和否定比较；「〜より」标出比较基准。",
    mistake: "完整比较通常用「Bのほうが」呼应。",
  },
  "〜だけ": {
    formula: "名词／数量 + だけ",
    useWhen: "限定范围或数量：只、仅。",
    contrast: "「〜しか〜ない」必须配否定；「〜だけ」可以接肯定。",
    mistake: "注意「だけ」修饰的范围，避免放错位置。",
  },
  "〜しか〜ない": {
    formula: "名词 + しか + 否定形",
    useWhen: "表示只有这一种选择或数量，并带限制感。",
    contrast: "「〜だけある」可肯定；「〜しかない」必须配否定。",
    mistake: "不要说「しかあります」；谓语需要否定。",
  },
  "〜ばかり": {
    formula: "名词／动词て形 + ばかり",
    useWhen: "表示净是某物、刚刚做完或反复偏向某行为。",
    contrast: "「〜だけ」是限定数量；「〜ばかり」还能带评价。",
    mistake: "“刚刚”常用「たばかり」，不要误接成て形。",
  },
  "〜ところです": {
    formula: "辞书形／ている／た形 + ところです",
    useWhen: "强调动作阶段：将做、正在做或刚做完。",
    contrast: "「〜ています」单纯持续；「〜ところ」把时间点拉近。",
    mistake: "不是所有动词都能自然搭配，需要看动作阶段。",
  },
  "被动形": {
    formula: "五段あ段 + れる／一段去る + られる／する→される",
    useWhen: "从承受动作的人视角叙述，也可表示受害感。",
    contrast: "被动与可能形部分形式相同，需要靠助词和语境判断。",
    mistake: "动作执行者通常用「に」标记，不要全部用「を」。",
  },
  "使役形": {
    formula: "五段あ段 + せる／一段去る + させる／する→させる",
    useWhen: "表示让某人做某事，或允许某事发生。",
    contrast: "请别人帮忙通常用「てもらう」，不是直接使役。",
    mistake: "直接对长辈使用容易显得居高临下。",
  },
  "です・ます礼貌体": {
    formula: "名词／な形容词 + です；动词ます形 + ます",
    useWhen: "旅行中面对店员、陌生人和服务人员时最稳妥的默认语体。",
    contrast: "普通体更像朋友间说话；礼貌体风险更低，但不必过度敬语化。",
    mistake: "同一句不要混用普通体和礼貌体；先保证句尾统一。",
  },
  "核心句": {
    formula: "按本句完整表达块记忆，再拆出可替换的词位",
    useWhen: "这是实景中最直接可调用的一句话，先保证完整说出。",
    contrast: "先学整句的节奏和落点，不必立刻逐词分析成中文语序。",
    mistake: "不要只记住关键词；助词和句尾往往决定关系和语气。",
  },
};

function particleGuide(label: string): GrammarGuide | null {
  if (label.includes("を押") || label === "を押してください") {
    return {
      formula: "动作对象 + を + 他动词",
      useWhen: "「を」标出动作直接作用的对象，例如按按钮、取票、拿行李。",
      contrast: "「が」常标出状态主体或新信息；「を」强调被操作的对象。",
      mistake: "不要把他动词的对象错标成「が」，除非句子结构已经改变。",
    };
  }
  if (label.includes("にあります") || label.includes("に泊ま") || label.includes("にいます")) {
    return {
      formula: "存在地点 + に + あります／います",
      useWhen: "「に」标记存在位置；人和动物用「います」，物和设施用「あります」。",
      contrast: "「で」标记动作发生地点；「に」在这里更像存在落点。",
      mistake: "不要把人说成「あります」，也不要把设施说成「います」。",
    };
  }
  if (label.includes("で買") || label.includes("で払") || label.includes("で行")) {
    return {
      formula: "手段／地点 + で + 动词",
      useWhen: "「で」可表示交通工具、支付工具或动作发生的地点。",
      contrast: "「に」多指方向或存在点；「で」更强调完成动作的场域或手段。",
      mistake: "不要看到中文“在”就机械用「で」，先判断是地点还是存在。",
    };
  }
  if (label.includes("から") || label.includes("まで")) {
    return {
      formula: "起点 + から；终点 + まで",
      useWhen: "「から」标出起点，「まで」标出范围终点，可指空间或时间。",
      contrast: "「を」可表示经过或离开的路径，不等于单纯的起点。",
      mistake: "不要漏掉终点前的助词，也不要和方向助词「へ」混用。",
    };
  }
  if (label.includes("だけ")) {
    return QUICK_GRAMMAR["〜だけ"];
  }
  if (label.includes("も")) {
    return {
      formula: "名词 + も",
      useWhen: "「も」把新信息和前一项并列，表示“也、同样”。",
      contrast: "「は」提出主题；「も」通常暗示前面还有同类信息。",
      mistake: "不要把「も」当成单纯的“和”，两个名词并列仍需「と」。",
    };
  }
  return null;
}

function grammarGuideFor(card: Card, guides: CuratedGrammar[]): GrammarGuide {
  const exact = guides.find((guide) => guide.title === card.grammar);
  if (exact) return exact;
  const quick = QUICK_GRAMMAR[card.grammar] ?? particleGuide(card.grammar);
  if (quick) return quick;
  return {
    formula: card.grammar,
    useWhen: `这句在“${card.micro}”里完成“${card.function}”。先保留完整表达，再把对象、地点或时间换成自己的真实信息。`,
    contrast: card.note,
    mistake: "先把助词和句尾一起记；只换名词却保留错助词，会让句子听起来不自然。",
  };
}

const FRIENDLY_OPENERS = [
  "这句在现场很好用，别先把它当成一条语法题。",
  "先想象你真的站在那个柜台前，这句话就有节奏了。",
  "这句的难点不在汉字，而在说话时把重点落在哪里。",
  "日本朋友听到这句，最先感受到的是你的态度，不是你的词汇量。",
  "这句不用背得很“标准”，但要说得让人马上知道你想推进什么。",
  "把中文意思先放一边，这句话其实是在替你做一件事。",
  "这句很适合拿来练“说完以后对方知道怎么接”。",
  "先把这句话当一个完整动作，不要逐词翻译成中文。",
];

function stableIndex(text: string, length: number) {
  let value = 0;
  for (const char of text) value = (value * 31 + char.charCodeAt(0)) % 100000;
  return value % length;
}

function friendlyComment(card: Card) {
  const opener = FRIENDLY_OPENERS[stableIndex(card.id, FRIENDLY_OPENERS.length)];
  const focus =
    card.function.includes("问") || card.function.includes("确认")
      ? `这句的重点是把「${card.grammar}」放在一个对方能回答的位置。`
      : card.function.includes("请求") || card.function.includes("需求")
        ? `这句不是命令，而是把「${card.function}」说成对方容易执行的动作。`
        : card.function.includes("问题") || card.function.includes("求助")
          ? `这句先把困难摆出来，再给对方一个明确的帮助入口。`
          : card.function.includes("收尾") || card.function.includes("致谢")
            ? `这句负责把关系收好，不要只说关键词就转身走。`
            : `这句的关键是把「${card.function}」落到一个具体场景里。`;
  return `${opener} 中文是「${card.zh}」，日语则用「${card.jp}」完成这件事。${focus} ${card.note}`;
}

export function casualVersion(card: Card) {
  const text = card.jp;
  const kana = card.kana;
  const transformations: Array<[string, string, string, string]> = [
    ["んですが", "んだけど", "んですが", "んだけど"],
    ["たいです", "たい", "たいです", "たい"],
    ["てください", "てもらえる？", "てください", "てもらえる？"],
    ["でください", "でもらえる？", "でください", "でもらえる？"],
    ["ですか", "？", "ですか", "？"],
    ["をお願いします", "、お願い", "をおねがいします", "、おねがい"],
    ["をください", "、お願い", "をください", "、おねがい"],
  ];
  for (const [fromJp, toJp, fromKana, toKana] of transformations) {
    if (text.includes(fromJp)) {
      return {
        jp: text.replace(fromJp, toJp),
        kana: kana.replace(fromKana, toKana),
      };
    }
  }
  return { jp: text, kana };
}

export function migrationAnswers(card: Card, siblings: Card[]) {
  const sameGrammarOptions = siblings.filter(
    (item) => item.id !== card.id && item.grammar === card.grammar,
  );
  const sameFunctionOptions = siblings.filter(
    (item) => item.id !== card.id && item.function === card.function,
  );
  const responseOptions = siblings.filter(
    (item) => item.id !== card.id && item.function.includes("回应"),
  );
  const sameGrammar = sameGrammarOptions[stableIndex(card.id, Math.max(1, sameGrammarOptions.length))];
  const sameFunction = sameFunctionOptions[stableIndex(card.id, Math.max(1, sameFunctionOptions.length))];
  const response = responseOptions[stableIndex(card.id, Math.max(1, responseOptions.length))];
  const followUp =
    card.function.includes("问") || card.function.includes("确认")
      ? {
          jp: "はい、わかりました。ありがとうございます。",
          kana: "はい、わかりました。ありがとうございます。",
        }
      : card.function.includes("问题") || card.function.includes("求助")
        ? {
            jp: "では、どうすればいいですか。",
            kana: "では、どうすればいいですか。",
          }
        : card.function.includes("收尾") || card.function.includes("致谢")
          ? {
              jp: "またお願いします。",
              kana: "またおねがいします。",
            }
          : {
              jp: "はい、お願いします。",
              kana: "はい、おねがいします。",
            };
  const friendlyAnswer = casualVersion(card);
  return [
    {
      label: "换对象",
      task: "把这句话说给朋友听，礼貌度可以降低，但不要丢掉原来的交流目的。",
      answer: friendlyAnswer,
      note: friendlyAnswer.jp === card.jp
        ? "保留下来的礼貌体在朋友间也不会失礼，尤其是初次见面或场合较正式时。"
        : "这是更熟一点的版本；如果要特别礼貌，仍可使用原句。",
    },
    {
      label: "换信息",
      task: "保留同一个语法骨架，把时间、地点、物品或人物换成你自己的信息。",
      answer: sameGrammar
        ? { jp: sameGrammar.jp, kana: sameGrammar.kana }
        : sameFunction
          ? { jp: sameFunction.jp, kana: sameFunction.kana }
          : { jp: card.jp, kana: card.kana },
      note: sameGrammar
        ? `这是当天另一句同结构表达：「${sameGrammar.zh}」。`
        : sameFunction
          ? `这是同一种交流功能的另一种说法：「${sameFunction.zh}」。`
          : "先把原句里的一个信息点替换掉，句尾不要跟着乱改。",
    },
    {
      label: "接一轮",
      task: "说完原句后，再接一句能把对话继续下去的话，别让场面停在单词上。",
      answer: response ? { jp: response.jp, kana: response.kana } : followUp,
      note: response
        ? `这是当天学过的回应句：「${response.zh}」。`
        : "这是安全的通用接话；真正的对话里也可以根据对方的回答再追问。",
    },
  ];
}

function sentenceShape(card: Card) {
  if (/[か？?]$/.test(card.jp.replace("。", ""))) {
    return "这是一个把信息缺口交给对方的问句。说的时候句尾保持上扬，但不要把「か」吞掉。";
  }
  if (/ください|お願い|てもらえ|ていただけ|ませんか/.test(card.jp)) {
    return "这是请求或协商句。先让对方听清“要做什么”，再让句尾负责礼貌度。";
  }
  if (/ません|ない|なくて|ずに/.test(card.jp)) {
    return "句子里有否定。听力上最危险的是漏掉「ない／ません」，否则整句方向会反过来。";
  }
  if (/ました|でした|かったです/.test(card.jp)) {
    return "这是已完成或过去状态。和「今日／昨日／さっき」这类时间词一起说，信息会更完整。";
  }
  return "这是陈述或回应句。先把主题和信息块说完整，再用「です／ます」把礼貌度稳定下来。";
}

function LineLearningPanel({
  card,
  guides,
  tokens,
  siblings,
  culture,
}: {
  card: Card;
  guides: CuratedGrammar[];
  tokens: LineToken[];
  siblings: Card[];
  culture: { title: string; text: string };
}) {
  const guide = grammarGuideFor(card, guides);
  const counterGuide = getCounterGuide(card.jp);
  const answers = migrationAnswers(card, siblings);
  return (
    <div className="line-learning-panel">
      <div className="friend-explain">
        <span>朋友式讲解</span>
        <p>{friendlyComment(card)}</p>
      </div>

      <div className="line-vocabulary">
        <div className="line-subhead">
          <span>WORD BY WORD</span><b>逐词拆解 · 共 {tokens.length} 个成分</b>
        </div>
        <div className="line-token-list">
          {tokens.map((token, index) => (
            <div className="line-token" key={`${token.surface}-${token.kana}-${index}`}>
              <span className="token-index">{String(index + 1).padStart(2, "0")}</span>
              <div className="token-word">
                <b>{token.surface}</b>
                <span>{token.kana}</span>
                {token.base && <small>辞书形：{token.base}</small>}
              </div>
              <div className="token-meaning">
                <em>{token.pos}</em>
                <p>{token.meaning}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="line-shape"><b>句子形状</b>{sentenceShape(card)}</p>
      </div>

      {counterGuide && (
        <div className="counter-reference">
          <div className="line-subhead">
            <span>NUMBER CHEAT SHEET</span><b>{counterGuide.title}</b>
          </div>
          <p className="counter-intro">{counterGuide.intro}</p>
          <div className="counter-grid">
            {counterGuide.rows.map((row) => (
              <div
                key={row.label}
                className={row.label === counterGuide.activeLabel ? "active" : ""}
              >
                <b>{row.label}</b>
                <span>{row.kana}</span>
                <small>{row.zh}</small>
              </div>
            ))}
          </div>
          <div className="counter-notes">
            {counterGuide.notes.map((note) => <p key={note}>{note}</p>)}
          </div>
        </div>
      )}

      <div className="line-culture">
        <div className="line-subhead"><span>LOCAL NOTE</span><b>当地小观察 · {culture.title}</b></div>
        <p>{culture.text}</p>
      </div>

      <div className="line-subhead grammar-subhead"><span>GRAMMAR</span><b>这句为什么这样说</b></div>
      <div className="line-grammar-grid">
        <div>
          <span>结构怎么拼</span>
          <b>{guide.formula}</b>
          <small className="line-example">{card.jp}</small>
          <small>{card.kana}</small>
        </div>
        <div><span>在这句里做什么</span><p>{guide.useWhen} 本句具体是在“{card.micro}”里完成“{card.function}”。</p></div>
        <div><span>和相近说法怎么分</span><p>{guide.contrast}</p></div>
        <div className="line-grammar-warning"><span>你最容易错在这里</span><p>{guide.mistake}</p></div>
      </div>

      <div className="line-transfer">
        <div className="line-transfer-title"><span>TRANSFER + ANSWER</span><b>迁移练习与参考答案</b></div>
        {answers.map((item, index) => (
          <div className="line-transfer-item" key={item.label}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <div>
              <b>{item.label}</b>
              <p>{item.task}</p>
              <div className="transfer-answer">
                <span>参考答案</span>
                <q>{item.answer.jp}</q>
                <small className="transfer-kana">{item.answer.kana}</small>
                <small>{item.note}</small>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CuratedSummary({
  day,
  cards,
  masteredToday,
}: {
  day: CuratedDay;
  cards: Card[];
  masteredToday: number;
}) {
  const anchors = day.microScenes
    .map((micro) => micro.lines.find((line) => line.scope === "core") ?? micro.lines[0])
    .filter(Boolean)
    .slice(0, 9);
  const coreCount = cards.filter((card) => card.scope === "core").length;
  return (
    <div className="curated-summary">
      <section className="study-recipe">
        <span className="summary-title">THE 60-MINUTE ROUTE</span>
        <h2>今天不是“看完”，是练到嘴熟</h2>
        <div className="minute-route">
          <div><b>10′</b><span>先扫场景</span><small>只看中文猜意图，再听 12 句核心表达。</small></div>
          <div><b>20′</b><span>遮住日语</span><small>看中文开口，卡住才展开假名，立刻重说。</small></div>
          <div><b>15′</b><span>换角色说</span><small>同一句换礼貌度、情绪和对象，不做机械跟读。</small></div>
          <div><b>10′</b><span>攻收藏</span><small>只收藏今天说不顺的句子，明天优先回收。</small></div>
          <div><b>5′</b><span>做迁移</span><small>用总结里的任务换时间、地点和突发条件。</small></div>
        </div>
        <div className="study-score">
          <span>本日开口记录</span>
          <b>{masteredToday} / {cards.length}</b>
          <small>{coreCount} 句是场景核心；先啃核心，再用迁移句扩边界。</small>
        </div>
      </section>

      <section>
        <span className="summary-title">VOCABULARY</span>
        <h2>今天必须叫得出名字的词</h2>
        <div className="summary-vocab">
          {day.words.map((word) => (
            <div key={`${word.jp}-${word.kana}`}>
              <b>{word.jp}</b>
              <span>{word.kana}</span>
              <small>{word.zh}</small>
              {word.note && <p>{word.note}</p>}
            </div>
          ))}
        </div>
      </section>

      <section>
        <span className="summary-title">SENTENCE ANCHORS</span>
        <h2>九句把场景串起来</h2>
        <div className="summary-anchors">
          {anchors.map((line, index) => (
            <button key={line.id} onClick={() => speakJapanese(line.jp, 1)}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div><b>{line.jp}</b><em>{line.kana}</em><small>{line.zh}</small></div>
              <i>♪</i>
            </button>
          ))}
        </div>
      </section>

      <section>
        <span className="summary-title">GRAMMAR SYSTEM</span>
        <h2>语法不是定义，是选择</h2>
        <div className="summary-grammar">
          {day.grammar.map((item) => (
            <details key={item.title}>
              <summary>
                <b>{item.title}</b>
                <small>{item.explain}</small>
              </summary>
              <div className="grammar-detail">
                <div className="grammar-formula"><span>接续</span><b>{item.formula}</b></div>
                <div className="grammar-info"><span>什么时候用</span><p>{item.useWhen}</p></div>
                <div className="grammar-info"><span>和相近语法怎么分</span><p>{item.contrast}</p></div>
                <div className="grammar-example">
                  <span>今天的真实例句</span><p>{item.example}</p><small>{item.kana}</small>
                </div>
                <div className="grammar-mistake"><b>最容易说错</b><p>{item.mistake}</p></div>
              </div>
            </details>
          ))}
        </div>
      </section>

      <section>
        <span className="summary-title">TRANSFER</span>
        <h2>把今天迁移出去</h2>
        <div className="summary-transfer">
          {day.transfers.map((item, index) => (
            <div key={item}><span>{index + 1}</span><p>{item}</p></div>
          ))}
        </div>
      </section>

      <section className="source-note">
        <b>内容与许可</b>
        <p>
          第 01 天为人工编排原创场景；第 02–60 天以 Tatoeba 开放句对为语料，
          经场景筛选、近似去重与逐句假名重建，中文采用简体显示。逐词释义使用
          JMdict、KANJIDIC2（CC BY-SA 3.0）与 CC-CEDICT（CC BY-SA 4.0）
          派生的离线双语词典数据。
        </p>
        <a href="https://tatoeba.org/" target="_blank" rel="noreferrer">
          Tatoeba · CC BY 2.0 FR
        </a>
      </section>
    </div>
  );
}

function Favorites({
  cards,
  mastered,
  onRemove,
  onMastered,
  onBrowse,
}: {
  cards: SavedCard[];
  mastered: string[];
  onRemove: (card: SavedCard) => void;
  onMastered: (card: SavedCard) => void;
  onBrowse: () => void;
}) {
  return (
    <div className="curated-favorites">
      <div className="favorites-title">
        <span>MY PHRASE BOOK</span>
        <h2>想和这些话再见面</h2>
        <p>跨天保存，不跟当天筛选一起消失。明天先复习这里。</p>
      </div>
      {cards.length === 0 ? (
        <div className="curated-empty">
          <span>♡</span>
          <p>把还不熟的表达留下来。收藏不是奖励，是明天的复习入口。</p>
          <button onClick={onBrowse}>去浏览今天的句子</button>
        </div>
      ) : (
        cards.map((card) => (
          <article className="favorite-card" key={`${card.id}-${card.jp}`}>
            <div>
              <span>
                DAY {String(card.day ?? 1).padStart(2, "0")} · {card.micro ?? card.scene ?? "旅行表达"}
              </span>
              <button onClick={() => onRemove(card)} aria-label="取消收藏">♥</button>
            </div>
            <h3>{card.jp}</h3>
            <p>{card.kana}</p>
            <small>{card.zh}</small>
            <div className="favorite-note">{card.note}</div>
            <div className="card-actions">
              <button className="curated-listen" onClick={() => speakJapanese(card.jp, 1)}>
                ♪ 听这句
              </button>
              <button
                className={`master-button ${mastered.includes(card.id) ? "done" : ""}`}
                onClick={() => onMastered(card)}
              >
                {mastered.includes(card.id) ? "✓ 已说顺" : "○ 说顺了"}
              </button>
            </div>
          </article>
        ))
      )}
    </div>
  );
}
