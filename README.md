# cho-koku

彫刻（頭の中にある考えを彫り出す）× 超克（自分の考えを超える）— Claudeと対話しながらアイデアを記録・ブラッシュアップする個人用ツール。

要件定義は [`docs/requirements.md`](docs/requirements.md)、Claude Code向けの開発ルールとディレクトリ構成の詳細は [`CLAUDE.md`](CLAUDE.md) を参照。

## 構成

```
cho-koku/
├── src/app/                  # Next.js App Router（チャットUI 1画面 + /api/chat）
├── src/lib/                  # Supabase / Anthropic クライアント、アイデアの読み書き
├── supabase/migrations/      # DBスキーマ（ideas + idea_messages）
├── docs/                     # 要件定義書、Cloudflare セットアップ手順、レビュー記録
├── wrangler.jsonc            # Cloudflare Workers 設定
├── open-next.config.ts       # OpenNext（Next.js → Workers）設定
└── .claude/                  # Claude Code設定・スキル
```

## セットアップ

1. `.env.example` を `.env.local` にコピーし、値を埋める
2. Supabase に `supabase/migrations/` のスキーマを適用する（`.claude/skills/db-migration/SKILL.md`）
3. `pnpm install`
4. `pnpm dev`

## 使い方

画面を開くと新しいセッションが始まる。アイデアを書いて送る（Ctrl+Enter / ⌘+Enter）と、Claude が問いを返しながら形にしていく。対話はメッセージ単位で Supabase に追記され、Claude は必要に応じて過去のアイデアを検索して参照する。「新しいアイデア」で次のセッションに移る。

## デプロイ

Cloudflare Workers（`@opennextjs/cloudflare`）にデプロイし、Cloudflare Access でメール認証をかける。
手順は [`docs/cloudflare-setup.md`](docs/cloudflare-setup.md)。

```sh
pnpm deploy:cf
```

## ライセンス

MIT
