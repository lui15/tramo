import { Component, EventEmitter, Input, OnChanges, Output } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { AlertController, IonIcon, IonSpinner, ToastController } from "@ionic/angular/standalone";
import { addIcons } from "ionicons";
import {
  cashOutline,
  flashOutline,
  checkmarkCircleOutline,
  receiptOutline,
  walletOutline,
} from "ionicons/icons";

import { PayrollSummary, SupabaseService } from "../services/supabase.service";

// =====================================================================
// Panel de pagos de un colaborador: Adelantar parte del pago / Pagar salario.
// Lo usan el administrador (ficha de Colaboradores) y la secretaría (Equipo).
// Todos los importes los calcula y valida el servidor (Edge Function payroll).
// =====================================================================
@Component({
  selector: "app-payroll-panel",
  standalone: true,
  imports: [CommonModule, FormsModule, IonIcon, IonSpinner],
  template: `
    <div class="pp" *ngIf="summary; else loadingTpl">
      <!-- Pendiente -->
      <section class="pp-hero">
        <span class="pp-label">
          {{ summary.mode === "fijo" ? "Salario pendiente de este mes" : "Pendiente de cobrar" }}
        </span>
        <span class="pp-value">{{ summary.pending | number: "1.2-2" }} €</span>
        <span class="pp-sub" *ngIf="summary.mode === 'fijo'">
          Salario mensual {{ summary.monthly_salary | number: "1.2-2" }} € · pagado este mes
          {{ summary.paid_this_month | number: "1.2-2" }} €
        </span>
        <span class="pp-sub" *ngIf="summary.mode === 'acumulativo'">
          Generado {{ summary.generated | number: "1.2-2" }} € · pagado
          {{ summary.paid | number: "1.2-2" }} €
        </span>
      </section>

      <!-- Acciones -->
      <div class="pp-actions">
        <button type="button" class="pp-btn pp-btn-soft" (click)="advance()" [disabled]="busy || summary.pending <= 0 || summary.employee.deleted">
          <ion-icon name="flash-outline"></ion-icon>
          <span>Adelantar parte</span>
        </button>
        <button type="button" class="pp-btn pp-btn-primary" (click)="paySalary()" [disabled]="busy || summary.pending <= 0 || summary.employee.deleted">
          <ion-icon name="checkmark-circle-outline"></ion-icon>
          <span>Pagar salario</span>
        </button>
      </div>
      <p class="pp-hint" *ngIf="summary.pending <= 0">
        {{ summary.mode === "fijo" ? "El salario de este mes ya está pagado." : "No tiene nada pendiente de cobrar." }}
      </p>

      <!-- Historial de pagos -->
      <section class="pp-history">
        <h3>Pagos realizados</h3>
        <div class="t-list" *ngIf="summary.settlements.length; else emptyTpl">
          <div class="t-row" *ngFor="let s of summary.settlements">
            <div class="t-row-icon" [ngClass]="s.kind === 'adelanto' ? 'tone-orange' : 'tone-green'">
              <ion-icon [name]="s.kind === 'adelanto' ? 'flash-outline' : 'cash-outline'"></ion-icon>
            </div>
            <div class="t-row-main">
              <strong>{{ kindLabel(s.kind) }}</strong>
              <span>{{ formatDate(s.settlement_date) }}<ng-container *ngIf="s.note"> · {{ s.note }}</ng-container></span>
            </div>
            <span class="pp-amount">− {{ s.amount | number: "1.2-2" }} €</span>
          </div>
        </div>
        <ng-template #emptyTpl>
          <div class="t-empty">
            <ion-icon name="receipt-outline"></ion-icon>
            Todavía no se le ha pagado nada.
          </div>
        </ng-template>
      </section>
    </div>

    <ng-template #loadingTpl>
      <div class="pp-loading" *ngIf="!error"><ion-spinner name="crescent"></ion-spinner></div>
      <div class="t-empty" *ngIf="error">{{ error }}</div>
    </ng-template>
  `,
  styles: [
    `
      .pp {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .pp-hero {
        display: flex;
        flex-direction: column;
        gap: 2px;
        padding: 18px;
        background: var(--t-surface);
        border: 1px solid var(--t-border);
        border-radius: var(--t-radius);
        box-shadow: var(--t-shadow);
      }
      .pp-label {
        font-size: 12px;
        font-weight: 600;
        color: var(--t-muted);
      }
      .pp-value {
        font-size: 30px;
        font-weight: 800;
        letter-spacing: -0.6px;
        color: var(--t-text);
      }
      .pp-sub {
        font-size: 12px;
        color: var(--t-muted);
      }
      .pp-actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
      }
      .pp-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        min-height: 48px;
        border-radius: 14px;
        font: inherit;
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
        border: 1px solid transparent;
      }
      .pp-btn ion-icon {
        font-size: 18px;
      }
      .pp-btn:disabled {
        opacity: 0.45;
        cursor: default;
      }
      .pp-btn-soft {
        background: var(--t-warning-soft);
        color: var(--t-warning);
      }
      .pp-btn-primary {
        background: var(--t-primary);
        color: var(--t-on-primary);
      }
      .pp-hint {
        margin: -4px 0 0;
        font-size: 12px;
        color: var(--t-muted);
        text-align: center;
      }
      .pp-history h3 {
        margin: 6px 0 10px;
        font-size: 14px;
        font-weight: 800;
        color: var(--t-text);
      }
      .pp-amount {
        font-weight: 800;
        color: var(--t-text);
        white-space: nowrap;
      }
      .pp-loading {
        display: flex;
        justify-content: center;
        padding: 30px;
      }
    `,
  ],
})
export class PayrollPanelComponent implements OnChanges {
  @Input({ required: true }) employeeId!: string;
  @Input() employeeName = "";
  @Output() changed = new EventEmitter<PayrollSummary>();

  summary: PayrollSummary | null = null;
  busy = false;
  error = "";

  constructor(
    private readonly supabase: SupabaseService,
    private readonly alertCtrl: AlertController,
    private readonly toastCtrl: ToastController,
  ) {
    addIcons({ cashOutline, flashOutline, checkmarkCircleOutline, receiptOutline, walletOutline });
  }

  ngOnChanges() {
    void this.load();
  }

  async load() {
    if (!this.employeeId) return;
    this.error = "";
    this.summary = null;
    try {
      this.summary = await this.supabase.getPayroll(this.employeeId);
    } catch (e: any) {
      this.error = e?.message || "No se pudieron cargar los pagos.";
    }
  }

  kindLabel(kind: string) {
    return kind === "adelanto" ? "Adelanto" : kind === "salario" ? "Salario" : "Pago";
  }

  formatDate(iso: string) {
    const [y, m, d] = String(iso || "").split("-");
    return y ? `${d}/${m}/${y}` : "";
  }

  private name() {
    return this.employeeName || this.summary?.employee.full_name || "el colaborador";
  }

  async advance() {
    if (!this.summary) return;
    const max = this.summary.pending;

    const alert = await this.alertCtrl.create({
      header: "Adelantar parte del pago",
      subHeader: `Máximo ${max.toFixed(2)} €`,
      inputs: [
        { name: "amount", type: "number", placeholder: "Importe en €", min: 0, max, attributes: { inputmode: "decimal", step: "0.01" } },
        { name: "note", type: "text", placeholder: "Nota (opcional)" },
      ],
      buttons: [
        { text: "Cancelar", role: "cancel" },
        {
          text: "Adelantar",
          handler: (v) => {
            const amount = Math.round(Number(String(v.amount).replace(",", ".")) * 100) / 100;
            if (!Number.isFinite(amount) || amount <= 0 || amount > max) {
              void this.toast(`Introduce un importe entre 0,01 y ${max.toFixed(2)} €.`, "warning");
              return false;
            }
            void this.run("adelanto", amount, v.note);
            return true;
          },
        },
      ],
    });
    await alert.present();
  }

  async paySalary() {
    if (!this.summary) return;
    const amount = this.summary.pending;

    const alert = await this.alertCtrl.create({
      header: "Pagar salario",
      message: `Se pagarán ${amount.toFixed(2)} € a ${this.name()} y quedará saldado.`,
      buttons: [
        { text: "Cancelar", role: "cancel" },
        { text: "Pagar", handler: () => void this.run("salario") },
      ],
    });
    await alert.present();
  }

  private async run(kind: "adelanto" | "salario", amount?: number, note?: string) {
    this.busy = true;
    try {
      this.summary = await this.supabase.payEmployee(this.employeeId, kind, amount, note);
      this.changed.emit(this.summary);
      await this.toast(kind === "adelanto" ? "Adelanto registrado. Se le ha notificado." : "Salario pagado. Se le ha notificado.", "success");
    } catch (e: any) {
      await this.toast(e?.message || "No se pudo registrar el pago.", "danger");
    } finally {
      this.busy = false;
    }
  }

  private async toast(message: string, color: string) {
    const t = await this.toastCtrl.create({ message, color, duration: 2600, position: "top" });
    await t.present();
  }
}
