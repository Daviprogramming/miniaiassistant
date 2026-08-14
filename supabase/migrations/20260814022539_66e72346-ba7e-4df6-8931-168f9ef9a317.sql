CREATE SCHEMA IF NOT EXISTS extensions;
GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role;
ALTER EXTENSION vector SET SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.match_faq(query_embedding extensions.vector(768), match_count int DEFAULT 3)
RETURNS TABLE (faq_id uuid, pergunta text, resposta text, similaridade float)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, extensions
AS $$
  SELECT f.id, f.pergunta, f.resposta, 1 - (e.embedding OPERATOR(extensions.<=>) query_embedding) AS similaridade
  FROM public.faq_embeddings e
  JOIN public.faq f ON f.id = e.faq_id
  ORDER BY e.embedding OPERATOR(extensions.<=>) query_embedding
  LIMIT greatest(1, least(match_count, 10));
$$;