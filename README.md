# cho-koku

彫刻（頭の中にある考えを彫り出す）× 超克（自分の考えを超える）— Claudeと対話しながらアイデアを記録・ブラッシュアップする個人用ツール。

要件定義は [`docs/requirements.md`](docs/requirements.md)、Claude Code向けの開発ルールは [`CLAUDE.md`](CLAUDE.md) を参照。

## 構成

```
cho-koku/
├── src/
│   ├── app/
│   │   ├── page.tsx          # チャットUI（記録=ブラッシュアップの唯一の画面）
│   │   └── api/chat/route.ts # Claude API呼び出し + tool use + APIキーガード
│   ├── lib/                  # Supabase / Anthropic クライアント、アイデアの読み書き
│   ├── components/
│   └── types/
├── supabase/migrations/      # DBスキーマ
├── docs/requirements.md      # 要件定義書
└── .claude/                  # Claude Code設定・スキル
```

## セットアップ

1. `.env.example` を `.env.local` にコピーし、値を埋める
2. `pnpm install`
3. `pnpm dev`

## デプロイ

Cloudflare Pages（Next.js）を想定。詳細は `CLAUDE.md` の「コマンド」節を参照。
