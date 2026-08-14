import { ConversationSidebar } from "@/components/chat/ConversationSidebar";
import { MessageBubble, TypingBubble } from "@/components/chat/MessageBubble";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { sendChatMessage } from "@/lib/chat.functions";
import { useServerFn } from "@tanstack/react-start";
import type { User } from "@supabase/supabase-js";
import { ArrowUp, LogOut, Menu, Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export type Conversation = { id: string; title: string; updated_at: string };
export type Message = { id: string; role: "user" | "assistant"; content: string };

export function ChatApp({ user }: { user: User }) {
  const send = useServerFn(sendChatMessage);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const bootstrapped = useRef(false);

  const loadConversations = useCallback(async () => {
    const { data, error } = await supabase
      .from("conversations")
      .select("id, title, updated_at")
      .order("updated_at", { ascending: false });
    if (error) {
      toast.error("Não foi possível carregar suas conversas.");
      return [] as Conversation[];
    }
    setConversations(data ?? []);
    return (data ?? []) as Conversation[];
  }, []);

  const createConversation = useCallback(async () => {
    const { data, error } = await supabase
      .from("conversations")
      .insert({ user_id: user.id })
      .select("id, title, updated_at")
      .single();
    if (error || !data) {
      toast.error("Não foi possível criar uma nova conversa.");
      return null;
    }
    setConversations((prev) => [data, ...prev]);
    setActiveId(data.id);
    setMessages([]);
    setMobileOpen(false);
    return data.id;
  }, [user.id]);

  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    void (async () => {
      const list = await loadConversations();
      if (list.length > 0) setActiveId(list[0]!.id);
      else await createConversation();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!activeId) return;
    void (async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("id, role, content")
        .eq("conversation_id", activeId)
        .order("created_at", { ascending: true });
      if (error) {
        toast.error("Não foi possível carregar as mensagens.");
        return;
      }
      setMessages((data ?? []) as Message[]);
    })();
  }, [activeId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  async function handleSend() {
    const content = input.trim();
    if (!content || thinking) return;
    let conversationId = activeId;
    if (!conversationId) conversationId = await createConversation();
    if (!conversationId) return;

    setInput("");
    setMessages((prev) => [...prev, { id: `local-${Date.now()}`, role: "user", content }]);
    setThinking(true);
    try {
      const result = await send({ data: { conversationId, content } });
      setMessages((prev) => [
        ...prev,
        { id: `reply-${Date.now()}`, role: "assistant", content: result.reply },
      ]);
      void loadConversations();
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: "Desculpe, não consegui processar sua solicitação agora. Tente novamente.",
        },
      ]);
    } finally {
      setThinking(false);
    }
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from("conversations").delete().eq("id", id);
    if (error) {
      toast.error("Não foi possível excluir a conversa.");
      return;
    }
    const list = await loadConversations();
    if (activeId === id) {
      if (list.length > 0) setActiveId(list[0]!.id);
      else await createConversation();
    }
  }

  const sidebar = (
    <ConversationSidebar
      conversations={conversations}
      activeId={activeId}
      onSelect={(id) => {
        setActiveId(id);
        setMobileOpen(false);
      }}
      onNew={() => void createConversation()}
      onDelete={(id) => void handleDelete(id)}
    />
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="hidden w-72 shrink-0 border-r border-sidebar-border bg-sidebar md:block">
        {sidebar}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-border bg-brand-gradient px-4 py-3">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden text-primary-foreground hover:bg-white/10"
                aria-label="Abrir conversas"
              >
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 border-sidebar-border bg-sidebar p-0">
              <SheetTitle className="sr-only">Conversas</SheetTitle>
              {sidebar}
            </SheetContent>
          </Sheet>

          <div className="flex size-9 items-center justify-center rounded-xl bg-white/15">
            <Sparkles className="size-5 text-primary-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-semibold text-primary-foreground">
              Mini AI Assistant
            </h1>
            <p className="truncate text-xs text-primary-foreground/70">{user.email}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Sair"
            onClick={() => void supabase.auth.signOut()}
            className="text-primary-foreground hover:bg-white/10"
          >
            <LogOut className="size-5" />
          </Button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
            {messages.length === 0 && !thinking && (
              <div className="mt-16 text-center">
                <h2 className="text-2xl font-semibold text-brand-gradient">Como posso ajudar?</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Pergunte sobre a empresa ou peça para criar uma tarefa.
                </p>
              </div>
            )}
            {messages.map((message) => (
              <MessageBubble key={message.id} role={message.role} content={message.content} />
            ))}
            {thinking && <TypingBubble />}
            <div ref={bottomRef} />
          </div>
        </div>

        <div className="border-t border-border bg-background/80 px-4 py-4 backdrop-blur">
          <div className="mx-auto flex w-full max-w-2xl items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
              rows={1}
              placeholder="Escreva sua mensagem..."
              aria-label="Mensagem"
              className="max-h-40 flex-1 resize-none rounded-3xl border border-border bg-surface px-5 py-3 text-sm text-foreground outline-none transition-shadow placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
            />
            <Button
              size="icon"
              aria-label="Enviar"
              disabled={thinking || input.trim().length === 0}
              onClick={() => void handleSend()}
              className="size-11 shrink-0 rounded-full bg-brand-gradient text-primary-foreground shadow-soft hover:opacity-90"
            >
              <ArrowUp className="size-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
