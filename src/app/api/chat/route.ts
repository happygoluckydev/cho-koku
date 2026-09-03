// cho-kokuの唯一のAPIエンドポイント。
// 責務: 認証済みリクエストの受付 → Claudeとの対話（tool useで過去アイデア参照）→ ideas.ts経由でDBに追記。
// 認証は Cloudflare Access に委ねる方針（docs/review-2026-09-03.md 指摘4）。
// 本体は未実装。ビルドを通すためのプレースホルダー。

export async function POST() {
  return Response.json({ error: "not implemented" }, { status: 501 });
}
