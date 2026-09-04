// cho-kokuの唯一のAPIエンドポイント。
// 責務: Claudeとの対話（tool useで過去アイデア参照）→ ideas.ts経由でDBに追記。
// 認証は Cloudflare Access がアプリの前段で行うため、ここでは扱わない（docs/cloudflare-setup.md）。
// 本体は未実装。ビルドを通すためのプレースホルダー。

export async function POST() {
  return Response.json({ error: "not implemented" }, { status: 501 });
}
