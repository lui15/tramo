// =====================================================================
// admin-users — Gestión de colaboradores (ADMINISTRADOR y SECRETARÍA)
// La secretaría solo puede gestionar encargados y ayudantes.
// ---------------------------------------------------------------------
// Acciones (body.action):
//   create          Crear colaborador (cuenta + perfil + salario inicial)
//   update          Editar nombre, usuario, cargo, fecha de alta, foto
//   reset_password  Restablecer contraseña (obliga a cambiarla al entrar)
//   set_status      activo | suspendido | desactivado
//   unlock          Quitar bloqueo por intentos fallidos
//   revoke_sessions Cerrar todas sus sesiones abiertas
//   delete          Eliminación LÓGICA (conserva todo su historial)
// La clave service_role solo existe aquí, nunca en el frontend.
// =====================================================================
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2";
import {
  fail,
  json,
  MIN_PASSWORD,
  normalizeUsername,
  preflight,
  USERNAME_RE,
} from "../_shared/http.ts";

const ROLES = ["secretaria", "encargado", "ayudante"];
const SECRETARY_ROLES = ["encargado", "ayudante"];
const SALARY_TYPES = ["hora", "dia", "mes"];
const STATUSES = ["activo", "suspendido", "desactivado"];
const BAN_FOREVER = "876000h";

type Admin = SupabaseClient;

const today = () => new Date().toISOString().slice(0, 10);

function isDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

async function audit(admin: Admin, actor: string, action: string, entityId: string, details: unknown) {
  await admin.from("audit_log").insert({
    actor_id: actor,
    action,
    entity: "profiles",
    entity_id: entityId,
    details: details ?? {},
  });
}

async function usernameTaken(admin: Admin, username: string, exceptId?: string) {
  let q = admin.from("profiles").select("id").eq("username", username).limit(1);
  if (exceptId) q = q.neq("id", exceptId);
  const { data } = await q;
  return (data?.length ?? 0) > 0;
}

async function getTarget(admin: Admin, id: unknown) {
  if (typeof id !== "string" || !id) return null;
  const { data } = await admin.from("profiles").select("*").eq("id", id).maybeSingle();
  return data;
}

async function revokeSessions(admin: Admin, id: string) {
  await admin.rpc("revoke_user_sessions", { p_user: id });
}

Deno.serve(async (req: Request) => {
  const early = preflight(req);
  if (early) return early;

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // ---------- Quién llama: administrador o secretaria activos ----------
    const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: caller, error: callerError } = await admin.auth.getUser(jwt);
    if (callerError || !caller?.user) return fail("No autenticado", 401);

    const { data: callerProfile } = await admin
      .from("profiles")
      .select("id, role, account_status, is_active")
      .eq("id", caller.user.id)
      .maybeSingle();

    if (
      !callerProfile ||
      !["admin", "secretaria"].includes(callerProfile.role) ||
      callerProfile.account_status !== "activo" ||
      !callerProfile.is_active
    ) {
      return fail("No autorizado", 403);
    }

    const actor = callerProfile.id as string;
    const isSecretary = callerProfile.role === "secretaria";
    const allowedRoles = isSecretary ? SECRETARY_ROLES : ROLES;
    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "");

    // =================================================================
    // CREAR
    // =================================================================
    if (action === "create") {
      const fullName = String(body.full_name ?? "").trim();
      const username = normalizeUsername(body.username);
      const password = String(body.password ?? "");
      const role = String(body.role ?? "");
      const salaryType = String(body.salary_type ?? "");
      const salaryRate = Number(body.salary_rate);
      const hireDate = isDate(body.hire_date) ? body.hire_date : today();
      const status = STATUSES.includes(body.account_status) ? body.account_status : "activo";

      if (fullName.length < 2) return fail("Introduce el nombre y apellidos.");
      if (!USERNAME_RE.test(username)) {
        return fail("El usuario debe tener 3-30 caracteres: letras minúsculas, números, punto, guion o guion bajo.");
      }
      if (password.length < MIN_PASSWORD) {
        return fail(`La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`);
      }
      if (!allowedRoles.includes(role)) {
        return fail(isSecretary ? "Solo puedes dar de alta encargados y ayudantes." : "Cargo no válido.");
      }
      if (!SALARY_TYPES.includes(salaryType)) return fail("Modalidad salarial no válida.");
      if (!Number.isFinite(salaryRate) || salaryRate < 0) return fail("Importe de salario no válido.");
      if (await usernameTaken(admin, username)) return fail("Ese nombre de usuario ya existe.", 409);

      // Email interno no adivinable: el usuario nunca lo ve ni lo necesita.
      const internalEmail = `u${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}@tramo.local`;

      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email: internalEmail,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
        app_metadata: { created_by_admin: true },
      });
      if (createError || !created?.user) {
        return fail(createError?.message ?? "No se pudo crear la cuenta.", 400);
      }

      const userId = created.user.id;
      const effectiveFrom = hireDate <= today() ? hireDate : today();

      const { error: profileError } = await admin
        .from("profiles")
        .update({
          full_name: fullName,
          username,
          role,
          hire_date: hireDate,
          account_status: status,
          is_active: true,
          is_approved: true,
          must_change_password: body.must_change_password !== false,
          avatar_path: typeof body.avatar_path === "string" ? body.avatar_path : null,
          salary_type: salaryType,
          salary_rate: salaryRate,
          payment_method: salaryType === "mes" ? "fijo" : "acumulativo",
          fixed_salary: salaryType === "mes" ? salaryRate : null,
        })
        .eq("id", userId);

      if (profileError) {
        // Deshacer: la cuenta acaba de crearse y no tiene historial.
        await admin.auth.admin.deleteUser(userId);
        return fail(profileError.message, 400);
      }

      await admin.from("salary_history").insert({
        employee_id: userId,
        salary_type: salaryType,
        salary_rate: salaryRate,
        effective_from: effectiveFrom,
        note: "Salario inicial",
        created_by: actor,
      });

      if (status !== "activo") {
        await admin.auth.admin.updateUserById(userId, { ban_duration: BAN_FOREVER });
      }

      await audit(admin, actor, "create_user", userId, { username, role, salary_type: salaryType, salary_rate: salaryRate });
      return json({ id: userId });
    }

    // A partir de aquí todas las acciones son sobre un colaborador existente
    const target = await getTarget(admin, body.id);
    if (!target) return fail("Colaborador no encontrado.", 404);
    if (target.role === "admin" || target.id === actor) {
      return fail("Esta acción no se puede aplicar a una cuenta de administrador.", 403);
    }
    if (isSecretary && !SECRETARY_ROLES.includes(target.role)) {
      return fail("Solo el administrador puede gestionar esta cuenta.", 403);
    }

    // =================================================================
    // EDITAR DATOS
    // =================================================================
    if (action === "update") {
      const changes: Record<string, unknown> = {};

      if (body.full_name !== undefined) {
        const fullName = String(body.full_name).trim();
        if (fullName.length < 2) return fail("Introduce el nombre y apellidos.");
        changes.full_name = fullName;
      }
      if (body.username !== undefined) {
        const username = normalizeUsername(body.username);
        if (!USERNAME_RE.test(username)) return fail("Nombre de usuario no válido.");
        if (username !== target.username && (await usernameTaken(admin, username, target.id))) {
          return fail("Ese nombre de usuario ya existe.", 409);
        }
        changes.username = username;
      }
      if (body.role !== undefined) {
        if (!allowedRoles.includes(body.role)) return fail("Cargo no válido.");
        changes.role = body.role;
      }
      if (body.hire_date !== undefined) {
        if (body.hire_date !== null && !isDate(body.hire_date)) return fail("Fecha no válida.");
        changes.hire_date = body.hire_date;
      }
      if (body.avatar_path !== undefined) {
        changes.avatar_path = body.avatar_path || null;
      }
      if (Object.keys(changes).length === 0) return fail("No hay cambios.");

      const { error } = await admin.from("profiles").update(changes).eq("id", target.id);
      if (error) return fail(error.message);

      await audit(admin, actor, "update_user", target.id, changes);
      return json({ ok: true });
    }

    // =================================================================
    // RESTABLECER CONTRASEÑA
    // =================================================================
    if (action === "reset_password") {
      const password = String(body.password ?? "");
      if (password.length < MIN_PASSWORD) {
        return fail(`La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`);
      }
      const { error } = await admin.auth.admin.updateUserById(target.id, { password });
      if (error) return fail(error.message);

      await admin
        .from("profiles")
        .update({ must_change_password: true, failed_login_attempts: 0, locked_until: null })
        .eq("id", target.id);
      await revokeSessions(admin, target.id);
      await audit(admin, actor, "reset_password", target.id, {});
      return json({ ok: true });
    }

    // =================================================================
    // SUSPENDER / REACTIVAR / DESACTIVAR
    // =================================================================
    if (action === "set_status") {
      const status = String(body.status ?? "");
      if (!STATUSES.includes(status)) return fail("Estado no válido.");
      if (target.deleted_at) return fail("El colaborador está eliminado.");

      const { error } = await admin
        .from("profiles")
        .update({
          account_status: status,
          ...(status === "activo" ? { failed_login_attempts: 0, locked_until: null } : {}),
        })
        .eq("id", target.id);
      if (error) return fail(error.message);

      await admin.auth.admin.updateUserById(target.id, {
        ban_duration: status === "activo" ? "none" : BAN_FOREVER,
      });
      if (status !== "activo") await revokeSessions(admin, target.id);

      await audit(admin, actor, "set_status", target.id, { antes: target.account_status, despues: status });
      return json({ ok: true });
    }

    // =================================================================
    // DESBLOQUEAR
    // =================================================================
    if (action === "unlock") {
      await admin
        .from("profiles")
        .update({ failed_login_attempts: 0, locked_until: null })
        .eq("id", target.id);
      await audit(admin, actor, "unlock", target.id, {});
      return json({ ok: true });
    }

    // =================================================================
    // CERRAR SESIONES
    // =================================================================
    if (action === "revoke_sessions") {
      await revokeSessions(admin, target.id);
      await audit(admin, actor, "revoke_sessions", target.id, {});
      return json({ ok: true });
    }

    // =================================================================
    // ELIMINACIÓN LÓGICA (no borra historial, pagos ni trabajos)
    // =================================================================
    if (action === "delete") {
      const { error } = await admin
        .from("profiles")
        .update({
          is_active: false,
          account_status: "desactivado",
          deleted_at: new Date().toISOString(),
        })
        .eq("id", target.id);
      if (error) return fail(error.message);

      await admin.auth.admin.updateUserById(target.id, { ban_duration: BAN_FOREVER });
      await revokeSessions(admin, target.id);
      await audit(admin, actor, "soft_delete", target.id, { username: target.username });
      return json({ ok: true });
    }

    return fail("Acción no válida.");
  } catch (_err) {
    return fail("Error interno. Inténtalo de nuevo.", 500);
  }
});
