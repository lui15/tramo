import { Component, OnInit } from "@angular/core";

import { CommonModule } from "@angular/common";

import { FormsModule } from "@angular/forms";

import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonIcon,
} from "@ionic/angular/standalone";

import {
  walletOutline,
  timeOutline,
  checkmarkCircleOutline,
  calendarOutline,
  cashOutline,
  briefcaseOutline,
  chevronBackOutline,
  chevronForwardOutline,
} from "ionicons/icons";

import { addIcons } from "ionicons";

import { SupabaseService, Profile } from "../../../services/supabase.service";

import { EmployeeTabbarComponent } from "../../../components/employee-tabbar.component";
import { MONEY_STYLES } from "./finanzas.styles";

interface FeedItem {
  kind: "trabajo" | "saldo";
  date: string;
  time?: string;
  jobType?: string;
  hoursOrDays?: number;
  workUnit?: "horas" | "dias";
  amount: number;
  payKind?: string;
  note?: string | null;
}

interface MonthOption {
  key: string;
  label: string;
}

import { PageHeaderComponent } from "../../../components/page-header.component";

@Component({
  selector: "app-employee-finanzas",

  standalone: true,

  imports: [
    PageHeaderComponent,
    CommonModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonIcon,
    EmployeeTabbarComponent,
  ],

  template: `
    <app-page-header
      [title]="noBalance ? 'Mi historial' : 'Mi dinero'"
      [subtitle]="noBalance ? 'Trabajos y adelantos' : 'Mis cuentas'"
    ></app-page-header>

    <ion-content class="fin-content">
      <div class="fin-wrap">
        <!-- =====================================================
             HERO - GENERADO
        ====================================================== -->

        <section class="hero-card" *ngIf="!noBalance">
          <div class="hero-top-line"></div>

          <div class="hero-icon-wrapper">
            <div class="hero-icon-circle">
              <ion-icon name="wallet-outline"></ion-icon>
            </div>
          </div>

          <span class="hero-label"> GENERADO </span>

          <div class="hero-value">
            {{ generated | number: "1.2-2" }}
            <small>€</small>
          </div>

          <div class="hero-rule"></div>

          <span class="hero-sub"> Total generado con tus trabajos </span>

          <div class="hero-wave"></div>
        </section>

        <!-- =====================================================
             ESTADÍSTICAS
        ====================================================== -->

        <!-- Encargado / salario fijo: no acumula, solo historial -->
        <section class="t-month-summary" *ngIf="noBalance">
          <div><span>Trabajos del mes</span><strong>{{ filteredJobs.length }}</strong></div>
          <div><span>Trabajos totales</span><strong>{{ jobs.length }}</strong></div>
          <div><span>Adelantos del mes</span><strong>{{ monthAdvances | number: "1.0-2" }} €</strong></div>
        </section>

        <section class="stat-row" *ngIf="!noBalance">
          <!-- PENDIENTE -->

          <div class="stat-card pendiente">
            <div class="stat-icon">
              <ion-icon name="time-outline"></ion-icon>
            </div>

            <div class="stat-info">
              <span class="stat-label"> PENDIENTE </span>

              <span class="stat-value">
                {{ pending | number: "1.2-2" }}
                <small>€</small>
              </span>
            </div>

            <div class="stat-decoration"></div>
          </div>

          <!-- COBRADO -->

          <div class="stat-card pagado">
            <div class="stat-icon">
              <ion-icon name="checkmark-circle-outline"></ion-icon>
            </div>

            <div class="stat-info">
              <span class="stat-label"> COBRADO </span>

              <span class="stat-value">
                {{ paid | number: "1.2-2" }}
                <small>€</small>
              </span>
            </div>

            <div class="stat-decoration"></div>
          </div>

          <!-- TRABAJOS -->

          <div class="stat-card trabajos">
            <div class="stat-icon">
              <ion-icon name="briefcase-outline"></ion-icon>
            </div>

            <div class="stat-info">
              <span class="stat-label"> TRABAJOS </span>

              <span class="stat-value">
                {{ filteredJobs.length }}
              </span>
            </div>

            <div class="stat-decoration"></div>
          </div>
        </section>

        <!-- =====================================================
             SELECTOR DE MES
        ====================================================== -->

        <section class="t-month">
          <button type="button" class="t-month-arrow" (click)="previousMonth()" aria-label="Mes anterior">
            <ion-icon name="chevron-back-outline"></ion-icon>
          </button>
          <div class="t-month-current">
            <strong>{{ monthName }}</strong>
            <span>{{ monthYear }}</span>
          </div>
          <button type="button" class="t-month-arrow" (click)="nextMonth()" aria-label="Mes siguiente">
            <ion-icon name="chevron-forward-outline"></ion-icon>
          </button>
        </section>

        <!-- =====================================================
             ACTIVIDAD
        ====================================================== -->

        <section class="activity-section">
          <div class="section-header">
            <div class="section-title-wrapper">
              <div class="section-icon">
                <ion-icon name="cash-outline"></ion-icon>
              </div>

              <div class="section-title-text">
                <h3>
                  MIS TRABAJOS DE
                  {{ currentMonthLabel | uppercase }}
                </h3>

                <span>{{ noBalance ? "Trabajos realizados y adelantos" : "Trabajos realizados y pagos recibidos" }}</span>
              </div>
            </div>
          </div>

          <!-- ===================================================
               LISTA DE TRABAJOS Y PAGOS
          ==================================================== -->

          <div class="ledger-scroll" *ngIf="filteredFeed.length > 0">
            <div class="ledger">
              <div
                class="ledger-row"
                *ngFor="let item of filteredFeed"
                [class.payment-row]="item.kind === 'saldo'"
              >
                <!-- =================================================
                     ICONO
                ================================================== -->

                <div
                  class="activity-icon"
                  [class.income]="item.kind === 'trabajo'"
                  [class.payment]="item.kind === 'saldo'"
                >
                  <ion-icon
                    *ngIf="item.kind === 'trabajo'"
                    name="briefcase-outline"
                  ></ion-icon>

                  <ion-icon
                    *ngIf="item.kind === 'saldo'"
                    name="cash-outline"
                  ></ion-icon>
                </div>

                <!-- =================================================
                     INFORMACIÓN
                ================================================== -->

                <div class="ledger-main">
                  <!-- TRABAJO -->

                  <ng-container *ngIf="item.kind === 'trabajo'">
                    <span class="ledger-type">
                      {{ item.jobType | titlecase }}
                    </span>

                    <span class="ledger-description">
                      <span class="data-item">
                        <ion-icon name="calendar-outline"></ion-icon>

                        {{ formatDate(item.date) }}
                      </span>

                      <span class="data-item">
                        <ion-icon name="time-outline"></ion-icon>

                        {{ formatTime(item.time) }}
                      </span>
                    </span>

                    <span class="ledger-work-duration">
                      {{ formatWorkAmount(item.hoursOrDays, item.workUnit) }}
                    </span>
                  </ng-container>

                  <!-- PAGO -->

                  <ng-container *ngIf="item.kind === 'saldo'">
                    <span class="ledger-type payment-title">
                      {{ payLabel(item.payKind) }}
                    </span>

                    <span class="ledger-description">
                      <span class="data-item">
                        <ion-icon name="calendar-outline"></ion-icon>

                        {{ formatDate(item.date) }}
                      </span>

                      <span class="data-item">
                        <ion-icon name="time-outline"></ion-icon>

                        {{ formatTime(item.time) }}
                      </span>
                    </span>

                    <span class="ledger-date payment-description">
                      {{ item.note || "Pago recibido" }}
                    </span>
                  </ng-container>
                </div>

                <!-- =================================================
                     DINERO
                ================================================== -->

                <div class="ledger-right">
                  <!-- TRABAJO -->

                  <span
                    *ngIf="item.kind === 'trabajo' && !noBalance"
                    class="ledger-amount income"
                  >
                    +{{ item.amount | number: "1.2-2" }} €
                  </span>

                  <!-- PAGO -->

                  <span
                    *ngIf="item.kind === 'saldo'"
                    class="ledger-amount payment-amount"
                  >
                    -{{ item.amount | number: "1.2-2" }} €
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- ===================================================
               SIN ACTIVIDAD
          ==================================================== -->

          <div class="empty-state" *ngIf="filteredFeed.length === 0">
            <div class="empty-icon-wrapper">
              <div class="empty-icon">
                <ion-icon name="briefcase-outline"></ion-icon>
              </div>
            </div>

            <h4>No tienes actividad este mes</h4>

            <p>
              Cuando tengas trabajos realizados o pagos recibidos en
              {{ currentMonthLabel }}, aparecerán aquí.
            </p>
          </div>
        </section>
      </div>
    </ion-content>

    <!-- =======================================================
         TABBAR
    ======================================================== -->

    <div class="employee-tabbar-container">
      <app-employee-tabbar></app-employee-tabbar>
    </div>
  `,

  styles: [MONEY_STYLES],
})
export class EmployeeFinanzasPage implements OnInit {
  /* =========================================================
     DATOS
  ========================================================= */

  profile: Profile | null = null;

  feed: FeedItem[] = [];

  availableMonths: MonthOption[] = [];

  selectedMonth = "";

  /* =========================================================
     TOTALES
  ========================================================= */

  generated = 0;

  /** El encargado (o quien cobra salario fijo) no acumula: ve su historial. */
  get noBalance(): boolean {
    return this.profile?.role === "encargado" || this.profile?.payment_method === "fijo";
  }

  get monthAdvances(): number {
    return this.filteredPayments
      .filter((p) => p.payKind === "adelanto")
      .reduce((t, p) => t + (Number(p.amount) || 0), 0);
  }

  get monthName(): string {
    const label = this.currentMonthLabel.split(" de ")[0] || this.currentMonthLabel;
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  get monthYear(): string {
    return this.selectedMonth ? this.selectedMonth.slice(0, 4) : "";
  }

  payLabel(kind?: string): string {
    return kind === "adelanto" ? "Adelanto" : kind === "salario" ? "Salario" : "Pago";
  }

  paid = 0;

  pending = 0;

  /* =========================================================
     INIT
  ========================================================= */

  constructor(private supabase: SupabaseService) {
    addIcons({
      "wallet-outline": walletOutline,

      "time-outline": timeOutline,

      "checkmark-circle-outline": checkmarkCircleOutline,

      "calendar-outline": calendarOutline,

      "cash-outline": cashOutline,

      "briefcase-outline": briefcaseOutline,

      "chevron-back-outline": chevronBackOutline,

      "chevron-forward-outline": chevronForwardOutline,
    });
  }

  /* =========================================================
     CARGAR DATOS
  ========================================================= */

  async ngOnInit() {
    this.profile = await this.supabase.getMyProfile();

    const [history, settlements] = await Promise.all([
      this.supabase.getMyJobHistory(),

      this.supabase.getMySettlements(),
    ]);

    /* =======================================================
       TRABAJOS
    ======================================================= */

    const jobItems: FeedItem[] = (history ?? []).map((h: any) => {
      const hoursOrDays = Number(
        h.hours_or_days ?? h.hours_days ?? h.duration ?? h.hours ?? h.days ?? 0,
      );

      const workUnit = this.detectWorkUnit(h);

      return {
        kind: "trabajo",

        date: h.job_date || "",

        time: h.start_time || "",

        jobType: h.job_type || "Trabajo",

        hoursOrDays,

        workUnit,

        amount: Number(h.amount_earned ?? 0),
      };
    });

    /* =======================================================
       PAGOS
    ======================================================= */

    const settlementItems: FeedItem[] = (settlements ?? []).map((s: any) => ({
      kind: "saldo",

      date: s.settlement_date || "",

      time: s.settlement_time || "",

      amount: Number(s.amount ?? 0),
      payKind: s.kind || "pago",
      note: s.note ?? null,
    }));

    /* =======================================================
       FEED COMPLETO
    ======================================================= */

    this.feed = [...jobItems, ...settlementItems].sort((a, b) => {
      const timestampA = this.getTimestamp(a);

      const timestampB = this.getTimestamp(b);

      return timestampB - timestampA;
    });

    /* =======================================================
       MESES
    ======================================================= */

    this.setAvailableMonths();

    /*
     * IMPORTANTE:
     *
     * Primero seleccionamos el mes.
     * Después calculamos los totales
     * de ese mes.
     */

    this.calculateBalance();
  }

  /* =========================================================
     DETECTAR SI EL TRABAJO ES POR HORAS O DÍAS
  ========================================================= */

  private detectWorkUnit(item: any): "horas" | "dias" {
    const possibleUnitValues = [
      item.work_unit,

      item.unit_type,

      item.duration_type,

      item.hours_or_days_type,

      item.work_type,

      item.payment_type,

      item.unit,

      item.duration_unit,
    ];

    for (const value of possibleUnitValues) {
      if (value === null || value === undefined) {
        continue;
      }

      const normalized = String(value)
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

      if (normalized.includes("dia") || normalized.includes("day")) {
        return "dias";
      }

      if (normalized.includes("hora") || normalized.includes("hour")) {
        return "horas";
      }
    }

    const possibleTextValues = [
      item.hours_or_days,

      item.hours_days,

      item.duration,
    ];

    for (const value of possibleTextValues) {
      if (typeof value !== "string") {
        continue;
      }

      const normalized = value
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

      if (normalized.includes("dia") || normalized.includes("day")) {
        return "dias";
      }

      if (normalized.includes("hora") || normalized.includes("hour")) {
        return "horas";
      }
    }

    return "horas";
  }

  /* =========================================================
     FORMATEAR DURACIÓN
  ========================================================= */

  formatWorkAmount(
    value: number | null | undefined,

    unit: "horas" | "dias" | undefined,
  ): string {
    if (
      value === null ||
      value === undefined ||
      !Number.isFinite(Number(value))
    ) {
      return "--";
    }

    const amount = Number(value);

    const finalUnit = unit || "horas";

    if (finalUnit === "dias") {
      return amount === 1 ? "1 día" : `${amount} días`;
    }

    return amount === 1 ? "1 hora" : `${amount} horas`;
  }

  /* =========================================================
     TRABAJOS
  ========================================================= */

  get jobs(): FeedItem[] {
    return this.feed.filter((item) => item.kind === "trabajo");
  }

  /* =========================================================
     PAGOS
  ========================================================= */

  get payments(): FeedItem[] {
    return this.feed.filter((item) => item.kind === "saldo");
  }

  /* =========================================================
     ACTIVIDAD DEL MES
  ========================================================= */

  get filteredFeed(): FeedItem[] {
    if (!this.selectedMonth) {
      return this.feed;
    }

    return this.feed.filter(
      (item) => this.getMonthKey(item.date) === this.selectedMonth,
    );
  }

  /* =========================================================
     TRABAJOS FILTRADOS POR MES
  ========================================================= */

  get filteredJobs(): FeedItem[] {
    if (!this.selectedMonth) {
      return this.jobs;
    }

    return this.jobs.filter(
      (job) => this.getMonthKey(job.date) === this.selectedMonth,
    );
  }

  /* =========================================================
     PAGOS FILTRADOS POR MES
  ========================================================= */

  get filteredPayments(): FeedItem[] {
    if (!this.selectedMonth) {
      return this.payments;
    }

    return this.payments.filter(
      (payment) => this.getMonthKey(payment.date) === this.selectedMonth,
    );
  }

  /* =========================================================
     GENERADO DEL MES
  ========================================================= */

  get filteredGenerated(): number {
    return this.filteredJobs.reduce((total: number, job: FeedItem) => {
      const amount = Number(job.amount ?? 0);

      return Number.isFinite(amount) ? total + amount : total;
    }, 0);
  }

  /* =========================================================
     MES ACTUAL
  ========================================================= */

  get currentMonthLabel(): string {
    if (!this.selectedMonth) {
      return "Sin mes";
    }

    const [year, month] = this.selectedMonth.split("-").map(Number);

    const date = new Date(year, month - 1, 1);

    return date.toLocaleDateString("es-ES", {
      month: "long",
      year: "numeric",
    });
  }

  /* =========================================================
     MES ANTERIOR
  ========================================================= */

  previousMonth() {
    if (!this.selectedMonth) {
      return;
    }

    const [year, month] = this.selectedMonth.split("-").map(Number);

    const previous = new Date(year, month - 2, 1);

    this.selectedMonth = this.formatMonthKey(previous);

    /*
     * MUY IMPORTANTE:
     * recalculamos los totales
     * del nuevo mes.
     */

    this.calculateBalance();
  }

  /* =========================================================
     MES SIGUIENTE
  ========================================================= */

  nextMonth() {
    if (!this.selectedMonth) {
      return;
    }

    const [year, month] = this.selectedMonth.split("-").map(Number);

    const next = new Date(year, month, 1);

    this.selectedMonth = this.formatMonthKey(next);

    /*
     * MUY IMPORTANTE:
     * recalculamos los totales
     * del nuevo mes.
     */

    this.calculateBalance();
  }

  /* =========================================================
     CALCULAR SALDOS DEL MES SELECCIONADO
  ========================================================= */

  private calculateBalance() {
    /*
     * IMPORTANTE:
     *
     * Ya NO utilizamos todos los trabajos
     * y todos los pagos.
     *
     * Utilizamos solamente los del
     * mes seleccionado.
     */

    const monthJobs = this.filteredJobs;

    const monthPayments = this.filteredPayments;

    /* =======================================================
       DINERO GENERADO EN EL MES
    ======================================================= */

    this.generated = monthJobs.reduce((total: number, job: FeedItem) => {
      const amount = Number(job.amount ?? 0);

      return Number.isFinite(amount) ? total + amount : total;
    }, 0);

    /* =======================================================
       DINERO COBRADO EN EL MES
    ======================================================= */

    this.paid = monthPayments.reduce((total: number, payment: FeedItem) => {
      const amount = Number(payment.amount ?? 0);

      return Number.isFinite(amount) ? total + amount : total;
    }, 0);

    /* =======================================================
       DINERO PENDIENTE DEL MES
    ======================================================= */

    this.pending = Math.max(0, this.generated - this.paid);
  }

  /* =========================================================
     CREAR MESES DISPONIBLES
  ========================================================= */

  private setAvailableMonths() {
    const monthKeys = Array.from(
      new Set(
        this.feed.map((item) => this.getMonthKey(item.date)).filter(Boolean),
      ),
    );

    monthKeys.sort((a, b) => b.localeCompare(a));

    this.availableMonths = monthKeys.map((key) => ({
      key,

      label: this.formatMonthLabel(key),
    }));

    /*
     * Si existen movimientos,
     * empezamos en el mes
     * más reciente.
     */

    if (!this.selectedMonth && this.availableMonths.length > 0) {
      this.selectedMonth = this.availableMonths[0].key;

      return;
    }

    /*
     * Si no hay movimientos,
     * mostramos el mes actual.
     */

    if (!this.selectedMonth) {
      const now = new Date();

      this.selectedMonth = this.formatMonthKey(now);
    }
  }

  /* =========================================================
     OBTENER CLAVE DEL MES
  ========================================================= */

  private getMonthKey(dateValue: string): string {
    if (!dateValue) {
      return "";
    }

    /*
     * YYYY-MM
     */

    const match = dateValue.match(/^(\d{4})-(\d{2})/);

    if (match) {
      return `${match[1]}-${match[2]}`;
    }

    const parsed = new Date(dateValue);

    if (Number.isNaN(parsed.getTime())) {
      return "";
    }

    return this.formatMonthKey(parsed);
  }

  /* =========================================================
     FORMATEAR MES
  ========================================================= */

  private formatMonthLabel(key: string): string {
    const [year, month] = key.split("-").map(Number);

    const date = new Date(year, month - 1, 1);

    return date.toLocaleDateString("es-ES", {
      month: "long",
      year: "numeric",
    });
  }

  /* =========================================================
     FORMATEAR CLAVE MES
  ========================================================= */

  private formatMonthKey(date: Date): string {
    const year = date.getFullYear();

    const month = String(date.getMonth() + 1).padStart(2, "0");

    return `${year}-${month}`;
  }

  /* =========================================================
     FORMATEAR FECHA
  ========================================================= */

  formatDate(date: string): string {
    if (!date) {
      return "";
    }

    const parsed = this.parseDate(date);

    if (!parsed) {
      return date;
    }

    return parsed.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  /* =========================================================
     FORMATEAR HORA
  ========================================================= */

  formatTime(time: string | null | undefined): string {
    if (!time) {
      return "--:--";
    }

    return time.substring(0, 5);
  }

  /* =========================================================
     PARSEAR FECHA
  ========================================================= */

  private parseDate(value: string): Date | null {
    if (!value) {
      return null;
    }

    /*
     * YYYY-MM-DD
     */

    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);

    if (match) {
      return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    }

    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
      return null;
    }

    return parsed;
  }

  /* =========================================================
     TIMESTAMP
  ========================================================= */

  private getTimestamp(item: FeedItem): number {
    if (!item.date) {
      return 0;
    }

    const date = this.parseDate(item.date);

    if (!date) {
      return 0;
    }

    if (item.time) {
      const parts = item.time.split(":");

      const hours = Number(parts[0] ?? 0);

      const minutes = Number(parts[1] ?? 0);

      const seconds = Number(parts[2] ?? 0);

      date.setHours(
        Number.isFinite(hours) ? hours : 0,

        Number.isFinite(minutes) ? minutes : 0,

        Number.isFinite(seconds) ? seconds : 0,
      );
    }

    return date.getTime();
  }
}
