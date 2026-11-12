import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import {
  AlertController,
  IonContent,
  IonIcon,
  IonModal,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
  ToastController,
} from "@ionic/angular/standalone";
import { addIcons } from "ionicons";
import {
  addOutline,
  carOutline,
  cameraOutline,
  closeOutline,
  personOutline,
  speedometerOutline,
  cashOutline,
  receiptOutline,
  trashOutline,
  alertCircleOutline,
  checkmarkCircleOutline,
} from "ionicons/icons";

import { PageHeaderComponent } from "../../../components/page-header.component";
import { RoleTabbarComponent } from "../../../components/role-tabbar.component";
import {
  SupabaseService,
  TeamMember,
  Vehicle,
  VEHICLE_TYPE_LABELS,
  VehicleType,
} from "../../../services/supabase.service";

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto",
  "septiembre", "octubre", "noviembre", "diciembre"];

function emptyVehicle(): Partial<Vehicle> {
  return {
    plate: "",
    brand: "",
    model: "",
    vehicle_type: "furgoneta",
    kilometers: null,
    photo_path: null,
    driver_id: null,
    ownership: "financiado",
    monthly_payment: null,
    finance_start: null,
    finance_end: null,
    purchase_price: null,
    purchase_date: null,
    notes: "",
  };
}

// =====================================================================
// VEHÍCULOS (admin y secretaría)
// Ficha con matrícula, marca, foto, kilometraje y conductor asignado.
// Pago: financiado (cuota mensual) o comprado (precio de compra); los
// pagos se registran como gastos 'pago_vehiculo' enlazados al vehículo.
// =====================================================================
@Component({
  selector: "app-vehiculos",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonIcon,
    IonModal,
    IonRefresher,
    IonRefresherContent,
    IonSpinner,
    PageHeaderComponent,
    RoleTabbarComponent,
  ],
  template: `
    <app-page-header title="Vehículos" subtitle="Flota">
      <button type="button" class="v-add-btn" (click)="openNew()" aria-label="Añadir vehículo">
        <ion-icon name="add-outline"></ion-icon>
      </button>
    </app-page-header>

    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="refresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <div class="t-page">
        <div class="v-error" *ngIf="error">
          <ion-icon name="alert-circle-outline"></ion-icon><span>{{ error }}</span>
        </div>

        <section class="v-summary" *ngIf="vehicles.length">
          <div><span>Vehículos</span><strong>{{ vehicles.length }}</strong></div>
          <div><span>Cuotas al mes</span><strong>{{ eur(monthlyTotal) }}</strong></div>
        </section>

        <div class="t-skeleton" *ngIf="loading && !vehicles.length" style="height: 140px"></div>

        <div class="v-list" *ngIf="!loading || vehicles.length">
          <button type="button" class="v-card" *ngFor="let v of vehicles" (click)="openEdit(v)">
            <div class="v-photo">
              <img *ngIf="v.photo_path && photoUrls[v.photo_path]" [src]="photoUrls[v.photo_path]" alt="" />
              <ion-icon *ngIf="!v.photo_path || !photoUrls[v.photo_path]" name="car-outline"></ion-icon>
            </div>
            <div class="v-info">
              <span class="v-plate">{{ v.plate }}</span>
              <strong>{{ v.brand }} {{ v.model }}</strong>
              <span class="v-meta">
                <ion-icon name="person-outline"></ion-icon> {{ driverName(v.driver_id) }}
              </span>
              <span class="v-meta">
                <ion-icon name="speedometer-outline"></ion-icon>
                {{ v.kilometers != null ? (v.kilometers | number: "1.0-0") + " km" : "Sin kilometraje" }}
              </span>
            </div>
            <div class="v-pay" [attr.data-o]="v.ownership">
              <span>{{ v.ownership === "financiado" ? "Financiado" : "Comprado" }}</span>
              <strong>{{ eur(v.ownership === "financiado" ? v.monthly_payment : v.purchase_price) }}</strong>
              <small>{{ v.ownership === "financiado" ? "al mes" : "compra" }}</small>
            </div>
          </button>

          <div class="t-empty" *ngIf="!loading && !vehicles.length && !error">
            <ion-icon name="car-outline"></ion-icon>
            Todavía no hay vehículos. Pulsa + para añadir el primero.
          </div>
        </div>
      </div>
    </ion-content>

    <!-- FICHA / ALTA -->
    <ion-modal [isOpen]="!!form" (didDismiss)="closeForm()">
      <ng-template>
        <ion-content>
          <div class="jf-modal-head">
            <h2>{{ form?.id ? "Vehículo" : "Nuevo vehículo" }}</h2>
            <button type="button" (click)="closeForm()" aria-label="Cerrar"><ion-icon name="close-outline"></ion-icon></button>
          </div>

          <div class="v-form" *ngIf="form">
            <!-- Foto -->
            <label class="v-photo-pick">
              <input type="file" accept="image/*" hidden (change)="pickPhoto($event)" [disabled]="uploading" />
              <img *ngIf="formPhotoUrl" [src]="formPhotoUrl" alt="Foto del vehículo" />
              <span *ngIf="!formPhotoUrl" class="v-photo-empty">
                <ion-icon name="camera-outline"></ion-icon>
                {{ uploading ? "Subiendo…" : "Añadir foto" }}
              </span>
              <span class="v-photo-change" *ngIf="formPhotoUrl">{{ uploading ? "Subiendo…" : "Cambiar foto" }}</span>
            </label>

            <div class="jf-grid2">
              <label class="jf-input">
                <span>Matrícula *</span>
                <input [(ngModel)]="form.plate" maxlength="15" placeholder="1234 ABC" autocapitalize="characters" />
              </label>
              <label class="jf-input">
                <span>Tipo</span>
                <select [(ngModel)]="form.vehicle_type">
                  <option *ngFor="let t of types" [value]="t">{{ typeLabels[t] }}</option>
                </select>
              </label>
            </div>
            <div class="jf-grid2">
              <label class="jf-input">
                <span>Marca *</span>
                <input [(ngModel)]="form.brand" maxlength="40" placeholder="Ford" />
              </label>
              <label class="jf-input">
                <span>Modelo</span>
                <input [(ngModel)]="form.model" maxlength="40" placeholder="Transit" />
              </label>
            </div>
            <div class="jf-grid2">
              <label class="jf-input">
                <span>Kilometraje</span>
                <input type="number" inputmode="numeric" min="0" step="1" [(ngModel)]="form.kilometers" placeholder="0" />
              </label>
              <label class="jf-input">
                <span>Conductor</span>
                <select [(ngModel)]="form.driver_id">
                  <option [ngValue]="null">Sin conductor</option>
                  <option *ngFor="let d of drivers" [ngValue]="d.id">{{ d.full_name }}</option>
                </select>
              </label>
            </div>

            <!-- Pago -->
            <div class="price-label">¿Cómo se pagó?</div>
            <div class="jf-seg">
              <button type="button" [class.on]="form.ownership === 'financiado'" (click)="form.ownership = 'financiado'">Financiado</button>
              <button type="button" [class.on]="form.ownership === 'comprado'" (click)="form.ownership = 'comprado'">Comprado</button>
            </div>

            <ng-container *ngIf="form.ownership === 'financiado'">
              <label class="jf-input">
                <span>Cuota mensual (€) *</span>
                <input type="number" inputmode="decimal" min="0" step="0.01" [(ngModel)]="form.monthly_payment" placeholder="0,00" />
              </label>
              <div class="jf-grid2">
                <label class="jf-input">
                  <span>Primera cuota</span>
                  <input type="date" [(ngModel)]="form.finance_start" />
                </label>
                <label class="jf-input">
                  <span>Última cuota</span>
                  <input type="date" [(ngModel)]="form.finance_end" />
                </label>
              </div>
            </ng-container>

            <ng-container *ngIf="form.ownership === 'comprado'">
              <div class="jf-grid2">
                <label class="jf-input">
                  <span>Precio de compra (€) *</span>
                  <input type="number" inputmode="decimal" min="0" step="0.01" [(ngModel)]="form.purchase_price" placeholder="0,00" />
                </label>
                <label class="jf-input">
                  <span>Fecha de compra</span>
                  <input type="date" [(ngModel)]="form.purchase_date" />
                </label>
              </div>
            </ng-container>

            <label class="jf-input">
              <span>Notas</span>
              <textarea maxlength="500" [(ngModel)]="form.notes" placeholder="ITV, seguro, observaciones…"></textarea>
            </label>

            <p class="v-problem" *ngIf="problem">{{ problem }}</p>

            <div class="jf-actions">
              <button type="button" class="jf-btn primary" (click)="save()" [disabled]="saving || uploading || !!problem">
                <ion-spinner *ngIf="saving" name="crescent"></ion-spinner>
                {{ form.id ? "Guardar cambios" : "Añadir vehículo" }}
              </button>
            </div>

            <!-- Pagos del vehículo -->
            <section class="v-payments" *ngIf="form.id && original">
              <div class="t-section-head"><h2>Pagos del vehículo</h2></div>

              <div class="v-pay-action" *ngIf="original.ownership === 'financiado'">
                <div>
                  <strong>Cuota de {{ monthName(payMonth) }}</strong>
                  <span>{{ eur(original.monthly_payment) }} · se añade a los gastos del mes</span>
                </div>
                <input type="month" [(ngModel)]="payMonthInput" />
                <button type="button" class="jf-btn success" (click)="registerPayment()"
                        [disabled]="paying || cuotaRegistered(payMonth)">
                  <ion-spinner *ngIf="paying" name="crescent"></ion-spinner>
                  <ion-icon *ngIf="!paying && cuotaRegistered(payMonth)" name="checkmark-circle-outline"></ion-icon>
                  {{ cuotaRegistered(payMonth) ? "Cuota registrada" : "Registrar cuota" }}
                </button>
              </div>

              <div class="v-pay-action" *ngIf="original.ownership === 'comprado'">
                <div>
                  <strong>Compra del vehículo</strong>
                  <span>{{ eur(original.purchase_price) }} · se añade una sola vez a los gastos</span>
                </div>
                <button type="button" class="jf-btn success" (click)="registerPayment()"
                        [disabled]="paying || purchaseRegistered">
                  <ion-spinner *ngIf="paying" name="crescent"></ion-spinner>
                  {{ purchaseRegistered ? "Compra registrada" : "Registrar compra como gasto" }}
                </button>
              </div>

              <div class="t-list">
                <div class="t-row" *ngFor="let e of expenses">
                  <div class="t-row-icon tone-blue"><ion-icon name="receipt-outline"></ion-icon></div>
                  <div class="t-row-main">
                    <strong>{{ e.description }}</strong>
                    <span>{{ fmtDate(e.expense_date) }}</span>
                  </div>
                  <span class="t-row-end">{{ eur(e.amount) }}</span>
                </div>
                <div class="t-empty" *ngIf="!expenses.length">
                  <ion-icon name="receipt-outline"></ion-icon>
                  Aún no hay pagos registrados.
                </div>
              </div>
              <div class="v-total" *ngIf="expenses.length">
                <span>Total pagado</span><strong>{{ eur(expensesTotal) }}</strong>
              </div>
            </section>

            <button type="button" class="jf-btn ghost danger" *ngIf="form.id" (click)="remove()" [disabled]="saving">
              <ion-icon name="trash-outline"></ion-icon> Dar de baja el vehículo
            </button>
          </div>
        </ion-content>
      </ng-template>
    </ion-modal>

    <app-role-tabbar></app-role-tabbar>
  `,
  styles: [
    `
      .v-add-btn {
        width: 40px;
        height: 40px;
        border-radius: 12px;
        border: 0;
        background: var(--t-primary);
        color: var(--t-on-primary);
        font-size: 22px;
        display: grid;
        place-items: center;
        box-shadow: var(--t-shadow);
      }
      .v-error {
        display: flex;
        gap: 8px;
        align-items: center;
        padding: 12px 14px;
        border-radius: 14px;
        background: var(--t-danger-soft);
        color: var(--t-danger);
        font-weight: 600;
        font-size: 13px;
        margin-bottom: 12px;
      }
      .v-summary {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
        margin-bottom: 14px;
      }
      .v-summary div {
        padding: 14px;
        border-radius: 16px;
        background: var(--t-surface);
        border: 1px solid var(--t-border);
        display: grid;
        gap: 2px;
      }
      .v-summary span {
        font-size: 12px;
        color: var(--t-muted);
        font-weight: 600;
      }
      .v-summary strong {
        font-size: 20px;
        color: var(--t-text);
      }
      .v-list {
        display: grid;
        gap: 10px;
      }
      .v-card {
        display: grid;
        grid-template-columns: 76px 1fr auto;
        gap: 12px;
        align-items: center;
        padding: 12px;
        border-radius: 18px;
        border: 1px solid var(--t-border);
        background: var(--t-surface);
        text-align: left;
        font: inherit;
        color: var(--t-text);
        width: 100%;
      }
      .v-photo {
        width: 76px;
        height: 76px;
        border-radius: 14px;
        overflow: hidden;
        background: var(--t-surface-2);
        display: grid;
        place-items: center;
        color: var(--t-muted);
        font-size: 30px;
      }
      .v-photo img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .v-info {
        display: grid;
        gap: 3px;
        min-width: 0;
      }
      .v-plate {
        justify-self: start;
        padding: 2px 8px;
        border-radius: 6px;
        border: 1px solid var(--t-border-strong);
        font-size: 12px;
        font-weight: 800;
        letter-spacing: 1px;
        color: var(--t-text);
      }
      .v-info strong {
        font-size: 15px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .v-meta {
        display: flex;
        align-items: center;
        gap: 5px;
        font-size: 12px;
        color: var(--t-muted);
      }
      .v-pay {
        display: grid;
        justify-items: end;
        gap: 1px;
      }
      .v-pay span {
        font-size: 11px;
        font-weight: 700;
        padding: 2px 8px;
        border-radius: 999px;
        background: var(--t-primary-soft);
        color: var(--t-primary);
      }
      .v-pay[data-o="comprado"] span {
        background: var(--t-success-soft);
        color: var(--t-success);
      }
      .v-pay strong {
        font-size: 15px;
        color: var(--t-text);
      }
      .v-pay small {
        font-size: 11px;
        color: var(--t-muted);
      }
      .v-form {
        display: grid;
        gap: 12px;
        padding: 6px 16px calc(28px + env(safe-area-inset-bottom));
      }
      .v-photo-pick {
        position: relative;
        display: grid;
        place-items: center;
        height: 180px;
        border-radius: 18px;
        overflow: hidden;
        background: var(--t-surface-2);
        border: 1px dashed var(--t-border-strong);
        cursor: pointer;
      }
      .v-photo-pick img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .v-photo-empty {
        display: grid;
        justify-items: center;
        gap: 6px;
        color: var(--t-primary);
        font-weight: 700;
        font-size: 14px;
      }
      .v-photo-empty ion-icon {
        font-size: 30px;
      }
      .v-photo-change {
        position: absolute;
        bottom: 10px;
        right: 10px;
        padding: 6px 12px;
        border-radius: 999px;
        background: rgba(0, 0, 0, 0.6);
        color: #fff;
        font-size: 12px;
        font-weight: 700;
      }
      .v-problem {
        margin: 0;
        color: var(--t-danger);
        font-size: 13px;
        font-weight: 600;
      }
      .v-payments {
        display: grid;
        gap: 10px;
        margin-top: 8px;
        padding-top: 14px;
        border-top: 1px solid var(--t-border);
      }
      .v-pay-action {
        display: grid;
        gap: 10px;
        padding: 14px;
        border-radius: 16px;
        background: var(--t-surface);
        border: 1px solid var(--t-border);
      }
      .v-pay-action div {
        display: grid;
        gap: 2px;
      }
      .v-pay-action strong {
        color: var(--t-text);
        text-transform: capitalize;
      }
      .v-pay-action span {
        font-size: 12px;
        color: var(--t-muted);
      }
      .v-pay-action input[type="month"] {
        height: 44px;
        padding: 0 12px;
        border-radius: 12px;
        border: 1px solid var(--t-border);
        background: var(--t-surface-2);
        color: var(--t-text);
        font: inherit;
      }
      .v-total {
        display: flex;
        justify-content: space-between;
        padding: 4px 4px 0;
        font-weight: 800;
        color: var(--t-text);
      }
      .jf-btn.danger {
        color: var(--t-danger);
      }
    `,
  ],
})
export class VehiculosPage {
  vehicles: Vehicle[] = [];
  team: TeamMember[] = [];
  photoUrls: Record<string, string> = {};
  loading = true;
  error = "";

  form: Partial<Vehicle> | null = null;
  original: Vehicle | null = null;
  formPhotoUrl: string | null = null;
  uploading = false;
  saving = false;

  expenses: any[] = [];
  paying = false;
  payMonthInput = new Date().toISOString().slice(0, 7);

  readonly types = Object.keys(VEHICLE_TYPE_LABELS) as VehicleType[];
  readonly typeLabels = VEHICLE_TYPE_LABELS;

  constructor(
    private readonly supabase: SupabaseService,
    private readonly alertCtrl: AlertController,
    private readonly toastCtrl: ToastController,
  ) {
    addIcons({
      "add-outline": addOutline,
      "car-outline": carOutline,
      "camera-outline": cameraOutline,
      "close-outline": closeOutline,
      "person-outline": personOutline,
      "speedometer-outline": speedometerOutline,
      "cash-outline": cashOutline,
      "receipt-outline": receiptOutline,
      "trash-outline": trashOutline,
      "alert-circle-outline": alertCircleOutline,
      "checkmark-circle-outline": checkmarkCircleOutline,
    });
  }

  async ionViewWillEnter() {
    await this.load();
  }

  async refresh(ev: any) {
    await this.load();
    ev?.target?.complete?.();
  }

  async load() {
    this.loading = true;
    this.error = "";
    try {
      const [vehicles, team] = await Promise.all([
        this.supabase.listVehicles(),
        this.supabase.listTeam().catch(() => [] as TeamMember[]),
      ]);
      this.vehicles = vehicles;
      this.team = team;
      this.photoUrls = await this.supabase.getVehiclePhotoUrls(
        vehicles.map((v) => v.photo_path || "").filter(Boolean),
      );
    } catch (e: any) {
      this.error = e?.message || "No se pudieron cargar los vehículos.";
    } finally {
      this.loading = false;
    }
  }

  get drivers(): TeamMember[] {
    return this.team.filter(
      (m) => m.account_status === "activo" && (m.role === "encargado" || m.role === "ayudante"),
    );
  }

  get monthlyTotal(): number {
    return this.vehicles
      .filter((v) => v.ownership === "financiado")
      .reduce((t, v) => t + (Number(v.monthly_payment) || 0), 0);
  }

  driverName(id: string | null): string {
    if (!id) return "Sin conductor";
    return this.team.find((m) => m.id === id)?.full_name ?? "Conductor";
  }

  openNew() {
    this.original = null;
    this.expenses = [];
    this.formPhotoUrl = null;
    this.form = emptyVehicle();
  }

  async openEdit(v: Vehicle) {
    this.original = v;
    this.form = { ...v };
    this.formPhotoUrl = v.photo_path ? this.photoUrls[v.photo_path] ?? null : null;
    this.payMonthInput = new Date().toISOString().slice(0, 7);
    this.expenses = [];
    await this.loadExpenses();
  }

  closeForm() {
    this.form = null;
    this.original = null;
  }

  private async loadExpenses() {
    if (!this.original) return;
    try {
      this.expenses = await this.supabase.listVehicleExpenses(this.original.id);
    } catch {
      this.expenses = [];
    }
  }

  get expensesTotal(): number {
    return this.expenses.reduce((t, e) => t + (Number(e.amount) || 0), 0);
  }

  get payMonth(): string {
    return `${this.payMonthInput || new Date().toISOString().slice(0, 7)}-01`;
  }

  monthName(d: string): string {
    const [y, m] = d.split("-");
    return `${MONTHS[Number(m) - 1] ?? ""} ${y}`;
  }

  cuotaRegistered(month: string): boolean {
    return this.expenses.some((e) => e.vehicle_payment === "cuota" && String(e.vehicle_month).slice(0, 10) === month);
  }

  get purchaseRegistered(): boolean {
    return this.expenses.some((e) => e.vehicle_payment === "compra");
  }

  get problem(): string {
    const f = this.form;
    if (!f) return "";
    if (!f.plate?.trim()) return "Indica la matrícula.";
    if (!f.brand?.trim()) return "Indica la marca.";
    if (f.kilometers != null && (f.kilometers as any) !== "" && Number(f.kilometers) < 0) return "El kilometraje no puede ser negativo.";
    if (f.ownership === "financiado" && !(Number(f.monthly_payment) > 0)) return "Indica la cuota mensual.";
    if (f.ownership === "comprado" && !(Number(f.purchase_price) > 0)) return "Indica el precio de compra.";
    if (f.ownership === "financiado" && f.finance_start && f.finance_end && f.finance_end < f.finance_start)
      return "La última cuota no puede ser anterior a la primera.";
    return "";
  }

  async pickPhoto(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = "";
    if (!file || !this.form) return;
    this.uploading = true;
    try {
      const path = await this.supabase.uploadVehiclePhoto(file);
      this.form.photo_path = path;
      const urls = await this.supabase.getVehiclePhotoUrls([path]);
      this.photoUrls = { ...this.photoUrls, ...urls };
      this.formPhotoUrl = urls[path] ?? URL.createObjectURL(file);
    } catch (e: any) {
      await this.toast(e?.message || "No se pudo subir la foto.", "danger");
    } finally {
      this.uploading = false;
    }
  }

  async save() {
    if (!this.form || this.problem || this.saving) return;
    this.saving = true;
    try {
      const f = this.form;
      const saved = await this.supabase.saveVehicle({
        ...f,
        kilometers: f.kilometers === null || (f.kilometers as any) === "" ? null : Math.round(Number(f.kilometers)),
        monthly_payment: f.monthly_payment == null ? null : Math.round(Number(f.monthly_payment) * 100) / 100,
        purchase_price: f.purchase_price == null ? null : Math.round(Number(f.purchase_price) * 100) / 100,
      });
      await this.toast(f.id ? "Vehículo guardado." : "Vehículo añadido.", "success");
      await this.load();
      if (f.id) {
        this.original = saved;
        this.form = { ...saved };
      } else {
        await this.openEdit(saved);
      }
    } catch (e: any) {
      await this.toast(e?.message || "No se pudo guardar el vehículo.", "danger");
    } finally {
      this.saving = false;
    }
  }

  async registerPayment() {
    if (!this.original || this.paying) return;
    this.paying = true;
    try {
      await this.supabase.registerVehiclePayment(this.original.id, this.payMonth);
      await this.toast("Pago registrado en los gastos.", "success");
      await this.loadExpenses();
    } catch (e: any) {
      await this.toast(e?.message || "No se pudo registrar el pago.", "danger");
    } finally {
      this.paying = false;
    }
  }

  async remove() {
    if (!this.original) return;
    const alert = await this.alertCtrl.create({
      header: "Dar de baja",
      message: `¿Dar de baja ${this.original.plate}? Dejará de aparecer en la lista. Sus pagos se conservan en Finanzas.`,
      buttons: [
        { text: "Cancelar", role: "cancel" },
        { text: "Dar de baja", role: "destructive" },
      ],
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    if (role !== "destructive") return;
    try {
      await this.supabase.deactivateVehicle(this.original.id);
      this.closeForm();
      await this.load();
    } catch (e: any) {
      await this.toast(e?.message || "No se pudo dar de baja.", "danger");
    }
  }

  eur(n: number | null | undefined) {
    return (Number(n) || 0).toLocaleString("es-ES", { style: "currency", currency: "EUR" });
  }

  fmtDate(d: string) {
    const [y, m, day] = String(d || "").split("-");
    return y ? `${day}/${m}/${y}` : "";
  }

  private async toast(message: string, color: string) {
    const t = await this.toastCtrl.create({ message, color, duration: 2800, position: "top" });
    await t.present();
  }
}
