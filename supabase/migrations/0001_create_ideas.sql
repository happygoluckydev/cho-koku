-- cho-koku 初期スキーマ
-- 方針: アイデアは追記のみ（UPDATE/DELETEを行うUIは作らない。docs/requirements.md §3.2）

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

-- v1のtool use（過去アイデア検索）は summary / transcript への
-- 単純な全文検索（to_tsvector等）で十分と判断し、ここでは追加しない。
-- v2で意味検索（pgvector）を導入する際にembedding列とインデックスを追加する。
