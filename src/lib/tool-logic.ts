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

export const TIMEZONE = "America/Sao_Paulo";

/** Data local (AAAA-MM-DD) do fuso do app para um instante qualquer. */
export function localDateISO(now: Date = new Date(), timeZone = TIMEZONE): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Hora local (HH:MM) do fuso do app. */
export function localTime(now: Date = new Date(), timeZone = TIMEZONE): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);
}

const WEEKDAYS = [
  "domingo",
  "segunda-feira",
  "terca-feira",
  "quarta-feira",
  "quinta-feira",
  "sexta-feira",
  "sabado",
];

function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  const base = new Date(Date.UTC(y, m - 1, d));
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

function weekdayIndex(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/**
 * Resolve a data informada pelo modelo em relação à data real de hoje.
 * Aceita AAAA-MM-DD ou expressões relativas ("hoje", "amanhã", "sexta-feira", "semana que vem").
 */
export function resolveDateExpression(raw: string, today: string = localDateISO()): string | null {
  const value = raw.trim();
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    // Datas absurdas (epoch/placeholder) são descartadas em favor de nada.
    if (value < "2000-01-01") return null;
    return value;
  }
  const text = normalize(value);
  if (/(^|\b)(hoje|agora|hj)\b/.test(text)) return today;
  if (/depois de amanha/.test(text)) return addDaysISO(today, 2);
  if (/\bamanha\b/.test(text)) return addDaysISO(today, 1);
  if (/(semana que vem|proxima semana|semana seguinte)/.test(text)) return addDaysISO(today, 7);
  if (/(mes que vem|proximo mes)/.test(text)) return addDaysISO(today, 30);
  const emDias = /\bem (\d{1,3}) dias?\b/.exec(text);
  if (emDias) return addDaysISO(today, Number(emDias[1]));
  const target = WEEKDAYS.findIndex((day) => text.includes(day.replace("-feira", "")));
  if (target >= 0) {
    const current = weekdayIndex(today);
    let delta = (target - current + 7) % 7;
    if (delta === 0) delta = 7;
    if (/(proxim|que vem)/.test(text) && delta < 7) delta += 0;
    return addDaysISO(today, delta);
  }
  return null;
}

/** Valida e normaliza os argumentos vindos do modelo para criar uma tarefa. */
export function normalizeTaskArgs(
  args: Record<string, unknown>,
  today: string = localDateISO(),
): TaskInput | null {
  const titulo = typeof args["titulo"] === "string" ? args["titulo"].trim() : "";
  if (!titulo) return null;
  const descricao =
    typeof args["descricao"] === "string" && args["descricao"].trim()
      ? args["descricao"].trim()
      : null;
  const dataRaw = typeof args["data"] === "string" ? args["data"] : "";
  const data = dataRaw ? resolveDateExpression(dataRaw, today) : null;
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
