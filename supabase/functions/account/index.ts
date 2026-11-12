// =====================================================================
// account — Acciones del propio usuario sobre su cuenta
// ---------------------------------------------------------------------
//   change_password  Cambia la contraseña del usuario que llama y quita la
//                    marca "debe cambiar la contraseña" en el mismo paso.
// Se hace en el servidor para que el cambio y la marca vayan siempre
// juntos (antes la marca se podía quedar puesta y el trabajador volvía
// en bucle a la pantalla de "Crea tu contraseña").
// =====================================================================
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { fail, json, MIN_PASSWORD, preflight } from "../_shared/http.ts";

Deno.serve(async (req: Request) => {
  const early = preflight(req);
  if (early) return early;

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: caller, error: callerError } = await admin.auth.getUser(jwt);
    if (callerError || !caller?.user) return fail("Tu sesión ha caducado. Vuelve a entrar.", 401);

    const userId = caller.user.id;
    const { data: profile } = await admin
      .from("profiles")
      .select("id, account_status, is_active, deleted_at")
      .eq("id", userId)
      .maybeSingle();

    if (!profile || profile.deleted_at || !profile.is_active || profile.account_status !== "activo") {
      return fail("Tu cuenta no está activa. Contacta con administración.", 403);
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "");

    if (action === "change_password") {
      const password = String(body.password ?? "");
      if (password.length < MIN_PASSWORD) {
        return fail(`La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`);
      }

      const { error: pwError } = await admin.auth.admin.updateUserById(userId, { password });
      if (pwError) {
        return fail(
          /weak|pwned|leaked/i.test(pwError.message)
            ? "Esa contraseña es demasiado débil o conocida. Elige otra."
            : "No se pudo cambiar la contraseña. Inténtalo de nuevo.",
        );
      }

      const { error: flagError } = await admin
        .from("profiles")
        .update({ must_change_password: false, failed_login_attempts: 0, locked_until: null })
        .eq("id", userId);
      if (flagError) throw flagError;

      await admin.from("audit_log").insert({
        actor_id: userId,
        action: "password_changed",
        entity: "profiles",
        entity_id: userId,
        details: {},
      });

      return json({ ok: true });
    }

    return fail("Acción no válida.");
  } catch (_err) {
    return fail("No se pudo completar la operación. Inténtalo de nuevo.", 500);
  }
});
