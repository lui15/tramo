import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { IonIcon, IonSpinner, ToastController } from "@ionic/angular/standalone";
import { addIcons } from "ionicons";
import {
  timeOutline,
  sunnyOutline,
  checkmarkOutline,
  addOutline,
  sendOutline,
  alertCircleOutline,
  briefcaseOutline,
  informationCircleOutline,
} from "ionicons/icons";

import { SupabaseService, TeamMember, ROLE_LABELS, Role } from "../services/supabase.service";

interface Row {
  employee_id: string;
  full_name: string;
  role: Role;
  full: boolean;
  hours: number | null;
  locked: boolean; // el propio encargado: siempre participa
}

// =====================================================================
// PASO A · "Trabajo terminado"
// Lo rellena el encargado del trabajo (o la secretaría / el admin).
// No calcula dinero: solo duración y quién participó. El trabajo queda
// "En revisión" hasta que la secretaría lo apruebe.
// =====================================================================
@Component({
  selector: "app-job-close-form",
  standalone: true,
  imports: [CommonModule, FormsModule, IonIcon, IonSpinner],
  template: `
    <div class="jf" *ngIf="ready; else loadingTpl">
      <div class="jf-job">
        <div class="jf-job-icon"><ion-icon name="briefcase-outline"></ion-icon></div>
        <div>
          <strong>{{ title }}</strong>
          <span>{{ subtitle }}</span>
        </div>
      </div>

      <div class="jf-banner warn" *ngIf="job?.return_reason">
        <ion-icon name="alert-circle-outline"></ion-icon>
        <div><strong>Te lo han devuelto:</strong> {{ job.return_reason }}</div>
      </div>

      <!-- Unidad -->
      <div class="jf-block">
        <div class="jf-label">¿Cómo se cuenta el trabajo?</div>
        <div class="jf-seg">
          <button type="button" [class.on]="unit === 'horas'" (click)="setUnit('horas')">
            <ion-icon name="time-outline"></ion-icon> Por horas
          </button>
          <button type="button" [class.on]="unit === 'dias'" (click)="setUnit('dias')">
            <ion-icon name="sunny-outline"></ion-icon> Por días
          </button>
        </div>
      </div>

      <!-- Duración -->
      <div class="jf-block">
        <div class="jf-label">¿Cuánto duró?</div>
        <div class="jf-stepper">
          <button type="button" (click)="step(-1)" aria-label="Menos">−</button>
          <div>
            <input type="number" inputmode="decimal" min="0" [step]="unit === 'horas' ? 0.5 : 0.5"
                   [(ngModel)]="value" (ngModelChange)="clampRows()" />
            <small>{{ unit === "horas" ? "horas" : "días" }}</small>
          </div>
          <button type="button" (click)="step(1)" aria-label="Más">+</button>
        </div>
      </div>

      <!-- Precio cobrado -->
      <div class="jf-block">
        <div class="jf-label">¿Cuánto se cobró al cliente?</div>
        <p class="jf-hint" *ngIf="agreedText">Precio acordado: <strong>{{ agreedText }}</strong></p>
        <div class="jf-money" [class.missing]="priceMissing">
          <input type="number" inputmode="decimal" min="0" step="0.01" [(ngModel)]="price"
                 (ngModelChange)="priceTouched = true" placeholder="0,00" />
          <span>€</span>
        </div>
        <button type="button" class="jf-link" *ngIf="suggestedPrice !== null && suggestedPrice !== price"
                (click)="price = suggestedPrice; priceTouched = true">
          Usar {{ suggestedPrice | number: "1.2-2" }} € (precio acordado × {{ unit === "horas" ? "horas" : "días" }})
        </button>
      </div>

      <!-- Acompañantes -->
      <div class="jf-block">
        <div class="jf-label">{{ staffMode ? "¿Quién participó?" : "¿Quién te acompañó?" }}</div>
        <div class="jf-chips" *ngIf="candidates.length; else noTeam">
          <button type="button" class="jf-chip" *ngFor="let m of candidates"
                  [class.on]="isSelected(m.id)" (click)="toggle(m)">
            <span class="jf-avatar">
              <ion-icon *ngIf="isSelected(m.id)" name="checkmark-outline"></ion-icon>
              <ng-container *ngIf="!isSelected(m.id)">{{ initials(m.full_name) }}</ng-container>
            </span>
            {{ m.full_name }}
          </button>
        </div>
        <ng-template #noTeam><p class="jf-hint">No hay más compañeros activos.</p></ng-template>
      </div>

      <!-- Horas de cada uno -->
      <div class="jf-block" *ngIf="rows.length">
        <div class="jf-label">{{ unit === "horas" ? "Horas" : "Días" }} de cada uno</div>
        <div class="jf-people">
          <div class="jf-person" *ngFor="let r of rows">
            <div class="jf-person-head">
              <span class="jf-avatar">{{ initials(r.full_name) }}</span>
              <div class="jf-person-name">
                <strong>{{ r.full_name }}<ng-container *ngIf="r.locked"> (tú)</ng-container></strong>
                <span>{{ roleLabel(r.role) }}</span>
              </div>
              <span class="jf-person-amount">
                {{ r.full ? (value || 0) : (r.hours || 0) }}
                <small>{{ unit === "horas" ? "horas" : "días" }}</small>
              </span>
            </div>
            <div class="jf-person-controls">
              <label class="jf-toggle">
                <input type="checkbox" [(ngModel)]="r.full" (ngModelChange)="onFull(r)" />
                Completo
              </label>
              <span class="jf-mini" *ngIf="!r.full" [class.missing]="!rowValid(r)">
                <input type="number" inputmode="decimal" min="0" [max]="value" step="0.5" [(ngModel)]="r.hours" />
                {{ unit === "horas" ? "h" : "días" }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Fin -->
      <div class="jf-block">
        <div class="jf-label">¿Cuándo terminó?</div>
        <div class="jf-grid2">
          <label class="jf-input">
            <span>Fecha</span>
            <input type="date" [(ngModel)]="date" />
          </label>
          <label class="jf-input">
            <span>Hora</span>
            <input type="time" [(ngModel)]="time" />
          </label>
        </div>
      </div>

      <label class="jf-input">
        <span>Nota para la secretaría (opcional)</span>
        <textarea maxlength="500" [(ngModel)]="note" placeholder="Ej.: el cliente pidió desmontar un armario más"></textarea>
      </label>

      <div class="jf-banner info">
        <ion-icon name="information-circle-outline"></ion-icon>
        <div>El trabajo quedará <strong>En revisión</strong>. La secretaría comprobará los datos y lo aprobará.</div>
      </div>

      <div class="jf-actions">
        <button type="button" class="jf-btn primary" (click)="submit()" [disabled]="busy || !!problem">
          <ion-spinner *ngIf="busy" name="crescent"></ion-spinner>
          <ion-icon *ngIf="!busy" name="send-outline"></ion-icon>
          Enviar a revisión
        </button>
        <p class="jf-hint" *ngIf="problem">{{ problem }}</p>
        <button type="button" class="jf-btn ghost" (click)="cancel.emit()" [disabled]="busy">Cancelar</button>
      </div>
    </div>

    <ng-template #loadingTpl>
      <div class="jf-loading"><ion-spinner name="crescent"></ion-spinner></div>
    </ng-template>
  `,
})
export class JobCloseFormComponent implements OnInit {
  /** Trabajo (fila de jobs o de employee_available_jobs). */
  @Input({ required: true }) job: any;
  /** true cuando cierra la secretaría o el admin (no se añade a sí mismo). */
  @Input() staffMode = false;
  @Output() saved = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  ready = false;
  busy = false;
  meId = "";
  team: TeamMember[] = [];
  rows: Row[] = [];

  unit: "horas" | "dias" = "horas";
  value: number | null = null;
  date = "";
  time = "";
  note = "";
  price: number | null = null;
  priceTouched = false;

  constructor(
    private readonly supabase: SupabaseService,
    private readonly toastCtrl: ToastController,
  ) {
    addIcons({
      timeOutline,
      sunnyOutline,
      checkmarkOutline,
      addOutline,
      sendOutline,
      alertCircleOutline,
      briefcaseOutline,
      informationCircleOutline,
    });
  }

  get jobId(): string {
    return this.job?.id ?? this.job?.job_id;
  }

  get title() {
    const t = String(this.job?.job_type || "Trabajo");
    return `${t.charAt(0).toUpperCase()}${t.slice(1)} · ${this.job?.client_name || ""}`;
  }

  get subtitle() {
    const [y, m, d] = String(this.job?.job_date || "").split("-");
    const date = y ? `${d}/${m}/${y}` : "";
    return [date, String(this.job?.start_time || "").slice(0, 5)].filter(Boolean).join(" · ");
  }

  /** Compañeros que se pueden elegir (sin el propio encargado). */
  get candidates(): TeamMember[] {
    return this.team.filter(
      (m) =>
        m.account_status === "activo" &&
        (m.role === "encargado" || m.role === "ayudante") &&
        m.id !== (this.staffMode ? "" : this.meId),
    );
  }

  async ngOnInit() {
    const now = new Date();
    this.date = this.toDate(now);
    this.time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    this.unit = this.job?.duration_unit === "dias" ? "dias" : "horas";
    this.value = this.job?.duration_value ? Number(this.job.duration_value) : null;
    if (this.job?.price_type === "dia") this.unit = this.job?.duration_unit === "horas" ? "horas" : "dias";
    // Precio: lo que ya se puso (si se devolvió), o el fijo acordado
    if (this.job?.closed_price != null) this.price = Number(this.job.closed_price);
    else if (this.job?.price_type === "fijo" && this.job?.price_amount != null) this.price = Number(this.job.price_amount);

    try {
      const [user, team] = await Promise.all([this.supabase.getCurrentUser(), this.supabase.listTeam()]);
      this.meId = user?.id ?? "";
      this.team = team;

      if (!this.staffMode && this.meId) {
        const me = team.find((m) => m.id === this.meId);
        this.rows.push({
          employee_id: this.meId,
          full_name: me?.full_name ?? "Tú",
          role: (me?.role ?? "encargado") as Role,
          full: true,
          hours: null,
          locked: true,
        });
      }

      // Si se devolvió o ya tenía datos, recupera lo que se había puesto
      const previous = await this.supabase.getJobParticipantsBasic(this.jobId).catch(() => []);
      for (const p of previous) {
        const existing = this.rows.find((r) => r.employee_id === p.employee_id);
        const full = p.full_time !== false && (!this.value || Number(p.hours_or_days) === this.value);
        if (existing) {
          existing.full = full;
          existing.hours = full ? null : Number(p.hours_or_days);
        } else {
          this.rows.push({
            employee_id: p.employee_id,
            full_name: p.full_name,
            role: p.role,
            full,
            hours: full ? null : Number(p.hours_or_days),
            locked: false,
          });
        }
      }
    } catch (e: any) {
      await this.toast(e?.message || "No se pudo cargar el equipo.", "danger");
    } finally {
      this.ready = true;
    }
  }

  setUnit(u: "horas" | "dias") {
    this.unit = u;
  }

  step(delta: number) {
    const inc = this.unit === "horas" ? 0.5 : 0.5;
    const next = Math.max(0, Math.round(((Number(this.value) || 0) + delta * inc) * 100) / 100);
    this.value = next || null;
    this.clampRows();
  }

  clampRows() {
    for (const r of this.rows) {
      if (!r.full && r.hours != null && this.value && r.hours > this.value) r.hours = this.value;
    }
  }

  isSelected(id: string) {
    return this.rows.some((r) => r.employee_id === id);
  }

  toggle(m: TeamMember) {
    const i = this.rows.findIndex((r) => r.employee_id === m.id);
    if (i >= 0) {
      if (!this.rows[i].locked) this.rows.splice(i, 1);
      return;
    }
    this.rows.push({ employee_id: m.id, full_name: m.full_name, role: m.role, full: true, hours: null, locked: false });
  }

  onFull(r: Row) {
    if (!r.full && (r.hours == null || r.hours <= 0)) {
      r.hours = this.value ? Math.max(0.5, Math.round((this.value / 2) * 2) / 2) : null;
    }
  }

  rowValid(r: Row) {
    if (r.full) return true;
    const h = Number(r.hours);
    return Number.isFinite(h) && h > 0 && !!this.value && h <= this.value;
  }

  /** Texto del precio acordado al crear el trabajo. */
  get agreedText(): string {
    const a = this.job?.price_amount;
    if (a == null || !this.job?.price_type) return "";
    const eur = `${Number(a).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
    if (this.job.price_type === "hora") return `${eur} por hora`;
    if (this.job.price_type === "dia") return `${eur} por día`;
    return `${eur} (precio fijo)`;
  }

  /** Precio sugerido: fijo, o precio por hora/día × duración. */
  get suggestedPrice(): number | null {
    const a = this.job?.price_amount;
    const t = this.job?.price_type;
    if (a == null || !t) return null;
    if (t === "fijo") return Number(a);
    const v = Number(this.value);
    if (!Number.isFinite(v) || v <= 0) return null;
    if ((t === "hora" && this.unit !== "horas") || (t === "dia" && this.unit !== "dias")) return null;
    return Math.round(Number(a) * v * 100) / 100;
  }

  get priceMissing(): boolean {
    const p = Number(this.price);
    return this.price === null || (this.price as any) === "" || !Number.isFinite(p) || p < 0;
  }

  get problem(): string {
    const v = Number(this.value);
    if (!Number.isFinite(v) || v <= 0) return `Indica cuántas ${this.unit === "horas" ? "horas" : "días"} duró el trabajo.`;
    if (this.priceMissing) return "Indica cuánto se cobró al cliente.";
    if (!this.rows.length) return "Elige al menos a una persona.";
    if (this.rows.some((r) => !this.rowValid(r))) return `Las ${this.unit === "horas" ? "horas" : "días"} de cada persona deben ser mayores que 0 y no superar ${v}.`;
    if (!this.date) return "Indica la fecha de fin.";
    if (!this.time) return "Indica la hora de fin.";
    return "";
  }

  async submit() {
    if (this.problem || this.busy) return;
    this.busy = true;
    try {
      await this.supabase.closeJob(this.jobId, {
        unit: this.unit,
        value: Number(this.value),
        participants: this.rows.map((r) => ({
          employee_id: r.employee_id,
          full: r.full,
          hours_or_days: r.full ? null : Number(r.hours),
        })),
        completion_date: this.date,
        completion_time: this.time,
        note: this.note.trim() || null,
        price: Math.round(Number(this.price) * 100) / 100,
      });
      await this.toast("Enviado a revisión. La secretaría ya tiene el aviso.", "success");
      this.saved.emit();
    } catch (e: any) {
      await this.toast(e?.message || "No se pudo cerrar el trabajo.", "danger");
    } finally {
      this.busy = false;
    }
  }

  roleLabel(role: Role) {
    return ROLE_LABELS[role] ?? role;
  }

  initials(name: string) {
    return String(name || "?")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("");
  }

  private toDate(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  private async toast(message: string, color: string) {
    const t = await this.toastCtrl.create({ message, color, duration: 2800, position: "top" });
    await t.present();
  }
}
