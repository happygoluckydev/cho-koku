---
name: db-migration
description: "Supabaseの新しいマイグレーションファイルを作成し、スキーマ変更を適用する手順。ユーザーが「マイグレーション作って」「DBスキーマを変更したい」「テーブルを追加したい」と言ったとき、または /db-migration で使う。本番相当のSupabaseプロジェクトに影響するため、適用前に必ず内容を確認する。"
argument-hint: "<変更内容の簡単な説明>"
allowed-tools: Read, Write, Bash, Grep, Glob
---

# Supabaseマイグレーション手順

引数 `$ARGUMENTS` に変更内容の説明が渡される。

1. `supabase/migrations/` の既存ファイルを確認し、命名規則（`NNNN_<verb>_<what>.sql`、連番4桁）に合わせて新しいファイル名を決める。
2. 変更内容を反映したSQLを新しいマイグレーションファイルに書く。既存ファイルは変更しない（追記専用の運用方針を守る）。
3. `docs/requirements.md` のスキーマに影響する記述があれば、あわせて更新する（例: 新しい列の用途）。
4. ユーザーに差分を提示し、Supabaseへの適用（`supabase db push` など）を実行してよいか確認する。承認前に実行しない。
5. 適用後、`CLAUDE.md` の「構成」節にスキーマ変更が影響する記述がないか確認する。

## 失敗したとき

SQLの実行でエラーが出たら、マイグレーションファイルは残したままエラー内容を報告し、Supabase側の適用は行わない。
