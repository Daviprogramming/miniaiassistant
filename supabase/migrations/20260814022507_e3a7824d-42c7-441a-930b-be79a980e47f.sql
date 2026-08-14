CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;

CREATE TABLE public.faq_embeddings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  faq_id uuid NOT NULL REFERENCES public.faq(id) ON DELETE CASCADE,
  conteudo text NOT NULL,
  embedding vector(768) NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (faq_id)
);

GRANT SELECT ON public.faq_embeddings TO anon, authenticated;
GRANT ALL ON public.faq_embeddings TO service_role;
ALTER TABLE public.faq_embeddings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "FAQ embeddings are public" ON public.faq_embeddings FOR SELECT TO anon, authenticated USING (true);

CREATE INDEX faq_embeddings_vector_idx ON public.faq_embeddings USING hnsw (embedding vector_cosine_ops);

CREATE OR REPLACE FUNCTION public.match_faq(query_embedding vector(768), match_count int DEFAULT 3)
RETURNS TABLE (faq_id uuid, pergunta text, resposta text, similaridade float)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT f.id, f.pergunta, f.resposta, 1 - (e.embedding <=> query_embedding) AS similaridade
  FROM public.faq_embeddings e
  JOIN public.faq f ON f.id = e.faq_id
  ORDER BY e.embedding <=> query_embedding
  LIMIT greatest(1, least(match_count, 10));
$$;

GRANT EXECUTE ON FUNCTION public.match_faq(vector, int) TO anon, authenticated, service_role;

CREATE TABLE public.logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ferramenta text NOT NULL,
  sucesso boolean NOT NULL DEFAULT true,
  detalhe text,
  duracao_ms integer,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.logs TO authenticated;
GRANT ALL ON public.logs TO service_role;
ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own logs" ON public.logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own logs" ON public.logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE INDEX logs_user_created_idx ON public.logs (user_id, created_at DESC);