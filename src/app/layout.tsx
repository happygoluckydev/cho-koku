// アプリ全体のレイアウト（HTML骨格）。

import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "cho-koku",
  description: "Claudeと対話しながらアイデアを彫り出し・ブラッシュアップする個人用ツール",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
