// cho-kokuの唯一の画面。Claudeとのチャットで記録=ブラッシュアップを行うUI。
// 画面を開くたびに新しいセッションを始める。過去のアイデアは Claude が tool use で参照する。

"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

type ServerEvent =
  | { type: "text"; text: string }
  | { type: "tool"; name: string }
  | { type: "idea"; ideaId: string }
  | { type: "done" }
  | { type: "error"; message: string };

export default function Home() {
  const [ideaId, setIdeaId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, status]);

  function appendToLastAssistant(text: string) {
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (!last || last.role !== "assistant") return [...prev, { role: "assistant", content: text }];
      return [...prev.slice(0, -1), { ...last, content: last.content + text }];
    });
  }

  function handleEvent(event: ServerEvent) {
    switch (event.type) {
      case "text":
        setStatus(null);
        appendToLastAssistant(event.text);
        break;
      case "tool":
        setStatus("過去のアイデアを検索しています…");
        break;
      case "idea":
        setIdeaId(event.ideaId);
        break;
      case "error":
        setError(event.message);
        break;
      case "done":
        break;
    }
  }

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setError(null);
    setBusy(true);
    setMessages((prev) => [...prev, { role: "user", content: text }, { role: "assistant", content: "" }]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ideaId, message: text }),
      });
      if (!response.ok || !response.body) {
        throw new Error(`サーバーエラー (HTTP ${response.status})`);
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let newline = buffer.indexOf("\n");
        while (newline >= 0) {
          const line = buffer.slice(0, newline).trim();
          buffer = buffer.slice(newline + 1);
          if (line) handleEvent(JSON.parse(line) as ServerEvent);
          newline = buffer.indexOf("\n");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "送信に失敗しました");
    } finally {
      // 応答が1文字も届かなかった場合は、空のアシスタント吹き出しを残さない
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        return last?.role === "assistant" && last.content === "" ? prev.slice(0, -1) : prev;
      });
      setBusy(false);
      setStatus(null);
      textareaRef.current?.focus();
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void send();
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Ctrl/Cmd + Enter で送信。Enter 単体は改行（スマホでの誤送信を避ける）
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      void send();
    }
  }

  function startNew() {
    if (busy) return;
    setIdeaId(null);
    setMessages([]);
    setError(null);
    setStatus(null);
    setInput("");
    textareaRef.current?.focus();
  }

  return (
    <main className="chat">
      <header className="chat-header">
        <h1>cho-koku</h1>
        <button type="button" onClick={startNew} disabled={busy || messages.length === 0}>
          新しいアイデア
        </button>
      </header>

      <section className="chat-log" aria-live="polite">
        {messages.length === 0 && (
          <p className="chat-empty">
            頭の中にあるアイデアを、そのまま書き出してください。Claude が問いを返しながら形にしていきます。
          </p>
        )}
        {messages.map((message, index) => (
          <div key={index} className={`chat-message chat-message--${message.role}`}>
            <div className="chat-bubble">
              {message.content ||
                (message.role === "assistant" && busy && index === messages.length - 1 ? (
                  <span className="chat-pending">{status ?? "考えています…"}</span>
                ) : null)}
            </div>
          </div>
        ))}
        {error && <p className="chat-error">エラー: {error}</p>}
        <div ref={bottomRef} />
      </section>

      <form className="chat-form" onSubmit={onSubmit}>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder="アイデアを書く（Ctrl+Enter / ⌘+Enter で送信）"
          rows={3}
          disabled={busy}
        />
        <button type="submit" disabled={busy || input.trim().length === 0}>
          送信
        </button>
      </form>
    </main>
  );
}
