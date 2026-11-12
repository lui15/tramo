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
  peopleOutline,
  briefcaseOutline,
  notificationsOutline,
  personOutline,
  calendarOutline,
  cashOutline,
  checkmarkDoneOutline,
  hourglassOutline,
  chevronForwardOutline,
  carOutline as tramoCarOutline,
  walletOutline as tramoWalletOutline,
} from "ionicons/icons";

import { PageHeaderComponent } from "../../../components/page-header.component";
import { SecretaryTabbarComponent } from "../../../components/secretary-tabbar.component";
import { SupabaseService, TeamMember } from "../../../services/supabase.service";
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
// INICIO DE SECRETARÍA
// =====================================================
@Component({
  selector: "app-secretary-inicio",
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    IonContent,
    IonIcon,
    IonRefresher,
    IonRefresherContent,
    PageHeaderComponent,
    SecretaryTabbarComponent,
  ],
  template: `
    <app-page-header [greeting]="true"></app-page-header>

    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="refresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <div class="t-page">

        <a class="jf-alert" *ngIf="reviewCount" routerLink="/secretaria/trabajos">
          <ion-icon name="hourglass-outline"></ion-icon>
          <span>
            <strong>{{ reviewCount }} {{ reviewCount === 1 ? "trabajo espera" : "trabajos esperan" }} tu revisión</strong>
            Revisa las horas y aprueba para que el equipo cobre.
          </span>
          <ion-icon name="chevron-forward-outline"></ion-icon>
        </a>

        <section class="t-kpis">
          <div class="t-kpi">
            <div class="t-kpi-icon tone-blue"><ion-icon name="people-outline"></ion-icon></div>
            <span class="t-kpi-label">Equipo activo</span>
            <span class="t-kpi-value">{{ activeCount }}</span>
          </div>
          <div class="t-kpi">
            <div class="t-kpi-icon tone-green"><ion-icon name="briefcase-outline"></ion-icon></div>
            <span class="t-kpi-label">Encargados</span>
            <span class="t-kpi-value">{{ countRole("encargado") }}</span>
          </div>
          <div class="t-kpi">
            <div class="t-kpi-icon tone-orange"><ion-icon name="person-outline"></ion-icon></div>
            <span class="t-kpi-label">Ayudantes</span>
            <span class="t-kpi-value">{{ countRole("ayudante") }}</span>
          </div>
          <div class="t-kpi">
            <div class="t-kpi-icon tone-purple"><ion-icon name="notifications-outline"></ion-icon></div>
            <span class="t-kpi-label">Avisos sin leer</span>
            <span class="t-kpi-value">{{ (notifications.unread$ | async) ?? 0 }}</span>
          </div>
        </section>

        <section class="t-section">
          <div class="t-section-head"><h2>Accesos rápidos</h2></div>
          <div class="t-tiles">
            <a class="t-tile" routerLink="/secretaria/equipo">
              <span class="t-tile-icon tone-blue"><ion-icon name="people-outline"></ion-icon></span>
              <span class="t-tile-label">Equipo y altas</span>
            </a>
            <a class="t-tile" routerLink="/notificaciones">
              <span class="t-tile-icon tone-red"><ion-icon name="notifications-outline"></ion-icon></span>
              <span class="t-tile-label">Avisos</span>
            </a>
            <a class="t-tile" routerLink="/secretaria/trabajos">
              <span class="t-tile-icon tone-orange"><ion-icon name="briefcase-outline"></ion-icon></span>
              <span class="t-tile-label">Trabajos</span>
            </a>
            <a class="t-tile" routerLink="/secretaria/equipo">
              <span class="t-tile-icon tone-green"><ion-icon name="cash-outline"></ion-icon></span>
              <span class="t-tile-label">Pagos y adelantos</span>
            </a>
            <a class="t-tile" routerLink="/secretaria/vehiculos">
              <span class="t-tile-icon tone-purple"><ion-icon name="car-outline"></ion-icon></span>
              <span class="t-tile-label">Vehículos</span>
            </a>
            <a class="t-tile" routerLink="/secretaria/finanzas">
              <span class="t-tile-icon tone-orange"><ion-icon name="wallet-outline"></ion-icon></span>
              <span class="t-tile-label">Finanzas</span>
            </a>
          </div>
        </section>

        <section class="t-section">
          <div class="t-section-head">
            <h2>Próximos trabajos</h2>
            <a routerLink="/secretaria/trabajos">Ver todos</a>
          </div>
          <div class="t-skeleton" *ngIf="loading"></div>
          <div class="t-list" *ngIf="!loading">
            <a class="t-row" *ngFor="let j of upcoming" routerLink="/secretaria/trabajos">
              <div class="t-date">
                <strong>{{ day(j.job_date) }}</strong>
                <span>{{ month(j.job_date) }}</span>
              </div>
              <div class="t-row-main">
                <strong>{{ typeLabel(j.job_type) }} · {{ j.client_name }}</strong>
                <span>{{ (j.start_time || "").slice(0, 5) }} · {{ address(j) }}</span>
              </div>
            </a>
            <div class="t-empty" *ngIf="upcoming.length === 0">
              <ion-icon name="calendar-outline"></ion-icon>
              No hay trabajos programados.
            </div>
          </div>
        </section>

        <section class="t-section">
          <div class="t-section-head">
            <h2>Últimos avisos</h2>
            <a routerLink="/notificaciones">Ver todos</a>
          </div>
          <div class="t-list">
            <a class="t-row" *ngFor="let n of recent" [routerLink]="n.data['route'] || '/notificaciones'">
              <div class="t-row-icon tone-blue"><ion-icon name="notifications-outline"></ion-icon></div>
              <div class="t-row-main">
                <strong>{{ n.title }}</strong>
                <span>{{ n.body }}</span>
              </div>
            </a>
            <div class="t-empty" *ngIf="!loading && recent.length === 0">
              <ion-icon name="checkmark-done-outline"></ion-icon>
              Todo al día.
            </div>
          </div>
        </section>
      </div>
    </ion-content>

    <app-secretary-tabbar></app-secretary-tabbar>
  `,
})
export class SecretaryInicioPage {
  loading = true;
  reviewCount = 0;
  team: TeamMember[] = [];
  upcoming: any[] = [];
  recent: AppNotification[] = [];

  constructor(
    private readonly supabase: SupabaseService,
    readonly notifications: NotificationsService,
  ) {
    addIcons({
      peopleOutline,
      briefcaseOutline,
      notificationsOutline,
      personOutline,
      calendarOutline,
      cashOutline,
      checkmarkDoneOutline,
      hourglassOutline,
      chevronForwardOutline,
      "car-outline": tramoCarOutline,
      "wallet-outline": tramoWalletOutline,
    });
  }

  get activeCount() {
    return this.team.filter((m) => m.account_status === "activo").length;
  }

  countRole(role: string) {
    return this.team.filter((m) => m.role === role && m.account_status === "activo").length;
  }

  async ionViewWillEnter() {
    await this.load();
  }

  async refresh(event: any) {
    await this.load();
    event?.target?.complete?.();
  }

  async load() {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const [team, jobsRes, recent, reviewRes] = await Promise.all([
        this.supabase.listTeam().catch(() => []),
        this.supabase.supabase
          .from("jobs")
          .select("id, job_type, client_name, job_date, start_time, pickup_point, dropoff_point, work_point, status")
          .gte("job_date", today)
          .in("status", ["pendiente", "confirmado", "en_curso"])
          .order("job_date", { ascending: true })
          .limit(5),
        this.notifications.list(4).catch(() => []),
        this.supabase.supabase
          .from("jobs")
          .select("id", { count: "exact", head: true })
          .eq("status", "pendiente_revision"),
      ]);
      this.reviewCount = reviewRes.count ?? 0;

      this.team = team;
      this.upcoming = jobsRes.data ?? [];
      this.recent = recent;
    } finally {
      this.loading = false;
    }
  }

  typeLabel(t: string) {
    return TYPE_LABEL[t] ?? "Trabajo";
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
}
