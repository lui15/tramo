import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router } from "@angular/router";
import { IonContent, IonIcon, IonRefresher, IonRefresherContent } from "@ionic/angular/standalone";
import { addIcons } from "ionicons";
import {
  chevronBackOutline,
  chevronForwardOutline,
  chevronDownOutline,
  chevronUpOutline,
  cashOutline,
  briefcaseOutline,
  alertCircleOutline,
  walletOutline,
  timeOutline,
  calendarOutline,
  checkmarkCircleOutline,
  flashOutline,
} from "ionicons/icons";

import { PageHeaderComponent } from "../../components/page-header.component";
import { EmployeeTabbarComponent } from "../../components/employee-tabbar.component";
import { SecretaryTabbarComponent } from "../../components/secretary-tabbar.component";
import { MyMoney, SupabaseService } from "../../services/supabase.service";
import { MONEY_STYLES } from "../employee/finanzas/finanzas.styles";
import { MonthCursor, eur, fmtDate, fmtTime, monthLabelFromKey, num, typeLabel } from "./encargado.shared";

interface FeedItem {
  kind: "trabajo" | "saldo";
  date: string;
  time: string | null;
  title: string;
  detail: string;
  amount: number | null;
  review?: boolean;
  note?: string | null;
}

// =====================================================================
// MI DINERO (encargado, ayudante con sueldo fijo y secretaría)
// Mismo diseño que el "Mi dinero" del ayudante por horas. Los datos
// salen de mi_dinero(año, mes): solo del usuario conectado y de ESE mes.
//   - Sueldo fijo: "Sueldo de este mes" = sueldo acordado; los trabajos
//     no suman dinero ("En tu sueldo").
//   - Por hora / día: "Generado" = horas o días validados × tarifa.
//   Pendiente = base − adelantos − pagos del mes.
// =====================================================================
@Component({
  selector: "app-encargado-dinero",
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonIcon,
    IonRefresher,
    IonRefresherContent,
    PageHeaderComponent,
    EmployeeTabbarComponent,
    SecretaryTabbarComponent,
  ],
  template: `
    <app-page-header title="Mi dinero" subtitle="Mis cuentas"></app-page-header>

    <ion-content class="fin-content">
      <ion-refresher slot="fixed" (ionRefresh)="refresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <div class="fin-wrap">
        <div class="md-error" *ngIf="error">
          <ion-icon name="alert-circle-outline"></ion-icon><span>{{ error }}</span>
        </div>

        <!-- HERO -->
        <section class="hero-card" [class.md-dim]="loading">
          <div class="hero-top-line"></div>

          <div class="hero-icon-wrapper">
            <div class="hero-icon-circle">
              <ion-icon name="wallet-outline"></ion-icon>
            </div>
          </div>

          <span class="hero-label">{{ isFixed ? "SUELDO DE ESTE MES" : "GENERADO" }}</span>

          <div class="hero-value">
            {{ (money ? (isFixed ? money.base : money.earned) : 0) | number: "1.2-2" }}
            <small>€</small>
          </div>

          <div class="hero-rule"></div>

          <span class="hero-sub">{{ heroSub }}</span>

          <div class="hero-wave"></div>
        </section>

        <!-- ESTADÍSTICAS -->
        <section class="stat-row">
          <div class="stat-card pendiente">
            <div class="stat-icon"><ion-icon name="time-outline"></ion-icon></div>
            <div class="stat-info">
              <span class="stat-label">PENDIENTE</span>
              <span class="stat-value">{{ (money?.pending || 0) | number: "1.2-2" }} <small>€</small></span>
            </div>
            <div class="stat-decoration"></div>
          </div>

          <div class="stat-card pagado">
            <div class="stat-icon"><ion-icon name="checkmark-circle-outline"></ion-icon></div>
            <div class="stat-info">
              <span class="stat-label">{{ (money?.payments || 0) > 0 ? "COBRADO" : "ADELANTOS" }}</span>
              <span class="stat-value">{{ received | number: "1.2-2" }} <small>€</small></span>
            </div>
            <div class="stat-decoration"></div>
          </div>

          <div class="stat-card trabajos">
            <div class="stat-icon"><ion-icon name="briefcase-outline"></ion-icon></div>
            <div class="stat-info">
              <span class="stat-label">TRABAJOS</span>
              <span class="stat-value">{{ money?.jobs_done || 0 }}</span>
            </div>
            <div class="stat-decoration"></div>
          </div>
        </section>

        <!-- MES -->
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

        <!-- ACTIVIDAD DEL MES -->
        <section class="activity-section">
          <div class="section-header">
            <div class="section-title-wrapper">
              <div class="section-icon"><ion-icon name="cash-outline"></ion-icon></div>
              <div class="section-title-text">
                <h3>{{ isSecretary ? "MIS PAGOS DE" : "MIS TRABAJOS DE" }} {{ monthTitle }}</h3>
                <span>{{ isSecretary ? "Sueldo, adelantos y pagos recibidos" : "Trabajos realizados y pagos recibidos" }}</span>
              </div>
            </div>
          </div>

          <div class="ledger-scroll" *ngIf="feed.length > 0">
            <div class="ledger">
              <div class="ledger-row" *ngFor="let item of feed" [class.payment-row]="item.kind === 'saldo'">
                <div class="activity-icon" [class.income]="item.kind === 'trabajo'" [class.payment]="item.kind === 'saldo'">
                  <ion-icon [name]="item.kind === 'trabajo' ? 'briefcase-outline' : 'cash-outline'"></ion-icon>
                </div>

                <div class="ledger-main">
                  <span class="ledger-type" [class.payment-title]="item.kind === 'saldo'">{{ item.title }}</span>
                  <span class="ledger-description">
                    <span class="data-item">
                      <ion-icon name="calendar-outline"></ion-icon>
                      {{ fmtDate(item.date) }}
                    </span>
                    <span class="data-item" *ngIf="item.time">
                      <ion-icon name="time-outline"></ion-icon>
                      {{ fmtTime(item.time) }}
                    </span>
                  </span>
                  <span class="ledger-work-duration" [class.md-review]="item.review">{{ item.detail }}</span>
                </div>

                <div class="ledger-right">
                  <span *ngIf="item.kind === 'trabajo' && item.amount !== null" class="ledger-amount income">
                    +{{ item.amount | number: "1.2-2" }} €
                  </span>
                  <span *ngIf="item.kind === 'saldo'" class="ledger-amount payment-amount">
                    -{{ item.amount | number: "1.2-2" }} €
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div class="empty-state" *ngIf="!loading && feed.length === 0">
            <div class="empty-icon-wrapper">
              <div class="empty-icon"><ion-icon name="briefcase-outline"></ion-icon></div>
            </div>
            <h4>No tienes actividad este mes</h4>
            <p>
              Cuando tengas {{ isSecretary ? "adelantos o pagos" : "trabajos realizados o pagos recibidos" }} en
              {{ cursor.name | lowercase }}, aparecerán aquí.
            </p>
          </div>
        </section>

        <!-- TODOS LOS ADELANTOS (todos los meses) -->
        <section class="md-all" *ngIf="money?.advances_all?.length">
          <button type="button" class="md-toggle" (click)="showAll = !showAll">
            <span>Todos mis adelantos ({{ money!.advances_all.length }})</span>
            <ion-icon [name]="showAll ? 'chevron-up-outline' : 'chevron-down-outline'"></ion-icon>
          </button>
          <div class="md-all-list" *ngIf="showAll">
            <div class="md-all-row" *ngFor="let a of money!.advances_all">
              <ion-icon name="flash-outline"></ion-icon>
              <div>
                <strong>{{ eur(a.amount) }}</strong>
                <span>{{ fmtDate(a.settlement_date) }} · {{ monthLabel(a.month) }}<ng-container *ngIf="a.note"> · {{ a.note }}</ng-container></span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </ion-content>

    <div class="employee-tabbar-container">
      <app-secretary-tabbar *ngIf="isSecretary; else empBar"></app-secretary-tabbar>
      <ng-template #empBar><app-employee-tabbar></app-employee-tabbar></ng-template>
    </div>
  `,
  styles: [
    MONEY_STYLES,
    `
      .md-error {
        display: flex;
        gap: 10px;
        align-items: center;
        margin-bottom: 14px;
        padding: 12px 14px;
        border-radius: 14px;
        background: var(--t-danger-soft);
        color: var(--t-danger);
        font-size: 13px;
        font-weight: 600;
      }
      .md-dim {
        opacity: 0.6;
        transition: opacity 0.15s;
      }
      .md-review {
        color: var(--t-warning) !important;
        font-weight: 700;
      }
      .md-all {
        margin-top: 16px;
      }
      .md-toggle {
        width: 100%;
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 14px 16px;
        border-radius: 16px;
        border: 1px solid var(--t-border);
        background: var(--t-surface);
        color: var(--t-text);
        font: inherit;
        font-size: 14px;
        font-weight: 800;
      }
      .md-all-list {
        display: grid;
        gap: 8px;
        margin-top: 10px;
      }
      .md-all-row {
        display: flex;
        gap: 12px;
        align-items: center;
        padding: 12px 14px;
        border-radius: 14px;
        background: var(--t-surface);
        border: 1px solid var(--t-border);
      }
      .md-all-row ion-icon {
        color: var(--t-warning);
        font-size: 20px;
      }
      .md-all-row div {
        display: grid;
        gap: 2px;
      }
      .md-all-row strong {
        color: var(--t-text);
      }
      .md-all-row span {
        font-size: 12px;
        color: var(--t-muted);
      }
    `,
  ],
})
export class EncargadoDineroPage {
  cursor = new MonthCursor();
  money: MyMoney | null = null;
  feed: FeedItem[] = [];
  loading = true;
  error = "";
  showAll = false;
  readonly isSecretary: boolean;
  private requestId = 0;

  readonly eur = eur;
  readonly fmtDate = fmtDate;
  readonly fmtTime = fmtTime;

  constructor(
    private readonly supabase: SupabaseService,
    router: Router,
  ) {
    this.isSecretary = router.url.startsWith("/secretaria");
    addIcons({
      chevronBackOutline,
      chevronForwardOutline,
      chevronDownOutline,
      chevronUpOutline,
      cashOutline,
      briefcaseOutline,
      alertCircleOutline,
      walletOutline,
      timeOutline,
      calendarOutline,
      checkmarkCircleOutline,
      flashOutline,
    });
  }

  get isFixed(): boolean {
    return (this.money?.mode ?? "fijo") === "fijo";
  }

  get received(): number {
    return (Number(this.money?.advances) || 0) + (Number(this.money?.payments) || 0);
  }

  get monthTitle(): string {
    return `${this.cursor.name} de ${this.cursor.year}`.toUpperCase();
  }

  get heroSub(): string {
    const m = this.money;
    if (!m) return this.loading ? "Cargando…" : "";
    if ((m as any).salary_missing) return "Tu sueldo mensual aún no está configurado. Pídeselo al administrador.";
    if (m.mode === "fijo") return "Tu sueldo acordado · los trabajos van incluidos";
    if (m.mode === "dia") return `${eur(m.rate)} por día · ${num(m.days)} días validados`;
    return `${eur(m.rate)} por hora · ${num(m.hours)} h validadas`;
  }

  async ionViewWillEnter() {
    await this.load();
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
    const id = ++this.requestId;
    this.loading = true;
    this.error = "";
    try {
      const money = await this.supabase.getMyMoney(this.cursor.year, this.cursor.month);
      if (id !== this.requestId) return;
      this.money = money;
      this.feed = this.buildFeed(money);
    } catch (e: any) {
      if (id !== this.requestId) return;
      this.money = null;
      this.feed = [];
      this.error = e?.message || "No se pudo cargar tu dinero.";
    } finally {
      if (id === this.requestId) this.loading = false;
    }
  }

  private buildFeed(m: MyMoney): FeedItem[] {
    const fixed = m.mode === "fijo";
    const jobs: FeedItem[] = (m.jobs ?? []).map((j) => {
      const review = j.status === "pendiente_revision";
      const dur = `${num(j.hours_or_days)} ${j.duration_unit === "dias" ? "días" : "horas"}`;
      return {
        kind: "trabajo",
        date: j.job_date,
        time: j.start_time,
        title: typeLabel(j.job_type),
        detail: review ? `${dur} · En revisión` : fixed ? `${dur} · En tu sueldo` : dur,
        amount: fixed || review || j.amount_earned === null ? null : Number(j.amount_earned),
        review,
      };
    });
    const pays: FeedItem[] = (m.settlements ?? []).map((s) => ({
      kind: "saldo",
      date: s.settlement_date,
      time: s.settlement_time ?? null,
      title: s.kind === "adelanto" ? "Adelanto" : s.kind === "salario" ? "Salario" : "Pago",
      detail: s.note || (s.kind === "adelanto" ? "Adelanto recibido" : "Pago recibido"),
      amount: Number(s.amount),
      note: s.note,
    }));
    return [...jobs, ...pays].sort((a, b) =>
      `${b.date} ${b.time ?? ""}`.localeCompare(`${a.date} ${a.time ?? ""}`),
    );
  }

  monthLabel(key?: string) {
    return monthLabelFromKey(key);
  }
}
