// cho-kokuの唯一のAPIエンドポイント。
// 責務: Claudeとの対話（tool useで過去アイデア参照）→ ideas.ts経由でDBに追記。
// 認証は Cloudflare Access がアプリの前段で行うため、ここでは扱わない（docs/cloudflare-setup.md）。
//
// リクエスト: { ideaId: string | null, message: string }
//   ideaId が null なら新しいセッションを開始する（要約を生成して ideas に1行 INSERT）
// レスポンス: NDJSON のストリーム。1行1イベント
//   { type: "text", text }      Claude の応答テキスト（逐次）
//   { type: "tool", name }      tool use の開始（UI で「検索中」を出すため）
//   { type: "idea", ideaId }    このセッションの id（次のリクエストで送り返す）
//   { type: "done" } | { type: "error", message }

import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { generateSummary, streamReply } from "@/lib/claude";
import { appendMessage, createIdea, listMessages } from "@/lib/ideas";
import { toMessageParam } from "@/types/idea";

const BodySchema = z.object({
  ideaId: z.string().uuid().nullable(),
  message: z.string().trim().min(1).max(20000),
});

type StreamEvent =
  | { type: "text"; text: string }
  | { type: "tool"; name: string }
  | { type: "idea"; ideaId: string }
  | { type: "done" }
  | { type: "error"; message: string };

export async function POST(request: Request): Promise<Response> {
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "invalid request body" }, { status: 400 });
  }
  const { message } = parsed.data;
  let ideaId = parsed.data.ideaId;

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: StreamEvent) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };
      try {
        let history: Anthropic.Beta.BetaMessageParam[] = [];
        let summaryPromise: Promise<string> | null = null;

        if (ideaId) {
          // 既存セッション: 履歴を DB から復元し、今回の発言を先に追記しておく
          history = (await listMessages(ideaId)).map(toMessageParam);
          await appendMessage(ideaId, "user", message);
        } else {
          // 新規セッション: 要約生成を応答と並行して走らせ、ヘッダの INSERT は応答完了後にまとめて行う
          summaryPromise = generateSummary(message);
        }

        const reply = await streamReply([...history, { role: "user", content: message }], send);

        if (!ideaId) {
          ideaId = await createIdea(await summaryPromise!);
          await appendMessage(ideaId, "user", message);
        }
        if (reply.trim().length > 0) {
          await appendMessage(ideaId, "assistant", reply);
        }
        send({ type: "idea", ideaId });
        send({ type: "done" });
      } catch (error) {
        console.error("chat failed", error);
        send({ type: "error", message: error instanceof Error ? error.message : "unknown error" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
