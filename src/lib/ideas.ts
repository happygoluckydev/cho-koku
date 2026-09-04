// アイデアの読み書き。Supabaseへのアクセスはこのファイル経由のみに限定する（追記のみ、更新・削除は持たせない）。

import { getSupabase } from "./supabase";
import type { Idea, IdeaMessage } from "@/types/idea";

// 将来の複数ユーザー対応のための予備列に入れる固定値（CLAUDE.md「規約」参照）
const FIXED_USER_ID = "00000000-0000-0000-0000-000000000001";

interface IdeaRow {
  id: string;
  user_id: string | null;
  summary: string | null;
  created_at: string;
}

interface IdeaMessageRow {
  id: string;
  idea_id: string;
  role: IdeaMessage["role"];
  content: string;
  created_at: string;
}

function toIdea(row: IdeaRow): Idea {
  return { id: row.id, userId: row.user_id, summary: row.summary, createdAt: row.created_at };
}

function toIdeaMessage(row: IdeaMessageRow): IdeaMessage {
  return { id: row.id, ideaId: row.idea_id, role: row.role, content: row.content, createdAt: row.created_at };
}

/** 対話セッションのヘッダを1件 INSERT し、id を返す。summary はここで一度だけ書く。 */
export async function createIdea(summary: string): Promise<string> {
  const { data, error } = await getSupabase()
    .from("ideas")
    .insert({ user_id: FIXED_USER_ID, summary })
    .select("id")
    .single<{ id: string }>();
  if (error) throw new Error(`ideas の作成に失敗: ${error.message}`);
  return data.id;
}

/** メッセージを1件追記する。 */
export async function appendMessage(
  ideaId: string,
  role: IdeaMessage["role"],
  content: string,
): Promise<void> {
  const { error } = await getSupabase()
    .from("idea_messages")
    .insert({ idea_id: ideaId, role, content });
  if (error) throw new Error(`idea_messages の追記に失敗: ${error.message}`);
}

/** セッションのメッセージを時系列で返す。 */
export async function listMessages(ideaId: string): Promise<IdeaMessage[]> {
  const { data, error } = await getSupabase()
    .from("idea_messages")
    .select("id, idea_id, role, content, created_at")
    .eq("idea_id", ideaId)
    .order("created_at", { ascending: true })
    .returns<IdeaMessageRow[]>();
  if (error) throw new Error(`idea_messages の取得に失敗: ${error.message}`);
  return data.map(toIdeaMessage);
}

export interface IdeaSearchHit {
  ideaId: string;
  summary: string | null;
  createdAt: string;
  /** 検索語に一致した発言の抜粋（summary のみ一致した場合は null） */
  snippet: string | null;
}

/** ILIKE のワイルドカードとエスケープ文字を無効化する。 */
function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/** 一致箇所の前後を切り出す。 */
function makeSnippet(content: string, query: string, radius = 60): string {
  const index = content.toLowerCase().indexOf(query.toLowerCase());
  if (index < 0) return content.slice(0, radius * 2);
  const start = Math.max(0, index - radius);
  const end = Math.min(content.length, index + query.length + radius);
  return `${start > 0 ? "…" : ""}${content.slice(start, end)}${end < content.length ? "…" : ""}`;
}

/**
 * 過去のアイデアを日本語の部分一致（ILIKE。pg_trgm の GIN インデックスが効く）で検索する。
 * summary と idea_messages.content の両方を対象にし、新しい順に最大 limit 件返す。
 */
export async function searchIdeas(query: string, limit = 5): Promise<IdeaSearchHit[]> {
  const q = query.trim();
  if (!q) return [];
  const pattern = `%${escapeLike(q)}%`;
  const supabase = getSupabase();

  const [messagesResult, ideasResult] = await Promise.all([
    supabase
      .from("idea_messages")
      .select("id, idea_id, role, content, created_at")
      .ilike("content", pattern)
      .order("created_at", { ascending: false })
      .limit(limit * 4)
      .returns<IdeaMessageRow[]>(),
    supabase
      .from("ideas")
      .select("id, user_id, summary, created_at")
      .ilike("summary", pattern)
      .order("created_at", { ascending: false })
      .limit(limit)
      .returns<IdeaRow[]>(),
  ]);
  if (messagesResult.error) throw new Error(`idea_messages の検索に失敗: ${messagesResult.error.message}`);
  if (ideasResult.error) throw new Error(`ideas の検索に失敗: ${ideasResult.error.message}`);

  // 一致した発言は idea ごとに最新の1件だけ残す
  const snippetByIdea = new Map<string, string>();
  for (const row of messagesResult.data) {
    if (!snippetByIdea.has(row.idea_id)) snippetByIdea.set(row.idea_id, makeSnippet(row.content, q));
  }

  const ideaIds = new Set<string>([...snippetByIdea.keys(), ...ideasResult.data.map((r) => r.id)]);
  if (ideaIds.size === 0) return [];

  const { data: ideaRows, error } = await supabase
    .from("ideas")
    .select("id, user_id, summary, created_at")
    .in("id", [...ideaIds])
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<IdeaRow[]>();
  if (error) throw new Error(`ideas の取得に失敗: ${error.message}`);

  return ideaRows.map(toIdea).map((idea) => ({
    ideaId: idea.id,
    summary: idea.summary,
    createdAt: idea.createdAt,
    snippet: snippetByIdea.get(idea.id) ?? null,
  }));
}
