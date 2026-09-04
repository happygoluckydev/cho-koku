# cho-koku

Claudeと対話しながらアイデアを彫り出し・ブラッシュアップする個人用Webアプリ。要件定義は `docs/requirements.md`。

## コマンド

- 依存インストール: `pnpm install`
- 開発サーバー: `pnpm dev`
- ビルド: `pnpm build`
- リント: `pnpm lint`
- 型チェック: `pnpm typecheck`
- Workersランタイムでのローカル確認: `pnpm preview`（OpenNext でビルドして wrangler で起動）
- Cloudflare Workersへのデプロイ: `pnpm deploy:cf` — 理由: 本番環境に影響するため実行前に確認を取る。`pnpm deploy` は pnpm の組み込みコマンドと衝突するため使わない。初回のシークレット登録などは `docs/cloudflare-setup.md`
- Supabaseマイグレーション適用: `.claude/skills/db-migration/SKILL.md` の手順に従う

## 構成

- `src/app/` — Next.js App Router。画面は `src/app/page.tsx` の1画面のみ（チャットUI。クライアントコンポーネント）。開くたびに新しいセッションを始め、過去のアイデアは Claude が tool use で参照する
- `src/app/api/chat/route.ts` — Claude API呼び出しの唯一の入口。`{ ideaId, message }` を受け取り、NDJSON（1行1イベント: `text` / `tool` / `idea` / `done` / `error`）でストリーミングする。認証はアプリの前段の Cloudflare Access に委ねるため、ルート内に認証コードは書かない
- `src/lib/claude.ts` — Anthropic クライアント、システムプロンプト、`search_ideas` ツール定義、ストリーミング応答と要約生成。`route.ts` からのみ呼ぶ
- `src/lib/ideas.ts` — アイデアの読み書き（作成・追記・履歴取得・部分一致検索）。Supabase はここからのみ触る
- `src/lib/supabase.ts` — Supabase クライアントの遅延生成（サービスロールキー）
- `supabase/migrations/` — DBスキーマ。`ideas`（セッションのヘッダ）と `idea_messages`（メッセージ単位の追記）の2テーブル。追記のみの方針をスキーマにも反映している（更新・削除カラムは持たせない）
- `wrangler.jsonc` / `open-next.config.ts` — Cloudflare Workers へのデプロイ設定（`@opennextjs/cloudflare`）。ダッシュボード側の作業は `docs/cloudflare-setup.md`
- 機能が小さいうちは機能別ディレクトリに分けない。2機能目が増えて衝突するまで `src/lib/` 直下でよい — 理由: 現状1画面・1APIルートのみでYAGNI

## アーキテクチャの境界

- Supabaseへのアクセスは `src/lib/ideas.ts` 経由のみ。他のファイルから直接Supabaseクライアントを呼ばない — 理由: 「追記のみ」という制約を1箇所で守らせるため
- `src/app/api/chat/route.ts` 以外からAnthropic APIを呼ばない — 理由: APIキーをサーバー側の1箇所に閉じ込める

## 規約（リンターで検出できないもの）

- アイデアの更新・削除ロジックは書かない（`docs/requirements.md` §3.2 でスコープ外と決定済み）。修正が必要な場合はSupabaseダッシュボードから直接操作する
- `ideas` テーブルの `user_id` 列は将来の複数ユーザー対応のための予備列。現状のコードでは常に固定値を入れるだけでよく、認可ロジックは実装しない
- `ideas.summary` はセッション開始時にヘッダ行と同時に INSERT する。後から UPDATE で埋めない — 理由: 追記のみの方針を守るため
- `idea_messages.content` はプレーンテキストのみ。tool use の中間ブロック（`tool_use` / `tool_result`）は保存しない — 理由: そのターン内で完結し、`pg_trgm` で本文をそのまま検索したいため
- API ルートに `export const runtime = "edge"` を書かない — 理由: OpenNext は Node.js ランタイム前提
- DB への書き込み順: 既存セッションでは利用者の発言を応答開始前に追記し、Claude の応答は完了後に追記する。新規セッションでは要約生成と応答を並行して走らせ、応答完了後に `ideas` → 利用者の発言 → 応答の順で INSERT する — 理由: `summary` を作成時に一度だけ書く規約と、初回の待ち時間を増やさないことの両立
- Claude の呼び出しは `claude-opus-5` + サーバー側フォールバック（`fallbacks: "default"`）を付ける — 理由: 安全上の拒否で応答が空になるのを避けるため

## 設計判断の記録

`docs/review-2026-09-03.md` のレビューを受けて 2026-09-03 に決定し、実装済み:

- デプロイ先は Cloudflare Workers + `@opennextjs/cloudflare`（Pages + `@cloudflare/next-on-pages` はメンテナンスモードのため不採用）
- 認証は Cloudflare Access をアプリの前段に置く。アプリ側の共有トークン（旧 `APP_API_TOKEN`）は廃止した。ダッシュボード側の設定手順は `docs/cloudflare-setup.md`
- スキーマは `ideas` + `idea_messages` の2テーブル。`0001_create_ideas.sql` を書き直した（Supabase 未適用のため追加マイグレーションにしていない）

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
