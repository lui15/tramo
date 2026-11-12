import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterLink } from "@angular/router";
import {
  IonContent,
  IonIcon,
  IonRefresher,
  IonRefresherContent,
} from "@ionic/angular/standalone";
import { addIcons } from "ionicons";
import {
  trendingUpOutline,
  trendingDownOutline,
  briefcaseOutline,
  peopleOutline,
  walletOutline,
  timeOutline,
  notificationsOutline,
  carOutline,
  calendarOutline,
  chevronForwardOutline,
  cashOutline,
  checkmarkDoneOutline,
  hourglassOutline,
} from "ionicons/icons";

import { PageHeaderComponent } from "../../../components/page-header.component";
import { AdminTabbarComponent } from "../../../components/admin-tabbar.component";
import { SupabaseService } from "../../../services/supabase.service";
import {
  NotificationsService,
  AppNotification,
} from "../../../services/notifications.service";

const TYPE_LABEL: Record<string, string> = {
  mudanza: "Mudanza",
  montaje: "Montaje",
  reforma: "Reforma",
};

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

// =====================================================
// INICIO DEL ADMINISTRADOR
// =====================================================
@Component({
  selector: "app-admin-inicio",
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    IonContent,
    IonIcon,
    IonRefresher,
    IonRefresherContent,
    PageHeaderComponent,
    AdminTabbarComponent,
  ],
  template: `
    <app-page-header [greeting]="true"></app-page-header>

    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="refresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <div class="t-page">
        <!-- RESUMEN DEL MES -->
        <section class="t-hero">
          <span class="t-hero-label">Resultado de {{ monthLabel }}</span>
          <span class="t-hero-value">{{ result | number: "1.2-2" }} €</span>
          <span class="t-hero-sub">Ingresos de trabajos finalizados − gastos del mes</span>

          <div class="t-hero-grid">
            <div class="t-hero-mini">
              <span>Ingresos</span>
              <strong>{{ income | number: "1.0-0" }} €</strong>
            </div>
            <div class="t-hero-mini">
              <span>Gastos</span>
              <strong>{{ expenses | number: "1.0-0" }} €</strong>
            </div>
            <div class="t-hero-mini">
              <span>Trabajos</span>
              <strong>{{ finishedCount }}</strong>
            </div>
          </div>
        </section>


        <a class="jf-alert" *ngIf="reviewCount" routerLink="/admin/trabajos">
          <ion-icon name="hourglass-outline"></ion-icon>
          <span>
            <strong>{{ reviewCount }} {{ reviewCount === 1 ? "trabajo espera" : "trabajos esperan" }} tu revisión</strong>
            Revisa las horas y aprueba para que el equipo cobre.
          </span>
          <ion-icon name="chevron-forward-outline"></ion-icon>
        </a>

        <!-- INDICADORES -->
        <section class="t-section t-kpis">
          <div class="t-kpi">
            <div class="t-kpi-icon tone-blue"><ion-icon name="calendar-outline"></ion-icon></div>
            <span class="t-kpi-label">Próximos trabajos</span>
            <span class="t-kpi-value">{{ upcomingCount }}</span>
          </div>
          <div class="t-kpi">
            <div class="t-kpi-icon tone-green"><ion-icon name="people-outline"></ion-icon></div>
            <span class="t-kpi-label">Equipo activo</span>
            <span class="t-kpi-value">{{ teamCount }}</span>
          </div>
          <div class="t-kpi">
            <div class="t-kpi-icon tone-orange"><ion-icon name="cash-outline"></ion-icon></div>
            <span class="t-kpi-label">Pendiente de pagar</span>
            <span class="t-kpi-value">{{ pendingPay | number: "1.0-0" }} €</span>
          </div>
          <div class="t-kpi">
            <div class="t-kpi-icon tone-purple"><ion-icon name="notifications-outline"></ion-icon></div>
            <span class="t-kpi-label">Avisos sin leer</span>
            <span class="t-kpi-value">{{ (notifications.unread$ | async) ?? 0 }}</span>
          </div>
        </section>

        <!-- ACCESOS RÁPIDOS -->
        <section class="t-section">
          <div class="t-section-head"><h2>Accesos rápidos</h2></div>
          <div class="t-tiles">
            <a class="t-tile" routerLink="/admin/finanzas">
              <span class="t-tile-icon tone-green"><ion-icon name="wallet-outline"></ion-icon></span>
              <span class="t-tile-label">Finanzas</span>
            </a>
            <a class="t-tile" routerLink="/admin/colaboradores">
              <span class="t-tile-icon tone-blue"><ion-icon name="people-outline"></ion-icon></span>
              <span class="t-tile-label">Colaboradores</span>
            </a>
            <a class="t-tile" routerLink="/admin/trabajos">
              <span class="t-tile-icon tone-orange"><ion-icon name="briefcase-outline"></ion-icon></span>
              <span class="t-tile-label">Trabajos</span>
            </a>
            <a class="t-tile" routerLink="/admin/historial">
              <span class="t-tile-icon tone-purple"><ion-icon name="time-outline"></ion-icon></span>
              <span class="t-tile-label">Historial</span>
            </a>
            <a class="t-tile" routerLink="/notificaciones">
              <span class="t-tile-icon tone-red"><ion-icon name="notifications-outline"></ion-icon></span>
              <span class="t-tile-label">Avisos</span>
            </a>
            <a class="t-tile" routerLink="/admin/vehiculos">
              <span class="t-tile-icon tone-blue"><ion-icon name="car-outline"></ion-icon></span>
              <span class="t-tile-label">Vehículos</span>
            </a>
          </div>
        </section>

        <!-- PRÓXIMOS TRABAJOS -->
        <section class="t-section">
          <div class="t-section-head">
            <h2>Próximos trabajos</h2>
            <a routerLink="/admin/trabajos">Ver todos</a>
          </div>

          <div class="t-skeleton" *ngIf="loading"></div>

          <div class="t-list" *ngIf="!loading">
            <a class="t-row" *ngFor="let j of upcoming" routerLink="/admin/trabajos">
              <div class="t-date">
                <strong>{{ day(j.job_date) }}</strong>
                <span>{{ month(j.job_date) }}</span>
              </div>
              <div class="t-row-main">
                <strong>{{ typeLabel(j.job_type) }} · {{ j.client_name }}</strong>
                <span>{{ (j.start_time || "").slice(0, 5) }} · {{ address(j) }}</span>
              </div>
              <span class="t-badge" [ngClass]="statusTone(j.status)">{{ statusLabel(j.status) }}</span>
            </a>
            <div class="t-empty" *ngIf="upcoming.length === 0">
              <ion-icon name="calendar-outline"></ion-icon>
              No hay trabajos programados.
            </div>
          </div>
        </section>

        <!-- ÚLTIMOS AVISOS -->
        <section class="t-section">
          <div class="t-section-head">
            <h2>Últimos avisos</h2>
            <a routerLink="/notificaciones">Ver todos</a>
          </div>
          <div class="t-list">
            <a
              class="t-row"
              *ngFor="let n of recent"
              [routerLink]="n.data['route'] || '/notificaciones'"
            >
              <div class="t-row-icon tone-blue"><ion-icon name="notifications-outline"></ion-icon></div>
              <div class="t-row-main">
                <strong>{{ n.title }}</strong>
                <span>{{ n.body }}</span>
              </div>
              <ion-icon class="chev" name="chevron-forward-outline"></ion-icon>
            </a>
            <div class="t-empty" *ngIf="!loading && recent.length === 0">
              <ion-icon name="checkmark-done-outline"></ion-icon>
              Todo al día. No hay avisos recientes.
            </div>
          </div>
        </section>
      </div>
    </ion-content>

    <app-admin-tabbar></app-admin-tabbar>
  `,
  styles: [
    `
      .chev {
        color: var(--t-faint);
        font-size: 18px;
      }
    `,
  ],
})
export class AdminInicioPage {
  loading = true;
  reviewCount = 0;
  income = 0;
  expenses = 0;
  result = 0;
  finishedCount = 0;
  upcomingCount = 0;
  teamCount = 0;
  pendingPay = 0;
  upcoming: any[] = [];
  recent: AppNotification[] = [];

  readonly monthLabel = new Date().toLocaleDateString("es-ES", { month: "long", year: "numeric" });

  constructor(
    private readonly supabase: SupabaseService,
    readonly notifications: NotificationsService,
  ) {
    addIcons({
      trendingUpOutline,
      trendingDownOutline,
      briefcaseOutline,
      peopleOutline,
      walletOutline,
      timeOutline,
      notificationsOutline,
      carOutline,
      calendarOutline,
      chevronForwardOutline,
      cashOutline,
      checkmarkDoneOutline,
      hourglassOutline,
    });
  }

  async ionViewWillEnter() {
    await this.load();
  }

  async refresh(event: any) {
    await this.load();
    event?.target?.complete?.();
  }

  async load() {
    this.loading = this.upcoming.length === 0;

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const monthPrefix = `${year}-${String(month).padStart(2, "0")}`;
    const today = this.isoDate(now);

    try {
      const [jobs, monthExpenses, team, recent] = await Promise.all([
        this.supabase.getAllJobs(),
        this.supabase.getExpensesByMonth(year, month),
        this.supabase.getAllEmployees(),
        this.notifications.list(4).catch(() => []),
      ]);

      const finished = (jobs ?? []).filter(
        (j: any) =>
          j.status === "finalizado" &&
          String(j.completion_date || j.job_date || "").startsWith(monthPrefix),
      );

      this.income = finished.reduce((t: number, j: any) => t + (Number(j.total_cost) || 0), 0);
      this.finishedCount = finished.length;
      this.expenses = monthExpenses.reduce((t, e) => t + (Number(e.amount) || 0), 0);
      this.result = this.income - this.expenses;

      const pending = (jobs ?? [])
        .filter((j: any) => j.status !== "finalizado" && j.status !== "pendiente_revision" && String(j.job_date) >= today)
        .sort((a: any, b: any) =>
          `${a.job_date} ${a.start_time}`.localeCompare(`${b.job_date} ${b.start_time}`),
        );

      this.reviewCount = (jobs ?? []).filter((j: any) => j.status === "pendiente_revision").length;
      this.upcomingCount = pending.length;
      this.upcoming = pending.slice(0, 5);

      const activeTeam = team.filter(
        (p) => p.account_status === "activo" && p.is_active && !p.deleted_at,
      );
      this.teamCount = activeTeam.length;
      this.pendingPay = activeTeam
        .filter((p) => p.payment_method === "acumulativo")
        .reduce((t, p) => t + Math.max(0, Number(p.accumulated_balance) || 0), 0);

      this.recent = recent;
    } finally {
      this.loading = false;
    }
  }

  typeLabel(t: string) {
    return TYPE_LABEL[t] ?? "Trabajo";
  }

  statusLabel(s: string) {
    return (
      { pendiente: "Pendiente", confirmado: "Confirmado", en_curso: "En curso", pendiente_revision: "En revisión", finalizado: "Finalizado" } as any
    )[s] ?? s;
  }

  statusTone(s: string) {
    return (
      { pendiente: "tone-orange", confirmado: "tone-blue", en_curso: "tone-purple", pendiente_revision: "tone-orange", finalizado: "tone-green" } as any
    )[s] ?? "tone-gray";
  }

  address(j: any) {
    return j.job_type === "mudanza"
      ? [j.pickup_point, j.dropoff_point].filter(Boolean).join(" → ")
      : j.work_point || "Sin dirección";
  }

  day(d: string) {
    return String(d || "").slice(8, 10);
  }

  month(d: string) {
    return MONTHS[Number(String(d || "").slice(5, 7)) - 1] ?? "";
  }

  private isoDate(d: Date) {
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }
}
