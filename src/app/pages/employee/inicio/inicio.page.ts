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
  briefcaseOutline,
  walletOutline,
  timeOutline,
  cashOutline,
  calendarOutline,
  checkmarkDoneOutline,
  hourglassOutline,
  locationOutline,
} from "ionicons/icons";

import { PageHeaderComponent } from "../../../components/page-header.component";
import { EmployeeTabbarComponent } from "../../../components/employee-tabbar.component";
import {
  SupabaseService,
  Profile,
  JobHistoryEntry,
  ROLE_LABELS,
  SALARY_TYPE_LABELS,
  SALARY_UNIT,
} from "../../../services/supabase.service";

const TYPE_LABEL: Record<string, string> = {
  mudanza: "Mudanza",
  montaje: "Montaje",
  reforma: "Reforma",
};

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

// =====================================================
// INICIO DEL ENCARGADO / AYUDANTE
// =====================================================
@Component({
  selector: "app-employee-inicio",
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
        <!-- MI FICHA Y SALDO -->
        <section class="t-hero">
          <span class="t-hero-label">
            {{ roleLabel }} · {{ salaryLabel }}
          </span>

          <!-- Encargado / salario fijo: no acumula, se muestra su actividad -->
          <ng-container *ngIf="noBalance; else balanceTpl">
            <span class="t-hero-value">{{ history.length }}</span>
            <span class="t-hero-sub">Trabajos realizados</span>

            <div class="t-hero-grid">
              <div class="t-hero-mini">
                <span>Este mes</span>
                <strong>{{ monthJobs }}</strong>
              </div>
              <div class="t-hero-mini">
                <span>Sueldo</span>
                <strong>{{ (profile?.salary_rate || 0) | number: "1.0-0" }} €</strong>
              </div>
              <div class="t-hero-mini">
                <span>Adelantos</span>
                <strong>{{ advances | number: "1.0-0" }} €</strong>
              </div>
            </div>
          </ng-container>

          <ng-template #balanceTpl>
            <span class="t-hero-value">{{ pending | number: "1.2-2" }} €</span>
            <span class="t-hero-sub">Pendiente de cobrar</span>

            <div class="t-hero-grid">
              <div class="t-hero-mini">
                <span>Generado</span>
                <strong>{{ earned | number: "1.0-0" }} €</strong>
              </div>
              <div class="t-hero-mini">
                <span>Cobrado</span>
                <strong>{{ paid | number: "1.0-0" }} €</strong>
              </div>
              <div class="t-hero-mini">
                <span>Trabajos</span>
                <strong>{{ history.length }}</strong>
              </div>
            </div>
          </ng-template>
        </section>

        <!-- INDICADORES -->
        <section class="t-section t-kpis">
          <div class="t-kpi">
            <div class="t-kpi-icon tone-blue"><ion-icon name="time-outline"></ion-icon></div>
            <span class="t-kpi-label">Horas trabajadas</span>
            <span class="t-kpi-value">{{ hours | number: "1.0-1" }} h</span>
          </div>
          <div class="t-kpi">
            <div class="t-kpi-icon tone-purple"><ion-icon name="calendar-outline"></ion-icon></div>
            <span class="t-kpi-label">Días trabajados</span>
            <span class="t-kpi-value">{{ days | number: "1.0-1" }}</span>
          </div>
        </section>

        <!-- ÚLTIMOS TRABAJOS REALIZADOS -->
        <section class="t-section">
          <div class="t-section-head">
            <h2>Últimos trabajos realizados</h2>
            <a routerLink="/employee/finanzas">Mi dinero</a>
          </div>
          <div class="t-list" *ngIf="!loading">
            <div class="t-row" *ngFor="let h of history.slice(0, 5)">
              <div class="t-row-icon tone-green"><ion-icon name="checkmark-done-outline"></ion-icon></div>
              <div class="t-row-main">
                <strong>{{ typeLabel(h.job_type) }}</strong>
                <span>
                  {{ h.job_date | date: "dd/MM/yyyy" }} ·
                  {{ h.hours_or_days }} {{ h.duration_unit === "dias" ? "días" : "horas" }}
                </span>
              </div>
              <span class="t-row-end" *ngIf="!isFixed && h.amount_earned > 0">+{{ h.amount_earned | number: "1.2-2" }} €</span>
            </div>
            <div class="t-empty" *ngIf="history.length === 0">
              <ion-icon name="briefcase-outline"></ion-icon>
              Aún no tienes trabajos finalizados.
            </div>
          </div>
        </section>
      </div>
    </ion-content>

    <app-employee-tabbar></app-employee-tabbar>
  `,
})
export class EmployeeInicioPage {
  loading = true;
  profile: Profile | null = null;
  history: JobHistoryEntry[] = [];
  upcoming: any[] = [];
  earned = 0;
  paid = 0;
  pending = 0;
  advances = 0;
  monthJobs = 0;
  hours = 0;
  days = 0;

  constructor(private readonly supabase: SupabaseService) {
    addIcons({
      briefcaseOutline,
      walletOutline,
      timeOutline,
      cashOutline,
      calendarOutline,
      checkmarkDoneOutline,
      hourglassOutline,
      locationOutline,
    });
  }

  get roleLabel() {
    return this.profile ? ROLE_LABELS[this.profile.role] : "";
  }

  get isFixed() {
    return this.profile?.salary_type === "mes" || this.profile?.payment_method === "fijo";
  }

  /** El encargado (o quien cobra fijo) no acumula saldo. */
  get noBalance() {
    return this.profile?.role === "encargado" || this.isFixed;
  }

  get salaryLabel() {
    const t = this.profile?.salary_type;
    if (!t || this.profile?.salary_rate == null) return "Salario sin configurar";
    return `${SALARY_TYPE_LABELS[t]} · ${Number(this.profile.salary_rate).toFixed(2)} ${SALARY_UNIT[t]}`;
  }

  async ionViewWillEnter() {
    await this.load();
  }

  async refresh(event: any) {
    await this.load();
    event?.target?.complete?.();
  }

  async load() {
    this.loading = this.history.length === 0 && this.upcoming.length === 0;

    try {
      const [profile, history, settlements, available] = await Promise.all([
        this.supabase.getMyProfile(true),
        this.supabase.getMyJobHistory(),
        this.supabase.getMySettlements(),
        this.supabase.getAvailableJobsForEmployee().catch(() => []),
      ]);

      this.profile = profile;
      this.history = history;
      this.earned = history.reduce((t, h) => t + (Number(h.amount_earned) || 0), 0);
      this.paid = (settlements ?? []).reduce((t: number, s: any) => t + (Number(s.amount) || 0), 0);
      this.pending = Math.max(0, this.earned - this.paid);
      this.advances = (settlements ?? [])
        .filter((s: any) => s.kind === "adelanto")
        .reduce((t: number, s: any) => t + (Number(s.amount) || 0), 0);
      const monthPrefix = new Date().toISOString().slice(0, 7);
      this.monthJobs = history.filter((h: any) => String(h.job_date || "").startsWith(monthPrefix)).length;
      this.hours = history
        .filter((h) => h.duration_unit !== "dias")
        .reduce((t, h) => t + (Number(h.hours_or_days) || 0), 0);
      this.days = history
        .filter((h) => h.duration_unit === "dias")
        .reduce((t, h) => t + (Number(h.hours_or_days) || 0), 0);

      const today = new Date().toISOString().slice(0, 10);
      this.upcoming = (available ?? [])
        .filter((j: any) => String(j.job_date) >= today)
        .slice(0, 5);
    } finally {
      this.loading = false;
    }
  }

  typeLabel(t: string) {
    return TYPE_LABEL[t] ?? "Trabajo";
  }

  day(d: string) {
    return String(d || "").slice(8, 10);
  }

  month(d: string) {
    return MONTHS[Number(String(d || "").slice(5, 7)) - 1] ?? "";
  }
}
