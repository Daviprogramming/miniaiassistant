CREATE OR REPLACE FUNCTION public.match_faq(query_embedding vector(768), match_count int DEFAULT 3)
RETURNS TABLE (faq_id uuid, pergunta text, resposta text, similaridade float)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT f.id, f.pergunta, f.resposta, 1 - (e.embedding <=> query_embedding) AS similaridade
  FROM public.faq_embeddings e
  JOIN public.faq f ON f.id = e.faq_id
  ORDER BY e.embedding <=> query_embedding
  LIMIT greatest(1, least(match_count, 10));
$$;