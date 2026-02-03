import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

type Body = {
  email: string;
  redirect_to?: string;
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
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabaseServiceRoleKey || !supabaseAnonKey) {
    return new Response(JSON.stringify({ error: "missing env" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const body = (await req.json()) as Body;
  const email = body.email?.trim().toLowerCase();
  const redirectTo = (body.redirect_to ?? "").trim();

  if (!email) {
    return new Response(JSON.stringify({ error: "missing email" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  // Explicit account enumeration is allowed by Phase 1 context:
  // return "email not found" when no user exists for the email.
  const admin = createClient(supabaseUrl, supabaseServiceRoleKey);
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("user_id")
    .eq("email", email)
    .maybeSingle();

  if (profileError) {
    return new Response(JSON.stringify({ error: profileError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  if (!profile?.user_id) {
    return new Response(JSON.stringify({ error: "email not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  // Use the built-in reset email send (requires Supabase Auth SMTP configured).
  const anon = createClient(supabaseUrl, supabaseAnonKey);
  const { error: resetError } = await anon.auth.resetPasswordForEmail(email, {
    redirectTo: redirectTo || undefined
  });

  if (resetError) {
    return new Response(JSON.stringify({ error: resetError.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
});

