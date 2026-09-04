import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonIcon,
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonInput,
  IonDatetime,
  IonModal,
  IonPopover,
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
  IonButton,
  AlertController,
} from "@ionic/angular/standalone";

import { addIcons } from "ionicons";

import {
  addOutline,
  trashOutline,
  cubeOutline,
  hammerOutline,
  constructOutline,
  chevronForwardOutline,
  documentTextOutline,
  calendarOutline,
  timeOutline,
} from "ionicons/icons";

import { SupabaseService, Profile } from "../../../services/supabase.service";

import { AdminTabbarComponent } from "../../../components/admin-tabbar.component";

@Component({
  selector: "app-admin-trabajos",
  standalone: true,
  imports: [
    AdminTabbarComponent,
    CommonModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonIcon,
    IonItem,
    IonLabel,
    IonSelect,
    IonSelectOption,
    IonInput,
    IonDatetime,
    IonModal,
    IonPopover,
    IonItemSliding,
    IonItemOptions,
    IonItemOption,
    IonButton,
  ],
  template: `
    <!-- =========================
         HEADER
    ========================== -->
    <ion-header class="trab-header">
      <ion-toolbar>
        <ion-title>Trabajos</ion-title>
      </ion-toolbar>
    </ion-header>

    <!-- =========================
         CONTENIDO PRINCIPAL
    ========================== -->
    <ion-content class="trab-content">
      <div class="trab-wrap" *ngIf="!loading; else loadingState">
        <!-- =========================
             BOTÓN CREAR TRABAJO
        ========================== -->
        <section class="cta-card" (click)="openCreate()">
          <div class="cta-icon-wrapper">
            <div class="cta-icon-circle">
              <ion-icon name="add-outline"></ion-icon>
            </div>
          </div>

          <span class="cta-label"> Crear trabajo </span>

          <span class="cta-sub"> Añade un nuevo trabajo al registro </span>
        </section>

        <!-- =========================
             LISTA DE TRABAJOS
        ========================== -->
        <section class="recent-section">
          <div class="section-header">
            <div class="section-title-wrapper">
              <div class="section-icon">
                <ion-icon name="document-text-outline"></ion-icon>
              </div>

              <h3>TODOS LOS TRABAJOS</h3>
            </div>
          </div>

          <div class="ledger" *ngIf="jobs.length; else emptyState">
            <ion-item-sliding *ngFor="let job of jobs">
              <div class="ledger-row" (click)="openDetail(job)">
                <div class="job-type-icon" [ngClass]="job.job_type">
                  <ion-icon [name]="jobIcon(job.job_type)"></ion-icon>
                </div>

                <div class="ledger-main">
                  <span class="ledger-type">
                    {{ job.job_type | titlecase }}
                    —
                    {{ job.client_name }}
                  </span>

                  <span class="ledger-date">
                    {{ job.job_date }}
                    ·
                    {{ job.start_time }}

                    <ng-container
                      *ngIf="
                        job.duration_value !== null &&
                        job.duration_value !== undefined &&
                        job.duration_value !== ''
                      "
                    >
                      · Duración:
                      {{
                        formatDuration(job.duration_value, job.duration_unit)
                      }}
                    </ng-container>
                  </span>
                </div>

                <div class="ledger-right">
                  <span class="status-badge" [ngClass]="job.status">
                    {{ statusLabel(job.status) }}
                  </span>

                  <ion-icon
                    class="ledger-arrow"
                    name="chevron-forward-outline"
                  ></ion-icon>
                </div>
              </div>

              <!-- =========================
                   OPCIÓN ELIMINAR
              ========================== -->
              <ion-item-options side="end">
                <ion-item-option color="danger" (click)="remove(job)">
                  <ion-icon name="trash-outline"></ion-icon>
                </ion-item-option>
              </ion-item-options>
            </ion-item-sliding>
          </div>

          <!-- =========================
               ESTADO VACÍO
          ========================== -->
          <ng-template #emptyState>
            <div class="empty-state">
              <div class="empty-icon-wrapper">
                <div class="empty-icon">
                  <ion-icon name="document-text-outline"></ion-icon>
                </div>
              </div>

              <h4>Todavía no hay trabajos.</h4>

              <p>Toca "Crear trabajo" para añadir el primero.</p>
            </div>
          </ng-template>
        </section>
      </div>

      <!-- =========================
           LOADING
      ========================== -->
      <ng-template #loadingState>
        <div class="loading-state">
          <div class="loading-spinner"></div>

          <span> Cargando trabajos... </span>
        </div>
      </ng-template>
    </ion-content>

    <!-- ==================================================
         MODAL CREAR TRABAJO
    =================================================== -->
    <ion-modal
      [isOpen]="showCreateModal"
      (didDismiss)="showCreateModal = false"
    >
      <ng-template>
        <ion-header class="trab-header">
          <ion-toolbar>
            <ion-title> Nuevo trabajo </ion-title>
          </ion-toolbar>
        </ion-header>

        <ion-content class="trab-content">
          <div class="form-wrap">
            <div class="form-card">
              <!-- TIPO -->
              <ion-item class="form-item" fill="outline" shape="round">
                <ion-select
                  label="Tipo de trabajo"
                  [(ngModel)]="newJob.job_type"
                >
                  <ion-select-option value="mudanza">
                    Mudanza
                  </ion-select-option>

                  <ion-select-option value="reforma">
                    Reforma
                  </ion-select-option>

                  <ion-select-option value="montaje">
                    Montaje
                  </ion-select-option>
                </ion-select>
              </ion-item>

              <!-- CLIENTE -->
              <ion-item class="form-item" fill="outline" shape="round">
                <ion-input
                  label="Nombre del cliente"
                  labelPlacement="stacked"
                  [(ngModel)]="newJob.client_name"
                ></ion-input>
              </ion-item>

              <!-- TELÉFONO -->
              <ion-item class="form-item" fill="outline" shape="round">
                <ion-input
                  label="Teléfono del cliente"
                  labelPlacement="stacked"
                  [(ngModel)]="newJob.client_phone"
                ></ion-input>
              </ion-item>

              <!-- CARGA -->
              <ion-item
                class="form-item"
                fill="outline"
                shape="round"
                *ngIf="newJob.job_type === 'mudanza'"
              >
                <ion-input
                  label="Punto de carga"
                  labelPlacement="stacked"
                  [(ngModel)]="newJob.pickup_point"
                ></ion-input>
              </ion-item>

              <!-- DESCARGA -->
              <ion-item
                class="form-item"
                fill="outline"
                shape="round"
                *ngIf="newJob.job_type === 'mudanza'"
              >
                <ion-input
                  label="Punto de descarga"
                  labelPlacement="stacked"
                  [(ngModel)]="newJob.dropoff_point"
                ></ion-input>
              </ion-item>

              <!-- PUNTO DE TRABAJO -->
              <ion-item
                class="form-item"
                fill="outline"
                shape="round"
                *ngIf="
                  newJob.job_type === 'reforma' || newJob.job_type === 'montaje'
                "
              >
                <ion-input
                  label="Punto de trabajo"
                  labelPlacement="stacked"
                  [(ngModel)]="newJob.work_point"
                ></ion-input>
              </ion-item>

              <!-- FECHA -->
              <div class="date-field" id="create-date-trigger">
                <div class="date-field-icon">
                  <ion-icon name="calendar-outline"></ion-icon>
                </div>

                <div class="date-field-text">
                  <span class="date-field-label"> Fecha </span>

                  <span
                    class="date-field-value"
                    [class.placeholder]="!newJob.job_date"
                  >
                    {{
                      newJob.job_date
                        ? formatDate(newJob.job_date)
                        : "Seleccionar fecha"
                    }}
                  </span>
                </div>
              </div>

              <ion-popover trigger="create-date-trigger" show-backdrop="true">
                <ng-template>
                  <ion-datetime
                    presentation="date"
                    [(ngModel)]="newJob.job_date"
                  ></ion-datetime>
                </ng-template>
              </ion-popover>

              <!-- HORA -->
              <div class="date-field" id="create-time-trigger">
                <div class="date-field-icon">
                  <ion-icon name="time-outline"></ion-icon>
                </div>

                <div class="date-field-text">
                  <span class="date-field-label"> Hora de inicio </span>

                  <span
                    class="date-field-value"
                    [class.placeholder]="!newJob.start_time"
                  >
                    {{
                      newJob.start_time
                        ? formatTime(newJob.start_time)
                        : "Seleccionar hora"
                    }}
                  </span>
                </div>
              </div>

              <ion-popover trigger="create-time-trigger" show-backdrop="true">
                <ng-template>
                  <ion-datetime
                    presentation="time"
                    [(ngModel)]="newJob.start_time"
                  ></ion-datetime>
                </ng-template>
              </ion-popover>
            </div>

            <!-- BOTONES -->
            <div class="modal-actions">
              <ion-button
                expand="block"
                class="primary-btn"
                (click)="createJob()"
              >
                Crear trabajo
              </ion-button>

              <ion-button
                expand="block"
                fill="clear"
                class="cancel-btn"
                (click)="showCreateModal = false"
              >
                Cancelar
              </ion-button>
            </div>
          </div>
        </ion-content>
      </ng-template>
    </ion-modal>

    <!-- ==================================================
         MODAL DETALLE / CAMBIAR ESTADO
    =================================================== -->
    <ion-modal
      [isOpen]="showDetailModal"
      (didDismiss)="showDetailModal = false"
    >
      <ng-template>
        <ion-header class="trab-header">
          <ion-toolbar>
            <ion-title>
              {{ selectedJob?.job_type | titlecase }}
            </ion-title>
          </ion-toolbar>
        </ion-header>

        <ion-content class="trab-content" *ngIf="selectedJob">
          <div class="form-wrap">
            <!-- RESUMEN -->
            <div class="detail-summary">
              <p>
                <b>Cliente:</b>
                {{ selectedJob.client_name }}
                ·
                {{ selectedJob.client_phone }}
              </p>

              <p>
                <b>Fecha:</b>
                {{ selectedJob.job_date }}
                ·
                {{ selectedJob.start_time }}
              </p>
            </div>

            <!-- CAMBIAR ESTADO -->
            <div class="form-card">
              <ion-item class="form-item" fill="outline" shape="round">
                <ion-select
                  label="Estado"
                  [(ngModel)]="selectedJob.status"
                  (ionChange)="onStatusChange()"
                >
                  <ion-select-option value="pendiente">
                    Pendiente
                  </ion-select-option>

                  <ion-select-option value="confirmado">
                    Confirmado
                  </ion-select-option>

                  <ion-select-option value="en_curso">
                    En curso
                  </ion-select-option>

                  <ion-select-option value="finalizado">
                    Finalizado
                  </ion-select-option>
                </ion-select>
              </ion-item>
            </div>

            <!-- ==================================================
                 FINALIZACIÓN
            =================================================== -->
            <div
              *ngIf="selectedJob.status === 'finalizado'"
              class="finalize-block"
            >
              <h3 class="block-title">Datos de finalización</h3>

              <div class="form-card">
                <!-- FECHA FINALIZACIÓN -->
                <div class="date-field" id="finalize-date-trigger">
                  <div class="date-field-icon">
                    <ion-icon name="calendar-outline"></ion-icon>
                  </div>

                  <div class="date-field-text">
                    <span class="date-field-label">
                      Fecha de finalización
                    </span>

                    <span
                      class="date-field-value"
                      [class.placeholder]="!finalizeData.completion_date"
                    >
                      {{
                        finalizeData.completion_date
                          ? formatDate(finalizeData.completion_date)
                          : "Seleccionar fecha"
                      }}
                    </span>
                  </div>
                </div>

                <ion-popover
                  trigger="finalize-date-trigger"
                  show-backdrop="true"
                >
                  <ng-template>
                    <ion-datetime
                      presentation="date"
                      [(ngModel)]="finalizeData.completion_date"
                    ></ion-datetime>
                  </ng-template>
                </ion-popover>

                <!-- HORA FINALIZACIÓN -->
                <div class="date-field" id="finalize-time-trigger">
                  <div class="date-field-icon">
                    <ion-icon name="time-outline"></ion-icon>
                  </div>

                  <div class="date-field-text">
                    <span class="date-field-label"> Hora de finalización </span>

                    <span
                      class="date-field-value"
                      [class.placeholder]="!finalizeData.completion_time"
                    >
                      {{
                        finalizeData.completion_time
                          ? formatTime(finalizeData.completion_time)
                          : "Seleccionar hora"
                      }}
                    </span>
                  </div>
                </div>

                <ion-popover
                  trigger="finalize-time-trigger"
                  show-backdrop="true"
                >
                  <ng-template>
                    <ion-datetime
                      presentation="time"
                      [(ngModel)]="finalizeData.completion_time"
                    ></ion-datetime>
                  </ng-template>
                </ion-popover>

                <!-- DURACIÓN -->
                <ion-item class="form-item" fill="outline" shape="round">
                  <ion-input
                    label="Duración"
                    type="number"
                    labelPlacement="stacked"
                    [(ngModel)]="finalizeData.duration_value"
                  ></ion-input>
                </ion-item>

                <!-- UNIDAD -->
                <ion-item class="form-item" fill="outline" shape="round">
                  <ion-select
                    label="Unidad"
                    [(ngModel)]="finalizeData.duration_unit"
                  >
                    <ion-select-option value="horas"> Horas </ion-select-option>

                    <ion-select-option value="dias"> Días </ion-select-option>
                  </ion-select>
                </ion-item>

                <!-- COSTO -->
                <ion-item class="form-item" fill="outline" shape="round">
                  <ion-input
                    label="Costo total del trabajo (€)"
                    type="number"
                    labelPlacement="stacked"
                    [(ngModel)]="finalizeData.total_cost"
                  ></ion-input>
                </ion-item>
              </div>

              <!-- PARTICIPANTES -->
              <h3 class="block-title">Participantes</h3>

              <div
                *ngFor="let p of finalizeData.participants; let i = index"
                class="participant-card"
              >
                <ion-item class="form-item" fill="outline" shape="round">
                  <ion-select label="Empleado" [(ngModel)]="p.employee_id">
                    <ion-select-option
                      *ngFor="let e of employees"
                      [value]="e.id"
                    >
                      {{ e.full_name }}
                    </ion-select-option>
                  </ion-select>
                </ion-item>

                <ion-item class="form-item" fill="outline" shape="round">
                  <ion-input
                    label="Horas/días trabajados"
                    type="number"
                    labelPlacement="stacked"
                    [(ngModel)]="p.hours_or_days"
                  ></ion-input>
                </ion-item>

                <ion-item class="form-item" fill="outline" shape="round">
                  <ion-input
                    label="Cuánto cobró (€)"
                    type="number"
                    labelPlacement="stacked"
                    [(ngModel)]="p.amount_earned"
                  ></ion-input>
                </ion-item>

                <ion-button
                  fill="clear"
                  color="danger"
                  size="small"
                  (click)="removeParticipantRow(i)"
                >
                  Quitar participante
                </ion-button>
              </div>

              <!-- AGREGAR PARTICIPANTE -->
              <ion-button
                expand="block"
                fill="outline"
                class="outline-btn"
                (click)="addParticipantRow()"
              >
                + Agregar participante
              </ion-button>

              <!-- FINALIZAR -->
              <div class="modal-actions">
                <ion-button
                  expand="block"
                  class="primary-btn"
                  (click)="finalizeJob()"
                >
                  Guardar y finalizar trabajo
                </ion-button>
              </div>
            </div>

            <!-- =========================
                 ACCIONES ESTADO
            ========================== -->
            <div
              class="modal-actions"
              *ngIf="selectedJob.status !== 'finalizado'"
            >
              <ion-button
                expand="block"
                class="primary-btn"
                (click)="saveStatus()"
              >
                Guardar estado
              </ion-button>

              <ion-button
                expand="block"
                fill="clear"
                class="cancel-btn"
                (click)="showDetailModal = false"
              >
                Cerrar
              </ion-button>
            </div>

            <!-- =========================
                 ELIMINAR DESDE DETALLE
            ========================== -->
            <div class="delete-section">
              <ion-button
                expand="block"
                fill="outline"
                class="delete-btn"
                (click)="remove(selectedJob)"
              >
                <ion-icon slot="start" name="trash-outline"></ion-icon>

                Eliminar trabajo
              </ion-button>
            </div>
          </div>
        </ion-content>
      </ng-template>
    </ion-modal>

    <app-admin-tabbar></app-admin-tabbar>
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

        --finance-teal: #269e8b;
        --finance-teal-bg: #e9f8f5;

        --finance-shadow: 0 8px 30px rgba(24, 47, 83, 0.06);

        --finance-shadow-soft: 0 4px 18px rgba(24, 47, 83, 0.05);
      }

      /* =========================
         HEADER
      ========================== */

      .trab-header {
        --background: #ffffff;
      }

      .trab-header ion-toolbar {
        --background: #ffffff;
        --border-width: 0;
        --min-height: 64px;

        padding: 0 12px;
      }

      .trab-header ion-title {
        color: var(--finance-primary-dark);

        font-size: 25px;
        font-weight: 800;

        text-align: center;
        letter-spacing: -0.5px;
      }

      /* =========================
         CONTENT
      ========================== */

      .trab-content {
        --background: var(--finance-bg);
      }

      .trab-wrap {
        width: 100%;
        max-width: 900px;

        margin: 0 auto;

        padding: 20px 16px 120px;
      }

      .form-wrap {
        width: 100%;
        max-width: 900px;

        margin: 0 auto;

        padding: 20px 16px 60px;
      }

      /* =========================
         CTA CREAR
      ========================== */

      .cta-card {
        position: relative;

        display: flex;
        flex-direction: column;

        align-items: center;
        text-align: center;

        background: linear-gradient(
          180deg,
          #ffffff 0%,
          #ffffff 70%,
          #f5f8ff 100%
        );

        border: 1px solid #e5eaf2;
        border-radius: 24px;

        overflow: hidden;

        padding: 26px 20px 28px;

        margin-bottom: 22px;

        box-shadow: 0 12px 35px rgba(28, 51, 86, 0.07);

        cursor: pointer;

        transition:
          transform 0.2s ease,
          box-shadow 0.2s ease;
      }

      .cta-card:active {
        transform: scale(0.98);
      }

      .cta-card::before {
        content: "";

        position: absolute;

        top: 0;
        left: 0;
        right: 0;

        height: 8px;

        background: linear-gradient(90deg, #1769ff, #123b78);
      }

      .cta-icon-wrapper {
        width: 74px;
        height: 74px;

        display: flex;

        align-items: center;
        justify-content: center;

        margin-top: 5px;
        margin-bottom: 12px;

        border-radius: 50%;

        background: radial-gradient(
          circle,
          #ffffff 35%,
          #edf3ff 36%,
          #edf3ff 100%
        );
      }

      .cta-icon-circle {
        width: 46px;
        height: 46px;

        display: flex;

        align-items: center;
        justify-content: center;

        border-radius: 14px;

        background: #ffffff;

        box-shadow: 0 5px 18px rgba(23, 105, 255, 0.16);
      }

      .cta-icon-circle ion-icon {
        font-size: 26px;
        color: var(--finance-primary);
      }

      .cta-label {
        color: var(--finance-primary-dark);

        font-size: 1.05rem;
        font-weight: 800;
      }

      .cta-sub {
        margin-top: 4px;

        color: var(--finance-text-soft);

        font-size: 0.85rem;
        font-weight: 500;
      }

      /* =========================
         SECCIÓN
      ========================== */

      .recent-section {
        margin-top: 10px;
      }

      .section-header {
        display: flex;

        align-items: center;
        justify-content: space-between;

        gap: 10px;

        margin: 10px 2px 14px;
      }

      .section-title-wrapper {
        display: flex;

        align-items: center;

        gap: 10px;

        min-width: 0;
      }

      .section-icon {
        width: 38px;
        height: 38px;

        flex: 0 0 38px;

        display: flex;

        align-items: center;
        justify-content: center;

        border-radius: 11px;

        background: var(--finance-primary);

        box-shadow: 0 5px 14px rgba(23, 105, 255, 0.2);
      }

      .section-icon ion-icon {
        color: #ffffff;
        font-size: 21px;
      }

      .section-header h3 {
        margin: 0;

        color: var(--finance-text);

        font-size: 0.86rem;
        font-weight: 800;

        letter-spacing: 0.05em;
        line-height: 1.25;
      }

      /* =========================
         LISTA
      ========================== */

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

        min-height: 76px;

        padding: 12px 15px;

        border-bottom: 1px solid #edf0f4;

        cursor: pointer;
      }

      ion-item-sliding:last-child .ledger-row {
        border-bottom: none;
      }

      .job-type-icon {
        width: 42px;
        height: 42px;

        flex: 0 0 42px;

        display: flex;

        align-items: center;
        justify-content: center;

        border-radius: 13px;

        background: var(--finance-primary-light);
      }

      .job-type-icon ion-icon {
        font-size: 21px;
        color: var(--finance-primary);
      }

      .job-type-icon.mudanza {
        background: #edf4ff;
      }

      .job-type-icon.reforma {
        background: #fff3e5;
      }

      .job-type-icon.reforma ion-icon {
        color: var(--finance-orange);
      }

      .job-type-icon.montaje {
        background: #edf8f6;
      }

      .job-type-icon.montaje ion-icon {
        color: var(--finance-teal);
      }

      .ledger-main {
        display: flex;

        flex-direction: column;

        flex: 1;

        min-width: 0;
      }

      .ledger-type {
        overflow: hidden;

        color: var(--finance-text);

        font-size: 0.9rem;
        font-weight: 700;

        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .ledger-date {
        margin-top: 4px;

        color: var(--finance-muted);

        font-size: 0.72rem;
        font-weight: 500;

        line-height: 1.45;
      }

      .ledger-right {
        display: flex;

        align-items: center;

        gap: 8px;
      }

      .ledger-arrow {
        color: #a7b0be;
        font-size: 16px;
      }

      /* =========================
         ESTADOS
      ========================== */

      .status-badge {
        padding: 5px 10px;

        border-radius: 20px;

        font-size: 0.68rem;
        font-weight: 800;

        letter-spacing: 0.03em;

        text-transform: uppercase;

        white-space: nowrap;
      }

      .status-badge.pendiente {
        background: var(--finance-orange-bg);

        color: var(--finance-orange);
      }

      .status-badge.confirmado {
        background: var(--finance-primary-light);

        color: var(--finance-primary);
      }

      .status-badge.en_curso {
        background: #fff4e4;

        color: #b8860b;
      }

      .status-badge.finalizado {
        background: var(--finance-green-bg);

        color: var(--finance-green);
      }

      /* =========================
         EMPTY
      ========================== */

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
        width: 120px;
        height: 120px;

        display: flex;

        align-items: center;
        justify-content: center;

        margin-bottom: 18px;

        border-radius: 50%;

        border: 1px dashed #dce7fa;

        background: #f8fbff;
      }

      .empty-icon {
        width: 75px;
        height: 75px;

        display: flex;

        align-items: center;
        justify-content: center;

        border-radius: 22px;

        background: #edf4ff;
      }

      .empty-icon ion-icon {
        font-size: 42px;
        color: #8db1f5;
      }

      .empty-state h4 {
        margin: 0 0 8px;

        color: var(--finance-text);

        font-size: 1rem;
        font-weight: 800;
      }

      .empty-state p {
        max-width: 280px;

        margin: 0;

        color: var(--finance-text-soft);

        font-size: 0.88rem;
        line-height: 1.5;
      }

      /* =========================
         LOADING
      ========================== */

      .loading-state {
        min-height: 65vh;

        display: flex;

        flex-direction: column;

        align-items: center;
        justify-content: center;

        gap: 15px;

        color: var(--finance-text-soft);

        font-size: 0.9rem;
      }

      .loading-spinner {
        width: 34px;
        height: 34px;

        border: 3px solid #e3eaf5;

        border-top-color: var(--finance-primary);

        border-radius: 50%;

        animation: trabSpin 0.8s linear infinite;
      }

      @keyframes trabSpin {
        to {
          transform: rotate(360deg);
        }
      }

      /* =========================
         FORMULARIO
      ========================== */

      .form-card {
        background: linear-gradient(180deg, #ffffff 0%, #f7faff 100%);

        border: 1px solid var(--finance-border);

        border-radius: 20px;

        padding: 16px;

        margin-bottom: 4px;

        box-shadow: var(--finance-shadow-soft);
      }

      .form-item {
        --background: #ffffff;

        --border-color: #d3dcec;
        --border-width: 1.5px;

        --highlight-color-focused: var(--finance-primary);

        --padding-start: 14px;
        --inner-padding-end: 14px;

        --min-height: 54px;

        margin-bottom: 12px;

        --color: var(--finance-text);
      }

      .form-item::part(native) {
        border-radius: 14px;
      }

      .form-item ion-label {
        color: var(--finance-primary-dark) !important;

        font-weight: 700;
      }

      /* =========================
         FECHA / HORA
      ========================== */

      .date-field {
        display: flex;

        align-items: center;

        gap: 12px;

        background: #ffffff;

        border: 1.5px solid #d3dcec;

        border-radius: 14px;

        padding: 12px 14px;

        margin-bottom: 12px;

        cursor: pointer;

        box-shadow: var(--finance-shadow-soft);

        transition: border-color 0.15s ease;
      }

      .date-field:hover {
        border-color: var(--finance-primary);
      }

      .date-field-icon {
        width: 38px;
        height: 38px;

        flex: 0 0 38px;

        display: flex;

        align-items: center;
        justify-content: center;

        border-radius: 11px;

        background: var(--finance-primary-light);
      }

      .date-field-icon ion-icon {
        font-size: 19px;

        color: var(--finance-primary);
      }

      .date-field-text {
        display: flex;

        flex-direction: column;

        gap: 2px;
      }

      .date-field-label {
        font-size: 0.68rem;

        font-weight: 800;

        letter-spacing: 0.04em;

        text-transform: uppercase;

        color: var(--finance-primary);
      }

      .date-field-value {
        font-size: 0.95rem;

        font-weight: 700;

        color: var(--finance-text);
      }

      .date-field-value.placeholder {
        font-weight: 500;

        color: var(--finance-muted);
      }

      /* =========================
         DETALLE
      ========================== */

      .detail-summary {
        background: linear-gradient(180deg, #ffffff 0%, #f7faff 100%);

        border: 1px solid var(--finance-border);

        border-radius: 16px;

        padding: 14px 16px;

        margin-bottom: 16px;

        color: var(--finance-text);

        font-size: 0.88rem;

        box-shadow: var(--finance-shadow-soft);
      }

      .detail-summary p {
        margin: 4px 0;
      }

      .block-title {
        color: var(--finance-primary-dark);

        font-size: 0.86rem;

        font-weight: 800;

        letter-spacing: 0.03em;

        text-transform: uppercase;

        margin: 20px 4px 10px;
      }

      /* =========================
         PARTICIPANTES
      ========================== */

      .participant-card {
        background: linear-gradient(180deg, #ffffff 0%, #f7faff 100%);

        border: 1px solid var(--finance-border);

        border-radius: 16px;

        padding: 10px;

        margin-bottom: 12px;

        box-shadow: var(--finance-shadow-soft);
      }

      /* =========================
         BOTONES
      ========================== */

      .modal-actions {
        margin-top: 18px;
      }

      .primary-btn {
        --background: #1769ff;

        --background-hover: #0f5be0;

        --background-activated: #0d4fc5;

        --background-focused: #0d4fc5;

        --color: #ffffff;

        --border-radius: 14px;

        --box-shadow: 0 8px 20px rgba(23, 105, 255, 0.28);

        --padding-top: 0;
        --padding-bottom: 0;

        height: 50px;

        font-weight: 800;

        letter-spacing: 0.01em;
      }

      ion-button.primary-btn {
        --background: #1769ff !important;

        --color: #ffffff !important;

        --border-color: #1769ff !important;
      }

      .outline-btn {
        --border-color: var(--finance-primary);

        --color: var(--finance-primary);

        --border-radius: 14px;

        --border-width: 1.5px;

        font-weight: 700;
      }

      .cancel-btn {
        --color: var(--finance-text-soft);

        margin-top: 4px;
      }

      /* =========================
         ELIMINAR
      ========================== */

      .delete-section {
        margin-top: 26px;

        padding-top: 20px;

        border-top: 1px solid var(--finance-border);
      }

      .delete-btn {
        --border-color: #dc2626;

        --color: #dc2626;

        --border-width: 1.5px;

        --border-radius: 14px;

        height: 48px;

        font-weight: 700;
      }

      ion-button.delete-btn {
        --border-color: #dc2626 !important;

        --color: #dc2626 !important;
      }

      /* =========================
         RESPONSIVE
      ========================== */

      @media (max-width: 380px) {
        .trab-wrap,
        .form-wrap {
          padding-left: 12px;
          padding-right: 12px;
        }

        .section-header h3 {
          font-size: 0.75rem;
        }

        .status-badge {
          padding: 4px 7px;

          font-size: 0.62rem;
        }

        .ledger-row {
          gap: 8px;

          padding-left: 10px;
          padding-right: 10px;
        }
      }

      @media (min-width: 768px) {
        .trab-wrap,
        .form-wrap {
          padding: 30px 30px 120px;
        }

        .ledger-row {
          padding-left: 20px;
          padding-right: 20px;
        }
      }
    `,
  ],
})
export class AdminTrabajosPage implements OnInit {
  jobs: any[] = [];

  employees: Profile[] = [];

  loading = true;

  showCreateModal = false;

  newJob: any = {
    job_type: "mudanza",
    client_name: "",
    client_phone: "",
    pickup_point: "",
    dropoff_point: "",
    work_point: "",
    job_date: "",
    start_time: "",
  };

  showDetailModal = false;

  selectedJob: any = null;

  finalizeData: any = {
    completion_date: "",
    completion_time: "",
    duration_value: null,
    duration_unit: "horas",
    total_cost: null,
    participants: [],
  };

  constructor(
    private supabase: SupabaseService,
    private alertCtrl: AlertController,
  ) {
    addIcons({
      addOutline,
      trashOutline,
      cubeOutline,
      hammerOutline,
      constructOutline,
      chevronForwardOutline,
      documentTextOutline,
      calendarOutline,
      timeOutline,
    });
  }

  /* =========================
     INIT
  ========================== */

  async ngOnInit() {
    await this.load();

    try {
      this.employees = (await this.supabase.getAllEmployees()).filter(
        (e) => e.is_approved,
      );
    } catch (err) {
      await this.showError("No se pudieron cargar los empleados", err);
    }
  }

  /* =========================
     CARGAR TRABAJOS
  ========================== */

  async load() {
    this.loading = true;

    try {
      this.jobs = await this.supabase.getAllJobs();
    } catch (err) {
      await this.showError("No se pudieron cargar los trabajos", err);
    } finally {
      this.loading = false;
    }
  }

  /* =========================
     ICONO TRABAJO
  ========================== */

  jobIcon(type: string) {
    return (
      (
        {
          mudanza: "cube-outline",
          reforma: "hammer-outline",
          montaje: "construct-outline",
        } as Record<string, string>
      )[type] ?? "cube-outline"
    );
  }

  /* =========================
     LABEL ESTADO
  ========================== */

  statusLabel(status: string) {
    return (
      (
        {
          pendiente: "Pendiente",
          confirmado: "Confirmado",
          en_curso: "En curso",
          finalizado: "Finalizado",
        } as Record<string, string>
      )[status] ?? status
    );
  }

  /* =========================
     DURACIÓN
  ========================== */

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

    if (normalizedUnit === "dias" || normalizedUnit === "dia") {
      return amount === 1 ? "1 día" : `${amount} días`;
    }

    return amount === 1 ? "1 hora" : `${amount} horas`;
  }

  /* =========================
     FECHA
  ========================== */

  formatDate(iso: string) {
    if (!iso) {
      return "";
    }

    const d = new Date(iso);

    if (Number.isNaN(d.getTime())) {
      return iso;
    }

    return d.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  /* =========================
     HORA
  ========================== */

  formatTime(iso: string) {
    if (!iso) {
      return "";
    }

    const d = new Date(iso);

    if (Number.isNaN(d.getTime())) {
      return iso;
    }

    return d.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  /* =========================
     ABRIR CREAR
  ========================== */

  openCreate() {
    this.newJob = {
      job_type: "mudanza",
      client_name: "",
      client_phone: "",
      pickup_point: "",
      dropoff_point: "",
      work_point: "",
      job_date: "",
      start_time: "",
    };

    this.showCreateModal = true;
  }

  /* =========================
     ERROR
  ========================== */

  private async showError(titulo: string, err: any) {
    const alert = await this.alertCtrl.create({
      header: titulo,

      message: err?.message ?? String(err),

      buttons: ["OK"],
    });

    await alert.present();
  }

  /* =========================
     VALIDAR NUEVO TRABAJO
  ========================== */

  private validateNewJob(): string | null {
    if (!this.newJob.client_name?.trim()) {
      return "Falta el nombre del cliente";
    }

    if (!this.newJob.client_phone?.trim()) {
      return "Falta el teléfono del cliente";
    }

    if (!this.newJob.job_date) {
      return "Falta la fecha del trabajo";
    }

    if (!this.newJob.start_time) {
      return "Falta la hora de inicio";
    }

    if (
      this.newJob.job_type === "mudanza" &&
      (!this.newJob.pickup_point || !this.newJob.dropoff_point)
    ) {
      return "Faltan los puntos de carga y descarga";
    }

    if (
      (this.newJob.job_type === "reforma" ||
        this.newJob.job_type === "montaje") &&
      !this.newJob.work_point
    ) {
      return "Falta el punto de trabajo";
    }

    return null;
  }

  /* =========================
     CREAR TRABAJO
  ========================== */

  async createJob() {
    const error = this.validateNewJob();

    if (error) {
      await this.showError("Revisa el formulario", error);

      return;
    }

    try {
      const payload = {
        ...this.newJob,

        job_date: this.newJob.job_date?.slice(0, 10),

        start_time: this.newJob.start_time?.slice(11, 16),
      };

      await this.supabase.createJob(payload);

      this.showCreateModal = false;

      await this.load();
    } catch (err) {
      await this.showError("No se pudo crear el trabajo", err);
    }
  }

  /* =========================
     ABRIR DETALLE
  ========================== */

  openDetail(job: any) {
    this.selectedJob = {
      ...job,
    };

    this.finalizeData = {
      completion_date: job.completion_date ?? "",

      completion_time: job.completion_time ?? "",

      duration_value: job.duration_value,

      duration_unit: job.duration_unit ?? "horas",

      total_cost: job.total_cost,

      participants: [],
    };

    this.showDetailModal = true;
  }

  /* =========================
     CAMBIO ESTADO
  ========================== */

  onStatusChange() {
    // El bloque de finalización
    // aparece automáticamente cuando
    // selectedJob.status === "finalizado".
  }

  /* =========================
     AGREGAR PARTICIPANTE
  ========================== */

  addParticipantRow() {
    this.finalizeData.participants.push({
      employee_id: null,
      hours_or_days: null,
      amount_earned: null,
    });
  }

  /* =========================
     ELIMINAR PARTICIPANTE
  ========================== */

  removeParticipantRow(i: number) {
    this.finalizeData.participants.splice(i, 1);
  }

  /* =========================
     GUARDAR ESTADO
  ========================== */

  async saveStatus() {
    if (!this.selectedJob?.id) {
      await this.showError("Error", "No se encontró el trabajo.");

      return;
    }

    try {
      await this.supabase.updateJob(this.selectedJob.id, {
        status: this.selectedJob.status,
      });

      this.showDetailModal = false;

      await this.load();
    } catch (err) {
      await this.showError("No se pudo guardar el estado", err);
    }
  }

  /* =========================
     FINALIZAR TRABAJO
  ========================== */

  async finalizeJob() {
    if (
      !this.finalizeData.completion_date ||
      !this.finalizeData.completion_time ||
      !this.finalizeData.duration_value ||
      !this.finalizeData.total_cost
    ) {
      await this.showError(
        "Revisa el formulario",
        "Completa fecha, hora, duración y costo total antes de finalizar.",
      );

      return;
    }

    try {
      await this.supabase.updateJob(this.selectedJob.id, {
        status: "finalizado",

        completion_date: this.finalizeData.completion_date?.slice(0, 10),

        completion_time: this.finalizeData.completion_time?.slice(11, 16),

        duration_value: this.finalizeData.duration_value,

        duration_unit: this.finalizeData.duration_unit,

        total_cost: this.finalizeData.total_cost,
      });

      for (const p of this.finalizeData.participants) {
        if (!p.employee_id) {
          continue;
        }

        await this.supabase.addJobParticipant({
          job_id: this.selectedJob.id,

          employee_id: p.employee_id,

          hours_or_days: p.hours_or_days,

          amount_earned: p.amount_earned,
        });
      }

      this.showDetailModal = false;

      await this.load();
    } catch (err) {
      await this.showError("No se pudo finalizar el trabajo", err);
    }
  }

  /* =========================
     ELIMINAR TRABAJO
  ========================== */

  async remove(job: any) {
    if (!job?.id) {
      await this.showError("Error", "No se encontró el trabajo.");

      return;
    }

    const alert = await this.alertCtrl.create({
      header: "Eliminar trabajo",

      message: `¿Seguro que quieres eliminar el trabajo de ${
        job.client_name ?? "este cliente"
      }? Esta acción no se puede deshacer.`,

      buttons: [
        {
          text: "Cancelar",
          role: "cancel",
        },

        {
          text: "Eliminar",
          role: "destructive",

          handler: async () => {
            try {
              await this.supabase.deleteJob(job.id);

              this.showCreateModal = false;
              this.showDetailModal = false;

              await this.load();
            } catch (err) {
              await this.showError("No se pudo eliminar el trabajo", err);
            }
          },
        },
      ],
    });

    await alert.present();
  }
}
