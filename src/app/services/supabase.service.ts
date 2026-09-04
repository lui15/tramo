import { Injectable } from "@angular/core";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { environment } from "../../environments/environment";

export type ExpenseType =
  | "pago_vehiculo"
  | "combustible"
  | "material"
  | "herramientas"
  | "mantenimiento"
  | "peajes_parking"
  | "alquiler_equipo"
  | "otros";

export interface Expense {
  id?: string;
  expense_type: ExpenseType;
  description: string;
  amount: number;
  expense_date: string;
  expense_time: string;
  created_at?: string;
  updated_at?: string;
}

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: "admin" | "supervisor" | "ayudante";
  payment_method: "acumulativo" | "fijo" | null;
  fixed_salary: number | null;
  accumulated_balance: number;
  is_approved: boolean;
}

// NUEVO: refleja lo que ahora devuelve la vista employee_job_history,
// incluyendo duration_unit (antes no estaba expuesto).
export interface JobHistoryEntry {
  participation_id: string;
  job_type: string;
  job_date: string;
  start_time: string;
  hours_or_days: number;
  amount_earned: number;
  employee_id: string;
  duration_unit: "horas" | "dias";
}

@Injectable({ providedIn: "root" })
export class SupabaseService {
  public supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseAnonKey,
    );
  }

  // =========================================================
  // AUTH
  // =========================================================

  async signUp(email: string, password: string, fullName: string) {
    return this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });
  }

  async signIn(email: string, password: string) {
    return this.supabase.auth.signInWithPassword({
      email,
      password,
    });
  }

  async signOut() {
    return this.supabase.auth.signOut();
  }

  async getCurrentUser() {
    const { data } = await this.supabase.auth.getUser();
    return data.user;
  }

  async getMyProfile(): Promise<Profile | null> {
    const user = await this.getCurrentUser();

    if (!user) {
      return null;
    }

    const { data, error } = await this.supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error) {
      throw error;
    }

    return data as Profile;
  }

  // =========================================================
  // TRABAJOS - ADMIN
  // =========================================================

  async getAllJobs() {
    const { data, error } = await this.supabase
      .from("jobs")
      .select("*")
      .order("job_date", {
        ascending: true,
      });

    if (error) {
      throw error;
    }

    return data;
  }

  async createJob(job: any) {
    const { data, error } = await this.supabase
      .from("jobs")
      .insert(job)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async updateJob(id: string, changes: any) {
    const { data, error } = await this.supabase
      .from("jobs")
      .update(changes)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async deleteJob(id: string) {
    const { error } = await this.supabase.from("jobs").delete().eq("id", id);

    if (error) {
      throw error;
    }
  }

  async addJobParticipant(participant: {
    job_id: string;
    employee_id: string;
    hours_or_days: number;
    amount_earned: number;
  }) {
    const { data, error } = await this.supabase
      .from("job_participants")
      .insert(participant)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  // =========================================================
  // EMPLEADOS - ADMIN
  // =========================================================

  async getAllEmployees() {
    const { data, error } = await this.supabase
      .from("profiles")
      .select("*")
      .neq("role", "admin")
      .order("is_approved", {
        ascending: true,
      });

    if (error) {
      throw error;
    }

    return data as Profile[];
  }

  async approveEmployee(
    id: string,
    changes: {
      role: string;
      payment_method: string;
      fixed_salary: number | null;
    },
  ) {
    const { data, error } = await this.supabase
      .from("profiles")
      .update({
        ...changes,
        is_approved: true,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async updateEmployee(id: string, changes: any) {
    const { data, error } = await this.supabase
      .from("profiles")
      .update(changes)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  // MODIFICADO: antes borraba solo de "profiles" (this.supabase.from("profiles").delete()...),
  // lo que dejaba el usuario "fantasma" en auth.users, bloqueando ese email para siempre.
  // Ahora llama a la Edge Function "delete-employee" (ya desplegada), que borra de auth.users
  // con permisos de servicio, y profiles se limpia solo por el ON DELETE CASCADE existente.
  async deleteEmployee(id: string) {
    const { data, error } = await this.supabase.functions.invoke(
      "delete-employee",
      {
        body: { employeeId: id },
      },
    );

    if (error) {
      throw error;
    }

    if (data?.error) {
      throw new Error(data.error);
    }

    return data;
  }

  // =========================================================
  // PAGOS / SETTLEMENTS
  // =========================================================

  async getEmployeeSettlements(employeeId: string) {
    const { data, error } = await this.supabase
      .from("settlements")
      .select("*")
      .eq("employee_id", employeeId)
      .order("settlement_date", {
        ascending: false,
      });

    if (error) {
      throw error;
    }

    return data;
  }

  async getAllSettlements() {
    const { data: settlements, error: settlementsError } = await this.supabase
      .from("settlements")
      .select("*")
      .order("settlement_date", { ascending: false });

    if (settlementsError) {
      console.error("ERROR settlements:", settlementsError);
      throw settlementsError;
    }

    const { data: profiles, error: profilesError } = await this.supabase
      .from("profiles")
      .select("id, full_name");

    if (profilesError) {
      console.error("ERROR profiles:", profilesError);
      throw profilesError;
    }

    console.log("SETTLEMENTS:", settlements);
    console.log("PROFILES:", profiles);

    return (settlements ?? []).map((settlement: any) => {
      const employeeId = String(settlement.employee_id ?? "").trim();

      const profile = (profiles ?? []).find(
        (p: { id: string; full_name: string }) =>
          String(p.id).trim() === employeeId,
      );

      console.log("PAGO:", settlement.id);
      console.log("employee_id:", employeeId);
      console.log("empleado encontrado:", profile);

      return {
        ...settlement,
        employee_name: profile?.full_name || "Empleado",
      };
    });
  }
  async createSettlement(employeeId: string, amount: number) {
    const { data, error } = await this.supabase
      .from("settlements")
      .insert({
        employee_id: employeeId,
        amount,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  // =========================================================
  // GASTOS - FINANZAS
  // =========================================================

  /**
   * Obtener todos los gastos.
   */
  async getExpenses(): Promise<Expense[]> {
    const { data, error } = await this.supabase
      .from("expenses")
      .select("*")
      .order("expense_date", {
        ascending: false,
      })
      .order("expense_time", {
        ascending: false,
      });

    if (error) {
      throw error;
    }

    return (data ?? []) as Expense[];
  }

  /**
   * Obtener gastos de un mes concreto.
   */
  async getExpensesByMonth(year: number, month: number): Promise<Expense[]> {
    const firstDay = `${year}-${String(month).padStart(2, "0")}-01`;

    const lastDayDate = new Date(year, month, 0);

    const lastDay = `${year}-${String(month).padStart(2, "0")}-${String(
      lastDayDate.getDate(),
    ).padStart(2, "0")}`;

    const { data, error } = await this.supabase
      .from("expenses")
      .select("*")
      .gte("expense_date", firstDay)
      .lte("expense_date", lastDay)
      .order("expense_date", {
        ascending: false,
      })
      .order("expense_time", {
        ascending: false,
      });

    if (error) {
      throw error;
    }

    return (data ?? []) as Expense[];
  }

  /**
   * Crear un gasto.
   */
  async createExpense(
    expense: Omit<Expense, "id" | "created_at" | "updated_at">,
  ) {
    const { data, error } = await this.supabase
      .from("expenses")
      .insert({
        expense_type: expense.expense_type,
        description: expense.description,
        amount: Number(expense.amount),
        expense_date: expense.expense_date,
        expense_time: expense.expense_time,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data as Expense;
  }

  /**
   * Actualizar un gasto.
   */
  async updateExpense(id: string, changes: Partial<Expense>) {
    const updateData: any = {};

    if (changes.expense_type !== undefined) {
      updateData.expense_type = changes.expense_type;
    }

    if (changes.description !== undefined) {
      updateData.description = changes.description;
    }

    if (changes.amount !== undefined) {
      updateData.amount = Number(changes.amount);
    }

    if (changes.expense_date !== undefined) {
      updateData.expense_date = changes.expense_date;
    }

    if (changes.expense_time !== undefined) {
      updateData.expense_time = changes.expense_time;
    }

    const { data, error } = await this.supabase
      .from("expenses")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data as Expense;
  }

  /**
   * Eliminar un gasto.
   */
  async deleteExpense(id: string) {
    const { error } = await this.supabase
      .from("expenses")
      .delete()
      .eq("id", id);

    if (error) {
      throw error;
    }
  }

  // =========================================================
  // FINANZAS / HISTORIAL - ADMIN
  // =========================================================

  async getFinancialSummary() {
    const { data, error } = await this.supabase
      .from("financial_summary")
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async getAdminFinishedJobs() {
    const { data, error } = await this.supabase
      .from("admin_finished_jobs")
      .select("*")
      .order("job_date", {
        ascending: false,
      });

    if (error) {
      throw error;
    }

    return data;
  }

  // =========================================================
  // EMPLEADO
  // =========================================================

  async getAvailableJobsForEmployee() {
    const { data, error } = await this.supabase
      .from("employee_available_jobs")
      .select("*")
      .order("job_date", {
        ascending: true,
      });

    if (error) {
      throw error;
    }

    return data;
  }

  // MODIFICADO: solo el tipo de retorno, para que TypeScript sepa que
  // cada fila ya trae duration_unit ("horas" | "dias"), tal como ahora
  // lo expone la vista employee_job_history. La consulta en sí no cambia.
  async getMyJobHistory(): Promise<JobHistoryEntry[]> {
    const user = await this.getCurrentUser();

    if (!user) {
      return [];
    }

    const { data, error } = await this.supabase
      .from("employee_job_history")
      .select("*")
      .eq("employee_id", user.id)
      .order("job_date", {
        ascending: false,
      });

    if (error) {
      throw error;
    }

    return (data ?? []) as JobHistoryEntry[];
  }

  async getMySettlements() {
    const user = await this.getCurrentUser();

    if (!user) {
      return [];
    }

    const { data, error } = await this.supabase
      .from("settlements")
      .select("*")
      .eq("employee_id", user.id)
      .order("settlement_date", {
        ascending: false,
      });

    if (error) {
      throw error;
    }

    return data;
  }
}
