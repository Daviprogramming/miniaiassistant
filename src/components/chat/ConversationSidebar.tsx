import type { Conversation } from "@/components/chat/ChatApp";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MessageSquare, Plus, Trash2 } from "lucide-react";

export function ConversationSidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
}: {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="flex h-full flex-col gap-3 p-3">
      <Button
        onClick={onNew}
        className="w-full justify-start gap-2 rounded-xl bg-brand-gradient text-primary-foreground hover:opacity-90"
      >
        <Plus className="size-4" />
        Nova conversa
      </Button>

      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto">
        {conversations.map((conversation) => (
          <div
            key={conversation.id}
            className={cn(
              "group flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors",
              conversation.id === activeId
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent/60",
            )}
          >
            <button
              type="button"
              onClick={() => onSelect(conversation.id)}
              className="flex min-w-0 flex-1 items-center gap-2 text-left"
            >
              <MessageSquare className="size-4 shrink-0 opacity-60" />
              <span className="truncate">{conversation.title}</span>
            </button>
            <button
              type="button"
              aria-label="Excluir conversa"
              onClick={() => onDelete(conversation.id)}
              className="opacity-0 transition-opacity group-hover:opacity-70 hover:opacity-100"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
      </nav>
    </div>
  );
}
