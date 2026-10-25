import { useMemo, useState } from "react";
import { DAYS, TOTAL_SENTENCES } from "../data/sentenceBank";
import type { SentenceCard } from "../data/sentenceBank";
import { speakJapanese } from "../lib/speech";
import { HaruAvatar } from "../friend/HaruAvatar";

type Tab = "cards" | "summary" | "favorites";

const FAVORITES_KEY = "kotoba60:card-favorites:v1";
const DAY_KEY = "kotoba60:selected-day";

function readFavorites(): SentenceCard[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function SentenceApp() {
  const [dayNumber, setDayNumber] = useState(() => {
    const saved = Number(localStorage.getItem(DAY_KEY));
    return Number.isFinite(saved) && saved >= 1 && saved <= 60 ? saved : 1;
  });
  const [tab, setTab] = useState<Tab>("cards");
  const [showCalendar, setShowCalendar] = useState(false);
  const [query, setQuery] = useState("");
  const [grammarFilter, setGrammarFilter] = useState("全部");
  const [favorites, setFavorites] = useState<SentenceCard[]>(readFavorites);
  const day = DAYS[dayNumber - 1];

  const grammarOptions = useMemo(() => ["全部", ...new Set(day.cards.map((card) => card.grammar))], [day]);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return day.cards.filter((card) => {
      const grammarMatch = grammarFilter === "全部" || card.grammar === grammarFilter;
      const textMatch = !normalized || [card.jp, card.kana, card.zh, card.grammar, card.item.jp].join(" ").toLowerCase().includes(normalized);
      return grammarMatch && textMatch;
    });
  }, [day, grammarFilter, query]);

  function selectDay(value: number) {
    setDayNumber(value);
    localStorage.setItem(DAY_KEY, String(value));
    setShowCalendar(false);
    setTab("cards");
    setGrammarFilter("全部");
    setQuery("");
    window.scrollTo({ top: 0 });
  }

  function toggleFavorite(card: SentenceCard) {
    const exists = favorites.some((item) => item.id === card.id);
    const next = exists ? favorites.filter((item) => item.id !== card.id) : [...favorites, card];
    setFavorites(next);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
  }

  return (
    <div className="cute-shell">
      <header className="cute-header">
        <button className="cute-brand" onClick={() => setTab("cards")}>
          <span className="flower">✿</span>
          <span><b>ことば六十</b><small>6000 SENTENCE CARDS</small></span>
        </button>
        <button className="day-button" onClick={() => setShowCalendar((value) => !value)}>
          DAY {String(dayNumber).padStart(2, "0")} <span>⌄</span>
        </button>
      </header>

      {showCalendar && (
        <section className="calendar-sheet">
          <div className="calendar-head"><b>60 天句子地图</b><button onClick={() => setShowCalendar(false)}>关闭</button></div>
          <div className="calendar-grid">
            {DAYS.map((item) => (
              <button key={item.day} className={item.day === dayNumber ? "active" : ""} onClick={() => selectDay(item.day)}>
                <span>{item.day}</span><small>{item.title.slice(0, 4)}</small>
              </button>
            ))}
          </div>
        </section>
      )}

      <main className="cute-main">
        <section className="day-hero">
          <div>
            <span>DAY {String(day.day).padStart(2, "0")} · {day.scene}</span>
            <h1>{day.title}</h1>
            <p>今天把 {day.items.length} 个场景词 × {day.frames.length} 种表达功能，组成 100 句可立刻使用的句子。</p>
          </div>
          <HaruAvatar size="small" />
          <div className="hero-hearts">♡ ♡ ♡</div>
        </section>

        <div className="day-arrows">
          <button disabled={dayNumber === 1} onClick={() => selectDay(dayNumber - 1)}>← 前一天</button>
          <span>{TOTAL_SENTENCES.toLocaleString()} 张总卡</span>
          <button disabled={dayNumber === 60} onClick={() => selectDay(dayNumber + 1)}>后一天 →</button>
        </div>

        <nav className="content-tabs">
          <button className={tab === "cards" ? "active" : ""} onClick={() => setTab("cards")}>100 句 <span>{day.cards.length}</span></button>
          <button className={tab === "summary" ? "active" : ""} onClick={() => setTab("summary")}>今日总结 <span>{day.grammarSummary.length}</span></button>
          <button className={tab === "favorites" ? "active" : ""} onClick={() => setTab("favorites")}>收藏 <span>{favorites.length}</span></button>
        </nav>

        {tab === "cards" && (
          <>
            <div className="search-row">
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜日语、假名、中文或语法…" />
            </div>
            <div className="grammar-chips">
              {grammarOptions.map((grammar) => (
                <button key={grammar} className={grammarFilter === grammar ? "active" : ""} onClick={() => setGrammarFilter(grammar)}>{grammar}</button>
              ))}
            </div>
            <div className="card-count">显示 {filtered.length} / 100 句</div>
            <div className="sentence-list">
              {filtered.map((card, index) => (
                <SentenceRow
                  key={card.id}
                  card={card}
                  index={index}
                  favorite={favorites.some((item) => item.id === card.id)}
                  onFavorite={() => toggleFavorite(card)}
                />
              ))}
            </div>
          </>
        )}

        {tab === "summary" && <DaySummary dayNumber={dayNumber} />}
        {tab === "favorites" && (
          <FavoritesView
            favorites={favorites}
            onFavorite={toggleFavorite}
            onBrowse={() => setTab("cards")}
          />
        )}
      </main>

      <nav className="cute-nav">
        <button className={tab === "cards" ? "active" : ""} onClick={() => setTab("cards")}><span>✿</span>句子</button>
        <button className={tab === "summary" ? "active" : ""} onClick={() => setTab("summary")}><span>の</span>总结</button>
        <button className={tab === "favorites" ? "active" : ""} onClick={() => setTab("favorites")}><span>♡</span>收藏</button>
      </nav>
    </div>
  );
}

function SentenceRow({
  card,
  index,
  favorite,
  onFavorite,
}: {
  card: SentenceCard;
  index: number;
  favorite: boolean;
  onFavorite: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <article className={`sentence-row ${open ? "open" : ""}`}>
      <div className="sentence-summary">
        <button className="sentence-main" onClick={() => setOpen((value) => !value)}>
          <span className="sentence-number">{String(index + 1).padStart(3, "0")}</span>
          <span className="sentence-text">
            <b>{card.jp}</b>
            <em>{card.kana}</em>
            <small>{card.zh}</small>
          </span>
          <span className="sentence-chevron">{open ? "−" : "+"}</span>
        </button>
        <button
          className={`heart-button ${favorite ? "saved" : ""}`}
          aria-label={favorite ? "取消收藏" : "收藏"}
          onClick={onFavorite}
        >{favorite ? "♥" : "♡"}</button>
      </div>
      {open && (
        <div className="sentence-detail">
          <div className="kana-reading">{card.kana}</div>
          <div className="detail-grid">
            <div><span>核心词</span><b>{card.item.jp} · {card.item.zh}</b></div>
            <div><span>表达功能</span><b>{card.grammar}</b></div>
          </div>
          <p className="why-copy">{card.why}</p>
          <div className="related-line">
            <span>关联说法</span>
            {card.related.map((row) => <p key={row}>{row}</p>)}
          </div>
          <button className="listen-button" onClick={() => speakJapanese(card.jp, 0.98)}>♪ 听这句</button>
        </div>
      )}
    </article>
  );
}

function DaySummary({ dayNumber }: { dayNumber: number }) {
  const day = DAYS[dayNumber - 1];
  return (
    <div className="summary-module">
      <section>
        <span className="summary-kicker">TODAY'S WORDS</span>
        <h2>10 个场景词</h2>
        <div className="summary-words">
          {day.items.map((item) => (
            <div key={item.jp}><b>{item.jp}</b><span>{item.kana}</span><small>{item.zh}</small></div>
          ))}
        </div>
      </section>
      <section>
        <span className="summary-kicker">GRAMMAR PATTERNS</span>
        <h2>10 个表达功能</h2>
        <div className="grammar-summary-list">
          {day.frames.map((frame, index) => (
            <details key={`${frame.grammar}-${index}`}>
              <summary><span>{String(index + 1).padStart(2, "0")}</span><b>{frame.grammar}</b><small>{frame.why}</small></summary>
              <div>
                <p>{frame.jp}</p>
                <small>{frame.kana}</small>
                <em>{frame.zh}</em>
              </div>
            </details>
          ))}
        </div>
      </section>
      <section>
        <span className="summary-kicker">RELATED SYSTEM</span>
        <h2>今天的关联地图</h2>
        <p className="related-intro">这些句型会在后面的不同场景中交叉出现。不要把一句锁死在一个场景里；换一个名词，就能迁移到新任务。</p>
        <div className="relation-web">
          {day.relatedTags.map((tag) => <span key={tag}>{tag}</span>)}
        </div>
      </section>
    </div>
  );
}

function FavoritesView({
  favorites,
  onFavorite,
  onBrowse,
}: {
  favorites: SentenceCard[];
  onFavorite: (card: SentenceCard) => void;
  onBrowse: () => void;
}) {
  return (
    <div className="favorites-view">
      <div className="favorites-head">
        <div><span>MY SPECIAL WORDS</span><h2>想再遇见的话</h2></div>
        <b>{favorites.length}</b>
      </div>
      {favorites.length === 0 ? (
        <div className="empty-favorites">
          <span>♡</span>
          <p>点句子右侧的小爱心，把想再看的句子留在这里。</p>
          <button onClick={onBrowse}>去翻今天的句子</button>
        </div>
      ) : (
        <div className="favorite-list">
          {favorites.map((card) => (
            <article key={card.id}>
              <div><span>DAY {String(card.day).padStart(2, "0")}</span><button onClick={() => onFavorite(card)}>♥</button></div>
              <h3>{card.jp}</h3>
              <p className="favorite-kana">{card.kana}</p>
              <p>{card.zh}</p>
              <small>{card.grammar} · {card.why}</small>
              <button className="listen-button" onClick={() => speakJapanese(card.jp, 0.98)}>♪ 听这句</button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
