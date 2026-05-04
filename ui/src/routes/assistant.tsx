import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Bot, Send, Sparkles, User } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/assistant")({
  component: AssistantPage,
  head: () => ({ meta: [{ title: "AI Assistant - CropEye" }] }),
});

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "How do I identify early signs of crop disease?",
  "Recommend treatments for leaf blight",
  "Test the drone connection",
  "Start the telemetry server",
];

const API_URL = "http://localhost:8000/api/chat";

function AssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hi! I'm your CropEye AI assistant. Ask me about crop health, detections, or control your drone fleet.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: trimmed,
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      // Build history to send (exclude welcome message id, keep role/content only)
      const history = updatedMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });

      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
      }

      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: data.reply,
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: `Error: ${err.message}. Make sure the backend is running on port 8000.`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout
      title="AI Assistant"
      subtitle="Ask questions about your crops, detections and drones"
    >
      <div className="flex h-[calc(100vh-12rem)] flex-col overflow-hidden rounded-xl border border-border bg-card">
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 py-6 sm:px-8"
        >
          <div className="mx-auto flex max-w-3xl flex-col gap-6">
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} />
            ))}
            {loading && (
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="flex gap-1">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.3s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.15s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60" />
                </div>
              </div>
            )}
          </div>
        </div>

        {messages.length <= 1 && (
          <div className="border-t border-border px-4 py-3 sm:px-8">
            <div className="mx-auto flex max-w-3xl flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => sendMessage(s)}
                  className="flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                >
                  <Sparkles className="h-3 w-3 text-primary" />
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }}
          className="border-t border-border bg-background/50 px-4 py-4 sm:px-8"
        >
          <div className="mx-auto flex max-w-3xl items-center gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message the AI assistant..."
              disabled={loading}
              className="flex-1"
            />
            <Button
              type="submit"
              disabled={loading || !input.trim()}
              size="icon"
            >
              <Send className="h-4 w-4" />
              <span className="sr-only">Send</span>
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  
  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isUser
            ? "bg-secondary text-secondary-foreground"
            : "bg-primary/10 text-primary"
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div className={`max-w-[85%] ${isUser ? "flex-row-reverse" : ""}`}>
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-foreground"
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <AssistantMessageContent content={message.content} />
          )}
        </div>
      </div>
    </div>
  );
}

function AssistantMessageContent({ content }: { content: string }) {
  // Split content by lines and structure it
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Header detection (##, ###, ####)
    if (line.startsWith("####")) {
      elements.push(
        <h4 key={i} className="mt-3 mb-2 text-xs font-bold uppercase tracking-wide opacity-75">
          {line.replace(/^#+\s*/, "")}
        </h4>
      );
    } else if (line.startsWith("###")) {
      elements.push(
        <h3 key={i} className="mt-3 mb-2 text-sm font-bold">
          {line.replace(/^#+\s*/, "")}
        </h3>
      );
    } else if (line.startsWith("##")) {
      elements.push(
        <h2 key={i} className="mt-3 mb-2 text-base font-bold">
          {line.replace(/^#+\s*/, "")}
        </h2>
      );
    } else if (line.startsWith("#")) {
      elements.push(
        <h1 key={i} className="mt-2 mb-2 text-lg font-bold">
          {line.replace(/^#+\s*/, "")}
        </h1>
      );
    } else if (line.trim() === "") {
      // Skip empty lines
    } else if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
      // Bullet list
      const bulletItems: string[] = [];
      while (i < lines.length && (lines[i].trim().startsWith("- ") || lines[i].trim().startsWith("* "))) {
        bulletItems.push(lines[i].trim().substring(2));
        i++;
      }
      i--;
      elements.push(
        <ul key={i} className="my-2 ml-4 space-y-1">
          {bulletItems.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="mt-1 flex-shrink-0 text-primary">✓</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );
    } else if (/^\d+\./.test(line.trim())) {
      // Numbered list
      const numItems: string[] = [];
      while (i < lines.length && /^\d+\./.test(lines[i].trim())) {
        numItems.push(lines[i].trim().replace(/^\d+\.\s*/, ""));
        i++;
      }
      i--;
      elements.push(
        <ol key={i} className="my-2 ml-4 space-y-1 list-decimal">
          {numItems.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ol>
      );
    } else if (line.includes("**") || line.includes("✅") || line.includes("❌")) {
      // Bold text and emojis
      elements.push(
        <p key={i} className="my-1 whitespace-pre-wrap">
          {formatInlineContent(line)}
        </p>
      );
    } else if (line.trim()) {
      elements.push(
        <p key={i} className="my-1">
          {line}
        </p>
      );
    }

    i++;
  }

  return <div className="space-y-1">{elements}</div>;
}

function formatInlineContent(text: string) {
  const parts: React.ReactNode[] = [];
  let currentIndex = 0;
  const regex = /\*\*(.*?)\*\*|✅|❌/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > currentIndex) {
      parts.push(text.substring(currentIndex, match.index));
    }

    // Add the matched content
    if (match[0] === "✅") {
      parts.push(
        <span key={match.index} className="text-green-400">
          ✅
        </span>
      );
    } else if (match[0] === "❌") {
      parts.push(
        <span key={match.index} className="text-red-400">
          ❌
        </span>
      );
    } else {
      parts.push(
        <strong key={match.index} className="font-semibold text-foreground">
          {match[1]}
        </strong>
      );
    }

    currentIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (currentIndex < text.length) {
    parts.push(text.substring(currentIndex));
  }

  return parts;
}
