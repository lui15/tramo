import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterLink } from "@angular/router";
import { IonContent, IonIcon, IonRefresher, IonRefresherContent } from "@ionic/angular/standalone";
import { addIcons } from "ionicons";
import {
  walletOutline,
  timeOutline,
  sunnyOutline,
  calendarOutline,
  checkmarkCircleOutline,
  checkmarkDoneCircleOutline,
  hourglassOutline,
  chevronForwardOutline,
  alertCircleOutline,
  briefcaseOutline,
} from "ionicons/icons";

import { PageHeaderComponent } from "../../components/page-header.component";
import { EmployeeTabbarComponent } from "../../components/employee-tabbar.component";
import { EncargadoJob, MyMoney, SupabaseService } from "../../services/supabase.service";
import {
  MODE_EXPLAIN,
  MODE_LABEL,
  MonthCursor,
  day,
  eur,
  fmtTime,
  groupOf,
  monthShort,
  num,
  typeLabel,
} from "./encargado.shared";

// =====================================================================
// INICIO DEL ENCARGADO
//  1. Cuánto y cómo cobra (según su modalidad real)
//  2. Trabajos del mes: confirmados / terminados
//  3. Actividad y dinero del mes según su modalidad
// =====================================================================
@Component({
  selector: "app-encargado-inicio",
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    IonContent,
    IonIcon,
    IonRefresher,
    IonRefresherContent,
    PageHeaderComponent,
    EmployeeTabbarComponent,
  ],
  template: `
    <app-page-header [greeting]="true"></app-page-header>

    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="refresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <div class="t-page">
        <div class="e-error" *ngIf="error">
          <ion-icon name="alert-circle-outline"></ion-icon>
          <span>{{ error }}</span>
        </div>

        <!-- 1. REMUNERACIÓN -->
        <section class="e-pay" *ngIf="money; else paySkeleton">
          <div class="e-pay-top">
            <span class="e-pill">
              <ion-icon [name]="modeIcon"></ion-icon>
              {{ modeLabel }}
            </span>
            <span class="e-pay-name">{{ money.full_name }}</span>
          </div>

          <div class="e-pay-amount">
            {{ eur(money.rate) }}
            <small>{{ money.mode === "fijo" ? "al mes" : money.mode === "hora" ? "por hora" : "por día" }}</small>
          </div>
          <p class="e-pay-explain">{{ modeExplain }}</p>
        </section>
        <ng-template #paySkeleton><div class="t-skeleton" style="height: 150px"></div></ng-template>

        <!-- 2. TRABAJOS DEL MES -->
        <section class="t-section">
          <div class="t-section-head">
            <h2>Trabajos de {{ cursor.name | lowercase }}</h2>
            <a routerLink="/employee/trabajos">Ver todos</a>
          </div>

          <div class="e-groups">
            <a class="e-group" routerLink="/employee/trabajos" [queryParams]="{ f: 'confirmados' }">
              <span class="e-group-icon tone-blue"><ion-icon name="checkmark-circle-outline"></ion-icon></span>
              <strong>{{ loading ? "–" : count("confirmados") }}</strong>
              <span>Confirmados</span>
            </a>
            <a class="e-group" routerLink="/employee/trabajos" [queryParams]="{ f: 'terminados' }">
              <span class="e-group-icon tone-green"><ion-icon name="checkmark-done-circle-outline"></ion-icon></span>
              <strong>{{ loading ? "–" : count("terminados") }}</strong>
              <span>Terminados</span>
            </a>
          </div>
        </section>

        <!-- 3. DINERO DEL MES (solo por hora / por día) -->
        <section class="t-section" *ngIf="money && money.mode !== 'fijo'">
          <div class="t-section-head">
            <h2>Tu dinero de {{ cursor.name | lowercase }}</h2>
            <a routerLink="/employee/finanzas">Mi dinero</a>
          </div>
          <div class="e-stats">
            <div>
              <span>{{ money.mode === "hora" ? "Horas validadas" : "Jornadas validadas" }}</span>
              <strong>{{ num(money.mode === "hora" ? money.hours : money.days) }}</strong>
            </div>
            <div>
              <span>Acumulado</span>
              <strong>{{ eur(money.earned) }}</strong>
            </div>
            <div>
              <span>Por cobrar</span>
              <strong class="accent">{{ eur(money.pending) }}</strong>
            </div>
          </div>
          <p class="e-note" *ngIf="money.jobs_in_review">
            <ion-icon name="hourglass-outline"></ion-icon>
            {{ money.jobs_in_review }} {{ money.jobs_in_review === 1 ? "trabajo está" : "trabajos están" }} en revisión;
            sumarán cuando la secretaría los apruebe.
          </p>
        </section>

        <!-- 4. TRABAJOS REALIZADOS ESTE MES -->
        <section class="t-section">
          <div class="t-section-head">
            <h2>Realizados este mes</h2>
            <a routerLink="/employee/trabajos" [queryParams]="{ f: 'terminados' }" *ngIf="done.length">Ver todos</a>
          </div>
          <div class="t-skeleton" *ngIf="loading"></div>
          <div class="t-list" *ngIf="!loading">
            <a class="t-row" *ngFor="let j of done.slice(0, 5)" routerLink="/employee/trabajos" [queryParams]="{ f: 'terminados' }">
              <div class="t-date">
                <strong>{{ day(j.job_date) }}</strong>
                <span>{{ monthShort(j.job_date) }}</span>
              </div>
              <div class="t-row-main">
                <strong>{{ typeLabel(j.job_type) }} · {{ j.client_name }}</strong>
                <span>{{ fmtTime(j.start_time) }}<ng-container *ngIf="j.address_info"> · {{ j.address_info }}</ng-container></span>
              </div>
              <span class="e-status" [class.review]="j.status === 'pendiente_revision'">
                {{ j.status === "pendiente_revision" ? "En revisión" : "Finalizado" }}
              </span>
            </a>
            <div class="t-empty" *ngIf="done.length === 0">
              <ion-icon name="briefcase-outline"></ion-icon>
              Todavía no hay trabajos terminados este mes.
            </div>
          </div>
        </section>
      </div>
    </ion-content>

    <app-employee-tabbar></app-employee-tabbar>
  `,
  styles: [
    `
      .e-error {
        display: flex;
        gap: 10px;
        align-items: flex-start;
        padding: 12px 14px;
        border-radius: var(--t-radius-sm);
        background: var(--t-danger-soft);
        color: var(--t-danger);
        font-size: 13px;
        font-weight: 600;
      }
      .e-error ion-icon {
        font-size: 18px;
        flex-shrink: 0;
      }
      .e-pay {
        padding: 20px;
        border-radius: var(--t-radius-lg);
        background: var(--t-surface);
        border: 1px solid var(--t-border);
        box-shadow: var(--t-shadow);
      }
      .e-pay-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
      }
      .e-pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        height: 28px;
        padding: 0 12px;
        border-radius: 999px;
        background: var(--t-primary-soft);
        color: var(--t-primary);
        font-size: 12px;
        font-weight: 800;
      }
      .e-pill ion-icon {
        font-size: 15px;
      }
      .e-pay-name {
        font-size: 13px;
        font-weight: 600;
        color: var(--t-muted);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .e-pay-amount {
        margin-top: 14px;
        font-size: 34px;
        font-weight: 800;
        letter-spacing: -0.8px;
        color: var(--t-text);
        line-height: 1.1;
      }
      .e-pay-amount small {
        font-size: 15px;
        font-weight: 600;
        letter-spacing: 0;
        color: var(--t-muted);
      }
      .e-pay-explain {
        margin: 8px 0 0;
        font-size: 13px;
        line-height: 1.45;
        color: var(--t-text-2);
      }
      .e-groups {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
      }
      .e-group {
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding: 14px 12px;
        border-radius: var(--t-radius);
        background: var(--t-surface);
        border: 1px solid var(--t-border);
        box-shadow: var(--t-shadow);
        color: var(--t-text);
        text-decoration: none;
      }
      .e-group-icon {
        width: 34px;
        height: 34px;
        border-radius: 11px;
        display: grid;
        place-items: center;
        font-size: 18px;
      }
      .e-group strong {
        font-size: 24px;
        font-weight: 800;
        line-height: 1;
        margin-top: 4px;
      }
      .e-group span:last-child {
        font-size: 12px;
        font-weight: 700;
        color: var(--t-text-2);
      }
      .e-stats {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 1px;
        border-radius: var(--t-radius);
        overflow: hidden;
        background: var(--t-border);
        border: 1px solid var(--t-border);
      }
      .e-stats div {
        padding: 14px 12px;
        background: var(--t-surface);
        display: flex;
        flex-direction: column;
        gap: 4px;
        min-width: 0;
      }
      .e-stats span {
        font-size: 11px;
        font-weight: 700;
        color: var(--t-muted);
      }
      .e-stats strong {
        font-size: 16px;
        font-weight: 800;
        color: var(--t-text);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .e-stats strong.accent {
        color: var(--t-primary);
      }
      .e-note {
        display: flex;
        gap: 8px;
        align-items: flex-start;
        margin: 10px 2px 0;
        font-size: 12px;
        line-height: 1.4;
        color: var(--t-warning);
      }
      .e-note ion-icon {
        font-size: 16px;
        flex-shrink: 0;
      }
      .e-status {
        flex-shrink: 0;
        font-size: 11px;
        font-weight: 800;
        padding: 4px 9px;
        border-radius: 999px;
        background: var(--t-success-soft);
        color: var(--t-success);
      }
      .e-status.review {
        background: var(--t-warning-soft);
        color: var(--t-warning);
      }
    `,
  ],
})
export class EncargadoInicioPage {
  cursor = new MonthCursor();
  jobs: EncargadoJob[] = [];
  money: MyMoney | null = null;
  loading = true;
  error = "";

  readonly eur = eur;
  readonly num = num;
  readonly day = day;
  readonly monthShort = monthShort;
  readonly fmtTime = fmtTime;
  readonly typeLabel = typeLabel;

  constructor(private readonly supabase: SupabaseService) {
    addIcons({
      walletOutline,
      timeOutline,
      sunnyOutline,
      calendarOutline,
      checkmarkCircleOutline,
      checkmarkDoneCircleOutline,
      hourglassOutline,
      chevronForwardOutline,
      alertCircleOutline,
      briefcaseOutline,
    });
  }

  get modeLabel() {
    return MODE_LABEL[this.money?.mode ?? "fijo"];
  }

  get modeExplain() {
    return MODE_EXPLAIN[this.money?.mode ?? "fijo"];
  }

  get modeIcon() {
    return this.money?.mode === "hora" ? "time-outline" : this.money?.mode === "dia" ? "sunny-outline" : "wallet-outline";
  }

  get done(): EncargadoJob[] {
    return this.jobs.filter((j) => groupOf(j.status) === "terminados").reverse();
  }

  count(group: string) {
    return this.jobs.filter((j) => groupOf(j.status) === group).length;
  }

  async ionViewWillEnter() {
    this.cursor = new MonthCursor();
    await this.load();
  }

  async refresh(event: any) {
    await this.load();
    event?.target?.complete?.();
  }

  async load() {
    this.error = "";
    try {
      const [jobs, money] = await Promise.all([
        this.supabase.getEncargadoJobs(this.cursor.year, this.cursor.month),
        this.supabase.getMyMoney(this.cursor.year, this.cursor.month),
      ]);
      this.jobs = jobs;
      this.money = money;
    } catch (e: any) {
      this.error = e?.message || "No se pudieron cargar tus datos.";
    } finally {
      this.loading = false;
    }
  }
}
