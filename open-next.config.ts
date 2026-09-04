import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// 増分キャッシュ（ISR/SSG のキャッシュ）は使わないため R2 を設定しない。
// 画面は動的レンダリングのみで、静的アセットは wrangler.jsonc の assets で配信する。
export default defineCloudflareConfig({});
