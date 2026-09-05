# 残件一覧

- 更新日: 2026-09-05
- 位置づけ: `docs/requirements.md`（何を作るか）に対する「まだ終わっていないこと」の作業リスト。
  スコープの決定そのものは要件定義書が正、この文書は進捗の管理用。

## 現状

コードは MVP の機能要件（`docs/requirements.md` §5 の Must 1〜3）を一通り実装済み。
2026-09-05 時点で `pnpm typecheck` / `pnpm lint` / `pnpm build` はいずれも成功する。

一方で**外部サービス側の作業が1つも実行されていない**ため、アプリはまだ一度も動いていない。
Supabase にスキーマが適用されておらず、`.env.local` もなく、Cloudflare へのデプロイと Access の設定も未実施。
つまり残件の中心は「コードを書くこと」ではなく「繋ぎ込みと初回の実利用」にある。

| 領域 | 状態 |
|---|---|
| チャット UI（`src/app/page.tsx`） | 実装済み |
| `/api/chat`（NDJSON ストリーミング） | 実装済み |
| Claude 呼び出し + `search_ideas` tool use | 実装済み |
| アイデアの追記・検索（`src/lib/ideas.ts`） | 実装済み |
| DB スキーマ（`supabase/migrations/0001_create_ideas.sql`） | ファイルは有り。**Supabase への適用は未実施** |
| ローカル実行（`pnpm dev`） | **未実施**（`.env.local` が無い） |
| Cloudflare Workers デプロイ | **未実施** |
| Cloudflare Access | **未実施** |
| 成功基準（1週間の実利用） | **未着手** |

## A. MVP を動かすための必須作業

上から順に依存関係がある。A-1 〜 A-3 が終われば手元で動き、A-4 〜 A-5 でスマホからも使えるようになる。

| # | 作業 | 内容 | 参照 |
|---|---|---|---|
| A-1 | Supabase プロジェクト作成 | プロジェクトを作り、URL とサービスロールキーを控える | `docs/requirements.md` §7 |
| A-2 | スキーマ適用 | `0001_create_ideas.sql` を Supabase に適用する。`pg_trgm` 拡張が有効になること、RLS が有効なことを確認 | `.claude/skills/db-migration/SKILL.md` |
| A-3 | `.env.local` 作成とローカル動作確認 | `.env.example` をコピーして 3 つの値を埋め、`pnpm dev` で「新規セッション → 追記 → 過去アイデア検索」の一巡を実際に確認する | `.env.example` |
| A-4 | Anthropic の利用上限アラート | 先に設定してから本番公開する（URL 漏洩時の課金リスク対策） | `docs/requirements.md` §8 |
| A-5 | Workers への初回デプロイ | `wrangler login` → `wrangler secret put` ×3 → `pnpm deploy:cf`。事前に `pnpm preview` で Workers ランタイム上の動作を確認する | `docs/cloudflare-setup.md` §1 |
| A-6 | Cloudflare Access の設定 | Zero Trust チーム作成 → Self-hosted アプリ登録 → Allow ポリシー（自分のメール1件）→ One-time PIN。設定後、未認証で `/api/chat` に到達できないことを実際に確認する | `docs/cloudflare-setup.md` §2 |
| A-7 | 成功基準の検証 | 1週間、他のチャット AI を使わず cho-koku だけでアイデア出しをする | `docs/requirements.md` §4 |

> A-6 の「未認証で `/api/chat` に到達できないこと」の確認は省略しない。
> アプリ側に認証コードを持たない設計なので、ここが唯一の防御線になる。

## B. 未決事項（`docs/requirements.md` §10）

いずれも「実際に使い始めてから決める」と合意済みのもの。A-7 の実利用が判断材料になる。

| 事項 | 決めるタイミング | 暫定方針 |
|---|---|---|
| 無料枠を超えた場合の運用方針 | 各サービスの利用量が閾値に近づいた時点 | 都度手動確認。自動停止は作らない |
| バックアップの取得方法・頻度 | 実データが増え始めた時点 | Supabase の自動バックアップに依存 |
| Anthropic API の費用感と上限値 | 数日使って実績が出た時点 | A-4 でアラートだけ先に設定しておく |

## C. コード側の改善候補（MVP のブロッカーではない）

| # | 項目 | 内容 |
|---|---|---|
| C-1 | `next lint` からの移行 | Next.js 16 で削除される。`npx @next/codemod@canary next-lint-to-eslint-cli .` で ESLint CLI に寄せる。Next.js を上げるときに合わせて対応するのが自然 |
| C-2 | テストの仕組み | 現状ゼロ。`docs/review-2026-09-03.md` でも「未定」のまま残っている。入れるなら `src/lib/ideas.ts` の `escapeLike` / `makeSnippet` と `searchIdeas` の結合ロジックが費用対効果が高い |
| C-3 | CI | `.github/workflows` が無い。個人利用なのでローカルで `pnpm typecheck && pnpm lint && pnpm build` を回せば足りるが、push 時に自動で回したくなったら追加する |
| C-4 | 検索語の記号の扱い | `ilike` のパターンは `escapeLike` で `\ % _` を潰しているが、実データでの動作は未検証。A-3 の動作確認のときに記号入りの検索語も試す |
| C-5 | 新規セッションの取りこぼし | 新規セッションは応答完了後にまとめて INSERT するため、初回ターンの途中でブラウザを閉じると発言ごと残らない。「初回の待ち時間を増やさない」ための意図的な割り切り（`CLAUDE.md` の規約）だが、実利用で気になるようなら再検討する |
| C-6 | リロードで対話が切れる | `ideaId` を React の state だけで持っているため、再読み込みすると続きから書けない。「開くたびに新しいセッション」という仕様どおりだが、実利用で不便なら sessionStorage への退避を検討する |

## D. v2 スコープ（`docs/requirements.md` §3.3）

MVP が1週間安定稼働してから着手する。現時点では着手しない。

- 過去アイデアの振り返り（時間を置いての再掲示）
- アイデア同士の関連付け・検索 UI（pgvector による意味検索）
- タグ付け・カテゴリ分類
- 通知・リマインド
- 編集・削除 UI
- 複数端末間の認証（Supabase Auth）

## 完了済み

`docs/review-2026-09-03.md` の指摘は全て対応済み（スキーマ2分割、`deploy:cf` への改名、Workers + OpenNext への決定、Cloudflare Access 採用、RLS 有効化、`pg_trgm` 採用、LICENSE 追加、SDK 更新、`eslint.config.mjs`・`typecheck` スクリプト・`pnpm-lock.yaml` の追加、README と CLAUDE.md の整合）。
残っているのは「テストの仕組みが未定」の1点のみで、これは C-2 に引き継いだ。
