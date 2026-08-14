import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const SendInput = z.object({
  conversationId: z.string().uuid(),
  content: z.string().min(1).max(4000),
});

export const sendChatMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SendInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { runAssistant } = await import("./ai.server");

    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select("id, title")
      .eq("id", data.conversationId)
      .maybeSingle();
    if (convError || !conversation) throw new Error("conversation_not_found");

    const { error: insertError } = await supabase.from("messages").insert({
      conversation_id: data.conversationId,
      user_id: userId,
      role: "user",
      content: data.content,
    });
    if (insertError) throw new Error("db_error");

    if (conversation.title === "Nova conversa") {
      await supabase
        .from("conversations")
        .update({ title: data.content.slice(0, 40), updated_at: new Date().toISOString() })
        .eq("id", data.conversationId);
    } else {
      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", data.conversationId);
    }

    const { data: history } = await supabase
      .from("messages")
      .select("role, content")
      .eq("conversation_id", data.conversationId)
      .order("created_at", { ascending: true })
      .limit(40);

    const reply = await runAssistant(
      supabase,
      userId,
      (history ?? []).map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    );

    await supabase.from("messages").insert({
      conversation_id: data.conversationId,
      user_id: userId,
      role: "assistant",
      content: reply,
    });

    return { reply };
  });
