import { describe, expect, it } from "vitest";
import {
  isKnownTool,
  matchFaqEntries,
  normalizeTaskArgs,
  parseToolArguments,
  pickBestSemantic,
} from "@/lib/tool-logic";

describe("decisão de ferramenta", () => {
  it("reconhece apenas as ferramentas suportadas", () => {
    expect(isKnownTool("consultar_faq")).toBe(true);
    expect(isKnownTool("criar_tarefa")).toBe(true);
    expect(isKnownTool("buscar_faq_semantica")).toBe(true);
    expect(isKnownTool("apagar_banco")).toBe(false);
  });

  it("faz parse seguro dos argumentos do modelo", () => {
    expect(parseToolArguments('{"titulo":"Comprar pão"}')).toEqual({ titulo: "Comprar pão" });
    expect(parseToolArguments("{ inválido")).toEqual({});
    expect(parseToolArguments(undefined)).toEqual({});
  });
});

describe("consulta ao FAQ", () => {
  const faq = [
    { pergunta: "Qual o horário de funcionamento?", resposta: "De segunda a sexta, 9h às 18h." },
    { pergunta: "Qual o endereço?", resposta: "Rua das Flores, 100." },
  ];

  it("encontra por palavra-chave ignorando acentos e caixa", () => {
    expect(matchFaqEntries(faq, "HORARIO")).toHaveLength(1);
    expect(matchFaqEntries(faq, "endereço da loja")[0]?.resposta).toContain("Rua das Flores");
  });

  it("não retorna nada quando o termo não bate", () => {
    expect(matchFaqEntries(faq, "política de reembolso")).toHaveLength(0);
    expect(matchFaqEntries(faq, "ok")).toHaveLength(0);
  });
});

describe("busca semântica", () => {
  const matches = [
    { pergunta: "Qual o endereço?", resposta: "Rua das Flores, 100.", similaridade: 0.42 },
    { pergunta: "Qual o horário?", resposta: "9h às 18h.", similaridade: 0.81 },
  ];

  it("escolhe a melhor correspondência acima do limite", () => {
    expect(pickBestSemantic(matches)?.resposta).toBe("9h às 18h.");
  });

  it("retorna null quando nada é próximo o suficiente", () => {
    expect(pickBestSemantic(matches, 0.9)).toBeNull();
    expect(pickBestSemantic([])).toBeNull();
  });
});

describe("criação de tarefa", () => {
  const hoje = "2026-08-13"; // quinta-feira

  it("normaliza título, descrição e data", () => {
    expect(normalizeTaskArgs({ titulo: "  Ligar ", descricao: " para o cliente ", data: "2026-08-20" })).toEqual({
      titulo: "Ligar",
      descricao: "para o cliente",
      data: "2026-08-20",
    });
  });

  it("resolve expressões relativas a partir da data real de hoje", () => {
    expect(normalizeTaskArgs({ titulo: "X", data: "amanhã" }, hoje)?.data).toBe("2026-08-14");
    expect(normalizeTaskArgs({ titulo: "X", data: "hoje" }, hoje)?.data).toBe(hoje);
    expect(normalizeTaskArgs({ titulo: "X", data: "sexta-feira" }, hoje)?.data).toBe("2026-08-14");
    expect(normalizeTaskArgs({ titulo: "X", data: "semana que vem" }, hoje)?.data).toBe("2026-08-20");
    expect(normalizeTaskArgs({ titulo: "X", data: "em 3 dias" }, hoje)?.data).toBe("2026-08-16");
  });

  it("descarta datas de epoch/placeholder", () => {
    expect(normalizeTaskArgs({ titulo: "X", data: "1970-01-01" }, hoje)?.data).toBeNull();
  });

  it("descarta datas em formato inválido", () => {
    expect(normalizeTaskArgs({ titulo: "X", data: "20/08/2026" }, hoje)?.data).toBeNull();
  });

  it("rejeita tarefa sem título", () => {
    expect(normalizeTaskArgs({ descricao: "sem titulo" })).toBeNull();
    expect(normalizeTaskArgs({ titulo: "   " })).toBeNull();
  });
});

