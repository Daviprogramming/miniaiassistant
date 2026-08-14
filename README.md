# Mini AI Assistant

> Assistente conversacional com ferramentas (tool calling), desenvolvido com Lovable + Lovable Cloud.

**Link da aplicação:** https://miniaiassitant.lovable.app
**Link do repositório:** [cole aqui o link do seu repositório GitHub]

---

## Como a aplicação funciona

<!--
Descreva de forma simples o fluxo geral:
- O que o usuário vê ao abrir o app
- Como ele envia uma mensagem
- O que acontece "por trás" até a resposta aparecer
- Quais telas/funcionalidades existem (chat, login, sidebar de conversas, etc.)
-->



## Arquitetura utilizada

<!--
Descreva as camadas do projeto, por exemplo:
- Frontend: React (gerado pelo Lovable)
- Backend: Lovable Cloud (edge functions)
- Banco de dados: PostgreSQL (Supabase, via Lovable Cloud)
- Autenticação (se implementada): Supabase Auth
- Fluxo de dados: Frontend → Edge Function → LLM / Banco de dados → Resposta ao usuário

Pode incluir um diagrama simples em texto, tipo:

[Usuário] → [Frontend/Chat] → [Edge Function] → [LLM (tool calling)] → [Ferramenta: FAQ ou Tasks] → [Banco de dados]
                                                                      ↓
                                                              [Resposta final ao usuário]
-->



## Como o LLM está integrado

<!--
Explique:
- A IA nativa do Lovable Cloud é usada para as respostas (sem chave de API exposta no frontend)
- A chamada ao modelo acontece dentro de uma edge function
- Como o modelo decide qual ferramenta usar (tool calling)
-->



## Como funcionam as ferramentas

### Ferramenta 1 — Consultar FAQ
- Base de perguntas e respostas armazenada na tabela `faq` (id, pergunta, resposta), com os 5 registros abaixo:
  1. Qual o horário de funcionamento? → "Funcionamos de segunda a sexta, das 8h às 18h."
  2. Qual o endereço? → "Rua Exemplo, 123, Recife - PE."
  3. Como entrar em contato? → "Você pode nos contatar pelo e-mail contato@exemplo.com."
  4. Existe atendimento aos sábados? → "Não, atendemos apenas de segunda a sexta."
  5. Como solicitar suporte? → "Envie uma mensagem para suporte@exemplo.com com sua dúvida."
<!-- Explique aqui como o modelo identifica que deve consultar essa ferramenta e como usa a resposta -->

### Ferramenta 2 — Criar tarefa
- Tarefas armazenadas na tabela `tasks` (id, título, descrição, data opcional, criado_em, user_id).
<!-- Explique aqui como o modelo extrai título, descrição e data da mensagem do usuário, salva no banco e confirma ao usuário -->

<!-- Se implementou algum bônus (busca semântica, mais ferramentas, etc.), descreva aqui também -->

## Principais dificuldades encontradas

<!--
Exemplos de coisas que você já viu no processo (adapte com suas palavras):
- Cálculo incorreto de datas relativas (ex: "amanhã" sendo interpretado como uma data padrão/epoch em vez da data atual real)
- Ajustes de RLS (Row Level Security) no banco de dados
- Fazer o modelo decidir corretamente entre responder direto, consultar FAQ ou criar tarefa
-->



## O que eu melhoraria se tivesse mais tempo

<!--
Exemplos:
- Implementar busca semântica com embeddings para a FAQ
- Adicionar mais ferramentas (ex: clima, cálculos, agenda)
- Melhorar testes automatizados e observabilidade/logs
- Refinar o tratamento de erros com mensagens mais específicas por tipo de falha
-->

---

## Design

- Interface limpa, moderna e minimalista, estilo "chat app" (inspirado em ChatGPT/Claude).
- Dark mode como padrão: fundo escuro com tons de azul petróleo e roxo como destaque (gradiente sutil no header), texto em branco/cinza claro.
- Bolhas de mensagem diferenciadas: usuário alinhado à direita com fundo em degradê azul/roxo, assistente alinhado à esquerda com fundo cinza-escuro translúcido.
- Cantos arredondados, sombras suaves, microanimações de entrada nas mensagens (fade + slide).
- Header fixo no topo com nome do app, ícone de assistente e avatar/menu do usuário logado.
- Área de input fixa na parte inferior, campo de texto arredondado, botão de enviar circular.
- Indicador de "digitando" (3 pontinhos animados) enquanto o assistente processa.
- Layout responsivo (mobile e desktop).
- Sidebar lateral (retrátil no mobile) listando as conversas anteriores do usuário.

## Funcionalidades obrigatórias implementadas

1. **Chat**: campo de texto (com envio via Enter) + botão de enviar, histórico com scroll automático, indicador visual de carregamento.
2. **Backend com Lovable Cloud**: IA nativa integrada via edge function, sem chave de API exposta no frontend.
3. **Ferramenta 1 — Consultar FAQ**: base de 5 perguntas e respostas (tabela `faq`).
4. **Ferramenta 2 — Criar tarefa**: identifica intenção, extrai título/descrição/data e salva na tabela `tasks`.
5. **Tool calling**: o modelo decide automaticamente entre responder direto, consultar FAQ ou criar tarefa.
6. **Tratamento de erros**: mensagens amigáveis exibidas na conversa em caso de falha, sem quebrar a interface.
7. **Banco de dados**: PostgreSQL via Lovable Cloud, com policies (RLS) para `faq` e `tasks`.

---

## Sobre o projeto

Este projeto foi construído com [Lovable](https://lovable.dev/).

### Continuar o desenvolvimento

Você pode continuar editando este projeto no [Lovable](https://lovable.dev/projects/1127703f-4bbd-4ec0-9739-eb23d845528b).

- Descreva o que quer construir e o Lovable cuida do código.
- Toda alteração feita no Lovable é commitada diretamente neste repositório.
- O código é seu — pode dar push para `main` no GitHub e as mudanças sincronizam de volta com o Lovable.

### Rodando localmente

É necessário ter Node.js e npm instalados ([instalar com nvm](https://github.com/nvm-sh/nvm#installing-and-updating)).

```sh
git clone <url-deste-repositorio>
cd <nome-do-repositorio>
npm i
npm run dev
```
