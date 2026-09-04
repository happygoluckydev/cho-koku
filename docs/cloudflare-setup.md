# Cloudflare セットアップ手順（Workers デプロイ + Access 認証）

コードでは完結しない、Cloudflare ダッシュボード / CLI 側の作業をまとめる。
一度だけ行う作業と、デプロイのたびに行う作業を分けて書く。

> 注意: この手順は 2026-09-04 時点の一般的な流れをもとに書いている。ダッシュボードのメニュー名は
> 変わることがあるので、迷ったら Cloudflare の公式ドキュメント（Workers / Zero Trust Access）を確認する。

## 1. Workers へのデプロイ

### 初回のみ

1. `pnpm install` 済みであることを確認する
2. Cloudflare にログインする
   ```sh
   pnpm exec wrangler login
   ```
3. シークレットを登録する（`.env.local` の値を Workers 側にも持たせる）
   ```sh
   pnpm exec wrangler secret put ANTHROPIC_API_KEY
   pnpm exec wrangler secret put SUPABASE_URL
   pnpm exec wrangler secret put SUPABASE_SERVICE_ROLE_KEY
   ```
   `wrangler.jsonc` の `vars` には書かない（リポジトリに残るため）。

### デプロイのたびに

```sh
pnpm deploy:cf
```

`opennextjs-cloudflare build`（`next build` + Workers 向けバンドル生成）と `opennextjs-cloudflare deploy` を続けて実行する。
ローカルで Workers ランタイム上の動作を確認したいときは `pnpm preview`。

### 仕組みのメモ

- `wrangler.jsonc` … Worker 名、`nodejs_compat` フラグ、静的アセット（`.open-next/assets`）の配信設定
- `open-next.config.ts` … OpenNext の設定。ISR/SSG キャッシュを使わないので R2 は設定していない
- `next.config.ts` … `initOpenNextCloudflareForDev()` で `next dev` 中も Cloudflare のバインディングを参照できる
- API ルートに `export const runtime = "edge"` は書かない（OpenNext は Node.js ランタイム前提）

## 2. Cloudflare Access で保護する

アプリ側に認証コードを持たず、Cloudflare Access（Zero Trust。50 ユーザーまで無料）で
メールアドレス認証を通過したリクエストだけをアプリに到達させる（`docs/requirements.md` §6）。

### 初回のみ

1. Cloudflare ダッシュボード → **Zero Trust** を開き、チームを作成する（初回のみ。無料プランでよい）
2. **Access → Applications → Add an application → Self-hosted** を選ぶ
3. アプリケーション名と、保護するドメインを入力する
   - カスタムドメインを使う場合: そのドメインを Cloudflare の DNS に置き、`wrangler.jsonc` の `routes` か
     ダッシュボードの **Workers → cho-koku → Settings → Domains & Routes** で Worker に割り当てる
   - `*.workers.dev` のまま使う場合: **Workers → cho-koku → Settings → Domains & Routes** の
     `workers.dev` 行から Access を有効化できる（この経路で Access アプリケーションが自動生成される）
4. ポリシーを追加する
   - Action: **Allow**
   - Include: **Emails** に自分のメールアドレスを 1 件だけ入れる
5. Login methods は **One-time PIN**（メールで PIN を受け取る）だけで十分。他の IdP は追加しない
6. 保存後、ブラウザでアプリの URL を開き、PIN 認証の画面が出ることと、認証後にアプリが表示されることを確認する

### 運用メモ

- 認証セッションの有効期間は Access アプリケーションの **Session Duration** で調整する（スマホからの利用が多いなら長め）
- Access を通っていないリクエストは Cloudflare の時点で止まるので、`/api/chat` を含むすべてのパスが保護される
- ローカル開発（`pnpm dev` / `pnpm preview`）は Access を通らない。ローカルは自分の PC からしか到達できない前提で運用する
- 将来、Worker 側でも Access の JWT（`Cf-Access-Jwt-Assertion` ヘッダ）を検証したくなったら、
  アプリケーションの **AUD tag** とチームドメインの証明書エンドポイントを使って検証する。v1 では行わない
