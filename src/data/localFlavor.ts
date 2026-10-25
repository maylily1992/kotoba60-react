export interface LocalFlavor {
  region: string;
  phrase: string;
  kana: string;
  standard: string;
  meaning: string;
  use: string;
  caution: string;
  challenge: string;
}

export const LOCAL_FLAVORS: LocalFlavor[] = [
  {
    region: "大阪", phrase: "なんでやねん", kana: "なんでやねん",
    standard: "どうしてそうなるんですか", meaning: "怎么会这样啊／你搞错了吧",
    use: "朋友间吐槽明显不合理的事，是关西漫才式“ツッコミ”。",
    caution: "不是正式质问；对上级或不熟的人可能显得冒犯。",
    challenge: "用夸张但友好的语气说一次，再补一句「ちょっと違うやん」。",
  },
  {
    region: "大阪", phrase: "おおきに", kana: "おおきに",
    standard: "ありがとうございます", meaning: "谢谢",
    use: "关西常见感谢语，店家、邻里和熟人都会用。",
    caution: "旅行时听懂最重要；年轻人口语中也有更随意的「おおきに〜」。",
    challenge: "买完东西时听懂店员说「おおきに」，观察语调而不是抢着模仿。",
  },
  {
    region: "京都", phrase: "おいでやす", kana: "おいでやす",
    standard: "いらっしゃいませ", meaning: "欢迎光临",
    use: "京都店铺、旅馆欢迎客人时的传统说法。",
    caution: "不是所有京都年轻人日常都说；先把它当“城市声音”听懂。",
    challenge: "走进小店时听一耳朵门内招呼，再回一句「こんにちは」。",
  },
  {
    region: "北海道", phrase: "なまら", kana: "なまら",
    standard: "とても／すごく", meaning: "非常、超级",
    use: "北海道年轻人常用的程度词，例如「なまら寒い」。",
    caution: "熟人、同龄人之间自然；正式场合不要替代「とても」。",
    challenge: "把「今日は寒いです」换成北海道味「今日はなまら寒い」。",
  },
  {
    region: "北海道", phrase: "したっけ", kana: "したっけ",
    standard: "それでは／じゃあ", meaning: "那么、回头见",
    use: "聊天收尾时自然切换离开，不只是“再见”的翻译。",
    caution: "语调和场合决定含义；不要把它机械塞进所有告别。",
    challenge: "用中文想一个“好，那回头见”的场景，再听一遍它的节奏。",
  },
  {
    region: "东北", phrase: "んだ", kana: "んだ",
    standard: "そうですね", meaning: "对，是这样",
    use: "东北地区广泛听到的点头、附和声。",
    caution: "不同县、年龄的语调差异很大；先听，不要当万能“是”。",
    challenge: "听到对方解释天气时，用中文抓住关键词，不急着模仿腔调。",
  },
  {
    region: "东北", phrase: "いずい", kana: "いずい",
    standard: "違和感がある", meaning: "别扭、不顺手",
    use: "衣服不合身、身体哪里别扭、操作不顺都能用。",
    caution: "不是全国通用标准语，很多年轻人会懂但未必常说。",
    challenge: "找一件“穿起来不顺手”的物品，用日语解释哪里いずい。",
  },
  {
    region: "名古屋", phrase: "やっとかめ", kana: "やっとかめ",
    standard: "久しぶりですね", meaning: "好久不见",
    use: "名古屋一带的老派亲切问候，带地方温度。",
    caution: "年轻一代未必日常使用；把它当带时代感的彩蛋。",
    challenge: "听到这句时，先猜“多久没见”，再把标准回法说完整。",
  },
  {
    region: "名古屋", phrase: "でら", kana: "でら",
    standard: "とても", meaning: "非常",
    use: "名古屋方言的程度词，常见「でらうまい」。",
    caution: "同龄人、本地语境更自然；旅行者不必刻意学腔。",
    challenge: "把「おいしいです」改写成三档：普通、强调、地方味。",
  },
  {
    region: "福冈", phrase: "ばり", kana: "ばり",
    standard: "とても", meaning: "非常、超",
    use: "博多年轻人常说的程度词，感觉轻快直接。",
    caution: "别把它用于正式报告；先判断对方语体再跟。",
    challenge: "听到「ばりおいしい」时，说出标准日语同义表达。",
  },
  {
    region: "福冈", phrase: "なんしよっと？", kana: "なんしよっと",
    standard: "何をしているんですか", meaning: "你在做什么？",
    use: "熟人间很口语的问候，语气可亲切也可略带质问。",
    caution: "语调非常关键；陌生人场景不要直接套用。",
    challenge: "同一句话分别用“好奇”和“抱怨”的语气听一遍，辨别差异。",
  },
  {
    region: "广岛", phrase: "じゃけえ", kana: "じゃけえ",
    standard: "だから", meaning: "所以、因为这样",
    use: "广岛方言中承接理由或结论，常出现在快速解释里。",
    caution: "连接关系要看前后文，不是简单的“所以”替换词。",
    challenge: "听一段短解释，只抓“原因—结果”两端，不逐字翻译。",
  },
  {
    region: "广岛", phrase: "ぶち", kana: "ぶち",
    standard: "とても", meaning: "非常",
    use: "广岛一带的程度强调，常见「ぶちうまい」。",
    caution: "地方色彩强，适合听懂和熟人玩笑，不适合正式场合。",
    challenge: "为今天场景造一句带「ぶち」的短感叹，再用标准语重说。",
  },
  {
    region: "冲绳", phrase: "めんそーれ", kana: "めんそーれ",
    standard: "いらっしゃいませ", meaning: "欢迎光临",
    use: "冲绳迎客的标志性表达，旅行时很容易听到。",
    caution: "它是地方欢迎语，不意味着所有冲绳人日常只说方言。",
    challenge: "在机场或店里听到后，用「ありがとうございます」回应。",
  },
  {
    region: "冲绳", phrase: "ちばりよー", kana: "ちばりよー",
    standard: "頑張ってください", meaning: "加油、努力到最后",
    use: "对朋友或正在努力的人给予鼓励，声音常拉长。",
    caution: "不是命令，但也不适合非常正式的商务汇报。",
    challenge: "录一句温和版「頑張ってください」，再听地方版的节奏。",
  },
  {
    region: "富山", phrase: "きときと", kana: "きときと",
    standard: "新鮮", meaning: "新鲜、精神",
    use: "形容刚捕到的鱼或状态鲜活，地方饮食场景很有画面感。",
    caution: "它是方言，不要期待所有地区都常用。",
    challenge: "在吃饭场景里用中文描述“新鲜”，再学标准日语表达。",
  },
  {
    region: "静冈", phrase: "〜だら", kana: "〜だら",
    standard: "〜でしょ", meaning: "……吧",
    use: "静冈等地句尾的轻声确认，带地方节奏。",
    caution: "先听句尾升降，不要不分场合把だら加到所有句子里。",
    challenge: "把一句标准确认句的句尾听成“上扬还是下落”，做听觉对比。",
  },
  {
    region: "新潟", phrase: "そいが", kana: "そいが",
    standard: "そうですね", meaning: "是啊",
    use: "新潟地方话中自然的附和，短而朴素。",
    caution: "不同县域有差异；把它当听觉彩蛋，而非必须模仿的口头禅。",
    challenge: "回答三个中文问题，只练“听出同意/不同意”，不急着学腔。",
  },
  {
    region: "东京", phrase: "ちょい待ち", kana: "ちょいまち",
    standard: "少し待ってください", meaning: "稍等一下",
    use: "朋友、同事间轻快的“等一下”，比「ちょっと待って」更短。",
    caution: "熟人感较强；对客人、上级仍用礼貌请求。",
    challenge: "同一句分别对朋友、店员、上司说，选择合适语体。",
  },
  {
    region: "东京", phrase: "それな", kana: "それな",
    standard: "本当にそうですね", meaning: "就是说啊、太对了",
    use: "同龄人聊天中的强烈共鸣，带“你懂我”的节奏。",
    caution: "年轻人网络/口语感很强，正式场合不使用。",
    challenge: "听朋友抱怨后，用「共情—追问」两步回应，不要只说それな。",
  },
];
