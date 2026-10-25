# Kotoba60

每天把一句日语种进身体里的手机端口语陪练器。

## 本地运行

```bash
npm install
npm test
npm run dev
```

生产构建：

```bash
npm run build
```

## 已实现闭环

- 晨间无字幕语流 + 一个中文理解问题。
- 主动回忆：Web Speech、录音、3 次机会、关键词提示、假名降级、失败吸收。
- 高压角色扮演：原生语速、5 秒关键词提示、连续卡壳简单模式、桥接 AI 代理。
- 精准纠错：最多 2 条，优先级语体 > 助词 > 动词 > 流畅/词汇。
- 压力重说与每日总结。
- SM-2 简化版弱点本：1 → 3 → 7 → 14 天 → 毕业；失败重置为 1 天。
- IndexedDB 保存录音 Blob；只有转写文本会发给 AI。
- React History 路由、GitHub Pages 404 回退、PWA 与离线音频缓存。

## AI 代理

`worker/src/index.ts` 是 Cloudflare Worker 入口。它：

- 从环境变量读取 `OPENAI_API_KEY`、`OPENAI_MODEL`、`ALLOWED_ORIGIN`；
- 使用 strict JSON Schema 返回 `reply_ja / fix / hint / emotion`；
- 客户端再次校验、最多保留两条 fix，并拒绝不规范结构。

部署示例：

```bash
wrangler secret put OPENAI_API_KEY
wrangler secret put OPENAI_MODEL
wrangler secret put ALLOWED_ORIGIN
wrangler deploy
```

在 `/dialogue` 页面填写 Worker URL。未配置代理时，核心闭环仍可运行，但对话为预写场景，不会伪装成实时 AI。

## 已知边界

Web Speech 只返回识别文本，不提供音素级发音数据。“发音评分”拆为文本匹配、反应时与语速/时长代理值，页面明确标注。若需要真实发音评测，需要额外的音频评测模型或服务。

设计评审、数据架构和完整开发任务见 [DESIGN_PLAN.md](./DESIGN_PLAN.md)。
