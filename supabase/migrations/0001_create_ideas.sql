-- cho-koku 初期スキーマ
-- 方針: アイデアは追記のみ（UPDATE/DELETE を行うロジックは書かない。docs/requirements.md §3.2）
--
-- ideas          … 1つの対話セッション（= アイデア1件）のヘッダ。セッション開始時に1行 INSERT する
-- idea_messages  … 対話のメッセージ1件ごとに1行 INSERT する。ideas.transcript を UPDATE で
--                  積み増す設計は追記のみの方針と矛盾するため、この2テーブル構成にした
--                  （docs/review-2026-09-03.md 指摘1）

-- 日本語の部分一致検索用。Postgres 標準の to_tsvector は日本語を分かち書きできないため、
-- pg_trgm の GIN インデックス + ILIKE で過去アイデアを検索する（tool use から利用）
create extension if not exists pg_trgm;

create table if not exists ideas (
  id uuid primary key default gen_random_uuid(),
  -- 将来の複数ユーザー対応のための予備列。v1 では固定値のみを入れ、認可ロジックは実装しない
  user_id uuid,
  -- 一覧表示・検索用の短い要約。セッション開始時（最初のターン）に Claude に生成させて
  -- ヘッダと同時に INSERT する。後から UPDATE しない
  summary text,
  created_at timestamptz not null default now()
);

create table if not exists idea_messages (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid not null references ideas (id),
  role text not null check (role in ('user', 'assistant')),
  -- 発言本文（プレーンテキスト）。tool use の中間ブロックはそのターン内で完結するため保存しない
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists ideas_created_at_idx on ideas (created_at desc);
create index if not exists idea_messages_idea_id_created_at_idx on idea_messages (idea_id, created_at);
create index if not exists ideas_summary_trgm_idx on ideas using gin (summary gin_trgm_ops);
create index if not exists idea_messages_content_trgm_idx on idea_messages using gin (content gin_trgm_ops);

-- サーバー側はサービスロールキーで接続するため RLS をバイパスする。
-- ポリシーなしで RLS を有効にしておくことで、anon キー経由の PostgREST アクセスを塞ぐ。
alter table ideas enable row level security;
alter table idea_messages enable row level security;

-- v2 で意味検索（pgvector）を導入する際に embedding 列とインデックスを追加する。
