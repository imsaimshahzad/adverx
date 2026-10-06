-- Keep pg_net installed in the managed extensions schema.
-- Supabase keeps pg_net's HTTP helper objects available under the net schema.
drop extension if exists pg_net;
create extension pg_net with schema extensions;
