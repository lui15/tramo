// =====================================================================
// login — Inicio de sesión con NOMBRE DE USUARIO + contraseña
// ---------------------------------------------------------------------
// - Busca el email interno de la cuenta a partir del usuario.
// - Bloquea temporalmente la cuenta tras varios intentos fallidos.
// - Rechaza cuentas suspendidas, desactivadas o eliminadas.
// - Devuelve la sesión de Supabase Auth (el frontend llama a setSession).
// Se despliega con verify_jwt = false (el usuario aún no tiene sesión).
// =====================================================================
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { fail, json, normalizeUsername, preflight } from "../_shared/http.ts";

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
const GENERIC_ERROR = "Usuario o contraseña incorrectos.";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

Deno.serve(async (req: Request) => {
  const early = preflight(req);
  if (early) return early;

  try {
    const body = await req.json().catch(() => ({}));
    const ident = normalizeUsername(body.username);
    const password = String(body.password ?? "");

    if (!ident || !password) {
      return fail("Introduce tu usuario y tu contraseña.", 400);
    }

    const url = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Se admite el usuario o, por compatibilidad, el email de la cuenta.
    let query = admin
      .from("profiles")
      .select(
        "id, email, role, account_status, is_active, deleted_at, locked_until, failed_login_attempts, must_change_password",
      )
      .limit(1);

    query = ident.includes("@")
      ? query.ilike("email", ident.replace(/[%_\\]/g, "\\$&"))
      : query.eq("username", ident);

    const { data: rows, error: lookupError } = await query;
    if (lookupError) throw lookupError;

    const profile = rows?.[0];

    if (!profile || !profile.email) {
      await sleep(400 + Math.random() * 300);
      return fail(GENERIC_ERROR, 401);
    }

    const now = new Date();

    if (profile.locked_until && new Date(profile.locked_until) > now) {
      const minutes = Math.ceil(
        (new Date(profile.locked_until).getTime() - now.getTime()) / 60000,
      );
      return fail(
        `Cuenta bloqueada temporalmente por intentos fallidos. Inténtalo de nuevo en ${minutes} min.`,
        423,
      );
    }

    if (profile.deleted_at || !profile.is_active || profile.account_status === "desactivado") {
      return fail("Esta cuenta está desactivada. Contacta con administración.", 403);
    }

    if (profile.account_status === "suspendido") {
      return fail("Tu cuenta está suspendida. Contacta con administración.", 403);
    }

    const anon = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: auth, error: authError } = await anon.auth.signInWithPassword({
      email: profile.email,
      password,
    });

    if (authError || !auth.session) {
      const attempts = (profile.failed_login_attempts ?? 0) + 1;
      const lock = attempts >= MAX_ATTEMPTS;

      await admin
        .from("profiles")
        .update({
          failed_login_attempts: lock ? 0 : attempts,
          locked_until: lock
            ? new Date(now.getTime() + LOCK_MINUTES * 60000).toISOString()
            : null,
        })
        .eq("id", profile.id);

      if (lock) {
        await admin.from("audit_log").insert({
          actor_id: profile.id,
          action: "login_locked",
          entity: "profiles",
          entity_id: profile.id,
          details: { minutes: LOCK_MINUTES },
        });
        return fail(
          `Demasiados intentos fallidos. La cuenta se ha bloqueado ${LOCK_MINUTES} minutos.`,
          423,
        );
      }

      return fail(GENERIC_ERROR, 401);
    }

    await admin
      .from("profiles")
      .update({
        failed_login_attempts: 0,
        locked_until: null,
        last_login_at: now.toISOString(),
      })
      .eq("id", profile.id);

    return json({
      session: {
        access_token: auth.session.access_token,
        refresh_token: auth.session.refresh_token,
      },
      role: profile.role,
      must_change_password: profile.must_change_password,
    });
  } catch (_err) {
    return fail("No se pudo iniciar sesión. Inténtalo de nuevo.", 500);
  }
});
