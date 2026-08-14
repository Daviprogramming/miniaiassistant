# AI Companion Chat

Crie um aplicativo web chamado "Mini AI Assistant" — um assistente de IA conversacional com ferramentas (tool calling), usando Lovable Cloud como backend completo.

## Design
- Interface limpa, moderna e minimalista, estilo "chat app" (inspirado em ChatGPT/Claude).
- Dark mode como padrão: fundo escuro com tons de azul petróleo e roxo como destaque (gradiente sutil no header), texto em branco/cinza claro.
- Fonte moderna e legível (ex: Inter ou similar).
- Bolhas de mensagem diferenciadas: usuário alinhado à direita com fundo em degradê azul/roxo, assistente alinhado à esquerda com fundo cinza-escuro translúcido.
- Cantos arredondados, sombras suaves, microanimações de entrada nas mensagens (fade + slide).
- Header fixo no topo com nome do app, ícone de assistente (ex: ícone de robô ou faísca) e avatar/menu do usuário logado.
- Área de input fixa na parte inferior, campo de texto arredondado, botão de enviar circular com ícone de seta.
- Indicador de "digitando" (3 pontinhos animados) na bolha do assistente enquanto processa.
- Layout responsivo (mobile e desktop).
- Sidebar lateral (retrátil no mobile) listando as conversas anteriores do usuário, com opção de iniciar uma nova conversa.

## Funcionalidades obrigatórias

### 1. Chat
- Campo de texto (com envio via Enter) + botão de enviar.
- Área de histórico de conversa com scroll automático para a última mensagem.
- Indicador visual de carregamento enquanto o assistente processa.

### 2. Backend com Lovable Cloud
- Ative o Lovable Cloud neste projeto.
- Use a IA nativa do Lovable Cloud para as respostas (sem chave de API exposta no frontend).
- Crie uma edge function que recebe a mensagem, decide via tool calling qual ferramenta usar (ou nenhuma), executa e retorna a resposta final.

### 3. Ferramenta 1 — Consultar FAQ
- Tabela `faq` (id, pergunta, resposta) com pelo menos 5 registros, exemplo:
  1. Qual o horário de funcionamento? → "Funcionamos de segunda a sexta, das 8h às 18h."
  2. Qual o endereço? → "Rua Exemplo, 123, Recife - PE."
  3. Como entrar em contato? → "Você pode nos contatar pelo e-mail contato@exemplo.com."
  4. Existe atendimento aos sábados? → "Não, atendemos apenas de segunda a sexta."
  5. Como solicitar suporte? → "Envie uma mensagem para suporte@exemplo.com com sua dúvida."
- O assistente deve identificar perguntas relacionadas à FAQ e responder com base nesses dados.

### 4. Ferramenta 2 — Criar tarefa
- Tabela `tasks` (id, título, descrição, data opcional, criado_em, user_id).
- Ao identificar intenção de criar tarefa (ex: "crie uma tarefa para revisar o relatório amanhã"), extrair título, descrição e data, salvar no banco e confirmar ao usuário com um resumo.

### 5. Tool calling
- O modelo decide automaticamente entre: responder direto, consultar FAQ ou criar tarefa.

### 6. Tratamento de erros
- Se a IA, o banco ou alguma ferramenta falhar, exibir mensagem amigável na conversa (ex: "Desculpe, não consegui processar sua solicitação agora. Tente novamente."), sem quebrar a interface.

### 7. Banco de dados
- Use o Lovable Cloud (PostgreSQL) para armazenar `faq` e `tasks`, com policies (RLS) adequadas.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://miniaiassitant.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/1127703f-4bbd-4ec0-9739-eb23d845528b).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
