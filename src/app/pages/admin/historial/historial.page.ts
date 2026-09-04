import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";

import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonIcon,
} from "@ionic/angular/standalone";

import { addIcons } from "ionicons";

import {
  chevronBackOutline,
  chevronForwardOutline,
  chevronDownOutline,
  chevronUpOutline,
  calendarOutline,
  cashOutline,
  receiptOutline,
  peopleOutline,
  carOutline,
  flameOutline,
  constructOutline,
  buildOutline,
  speedometerOutline,
  businessOutline,
} from "ionicons/icons";

import { SupabaseService } from "../../../services/supabase.service";
import { AdminTabbarComponent } from "../../../components/admin-tabbar.component";

type ExpenseType =
  | "pago_vehiculo"
  | "combustible"
  | "material"
  | "herramientas"
  | "mantenimiento"
  | "peajes_parking"
  | "alquiler_equipo"
  | "otros";

interface Expense {
  id?: string;
  expense_type: ExpenseType;
  description: string;
  amount: number;
  expense_date: string;
  expense_time: string;
}

interface ActivityItem {
  id: string;
  type: "job" | "settlement" | "expense";
  title: string;
  description: string;
  date: string;
  time: string;
  amount: number;
  job?: any;
  settlement?: any;
  expense?: Expense;
}

@Component({
  selector: "app-admin-historial",
  standalone: true,
  imports: [
    AdminTabbarComponent,
    CommonModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonIcon,
  ],
  template: `
    <ion-header class="history-header">
      <ion-toolbar>
        <ion-title>Historial</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="history-content">
      <div class="history-wrap">
        <!-- INTRO -->
        <section class="history-intro">
          <div class="intro-text">
            <span>HISTORIAL</span>

            <h1>Actividad económica</h1>

            <p>Trabajos, pagos a empleados y gastos</p>
          </div>
        </section>

        <!-- SELECTOR DE MES -->
        <section class="month-selector">
          <button
            type="button"
            class="month-arrow"
            (click)="previousMonth()"
            aria-label="Mes anterior"
          >
            <ion-icon name="chevron-back-outline"></ion-icon>
          </button>

          <div class="month-current">
            <span class="month-name">
              {{ monthNames[selectedMonth] | titlecase }}
            </span>

            <span class="month-year">
              {{ selectedYear }}
            </span>
          </div>

          <button
            type="button"
            class="month-arrow"
            (click)="nextMonth()"
            aria-label="Mes siguiente"
          >
            <ion-icon name="chevron-forward-outline"></ion-icon>
          </button>
        </section>

        <!-- CABECERA ACTIVIDAD -->
        <section class="activity-header">
          <div>
            <span class="activity-kicker"> MOVIMIENTOS </span>

            <h2>
              Actividad de
              {{ monthNames[selectedMonth] | titlecase }}
              {{ selectedYear }}
            </h2>
          </div>

          <div class="activity-count">
            {{ filteredActivities.length }}
          </div>
        </section>

        <!-- LISTA CON SCROLL INTERNO -->
        <section class="activity-section">
          <div *ngIf="filteredActivities.length > 0" class="activity-scroll">
            <div class="activity-list">
              <div
                *ngFor="let item of filteredActivities"
                class="activity-card"
                [class.activity-job]="item.type === 'job'"
                [class.activity-settlement]="item.type === 'settlement'"
                [class.activity-expense]="item.type === 'expense'"
              >
                <!-- ICONO -->
                <div
                  class="activity-icon"
                  [class.icon-job]="item.type === 'job'"
                  [class.icon-settlement]="item.type === 'settlement'"
                  [class.icon-expense]="item.type === 'expense'"
                >
                  <ion-icon [name]="getActivityIcon(item)"></ion-icon>
                </div>

                <!-- CONTENIDO -->
                <div class="activity-main">
                  <div class="activity-top">
                    <div class="activity-title-wrap">
                      <span
                        class="activity-type"
                        [class.type-job]="item.type === 'job'"
                        [class.type-settlement]="item.type === 'settlement'"
                        [class.type-expense]="item.type === 'expense'"
                      >
                        {{ getActivityTypeLabel(item) }}
                      </span>

                      <h3>
                        {{ item.title }}
                      </h3>
                    </div>

                    <strong
                      class="activity-amount"
                      [class.amount-positive]="item.amount > 0"
                      [class.amount-negative]="item.amount < 0"
                    >
                      {{ item.amount > 0 ? "+" : "" }}
                      {{ item.amount | number: "1.2-2" }} €
                    </strong>
                  </div>

                  <p class="activity-description">
                    {{ item.description }}
                  </p>

                  <div class="activity-meta">
                    <span>
                      {{ formatDate(item.date) }}
                    </span>

                    <span class="dot"> · </span>

                    <span>
                      {{ formatTime(item.time) }}
                    </span>
                  </div>

                  <!-- FLECHA VER DETALLES -->
                  <button
                    type="button"
                    class="details-button"
                    (click)="toggleDetails(item.id)"
                  >
                    <span>
                      {{
                        expanded === item.id
                          ? "Ocultar detalles"
                          : "Ver detalles"
                      }}
                    </span>

                    <ion-icon
                      [name]="
                        expanded === item.id
                          ? 'chevron-up-outline'
                          : 'chevron-down-outline'
                      "
                    ></ion-icon>
                  </button>

                  <!-- ========================= -->
                  <!-- DETALLES TRABAJO -->
                  <!-- ========================= -->

                  <div
                    *ngIf="item.type === 'job' && expanded === item.id"
                    class="job-details"
                  >
                    <!-- DURACIÓN -->
                    <div class="detail-row">
                      <span class="detail-label"> Duración </span>

                      <strong>
                        {{
                          formatDuration(
                            item.job?.duration_value,
                            item.job?.duration_unit
                          )
                        }}
                      </strong>
                    </div>

                    <!-- CLIENTE -->
                    <div class="detail-row">
                      <span class="detail-label"> Cliente </span>

                      <div class="detail-value">
                        <strong>
                          {{ item.job?.client_name || "-" }}
                        </strong>

                        <span *ngIf="item.job?.client_phone">
                          {{ item.job.client_phone }}
                        </span>
                      </div>
                    </div>

                    <!-- PARTICIPANTES -->
                    <div
                      *ngIf="
                        item.job?.participants &&
                        item.job.participants.length > 0
                      "
                      class="participants-section"
                    >
                      <div class="participants-title">Participantes</div>

                      <div
                        *ngFor="let participant of item.job.participants"
                        class="participant-row"
                      >
                        <span>
                          {{
                            participant.employee_name ||
                              participant.full_name ||
                              "Empleado"
                          }}
                        </span>

                        <strong>
                          {{ participant.amount_earned | number: "1.2-2" }}
                          €
                        </strong>
                      </div>
                    </div>
                  </div>

                  <!-- ========================= -->
                  <!-- DETALLES PAGO -->
                  <!-- ========================= -->

                  <div
                    *ngIf="item.type === 'settlement' && expanded === item.id"
                    class="job-details"
                  >
                    <!-- EMPLEADO -->
                    <div class="detail-row">
                      <span class="detail-label"> Empleado </span>

                      <strong>
                        {{
                          item.settlement?.employee_name ||
                            item.settlement?.full_name ||
                            item.settlement?.employee_full_name ||
                            item.settlement?.employee?.full_name ||
                            "Empleado"
                        }}
                      </strong>
                    </div>

                    <!-- IMPORTE -->
                    <div class="detail-row">
                      <span class="detail-label"> Importe </span>

                      <strong>
                        {{ absoluteAmount(item.amount) | number: "1.2-2" }}
                        €
                      </strong>
                    </div>

                    <!-- TIPO DE PAGO -->
                    <div class="detail-row">
                      <span class="detail-label"> Tipo </span>

                      <strong>
                        {{ getSettlementDescription(item.settlement) }}
                      </strong>
                    </div>

                    <!-- FECHA -->
                    <div class="detail-row">
                      <span class="detail-label"> Fecha </span>

                      <strong>
                        {{ formatDate(item.date) }}
                      </strong>
                    </div>

                    <!-- HORA -->
                    <div class="detail-row">
                      <span class="detail-label"> Hora </span>

                      <strong>
                        {{ formatTime(item.time) }}
                      </strong>
                    </div>
                  </div>

                  <!-- ========================= -->
                  <!-- DETALLES GASTO -->
                  <!-- ========================= -->

                  <div
                    *ngIf="item.type === 'expense' && expanded === item.id"
                    class="job-details"
                  >
                    <!-- TIPO -->
                    <div class="detail-row">
                      <span class="detail-label"> Tipo </span>

                      <strong>
                        {{ getExpenseTypeLabel(item.expense?.expense_type) }}
                      </strong>
                    </div>

                    <!-- DESCRIPCIÓN -->
                    <div class="detail-row">
                      <span class="detail-label"> Descripción </span>

                      <div class="detail-value">
                        <strong>
                          {{ item.expense?.description || "-" }}
                        </strong>
                      </div>
                    </div>

                    <!-- IMPORTE -->
                    <div class="detail-row">
                      <span class="detail-label"> Importe </span>

                      <strong>
                        {{ absoluteAmount(item.amount) | number: "1.2-2" }}
                        €
                      </strong>
                    </div>

                    <!-- FECHA -->
                    <div class="detail-row">
                      <span class="detail-label"> Fecha </span>

                      <strong>
                        {{ formatDate(item.date) }}
                      </strong>
                    </div>

                    <!-- HORA -->
                    <div class="detail-row">
                      <span class="detail-label"> Hora </span>

                      <strong>
                        {{ formatTime(item.time) }}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- VACÍO -->
          <div *ngIf="filteredActivities.length === 0" class="empty-state">
            <div class="empty-icon">
              <ion-icon name="calendar-outline"></ion-icon>
            </div>

            <h3>No hay movimientos este mes</h3>

            <p>
              No se han encontrado trabajos, pagos a empleados ni gastos durante
              {{ currentMonthLabel }}.
            </p>
          </div>
        </section>
      </div>
    </ion-content>

    <!-- BARRA INFERIOR -->
    <div class="admin-tabbar-container">
      <app-admin-tabbar></app-admin-tabbar>
    </div>
  `,

  styles: [
    `
      :host {
        --history-bg: #f8fafc;
        --history-white: #ffffff;
        --history-primary: #1769ff;
        --history-primary-dark: #123b78;
        --history-primary-light: #eaf1ff;
        --history-text: #172b4d;
        --history-text-soft: #61708a;
        --history-muted: #8994a6;
        --history-border: #e5eaf1;
        --green: #299b45;
        --green-bg: #eaf8ed;
        --orange: #e99316;
        --orange-bg: #fff4e4;
        --red: #df4545;
        --red-bg: #fff0f0;

        display: block;
        min-height: 100%;

        background: var(--history-bg);
      }

      /* HEADER */

      .history-header {
        --background: #ffffff;
        background: #ffffff;
      }

      .history-header ion-toolbar {
        --background: #ffffff;
        --min-height: 64px;

        height: 64px;

        --border-width: 0;

        border: none;
      }

      .history-header ion-title {
        color: var(--history-primary-dark);

        font-size: 25px;
        font-weight: 800;

        text-align: center;

        letter-spacing: -0.5px;
      }

      /* CONTENT */

      .history-content {
        --background: var(--history-bg);
      }

      .history-wrap {
        width: 100%;
        max-width: 900px;

        margin: 0 auto;

        padding: 20px 16px 120px;

        box-sizing: border-box;
      }

      /* INTRO */

      .history-intro {
        margin-bottom: 18px;
      }

      .intro-text span {
        display: block;

        margin-bottom: 4px;

        color: var(--history-primary);

        font-size: 12px;
        font-weight: 800;

        letter-spacing: 1.2px;
      }

      .intro-text h1 {
        margin: 0;

        color: var(--history-text);

        font-size: 23px;
        line-height: 1.15;

        font-weight: 800;

        letter-spacing: -0.4px;
      }

      .intro-text p {
        margin: 5px 0 0;

        color: var(--history-text-soft);

        font-size: 14px;
        line-height: 1.4;
      }

      /* MONTH */

      .month-selector {
        position: relative;

        display: flex;

        align-items: center;
        justify-content: space-between;

        width: 100%;
        min-height: 64px;

        padding: 8px 10px;

        margin-bottom: 20px;

        background: #ffffff;

        border: 1px solid var(--history-border);

        border-radius: 18px;

        box-shadow: 0 4px 18px rgba(24, 47, 83, 0.05);

        box-sizing: border-box;

        overflow: hidden;
      }

      .month-selector::before {
        content: "";

        position: absolute;

        top: 0;
        left: 0;
        right: 0;

        height: 3px;

        background: linear-gradient(90deg, var(--history-primary), #65a0ff);
      }

      .month-arrow {
        width: 42px;
        height: 42px;

        flex: 0 0 42px;

        display: flex;

        align-items: center;
        justify-content: center;

        padding: 0;

        border: 1px solid var(--history-border);

        border-radius: 13px;

        background: #ffffff;

        color: var(--history-primary);

        cursor: pointer;

        transition:
          transform 0.15s ease,
          background 0.15s ease;
      }

      .month-arrow:hover {
        background: var(--history-primary-light);
      }

      .month-arrow:active {
        transform: scale(0.94);
      }

      .month-arrow ion-icon {
        font-size: 21px;
      }

      .month-current {
        flex: 1;

        display: flex;

        align-items: center;
        justify-content: center;

        gap: 5px;

        color: var(--history-primary-dark);

        font-size: 17px;
        font-weight: 800;
      }

      .month-name {
        text-transform: capitalize;
      }

      .month-year {
        font-weight: 700;
      }

      /* ACTIVITY HEADER */

      .activity-header {
        display: flex;

        align-items: center;
        justify-content: space-between;

        gap: 12px;

        margin-bottom: 12px;
      }

      .activity-kicker {
        display: block;

        margin-bottom: 3px;

        color: var(--history-primary);

        font-size: 11px;
        font-weight: 800;

        letter-spacing: 1px;
      }

      .activity-header h2 {
        margin: 0;

        color: var(--history-text);

        font-size: 18px;
        font-weight: 800;

        letter-spacing: -0.2px;
      }

      .activity-count {
        min-width: 34px;
        height: 34px;

        display: flex;

        align-items: center;
        justify-content: center;

        padding: 0 9px;

        border-radius: 12px;

        background: var(--history-primary-light);

        color: var(--history-primary);

        font-size: 13px;
        font-weight: 800;
      }

      /* SCROLL INTERNO */

      .activity-scroll {
        width: 100%;
        max-height: 620px;

        padding: 4px 6px 18px 3px;

        margin: 0;

        box-sizing: border-box;

        overflow-y: auto;
        overflow-x: hidden;

        overscroll-behavior: contain;

        -webkit-overflow-scrolling: touch;

        scrollbar-width: thin;

        scrollbar-color: #cbd5e1 transparent;
      }

      .activity-scroll::-webkit-scrollbar {
        width: 5px;
      }

      .activity-scroll::-webkit-scrollbar-track {
        background: transparent;
      }

      .activity-scroll::-webkit-scrollbar-thumb {
        background: #cbd5e1;

        border-radius: 10px;
      }

      /* ACTIVITY LIST */

      .activity-list {
        display: flex;

        flex-direction: column;

        gap: 11px;

        width: 100%;
      }

      .activity-card {
        display: flex;

        align-items: flex-start;

        gap: 13px;

        width: 100%;

        padding: 15px;

        background: #ffffff;

        border: 1px solid var(--history-border);

        border-radius: 18px;

        box-shadow: 0 4px 18px rgba(24, 47, 83, 0.05);

        box-sizing: border-box;
      }

      .activity-icon {
        width: 43px;
        height: 43px;

        flex: 0 0 43px;

        display: flex;

        align-items: center;
        justify-content: center;

        border-radius: 14px;
      }

      .activity-icon ion-icon {
        font-size: 21px;
      }

      .icon-job {
        background: var(--green-bg);
        color: var(--green);
      }

      .icon-settlement {
        background: var(--orange-bg);
        color: var(--orange);
      }

      .icon-expense {
        background: var(--red-bg);
        color: var(--red);
      }

      .activity-main {
        flex: 1;
        min-width: 0;
      }

      .activity-top {
        display: flex;

        align-items: flex-start;
        justify-content: space-between;

        gap: 12px;
      }

      .activity-title-wrap {
        min-width: 0;
      }

      .activity-type {
        display: inline-block;

        margin-bottom: 3px;

        font-size: 10px;
        font-weight: 800;

        letter-spacing: 0.8px;

        text-transform: uppercase;
      }

      .type-job {
        color: var(--green);
      }

      .type-settlement {
        color: var(--orange);
      }

      .type-expense {
        color: var(--red);
      }

      .activity-card h3 {
        margin: 0;

        color: var(--history-text);

        font-size: 15px;
        line-height: 1.25;

        font-weight: 800;

        overflow-wrap: anywhere;
      }

      .activity-amount {
        flex: 0 0 auto;

        font-size: 15px;
        font-weight: 800;

        white-space: nowrap;
      }

      .amount-positive {
        color: var(--green);
      }

      .amount-negative {
        color: var(--red);
      }

      .activity-settlement .amount-negative {
        color: var(--orange);
      }

      .activity-description {
        margin: 5px 0 0;

        color: var(--history-text-soft);

        font-size: 12px;

        line-height: 1.4;
      }

      .activity-meta {
        display: flex;

        align-items: center;

        gap: 4px;

        margin-top: 7px;

        color: var(--history-muted);

        font-size: 11px;
      }

      .dot {
        color: #b3bdca;
      }

      /* DETAILS */

      .details-button {
        display: inline-flex;

        align-items: center;

        gap: 5px;

        margin-top: 10px;

        padding: 0;

        border: none;

        background: transparent;

        color: var(--history-primary);

        font-size: 12px;
        font-weight: 800;

        cursor: pointer;
      }

      .details-button ion-icon {
        font-size: 15px;
      }

      .job-details {
        margin-top: 12px;

        padding: 12px;

        background: #f8fbff;

        border: 1px solid var(--history-border);

        border-radius: 14px;
      }

      .detail-row {
        display: flex;

        align-items: flex-start;

        justify-content: space-between;

        gap: 12px;

        padding: 8px 0;

        border-bottom: 1px solid #edf1f6;
      }

      .detail-row:last-child {
        border-bottom: none;
      }

      .detail-label {
        color: var(--history-muted);

        font-size: 11px;
        font-weight: 700;
      }

      .detail-row > strong {
        color: var(--history-text);

        font-size: 12px;

        text-align: right;
      }

      .detail-value {
        display: flex;

        flex-direction: column;

        align-items: flex-end;

        gap: 2px;

        text-align: right;
      }

      .detail-value strong {
        color: var(--history-text);

        font-size: 12px;
      }

      .detail-value span {
        color: var(--history-text-soft);

        font-size: 11px;
      }

      .participants-section {
        margin-top: 10px;

        padding: 10px;

        background: #ffffff;

        border: 1px solid var(--history-border);

        border-radius: 12px;
      }

      .participants-title {
        margin-bottom: 6px;

        color: var(--history-primary-dark);

        font-size: 11px;
        font-weight: 800;
      }

      .participant-row {
        display: flex;

        align-items: center;
        justify-content: space-between;

        gap: 10px;

        padding: 7px 0;

        border-bottom: 1px solid #edf1f6;
      }

      .participant-row:last-child {
        border-bottom: none;
      }

      .participant-row span {
        min-width: 0;

        color: var(--history-text-soft);

        font-size: 11px;

        overflow: hidden;

        text-overflow: ellipsis;

        white-space: nowrap;
      }

      .participant-row strong {
        color: var(--history-primary);

        font-size: 11px;

        white-space: nowrap;
      }

      /* EMPTY */

      .empty-state {
        display: flex;

        flex-direction: column;

        align-items: center;

        padding: 38px 20px;

        background: #ffffff;

        border: 1px solid var(--history-border);

        border-radius: 20px;

        box-shadow: 0 4px 18px rgba(24, 47, 83, 0.05);

        text-align: center;
      }

      .empty-icon {
        width: 64px;
        height: 64px;

        display: flex;

        align-items: center;
        justify-content: center;

        margin-bottom: 14px;

        border: 2px dashed #b9cdf5;

        border-radius: 50%;

        background: var(--history-primary-light);

        color: var(--history-primary);
      }

      .empty-icon ion-icon {
        font-size: 27px;
      }

      .empty-state h3 {
        margin: 0;

        color: var(--history-text);

        font-size: 16px;
        font-weight: 800;
      }

      .empty-state p {
        max-width: 310px;

        margin: 7px 0 0;

        color: var(--history-text-soft);

        font-size: 12px;

        line-height: 1.5;
      }

      /* TABBAR */

      .admin-tabbar-container {
        position: fixed;

        left: 0;
        right: 0;
        bottom: 0;

        z-index: 1000;

        width: 100%;

        background: #ffffff;

        border-top: 1px solid var(--history-border);

        box-shadow: 0 -6px 20px rgba(24, 47, 83, 0.08);

        padding-bottom: env(safe-area-inset-bottom);

        box-sizing: border-box;
      }

      /* RESPONSIVE */

      @media (max-width: 500px) {
        .activity-scroll {
          max-height: 60vh;
        }

        .activity-card {
          padding: 13px;
        }

        .activity-icon {
          width: 40px;
          height: 40px;

          flex-basis: 40px;
        }

        .activity-icon ion-icon {
          font-size: 19px;
        }

        .activity-top {
          gap: 8px;
        }

        .activity-amount {
          font-size: 14px;
        }
      }

      @media (max-width: 380px) {
        .history-wrap {
          padding-left: 12px;
          padding-right: 12px;
          padding-bottom: 120px;
        }

        .history-header ion-title {
          font-size: 22px;
        }

        .intro-text h1 {
          font-size: 20px;
        }

        .month-selector {
          min-height: 60px;
        }

        .month-arrow {
          width: 40px;
          height: 40px;

          flex-basis: 40px;
        }

        .month-current {
          font-size: 16px;
        }

        .activity-card {
          gap: 9px;
        }

        .activity-icon {
          width: 38px;
          height: 38px;

          flex-basis: 38px;

          border-radius: 12px;
        }

        .activity-icon ion-icon {
          font-size: 18px;
        }

        .activity-card h3 {
          font-size: 14px;
        }

        .activity-amount {
          font-size: 13px;
        }
      }

      @media (min-width: 768px) {
        .history-wrap {
          padding-top: 28px;
          padding-bottom: 140px;
        }

        .activity-scroll {
          max-height: 620px;
        }

        .activity-card {
          padding: 17px;
        }

        .activity-icon {
          width: 46px;
          height: 46px;

          flex-basis: 46px;
        }

        .activity-card h3 {
          font-size: 16px;
        }

        .activity-amount {
          font-size: 16px;
        }
      }
    `,
  ],
})
export class AdminHistorialPage implements OnInit {
  jobs: any[] = [];

  settlements: any[] = [];

  expenses: Expense[] = [];

  activities: ActivityItem[] = [];

  expanded: string | null = null;

  selectedMonth: number;

  selectedYear: number;

  readonly monthNames = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ];

  constructor(private supabase: SupabaseService) {
    const today = new Date();

    this.selectedMonth = today.getMonth();

    this.selectedYear = today.getFullYear();

    addIcons({
      chevronBackOutline,
      chevronForwardOutline,
      chevronDownOutline,
      chevronUpOutline,
      calendarOutline,
      cashOutline,
      receiptOutline,
      peopleOutline,
      carOutline,
      flameOutline,
      constructOutline,
      buildOutline,
      speedometerOutline,
      businessOutline,
    });
  }

  async ngOnInit() {
    await this.loadAllData();
  }

  /**
   * Carga trabajos, pagos y gastos.
   */
  async loadAllData() {
    try {
      const [jobsResult, settlementsResult, expensesResult] = await Promise.all(
        [
          this.supabase.getAdminFinishedJobs(),
          this.loadSettlements(),
          this.loadExpenses(),
        ],
      );

      this.jobs = jobsResult || [];

      this.settlements = settlementsResult || [];

      this.expenses = expensesResult || [];

      this.buildActivities();
    } catch (error) {
      console.error("Error cargando historial financiero:", error);

      this.jobs = [];

      this.settlements = [];

      this.expenses = [];

      this.activities = [];
    }
  }

  /**
   * Obtiene los pagos a empleados.
   */
  private async loadSettlements(): Promise<any[]> {
    const { data, error } = await this.supabase.supabase
      .from("settlements")
      .select("*")
      .order("settlement_date", {
        ascending: false,
      });

    if (error) {
      console.error("Error cargando settlements:", error);

      return [];
    }

    return data || [];
  }

  /**
   * Obtiene los gastos.
   *
   * SOLO LECTURA.
   * Historial no modifica expenses.
   */
  private async loadExpenses(): Promise<Expense[]> {
    const { data, error } = await this.supabase.supabase
      .from("expenses")
      .select("*")
      .order("expense_date", {
        ascending: false,
      });

    if (error) {
      console.error("Error cargando expenses:", error);

      return [];
    }

    return (data || []) as Expense[];
  }

  /**
   * Construye una única lista económica.
   *
   * Trabajos:
   * + ingreso
   *
   * Settlements:
   * - pago a empleado
   *
   * Expenses:
   * - gasto
   */
  private buildActivities() {
    const result: ActivityItem[] = [];

    /* =========================
       TRABAJOS
       ========================= */

    for (const job of this.jobs) {
      if (!job.job_date) {
        continue;
      }

      const amount = Number(job.total_cost || 0);

      result.push({
        id: `job-${job.job_id || job.id}`,

        type: "job",

        title: this.formatJobTitle(job.job_type),

        description: job.client_name
          ? `Cliente: ${job.client_name}`
          : "Trabajo finalizado",

        date: job.job_date,

        time: job.start_time || job.end_time || "00:00",

        amount,

        job,
      });
    }

    /* =========================
       PAGOS EMPLEADOS
       ========================= */

    for (const settlement of this.settlements) {
      const date =
        settlement.settlement_date ||
        settlement.payment_date ||
        settlement.created_at;

      if (!date) {
        continue;
      }

      const amount = Number(
        settlement.amount ||
          settlement.total_amount ||
          settlement.paid_amount ||
          settlement.payment_amount ||
          0,
      );

      const employeeName =
        settlement.employee_name ||
        settlement.full_name ||
        settlement.employee_full_name ||
        settlement.employee?.full_name ||
        "Empleado";

      result.push({
        id: `settlement-${
          settlement.id || settlement.settlement_id || Math.random()
        }`,

        type: "settlement",

        title: `Pago a ${employeeName}`,

        description:
          settlement.description || this.getSettlementDescription(settlement),

        date: this.normalizeDate(date),

        time:
          settlement.settlement_time ||
          settlement.payment_time ||
          this.extractTime(settlement.created_at),

        amount: -Math.abs(amount),

        settlement,
      });
    }

    /* =========================
       GASTOS
       ========================= */

    for (const expense of this.expenses) {
      if (!expense.expense_date) {
        continue;
      }

      const amount = Number(expense.amount || 0);

      result.push({
        id: `expense-${expense.id}`,

        type: "expense",

        title: this.getExpenseTypeLabel(expense.expense_type),

        description: expense.description,

        date: expense.expense_date,

        time: expense.expense_time || "00:00",

        amount: -Math.abs(amount),

        expense,
      });
    }

    /*
     * Más reciente primero.
     */
    result.sort((a, b) => {
      return this.getActivityTimestamp(b) - this.getActivityTimestamp(a);
    });

    this.activities = result;
  }

  /**
   * Actividad del mes seleccionado.
   */
  get filteredActivities(): ActivityItem[] {
    return this.activities.filter((activity) => {
      const date = this.parseDate(activity.date);

      if (!date) {
        return false;
      }

      return (
        date.getMonth() === this.selectedMonth &&
        date.getFullYear() === this.selectedYear
      );
    });
  }

  /**
   * Etiqueta del mes seleccionado.
   */
  get currentMonthLabel(): string {
    return `${this.monthNames[this.selectedMonth]} ${this.selectedYear}`;
  }

  /**
   * Mes anterior.
   */
  previousMonth() {
    if (this.selectedMonth === 0) {
      this.selectedMonth = 11;
      this.selectedYear--;
    } else {
      this.selectedMonth--;
    }

    this.expanded = null;
  }

  /**
   * Mes siguiente.
   */
  nextMonth() {
    if (this.selectedMonth === 11) {
      this.selectedMonth = 0;
      this.selectedYear++;
    } else {
      this.selectedMonth++;
    }

    this.expanded = null;
  }

  /**
   * Abrir/cerrar detalles de cualquier movimiento.
   *
   * Funciona para:
   * - trabajos
   * - pagos
   * - gastos
   */
  toggleDetails(id: string) {
    this.expanded = this.expanded === id ? null : id;
  }

  /**
   * Valor absoluto para mostrar
   * importes de pagos/gastos.
   *
   * Evita usar Math.abs() directamente
   * desde el HTML.
   */
  absoluteAmount(value: number | string | null | undefined): number {
    const amount = Number(value ?? 0);

    if (!Number.isFinite(amount)) {
      return 0;
    }

    return Math.abs(amount);
  }

  /**
   * Formatea duración correctamente.
   *
   * Ejemplos:
   * 2 + dias  -> 2 días
   * 1 + dias  -> 1 día
   * 2 + horas -> 2 horas
   * 1 + horas -> 1 hora
   */
  formatDuration(
    value: number | string | null | undefined,
    unit: string | null | undefined,
  ): string {
    if (
      value === null ||
      value === undefined ||
      value === "" ||
      !Number.isFinite(Number(value))
    ) {
      return "--";
    }

    const amount = Number(value);

    const normalizedUnit = String(unit ?? "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    if (
      normalizedUnit === "dia" ||
      normalizedUnit === "dias" ||
      normalizedUnit === "day" ||
      normalizedUnit === "days"
    ) {
      return amount === 1 ? "1 día" : `${amount} días`;
    }

    return amount === 1 ? "1 hora" : `${amount} horas`;
  }

  /**
   * Icono del movimiento.
   */
  getActivityIcon(item: ActivityItem): string {
    if (item.type === "job") {
      return "cash-outline";
    }

    if (item.type === "settlement") {
      return "people-outline";
    }

    return this.getExpenseIcon(item.expense?.expense_type);
  }

  /**
   * Etiqueta del movimiento.
   */
  getActivityTypeLabel(item: ActivityItem): string {
    if (item.type === "job") {
      return "Trabajo finalizado";
    }

    if (item.type === "settlement") {
      return "Pago empleado";
    }

    return "Gasto";
  }

  /**
   * Icono según tipo de gasto.
   */
  private getExpenseIcon(type?: ExpenseType): string {
    switch (type) {
      case "pago_vehiculo":
        return "car-outline";

      case "combustible":
        return "flame-outline";

      case "material":
        return "construct-outline";

      case "herramientas":
        return "build-outline";

      case "mantenimiento":
        return "construct-outline";

      case "peajes_parking":
        return "speedometer-outline";

      case "alquiler_equipo":
        return "business-outline";

      default:
        return "receipt-outline";
    }
  }

  /**
   * Etiquetas de gastos.
   */
  getExpenseTypeLabel(type?: string): string {
    switch (type) {
      case "pago_vehiculo":
        return "Pago vehículo";

      case "combustible":
        return "Combustible";

      case "material":
        return "Material";

      case "herramientas":
        return "Herramientas";

      case "mantenimiento":
        return "Mantenimiento";

      case "peajes_parking":
        return "Peajes / Parking";

      case "alquiler_equipo":
        return "Alquiler de equipo";

      default:
        return "Otros";
    }
  }

  /**
   * Título del trabajo.
   */
  private formatJobTitle(type: any): string {
    if (!type) {
      return "Trabajo finalizado";
    }

    return String(type)
      .replace(/\_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  /**
   * Descripción del settlement.
   *
   * IMPORTANTE:
   * Es pública porque se utiliza
   * desde el HTML.
   */
  getSettlementDescription(settlement: any): string {
    if (settlement?.settlement_type === "partial") {
      return "Pago parcial";
    }

    if (settlement?.settlement_type === "final") {
      return "Pago final";
    }

    if (settlement?.type === "partial") {
      return "Pago parcial";
    }

    if (settlement?.type === "final") {
      return "Pago final";
    }

    return "Pago registrado";
  }

  /**
   * Timestamp para ordenar.
   */
  private getActivityTimestamp(activity: ActivityItem): number {
    const date = this.parseDate(activity.date);

    if (!date) {
      return 0;
    }

    const time = activity.time || "00:00";

    const parts = time.split(":");

    if (parts.length >= 2) {
      date.setHours(
        Number(parts[0]) || 0,
        Number(parts[1]) || 0,
        Number(parts[2]) || 0,
        0,
      );
    }

    return date.getTime();
  }

  /**
   * Formatea fecha visual.
   */
  formatDate(value: any): string {
    const date = this.parseDate(value);

    if (!date) {
      return String(value || "-");
    }

    return new Intl.DateTimeFormat("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);
  }

  /**
   * Formatea hora visual.
   */
  formatTime(value: any): string {
    if (!value) {
      return "--:--";
    }

    const stringValue = String(value);

    if (stringValue.includes("T")) {
      return this.extractTime(stringValue);
    }

    return stringValue.substring(0, 5);
  }

  /**
   * Normaliza fecha.
   */
  private normalizeDate(value: any): string {
    if (!value) {
      return "";
    }

    const stringValue = String(value);

    return stringValue.substring(0, 10);
  }

  /**
   * Extrae hora de timestamp.
   */
  private extractTime(value: any): string {
    if (!value) {
      return "00:00";
    }

    const stringValue = String(value);

    const match = stringValue.match(/T(\d{2}):(\d{2})/);

    if (match) {
      return `${match[1]}:${match[2]}`;
    }

    const timeMatch = stringValue.match(/(\d{2}):(\d{2})/);

    if (timeMatch) {
      return `${timeMatch[1]}:${timeMatch[2]}`;
    }

    return "00:00";
  }

  /**
   * Parser de fechas evitando
   * problemas de zona horaria.
   */
  private parseDate(value: any): Date | null {
    if (!value) {
      return null;
    }

    if (value instanceof Date) {
      return isNaN(value.getTime()) ? null : new Date(value);
    }

    const valueString = String(value).trim();

    if (!valueString) {
      return null;
    }

    const match = valueString.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);

    if (match) {
      const year = Number(match[1]);

      const month = Number(match[2]) - 1;

      const day = Number(match[3]);

      const date = new Date(year, month, day);

      return isNaN(date.getTime()) ? null : date;
    }

    const date = new Date(valueString);

    return isNaN(date.getTime()) ? null : date;
  }
}
