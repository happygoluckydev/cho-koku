// アイデア（記録）1件の型定義。supabase/migrations/0001_create_ideas.sql の ideas テーブルに対応する。
// NOTE: スキーマ分割（ideas + idea_messages）時に、transcript は SDK の Anthropic.MessageParam[] を
// 使う形に合わせて書き直す（CLAUDE.md「決定済み・未実装の設計変更」参照）。

export interface Idea {
  id: string;
  userId: string | null;
  transcript: unknown;
  summary: string | null;
  createdAt: string;
}
