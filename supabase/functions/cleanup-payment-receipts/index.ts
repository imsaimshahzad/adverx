import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: deposits, error: queryError } = await supabase
    .from("deposits")
    .select("id, proof_url")
    .eq("status", "approved")
    .not("approved_at", "is", null)
    .lte("approved_at", cutoff)
    .not("proof_url", "is", null)
    .is("receipt_deleted_at", null);
  if (queryError) return Response.json({ error: queryError.message }, { status: 500 });
  let cleaned = 0;
  for (const deposit of deposits ?? []) {
    const path = typeof deposit.proof_url === "string" ? deposit.proof_url : "";
    if (path) await supabase.storage.from("payment-proofs").remove([path]);
    const { error } = await supabase
      .from("deposits")
      .update({ proof_url: null, receipt_deleted_at: new Date().toISOString() })
      .eq("id", deposit.id);
    if (!error) cleaned += 1;
  }
  return Response.json({ cleaned });
});
