// =====================================================================
// payroll — Adelantos y pago de salario (ADMIN y SECRETARÍA)
// ---------------------------------------------------------------------
//   summary  { employee_id }                      Resumen y últimos pagos
//   pay      { employee_id, kind, amount?, note } kind: adelanto | salario
//
// Todos los importes se calculan AQUÍ (en el servidor):
//   · Por horas / por día  → pendiente = generado en trabajos − pagado
//   · Salario fijo mensual → pendiente = salario del mes − pagado este mes
// "Adelanto" = parte de lo pendiente (nunca más de lo pendiente).
// "Pagar salario" = liquida todo lo pendiente.
// Cada pago queda en settlements → el trigger descuenta el saldo y envía
// la notificación al trabajador.
// =====================================================================
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { fail, json, preflight } from "../_shared/http.ts";

const round2 = (n: number) => Math.round(n * 100) / 100;

function monthBounds(d = new Date()) {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const start = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
  const end = new Date(Date.UTC(y, m + 1, 1)).toISOString().slice(0, 10);
  return { start, end };
}

async function buildSummary(admin: SupabaseClient, employeeId: string) {
  const { data: p } = await admin
    .from("profiles")
    .select("id, full_name, username, role, salary_type, salary_rate, payment_method, fixed_salary, account_status, deleted_at")
    .eq("id", employeeId)
    .maybeSingle();

  if (!p || p.role === "admin") return null;

  const [partsRes, setRes] = await Promise.all([
    admin.from("job_participants").select("amount_earned").eq("employee_id", employeeId),
    admin
      .from("settlements")
      .select("*")
      .eq("employee_id", employeeId)
      .order("settlement_date", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);
  if (partsRes.error) throw partsRes.error;
  if (setRes.error) throw setRes.error;

  const settlements = setRes.data ?? [];
  const generated = round2((partsRes.data ?? []).reduce((t, r) => t + (Number(r.amount_earned) || 0), 0));
  const paid = round2(settlements.reduce((t, s) => t + (Number(s.amount) || 0), 0));

  const fixed = p.salary_type === "mes" || p.payment_method === "fijo";
  const { start, end } = monthBounds();
  const paidThisMonth = round2(
    settlements
      .filter((s) => s.settlement_date >= start && s.settlement_date < end)
      .reduce((t, s) => t + (Number(s.amount) || 0), 0),
  );
  const advancesThisMonth = round2(
    settlements
      .filter((s) => s.settlement_date >= start && s.settlement_date < end && s.kind === "adelanto")
      .reduce((t, s) => t + (Number(s.amount) || 0), 0),
  );

  const monthlySalary = fixed ? round2(Number(p.salary_rate ?? p.fixed_salary) || 0) : 0;
  const pending = fixed
    ? round2(Math.max(0, monthlySalary - paidThisMonth))
    : round2(Math.max(0, generated - paid));

  return {
    employee: {
      id: p.id,
      full_name: p.full_name,
      username: p.username,
      role: p.role,
      salary_type: p.salary_type,
      salary_rate: p.salary_rate,
      account_status: p.account_status,
      deleted: !!p.deleted_at,
    },
    mode: fixed ? "fijo" : "acumulativo",
    generated,
    paid,
    pending,
    monthly_salary: monthlySalary,
    paid_this_month: paidThisMonth,
    advances_this_month: advancesThisMonth,
    settlements: settlements.slice(0, 50).map((s) => ({
      id: s.id,
      amount: Number(s.amount) || 0,
      settlement_date: s.settlement_date,
      settlement_time: s.settlement_time,
      kind: s.kind ?? "pago",
      note: s.note ?? null,
    })),
  };
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

    const { data: me } = await admin
      .from("profiles")
      .select("id, role, account_status, is_active, deleted_at")
      .eq("id", caller.user.id)
      .maybeSingle();

    if (
      !me ||
      !["admin", "secretaria"].includes(me.role) ||
      me.account_status !== "activo" ||
      !me.is_active ||
      me.deleted_at
    ) {
      return fail("No autorizado", 403);
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "");
    const employeeId = typeof body.employee_id === "string" ? body.employee_id : "";
    if (!employeeId) return fail("Falta el colaborador.");

    // La secretaría solo gestiona pagos de encargados y ayudantes (nunca los suyos)
    const guard = async () => {
      const summary = await buildSummary(admin, employeeId);
      if (!summary) return { error: fail("Colaborador no encontrado.", 404) };
      if (me.role === "secretaria" && !["encargado", "ayudante"].includes(String(summary.employee.role))) {
        return { error: fail("Solo el administrador puede gestionar los pagos de la secretaría.", 403) };
      }
      return { summary };
    };

    if (action === "summary") {
      const g = await guard();
      if (g.error) return g.error;
      return json(g.summary);
    }

    if (action === "pay") {
      const kind = String(body.kind ?? "");
      if (!["adelanto", "salario"].includes(kind)) return fail("Tipo de pago no válido.");

      const g = await guard();
      if (g.error) return g.error;
      const summary = g.summary!;
      if (summary.employee.deleted) return fail("Este colaborador está eliminado.");

      let amount: number;
      if (kind === "salario") {
        amount = summary.pending;
        if (amount <= 0) {
          return fail(
            summary.mode === "fijo"
              ? "El salario de este mes ya está pagado."
              : "No tiene nada pendiente de cobrar.",
          );
        }
      } else {
        amount = round2(Number(body.amount));
        if (!Number.isFinite(amount) || amount <= 0) return fail("Introduce un importe válido.");
        if (amount > summary.pending) {
          return fail(
            `El adelanto no puede superar lo pendiente (${summary.pending.toFixed(2)} €).`,
          );
        }
      }

      const note = typeof body.note === "string" ? body.note.trim().slice(0, 200) : "";
      const row: Record<string, unknown> = {
        employee_id: employeeId,
        amount,
        created_by: me.id,
        kind,
        note: note || null,
      };

      let { data: inserted, error } = await admin.from("settlements").insert(row).select("id").single();

      // Compatibilidad: si aún no existen las columnas kind/note, se guarda el pago igualmente.
      if (error && /kind|note|column/i.test(error.message)) {
        delete row.kind;
        delete row.note;
        ({ data: inserted, error } = await admin.from("settlements").insert(row).select("id").single());
      }
      if (error) throw error;

      await admin.from("audit_log").insert({
        actor_id: me.id,
        action: kind === "adelanto" ? "advance_paid" : "salary_paid",
        entity: "settlements",
        entity_id: inserted?.id ?? null,
        details: { employee_id: employeeId, amount, note: note || null },
      });

      return json(await buildSummary(admin, employeeId));
    }

    return fail("Acción no válida.");
  } catch (_err) {
    return fail("No se pudo completar la operación. Inténtalo de nuevo.", 500);
  }
});
