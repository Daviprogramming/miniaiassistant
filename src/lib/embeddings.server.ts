const EMBEDDINGS_URL = "https://ai.gateway.lovable.dev/v1/embeddings";
export const EMBEDDING_MODEL = "google/gemini-embedding-001";
export const EMBEDDING_DIMENSIONS = 768;

/** Gera o embedding de um texto usando a IA nativa do Lovable Cloud. */
export async function embedText(text: string): Promise<number[]> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("missing_api_key");

  const response = await fetch(EMBEDDINGS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text,
      dimensions: EMBEDDING_DIMENSIONS,
    }),
  });

  if (response.status === 429) throw new Error("rate_limit");
  if (response.status === 402) throw new Error("no_credits");
  if (!response.ok) {
    console.error("embeddings error", response.status, await response.text());
    throw new Error("ai_error");
  }

  const payload = (await response.json()) as { data?: { embedding?: number[] }[] };
  const embedding = payload.data?.[0]?.embedding;
  if (!embedding || embedding.length === 0) throw new Error("ai_error");
  return embedding;
}

/** Garante que toda pergunta do FAQ tenha um embedding armazenado. */
export async function backfillFaqEmbeddings(): Promise<{ inserted: number }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: faqs, error } = await supabaseAdmin.from("faq").select("id, pergunta, resposta");
  if (error || !faqs) throw new Error("db_error");

  const { data: existing } = await supabaseAdmin.from("faq_embeddings").select("faq_id");
  const done = new Set((existing ?? []).map((row) => row.faq_id));

  let inserted = 0;
  for (const faq of faqs) {
    if (done.has(faq.id)) continue;
    const conteudo = `${faq.pergunta}\n${faq.resposta}`;
    const embedding = await embedText(conteudo);
    const { error: insertError } = await supabaseAdmin.from("faq_embeddings").insert({
      faq_id: faq.id,
      conteudo,
      embedding: JSON.stringify(embedding),
    });
    if (!insertError) inserted += 1;
  }

  return { inserted };
}
