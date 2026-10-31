export interface CounterRow {
  label: string;
  kana: string;
  zh: string;
  special?: boolean;
}

export interface CounterGuide {
  title: string;
  intro: string;
  activeLabel: string;
  rows: CounterRow[];
  notes: string[];
}

const DAY_ROWS: CounterRow[] = [
  { label: "1日", kana: "ついたち", zh: "每月一号", special: true },
  { label: "2日", kana: "ふつか", zh: "二号／两天", special: true },
  { label: "3日", kana: "みっか", zh: "三号／三天", special: true },
  { label: "4日", kana: "よっか", zh: "四号／四天", special: true },
  { label: "5日", kana: "いつか", zh: "五号／五天", special: true },
  { label: "6日", kana: "むいか", zh: "六号／六天", special: true },
  { label: "7日", kana: "なのか", zh: "七号／七天", special: true },
  { label: "8日", kana: "ようか", zh: "八号／八天", special: true },
  { label: "9日", kana: "ここのか", zh: "九号／九天", special: true },
  { label: "10日", kana: "とおか", zh: "十号／十天", special: true },
  { label: "100日", kana: "ひゃくにち", zh: "一百天" },
  { label: "何日", kana: "なんにち", zh: "几号／几天" },
];

const DAY_EXCLUSIONS = /今日|明日|昨日|毎日|誕生日|日曜日|一日中|二日酔い/;
const KANJI_NUMBERS: Record<string, string> = {
  一: "1", 二: "2", 三: "3", 四: "4", 五: "5",
  六: "6", 七: "7", 八: "8", 九: "9", 十: "10", 百: "100",
};

function normalizeDayLabel(label: string) {
  if (label === "何日") return label;
  const normalizedDigits = label.replace(/[０-９]/g, (digit) =>
    String("０１２３４５６７８９".indexOf(digit)),
  );
  const number = normalizedDigits.slice(0, -1);
  return `${KANJI_NUMBERS[number] ?? number}日`;
}

export function getCounterGuide(sentence: string): CounterGuide | null {
  if (DAY_EXCLUSIONS.test(sentence)) {
    // A sentence can still contain a real date expression elsewhere.
    const stripped = sentence.replace(DAY_EXCLUSIONS, "");
    if (!/[一二三四五六七八九十百0-9０-９]+日|何日/.test(stripped)) return null;
  }
  const dayMatch = sentence.match(/([一二三四五六七八九十百0-9０-９]+日|何日)/);
  if (!dayMatch) return null;
  const activeLabel = normalizeDayLabel(dayMatch[1]);
  return {
    title: "日期与“第几天”读法",
    intro: `这句里出现了「${dayMatch[1]}」。1–10 日使用特殊读法，不能机械地读成「いちにち、ににち……」；11 日以后才回到常规数字＋にち。`,
    activeLabel,
    rows: DAY_ROWS,
    notes: [
      "「1日」有两种常见意思：日期“一号”读「ついたち」，时长“一天”通常读「いちにち」。",
      "「4日」是「よっか」，「8日」是「ようか」，两个最容易在订房和预约时听错。",
      "「100日」是「ひゃくにち」；说“第100天”时，语境上常说「100日目（ひゃくにちめ）」。",
    ],
  };
}
