import type { SupabaseClient } from "@supabase/supabase-js";

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
];

export const SYSTEM_PROMPT = `Você é o Mini AI Assistant, um assistente conversacional em português do Brasil.
- Use a ferramenta consultar_faq para dúvidas sobre a empresa (horário, endereço, contato, suporte, sábados).
- Use a ferramenta criar_tarefa quando o usuário pedir para criar/lembrar/agendar uma tarefa. Depois de criar, confirme com um resumo (título, descrição e data).
- Caso contrário, responda diretamente, de forma breve e amigável.
- A data de hoje é ${new Date().toISOString().slice(0, 10)}.`;

async function runTool(
  supabase: SupabaseClient,
  userId: string,
  name: string,
  args: Record<string, unknown>,
): Promise<string> {
  if (name === "consultar_faq") {
    const { data, error } = await supabase.from("faq").select("pergunta, resposta");
    if (error) return JSON.stringify({ erro: "Não foi possível consultar o FAQ." });
    return JSON.stringify({ termo: args["termo"] ?? "", faq: data ?? [] });
  }
  if (name === "criar_tarefa") {
    const titulo = String(args["titulo"] ?? "").trim();
    if (!titulo) return JSON.stringify({ erro: "Título da tarefa ausente." });
    const dataRaw = typeof args["data"] === "string" ? (args["data"] as string) : null;
    const dataValida = dataRaw && /^\d{4}-\d{2}-\d{2}$/.test(dataRaw) ? dataRaw : null;
    const { data, error } = await supabase
      .from("tasks")
      .insert({
        user_id: userId,
        titulo,
        descricao: typeof args["descricao"] === "string" ? args["descricao"] : null,
        data: dataValida,
      })
      .select("id, titulo, descricao, data")
      .single();
    if (error) return JSON.stringify({ erro: "Não foi possível salvar a tarefa." });
    return JSON.stringify({ criada: true, tarefa: data });
  }
  return JSON.stringify({ erro: "Ferramenta desconhecida." });
}

export async function runAssistant(
  supabase: SupabaseClient,
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
