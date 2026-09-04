import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// Cloudflare Workers（@opennextjs/cloudflare）上で動かす。
// ビルド・デプロイは `pnpm deploy:cf`、ローカルで Workers ランタイムを確認するときは `pnpm preview`。
// API ルートに `export const runtime = "edge"` は書かない（OpenNext は Node.js ランタイム前提）。
const nextConfig: NextConfig = {};

export default nextConfig;

// `next dev` 中に Cloudflare のバインディング（getCloudflareContext）を使えるようにする
initOpenNextCloudflareForDev();
