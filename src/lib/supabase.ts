// Supabaseクライアントの生成。サーバー側（src/lib/ideas.ts）からのみ使うこと。
// CLAUDE.md「アーキテクチャの境界」参照。

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/** サービスロールキーで接続するクライアント（RLS をバイパスする）。遅延生成して環境変数未設定時のビルド失敗を避ける。 */
export function getSupabase(): SupabaseClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を設定してください");
  }
  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
