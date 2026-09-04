import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";

import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonIcon,
  IonRefresher,
  IonRefresherContent,
} from "@ionic/angular/standalone";

import { addIcons } from "ionicons";

import {
  checkmarkCircleOutline,
  checkmarkDoneCircleOutline,
  locationOutline,
  callOutline,
  timeOutline,
  personOutline,
  peopleOutline,
  briefcaseOutline,
  cashOutline,
  calendarOutline,
  hourglassOutline,
  chevronForwardOutline,
} from "ionicons/icons";

import { SupabaseService } from "../../../services/supabase.service";
import { EmployeeTabbarComponent } from "../../../components/employee-tabbar.component";

interface ConfirmedJob {
  id: any;
  jobType: string;
  clientName: string;
  clientPhone: string;
  address: string;
  startTime: string;
  workerName: string;
}

interface FinishedJob {
  id: any;
  jobType: string;
  amount: number;
  hoursOrDays: number | null;
  date: string;
  time: string;
  workerName: string;
  detailsOpen?: boolean;
}

@Component({
  selector: "app-employee-trabajos",
  standalone: true,

  imports: [
    EmployeeTabbarComponent,
    CommonModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonIcon,
    IonRefresher,
    IonRefresherContent,
  ],

  template: `
    <ion-header class="work-header">
      <ion-toolbar>
        <ion-title>Trabajos</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="work-content">
      <ion-refresher slot="fixed" (ionRefresh)="refresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <div class="page-wrap">
        <!-- CABECERA -->
        <div class="intro">
          <div class="intro-icon">
            <ion-icon name="briefcase-outline"></ion-icon>
          </div>

          <div>
            <h1>Mis trabajos</h1>
            <p>Consulta tus trabajos y su estado</p>
          </div>
        </div>

        <!-- SELECTOR -->
        <div class="status-selector">
          <button
            type="button"
            class="status-button confirmed-button"
            [class.active]="activeTab === 'confirmados'"
            (click)="selectTab('confirmados')"
          >
            <ion-icon name="checkmark-circle-outline"></ion-icon>

            <span>Confirmados</span>

            <strong>{{ confirmedJobs.length }}</strong>
          </button>

          <button
            type="button"
            class="status-button finished-button"
            [class.active]="activeTab === 'finalizados'"
            (click)="selectTab('finalizados')"
          >
            <ion-icon name="checkmark-done-circle-outline"></ion-icon>

            <span>Finalizados</span>

            <strong>{{ finishedJobs.length }}</strong>
          </button>
        </div>

        <!-- ================================================= -->
        <!-- CONFIRMADOS -->
        <!-- ================================================= -->

        <section *ngIf="activeTab === 'confirmados'" class="jobs-section">
          <div class="section-heading">
            <div class="section-title-box confirmed-title-box">
              <ion-icon name="checkmark-circle-outline"></ion-icon>
            </div>

            <div>
              <h2>Trabajos confirmados</h2>
              <p>Trabajos que tienes asignados</p>
            </div>
          </div>

          <!-- SCROLL INTERNO -->
          <div
            class="jobs-scroll"
            *ngIf="confirmedJobs.length > 0; else noConfirmed"
          >
            <article
              class="job-card confirmed-card"
              *ngFor="let job of confirmedJobs"
            >
              <div class="card-top">
                <div class="job-icon confirmed-job-icon">
                  <ion-icon name="briefcase-outline"></ion-icon>
                </div>

                <div class="job-main">
                  <h3>
                    {{ job.jobType || "Trabajo" | titlecase }}
                  </h3>

                  <div class="status-pill confirmed-pill">
                    <ion-icon name="checkmark-circle-outline"></ion-icon>
                    Confirmado
                  </div>
                </div>
              </div>

              <div class="job-divider"></div>

              <div class="detail-grid">
                <!-- CLIENTE -->
                <div class="detail-item">
                  <div class="detail-icon">
                    <ion-icon name="person-outline"></ion-icon>
                  </div>

                  <div>
                    <span>Cliente</span>

                    <strong>
                      {{ job.clientName || "No disponible" }}
                    </strong>
                  </div>
                </div>

                <!-- TELEFONO -->
                <div class="detail-item">
                  <div class="detail-icon">
                    <ion-icon name="call-outline"></ion-icon>
                  </div>

                  <div>
                    <span>Teléfono</span>

                    <strong>
                      {{ job.clientPhone || "No disponible" }}
                    </strong>
                  </div>
                </div>

                <!-- UBICACION -->
                <div class="detail-item full-width">
                  <div class="detail-icon">
                    <ion-icon name="location-outline"></ion-icon>
                  </div>

                  <div>
                    <span>Ubicación</span>

                    <strong>
                      {{ job.address || "No disponible" }}
                    </strong>
                  </div>
                </div>

                <!-- HORA -->
                <div class="detail-item">
                  <div class="detail-icon">
                    <ion-icon name="time-outline"></ion-icon>
                  </div>

                  <div>
                    <span>Hora del trabajo</span>

                    <strong>
                      {{ formatTime(job.startTime) }}
                    </strong>
                  </div>
                </div>

                <!-- COMPAÑERO -->
                <div class="detail-item">
                  <div class="detail-icon">
                    <ion-icon name="people-outline"></ion-icon>
                  </div>

                  <div>
                    <span>Trabajarás con</span>

                    <strong>
                      {{ job.workerName || "No indicado" }}
                    </strong>
                  </div>
                </div>
              </div>
            </article>
          </div>

          <ng-template #noConfirmed>
            <div class="empty-state">
              <div class="empty-icon confirmed-empty">
                <ion-icon name="checkmark-circle-outline"></ion-icon>
              </div>

              <h3>No tienes trabajos confirmados</h3>

              <p>Cuando tengas un trabajo confirmado aparecerá aquí.</p>
            </div>
          </ng-template>
        </section>

        <!-- ================================================= -->
        <!-- FINALIZADOS -->
        <!-- ================================================= -->

        <section *ngIf="activeTab === 'finalizados'" class="jobs-section">
          <div class="section-heading">
            <div class="section-title-box finished-title-box">
              <ion-icon name="checkmark-done-circle-outline"></ion-icon>
            </div>

            <div>
              <h2>Trabajos finalizados</h2>
              <p>Trabajos que ya has realizado</p>
            </div>
          </div>

          <!-- SCROLL INTERNO -->
          <div
            class="jobs-scroll finished-scroll"
            *ngIf="finishedJobs.length > 0; else noFinished"
          >
            <article
              class="job-card finished-card"
              *ngFor="let job of finishedJobs"
            >
              <!-- PARTE PRINCIPAL -->
              <div class="finished-main">
                <div class="finished-job-left">
                  <div class="job-icon finished-job-icon">
                    <ion-icon name="checkmark-done-circle-outline"></ion-icon>
                  </div>

                  <div class="job-main">
                    <h3>
                      {{ job.jobType || "Trabajo" | titlecase }}
                    </h3>

                    <div class="status-pill finished-pill">
                      <ion-icon name="checkmark-done-circle-outline"></ion-icon>
                      Finalizado
                    </div>
                  </div>
                </div>

                <!-- COBRO -->
                <div class="amount-box">
                  <span>Cobro</span>

                  <strong> {{ job.amount | number: "1.2-2" }} € </strong>
                </div>
              </div>

              <!-- BOTON DETALLES -->
              <button
                type="button"
                class="details-button"
                (click)="toggleDetails(job)"
              >
                <span>
                  {{ job.detailsOpen ? "Ocultar detalles" : "Ver detalles" }}
                </span>

                <ion-icon
                  name="chevron-forward-outline"
                  [class.rotated]="job.detailsOpen"
                ></ion-icon>
              </button>

              <!-- DETALLES DESPLEGABLES -->
              <div
                class="finished-details-wrapper"
                [class.open]="job.detailsOpen"
              >
                <div class="finished-details">
                  <!-- FECHA -->
                  <div class="finished-detail">
                    <div class="finished-detail-icon">
                      <ion-icon name="calendar-outline"></ion-icon>
                    </div>

                    <div>
                      <span>Fecha</span>

                      <strong>
                        {{ formatDate(job.date) }}
                      </strong>
                    </div>
                  </div>

                  <!-- HORA -->
                  <div class="finished-detail">
                    <div class="finished-detail-icon">
                      <ion-icon name="time-outline"></ion-icon>
                    </div>

                    <div>
                      <span>Hora</span>

                      <strong>
                        {{ formatTime(job.time) }}
                      </strong>
                    </div>
                  </div>

                  <!-- HORAS -->
                  <div class="finished-detail">
                    <div class="finished-detail-icon">
                      <ion-icon name="hourglass-outline"></ion-icon>
                    </div>

                    <div>
                      <span>Horas trabajadas</span>

                      <strong>
                        {{ formatHours(job.hoursOrDays) }}
                      </strong>
                    </div>
                  </div>

                  <!-- PERSONAS -->
                  <div class="finished-detail">
                    <div class="finished-detail-icon">
                      <ion-icon name="people-outline"></ion-icon>
                    </div>

                    <div>
                      <span>Trabajó con</span>

                      <strong>
                        {{ job.workerName || "No indicado" }}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          </div>

          <ng-template #noFinished>
            <div class="empty-state">
              <div class="empty-icon finished-empty">
                <ion-icon name="checkmark-done-circle-outline"></ion-icon>
              </div>

              <h3>No tienes trabajos finalizados</h3>

              <p>Los trabajos que termines aparecerán aquí.</p>
            </div>
          </ng-template>
        </section>
      </div>
    </ion-content>

    <!-- TABBAR FUERA DEL ION-CONTENT -->
    <app-employee-tabbar></app-employee-tabbar>
  `,

  styles: [
    `
      :host {
        --primary-blue: #1769e0;
        --primary-blue-dark: #0d4fae;
        --primary-blue-light: #eaf3ff;

        --green: #20a464;
        --green-dark: #16824e;
        --green-light: #eaf9f1;

        --text-dark: #182433;
        --text-medium: #667085;
        --text-light: #98a2b3;

        --border: #e8edf3;
        --page-bg: #f6f8fb;

        display: block;
        min-height: 100%;
        background: var(--page-bg);
      }

      /* =====================================================
         HEADER
      ===================================================== */

      .work-header {
        box-shadow: none;
      }

      .work-header ion-toolbar {
        --background: #ffffff;
        --border-width: 0;
        --min-height: 64px;
      }

      .work-header ion-title {
        color: var(--text-dark);
        font-size: 20px;
        font-weight: 800;
        text-align: center;
        letter-spacing: -0.3px;
      }

      /* =====================================================
         CONTENT
      ===================================================== */

      .work-content {
        --background: var(--page-bg);
      }

      .page-wrap {
        width: min(900px, calc(100% - 32px));
        margin: 0 auto;
        padding: 26px 0 130px;
      }

      /* =====================================================
         INTRO
      ===================================================== */

      .intro {
        display: flex;
        align-items: center;
        gap: 14px;
        margin-bottom: 24px;
      }

      .intro-icon {
        width: 48px;
        height: 48px;
        border-radius: 15px;
        background: var(--primary-blue-light);
        color: var(--primary-blue);

        display: flex;
        align-items: center;
        justify-content: center;

        flex-shrink: 0;
      }

      .intro-icon ion-icon {
        font-size: 25px;
      }

      .intro h1 {
        margin: 0;
        color: var(--text-dark);
        font-size: 25px;
        font-weight: 850;
        letter-spacing: -0.6px;
      }

      .intro p {
        margin: 4px 0 0;
        color: var(--text-medium);
        font-size: 14px;
      }

      /* =====================================================
         SELECTOR
      ===================================================== */

      .status-selector {
        background: #ffffff;
        border-radius: 18px;
        padding: 6px;

        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 6px;

        border: 1px solid var(--border);
        box-shadow: 0 6px 20px rgba(20, 40, 70, 0.05);

        margin-bottom: 30px;
      }

      .status-button {
        min-height: 58px;

        border: 0;
        border-radius: 14px;

        background: #ffffff;

        display: flex;
        align-items: center;
        justify-content: center;

        gap: 9px;
        padding: 0 14px;

        cursor: pointer;

        font-family: inherit;
        font-size: 14px;
        font-weight: 800;

        transition:
          background 0.2s ease,
          color 0.2s ease,
          transform 0.15s ease,
          box-shadow 0.2s ease;
      }

      .status-button:active {
        transform: scale(0.98);
      }

      .status-button ion-icon {
        font-size: 21px;
      }

      .status-button strong {
        min-width: 25px;
        height: 25px;
        border-radius: 50%;

        display: flex;
        align-items: center;
        justify-content: center;

        font-size: 12px;
      }

      /* =====================================================
         CONFIRMADOS
      ===================================================== */

      .confirmed-button {
        color: var(--primary-blue);
      }

      .confirmed-button strong {
        background: var(--primary-blue-light);
        color: var(--primary-blue);
      }

      .confirmed-button.active {
        background: var(--primary-blue);
        color: #ffffff;
        box-shadow: 0 7px 18px rgba(23, 105, 224, 0.22);
      }

      .confirmed-button.active strong {
        background: rgba(255, 255, 255, 0.2);
        color: #ffffff;
      }

      /* =====================================================
         FINALIZADOS
      ===================================================== */

      .finished-button {
        color: var(--green);
      }

      .finished-button strong {
        background: var(--green-light);
        color: var(--green);
      }

      .finished-button.active {
        background: var(--green);
        color: #ffffff;
        box-shadow: 0 7px 18px rgba(32, 164, 100, 0.22);
      }

      .finished-button.active strong {
        background: rgba(255, 255, 255, 0.2);
        color: #ffffff;
      }

      /* =====================================================
         SECTION
      ===================================================== */

      .jobs-section {
        animation: fadeIn 0.2s ease;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(5px);
        }

        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .section-heading {
        display: flex;
        align-items: center;
        gap: 13px;
        margin-bottom: 17px;
      }

      .section-title-box {
        width: 43px;
        height: 43px;
        border-radius: 13px;

        display: flex;
        align-items: center;
        justify-content: center;

        flex-shrink: 0;
      }

      .section-title-box ion-icon {
        font-size: 22px;
      }

      .confirmed-title-box {
        background: var(--primary-blue-light);
        color: var(--primary-blue);
      }

      .finished-title-box {
        background: var(--green-light);
        color: var(--green);
      }

      .section-heading h2 {
        margin: 0;
        color: var(--text-dark);
        font-size: 18px;
        font-weight: 850;
        letter-spacing: -0.25px;
      }

      .section-heading p {
        margin: 3px 0 0;
        color: var(--text-medium);
        font-size: 13px;
      }

      /* =====================================================
         SCROLL INTERNO
      ===================================================== */

      .jobs-scroll {
        display: flex;
        flex-direction: column;
        gap: 16px;

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

      .jobs-scroll::-webkit-scrollbar {
        width: 6px;
      }

      .jobs-scroll::-webkit-scrollbar-track {
        background: transparent;
      }

      .jobs-scroll::-webkit-scrollbar-thumb {
        background: #cbd5e1;
        border-radius: 20px;
      }

      .jobs-scroll::-webkit-scrollbar-thumb:hover {
        background: #94a3b8;
      }

      /* =====================================================
         TARJETA
      ===================================================== */

      .job-card {
        width: 100%;
        box-sizing: border-box;

        background: #ffffff;

        border-radius: 22px;
        border: 1px solid var(--border);

        padding: 20px;

        box-shadow: 0 8px 25px rgba(20, 40, 70, 0.055);

        overflow: hidden;

        flex-shrink: 0;
      }

      /* =====================================================
         CARD TOP
      ===================================================== */

      .card-top {
        display: flex;
        align-items: flex-start;
        gap: 13px;
      }

      .job-icon {
        width: 49px;
        height: 49px;
        border-radius: 15px;

        display: flex;
        align-items: center;
        justify-content: center;

        flex-shrink: 0;
      }

      .job-icon ion-icon {
        font-size: 25px;
      }

      .confirmed-job-icon {
        background: var(--primary-blue-light);
        color: var(--primary-blue);
      }

      .finished-job-icon {
        background: var(--green-light);
        color: var(--green);
      }

      .job-main {
        min-width: 0;
        flex: 1;
      }

      .job-main h3 {
        margin: 2px 0 7px;

        color: var(--text-dark);

        font-size: 19px;
        font-weight: 850;

        text-transform: capitalize;
      }

      .status-pill {
        display: inline-flex;
        align-items: center;

        gap: 5px;

        padding: 5px 9px;

        border-radius: 20px;

        font-size: 11px;
        font-weight: 800;
      }

      .status-pill ion-icon {
        font-size: 14px;
      }

      .confirmed-pill {
        background: var(--primary-blue-light);
        color: var(--primary-blue);
      }

      .finished-pill {
        background: var(--green-light);
        color: var(--green-dark);
      }

      /* =====================================================
         DIVIDER
      ===================================================== */

      .job-divider {
        height: 1px;
        background: var(--border);
        margin: 19px 0;
      }

      /* =====================================================
         CONFIRMED DETAILS
      ===================================================== */

      .detail-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 17px 14px;
      }

      .detail-item {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        min-width: 0;
      }

      .detail-item.full-width {
        grid-column: 1 / -1;
      }

      .detail-icon {
        width: 35px;
        height: 35px;
        border-radius: 10px;

        background: #f4f7fb;
        color: var(--primary-blue);

        display: flex;
        align-items: center;
        justify-content: center;

        flex-shrink: 0;
      }

      .detail-icon ion-icon {
        font-size: 17px;
      }

      .detail-item span,
      .finished-detail span {
        display: block;

        color: var(--text-light);

        font-size: 11px;
        font-weight: 700;

        margin-bottom: 3px;
      }

      .detail-item strong,
      .finished-detail strong {
        display: block;

        color: var(--text-dark);

        font-size: 13px;
        font-weight: 750;

        line-height: 1.35;

        word-break: break-word;
      }

      /* =====================================================
         FINALIZADO - PARTE PRINCIPAL
      ===================================================== */

      .finished-main {
        display: flex;
        align-items: center;
        justify-content: space-between;

        gap: 15px;
      }

      .finished-job-left {
        display: flex;
        align-items: flex-start;

        gap: 13px;

        min-width: 0;
        flex: 1;
      }

      /* =====================================================
         AMOUNT
      ===================================================== */

      .amount-box {
        text-align: right;
        padding-left: 10px;
        flex-shrink: 0;
      }

      .amount-box span {
        display: block;

        color: var(--text-light);

        font-size: 11px;
        font-weight: 700;

        margin-bottom: 2px;
      }

      .amount-box strong {
        color: var(--green);

        font-size: 20px;
        font-weight: 900;

        white-space: nowrap;
      }

      /* =====================================================
         BOTON DETALLES
      ===================================================== */

      .details-button {
        width: 100%;

        margin-top: 18px;

        padding: 11px 13px;

        border: 1px solid var(--border);
        border-radius: 12px;

        background: #f8fafc;

        color: var(--text-dark);

        display: flex;
        align-items: center;
        justify-content: space-between;

        font-family: inherit;

        font-size: 12px;
        font-weight: 800;

        cursor: pointer;

        transition:
          background 0.2s ease,
          border-color 0.2s ease,
          transform 0.15s ease;
      }

      .details-button:hover {
        background: #f1f5f9;
        border-color: #d9e1ea;
      }

      .details-button:active {
        transform: scale(0.99);
      }

      .details-button ion-icon {
        font-size: 18px;
        transition: transform 0.25s ease;
      }

      .details-button ion-icon.rotated {
        transform: rotate(90deg);
      }

      /* =====================================================
         DETALLES DESPLEGABLES
      ===================================================== */

      .finished-details-wrapper {
        display: grid;

        grid-template-rows: 0fr;

        opacity: 0;

        transition:
          grid-template-rows 0.3s ease,
          opacity 0.2s ease,
          margin-top 0.3s ease;
      }

      .finished-details-wrapper.open {
        grid-template-rows: 1fr;

        opacity: 1;

        margin-top: 18px;
      }

      .finished-details {
        min-height: 0;
        overflow: hidden;

        display: grid;

        grid-template-columns: 1fr 1fr;

        gap: 16px 14px;

        padding-top: 0;
      }

      .finished-details-wrapper.open .finished-details {
        padding-top: 18px;
        border-top: 1px solid var(--border);
      }

      .finished-detail {
        display: flex;
        align-items: flex-start;
        gap: 10px;
      }

      .finished-detail-icon {
        width: 35px;
        height: 35px;

        border-radius: 10px;

        background: var(--green-light);
        color: var(--green);

        display: flex;
        align-items: center;
        justify-content: center;

        flex-shrink: 0;
      }

      .finished-detail-icon ion-icon {
        font-size: 17px;
      }

      /* =====================================================
         EMPTY
      ===================================================== */

      .empty-state {
        background: #ffffff;

        border: 1px solid var(--border);
        border-radius: 22px;

        padding: 42px 24px;

        text-align: center;

        box-shadow: 0 8px 25px rgba(20, 40, 70, 0.04);
      }

      .empty-icon {
        width: 65px;
        height: 65px;

        border-radius: 20px;

        display: flex;
        align-items: center;
        justify-content: center;

        margin: 0 auto 15px;
      }

      .empty-icon ion-icon {
        font-size: 31px;
      }

      .confirmed-empty {
        background: var(--primary-blue-light);
        color: var(--primary-blue);
      }

      .finished-empty {
        background: var(--green-light);
        color: var(--green);
      }

      .empty-state h3 {
        margin: 0 0 7px;

        color: var(--text-dark);

        font-size: 17px;
        font-weight: 800;
      }

      .empty-state p {
        margin: 0;

        color: var(--text-medium);

        font-size: 13px;
        line-height: 1.5;
      }

      /* =====================================================
         TABBAR
      ===================================================== */

      app-employee-tabbar {
        position: fixed !important;

        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;

        width: 100% !important;

        display: block !important;

        z-index: 99999 !important;

        margin: 0 !important;

        visibility: visible !important;
        opacity: 1 !important;
      }

      /* =====================================================
         MOBILE
      ===================================================== */

      @media (max-width: 600px) {
        .page-wrap {
          width: calc(100% - 22px);
          padding-top: 20px;
        }

        .intro h1 {
          font-size: 22px;
        }

        .intro p {
          font-size: 12px;
        }

        .status-button {
          min-height: 54px;

          font-size: 12px;

          gap: 6px;

          padding: 0 8px;
        }

        .status-button ion-icon {
          font-size: 19px;
        }

        /*
         * En móvil el contenedor sigue teniendo
         * su propio scroll y no la página.
         */
        .jobs-scroll {
          max-height: 60vh;

          padding-right: 4px;
        }

        .job-card {
          width: 100%;
          padding: 17px;
          border-radius: 19px;
        }

        .detail-grid,
        .finished-details {
          grid-template-columns: 1fr;
        }

        .detail-item.full-width {
          grid-column: auto;
        }

        .finished-main {
          align-items: flex-start;
        }

        .finished-job-left {
          min-width: 0;
        }

        .amount-box strong {
          font-size: 17px;
        }

        .job-main h3 {
          font-size: 17px;
        }

        .finished-details-wrapper.open .finished-details {
          padding-top: 16px;
        }
      }

      /* =====================================================
         MÓVILES MUY PEQUEÑOS
      ===================================================== */

      @media (max-width: 380px) {
        .card-top {
          gap: 10px;
        }

        .finished-job-left {
          gap: 10px;
        }

        .job-icon {
          width: 43px;
          height: 43px;
          border-radius: 13px;
        }

        .job-icon ion-icon {
          font-size: 22px;
        }

        .job-main h3 {
          font-size: 16px;
        }

        .amount-box {
          padding-left: 5px;
        }

        .amount-box strong {
          font-size: 15px;
        }

        .details-button {
          font-size: 11px;
        }
      }
    `,
  ],
})
export class EmployeeTrabajosPage implements OnInit {
  activeTab: "confirmados" | "finalizados" = "confirmados";

  confirmedJobs: ConfirmedJob[] = [];
  finishedJobs: FinishedJob[] = [];

  constructor(private supabase: SupabaseService) {
    addIcons({
      checkmarkCircleOutline,
      checkmarkDoneCircleOutline,
      locationOutline,
      callOutline,
      timeOutline,
      personOutline,
      peopleOutline,
      briefcaseOutline,
      cashOutline,
      calendarOutline,
      hourglassOutline,
      chevronForwardOutline,
    });
  }

  async ngOnInit() {
    await this.load();
  }

  /**
   * Carga únicamente los trabajos correspondientes
   * al empleado que tiene la sesión iniciada.
   */
  async load() {
    try {
      /**
       * TRABAJOS CONFIRMADOS
       *
       * Este método ya devuelve los trabajos disponibles
       * para el empleado actual.
       */
      const availableJobs = await this.supabase.getAvailableJobsForEmployee();

      this.confirmedJobs = (availableJobs ?? []).map((job: any) => {
        return {
          id: job.id,

          jobType: job.job_type ?? job.type ?? "Trabajo",

          clientName: job.client_name ?? job.client?.name ?? "",

          clientPhone: job.client_phone ?? job.client?.phone ?? "",

          address: job.address_info ?? job.address ?? job.location ?? "",

          startTime: job.start_time ?? "",

          workerName:
            job.worker_name ??
            job.worker_names ??
            job.employee_name ??
            job.partner_name ??
            "",
        };
      });

      /**
       * TRABAJOS FINALIZADOS
       *
       * getMyJobHistory() devuelve únicamente el historial
       * del empleado que está conectado.
       */
      const history = await this.supabase.getMyJobHistory();

      this.finishedJobs = (history ?? [])
        .map((job: any) => {
          return {
            id: job.id,

            jobType: job.job_type ?? job.type ?? "Trabajo",

            amount: Number(
              job.amount_earned ?? job.amount ?? job.total_amount ?? 0,
            ),

            hoursOrDays:
              job.hours_or_days !== null && job.hours_or_days !== undefined
                ? Number(job.hours_or_days)
                : null,

            date: job.job_date ?? job.date ?? "",

            time: job.start_time ?? job.time ?? "",

            workerName:
              job.worker_name ??
              job.worker_names ??
              job.employee_name ??
              job.partner_name ??
              "",

            detailsOpen: false,
          };
        })
        .sort((a, b) => {
          const dateA = `${a.date} ${a.time}`;
          const dateB = `${b.date} ${b.time}`;

          return dateB.localeCompare(dateA);
        });
    } catch (error) {
      console.error("Error cargando trabajos del empleado:", error);

      this.confirmedJobs = [];
      this.finishedJobs = [];
    }
  }

  /**
   * Cambia entre CONFIRMADOS y FINALIZADOS.
   */
  selectTab(tab: "confirmados" | "finalizados") {
    this.activeTab = tab;
  }

  /**
   * Abre/cierra los detalles de un trabajo finalizado.
   */
  toggleDetails(job: FinishedJob) {
    job.detailsOpen = !job.detailsOpen;
  }

  /**
   * Actualiza la información mediante pull-to-refresh.
   */
  async refresh(event: any) {
    await this.load();

    event.target.complete();
  }

  /**
   * Formatea la hora.
   */
  formatTime(time: string | null | undefined): string {
    if (!time) {
      return "--:--";
    }

    return time.substring(0, 5);
  }

  /**
   * Formatea la fecha.
   *
   * 2026-09-03 -> 03/09/2026
   */
  formatDate(date: string | null | undefined): string {
    if (!date) {
      return "--/--/----";
    }

    const cleanDate = date.substring(0, 10);

    const parts = cleanDate.split("-");

    if (parts.length !== 3) {
      return date;
    }

    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  /**
   * Formato de horas trabajadas.
   */
  formatHours(hours: number | null | undefined): string {
    if (hours === null || hours === undefined || Number.isNaN(hours)) {
      return "--";
    }

    if (hours === 1) {
      return "1 hora";
    }

    return `${hours} horas`;
  }
}
