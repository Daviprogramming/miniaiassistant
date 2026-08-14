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
    const { runAssistant, type ChatMessageAlias } = { runAssistant: null } as never;
    return { reply: "", conversationId: data.conversationId, userId, supabase } as never;
  });
