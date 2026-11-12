// =====================================================================
// delete-employee — COMPATIBILIDAD con versiones antiguas de la app.
// Antes borraba al usuario de auth.users (y su perfil en cascada).
// Ahora hace una ELIMINACIÓN LÓGICA: conserva historial, pagos y trabajos.
// La app nueva usa admin-users { action: "delete" }.
// =====================================================================
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { fail, json, preflight } from "../_shared/http.ts";

Deno.serve(async (req: Request) => {
  const early = preflight(req);
  if (early) return early;

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: caller } = await admin.auth.getUser(jwt);
    if (!caller?.user) return fail("No autenticado", 401);

    const { data: callerProfile } = await admin
      .from("profiles")
      .select("role, account_status, is_active")
      .eq("id", caller.user.id)
      .maybeSingle();

    if (callerProfile?.role !== "admin" || callerProfile.account_status !== "activo" || !callerProfile.is_active) {
      return fail("No autorizado", 403);
    }

    const { employeeId } = await req.json().catch(() => ({}));
    if (!employeeId) return fail("employeeId requerido");
    if (employeeId === caller.user.id) return fail("No puedes eliminar tu propia cuenta de admin");

    const { data: target } = await admin
      .from("profiles")
      .select("id, role, username")
      .eq("id", employeeId)
      .maybeSingle();
    if (!target) return fail("Colaborador no encontrado", 404);
    if (target.role === "admin") return fail("No se puede eliminar un administrador", 403);

    await admin
      .from("profiles")
      .update({ is_active: false, account_status: "desactivado", deleted_at: new Date().toISOString() })
      .eq("id", employeeId);
    await admin.auth.admin.updateUserById(employeeId, { ban_duration: "876000h" });
    await admin.rpc("revoke_user_sessions", { p_user: employeeId });
    await admin.from("audit_log").insert({
      actor_id: caller.user.id,
      action: "soft_delete",
      entity: "profiles",
      entity_id: employeeId,
      details: { username: target.username, via: "delete-employee" },
    });

    return json({ success: true });
  } catch (_err) {
    return fail("Error interno", 500);
  }
});
