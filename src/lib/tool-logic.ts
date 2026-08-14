/**
 * Lógica pura (sem banco e sem rede) usada pelas ferramentas do assistente.
 * Mantida separada para poder ser testada unitariamente.
 */

export type FaqEntry = { pergunta: string; resposta: string };
export type FaqMatch = { pergunta: string; resposta: string; similaridade: number };

export const TOOL_NAMES = ["consultar_faq", "criar_tarefa", "buscar_faq_semantica"] as const;
export type ToolName = (typeof TOOL_NAMES)[number];

export function isKnownTool(name: string): name is ToolName {
  return (TOOL_NAMES as readonly string[]).includes(name);
}

export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** Busca textual simples no FAQ: retorna as entradas que contêm alguma palavra do termo. */
export function matchFaqEntries(entries: FaqEntry[], termo: string): FaqEntry[] {
  const words = normalize(termo)
    .split(/\s+/)
    .filter((w) => w.length > 3);
  if (words.length === 0) return [];
  return entries.filter((entry) => {
    const haystack = normalize(`${entry.pergunta} ${entry.resposta}`);
    return words.some((word) => haystack.includes(word));
  });
}

export const SIMILARITY_THRESHOLD = 0.6;

/** Escolhe a melhor correspondência semântica acima do limite de similaridade. */
export function pickBestSemantic(
  matches: FaqMatch[],
  threshold = SIMILARITY_THRESHOLD,
): FaqMatch | null {
  const best = [...matches].sort((a, b) => b.similaridade - a.similaridade)[0];
  if (!best || best.similaridade < threshold) return null;
  return best;
}

export type TaskInput = { titulo: string; descricao: string | null; data: string | null };

/** Valida e normaliza os argumentos vindos do modelo para criar uma tarefa. */
export function normalizeTaskArgs(args: Record<string, unknown>): TaskInput | null {
  const titulo = typeof args["titulo"] === "string" ? args["titulo"].trim() : "";
  if (!titulo) return null;
  const descricao =
    typeof args["descricao"] === "string" && args["descricao"].trim()
      ? args["descricao"].trim()
      : null;
  const dataRaw = typeof args["data"] === "string" ? args["data"].trim() : "";
  const data = /^\d{4}-\d{2}-\d{2}$/.test(dataRaw) ? dataRaw : null;
  return { titulo, descricao, data };
}

/** Faz o parse seguro dos argumentos JSON emitidos pelo modelo. */
export function parseToolArguments(raw: string | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
