/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it } from "vitest";
import { executeTool } from "@/lib/ai.server";

/** Cliente Supabase falso, suficiente para as ferramentas testadas. */
function fakeSupabase(options: {
  faq?: { pergunta: string; resposta: string }[];
  faqError?: string;
  insertError?: string;
  inserted?: Record<string, unknown>[];
}) {
  const inserted = options.inserted ?? [];
  const client = {
    from(table: string) {
      if (table === "faq") {
        return {
          select: async () => ({
            data: options.faq ?? [],
            error: options.faqError ? { message: options.faqError } : null,
          }),
        };
      }
      if (table === "tasks") {
        return {
          insert(row: Record<string, unknown>) {
            inserted.push(row);
            return {
              select: () => ({
                single: async () => ({
                  data: options.insertError ? null : { id: "task-1", ...row },
                  error: options.insertError ? { message: options.insertError } : null,
                }),
              }),
            };
          },
        };
      }
      throw new Error(`tabela inesperada: ${table}`);
    },
  };
  return { client: client as any, inserted };
}

const FAQ = [
  { pergunta: "Qual o horário de funcionamento?", resposta: "De segunda a sexta, das 9h às 18h." },
  { pergunta: "Onde vocês ficam?", resposta: "Rua das Flores, 100." },
];

describe("ferramenta consultar_faq", () => {
  it("retorna as entradas relevantes", async () => {
    const { client } = fakeSupabase({ faq: FAQ });
    const result = await executeTool(client, "user-1", "consultar_faq", { termo: "horário" });
    expect(result.sucesso).toBe(true);
    expect((result.payload as any).encontrados).toHaveLength(1);
  });

  it("sinaliza para usar a busca semântica quando nada bate", async () => {
    const { client } = fakeSupabase({ faq: FAQ });
    const result = await executeTool(client, "user-1", "consultar_faq", { termo: "reembolso" });
    expect((result.payload as any).encontrados).toHaveLength(0);
    expect((result.payload as any).dica).toContain("buscar_faq_semantica");
  });

  it("trata falha do banco sem quebrar", async () => {
    const { client } = fakeSupabase({ faqError: "conexão perdida" });
    const result = await executeTool(client, "user-1", "consultar_faq", { termo: "horário" });
    expect(result.sucesso).toBe(false);
    expect((result.payload as any).erro).toBeTruthy();
  });
});

describe("ferramenta criar_tarefa", () => {
  it("salva a tarefa do usuário autenticado", async () => {
    const { client, inserted } = fakeSupabase({});
    const result = await executeTool(client, "user-42", "criar_tarefa", {
      titulo: "Enviar relatório",
      data: "2026-09-01",
    });
    expect(result.sucesso).toBe(true);
    expect(inserted[0]).toMatchObject({
      user_id: "user-42",
      titulo: "Enviar relatório",
      data: "2026-09-01",
      descricao: null,
    });
  });

  it("não salva sem título", async () => {
    const { client, inserted } = fakeSupabase({});
    const result = await executeTool(client, "user-42", "criar_tarefa", { descricao: "algo" });
    expect(result.sucesso).toBe(false);
    expect(inserted).toHaveLength(0);
  });

  it("retorna erro amigável quando o banco falha", async () => {
    const { client } = fakeSupabase({ insertError: "permissão negada" });
    const result = await executeTool(client, "user-42", "criar_tarefa", { titulo: "Teste" });
    expect(result.sucesso).toBe(false);
    expect((result.payload as any).erro).toContain("Não foi possível");
  });
});

describe("ferramenta desconhecida", () => {
  it("é rejeitada", async () => {
    const { client } = fakeSupabase({});
    const result = await executeTool(client, "user-1", "formatar_disco", {});
    expect(result.sucesso).toBe(false);
  });
});
