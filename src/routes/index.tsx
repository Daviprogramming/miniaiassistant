import { AuthPanel } from "@/components/AuthPanel";
import { ChatApp } from "@/components/chat/ChatApp";
import { useAuth } from "@/hooks/useAuth";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Mini AI Assistant — chat com IA e ferramentas" },
      {
        name: "description",
        content:
          "Assistente conversacional com IA que consulta o FAQ da empresa e cria tarefas para você automaticamente.",
      },
      { property: "og:title", content: "Mini AI Assistant" },
      {
        property: "og:description",
        content: "Converse com uma IA que consulta o FAQ e cria suas tarefas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Carregando...
      </div>
    );
  }

  if (!user) return <AuthPanel />;

  return <ChatApp user={user} />;
}
