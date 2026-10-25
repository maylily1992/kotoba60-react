import { useMemo, useState } from "react";
import { CURATED_DAY_ONE, CURATED_DAY_ONE_CARD_COUNT } from "../data/curatedScene";
import { DAYS } from "../data/sentenceBank";
import { speakJapanese } from "../lib/speech";

type Tab = "cards" | "summary" | "favorites";
type FavoriteCard = {
  id: string;
  micro: string;
  speaker: string;
  jp: string;
  kana: string;
  zh: string;
  fn: string;
  grammar: string;
  note: string;
};

const FAVORITES_KEY = "kotoba60:curated-favorites:v1";

function buildCards() {
  return CURATED_DAY_ONE.microScenes.flatMap((micro, microIndex) =>
    micro.lines.map((line, lineIndex) => ({
      ...line,
      id: `${microIndex}-${lineIndex}`,
      micro: micro.title,
      setting: micro.setting,
      fn: line.function,
    })),
  );
}

function readFavorites(): FavoriteCard[] {
  try {
    const value = JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function CuratedApp() {
  const cards = useMemo(buildCards, []);
  const [tab, setTab] = useState<Tab>("cards");
  const [microFilter, setMicroFilter] = useState("全部");
  const [query, setQuery] = useState("");
  const [showDays, setShowDays] = useState(false);
  const [favorites, setFavorites] = useState<FavoriteCard[]>(readFavorites);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cards.filter((card) => {
      const microMatch = microFilter === "全部" || card.micro === microFilter;
      const textMatch = !q || [card.jp, card.kana, card.zh, card.grammar, card.fn].join(" ").toLowerCase().includes(q);
      return microMatch && textMatch;
    });
  }, [cards, microFilter, query]);

  function toggleFavorite(card: FavoriteCard) {
    const exists = favorites.some((item) => item.id === card.id);
    const next = exists ? favorites.filter((item) => item.id !== card.id) : [...favorites, card];
    setFavorites(next);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
  }

  return (
    <div className="curated-shell">
      <header className="curated-header">
        <div className="curated-brand"><span>✿</span><div><b>ことば六十</b><small>REAL CONVERSATION ATLAS</small></div></div>
        <button onClick={() => setShowDays((value) => !value)}>DAY 01 <span>⌄</span></button>
      </header>

      {showDays && (
        <section className="curated-days-sheet">
          <div><b>60 天场景地图</b><button onClick={() => setShowDays(false)}>关闭</button></div>
          <p>Day 01 已完成人工编排。其余日期按同一标准逐个制作，不再用词×句型组合充数。</p>
          <div className="curated-days-grid">
            {DAYS.map((day) => (
              <button
                key={day.day}
                className={day.day === 1 ? "ready" : "pending"}
                onClick={() => day.day !== 1 && alert(`DAY ${String(day.day).padStart(2, "0")}「${day.title}」仍在逐句编排中。`)}
              >
                <b>{String(day.day).padStart(2, "0")}</b>
                <small>{day.title.slice(0, 7)}</small>
                <em>{day.day === 1 ? "可学习" : "编排中"}</em>
              </button>
            ))}
          </div>
        </section>
      )}

      <main className="curated-main">
        <section className="curated-hero">
          <div className="hero-flower">✿</div>
          <span>DAY 01 · {CURATED_DAY_ONE.scene}</span>
          <h1>{CURATED_DAY_ONE.title}</h1>
          <p>{CURATED_DAY_ONE.goal}</p>
          <div className="hero-numbers">
            <div><b>{CURATED_DAY_ONE_CARD_COUNT}</b><span>真实对话句</span></div>
            <div><b>{CURATED_DAY_ONE.microScenes.length}</b><span>微型情境</span></div>
            <div><b>{CURATED_DAY_ONE.grammar.length}</b><span>语法重点</span></div>
          </div>
        </section>

        <nav className="curated-tabs">
          <button className={tab === "cards" ? "active" : ""} onClick={() => setTab("cards")}>场景对话 <span>{cards.length}</span></button>
          <button className={tab === "summary" ? "active" : ""} onClick={() => setTab("summary")}>今日总结</button>
          <button className={tab === "favorites" ? "active" : ""} onClick={() => setTab("favorites")}>我的收藏 <span>{favorites.length}</span></button>
        </nav>

        {tab === "cards" && (
          <>
            <div className="curated-search">
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索日语、平假名、中文或语法…" />
            </div>
            <div className="micro-chips">
              {["全部", ...CURATED_DAY_ONE.microScenes.map((micro) => micro.title)].map((micro) => (
                <button key={micro} className={microFilter === micro ? "active" : ""} onClick={() => setMicroFilter(micro)}>{micro}</button>
              ))}
            </div>
            <div className="curated-count">当前 {filtered.length} 句 · {microFilter}</div>
            <div className="curated-list">
              {filtered.map((card, index) => (
                <CuratedCard
                  key={card.id}
                  card={card}
                  index={index}
                  saved={favorites.some((item) => item.id === card.id)}
                  onSave={() => toggleFavorite(card)}
                />
              ))}
            </div>
          </>
        )}

        {tab === "summary" && <CuratedSummary />}
        {tab === "favorites" && (
          <Favorites cards={favorites} onRemove={toggleFavorite} onBrowse={() => setTab("cards")} />
        )}
      </main>

      <nav className="curated-nav">
        <button className={tab === "cards" ? "active" : ""} onClick={() => setTab("cards")}><span>✿</span>对话</button>
        <button className={tab === "summary" ? "active" : ""} onClick={() => setTab("summary")}><span>の</span>总结</button>
        <button className={tab === "favorites" ? "active" : ""} onClick={() => setTab("favorites")}><span>♡</span>收藏</button>
      </nav>
    </div>
  );
}

function CuratedCard({
  card,
  index,
  saved,
  onSave,
}: {
  card: ReturnType<typeof buildCards>[number];
  index: number;
  saved: boolean;
  onSave: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <article className={`curated-card ${open ? "open" : ""}`}>
      <div className="curated-card-main">
        <button className="curated-card-toggle" onClick={() => setOpen((value) => !value)}>
          <span className="curated-index">{String(index + 1).padStart(2, "0")}</span>
          <span className="curated-text"><b>{card.jp}</b><em>{card.kana}</em><small>{card.zh}</small></span>
          <span className="curated-plus">{open ? "−" : "+"}</span>
        </button>
        <button className={`curated-heart ${saved ? "saved" : ""}`} onClick={onSave}>{saved ? "♥" : "♡"}</button>
      </div>
      {open && (
        <div className="curated-detail">
          <div className="context-line"><span>场景</span><b>{card.micro}</b></div>
          <div className="context-line"><span>说话者</span><b>{card.speaker}</b></div>
          <div className="detail-pair">
            <div><span>功能</span><b>{card.fn}</b></div>
            <div><span>语法</span><b>{card.grammar}</b></div>
          </div>
          <p>{card.setting}</p>
          <div className="curated-note"><b>为什么这样说</b><span>{card.note}</span></div>
          <button className="curated-listen" onClick={() => speakJapanese(card.jp, .98)}>♪ 听这句</button>
        </div>
      )}
    </article>
  );
}

function CuratedSummary() {
  return (
    <div className="curated-summary">
      <section>
        <span className="summary-title">VOCABULARY</span><h2>今天的词汇</h2>
        <div className="summary-vocab">
          {CURATED_DAY_ONE.words.map((word) => (
            <div key={word.jp}><b>{word.jp}</b><span>{word.kana}</span><small>{word.zh}</small><p>{word.note}</p></div>
          ))}
        </div>
      </section>
      <section>
        <span className="summary-title">GRAMMAR</span><h2>语法不是定义，是选择</h2>
        <div className="summary-grammar">
          {CURATED_DAY_ONE.grammar.map((item) => (
            <details key={item.title}>
              <summary><b>{item.title}</b><small>{item.explain}</small></summary>
              <div><p>{item.example}</p><span>{item.kana}</span></div>
            </details>
          ))}
        </div>
      </section>
      <section>
        <span className="summary-title">TRANSFER</span><h2>把今天迁移出去</h2>
        <div className="summary-transfer">
          {CURATED_DAY_ONE.transfers.map((item, index) => <div key={item}><span>{index + 1}</span><p>{item}</p></div>)}
        </div>
      </section>
    </div>
  );
}

function Favorites({
  cards,
  onRemove,
  onBrowse,
}: {
  cards: FavoriteCard[];
  onRemove: (card: FavoriteCard) => void;
  onBrowse: () => void;
}) {
  return (
    <div className="curated-favorites">
      <div className="favorites-title"><span>MY WORDS</span><h2>想再遇见的话</h2></div>
      {cards.length === 0 ? (
        <div className="curated-empty"><span>♡</span><p>点句子右侧的小爱心，把还不熟的表达留在这里。</p><button onClick={onBrowse}>去浏览今天的句子</button></div>
      ) : cards.map((card) => (
        <article className="favorite-card" key={card.id}>
          <div><span>{card.micro}</span><button onClick={() => onRemove(card)}>♥</button></div>
          <h3>{card.jp}</h3><p>{card.kana}</p><small>{card.zh}</small>
          <div className="favorite-note">{card.note}</div>
          <button className="curated-listen" onClick={() => speakJapanese(card.jp, .98)}>♪ 听这句</button>
        </article>
      ))}
    </div>
  );
}
