-- Fix search_path for family invite RPCs to include extensions schema
-- pgcrypto (gen_random_bytes, digest) is installed in extensions schema (Supabase default)
-- but both functions use `set search_path = public` which cannot find them.

ALTER FUNCTION public.create_family_invite(uuid, text) SET search_path = public, extensions;
ALTER FUNCTION public.accept_family_invite(text) SET search_path = public, extensions;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
