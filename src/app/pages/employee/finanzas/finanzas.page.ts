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

interface FeedItem {
  kind: "trabajo" | "saldo";
  date: string;
  time?: string;
  jobType?: string;
  hoursOrDays?: number;
  workUnit?: "horas" | "dias";
  amount: number;
}

interface MonthOption {
  key: string;
  label: string;
}

@Component({
  selector: "app-employee-finanzas",
  standalone: true,
  imports: [
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
    <ion-header class="finance-header">
      <ion-toolbar>
        <ion-title>Finanzas</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="fin-content">
      <div class="fin-wrap">
        <!-- =====================================================
             HERO - GENERADO
        ====================================================== -->

        <section class="hero-card">
          <div class="hero-top-line"></div>

          <div class="hero-icon-wrapper">
            <div class="hero-icon-circle">
              <ion-icon name="wallet-outline"></ion-icon>
            </div>
          </div>

          <span class="hero-label">GENERADO</span>

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

        <section class="stat-row">
          <!-- PENDIENTE -->

          <div class="stat-card pendiente">
            <div class="stat-icon">
              <ion-icon name="time-outline"></ion-icon>
            </div>

            <div class="stat-info">
              <span class="stat-label">PENDIENTE</span>

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
              <span class="stat-label">COBRADO</span>

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
              <span class="stat-label">TRABAJOS</span>

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
            <div class="month-icon">
              <ion-icon name="calendar-outline"></ion-icon>
            </div>

            <div class="month-info">
              <span>MES SELECCIONADO</span>

              <strong>
                {{ currentMonthLabel }}
              </strong>
            </div>
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

                <span> Trabajos realizados y pagos recibidos </span>
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

                    <!--
                      AQUÍ YA NO DICE:

                      2 horas/días trabajados

                      Ahora dice:

                      2 horas
                      o
                      2 días
                    -->

                    <span class="ledger-work-duration">
                      {{ formatWorkAmount(item.hoursOrDays, item.workUnit) }}
                    </span>
                  </ng-container>

                  <!-- PAGO -->

                  <ng-container *ngIf="item.kind === 'saldo'">
                    <span class="ledger-type payment-title">
                      Pago a {{ profile?.full_name || "ti" }}
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
                      Pago recibido
                    </span>
                  </ng-container>
                </div>

                <!-- =================================================
                     DINERO
                ================================================== -->

                <div class="ledger-right">
                  <!-- TRABAJO -->

                  <span
                    *ngIf="item.kind === 'trabajo'"
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

  styles: [
    `
      :host {
        --finance-bg: #f8fafc;
        --finance-white: #ffffff;

        --finance-primary: #1769ff;
        --finance-primary-dark: #123b78;
        --finance-primary-light: #eaf1ff;

        --finance-text: #172b4d;
        --finance-text-soft: #61708a;
        --finance-muted: #8994a6;

        --finance-border: #e5eaf1;

        --finance-orange: #e99316;
        --finance-orange-bg: #fff4e4;

        --finance-green: #299b45;
        --finance-green-bg: #eaf8ed;

        --finance-shadow: 0 8px 30px rgba(24, 47, 83, 0.06);
        --finance-shadow-soft: 0 4px 18px rgba(24, 47, 83, 0.05);

        display: block;
        min-height: 100%;
        background: var(--finance-bg);
      }

      /* =========================================================
         HEADER
      ========================================================= */

      .finance-header {
        --background: #ffffff;
        background: #ffffff;
      }

      .finance-header ion-toolbar {
        --background: #ffffff;
        --border-width: 0;
        --min-height: 64px;

        height: 64px;
        padding: 0 12px;
      }

      .finance-header ion-title {
        color: var(--finance-primary-dark);

        font-size: 25px;
        font-weight: 800;

        text-align: center;

        letter-spacing: -0.5px;
      }

      /* =========================================================
         CONTENT
      ========================================================= */

      .fin-content {
        --background: var(--finance-bg);
      }

      .fin-wrap {
        width: 100%;
        max-width: 900px;

        margin: 0 auto;

        padding: 20px 16px 140px;

        box-sizing: border-box;
      }

      /* =========================================================
         HERO
      ========================================================= */

      .hero-card {
        position: relative;

        display: flex;
        flex-direction: column;
        align-items: center;

        text-align: center;

        min-height: 330px;

        padding: 32px 20px 38px;

        margin-bottom: 22px;

        background: linear-gradient(
          180deg,
          #ffffff 0%,
          #ffffff 70%,
          #f5f8ff 100%
        );

        border: 1px solid #e5eaf2;
        border-radius: 24px;

        overflow: hidden;

        box-shadow: 0 12px 35px rgba(28, 51, 86, 0.07);
      }

      .hero-top-line {
        position: absolute;

        top: 0;
        left: 0;
        right: 0;

        height: 8px;

        background: linear-gradient(90deg, #1769ff, #123b78);
      }

      .hero-icon-wrapper {
        width: 90px;
        height: 90px;

        display: flex;
        align-items: center;
        justify-content: center;

        margin-top: 5px;
        margin-bottom: 16px;

        border-radius: 50%;

        background: radial-gradient(
          circle,
          #ffffff 35%,
          #edf3ff 36%,
          #edf3ff 100%
        );
      }

      .hero-icon-circle {
        width: 54px;
        height: 54px;

        display: flex;
        align-items: center;
        justify-content: center;

        border-radius: 16px;

        background: #ffffff;

        box-shadow: 0 5px 18px rgba(23, 105, 255, 0.16);
      }

      .hero-icon-circle ion-icon {
        font-size: 31px;
        color: var(--finance-primary);
      }

      .hero-label {
        color: var(--finance-primary);

        font-size: 0.72rem;
        font-weight: 800;

        letter-spacing: 0.22em;

        text-transform: uppercase;
      }

      .hero-value {
        display: flex;
        align-items: baseline;

        margin-top: 9px;

        color: var(--finance-primary-dark);

        font-size: 4.1rem;
        line-height: 1;

        font-weight: 800;

        letter-spacing: -2px;

        font-variant-numeric: tabular-nums;
      }

      .hero-value small {
        margin-left: 7px;

        font-size: 1.35rem;
        font-weight: 500;

        color: var(--finance-text-soft);

        letter-spacing: 0;
      }

      .hero-rule {
        width: 70px;
        height: 3px;

        margin: 20px 0 15px;

        border-radius: 10px;

        background: var(--finance-primary);
      }

      .hero-sub {
        color: var(--finance-text-soft);

        font-size: 0.9rem;
        font-weight: 500;
      }

      .hero-wave {
        position: absolute;

        bottom: -80px;
        left: -5%;

        width: 110%;
        height: 130px;

        border-radius: 50% 50% 0 0;

        background: rgba(23, 105, 255, 0.055);

        transform: rotate(-2deg);
      }

      /* =========================================================
         ESTADÍSTICAS
      ========================================================= */

      .stat-row {
        display: grid;

        grid-template-columns: repeat(3, minmax(0, 1fr));

        gap: 12px;

        margin-bottom: 22px;
      }

      .stat-card {
        position: relative;

        min-height: 150px;

        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;

        text-align: center;

        padding: 16px 8px;

        background: #ffffff;

        border: 1px solid var(--finance-border);

        border-radius: 20px;

        box-shadow: var(--finance-shadow-soft);

        overflow: hidden;
      }

      .stat-icon {
        width: 52px;
        height: 52px;

        display: flex;
        align-items: center;
        justify-content: center;

        margin-bottom: 10px;

        border-radius: 50%;
      }

      .stat-icon ion-icon {
        font-size: 27px;
      }

      .stat-info {
        display: flex;
        flex-direction: column;
        align-items: center;

        gap: 5px;
      }

      .stat-label {
        color: var(--finance-text-soft);

        font-size: 0.66rem;
        font-weight: 800;

        letter-spacing: 0.12em;

        text-transform: uppercase;
      }

      .stat-value {
        font-size: 1.18rem;
        font-weight: 800;

        line-height: 1.1;

        font-variant-numeric: tabular-nums;
      }

      .stat-value small {
        font-size: 0.85rem;
        font-weight: 600;
      }

      /* =========================================================
         PENDIENTE
      ========================================================= */

      .stat-card.pendiente {
        background: linear-gradient(180deg, #ffffff 0%, #fffaf2 100%);
      }

      .stat-card.pendiente .stat-icon {
        background: var(--finance-orange-bg);
      }

      .stat-card.pendiente .stat-icon ion-icon {
        color: var(--finance-orange);
      }

      .stat-card.pendiente .stat-value {
        color: var(--finance-orange);
      }

      /* =========================================================
         PAGADO
      ========================================================= */

      .stat-card.pagado {
        background: linear-gradient(180deg, #ffffff 0%, #f6fcf7 100%);
      }

      .stat-card.pagado .stat-icon {
        background: var(--finance-green-bg);
      }

      .stat-card.pagado .stat-icon ion-icon {
        color: var(--finance-green);
      }

      .stat-card.pagado .stat-value {
        color: var(--finance-green);
      }

      /* =========================================================
         TRABAJOS
      ========================================================= */

      .stat-card.trabajos {
        background: linear-gradient(180deg, #ffffff 0%, #f5f8ff 100%);
      }

      .stat-card.trabajos .stat-icon {
        background: var(--finance-primary-light);
      }

      .stat-card.trabajos .stat-icon ion-icon {
        color: var(--finance-primary);
      }

      .stat-card.trabajos .stat-value {
        color: var(--finance-primary);
      }

      /* =========================================================
         DECORACIÓN
      ========================================================= */

      .stat-decoration {
        position: absolute;

        bottom: 8px;
        left: 50%;

        transform: translateX(-50%);

        width: 42px;
        height: 3px;

        border-radius: 10px;

        opacity: 0.35;
      }

      .pendiente .stat-decoration {
        background: var(--finance-orange);
      }

      .pagado .stat-decoration {
        background: var(--finance-green);
      }

      .trabajos .stat-decoration {
        background: var(--finance-primary);
      }

      /* =========================================================
         SELECTOR MES
      ========================================================= */

      .month-selector {
        position: relative;

        display: flex;
        align-items: center;
        justify-content: space-between;

        width: 100%;
        min-height: 74px;

        padding: 10px;
        margin-bottom: 22px;

        box-sizing: border-box;

        background: linear-gradient(135deg, #ffffff 0%, #f7faff 100%);

        border: 1px solid var(--finance-border);
        border-radius: 20px;

        box-shadow: var(--finance-shadow-soft);

        overflow: hidden;
      }

      .month-selector::before {
        content: "";

        position: absolute;

        top: 0;
        left: 0;
        right: 0;

        height: 4px;

        background: linear-gradient(90deg, var(--finance-primary), #65a0ff);
      }

      .month-arrow {
        width: 44px;
        height: 44px;

        flex: 0 0 44px;

        display: flex;
        align-items: center;
        justify-content: center;

        padding: 0;

        border: 1px solid var(--finance-border);
        border-radius: 14px;

        background: #ffffff;

        color: var(--finance-primary);

        cursor: pointer;

        transition:
          transform 0.15s ease,
          background 0.15s ease;
      }

      .month-arrow:hover {
        background: var(--finance-primary-light);
      }

      .month-arrow:active {
        transform: scale(0.94);
      }

      .month-arrow ion-icon {
        font-size: 22px;
      }

      .month-current {
        display: flex;
        align-items: center;
        justify-content: center;

        gap: 10px;

        min-width: 0;

        text-align: center;
      }

      .month-icon {
        width: 42px;
        height: 42px;

        flex: 0 0 42px;

        display: flex;
        align-items: center;
        justify-content: center;

        border-radius: 13px;

        background: var(--finance-primary-light);

        color: var(--finance-primary);
      }

      .month-icon ion-icon {
        font-size: 21px;
      }

      .month-info {
        min-width: 0;

        text-align: left;
      }

      .month-info span {
        display: block;

        margin-bottom: 2px;

        color: var(--finance-muted);

        font-size: 9px;
        font-weight: 800;

        letter-spacing: 0.9px;
      }

      .month-info strong {
        display: block;

        color: var(--finance-primary-dark);

        font-size: 18px;
        font-weight: 800;

        text-transform: capitalize;

        white-space: nowrap;
      }

      /* =========================================================
         ACTIVIDAD
      ========================================================= */

      .activity-section {
        width: 100%;
      }

      .section-header {
        display: flex;
        align-items: center;
        justify-content: space-between;

        gap: 12px;

        margin: 0 2px 14px;
      }

      .section-title-wrapper {
        display: flex;
        align-items: center;

        gap: 10px;

        min-width: 0;
      }

      .section-icon {
        width: 40px;
        height: 40px;

        flex: 0 0 40px;

        display: flex;
        align-items: center;
        justify-content: center;

        border-radius: 12px;

        background: var(--finance-primary);

        box-shadow: 0 5px 14px rgba(23, 105, 255, 0.2);
      }

      .section-icon ion-icon {
        color: #ffffff;
        font-size: 21px;
      }

      .section-title-text {
        min-width: 0;
      }

      .section-title-text h3 {
        margin: 0;

        color: var(--finance-text);

        font-size: 0.86rem;
        font-weight: 800;

        letter-spacing: 0.04em;

        line-height: 1.25;
      }

      .section-title-text span {
        display: block;

        margin-top: 3px;

        color: var(--finance-text-soft);

        font-size: 0.72rem;
      }

      /* =========================================================
         SCROLL INTERNO DE ACTIVIDAD
      ========================================================= */

      .ledger-scroll {
        width: 100%;

        max-height: 520px;

        overflow-y: auto;
        overflow-x: hidden;

        padding-right: 4px;

        box-sizing: border-box;

        overscroll-behavior: contain;

        -webkit-overflow-scrolling: touch;

        scrollbar-width: thin;

        scrollbar-color: #cbd5e1 transparent;
      }

      .ledger-scroll::-webkit-scrollbar {
        width: 6px;
      }

      .ledger-scroll::-webkit-scrollbar-track {
        background: transparent;
      }

      .ledger-scroll::-webkit-scrollbar-thumb {
        background: #cbd5e1;

        border-radius: 10px;
      }

      /* =========================================================
         LEDGER
      ========================================================= */

      .ledger {
        overflow: hidden;

        background: #ffffff;

        border: 1px solid var(--finance-border);

        border-radius: 20px;

        box-shadow: var(--finance-shadow-soft);
      }

      .ledger-row {
        display: flex;
        align-items: center;

        gap: 12px;

        min-height: 92px;

        padding: 13px 15px;

        box-sizing: border-box;

        border-bottom: 1px solid #edf0f4;
      }

      .ledger-row:last-child {
        border-bottom: none;
      }

      /* =========================================================
         ICONOS
      ========================================================= */

      .activity-icon {
        width: 46px;
        height: 46px;

        flex: 0 0 46px;

        display: flex;
        align-items: center;
        justify-content: center;

        border-radius: 14px;
      }

      .activity-icon ion-icon {
        font-size: 22px;
      }

      .activity-icon.income {
        background: var(--finance-green-bg);
        color: var(--finance-green);
      }

      .activity-icon.payment {
        background: var(--finance-orange-bg);
        color: var(--finance-orange);
      }

      /* =========================================================
         INFORMACIÓN
      ========================================================= */

      .ledger-main {
        display: flex;
        flex-direction: column;

        flex: 1;

        min-width: 0;
      }

      .ledger-type {
        overflow: hidden;

        color: var(--finance-text);

        font-size: 0.92rem;
        font-weight: 800;

        text-overflow: ellipsis;

        white-space: nowrap;
      }

      .ledger-description {
        display: flex;
        align-items: center;
        flex-wrap: wrap;

        gap: 9px;

        margin-top: 5px;

        color: var(--finance-text-soft);

        font-size: 0.73rem;
      }

      .data-item {
        display: inline-flex;
        align-items: center;

        gap: 4px;
      }

      .data-item ion-icon {
        font-size: 14px;

        color: var(--finance-primary);
      }

      /* =========================================================
         DURACIÓN DEL TRABAJO
      ========================================================= */

      .ledger-work-duration {
        display: inline-flex;
        align-items: center;

        width: fit-content;

        margin-top: 6px;

        padding: 4px 8px;

        border-radius: 8px;

        background: var(--finance-primary-light);

        color: var(--finance-primary);

        font-size: 0.7rem;

        font-weight: 800;
      }

      /* =========================================================
         PAGO
      ========================================================= */

      .payment-title {
        color: var(--finance-text);
      }

      .payment-description {
        margin-top: 5px;

        color: var(--finance-orange);

        font-size: 0.68rem;

        font-weight: 600;
      }

      /* =========================================================
         DINERO
      ========================================================= */

      .ledger-right {
        display: flex;
        align-items: center;

        gap: 7px;

        margin-left: 5px;
      }

      .ledger-amount {
        font-size: 0.94rem;
        font-weight: 800;

        white-space: nowrap;

        font-variant-numeric: tabular-nums;
      }

      .ledger-amount.income {
        color: var(--finance-green);
      }

      .ledger-amount.payment-amount {
        color: var(--finance-orange);
      }

      /* =========================================================
         EMPTY
      ========================================================= */

      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;

        min-height: 280px;

        padding: 35px 20px;

        text-align: center;

        background: #ffffff;

        border: 1px solid var(--finance-border);

        border-radius: 20px;

        box-shadow: var(--finance-shadow-soft);
      }

      .empty-icon-wrapper {
        width: 110px;
        height: 110px;

        display: flex;
        align-items: center;
        justify-content: center;

        margin-bottom: 16px;

        border-radius: 50%;

        border: 1px dashed #dce7fa;

        background: #f8fbff;
      }

      .empty-icon {
        width: 70px;
        height: 70px;

        display: flex;
        align-items: center;
        justify-content: center;

        border-radius: 20px;

        background: var(--finance-primary-light);
      }

      .empty-icon ion-icon {
        font-size: 38px;

        color: var(--finance-primary);
      }

      .empty-state h4 {
        margin: 0 0 8px;

        color: var(--finance-text);

        font-size: 1rem;
        font-weight: 800;
      }

      .empty-state p {
        max-width: 300px;

        margin: 0;

        color: var(--finance-text-soft);

        font-size: 0.84rem;

        line-height: 1.5;
      }

      /* =========================================================
         TABBAR
      ========================================================= */

      .employee-tabbar-container {
        position: fixed;

        left: 0;
        right: 0;
        bottom: 0;

        z-index: 10000;

        width: 100%;

        background: #ffffff;

        border-top: 1px solid var(--finance-border);

        box-shadow: 0 -6px 20px rgba(24, 47, 83, 0.08);

        padding-bottom: env(safe-area-inset-bottom);

        display: block;
      }

      /* =========================================================
         TABLET
      ========================================================= */

      @media (max-width: 700px) {
        .stat-row {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
      }

      /* =========================================================
         MÓVIL
      ========================================================= */

      @media (max-width: 500px) {
        .fin-wrap {
          padding-left: 14px;
          padding-right: 14px;
        }

        .hero-card {
          min-height: 300px;

          padding: 28px 16px 34px;
        }

        .hero-value {
          font-size: 3.4rem;
        }

        .stat-card {
          min-height: 135px;

          padding: 12px 5px;
        }

        .stat-icon {
          width: 46px;
          height: 46px;
        }

        .stat-icon ion-icon {
          font-size: 24px;
        }

        .stat-label {
          font-size: 0.56rem;
        }

        .stat-value {
          font-size: 0.98rem;
        }

        .section-title-text h3 {
          font-size: 0.75rem;
        }

        .section-title-text span {
          font-size: 0.65rem;
        }

        .ledger-scroll {
          max-height: 58vh;
        }

        .ledger-row {
          gap: 9px;

          padding: 11px 10px;
        }

        .activity-icon {
          width: 40px;
          height: 40px;

          flex-basis: 40px;
        }

        .activity-icon ion-icon {
          font-size: 20px;
        }

        .ledger-type {
          font-size: 0.82rem;
        }

        .ledger-description {
          gap: 6px;

          font-size: 0.68rem;
        }

        .ledger-work-duration {
          font-size: 0.65rem;

          padding: 4px 7px;
        }

        .ledger-amount {
          font-size: 0.78rem;
        }

        .month-info strong {
          font-size: 16px;
        }
      }

      /* =========================================================
         MÓVIL PEQUEÑO
      ========================================================= */

      @media (max-width: 380px) {
        .fin-wrap {
          padding-left: 12px;
          padding-right: 12px;
        }

        .hero-value {
          font-size: 3rem;
        }

        .stat-card {
          min-height: 125px;

          padding-left: 3px;
          padding-right: 3px;
        }

        .stat-icon {
          width: 42px;
          height: 42px;
        }

        .stat-icon ion-icon {
          font-size: 22px;
        }

        .stat-label {
          font-size: 0.51rem;
        }

        .stat-value {
          font-size: 0.9rem;
        }

        .month-arrow {
          width: 40px;
          height: 40px;

          flex-basis: 40px;
        }

        .month-icon {
          width: 38px;
          height: 38px;

          flex-basis: 38px;
        }

        .month-info strong {
          font-size: 15px;
        }

        .ledger-row {
          min-height: 88px;
        }

        .ledger-description {
          flex-direction: column;

          align-items: flex-start;

          gap: 2px;
        }

        .ledger-right {
          margin-left: 2px;
        }
      }

      /* =========================================================
         ESCRITORIO
      ========================================================= */

      @media (min-width: 768px) {
        .fin-wrap {
          padding: 30px 30px 140px;
        }

        .hero-card {
          min-height: 360px;
        }

        .hero-value {
          font-size: 5rem;
        }

        .stat-card {
          min-height: 165px;
        }

        .ledger-scroll {
          max-height: 600px;
        }

        .ledger-row {
          padding-left: 20px;
          padding-right: 20px;
        }
      }
    `,
  ],
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
       TOTALES
    ======================================================= */

    this.calculateBalance();

    /* =======================================================
       MESES
    ======================================================= */

    this.setAvailableMonths();
  }

  /* =========================================================
     DETECTAR SI EL TRABAJO ES POR HORAS O DÍAS
  ========================================================= */

  private detectWorkUnit(item: any): "horas" | "dias" {
    /*
     * Primero buscamos campos específicos de unidad.
     */

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

    /*
     * Si la vista guarda directamente un texto
     * como "2 días" o "2 horas", también lo detectamos.
     */

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

    /*
     * Último recurso:
     *
     * Si tu vista actual no está devolviendo ningún campo
     * que indique la unidad, usamos "horas" para no romper
     * la pantalla.
     *
     * Si en tu base de datos tienes un campo concreto que
     * indica "horas" o "días", esta función lo detectará
     * automáticamente arriba.
     */

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
  }

  /* =========================================================
     CALCULAR SALDOS
  ========================================================= */

  private calculateBalance() {
    /*
     * DINERO GENERADO
     *
     * Solamente trabajos.
     */

    this.generated = this.jobs.reduce((total: number, job: FeedItem) => {
      const amount = Number(job.amount ?? 0);

      return Number.isFinite(amount) ? total + amount : total;
    }, 0);

    /*
     * DINERO COBRADO
     *
     * Solamente pagos.
     */

    this.paid = this.feed
      .filter((item) => item.kind === "saldo")
      .reduce((total: number, item: FeedItem) => {
        const amount = Number(item.amount ?? 0);

        return Number.isFinite(amount) ? total + amount : total;
      }, 0);

    /*
     * PENDIENTE
     */

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
     * comenzamos en el más reciente.
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

    const match = dateValue.match(/^(\\d{4})-(\\d{2})/);

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

    const match = value.match(/^(\\d{4})-(\\d{2})-(\\d{2})/);

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
