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

export type Role = "admin" | "secretaria" | "encargado" | "ayudante";
export type AccountStatus = "activo" | "suspendido" | "desactivado";
export type SalaryType = "hora" | "dia" | "mes";

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrador",
  secretaria: "Secretaria",
  encargado: "Encargado",
  ayudante: "Ayudante",
};

export const SALARY_TYPE_LABELS: Record<SalaryType, string> = {
  hora: "Por horas",
  dia: "Por días",
  mes: "Fijo mensual",
};

export const SALARY_UNIT: Record<SalaryType, string> = {
  hora: "€/hora",
  dia: "€/día",
  mes: "€/mes",
};

export const STATUS_LABELS: Record<AccountStatus, string> = {
  activo: "Activo",
  suspendido: "Suspendido",
  desactivado: "Desactivado",
};

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  payment_method: "acumulativo" | "fijo" | null;
  fixed_salary: number | null;
  accumulated_balance: number;
  is_approved: boolean;
  is_active: boolean;
  username: string | null;
  avatar_path: string | null;
  hire_date: string | null;
  account_status: AccountStatus;
  salary_type: SalaryType | null;
  salary_rate: number | null;
  must_change_password: boolean;
  locked_until: string | null;
  deleted_at: string | null;
  last_login_at: string | null;
  created_at?: string;
}

export interface SalaryHistoryEntry {
  id: string;
  employee_id: string;
  salary_type: SalaryType;
  salary_rate: number;
  effective_from: string;
  note: string | null;
  created_by: string | null;
  created_at: string;
}

export interface TeamMember {
  id: string;
  full_name: string;
  username: string | null;
  role: Role;
  avatar_path: string | null;
  account_status: AccountStatus;
  hire_date: string | null;
}

export interface NewCollaborator {
  full_name: string;
  username: string;
  password: string;
  role: Exclude<Role, "admin">;
  hire_date: string;
  salary_type: SalaryType;
  salary_rate: number;
  account_status: AccountStatus;
  avatar_path?: string | null;
}

/** Ruta de inicio de cada rol. */
export function homeForRole(role: Role | null | undefined): string {
  switch (role) {
    case "admin":
      return "/admin";
    case "secretaria":
      return "/secretaria";
    case "encargado":
    case "ayudante":
      return "/employee";
    default:
      return "/login";
  }
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

export interface PayrollSettlement {
  id: string;
  amount: number;
  settlement_date: string;
  settlement_time: string | null;
  kind: "pago" | "adelanto" | "salario";
  note: string | null;
}

export interface PayrollSummary {
  employee: {
    id: string;
    full_name: string;
    username: string;
    role: Role;
    salary_type: SalaryType;
    salary_rate: number;
    account_status: AccountStatus;
    deleted: boolean;
  };
  mode: "fijo" | "acumulativo";
  generated: number;
  paid: number;
  pending: number;
  monthly_salary: number;
  paid_this_month: number;
  advances_this_month: number;
  settlements: PayrollSettlement[];
}

// =========================================================
// CIERRE DE TRABAJOS EN DOS PASOS
// =========================================================
export type JobStatus = "pendiente" | "confirmado" | "en_curso" | "pendiente_revision" | "finalizado";

export const JOB_STATUS_LABELS: Record<string, string> = {
  pendiente: "Pendiente",
  confirmado: "Confirmado",
  en_curso: "En curso",
  pendiente_revision: "En revisión",
  finalizado: "Finalizado",
};

export interface CloseParticipantInput {
  employee_id: string;
  full: boolean;
  hours_or_days?: number | null;
}

export interface CloseJobInput {
  unit: "horas" | "dias";
  value: number;
  participants: CloseParticipantInput[];
  completion_date: string; // YYYY-MM-DD
  completion_time: string; // HH:MM
  note?: string | null;
  /** Lo que se cobró al cliente (obligatorio). */
  price: number;
}

export type JobPriceType = "fijo" | "hora" | "dia";

export const PRICE_TYPE_LABELS: Record<JobPriceType, string> = {
  fijo: "Precio fijo",
  hora: "Por hora",
  dia: "Por día",
};

export type VehicleType = "furgoneta" | "camion" | "coche" | "moto" | "otro";
export type VehicleOwnership = "financiado" | "comprado";

export const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  furgoneta: "Furgoneta",
  camion: "Camión",
  coche: "Coche",
  moto: "Moto",
  otro: "Otro",
};

export interface Vehicle {
  id: string;
  plate: string;
  brand: string;
  model: string | null;
  vehicle_type: VehicleType;
  kilometers: number | null;
  photo_path: string | null;
  driver_id: string | null;
  ownership: VehicleOwnership;
  monthly_payment: number | null;
  finance_start: string | null;
  finance_end: string | null;
  purchase_price: number | null;
  purchase_date: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface JobPhoto {
  id: string;
  job_id: string;
  path: string;
  uploaded_by: string | null;
  created_at: string;
  url?: string;
}

/** Persona tal y como la ve la revisión (incluye su regla de pago). */
export interface ReviewPerson {
  employee_id: string;
  full_name: string;
  role: Role;
  avatar_path?: string | null;
  is_fixed: boolean;
  auto_rate: number | null;
  salary_type: SalaryType | null;
  salary_rate: number | null;
}

export interface ReviewParticipant extends ReviewPerson {
  hours_or_days: number;
  full_time: boolean;
  day_rate: number | null;
  amount_earned: number | null;
}

export interface JobReview {
  job: any;
  participants: ReviewParticipant[];
  team: ReviewPerson[];
}

export interface EncargadoJob {
  id: string;
  job_type: string;
  client_name: string;
  client_phone: string;
  address_info: string | null;
  job_date: string;
  start_time: string | null;
  status: JobStatus;
  encargado_id: string | null;
  encargado_name: string | null;
  is_mine: boolean;
  my_hours: number | null;
  return_reason: string | null;
  duration_unit: "horas" | "dias" | null;
  duration_value: number | null;
  completion_date: string | null;
  completion_time: string | null;
  closed_at: string | null;
  price_type: JobPriceType | null;
  price_amount: number | null;
  closed_price: number | null;
  photo_count: number;
}

export interface MyMoneyJob {
  job_id: string;
  job_type: string;
  client_name: string;
  job_date: string;
  start_time: string | null;
  status: JobStatus;
  duration_unit: "horas" | "dias" | null;
  hours_or_days: number;
  amount_earned: number | null;
}

export interface MyMoneySettlement {
  id: string;
  kind: "pago" | "adelanto" | "salario";
  amount: number;
  note: string | null;
  settlement_date: string;
  settlement_time?: string | null;
  month?: string;
}

export interface MyMoney {
  full_name: string;
  role: Role;
  mode: "fijo" | "hora" | "dia";
  rate: number;
  month: string;
  hours: number;
  days: number;
  earned: number;
  jobs_done: number;
  jobs_in_review: number;
  base: number;
  advances: number;
  payments: number;
  pending: number;
  balance_total: number | null;
  jobs: MyMoneyJob[];
  settlements: MyMoneySettlement[];
  advances_all: MyMoneySettlement[];
}

export interface BasicParticipant {
  employee_id: string;
  full_name: string;
  role: Role;
  hours_or_days: number;
  full_time: boolean;
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

  /**
   * Inicio de sesión con NOMBRE DE USUARIO y contraseña.
   * La Edge Function "login" comprueba bloqueos y estado de la cuenta y
   * devuelve la sesión de Supabase Auth.
   */
  async signInWithUsername(
    username: string,
    password: string,
  ): Promise<{ role: Role; must_change_password: boolean }> {
    const result = await this.callFunction<{
      session: { access_token: string; refresh_token: string };
      role: Role;
      must_change_password: boolean;
    }>("login", { username, password });

    const { error } = await this.supabase.auth.setSession(result.session);

    if (error) {
      throw error;
    }

    this.profileCache = null;

    return {
      role: result.role,
      must_change_password: result.must_change_password,
    };
  }

  async signOut() {
    this.profileCache = null;
    return this.supabase.auth.signOut();
  }

  /** Cambio de contraseña del propio usuario. */
  /**
   * Cambia la contraseña del usuario actual. Se hace en el servidor
   * (Edge Function "account") para que la contraseña y la marca
   * "debe cambiar la contraseña" se actualicen siempre juntas.
   */
  async changeMyPassword(newPassword: string) {
    await this.callFunction<{ ok: boolean }>("account", {
      action: "change_password",
      password: newPassword,
    });

    this.profileCache = null;
  }

  // =========================================================
  // NÓMINA: adelantos y pago de salario (admin y secretaría)
  // =========================================================

  getPayroll(employeeId: string) {
    return this.callFunction<PayrollSummary>("payroll", {
      action: "summary",
      employee_id: employeeId,
    });
  }

  payEmployee(
    employeeId: string,
    kind: "adelanto" | "salario",
    amount?: number,
    note?: string,
  ) {
    return this.callFunction<PayrollSummary>("payroll", {
      action: "pay",
      employee_id: employeeId,
      kind,
      amount,
      note,
    });
  }

  /**
   * Llama a una Edge Function y convierte sus errores en un Error con el
   * mensaje legible que devuelve la función.
   */
  private async callFunction<T>(
    name: string,
    body: Record<string, any>,
  ): Promise<T> {
    const { data, error } = await this.supabase.functions.invoke(name, {
      body,
    });

    if (error) {
      let message = error.message;

      try {
        const payload = await (error as any).context?.json?.();

        if (payload?.error) {
          message = payload.error;
        }
      } catch {
        // respuesta sin JSON
      }

      throw new Error(message);
    }

    if ((data as any)?.error) {
      throw new Error((data as any).error);
    }

    return data as T;
  }

  async getCurrentUser() {
    const { data } = await this.supabase.auth.getUser();
    return data.user;
  }

  // Caché breve para no repetir la consulta del perfil en cada guard/cabecera.
  private profileCache: { at: number; profile: Profile } | null = null;

  async getMyProfile(force = false): Promise<Profile | null> {
    const { data: sessionData } = await this.supabase.auth.getSession();
    const user = sessionData.session?.user;

    if (!user) {
      this.profileCache = null;
      return null;
    }

    if (
      !force &&
      this.profileCache &&
      this.profileCache.profile.id === user.id &&
      Date.now() - this.profileCache.at < 30_000
    ) {
      return this.profileCache.profile;
    }

    const { data, error } = await this.supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      this.profileCache = null;
      return null;
    }

    this.profileCache = { at: Date.now(), profile: data as Profile };

    return data as Profile;
  }

  // =========================================================
  // COLABORADORES - ADMIN (Edge Function admin-users)
  // =========================================================

  async createCollaborator(input: NewCollaborator) {
    return this.callFunction<{ id: string }>("admin-users", {
      action: "create",
      ...input,
    });
  }

  async updateCollaborator(
    id: string,
    changes: Partial<
      Pick<Profile, "full_name" | "username" | "role" | "hire_date" | "avatar_path">
    >,
  ) {
    return this.callFunction("admin-users", {
      action: "update",
      id,
      ...changes,
    });
  }

  async resetCollaboratorPassword(id: string, password: string) {
    return this.callFunction("admin-users", {
      action: "reset_password",
      id,
      password,
    });
  }

  async setCollaboratorStatus(id: string, status: AccountStatus) {
    return this.callFunction("admin-users", {
      action: "set_status",
      id,
      status,
    });
  }

  async unlockCollaborator(id: string) {
    return this.callFunction("admin-users", { action: "unlock", id });
  }

  async revokeCollaboratorSessions(id: string) {
    return this.callFunction("admin-users", { action: "revoke_sessions", id });
  }

  /** Eliminación LÓGICA: conserva historial, pagos y trabajos. */
  async deleteCollaborator(id: string) {
    return this.callFunction("admin-users", { action: "delete", id });
  }

  async changeSalary(
    employeeId: string,
    salaryType: SalaryType,
    salaryRate: number,
    effectiveFrom: string,
    note?: string,
  ): Promise<SalaryHistoryEntry> {
    const { data, error } = await this.supabase.rpc("change_salary", {
      p_employee: employeeId,
      p_salary_type: salaryType,
      p_salary_rate: salaryRate,
      p_effective_from: effectiveFrom,
      p_note: note || null,
    });

    if (error) {
      throw error;
    }

    return data as SalaryHistoryEntry;
  }

  async getSalaryHistory(employeeId: string): Promise<SalaryHistoryEntry[]> {
    const { data, error } = await this.supabase
      .from("salary_history")
      .select("*")
      .eq("employee_id", employeeId)
      .order("effective_from", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return (data ?? []) as SalaryHistoryEntry[];
  }

  // =========================================================
  // CIERRE Y REVISIÓN DE TRABAJOS (funciones SQL del servidor)
  // =========================================================

  /** Paso A: el encargado (o staff) cierra el trabajo -> En revisión. */
  async closeJob(jobId: string, input: CloseJobInput) {
    const { data, error } = await this.supabase.rpc("cerrar_trabajo", {
      p_job: jobId,
      p_unit: input.unit,
      p_value: input.value,
      p_participants: input.participants,
      p_completion_date: input.completion_date,
      p_completion_time: input.completion_time,
      p_note: input.note ?? null,
      p_price: input.price,
    });
    if (error) throw new Error(this.friendlyDbError(error.message));
    return data;
  }

  /** Datos completos para revisar (solo secretaría y admin). */
  async getJobReview(jobId: string): Promise<JobReview> {
    const { data, error } = await this.supabase.rpc("revision_trabajo", { p_job: jobId });
    if (error) throw new Error(this.friendlyDbError(error.message));
    return data as JobReview;
  }

  /** Paso B: aprobar. El servidor recalcula todos los importes. */
  async approveJob(
    jobId: string,
    participants: { employee_id: string; hours_or_days: number; day_rate: number | null }[],
    totalCost: number,
  ) {
    const { data, error } = await this.supabase.rpc("aprobar_trabajo", {
      p_job: jobId,
      p_participants: participants,
      p_total_cost: totalCost,
    });
    if (error) throw new Error(this.friendlyDbError(error.message));
    return data as { job: any; total_pagado: number };
  }

  /** Devuelve el trabajo al encargado con un motivo. */
  async returnJob(jobId: string, reason: string) {
    const { data, error } = await this.supabase.rpc("devolver_trabajo", {
      p_job: jobId,
      p_reason: reason,
    });
    if (error) throw new Error(this.friendlyDbError(error.message));
    return data;
  }

  /** Participantes sin importes (lo que puede ver el encargado). */
  async getJobParticipantsBasic(jobId: string): Promise<BasicParticipant[]> {
    const { data, error } = await this.supabase.rpc("participantes_trabajo", { p_job: jobId });
    if (error) throw new Error(this.friendlyDbError(error.message));
    return (data ?? []) as BasicParticipant[];
  }

  // =========================================================
  // PANEL DEL ENCARGADO (siempre datos del usuario conectado)
  // =========================================================

  /** Trabajos del mes (por fecha programada) visibles para el encargado. */
  async getEncargadoJobs(year: number, month: number): Promise<EncargadoJob[]> {
    const { data, error } = await this.supabase.rpc("encargado_trabajos", {
      p_year: year,
      p_month: month,
    });
    if (error) throw new Error(this.friendlyDbError(error.message));
    return (data ?? []) as EncargadoJob[];
  }

  /** Resumen económico del mes del usuario conectado. */
  async getMyMoney(year: number, month: number): Promise<MyMoney> {
    const { data, error } = await this.supabase.rpc("mi_dinero", {
      p_year: year,
      p_month: month,
    });
    if (error) throw new Error(this.friendlyDbError(error.message));
    return data as MyMoney;
  }

  /** Traduce errores técnicos frecuentes a un mensaje entendible. */
  private friendlyDbError(message: string): string {
    if (/could not find the function|schema cache|does not exist/i.test(message)) {
      return "Falta actualizar la base de datos (ejecuta en Supabase el último EJECUTAR_EN_SQL_EDITOR_*.sql).";
    }
    return message;
  }

  /** Directorio del equipo sin datos salariales (admin, secretaria, encargado). */
  async listTeam(): Promise<TeamMember[]> {
    const { data, error } = await this.supabase.rpc("list_team");

    if (error) {
      throw error;
    }

    return (data ?? []) as TeamMember[];
  }

  // =========================================================
  // FOTOS DE TRABAJOS (bucket privado "job-photos")
  // Ruta: <job_id>/<uuid>.<ext>. Pueden verlas y subirlas el
  // encargado del trabajo, la secretaría y el admin.
  // =========================================================

  async listJobPhotos(jobId: string): Promise<JobPhoto[]> {
    const { data, error } = await this.supabase
      .from("job_photos")
      .select("*")
      .eq("job_id", jobId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(this.friendlyDbError(error.message));
    const photos = (data ?? []) as JobPhoto[];
    if (photos.length === 0) return photos;

    const { data: signed } = await this.supabase.storage
      .from("job-photos")
      .createSignedUrls(photos.map((p) => p.path), 3600);
    const urls: Record<string, string> = {};
    for (const item of signed ?? []) {
      if (item.path && item.signedUrl) urls[item.path] = item.signedUrl;
    }
    return photos.map((p) => ({ ...p, url: urls[p.path] }));
  }

  async uploadJobPhoto(jobId: string, file: File): Promise<JobPhoto> {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      throw new Error("Solo se admiten fotos JPG, PNG o WEBP.");
    }
    if (file.size > 6 * 1024 * 1024) {
      throw new Error("La foto pesa más de 6 MB.");
    }
    const { data: auth } = await this.supabase.auth.getUser();
    const me = auth.user?.id;
    if (!me) throw new Error("Tu sesión ha caducado. Vuelve a entrar.");

    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${jobId}/${crypto.randomUUID()}.${ext}`;

    const { error: upErr } = await this.supabase.storage
      .from("job-photos")
      .upload(path, file, { contentType: file.type, upsert: false });
    if (upErr) throw new Error(this.friendlyDbError(upErr.message));

    const { data, error } = await this.supabase
      .from("job_photos")
      .insert({ job_id: jobId, path, uploaded_by: me })
      .select()
      .single();
    if (error) {
      await this.supabase.storage.from("job-photos").remove([path]);
      throw new Error(this.friendlyDbError(error.message));
    }
    return data as JobPhoto;
  }

  async deleteJobPhoto(photo: JobPhoto) {
    const { error } = await this.supabase.from("job_photos").delete().eq("id", photo.id);
    if (error) throw new Error(this.friendlyDbError(error.message));
    await this.supabase.storage.from("job-photos").remove([photo.path]);
  }

  // =========================================================
  // VEHÍCULOS (admin y secretaría)
  // =========================================================

  async listVehicles(): Promise<Vehicle[]> {
    const { data, error } = await this.supabase
      .from("vehicles")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: true });
    if (error) throw new Error(this.friendlyDbError(error.message));
    return (data ?? []) as Vehicle[];
  }

  async saveVehicle(v: Partial<Vehicle>): Promise<Vehicle> {
    const payload: any = {
      plate: v.plate,
      brand: v.brand,
      model: v.model ?? null,
      vehicle_type: v.vehicle_type ?? "furgoneta",
      kilometers: v.kilometers ?? null,
      photo_path: v.photo_path ?? null,
      driver_id: v.driver_id ?? null,
      ownership: v.ownership,
      monthly_payment: v.ownership === "financiado" ? v.monthly_payment : null,
      finance_start: v.ownership === "financiado" ? v.finance_start || null : null,
      finance_end: v.ownership === "financiado" ? v.finance_end || null : null,
      purchase_price: v.ownership === "comprado" ? v.purchase_price : null,
      purchase_date: v.ownership === "comprado" ? v.purchase_date || null : null,
      notes: v.notes ?? null,
    };
    const query = v.id
      ? this.supabase.from("vehicles").update(payload).eq("id", v.id)
      : this.supabase.from("vehicles").insert(payload);
    const { data, error } = await query.select().single();
    if (error) throw new Error(this.vehicleError(error.message));
    return data as Vehicle;
  }

  /** Baja lógica: el vehículo deja de salir, sus gastos se conservan. */
  async deactivateVehicle(id: string) {
    const { error } = await this.supabase.from("vehicles").update({ is_active: false }).eq("id", id);
    if (error) throw new Error(this.friendlyDbError(error.message));
  }

  async uploadVehiclePhoto(file: File): Promise<string> {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error("Solo se admiten fotos JPG, PNG o WEBP.");
    if (file.size > 6 * 1024 * 1024) throw new Error("La foto pesa más de 6 MB.");
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await this.supabase.storage
      .from("vehicle-photos")
      .upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw new Error(this.friendlyDbError(error.message));
    return path;
  }

  async getVehiclePhotoUrls(paths: string[]): Promise<Record<string, string>> {
    const unique = [...new Set(paths.filter(Boolean))];
    if (!unique.length) return {};
    const { data } = await this.supabase.storage.from("vehicle-photos").createSignedUrls(unique, 3600);
    const out: Record<string, string> = {};
    for (const item of data ?? []) if (item.path && item.signedUrl) out[item.path] = item.signedUrl;
    return out;
  }

  /** Gastos de un vehículo (cuotas, compra y otros enlazados). */
  async listVehicleExpenses(vehicleId: string) {
    const { data, error } = await this.supabase
      .from("expenses")
      .select("id, expense_type, description, amount, expense_date, vehicle_payment, vehicle_month")
      .eq("vehicle_id", vehicleId)
      .order("expense_date", { ascending: false });
    if (error) throw new Error(this.friendlyDbError(error.message));
    return data ?? [];
  }

  /** Cuota del mes (financiado) o compra (comprado) como gasto. */
  async registerVehiclePayment(vehicleId: string, month: string) {
    const { data, error } = await this.supabase.rpc("registrar_pago_vehiculo", {
      p_vehicle: vehicleId,
      p_month: month,
    });
    if (error) throw new Error(this.friendlyDbError(error.message));
    return data;
  }

  private vehicleError(message: string): string {
    if (/vehicles_plate_unique|duplicate key/i.test(message)) return "Ya hay un vehículo con esa matrícula.";
    return this.friendlyDbError(message);
  }

  // =========================================================
  // FOTOS DE PERFIL (bucket privado "avatars")
  // =========================================================

  async uploadAvatar(file: File): Promise<string> {
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${crypto.randomUUID()}.${ext}`;

    const { error } = await this.supabase.storage
      .from("avatars")
      .upload(path, file, { contentType: file.type, upsert: false });

    if (error) {
      throw error;
    }

    return path;
  }

  /** URLs firmadas (1 h) para varias fotos en una sola llamada. */
  async getAvatarUrls(paths: string[]): Promise<Record<string, string>> {
    const unique = [...new Set(paths.filter(Boolean))];

    if (unique.length === 0) {
      return {};
    }

    const { data, error } = await this.supabase.storage
      .from("avatars")
      .createSignedUrls(unique, 3600);

    if (error) {
      return {};
    }

    const result: Record<string, string> = {};

    for (const item of data ?? []) {
      if (item.path && item.signedUrl) {
        result[item.path] = item.signedUrl;
      }
    }

    return result;
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

  /** @deprecated Usa deleteCollaborator(). Eliminación lógica, conserva historial. */
  async deleteEmployee(id: string) {
    return this.deleteCollaborator(id);
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
      throw settlementsError;
    }

    const { data: profiles, error: profilesError } = await this.supabase
      .from("profiles")
      .select("id, full_name");

    if (profilesError) {
      throw profilesError;
    }

    return (settlements ?? []).map((settlement: any) => {
      const employeeId = String(settlement.employee_id ?? "").trim();

      const profile = (profiles ?? []).find(
        (p: { id: string; full_name: string }) =>
          String(p.id).trim() === employeeId,
      );

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
