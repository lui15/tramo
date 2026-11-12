// =====================================================================
// send-push — Envía una notificación push (FCM v1) a los dispositivos
// del destinatario. La llama la base de datos (trigger dispatch_push)
// con la cabecera x-webhook-secret = WEBHOOK_SECRET.
// Secretos: FIREBASE_SERVICE_ACCOUNT (JSON), WEBHOOK_SECRET.
// Se despliega con verify_jwt = false (la protege el secreto).
// =====================================================================
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { fail, json, preflight } from "../_shared/http.ts";

interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

let cachedToken: { value: string; exp: number } | null = null;

function b64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function getAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.exp - 60 > now) return cachedToken.value;

  const enc = (o: unknown) => b64url(new TextEncoder().encode(JSON.stringify(o)));
  const unsigned = `${enc({ alg: "RS256", typ: "JWT" })}.${enc({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  })}`;

  const pem = sa.private_key.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "pkcs8",
    der,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = new Uint8Array(
    await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned)),
  );

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${b64url(signature)}`,
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(`OAuth Google: ${data.error_description ?? data.error ?? res.status}`);
  }

  cachedToken = { value: data.access_token, exp: now + (data.expires_in ?? 3600) };
  return cachedToken.value;
}

Deno.serve(async (req: Request) => {
  const early = preflight(req);
  if (early) return early;

  const expected = Deno.env.get("WEBHOOK_SECRET") ?? "";
  const received = req.headers.get("x-webhook-secret") ?? "";
  if (!expected || !safeEqual(expected, received)) return fail("No autorizado", 401);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const { notification_id } = await req.json().catch(() => ({}));
  if (!notification_id) return fail("notification_id requerido");

  const { data: n } = await admin
    .from("notifications")
    .select("id, user_id, type, title, body, data, push_sent_at")
    .eq("id", notification_id)
    .maybeSingle();

  if (!n) return fail("Notificación no encontrada", 404);
  if (n.push_sent_at) return json({ skipped: "ya enviada" });

  const { data: tokens } = await admin
    .from("device_tokens")
    .select("id, token, plataforma")
    .eq("user_id", n.user_id);

  if (!tokens || tokens.length === 0) {
    await admin.from("notifications").update({ push_error: "sin dispositivos" }).eq("id", n.id);
    return json({ sent: 0, reason: "sin dispositivos" });
  }

  try {
    const sa = JSON.parse(Deno.env.get("FIREBASE_SERVICE_ACCOUNT") ?? "{}") as ServiceAccount;
    const accessToken = await getAccessToken(sa);

    // FCM solo admite valores de tipo string en "data"
    const data: Record<string, string> = { notification_id: n.id, type: n.type };
    for (const [k, v] of Object.entries((n.data ?? {}) as Record<string, unknown>)) {
      if (v !== null && v !== undefined) data[k] = String(v);
    }

    let sent = 0;
    const errors: string[] = [];

    for (const t of tokens) {
      const res = await fetch(
        `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            message: {
              token: t.token,
              notification: { title: n.title, body: n.body },
              data,
              android: {
                priority: "high",
                notification: { channel_id: "tramo_general", sound: "default", tag: n.id },
              },
              apns: { payload: { aps: { sound: "default" } } },
            },
          }),
        },
      );

      if (res.ok) {
        sent++;
        continue;
      }

      const err = await res.json().catch(() => ({}));
      const code: string =
        err?.error?.details?.find((d: any) => d.errorCode)?.errorCode ?? err?.error?.status ?? String(res.status);
      errors.push(code);

      // Token caducado o de otra app: se elimina para no reintentarlo
      if (["UNREGISTERED", "INVALID_ARGUMENT", "SENDER_ID_MISMATCH", "NOT_FOUND"].includes(code)) {
        await admin.from("device_tokens").delete().eq("id", t.id);
      }
    }

    await admin
      .from("notifications")
      .update({
        push_sent_at: sent > 0 ? new Date().toISOString() : null,
        push_error: errors.length ? errors.join(",").slice(0, 300) : null,
      })
      .eq("id", n.id);

    return json({ sent, errors });
  } catch (e) {
    await admin
      .from("notifications")
      .update({ push_error: String((e as Error).message ?? e).slice(0, 300) })
      .eq("id", n.id);
    return fail("Error enviando push", 500);
  }
});
