/**
 * CORS configuration for Supabase Edge Functions.
 *
 * Allowed origins:
 *  - The Supabase project URL (always available via SUPABASE_URL env var)
 *  - An optional ALLOWED_ORIGINS env var (comma-separated) for custom domains
 *  - Requests with no Origin header (mobile native clients) are allowed through
 *
 * This replaces the previous `Access-Control-Allow-Origin: *` policy.
 */

function getAllowedOrigins(): string[] {
  const origins: string[] = [];

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (supabaseUrl) origins.push(supabaseUrl);

  const custom = Deno.env.get("ALLOWED_ORIGINS");
  if (custom) {
    for (const o of custom.split(",")) {
      const trimmed = o.trim();
      if (trimmed) origins.push(trimmed);
    }
  }

  return origins;
}

/**
 * Build CORS headers for a given request.
 * Returns the request's Origin in Access-Control-Allow-Origin when it matches
 * the allowlist; omits the header otherwise (browser will block the response).
 * Requests without an Origin header (native mobile, server-to-server) are
 * allowed by not setting the header — those callers are not subject to CORS.
 */
export function buildCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin");
  const allowed = getAllowedOrigins();

  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (origin && allowed.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Vary"] = "Origin";
  }

  return headers;
}

/**
 * Legacy static header object.
 * Kept for backward compatibility with functions that spread `corsHeaders`
 * into response headers. Prefers dynamic `buildCorsHeaders(req)` when
 * the request object is available.
 *
 * Falls back to Supabase project URL or empty string (not "*").
 */
export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": Deno.env.get("SUPABASE_URL") ?? "",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * Handle preflight OPTIONS requests.
 * Returns a 204 response with CORS headers if the request is OPTIONS, or null
 * if the request should continue to the main handler.
 */
export function handleCors(req: Request): Response | null {
  if (req.method !== "OPTIONS") return null;
  return new Response(null, {
    status: 204,
    headers: buildCorsHeaders(req),
  });
}
