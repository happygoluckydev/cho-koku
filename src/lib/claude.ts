// Anthropic APIのラッパー。src/app/api/chat/route.ts からのみ呼び出す。
// アイデアのブラッシュアップ対話と、過去アイデア参照用のtool use定義をここに置く。

import Anthropic from "@anthropic-ai/sdk";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { searchIdeas } from "./ideas";

export const MODEL = "claude-opus-5";

// 安全上の理由で応答が拒否された場合に、サーバー側で別モデルへ自動フォールバックする
const FALLBACK_BETA = "server-side-fallback-2026-07-01";

let client: Anthropic | null = null;

function getAnthropic(): Anthropic {
  if (client) return client;
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY を設定してください");
  }
  client = new Anthropic();
  return client;
}

export const SYSTEM_PROMPT = `あなたは「cho-koku」という個人用ツールの対話相手です。利用者は自分のアイデアを言葉にしながら、彫刻のように形を彫り出し、さらに自分の考えを超えていこうとしています。

役割:
- 利用者が頭の中にある考えをはっきり言語化できるよう、具体的な問いを返す。断定的な結論を急がない
- 前提の矛盾や抜け、別の切り口、他分野からの転用など、利用者が自力では気づきにくい視点を示す
- 利用者が「まとめて」と言ったときは、対話で出た要点を簡潔に整理する

過去のアイデア:
- 今の話題が過去に記録したアイデアと関係しそうなときは search_ideas ツールで検索し、見つかれば「以前『〜』という記録があります」と要約や日付を添えて示す
- 検索して見つからなければ、その旨を一言添えるだけでよい

文体:
- 日本語。冗長にせず、1回の応答は読み切れる長さにする
- 見出しや箇条書きは必要なときだけ使う`;

/** 過去アイデア検索ツール。Claude が対話中に必要と判断したときに呼ぶ。 */
export const searchIdeasTool = betaZodTool({
  name: "search_ideas",
  description:
    "過去に記録したアイデア（Claudeとの対話ログ）を日本語の部分一致で検索する。要約と発言本文の両方が対象。見つかったアイデアの要約・記録日・一致箇所の抜粋を返す。",
  inputSchema: z.object({
    query: z.string().min(1).describe("検索語。短い名詞や語句にする（例: 『読書記録』『家計簿』）"),
    limit: z.number().int().min(1).max(10).optional().describe("最大件数（既定 5）"),
  }),
  run: async ({ query, limit }) => {
    const hits = await searchIdeas(query, limit ?? 5);
    if (hits.length === 0) return `「${query}」に一致する過去のアイデアはありませんでした。`;
    return hits
      .map((hit, i) => {
        const date = hit.createdAt.slice(0, 10);
        const lines = [`${i + 1}. [${date}] ${hit.summary ?? "(要約なし)"}`];
        if (hit.snippet) lines.push(`   抜粋: ${hit.snippet}`);
        return lines.join("\n");
      })
      .join("\n");
  },
});

export type ChatEvent =
  | { type: "text"; text: string }
  | { type: "tool"; name: string };

/**
 * 対話履歴を渡して Claude の応答をストリーミングする。
 * テキストは onEvent で逐次通知し、戻り値として全文を返す（DB への追記用）。
 * tool use の中間ブロックは保存しないため、返すのはテキストのみ。
 */
export async function streamReply(
  messages: Anthropic.Beta.BetaMessageParam[],
  onEvent: (event: ChatEvent) => void,
): Promise<string> {
  const runner = getAnthropic().beta.messages.toolRunner({
    model: MODEL,
    max_tokens: 16000,
    stream: true,
    system: SYSTEM_PROMPT,
    messages,
    tools: [searchIdeasTool],
    max_iterations: 5,
    betas: [FALLBACK_BETA],
    fallbacks: "default",
  });

  let text = "";
  const emit = (chunk: string) => {
    text += chunk;
    onEvent({ type: "text", text: chunk });
  };

  for await (const stream of runner) {
    // tool use をまたぐ場合、前の反復のテキストと段落を分ける
    if (text.length > 0 && !text.endsWith("\n")) emit("\n\n");
    for await (const event of stream) {
      if (event.type === "content_block_start" && event.content_block.type === "tool_use") {
        onEvent({ type: "tool", name: event.content_block.name });
      } else if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        emit(event.delta.text);
      }
    }
    const message = await stream.finalMessage();
    if (message.stop_reason === "refusal") {
      emit("（この内容には応答できませんでした）");
    }
  }
  return text;
}

/** 最初の発言から、一覧表示・検索用の短い要約を1回だけ生成する。 */
export async function generateSummary(firstMessage: string): Promise<string> {
  const fallback = firstMessage.replace(/\s+/g, " ").trim().slice(0, 40);
  try {
    const response = await getAnthropic().beta.messages.create({
      model: MODEL,
      max_tokens: 2000,
      output_config: { effort: "low" },
      betas: [FALLBACK_BETA],
      fallbacks: "default",
      system:
        "利用者がこれから深めようとしているアイデアの最初の発言を渡します。何についてのアイデアかが一目でわかる日本語の要約を、30文字以内で1行だけ返してください。前置きや記号は付けないでください。",
      messages: [{ role: "user", content: firstMessage }],
    });
    const block = response.content.find((b) => b.type === "text");
    const summary = block?.text.trim().split("\n")[0] ?? "";
    return summary.length > 0 ? summary.slice(0, 80) : fallback;
  } catch (error) {
    console.error("summary generation failed", error);
    return fallback;
  }
}
