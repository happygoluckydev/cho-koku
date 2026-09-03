// アイデア（記録）1件の型定義。supabase/migrations/0001_init.sql の ideas テーブルに対応する。

export interface Idea {
  id: string;
  userId: string | null;
  transcript: unknown;
  summary: string | null;
  createdAt: string;
}
