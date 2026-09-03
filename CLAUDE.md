# cho-koku

Claudeと対話しながらアイデアを彫り出し・ブラッシュアップする個人用Webアプリ。要件定義は `docs/requirements.md`。

## コマンド

- 依存インストール: `pnpm install`
- 開発サーバー: `pnpm dev`
- ビルド: `pnpm build`
- リント: `pnpm lint`
- Cloudflare Pagesへのデプロイ: `pnpm deploy` — 理由: 本番環境に影響するため実行前に確認を取る
- Supabaseマイグレーション適用: `.claude/skills/db-migration/SKILL.md` の手順に従う

## 構成

- `src/app/` — Next.js App Router。画面は `src/app/page.tsx` の1画面のみ（チャットUI）
- `src/app/api/chat/route.ts` — Claude API呼び出しの唯一の入口。APIキーガード（`APP_API_TOKEN`）とtool use（過去アイデア検索）をここで扱う
- `src/lib/` — Supabase / Anthropic クライアントのラッパーと、アイデアの読み書き（`ideas.ts`）
- `supabase/migrations/` — DBスキーマ。追記のみの方針をスキーマにも反映している（更新・削除カラムは持たせない）
- 機能が小さいうちは機能別ディレクトリに分けない。2機能目が増えて衝突するまで `src/lib/` 直下でよい — 理由: 現状1画面・1APIルートのみでYAGNI

## アーキテクチャの境界

- Supabaseへのアクセスは `src/lib/ideas.ts` 経由のみ。他のファイルから直接Supabaseクライアントを呼ばない — 理由: 「追記のみ」という制約を1箇所で守らせるため
- `src/app/api/chat/route.ts` 以外からAnthropic APIを呼ばない — 理由: APIキーをサーバー側の1箇所に閉じ込める

## 規約（リンターで検出できないもの）

- アイデアの更新・削除ロジックは書かない（`docs/requirements.md` §3.2 でスコープ外と決定済み）。修正が必要な場合はSupabaseダッシュボードから直接操作する
- `ideas` テーブルの `user_id` 列は将来の複数ユーザー対応のための予備列。現状のコードでは常に固定値を入れるだけでよく、認可ロジックは実装しない

## ドメイン用語

- **アイデア（記録）**: cho-koku内でClaudeと交わした一連の対話ログ1件（`docs/requirements.md` §11）
- **ブラッシュアップ**: 記録と同一の対話フローの中でアイデアを深める行為。別機能ではない

## Git

- コミットは任せてよい。`git push` は必ず確認を取る
- push前に確認する理由: 個人リポジトリだが、意図しない状態のコードを公開ブランチに残したくないため

## Claude への期待

- 応答は日本語。結論だけでなく、背景・理由もある程度丁寧に説明する
- 実装中に仕様が曖昧な点があれば、基本的に確認する。命名など些細な点は自分で決めてよい
- 破壊的操作（削除、force push、本番DBへの直接変更）は必ず確認する

## 参照

- 要件: `docs/requirements.md`
- 環境変数: `.env.example`
