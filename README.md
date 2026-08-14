# Mini AI Assistant

> Assistente conversacional com ferramentas (tool calling), desenvolvido com Lovable + Lovable Cloud.

**Link da aplicação:** https://miniaiassitant.lovable.app
**Link do repositório:** https://github.com/Daviprogramming/miniaiassitant

---

## Como a aplicação funciona

Ao abrir o app, o usuário se depara com uma interface de chat estilo ChatGPT/Claude, em dark mode, com um campo de texto na parte inferior para escrever mensagens e um botão de enviar.

O fluxo de uso é o seguinte:

1. O usuário digita uma mensagem (pergunta, pedido de tarefa ou conversa livre) e envia clicando no botão ou pressionando Enter.
2. A mensagem aparece imediatamente na área de conversa, alinhada à direita.
3. Enquanto a resposta é processada, um indicador visual de "digitando" (três pontinhos animados) aparece na bolha do assistente.
4. A mensagem do usuário é enviada para o backend (edge function do Lovable Cloud), que decide se deve responder diretamente, consultar a base de FAQ ou registrar uma nova tarefa.
5. A resposta final retorna e é exibida na tela, alinhada à esquerda, e a conversa continua mantendo todo o histórico da sessão, com scroll automático para a mensagem mais recente.
6. Caso ocorra algum erro (falha na IA, no banco ou em alguma ferramenta), o usuário recebe uma mensagem amigável em vez de a aplicação travar.

## Arquitetura utilizada

- Frontend: React (gerado pelo Lovable)
- Backend: Lovable Cloud (edge functions)
- Banco de dados: PostgreSQL (Supabase, via Lovable Cloud)
- Autenticação: Supabase Auth
- Fluxo de dados: Frontend → Edge Function → LLM / Banco de dados → Resposta ao usuário

## Como o LLM está integrado

O modelo de linguagem é acessado por meio da IA nativa disponibilizada pelo Lovable Cloud, o que elimina a necessidade de gerenciar uma chave de API própria de terceiros.

A chamada ao modelo acontece inteiramente no backend, dentro de uma edge function — o frontend nunca se comunica diretamente com o LLM nem tem acesso a qualquer credencial. O fluxo é: o frontend envia a mensagem do usuário para a edge function, que monta o contexto da conversa e repassa ao modelo junto com as ferramentas disponíveis (tool calling).

O próprio modelo decide, com base na intenção identificada na mensagem, se deve:

- Responder diretamente, sem usar nenhuma ferramenta;
- Acionar a ferramenta de consulta à FAQ; ou
- Acionar a ferramenta de criação de tarefa.

Depois de executar a ferramenta (quando necessário), o modelo utiliza o resultado retornado para formular a resposta final, que é enviada de volta ao frontend e exibida na conversa.

## Como funcionam as ferramentas

### Ferramenta 1 — Consultar FAQ

Base de perguntas e respostas armazenada na tabela `faq` (id, pergunta, resposta), com os 5 registros abaixo:

1. Qual o horário de funcionamento? → "Funcionamos de segunda a sexta, das 8h às 18h."
2. Qual o endereço? → "Rua Exemplo, 123, Recife - PE."
3. Como entrar em contato? → "Você pode nos contatar pelo e-mail contato@exemplo.com."
4. Existe atendimento aos sábados? → "Não, atendemos apenas de segunda a sexta."
5. Como solicitar suporte? → "Envie uma mensagem para suporte@exemplo.com com sua dúvida."

Quando a mensagem do usuário é identificada como uma pergunta relacionada a algum desses temas, o modelo aciona essa ferramenta, que consulta a tabela `faq` no banco de dados e retorna a resposta correspondente. O modelo então usa esse resultado para formular a resposta final ao usuário, em vez de responder com base apenas no seu conhecimento geral.

### Ferramenta 2 — Criar tarefa

Tarefas armazenadas na tabela `tasks` (id, título, descrição, data opcional, criado_em, user_id).

Quando o usuário escreve algo que indica intenção de criar uma tarefa (ex: "crie uma tarefa para eu revisar o relatório amanhã"), o modelo identifica essa intenção e extrai da mensagem o título, a descrição e a data (quando informada, inclusive datas relativas como "amanhã" ou "sexta-feira"). Esses dados são então salvos na tabela `tasks`, e o modelo confirma ao usuário a criação da tarefa, exibindo um resumo com as informações registradas.

## Principais dificuldades encontradas

- Quando eu pedia para que ele criasse uma tarefa, o horário que dava era 1970, tive que resolver esse bug.
- Ajustes de RLS (Row Level Security) no banco de dados
- Fazer a aplicação com essa limitação grande de créditos.

## O que eu melhoraria se tivesse mais tempo

- Adicionar mais ferramentas (ex: cálculos, clima, agenda)
- Refinar o tratamento de erros com mensagens mais específicas por tipo de falha
- Tentaria procurar mais bugs na aplicação.

---

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

### Rodando localmente

É necessário ter Node.js e npm instalados ([instalar com nvm](https://github.com/nvm-sh/nvm#installing-and-updating)).

```sh
git clone <url-deste-repositorio>
cd <nome-do-repositorio>
npm i
npm run dev
```
