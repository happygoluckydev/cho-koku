# cho-koku

彫刻（頭の中にある考えを彫り出す）× 超克（自分の考えを超える）— Claudeと対話しながらアイデアを記録・ブラッシュアップする個人用ツール。

要件定義は [`docs/requirements.md`](docs/requirements.md)、Claude Code向けの開発ルールとディレクトリ構成の詳細は [`CLAUDE.md`](CLAUDE.md) を参照。

## 構成

```
cho-koku/
├── src/app/                  # Next.js App Router（チャットUI 1画面 + /api/chat）
├── src/lib/                  # Supabase / Anthropic クライアント、アイデアの読み書き
├── supabase/migrations/      # DBスキーマ
├── docs/                     # 要件定義書、レビュー記録
└── .claude/                  # Claude Code設定・スキル
```

## セットアップ

1. `.env.example` を `.env.local` にコピーし、値を埋める
2. `pnpm install`
3. `pnpm dev`

## デプロイ

Cloudflare Workers（`@opennextjs/cloudflare`）+ Cloudflare Access を想定。導入は未着手。詳細は `CLAUDE.md` の「コマンド」「決定済み・未実装の設計変更」節を参照。

## ライセンス

MIT
