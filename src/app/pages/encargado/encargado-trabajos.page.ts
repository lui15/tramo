import { Component, OnDestroy, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ActivatedRoute } from "@angular/router";
import { Subscription } from "rxjs";
import {
  IonContent,
  IonIcon,
  IonModal,
  IonRefresher,
  IonRefresherContent,
} from "@ionic/angular/standalone";
import { addIcons } from "ionicons";
import {
  chevronBackOutline,
  chevronForwardOutline,
  calendarOutline,
  checkmarkCircleOutline,
  checkmarkDoneCircleOutline,
  personOutline,
  callOutline,
  locationOutline,
  timeOutline,
  closeOutline,
  flagOutline,
  hourglassOutline,
  alertCircleOutline,
  briefcaseOutline,
  shieldCheckmarkOutline,
  personCircleOutline,
  cashOutline,
  walletOutline,
} from "ionicons/icons";

import { PageHeaderComponent } from "../../components/page-header.component";
import { EmployeeTabbarComponent } from "../../components/employee-tabbar.component";
import { JobCloseFormComponent } from "../../components/job-close-form.component";
import { JobPhotosComponent } from "../../components/job-photos.component";
import { EncargadoJob, JOB_STATUS_LABELS, SupabaseService } from "../../services/supabase.service";
import {
  GROUP_LABEL,
  JobGroup,
  MonthCursor,
  day,
  fmtDate,
  fmtTime,
  groupOf,
  monthShort,
  eur,
  num,
  typeLabel,
} from "./encargado.shared";

// =====================================================================
// TRABAJOS DEL ENCARGADO
// Mes a mes (por fecha programada del trabajo) y en tres grupos:
// Pendientes · Confirmados · Terminados. Desde la ficha puede
// marcar "Trabajo terminado" (queda En revisión para la secretaría).
// =====================================================================
@Component({
  selector: "app-encargado-trabajos",
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonIcon,
    IonModal,
    IonRefresher,
    IonRefresherContent,
    PageHeaderComponent,
    EmployeeTabbarComponent,
    JobCloseFormComponent,
    JobPhotosComponent,
  ],
  template: `
    <app-page-header title="Trabajos" subtitle="Mis trabajos"></app-page-header>

    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="refresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <div class="t-page">
        <!-- Mes -->
        <section class="t-month">
          <button type="button" class="t-month-arrow" (click)="shift(-1)" aria-label="Mes anterior">
            <ion-icon name="chevron-back-outline"></ion-icon>
          </button>
          <div class="t-month-current">
            <strong>{{ cursor.name }}</strong>
            <span>{{ cursor.year }}</span>
          </div>
          <button type="button" class="t-month-arrow" (click)="shift(1)" aria-label="Mes siguiente">
            <ion-icon name="chevron-forward-outline"></ion-icon>
          </button>
        </section>

        <!-- Grupos -->
        <section class="e-tabs">
          <button type="button" *ngFor="let g of groups" [class.on]="group === g" (click)="group = g">
            {{ groupLabel[g] }}
            <span>{{ loading ? "–" : count(g) }}</span>
          </button>
        </section>

        <div class="e-error" *ngIf="error">
          <ion-icon name="alert-circle-outline"></ion-icon><span>{{ error }}</span>
        </div>

        <div class="t-skeleton" *ngIf="loading"></div>

        <div class="t-list" *ngIf="!loading && !error">
          <button type="button" class="t-row" *ngFor="let j of visible" (click)="open(j)">
            <div class="t-date">
              <strong>{{ day(j.job_date) }}</strong>
              <span>{{ monthShort(j.job_date) }}</span>
            </div>
            <div class="t-row-main">
              <strong>{{ typeLabel(j.job_type) }} · {{ j.client_name }}</strong>
              <span>
                {{ fmtTime(j.start_time) || "Sin hora" }}
                <ng-container *ngIf="j.address_info"> · {{ j.address_info }}</ng-container>
              </span>
            </div>
            <div class="e-row-end">
              <span class="e-status" [attr.data-s]="j.status">{{ statusLabel(j.status) }}</span>
              <span class="e-mine" *ngIf="j.is_mine">Tuyo</span>
            </div>
          </button>

          <div class="t-empty" *ngIf="visible.length === 0">
            <ion-icon name="briefcase-outline"></ion-icon>
            No hay trabajos {{ groupLabel[group] | lowercase }} en {{ cursor.name | lowercase }} de {{ cursor.year }}.
          </div>
        </div>
      </div>
    </ion-content>

    <!-- Ficha del trabajo -->
    <ion-modal [isOpen]="!!selected" (didDismiss)="closeModal()">
      <ng-template>
        <ion-content>
          <div class="jf-modal-head">
            <h2>{{ closing ? "Trabajo terminado" : "Ficha del trabajo" }}</h2>
            <button type="button" (click)="closeModal()" aria-label="Cerrar">
              <ion-icon name="close-outline"></ion-icon>
            </button>
          </div>

          <div class="e-sheet" *ngIf="selected && !closing">
            <div class="e-sheet-title">
              <strong>{{ typeLabel(selected.job_type) }}</strong>
              <span class="e-status" [attr.data-s]="selected.status">{{ statusLabel(selected.status) }}</span>
            </div>

            <div class="e-info">
              <div>
                <ion-icon name="person-outline"></ion-icon>
                <span>Cliente</span><strong>{{ selected.client_name || "—" }}</strong>
              </div>
              <a [href]="'tel:' + selected.client_phone" *ngIf="selected.client_phone">
                <ion-icon name="call-outline"></ion-icon>
                <span>Teléfono</span><strong class="link">{{ selected.client_phone }}</strong>
              </a>
              <div>
                <ion-icon name="location-outline"></ion-icon>
                <span>Dirección</span><strong>{{ selected.address_info || "—" }}</strong>
              </div>
              <div>
                <ion-icon name="calendar-outline"></ion-icon>
                <span>Fecha</span><strong>{{ fmtDate(selected.job_date) }} · {{ fmtTime(selected.start_time) || "sin hora" }}</strong>
              </div>
              <div>
                <ion-icon name="person-circle-outline"></ion-icon>
                <span>Encargado</span><strong>{{ selected.encargado_name || "Sin asignar" }}</strong>
              </div>
              <div *ngIf="selected.duration_value">
                <ion-icon name="time-outline"></ion-icon>
                <span>Duración</span>
                <strong>
                  {{ num(selected.duration_value) }} {{ selected.duration_unit === "dias" ? "días" : "horas" }}
                  <ng-container *ngIf="selected.my_hours"> · tú: {{ num(selected.my_hours) }}</ng-container>
                </strong>
              </div>
              <div *ngIf="selected.completion_date">
                <ion-icon name="flag-outline"></ion-icon>
                <span>Terminado</span><strong>{{ fmtDate(selected.completion_date) }} {{ fmtTime(selected.completion_time) }}</strong>
              </div>
              <div *ngIf="selected.price_amount != null">
                <ion-icon name="cash-outline"></ion-icon>
                <span>Precio</span>
                <strong>{{ eur(selected.price_amount) }}{{ selected.price_type === "hora" ? " por hora" : selected.price_type === "dia" ? " por día" : " (fijo)" }}</strong>
              </div>
              <div *ngIf="selected.closed_price != null">
                <ion-icon name="wallet-outline"></ion-icon>
                <span>Cobrado</span><strong>{{ eur(selected.closed_price) }}</strong>
              </div>
            </div>

            <div class="enc-photos" *ngIf="selected.is_mine">
              <app-job-photos [jobId]="selected.id" [canUpload]="false"></app-job-photos>
            </div>

            <div class="jf-banner warn" *ngIf="selected.status === 'pendiente_revision'">
              <ion-icon name="hourglass-outline"></ion-icon>
              <div><strong>En revisión.</strong> La secretaría está comprobando las horas. No se puede modificar hasta que lo apruebe o te lo devuelva.</div>
            </div>
            <div class="jf-banner ok" *ngIf="selected.status === 'finalizado'">
              <ion-icon name="shield-checkmark-outline"></ion-icon>
              <div>Trabajo aprobado y cerrado.</div>
            </div>
            <div class="jf-banner danger" *ngIf="selected.return_reason && selected.status !== 'pendiente_revision' && selected.status !== 'finalizado'">
              <ion-icon name="alert-circle-outline"></ion-icon>
              <div><strong>Devuelto para corregir:</strong> {{ selected.return_reason }}</div>
            </div>

            <button type="button" class="jf-btn primary" *ngIf="canClose(selected)" (click)="closing = true">
              <ion-icon name="flag-outline"></ion-icon>
              {{ selected.return_reason ? "Corregir y reenviar" : "Trabajo terminado" }}
            </button>
            <p class="jf-hint" *ngIf="selected.status === 'pendiente'">
              Este trabajo aún está pendiente de confirmar. Se podrá terminar cuando esté confirmado.
            </p>
            <p class="jf-hint" *ngIf="blockedByOther(selected)">
              Este trabajo lo lleva {{ selected.encargado_name }}. Solo él puede terminarlo.
            </p>
          </div>

          <div style="padding: 0 16px" *ngIf="selected && closing">
            <app-job-close-form [job]="selected" (saved)="afterClose()" (cancel)="closing = false"></app-job-close-form>
          </div>
        </ion-content>
      </ng-template>
    </ion-modal>

    <app-employee-tabbar></app-employee-tabbar>
  `,
  styles: [
    `
      .enc-photos {
        margin: 4px 0 14px;
        padding: 14px;
        border-radius: 16px;
        background: var(--t-surface);
        border: 1px solid var(--t-border);
      }
      .e-tabs {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 6px;
        padding: 4px;
        background: var(--t-surface-2);
        border: 1px solid var(--t-border);
        border-radius: 14px;
        margin-bottom: 18px;
      }
      .e-tabs button {
        min-height: 44px;
        border: 0;
        border-radius: 11px;
        background: transparent;
        color: var(--t-text-2);
        font: inherit;
        font-size: 13px;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        cursor: pointer;
      }
      .e-tabs button span {
        min-width: 20px;
        height: 20px;
        padding: 0 6px;
        border-radius: 999px;
        background: var(--t-surface-3);
        color: var(--t-text);
        font-size: 11px;
        font-weight: 800;
        display: inline-grid;
        place-items: center;
      }
      .e-tabs button.on {
        background: var(--t-surface);
        color: var(--t-text);
        box-shadow: var(--t-shadow);
      }
      .e-tabs button.on span {
        background: var(--t-primary);
        color: var(--t-on-primary);
      }
      .e-error {
        display: flex;
        gap: 10px;
        padding: 12px 14px;
        border-radius: var(--t-radius-sm);
        background: var(--t-danger-soft);
        color: var(--t-danger);
        font-size: 13px;
        font-weight: 600;
      }
      .t-row {
        cursor: pointer;
      }
      .e-row-end {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 4px;
        flex-shrink: 0;
      }
      .e-status {
        font-size: 11px;
        font-weight: 800;
        padding: 4px 9px;
        border-radius: 999px;
        background: var(--t-surface-3);
        color: var(--t-text);
        white-space: nowrap;
      }
      .e-status[data-s="pendiente"] {
        background: var(--t-warning-soft);
        color: var(--t-warning);
      }
      .e-status[data-s="confirmado"],
      .e-status[data-s="en_curso"] {
        background: var(--t-primary-soft);
        color: var(--t-primary);
      }
      .e-status[data-s="pendiente_revision"] {
        background: var(--t-purple-soft);
        color: var(--t-purple);
      }
      .e-status[data-s="finalizado"] {
        background: var(--t-success-soft);
        color: var(--t-success);
      }
      .e-mine {
        font-size: 10px;
        font-weight: 800;
        color: var(--t-primary);
      }
      .e-sheet {
        display: flex;
        flex-direction: column;
        gap: 14px;
        padding: 6px 16px 28px;
      }
      .e-sheet-title {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
      }
      .e-sheet-title strong {
        font-size: 22px;
        font-weight: 800;
        color: var(--t-text);
      }
      .e-info {
        display: flex;
        flex-direction: column;
        border-radius: var(--t-radius);
        border: 1px solid var(--t-border);
        background: var(--t-surface);
        overflow: hidden;
      }
      .e-info > div,
      .e-info > a {
        display: grid;
        grid-template-columns: 22px 92px 1fr;
        align-items: center;
        gap: 10px;
        padding: 13px 14px;
        border-bottom: 1px solid var(--t-border);
        text-decoration: none;
      }
      .e-info > *:last-child {
        border-bottom: 0;
      }
      .e-info ion-icon {
        font-size: 18px;
        color: var(--t-primary);
      }
      .e-info span {
        font-size: 12px;
        font-weight: 600;
        color: var(--t-muted);
      }
      .e-info strong {
        font-size: 14px;
        font-weight: 700;
        color: var(--t-text);
        text-align: right;
        word-break: break-word;
      }
      .e-info strong.link {
        color: var(--t-primary);
      }
    `,
  ],
})
export class EncargadoTrabajosPage implements OnInit, OnDestroy {
  cursor = new MonthCursor();
  jobs: EncargadoJob[] = [];
  group: JobGroup = "confirmados";
  readonly groups: JobGroup[] = ["confirmados", "terminados"];
  readonly groupLabel = GROUP_LABEL;
  loading = true;
  error = "";
  myId = "";

  selected: EncargadoJob | null = null;
  closing = false;

  private sub?: Subscription;
  private requestId = 0;

  readonly day = day;
  readonly monthShort = monthShort;
  readonly fmtDate = fmtDate;
  readonly fmtTime = fmtTime;
  readonly typeLabel = typeLabel;
  readonly num = num;
  readonly eur = eur;

  constructor(
    private readonly supabase: SupabaseService,
    private readonly route: ActivatedRoute,
  ) {
    addIcons({
      chevronBackOutline,
      chevronForwardOutline,
      calendarOutline,
      checkmarkCircleOutline,
      checkmarkDoneCircleOutline,
      personOutline,
      callOutline,
      locationOutline,
      timeOutline,
      closeOutline,
      flagOutline,
      hourglassOutline,
      alertCircleOutline,
      briefcaseOutline,
      shieldCheckmarkOutline,
      personCircleOutline,
      cashOutline,
      walletOutline,
    });
  }

  ngOnInit() {
    this.sub = this.route.queryParamMap.subscribe((q) => {
      const f = q.get("f") as JobGroup | null;
      if (f && this.groups.includes(f)) this.group = f;
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  async ionViewWillEnter() {
    if (!this.myId) {
      const user = await this.supabase.getCurrentUser().catch(() => null);
      this.myId = user?.id ?? "";
    }
    await this.load();
  }

  get visible(): EncargadoJob[] {
    const list = this.jobs.filter((j) => groupOf(j.status) === this.group);
    // Terminados: lo más reciente arriba. El resto: por fecha.
    return this.group === "terminados" ? [...list].reverse() : list;
  }

  count(g: JobGroup) {
    return this.jobs.filter((j) => groupOf(j.status) === g).length;
  }

  statusLabel(s: string) {
    return JOB_STATUS_LABELS[s] ?? s;
  }

  async shift(delta: number) {
    this.cursor.shift(delta);
    await this.load();
  }

  async refresh(event: any) {
    await this.load();
    event?.target?.complete?.();
  }

  async load() {
    const id = ++this.requestId; // evita que una respuesta lenta pise otro mes
    this.loading = true;
    this.error = "";
    try {
      const jobs = await this.supabase.getEncargadoJobs(this.cursor.year, this.cursor.month);
      if (id !== this.requestId) return;
      this.jobs = jobs;
    } catch (e: any) {
      if (id !== this.requestId) return;
      this.jobs = [];
      this.error = e?.message || "No se pudieron cargar los trabajos.";
    } finally {
      if (id === this.requestId) this.loading = false;
    }
  }

  canClose(j: EncargadoJob) {
    return (
      (j.status === "confirmado" || j.status === "en_curso") &&
      j.encargado_id === this.myId
    );
  }

  blockedByOther(j: EncargadoJob) {
    return (
      (j.status === "confirmado" || j.status === "en_curso") &&
      !!j.encargado_id &&
      j.encargado_id !== this.myId
    );
  }

  open(j: EncargadoJob) {
    this.closing = false;
    this.selected = j;
  }

  closeModal() {
    this.selected = null;
    this.closing = false;
  }

  async afterClose() {
    this.closeModal();
    this.group = "terminados";
    await this.load();
  }
}
