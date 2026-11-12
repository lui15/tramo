// Utilidades HTTP compartidas por las Edge Functions de Tramo.

export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function fail(message: string, status = 400): Response {
  return json({ error: message }, status);
}

export function preflight(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return fail("Método no permitido", 405);
  }
  return null;
}

export const USERNAME_RE = /^[a-z0-9._-]{3,30}$/;
export const MIN_PASSWORD = 8;

export function normalizeUsername(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}
