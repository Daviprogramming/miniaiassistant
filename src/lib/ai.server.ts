/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isKnownTool,
  matchFaqEntries,
  normalizeTaskArgs,
  pickBestSemantic,
  type FaqMatch,
} from "./tool-logic";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3.5-flash";

export type ChatMessage = { role: "system" | "user" | "assistant" | "tool"; content: string };

type GatewayMessage = {
  role: string;
  content: string | null;
  tool_calls?: { id: string; type: string; function: { name: string; arguments: string } }[];
};

const tools = [
  {
    type: "function",
    function: {
      name: "consultar_faq",
      description:
        "Consulta a base de perguntas frequentes (FAQ) da empresa: horários, endereço, contato, suporte, atendimento.",
      parameters: {
        type: "object",
        properties: {
          termo: { type: "string", description: "Assunto ou palavra-chave da dúvida do usuário" },
        },
        required: ["termo"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "criar_tarefa",
      description: "Cria uma tarefa para o usuário quando ele pedir para lembrar ou agendar algo.",
      parameters: {
        type: "object",
        properties: {
          titulo: { type: "string", description: "Título curto da tarefa" },
          descricao: { type: "string", description: "Detalhes da tarefa" },
          data: { type: "string", description: "Data no formato AAAA-MM-DD, se houver" },
        },
        required: ["titulo"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "buscar_faq_semantica",
      description:
        "Busca semântica no FAQ por similaridade de significado. Use quando consultar_faq não encontrar nada equivalente ou quando a pergunta for formulada de outro jeito.",
      parameters: {
        type: "object",
        properties: {
          pergunta: { type: "string", description: "A pergunta do usuário, como ele escreveu" },
        },
        required: ["pergunta"],
        additionalProperties: false,
      },
    },
  },
];

export const SYSTEM_PROMPT = `Você é o Mini AI Assistant, um assistente conversacional em português do Brasil.
- Use a ferramenta consultar_faq para dúvidas sobre a empresa (horário, endereço, contato, suporte, sábados).
- Se consultar_faq não trouxer nada equivalente, use buscar_faq_semantica com a pergunta original.
- Use a ferramenta criar_tarefa quando o usuário pedir para criar/lembrar/agendar uma tarefa. Depois de criar, confirme com um resumo (título, descrição e data).
- Caso contrário, responda diretamente, de forma breve e amigável.
- A data de hoje é ${new Date().toISOString().slice(0, 10)}.`;

async function logTool(
  supabase: SupabaseClient<any, any, any>,
  userId: string,
  ferramenta: string,
  sucesso: boolean,
  detalhe: string | null,
  duracaoMs: number,
) {
  console.log(`[tool] ${ferramenta} sucesso=${sucesso} ${duracaoMs}ms ${detalhe ?? ""}`);
  const { error } = await supabase.from("logs").insert({
    user_id: userId,
    ferramenta,
    sucesso,
    detalhe,
    duracao_ms: duracaoMs,
  });
  if (error) console.error("log insert failed", error.message);
}

async function executeTool(
  supabase: SupabaseClient<any, any, any>,
  userId: string,
  name: string,
  args: Record<string, unknown>,
): Promise<{ payload: unknown; sucesso: boolean; detalhe: string | null }> {
  if (name === "consultar_faq") {
    const { data, error } = await supabase.from("faq").select("pergunta, resposta");
    if (error)
      return {
        payload: { erro: "Não foi possível consultar o FAQ." },
        sucesso: false,
        detalhe: error.message,
      };
    const termo = String(args["termo"] ?? "");
    const encontrados = matchFaqEntries(data ?? [], termo);
    return {
      payload: {
        termo,
        encontrados,
        faq: data ?? [],
        dica: encontrados.length === 0 ? "Nada equivalente: use buscar_faq_semantica." : undefined,
      },
      sucesso: true,
      detalhe: `termo="${termo}" resultados=${encontrados.length}`,
    };
  }

  if (name === "buscar_faq_semantica") {
    const pergunta = String(args["pergunta"] ?? "").trim();
    if (!pergunta)
      return { payload: { erro: "Pergunta ausente." }, sucesso: false, detalhe: "pergunta vazia" };
    try {
      const { embedText } = await import("./embeddings.server");
      const embedding = await embedText(pergunta);
      const { data, error } = await supabase.rpc("match_faq", {
        query_embedding: JSON.stringify(embedding),
        match_count: 3,
      });
      if (error) throw new Error(error.message);
      const matches = ((data ?? []) as FaqMatch[]).map((m) => ({
        pergunta: m.pergunta,
        resposta: m.resposta,
        similaridade: Number(m.similaridade),
      }));
      const melhor = pickBestSemantic(matches);
      return {
        payload: melhor
          ? { melhor, candidatos: matches }
          : { melhor: null, candidatos: matches, aviso: "Nenhuma resposta suficientemente próxima." },
        sucesso: true,
        detalhe: `similaridade=${melhor ? melhor.similaridade.toFixed(3) : "abaixo do limite"}`,
      };
    } catch (error) {
      return {
        payload: { erro: "Não foi possível fazer a busca semântica." },
        sucesso: false,
        detalhe: error instanceof Error ? error.message : "erro desconhecido",
      };
    }
  }

  if (name === "criar_tarefa") {
    const parsed = normalizeTaskArgs(args);
    if (!parsed)
      return {
        payload: { erro: "Título da tarefa ausente." },
        sucesso: false,
        detalhe: "titulo vazio",
      };
    const { data, error } = await supabase
      .from("tasks")
      .insert({ user_id: userId, ...parsed })
      .select("id, titulo, descricao, data")
      .single();
    if (error)
      return {
        payload: { erro: "Não foi possível salvar a tarefa." },
        sucesso: false,
        detalhe: error.message,
      };
    return { payload: { criada: true, tarefa: data }, sucesso: true, detalhe: parsed.titulo };
  }

  return { payload: { erro: "Ferramenta desconhecida." }, sucesso: false, detalhe: name };
}

async function runTool(
  supabase: SupabaseClient<any, any, any>,
  userId: string,
  name: string,
  args: Record<string, unknown>,
): Promise<string> {
  const startedAt = Date.now();
  if (!isKnownTool(name)) {
    await logTool(supabase, userId, name, false, "ferramenta desconhecida", 0);
    return JSON.stringify({ erro: "Ferramenta desconhecida." });
  }
  const { payload, sucesso, detalhe } = await executeTool(supabase, userId, name, args);
  await logTool(supabase, userId, name, sucesso, detalhe, Date.now() - startedAt);
  return JSON.stringify(payload);
}


export async function runAssistant(
  supabase: SupabaseClient<any, any, any>,
  userId: string,
  history: ChatMessage[],
): Promise<string> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("missing_api_key");

  const messages: unknown[] = [{ role: "system", content: SYSTEM_PROMPT }, ...history];

  for (let step = 0; step < 5; step++) {
    const response = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model: MODEL, messages, tools, tool_choice: "auto" }),
    });

    if (response.status === 429) throw new Error("rate_limit");
    if (response.status === 402) throw new Error("no_credits");
    if (!response.ok) {
      console.error("AI gateway error", response.status, await response.text());
      throw new Error("ai_error");
    }

    const payload = (await response.json()) as {
      choices?: { message?: GatewayMessage }[];
    };
    const message = payload.choices?.[0]?.message;
    if (!message) throw new Error("ai_error");

    const calls = message.tool_calls ?? [];
    if (calls.length === 0) {
      return (message.content ?? "").trim() || "Não consegui gerar uma resposta agora.";
    }

    messages.push({ role: "assistant", content: message.content ?? "", tool_calls: calls });
    for (const call of calls) {
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(call.function.arguments || "{}") as Record<string, unknown>;
      } catch {
        args = {};
      }
      const result = await runTool(supabase, userId, call.function.name, args);
      messages.push({ role: "tool", tool_call_id: call.id, content: result });
    }
  }

  return "Não consegui concluir sua solicitação agora. Tente novamente.";
}
