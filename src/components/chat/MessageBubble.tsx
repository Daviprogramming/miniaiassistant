import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

export function MessageBubble({
  role,
  content,
}: {
  role: "user" | "assistant";
  content: string;
}) {
  const isUser = role === "user";
  return (
    <div className={cn("flex bubble-in", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-3xl px-4 py-3 text-sm leading-relaxed shadow-soft",
          isUser
            ? "whitespace-pre-wrap rounded-br-md bg-brand-gradient text-primary-foreground"
            : "rounded-bl-md border border-border bg-surface/80 text-surface-foreground",
        )}
      >
        {isUser ? (
          content
        ) : (
          <div className="space-y-2 [&_a]:underline [&_li]:ml-4 [&_li]:list-disc [&_strong]:font-semibold">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}


export function TypingBubble() {
  return (
    <div className="flex justify-start bubble-in">
      <div className="flex items-center gap-1.5 rounded-3xl rounded-bl-md border border-border bg-surface/80 px-5 py-4">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="typing-dot size-2 rounded-full bg-muted-foreground"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}
