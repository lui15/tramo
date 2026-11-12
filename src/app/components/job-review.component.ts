import { Component, EventEmitter, Input, OnChanges, Output } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { AlertController, IonIcon, IonSpinner, ToastController } from "@ionic/angular/standalone";
import { addIcons } from "ionicons";
import {
  checkmarkCircleOutline,
  arrowUndoOutline,
  closeOutline,
  alertCircleOutline,
  chatbubbleEllipsesOutline,
  briefcaseOutline,
  copyOutline,
  shieldCheckmarkOutline,
  cashOutline,
} from "ionicons/icons";

import {
  JobReview,
  ReviewPerson,
  ROLE_LABELS,
  Role,
  SupabaseService,
} from "../services/supabase.service";
import { JobPhotosComponent } from "./job-photos.component";

interface ReviewRow extends ReviewPerson {
  hours: number | null;
  day_rate: number | null;
  amount_saved: number | null;
}

// =====================================================================
// PASO B · Revisión y aprobación (secretaría y administrador)
// La vista previa calcula importes para orientar, pero el servidor
// (aprobar_trabajo) los vuelve a calcular y es el que manda.
// =====================================================================
@Component({
  selector: "app-job-review",
  standalone: true,
  imports: [CommonModule, FormsModule, IonIcon, IonSpinner, JobPhotosComponent],
  template: `
    <div class="jf" *ngIf="data; else loadingTpl">
      <div class="jf-job">
        <div class="jf-job-icon"><ion-icon name="briefcase-outline"></ion-icon></div>
        <div>
          <strong>{{ title }}</strong>
          <span>
            {{ durationText }}
            <ng-container *ngIf="job.closed_by_name"> · cerrado por {{ job.closed_by_name }}</ng-container>
          </span>
        </div>
      </div>

      <div class="jf-banner info" *ngIf="job.close_note">
        <ion-icon name="chatbubble-ellipses-outline"></ion-icon>
        <div><strong>Nota del encargado:</strong> {{ job.close_note }}</div>
      </div>

      <div class="jf-banner ok" *ngIf="readOnly && job.status === 'finalizado'">
        <ion-icon name="shield-checkmark-outline"></ion-icon>
        <div>
          Aprobado<ng-container *ngIf="job.reviewed_by_name"> por {{ job.reviewed_by_name }}</ng-container>
          <ng-container *ngIf="job.reviewed_at"> el {{ formatDateTime(job.reviewed_at) }}</ng-container>.
        </div>
      </div>

      <!-- Participantes -->
      <div class="jf-block">
        <div class="jf-label">
          Participantes ({{ rows.length }})
          <button type="button" *ngIf="!readOnly && needsRate.length > 1" (click)="applySameRate()">
            <ion-icon name="copy-outline"></ion-icon> Aplicar el mismo precio a todos
          </button>
        </div>

        <div class="jf-people">
          <div class="jf-person" *ngFor="let r of rows; let i = index">
            <div class="jf-person-head">
              <span class="jf-avatar">{{ initials(r.full_name) }}</span>
              <div class="jf-person-name">
                <strong>{{ r.full_name }}</strong>
                <span>{{ roleLabel(r.role) }} · {{ salaryText(r) }}</span>
              </div>
              <span class="jf-person-amount">
                <ng-container *ngIf="r.is_fixed">Fijo</ng-container>
                <ng-container *ngIf="!r.is_fixed">
                  {{ amountOf(r) === null ? "—" : (amountOf(r) | number: "1.2-2") + " €" }}
                </ng-container>
                <small>{{ r.hours || 0 }} {{ unitShort }}</small>
              </span>
              <button type="button" class="jf-x" *ngIf="!readOnly" (click)="removeRow(i)" aria-label="Quitar">
                <ion-icon name="close-outline"></ion-icon>
              </button>
            </div>

            <div class="jf-person-controls" *ngIf="!readOnly">
              <span class="jf-mini" [class.missing]="!hoursValid(r)">
                <input type="number" inputmode="decimal" min="0" [max]="duration" step="0.5" [(ngModel)]="r.hours" />
                {{ unitShort }}
              </span>

              <span class="jf-tag fixed" *ngIf="r.is_fixed">Salario fijo · 0 €</span>
              <span class="jf-tag auto" *ngIf="!r.is_fixed && r.auto_rate !== null">
                {{ r.auto_rate | number: "1.2-2" }} €/hora · automático
              </span>
              <span class="jf-mini" *ngIf="needsManualRate(r)" [class.missing]="!rateValid(r)">
                <input type="number" inputmode="decimal" min="0" step="1" [(ngModel)]="r.day_rate"
                       [placeholder]="isDays ? 'Precio/día' : 'Precio/hora'" />
                € / {{ isDays ? "día" : "hora" }}
              </span>
            </div>

            <div class="jf-person-controls" *ngIf="readOnly && !r.is_fixed && r.day_rate">
              <span class="jf-tag manual">{{ r.day_rate | number: "1.2-2" }} € / {{ isDays ? "día" : "hora" }}</span>
            </div>
          </div>
        </div>

        <div class="jf-add" *ngIf="!readOnly && addable.length">
          <select [(ngModel)]="toAdd">
            <option value="">Añadir participante…</option>
            <option *ngFor="let p of addable" [value]="p.employee_id">
              {{ p.full_name }} · {{ roleLabel(p.role) }}
            </option>
          </select>
          <button type="button" (click)="addRow()" [disabled]="!toAdd">Añadir</button>
        </div>
      </div>

      <!-- Precio -->
      <div class="jf-banner info" *ngIf="job.price_amount != null || job.closed_price != null">
        <ion-icon name="cash-outline"></ion-icon>
        <div>
          <ng-container *ngIf="job.price_amount != null">Precio acordado: <strong>{{ job.price_amount | number: "1.2-2" }} €{{ job.price_type === "hora" ? " por hora" : job.price_type === "dia" ? " por día" : "" }}</strong><br /></ng-container>
          <ng-container *ngIf="job.closed_price != null">El encargado indica que se cobró: <strong>{{ job.closed_price | number: "1.2-2" }} €</strong></ng-container>
        </div>
      </div>

      <app-job-photos [jobId]="jobId" [canUpload]="true"></app-job-photos>

      <!-- Cobro al cliente -->
      <label class="jf-input big" *ngIf="!readOnly" [class.missing]="!costValid">
        <span>Cobrado al cliente (€)</span>
        <input type="number" inputmode="decimal" min="0" step="0.01" [(ngModel)]="totalCost" placeholder="0,00" />
      </label>

      <!-- Resumen -->
      <div class="jf-summary">
        <h4>Resumen</h4>
        <div class="jf-summary-row" *ngFor="let r of rows">
          <span>
            {{ r.full_name }} · {{ r.hours || 0 }} {{ unitShort }}
            <ng-container *ngIf="!r.is_fixed && rateOf(r) !== null"> × {{ rateOf(r) | number: "1.2-2" }} €</ng-container>
          </span>
          <strong>
            {{ r.is_fixed ? "Fijo" : amountOf(r) === null ? "Falta precio" : (amountOf(r) | number: "1.2-2") + " €" }}
          </strong>
        </div>
        <div class="jf-summary-total">
          <span>Total a pagar</span>
          <strong>{{ totalToPay | number: "1.2-2" }} €</strong>
        </div>
        <div class="jf-summary-row muted" *ngIf="costValid">
          <span>Cobrado al cliente</span><strong>{{ (readOnly ? job.total_cost : totalCost) | number: "1.2-2" }} €</strong>
        </div>
        <div class="jf-summary-row muted" *ngIf="costValid">
          <span>Margen</span><strong>{{ margin | number: "1.2-2" }} €</strong>
        </div>
      </div>

      <div class="jf-actions" *ngIf="!readOnly">
        <button type="button" class="jf-btn success" (click)="approve()" [disabled]="busy || !!problem">
          <ion-spinner *ngIf="busy" name="crescent"></ion-spinner>
          <ion-icon *ngIf="!busy" name="checkmark-circle-outline"></ion-icon>
          Aprobar y pagar
        </button>
        <p class="jf-hint" *ngIf="problem">{{ problem }}</p>
        <button type="button" class="jf-btn danger-ghost" (click)="giveBack()" [disabled]="busy">
          <ion-icon name="arrow-undo-outline"></ion-icon>
          Devolver al encargado
        </button>
      </div>
    </div>

    <ng-template #loadingTpl>
      <div class="jf-loading" *ngIf="!error"><ion-spinner name="crescent"></ion-spinner></div>
      <div class="jf-banner danger" *ngIf="error">
        <ion-icon name="alert-circle-outline"></ion-icon><div>{{ error }}</div>
      </div>
    </ng-template>
  `,
})
export class JobReviewComponent implements OnChanges {
  @Input({ required: true }) jobId!: string;
  @Output() done = new EventEmitter<"approved" | "returned">();

  data: JobReview | null = null;
  rows: ReviewRow[] = [];
  totalCost: number | null = null;
  toAdd = "";
  busy = false;
  error = "";

  constructor(
    private readonly supabase: SupabaseService,
    private readonly alertCtrl: AlertController,
    private readonly toastCtrl: ToastController,
  ) {
    addIcons({
      checkmarkCircleOutline,
      arrowUndoOutline,
      closeOutline,
      alertCircleOutline,
      chatbubbleEllipsesOutline,
      briefcaseOutline,
      copyOutline,
      shieldCheckmarkOutline,
      cashOutline,
    });
  }

  ngOnChanges() {
    void this.load();
  }

  async load() {
    if (!this.jobId) return;
    this.data = null;
    this.error = "";
    try {
      const data = await this.supabase.getJobReview(this.jobId);
      this.rows = data.participants.map((p) => ({
        ...p,
        auto_rate: p.auto_rate === null ? null : Number(p.auto_rate),
        hours: Number(p.hours_or_days),
        day_rate: p.day_rate === null ? null : Number(p.day_rate),
        amount_saved: p.amount_earned === null ? null : Number(p.amount_earned),
      }));
      // Por defecto, lo que dijo el encargado que se cobró al cerrar
      const cost = data.job.total_cost ?? data.job.closed_price;
      this.totalCost = cost === null || cost === undefined ? null : Number(cost);
      this.data = data;
    } catch (e: any) {
      this.error = e?.message || "No se pudo cargar la revisión.";
    }
  }

  get job() {
    return this.data?.job ?? {};
  }

  get readOnly() {
    return this.job.status !== "pendiente_revision";
  }

  get isDays() {
    return this.job.duration_unit === "dias";
  }

  get duration(): number {
    return Number(this.job.duration_value) || 0;
  }

  get unitShort() {
    return this.isDays ? "días" : "h";
  }

  get title() {
    const t = String(this.job.job_type || "Trabajo");
    return `${t.charAt(0).toUpperCase()}${t.slice(1)} · ${this.job.client_name || ""}`;
  }

  get durationText() {
    const v = this.duration;
    const unit = this.isDays ? (v === 1 ? "día" : "días") : v === 1 ? "hora" : "horas";
    return `${v} ${unit}`;
  }

  get addable(): ReviewPerson[] {
    const taken = new Set(this.rows.map((r) => r.employee_id));
    return (this.data?.team ?? []).filter((p) => !taken.has(p.employee_id));
  }

  get needsRate(): ReviewRow[] {
    return this.rows.filter((r) => this.needsManualRate(r));
  }

  needsManualRate(r: ReviewRow) {
    return !r.is_fixed && r.auto_rate === null;
  }

  rateOf(r: ReviewRow): number | null {
    if (r.is_fixed) return null;
    if (r.auto_rate !== null) return r.auto_rate;
    return this.rateValid(r) ? Number(r.day_rate) : null;
  }

  amountOf(r: ReviewRow): number | null {
    if (this.readOnly) return r.amount_saved;
    if (r.is_fixed) return 0;
    const rate = this.rateOf(r);
    if (rate === null || !this.hoursValid(r)) return null;
    return Math.round(Number(r.hours) * rate * 100) / 100;
  }

  get totalToPay(): number {
    return this.rows.reduce((t, r) => t + (this.amountOf(r) ?? 0), 0);
  }

  get costValid() {
    const c = this.readOnly ? this.job.total_cost : this.totalCost;
    return c !== null && c !== undefined && c !== ("" as any) && Number(c) >= 0;
  }

  get margin() {
    return Number(this.readOnly ? this.job.total_cost : this.totalCost) - this.totalToPay;
  }

  hoursValid(r: ReviewRow) {
    const h = Number(r.hours);
    return Number.isFinite(h) && h > 0 && h <= this.duration;
  }

  rateValid(r: ReviewRow) {
    const v = Number(r.day_rate);
    return r.day_rate !== null && (r.day_rate as any) !== "" && Number.isFinite(v) && v > 0;
  }

  get problem(): string {
    if (!this.rows.length) return "Añade al menos un participante.";
    const badHours = this.rows.find((r) => !this.hoursValid(r));
    if (badHours) return `Revisa las ${this.isDays ? "días" : "horas"} de ${badHours.full_name} (máximo ${this.duration}).`;
    const noRate = this.rows.find((r) => this.needsManualRate(r) && !this.rateValid(r));
    if (noRate) return `Falta el precio por ${this.isDays ? "día" : "hora"} de ${noRate.full_name}.`;
    if (!this.costValid) return "Indica cuánto se cobró al cliente.";
    return "";
  }

  addRow() {
    const p = (this.data?.team ?? []).find((t) => t.employee_id === this.toAdd);
    if (!p) return;
    this.rows.push({
      ...p,
      auto_rate: p.auto_rate === null ? null : Number(p.auto_rate),
      hours: this.duration,
      day_rate: null,
      amount_saved: null,
    });
    this.toAdd = "";
  }

  removeRow(i: number) {
    this.rows.splice(i, 1);
  }

  async applySameRate() {
    const first = this.needsRate.find((r) => this.rateValid(r));
    const alert = await this.alertCtrl.create({
      header: `Precio por ${this.isDays ? "día" : "hora"}`,
      message: `Se aplicará a las ${this.needsRate.length} personas que no tienen salario fijo ni tarifa automática.`,
      inputs: [
        {
          name: "rate",
          type: "number",
          placeholder: "€",
          value: first ? first.day_rate : "",
          attributes: { inputmode: "decimal", step: "0.01", min: 0 },
        },
      ],
      buttons: [
        { text: "Cancelar", role: "cancel" },
        {
          text: "Aplicar",
          handler: (v) => {
            const rate = Math.round(Number(String(v.rate).replace(",", ".")) * 100) / 100;
            if (!Number.isFinite(rate) || rate <= 0) {
              void this.toast("Escribe un precio mayor que 0.", "warning");
              return false;
            }
            for (const r of this.needsRate) r.day_rate = rate;
            return true;
          },
        },
      ],
    });
    await alert.present();
  }

  async approve() {
    if (this.problem || this.busy) return;
    const alert = await this.alertCtrl.create({
      header: "Aprobar trabajo",
      message: `Se pagarán ${this.totalToPay.toFixed(2)} € entre ${this.rows.length} persona(s) y el trabajo quedará finalizado. No se puede deshacer.`,
      buttons: [
        { text: "Cancelar", role: "cancel" },
        { text: "Aprobar", handler: () => void this.doApprove() },
      ],
    });
    await alert.present();
  }

  private async doApprove() {
    this.busy = true;
    try {
      const res = await this.supabase.approveJob(
        this.jobId,
        this.rows.map((r) => ({
          employee_id: r.employee_id,
          hours_or_days: Number(r.hours),
          day_rate: this.needsManualRate(r) ? Number(r.day_rate) : null,
        })),
        Number(this.totalCost),
      );
      await this.toast(
        `Trabajo aprobado. Pagado: ${Number(res?.total_pagado ?? 0).toFixed(2)} €. Ya se ha avisado a todos.`,
        "success",
      );
      this.done.emit("approved");
    } catch (e: any) {
      await this.toast(e?.message || "No se pudo aprobar.", "danger");
    } finally {
      this.busy = false;
    }
  }

  async giveBack() {
    const alert = await this.alertCtrl.create({
      header: "Devolver al encargado",
      message: "Explica qué tiene que corregir. Recibirá un aviso.",
      inputs: [{ name: "reason", type: "textarea", placeholder: "Motivo" }],
      buttons: [
        { text: "Cancelar", role: "cancel" },
        {
          text: "Devolver",
          role: "destructive",
          handler: (v) => {
            const reason = String(v.reason || "").trim();
            if (!reason) {
              void this.toast("Escribe el motivo.", "warning");
              return false;
            }
            void this.doReturn(reason);
            return true;
          },
        },
      ],
    });
    await alert.present();
  }

  private async doReturn(reason: string) {
    this.busy = true;
    try {
      await this.supabase.returnJob(this.jobId, reason);
      await this.toast("Devuelto al encargado.", "success");
      this.done.emit("returned");
    } catch (e: any) {
      await this.toast(e?.message || "No se pudo devolver.", "danger");
    } finally {
      this.busy = false;
    }
  }

  salaryText(r: ReviewPerson) {
    if (r.is_fixed) return "salario fijo";
    if (r.salary_type === "hora") return `${Number(r.salary_rate || 0).toFixed(2)} €/hora`;
    if (r.salary_type === "dia") return `${Number(r.salary_rate || 0).toFixed(2)} €/día`;
    return "sin tarifa";
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

  formatDateTime(iso: string) {
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
      ? iso
      : d.toLocaleString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  private async toast(message: string, color: string) {
    const t = await this.toastCtrl.create({ message, color, duration: 3000, position: "top" });
    await t.present();
  }
}
