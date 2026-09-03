-- cho-koku 初期スキーマ
-- 方針: アイデアは追記のみ（UPDATE/DELETEを行うUIは作らない。docs/requirements.md §3.2）
--
-- NOTE: docs/review-2026-09-03.md 指摘1により、ideas（セッションのヘッダ）と
-- idea_messages（メッセージ単位の追記）の2テーブルに分割することが決まっている。
-- Supabase には未適用のため、分割時はこのファイル自体を書き直す。

create table if not exists ideas (
  id uuid primary key default gen_random_uuid(),
  -- 将来の複数ユーザー対応のための予備列。v1では固定値のみを入れ、認可ロジックは実装しない
  user_id uuid,
  -- Claudeとの対話ログ全体（記録=ブラッシュアップの1セッション分）
  transcript jsonb not null,
  -- 一覧表示用の短い要約。Claudeに生成させる想定
  summary text,
  created_at timestamptz not null default now()
);

create index if not exists ideas_created_at_idx on ideas (created_at desc);

-- サーバー側はサービスロールキーで接続するため RLS をバイパスする。
-- ポリシーなしで RLS を有効にしておくことで、anon キー経由の PostgREST アクセスを塞ぐ。
alter table ideas enable row level security;

-- v1のtool use（過去アイデア検索）は summary / transcript への単純な部分一致検索で十分と判断。
-- Postgres 標準の to_tsvector は日本語を分かち書きできないため、pg_trgm 拡張 + GIN インデックス + ILIKE
-- を想定する（拡張の有効化とインデックスはスキーマ分割時にまとめて追加する）。
-- v2で意味検索（pgvector）を導入する際にembedding列とインデックスを追加する。
