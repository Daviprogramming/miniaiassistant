import { cn } from "@/lib/utils";

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
          "max-w-[85%] whitespace-pre-wrap rounded-3xl px-4 py-3 text-sm leading-relaxed shadow-soft",
          isUser
            ? "rounded-br-md bg-brand-gradient text-primary-foreground"
            : "rounded-bl-md border border-border bg-surface/80 text-surface-foreground",
        )}
      >
        {content}
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
