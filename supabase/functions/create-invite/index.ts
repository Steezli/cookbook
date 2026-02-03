import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

type Body = {
  family_id: string;
  email: string;
  invite_base_url?: string;
};

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabaseAnonKey) {
    return new Response(JSON.stringify({ error: "missing env" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } }
  });

  const body = (await req.json()) as Body;
  const familyId = body.family_id?.trim();
  const email = body.email?.trim();
  const inviteBaseUrl = (body.invite_base_url ?? "").trim();

  if (!familyId || !email) {
    return new Response(JSON.stringify({ error: "missing family_id or email" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  // Uses RPC to generate a single-use token; only the hash is stored in DB.
  const { data, error } = await supabase.rpc("create_family_invite", {
    p_family_id: familyId,
    p_email: email
  });

  if (error) {
    // We treat membership failures as 404-by-design (hide existence).
    const status = error.code === "P0002" ? 404 : 400;
    return new Response(JSON.stringify({ error: error.message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const row = Array.isArray(data) ? data[0] : null;
  if (!row?.token) {
    return new Response(JSON.stringify({ error: "invite not created" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const link = inviteBaseUrl
    ? `${inviteBaseUrl.replace(/\\/+$/, "")}/invite/${row.token}`
    : null;

  // Phase 1 note: sending the email is deferred until an email provider is configured.
  return new Response(
    JSON.stringify({
      invite_id: row.invite_id,
      token: row.token,
      expires_at: row.expires_at,
      invite_link: link
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});

