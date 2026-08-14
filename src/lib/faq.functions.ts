import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createServerFn } from "@tanstack/react-start";

/** Garante que o índice semântico do FAQ esteja preenchido (idempotente). */
export const ensureFaqEmbeddings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { backfillFaqEmbeddings } = await import("./embeddings.server");
    try {
      return await backfillFaqEmbeddings();
    } catch (error) {
      console.error("faq embeddings backfill failed", error);
      return { inserted: 0 };
    }
  });
