import { Component, Input, OnChanges, SimpleChanges } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { AlertController, IonContent, IonIcon, IonModal, IonSpinner, ToastController } from "@ionic/angular/standalone";
import { addIcons } from "ionicons";
import {
  closeOutline,
  callOutline,
  locationOutline,
  calendarOutline,
  documentTextOutline,
  personOutline,
  cashOutline,
  createOutline,
  trashOutline,
  checkmarkDoneOutline,
  arrowUndoOutline,
  peopleOutline,
  chevronForwardOutline,
  briefcaseOutline,
} from "ionicons/icons";

import { Associate, ContractJob, SERVICE_LABELS, ServiceType, SupabaseService } from "../services/supabase.service";

const SERVICES: ServiceType[] = ["mudanza", "montaje", "reforma"];
const SERVICE_EMOJI: Record<ServiceType, string> = { mudanza: "🚚", montaje: "🔧", reforma: "🏗️" };
/** Sugerencia inicial de lo que gana el administrador (se puede cambiar). */
const SUGGESTED_RATE = 0.15;

// =====================================================================
// TRABAJOS COMO CONTRATISTA (solo administrador)
// El administrador consigue el trabajo y lo pasa a un asociado.
// Se guarda el presupuesto total y lo que gana él (lo que indique).
// Estados: Confirmado -> Cobrado (cobra su parte antes de terminar).
// =====================================================================
@Component({
  selector: "app-contract-jobs",
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonIcon, IonModal, IonSpinner],
  template: `
    <!-- RESUMEN DEL MES -->
    <section class="cj-summary">
      <div class="cj-box">
        <span>💼 Presupuestos</span>
        <strong>{{ eur(totalBudget) }}</strong>
        <small>{{ jobs.length }} {{ jobs.length === 1 ? "trabajo" : "trabajos" }}</small>
      </div>
      <div class="cj-box mine">
        <span>💰 Lo que gano</span>
        <strong>{{ eur(totalEarning) }}</strong>
        <small>{{ eur(paidEarning) }} cobrado</small>
      </div>
    </section>

    <section class="e-tabs cj-tabs">
      <button type="button" [class.active]="tab === 'confirmado'" (click)="tab = 'confirmado'">
        Confirmados <b>{{ count("confirmado") }}</b>
      </button>
      <button type="button" [class.active]="tab === 'cobrado'" (click)="tab = 'cobrado'">
        Cobrados <b>{{ count("cobrado") }}</b>
      </button>
    </section>

    <button type="button" class="cj-assoc-link" (click)="goAssociates()">
      <ion-icon name="people-outline"></ion-icon>
      <span>Mis asociados</span>
      <ion-icon name="chevron-forward-outline"></ion-icon>
    </button>

    <div class="cj-error" *ngIf="error">{{ error }}</div>
    <div class="t-skeleton" *ngIf="loading && !jobs.length"></div>

    <div class="t-list" *ngIf="!loading || jobs.length">
      <button type="button" class="t-row cj-row" *ngFor="let j of visible" (click)="openDetail(j)">
        <div class="t-date">
          <strong>{{ j.job_date.slice(8, 10) }}</strong>
          <span>{{ monthShort(j.job_date) }}</span>
        </div>
        <div class="t-row-main">
          <strong>{{ emoji[j.service_type] }} {{ labels[j.service_type] }} · {{ j.client_name }}</strong>
          <span>🤝 {{ associateName(j.associate_id) }}</span>
        </div>
        <div class="cj-amounts">
          <strong>{{ eur(j.my_earning) }}</strong>
          <small>de {{ eur(j.budget_amount) }}</small>
        </div>
      </button>
      <div class="t-empty" *ngIf="!loading && !visible.length">
        <ion-icon name="briefcase-outline"></ion-icon>
        {{ tab === "confirmado" ? "No hay trabajos confirmados este mes." : "Aún no has cobrado trabajos este mes." }}
      </div>
    </div>

    <!-- FICHA / EDICIÓN / ALTA -->
    <ion-modal [isOpen]="!!selected || !!form" (didDismiss)="closeAll()">
      <ng-template>
        <ion-content>
          <div class="jf-modal-head">
            <h2>{{ form ? (form.id ? "Editar trabajo" : "Nuevo trabajo como contratista") : "Trabajo como contratista" }}</h2>
            <button type="button" (click)="closeAll()" aria-label="Cerrar"><ion-icon name="close-outline"></ion-icon></button>
          </div>

          <!-- FICHA -->
          <div class="v-form" *ngIf="selected && !form">
            <div class="cj-head">
              <span class="cj-type">{{ emoji[selected.service_type] }} {{ labels[selected.service_type] }}</span>
              <span class="cj-status" [attr.data-s]="selected.status">
                {{ selected.status === "cobrado" ? "✅ Cobrado" : "📌 Confirmado" }}
              </span>
            </div>

            <div class="cj-money">
              <div><span>Presupuesto total</span><strong>{{ eur(selected.budget_amount) }}</strong></div>
              <div class="mine"><span>Lo que gano yo</span><strong>{{ eur(selected.my_earning) }}</strong></div>
            </div>

            <div class="cj-facts">
              <div><ion-icon name="people-outline"></ion-icon><span>Asociado</span><strong>{{ associateName(selected.associate_id) }}</strong></div>
              <a *ngIf="associatePhone(selected.associate_id)" [href]="'tel:' + associatePhone(selected.associate_id)">
                <ion-icon name="call-outline"></ion-icon><span>Tel. asociado</span><strong class="link">{{ associatePhone(selected.associate_id) }}</strong>
              </a>
              <div><ion-icon name="person-outline"></ion-icon><span>Cliente</span><strong>{{ selected.client_name }}</strong></div>
              <a *ngIf="selected.client_phone" [href]="'tel:' + selected.client_phone">
                <ion-icon name="call-outline"></ion-icon><span>Tel. cliente</span><strong class="link">{{ selected.client_phone }}</strong>
              </a>
              <ng-container *ngIf="selected.service_type === 'mudanza'; else workTpl">
                <div><ion-icon name="location-outline"></ion-icon><span>Recogida</span><strong>{{ selected.pickup_point || "—" }}</strong></div>
                <div><ion-icon name="location-outline"></ion-icon><span>Entrega</span><strong>{{ selected.dropoff_point || "—" }}</strong></div>
              </ng-container>
              <ng-template #workTpl>
                <div><ion-icon name="location-outline"></ion-icon><span>Dirección</span><strong>{{ selected.work_point || "—" }}</strong></div>
              </ng-template>
              <div><ion-icon name="calendar-outline"></ion-icon><span>Fecha</span><strong>{{ fmtDate(selected.job_date) }}{{ selected.start_time ? " · " + selected.start_time.slice(0, 5) : "" }}</strong></div>
            </div>

            <div class="cj-details" *ngIf="selected.details">
              <span><ion-icon name="document-text-outline"></ion-icon> Detalles</span>
              <p>{{ selected.details }}</p>
            </div>

            <div class="jf-actions">
              <button type="button" class="jf-btn success" *ngIf="selected.status === 'confirmado'" (click)="setStatus('cobrado')" [disabled]="saving">
                <ion-icon name="checkmark-done-outline"></ion-icon> Marcar como cobrado
              </button>
              <button type="button" class="jf-btn ghost" *ngIf="selected.status === 'cobrado'" (click)="setStatus('confirmado')" [disabled]="saving">
                <ion-icon name="arrow-undo-outline"></ion-icon> Volver a confirmado
              </button>
              <button type="button" class="jf-btn primary" (click)="edit(selected)" [disabled]="saving">
                <ion-icon name="create-outline"></ion-icon> Editar información
              </button>
              <button type="button" class="jf-btn ghost cj-danger" (click)="remove(selected)" [disabled]="saving">
                <ion-icon name="trash-outline"></ion-icon> Eliminar
              </button>
            </div>
          </div>

          <!-- FORMULARIO -->
          <div class="v-form" *ngIf="form">
            <div class="price-label">¿Qué servicio es?</div>
            <div class="cj-pick">
              <button type="button" *ngFor="let s of services" [class.on]="form.service_type === s" (click)="setService(s)">
                <span>{{ emoji[s] }}</span> {{ labels[s] }}
              </button>
            </div>

            <label class="jf-input">
              <span>Asociado que lo hará *</span>
              <select [(ngModel)]="form.associate_id">
                <option [ngValue]="null" disabled>Elige un asociado</option>
                <option *ngFor="let a of associatesFor(form.service_type)" [ngValue]="a.id">
                  {{ a.full_name }}{{ a.phone ? " · " + a.phone : "" }}
                </option>
              </select>
            </label>
            <p class="cj-hint" *ngIf="!associatesFor(form.service_type).length">
              No tienes asociados de {{ labels[form.service_type!] | lowercase }}.
              <button type="button" class="jf-link" (click)="goAssociates()">Crear asociado</button>
            </p>

            <div class="jf-grid2">
              <label class="jf-input">
                <span>Cliente *</span>
                <input [(ngModel)]="form.client_name" maxlength="80" placeholder="Nombre del cliente" />
              </label>
              <label class="jf-input">
                <span>Teléfono del cliente</span>
                <input [(ngModel)]="form.client_phone" maxlength="20" inputmode="tel" />
              </label>
            </div>

            <ng-container *ngIf="form.service_type === 'mudanza'; else workForm">
              <label class="jf-input">
                <span>Dirección de recogida</span>
                <input [(ngModel)]="form.pickup_point" maxlength="200" placeholder="Calle, número, piso…" />
              </label>
              <label class="jf-input">
                <span>Dirección de entrega</span>
                <input [(ngModel)]="form.dropoff_point" maxlength="200" placeholder="Calle, número, piso…" />
              </label>
            </ng-container>
            <ng-template #workForm>
              <label class="jf-input">
                <span>Dirección del trabajo</span>
                <input [(ngModel)]="form.work_point" maxlength="200" placeholder="Calle, número, piso…" />
              </label>
            </ng-template>

            <div class="jf-grid2">
              <label class="jf-input">
                <span>Fecha *</span>
                <input type="date" [(ngModel)]="form.job_date" />
              </label>
              <label class="jf-input">
                <span>Hora</span>
                <input type="time" [(ngModel)]="form.start_time" />
              </label>
            </div>

            <label class="jf-input">
              <span>Detalles del trabajo</span>
              <textarea [(ngModel)]="form.details" maxlength="2000"
                        placeholder="Qué hay que hacer, materiales, plantas, muebles…"></textarea>
            </label>

            <div class="price-label">Precio</div>
            <label class="jf-input">
              <span>Presupuesto total del trabajo (€) *</span>
              <input type="number" inputmode="decimal" min="0" step="0.01" [(ngModel)]="form.budget_amount"
                     (ngModelChange)="onBudget()" placeholder="10000" />
            </label>
            <label class="jf-input">
              <span>Lo que ganas tú (€) *</span>
              <input type="number" inputmode="decimal" min="0" step="0.01" [(ngModel)]="form.my_earning"
                     (ngModelChange)="earningTouched = true" placeholder="1500" />
            </label>
            <p class="cj-hint" *ngIf="earningPct !== null">Equivale al {{ earningPct | number: "1.0-1" }} % del presupuesto.</p>

            <p class="cj-problem" *ngIf="problem">{{ problem }}</p>

            <div class="jf-actions">
              <button type="button" class="jf-btn primary" (click)="save()" [disabled]="saving || !!problem">
                <ion-spinner *ngIf="saving" name="crescent"></ion-spinner>
                {{ form.id ? "Guardar cambios" : "Confirmar trabajo" }}
              </button>
              <button type="button" class="jf-btn ghost" (click)="form.id ? (form = null) : closeAll()" [disabled]="saving">Cancelar</button>
            </div>
          </div>
        </ion-content>
      </ng-template>
    </ion-modal>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .cj-summary {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
        margin-bottom: 14px;
      }
      .cj-box {
        display: grid;
        gap: 3px;
        padding: 16px;
        border-radius: 20px;
        background: var(--t-surface);
        border: 1px solid var(--t-border);
        box-shadow: var(--t-shadow);
      }
      .cj-box.mine {
        background: linear-gradient(135deg, var(--t-success), #0ea5a4);
        border-color: transparent;
        color: #fff;
      }
      .cj-box span {
        font-size: 12px;
        font-weight: 700;
        color: var(--t-muted);
      }
      .cj-box.mine span,
      .cj-box.mine small {
        color: rgba(255, 255, 255, 0.9);
      }
      .cj-box strong {
        font-size: 21px;
        font-weight: 800;
        color: var(--t-text);
      }
      .cj-box.mine strong {
        color: #fff;
      }
      .cj-box small {
        font-size: 12px;
        color: var(--t-muted);
      }
      .cj-tabs {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 6px;
        padding: 4px;
        border-radius: 14px;
        background: var(--t-surface-2);
        border: 1px solid var(--t-border);
        margin-bottom: 12px;
      }
      .cj-tabs button {
        min-height: 44px;
        border: 0;
        border-radius: 11px;
        background: transparent;
        color: var(--t-muted);
        font: inherit;
        font-size: 14px;
        font-weight: 700;
      }
      .cj-tabs button.active {
        background: var(--t-surface);
        color: var(--t-text);
        box-shadow: var(--t-shadow);
      }
      .cj-tabs b {
        margin-left: 4px;
        padding: 1px 7px;
        border-radius: 999px;
        background: var(--t-primary-soft);
        color: var(--t-primary);
        font-size: 12px;
      }
      .cj-assoc-link {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 14px;
        padding: 12px 14px;
        border-radius: 14px;
        border: 1px dashed var(--t-border-strong);
        background: transparent;
        color: var(--t-primary);
        font: inherit;
        font-weight: 700;
      }
      .cj-assoc-link span {
        flex: 1;
        text-align: left;
      }
      .cj-error,
      .cj-problem {
        color: var(--t-danger);
        font-size: 13px;
        font-weight: 600;
        margin: 0 0 10px;
      }
      .cj-row {
        width: 100%;
        border: 0;
        font: inherit;
        text-align: left;
        color: inherit;
        background: transparent;
      }
      .cj-amounts {
        display: grid;
        justify-items: end;
        flex-shrink: 0;
      }
      .cj-amounts strong {
        color: var(--t-success);
        font-weight: 800;
      }
      .cj-amounts small {
        font-size: 11px;
        color: var(--t-muted);
      }
      .cj-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .cj-type {
        font-size: 18px;
        font-weight: 800;
        color: var(--t-text);
      }
      .cj-status {
        padding: 4px 10px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 800;
        background: var(--t-primary-soft);
        color: var(--t-primary);
      }
      .cj-status[data-s="cobrado"] {
        background: var(--t-success-soft);
        color: var(--t-success);
      }
      .cj-money {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
      }
      .cj-money div {
        display: grid;
        gap: 2px;
        padding: 14px;
        border-radius: 16px;
        background: var(--t-surface-2);
      }
      .cj-money div.mine {
        background: var(--t-success-soft);
      }
      .cj-money span {
        font-size: 12px;
        color: var(--t-muted);
        font-weight: 600;
      }
      .cj-money strong {
        font-size: 18px;
        color: var(--t-text);
      }
      .cj-money .mine strong {
        color: var(--t-success);
      }
      .cj-facts {
        display: grid;
        border-radius: 16px;
        border: 1px solid var(--t-border);
        overflow: hidden;
      }
      .cj-facts > * {
        display: grid;
        grid-template-columns: 22px 110px 1fr;
        gap: 8px;
        align-items: center;
        padding: 11px 14px;
        text-decoration: none;
        color: inherit;
        font-size: 14px;
      }
      .cj-facts > * + * {
        border-top: 1px solid var(--t-border);
      }
      .cj-facts ion-icon {
        color: var(--t-muted);
      }
      .cj-facts span {
        color: var(--t-muted);
        font-size: 13px;
      }
      .cj-facts strong {
        color: var(--t-text);
        word-break: break-word;
      }
      .cj-facts strong.link {
        color: var(--t-primary);
      }
      .cj-details {
        padding: 14px;
        border-radius: 16px;
        background: var(--t-surface-2);
      }
      .cj-details span {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        font-weight: 800;
        color: var(--t-text-2);
      }
      .cj-details p {
        margin: 6px 0 0;
        white-space: pre-wrap;
        font-size: 14px;
        line-height: 1.5;
        color: var(--t-text);
      }
      .cj-pick {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
      }
      .cj-pick button {
        display: grid;
        justify-items: center;
        gap: 4px;
        padding: 12px 6px;
        border-radius: 14px;
        border: 2px solid var(--t-border);
        background: var(--t-surface);
        color: var(--t-text-2);
        font: inherit;
        font-size: 13px;
        font-weight: 700;
      }
      .cj-pick button span {
        font-size: 24px;
      }
      .cj-pick button.on {
        border-color: var(--t-primary);
        background: var(--t-primary-soft);
        color: var(--t-primary);
      }
      .cj-hint {
        margin: -4px 4px 0;
        font-size: 12px;
        color: var(--t-muted);
      }
      .cj-danger {
        color: var(--t-danger) !important;
      }
    `,
  ],
})
export class ContractJobsComponent implements OnChanges {
  @Input() year = new Date().getFullYear();
  /** Mes 0..11 (igual que la pantalla de Trabajos). */
  @Input() month = new Date().getMonth();

  jobs: ContractJob[] = [];
  associates: Associate[] = [];
  loading = true;
  error = "";
  tab: "confirmado" | "cobrado" = "confirmado";

  selected: ContractJob | null = null;
  form: Partial<ContractJob> | null = null;
  earningTouched = false;
  saving = false;

  readonly services = SERVICES;
  readonly labels = SERVICE_LABELS;
  readonly emoji = SERVICE_EMOJI;
  private requestId = 0;

  constructor(
    private readonly supabase: SupabaseService,
    private readonly router: Router,
    private readonly alertCtrl: AlertController,
    private readonly toastCtrl: ToastController,
  ) {
    addIcons({
      "close-outline": closeOutline,
      "call-outline": callOutline,
      "location-outline": locationOutline,
      "calendar-outline": calendarOutline,
      "document-text-outline": documentTextOutline,
      "person-outline": personOutline,
      "cash-outline": cashOutline,
      "create-outline": createOutline,
      "trash-outline": trashOutline,
      "checkmark-done-outline": checkmarkDoneOutline,
      "arrow-undo-outline": arrowUndoOutline,
      "people-outline": peopleOutline,
      "chevron-forward-outline": chevronForwardOutline,
      "briefcase-outline": briefcaseOutline,
    });
  }

  ngOnChanges(_: SimpleChanges) {
    void this.load();
  }

  async load() {
    const id = ++this.requestId;
    this.loading = true;
    this.error = "";
    try {
      const [jobs, associates] = await Promise.all([
        this.supabase.listContractJobs(this.year, this.month + 1),
        this.supabase.listAssociates(true),
      ]);
      if (id !== this.requestId) return;
      this.jobs = jobs;
      this.associates = associates;
    } catch (e: any) {
      if (id !== this.requestId) return;
      this.error = e?.message || "No se pudieron cargar los trabajos de contratista.";
    } finally {
      if (id === this.requestId) this.loading = false;
    }
  }

  get visible() {
    return this.jobs.filter((j) => j.status === this.tab);
  }

  count(s: string) {
    return this.jobs.filter((j) => j.status === s).length;
  }

  get totalBudget() {
    return this.jobs.reduce((t, j) => t + (Number(j.budget_amount) || 0), 0);
  }

  get totalEarning() {
    return this.jobs.reduce((t, j) => t + (Number(j.my_earning) || 0), 0);
  }

  get paidEarning() {
    return this.jobs.filter((j) => j.status === "cobrado").reduce((t, j) => t + (Number(j.my_earning) || 0), 0);
  }

  associatesFor(s?: ServiceType | null): Associate[] {
    return this.associates.filter(
      (a) => (a.is_active || a.id === this.form?.associate_id) && (!s || a.specialties.includes(s)),
    );
  }

  associateName(id: string) {
    return this.associates.find((a) => a.id === id)?.full_name ?? "Asociado";
  }

  associatePhone(id: string) {
    return this.associates.find((a) => a.id === id)?.phone ?? null;
  }

  /** Lo llama la pantalla de Trabajos al elegir "Como contratista". */
  openCreate() {
    this.selected = null;
    this.earningTouched = false;
    const m = String(this.month + 1).padStart(2, "0");
    const today = new Date();
    const sameMonth = today.getFullYear() === this.year && today.getMonth() === this.month;
    this.form = {
      service_type: "reforma",
      associate_id: null as any,
      client_name: "",
      client_phone: "",
      pickup_point: "",
      dropoff_point: "",
      work_point: "",
      job_date: sameMonth ? today.toISOString().slice(0, 10) : `${this.year}-${m}-01`,
      start_time: "",
      details: "",
      budget_amount: null as any,
      my_earning: null as any,
      status: "confirmado",
    };
    this.autoAssociate();
  }

  openDetail(j: ContractJob) {
    this.form = null;
    this.selected = j;
  }

  edit(j: ContractJob) {
    this.earningTouched = true;
    this.form = { ...j, start_time: j.start_time ? j.start_time.slice(0, 5) : "" };
  }

  closeAll() {
    this.form = null;
    this.selected = null;
  }

  setService(s: ServiceType) {
    if (!this.form) return;
    this.form.service_type = s;
    const current = this.associates.find((a) => a.id === this.form!.associate_id);
    if (!current || !current.specialties.includes(s)) {
      this.form.associate_id = null as any;
      this.autoAssociate();
    }
  }

  private autoAssociate() {
    const list = this.associatesFor(this.form?.service_type).filter((a) => a.is_active);
    if (this.form && list.length === 1) this.form.associate_id = list[0].id;
  }

  onBudget() {
    if (!this.form || this.earningTouched) return;
    const b = Number(this.form.budget_amount);
    this.form.my_earning = Number.isFinite(b) && b > 0 ? (Math.round(b * SUGGESTED_RATE * 100) / 100) as any : (null as any);
  }

  get earningPct(): number | null {
    const b = Number(this.form?.budget_amount);
    const e = Number(this.form?.my_earning);
    if (!this.form || !(b > 0) || !Number.isFinite(e) || (this.form.my_earning as any) === null) return null;
    return (e / b) * 100;
  }

  get problem(): string {
    const f = this.form;
    if (!f) return "";
    if (!f.service_type) return "Elige el servicio.";
    if (!f.associate_id) return "Elige el asociado que hará el trabajo.";
    if (!f.client_name?.trim()) return "Escribe el nombre del cliente.";
    if (!f.job_date) return "Indica la fecha.";
    const b = Number(f.budget_amount);
    if (!(b > 0)) return "Indica el presupuesto total.";
    const e = Number(f.my_earning);
    if ((f.my_earning as any) === null || (f.my_earning as any) === "" || !Number.isFinite(e) || e < 0)
      return "Indica lo que ganas tú.";
    if (e > b) return "Lo que ganas no puede ser mayor que el presupuesto.";
    return "";
  }

  async save() {
    if (!this.form || this.problem || this.saving) return;
    this.saving = true;
    try {
      const saved = await this.supabase.saveContractJob({
        ...this.form,
        budget_amount: Math.round(Number(this.form.budget_amount) * 100) / 100,
        my_earning: Math.round(Number(this.form.my_earning) * 100) / 100,
      });
      await this.toast(this.form.id ? "Trabajo guardado." : "Trabajo confirmado. 🤝", "success");
      this.form = null;
      await this.load();
      this.selected = this.jobs.find((j) => j.id === saved.id) ?? null;
      if (!this.selected) this.closeAll();
    } catch (e: any) {
      await this.toast(e?.message || "No se pudo guardar.", "danger");
    } finally {
      this.saving = false;
    }
  }

  async setStatus(status: "confirmado" | "cobrado") {
    if (!this.selected || this.saving) return;
    this.saving = true;
    try {
      this.selected = await this.supabase.setContractJobStatus(this.selected.id, status);
      await this.toast(status === "cobrado" ? "💰 Marcado como cobrado." : "Vuelve a estar confirmado.", "success");
      await this.load();
    } catch (e: any) {
      await this.toast(e?.message || "No se pudo cambiar el estado.", "danger");
    } finally {
      this.saving = false;
    }
  }

  async remove(j: ContractJob) {
    const alert = await this.alertCtrl.create({
      header: "Eliminar trabajo",
      message: `¿Eliminar el trabajo de ${j.client_name}? No se puede deshacer.`,
      buttons: [
        { text: "Cancelar", role: "cancel" },
        { text: "Eliminar", role: "destructive" },
      ],
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    if (role !== "destructive") return;
    try {
      await this.supabase.deleteContractJob(j.id);
      this.closeAll();
      await this.load();
    } catch (e: any) {
      await this.toast(e?.message || "No se pudo eliminar.", "danger");
    }
  }

  goAssociates() {
    this.closeAll();
    void this.router.navigateByUrl("/admin/asociados");
  }

  eur(n: number | null | undefined) {
    return (Number(n) || 0).toLocaleString("es-ES", { style: "currency", currency: "EUR" });
  }

  fmtDate(d: string) {
    const [y, m, day] = String(d || "").split("-");
    return y ? `${day}/${m}/${y}` : "";
  }

  monthShort(d: string) {
    const names = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
    return names[Number(String(d).slice(5, 7)) - 1] ?? "";
  }

  private async toast(message: string, color: string) {
    const t = await this.toastCtrl.create({ message, color, duration: 2600, position: "top" });
    await t.present();
  }
}
