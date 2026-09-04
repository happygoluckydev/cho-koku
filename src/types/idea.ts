// アイデア（記録）の型定義。supabase/migrations/0001_create_ideas.sql の
// ideas / idea_messages テーブルに対応する。

import type Anthropic from "@anthropic-ai/sdk";

/** 1つの対話セッション（= アイデア1件）のヘッダ。 */
export interface Idea {
  id: string;
  userId: string | null;
  summary: string | null;
  createdAt: string;
}

/** 対話メッセージ1件。role は Anthropic SDK の MessageParam と同じ値域。 */
export interface IdeaMessage {
  id: string;
  ideaId: string;
  role: Anthropic.MessageParam["role"];
  content: string;
  createdAt: string;
}

/** DB のメッセージ列を Claude API に渡す形に変換する。 */
export function toMessageParam(message: IdeaMessage): Anthropic.MessageParam {
  return { role: message.role, content: message.content };
}
