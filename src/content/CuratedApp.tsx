import { useEffect, useMemo, useState } from "react";
import {
  DAY_META,
  loadCuratedDay,
  TOTAL_DAY_COUNT,
  type CuratedDay,
  type CuratedLine,
} from "../data/curatedDays";
import type { LineScope } from "../data/curatedDayTypes";
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
  saved,
  mastered,
  onSave,
  onMastered,
}: {
  card: Card;
  index: number;
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
          <div className="card-actions">
            <button className="curated-listen" onClick={() => speakJapanese(card.jp, 1)}>
              ♪ 听少年朗读
            </button>
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
          经场景筛选、近似去重与逐句假名重建，中文采用简体显示。
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
