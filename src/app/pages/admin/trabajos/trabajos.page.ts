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
  chevronBackOutline,
  documentTextOutline,
  calendarOutline,
  timeOutline,
  hourglassOutline,
  alertCircleOutline,
  checkmarkDoneOutline,
  cameraOutline as tramoCameraOutline,
  closeOutline as tramoCloseOutline,
} from "ionicons/icons";

import { SupabaseService, Profile } from "../../../services/supabase.service";

import { RoleTabbarComponent } from "../../../components/role-tabbar.component";

import { PageHeaderComponent } from "../../../components/page-header.component";
import { JobCloseFormComponent } from "../../../components/job-close-form.component";
import { JobPhotosComponent } from "../../../components/job-photos.component";
import { JobReviewComponent } from "../../../components/job-review.component";
import { JOB_STATUS_LABELS } from "../../../services/supabase.service";

@Component({
  selector: "app-admin-trabajos",
  standalone: true,
  imports: [
    PageHeaderComponent,
    JobCloseFormComponent,
    JobPhotosComponent,
    JobReviewComponent,
    RoleTabbarComponent,
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
    <app-page-header title="Trabajos" subtitle="Gestión"></app-page-header>

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
        <!-- SELECTOR DE MES -->
        <section class="t-month">
          <button type="button" class="t-month-arrow" (click)="shiftMonth(-1)" aria-label="Mes anterior">
            <ion-icon name="chevron-back-outline"></ion-icon>
          </button>
          <div class="t-month-current">
            <strong>{{ monthNames[selectedMonth] }}</strong>
            <span>{{ selectedYear }}</span>
          </div>
          <button type="button" class="t-month-arrow" (click)="shiftMonth(1)" aria-label="Mes siguiente">
            <ion-icon name="chevron-forward-outline"></ion-icon>
          </button>
        </section>

        <section class="t-month-summary">
          <div><span>Trabajos</span><strong>{{ monthJobs.length }}</strong></div>
          <div><span>Finalizados</span><strong>{{ monthFinished }}</strong></div>
          <div><span>Facturado</span><strong>{{ monthIncome | number: "1.0-2" }} €</strong></div>
        </section>

        <!-- PENDIENTES DE REVISIÓN -->
        <section class="review-switch">
          <button type="button" [class.on]="!reviewOnly" (click)="reviewOnly = false">
            Trabajos del mes
          </button>
          <button type="button" [class.on]="reviewOnly" (click)="reviewOnly = true">
            <ion-icon name="hourglass-outline"></ion-icon>
            Pendientes de revisión
            <span class="review-count" *ngIf="reviewCount">{{ reviewCount }}</span>
          </button>
        </section>

        <button type="button" class="review-alert" *ngIf="reviewCount && !reviewOnly" (click)="reviewOnly = true">
          <ion-icon name="alert-circle-outline"></ion-icon>
          <span>
            <strong>{{ reviewCount }} {{ reviewCount === 1 ? "trabajo espera" : "trabajos esperan" }} tu revisión</strong>
            Revisa las horas y aprueba para que cobren.
          </span>
          <ion-icon name="chevron-forward-outline"></ion-icon>
        </button>

        <section class="recent-section">
          <div class="section-header">
            <div class="section-title-wrapper">
              <div class="section-icon">
                <ion-icon name="document-text-outline"></ion-icon>
              </div>

              <h3 *ngIf="!reviewOnly">TRABAJOS DE {{ monthNames[selectedMonth] | uppercase }}</h3>
              <h3 *ngIf="reviewOnly">PENDIENTES DE REVISIÓN</h3>
            </div>
          </div>

          <div class="ledger" *ngIf="visibleJobs.length; else emptyState">
            <ion-item-sliding *ngFor="let job of visibleJobs">
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

              <ng-container *ngIf="!reviewOnly">
                <h4>No hay trabajos en {{ monthNames[selectedMonth] }} {{ selectedYear }}.</h4>
                <p>Cambia de mes con las flechas o toca "Crear trabajo".</p>
              </ng-container>
              <ng-container *ngIf="reviewOnly">
                <h4>Todo revisado.</h4>
                <p>Cuando un encargado termine un trabajo aparecerá aquí.</p>
              </ng-container>
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

            <!-- PRECIO -->
            <div class="form-card">
              <div class="price-label">Precio del trabajo</div>
              <div class="jf-seg price-seg">
                <button type="button" [class.on]="newJob.price_type === 'fijo'" (click)="newJob.price_type = 'fijo'">Fijo</button>
                <button type="button" [class.on]="newJob.price_type === 'hora'" (click)="newJob.price_type = 'hora'">Por hora</button>
                <button type="button" [class.on]="newJob.price_type === 'dia'" (click)="newJob.price_type = 'dia'">Por día</button>
              </div>
              <div class="jf-money">
                <input type="number" inputmode="decimal" min="0" step="0.01" [(ngModel)]="newJob.price_amount" placeholder="0,00" />
                <span>{{ priceSuffix(newJob.price_type) }}</span>
              </div>
            </div>

            <!-- FOTOS (qué hay que transportar / montar) -->
            <div class="form-card">
              <div class="price-label">Fotos del trabajo</div>
              <p class="price-help" style="margin: 0 4px 10px">
                Sube fotos de lo que hay que transportar o montar. El encargado las verá en su ficha.
              </p>
              <div class="new-photos">
                <div class="new-photo" *ngFor="let p of newPhotos; let i = index">
                  <img [src]="p.preview" alt="Foto" />
                  <button type="button" (click)="removeNewPhoto(i)" aria-label="Quitar foto">
                    <ion-icon name="close-outline"></ion-icon>
                  </button>
                </div>
                <label class="new-photo add">
                  <input type="file" accept="image/*" multiple hidden (change)="addNewPhotos($event)" />
                  <ion-icon name="camera-outline"></ion-icon>
                  <span>Añadir</span>
                </label>
              </div>
            </div>

            <!-- ENCARGADO (obligatorio) -->
            <div class="form-card">
              <ion-item class="form-item" fill="outline" shape="round">
                <ion-select label="Encargado del trabajo *" labelPlacement="stacked" [(ngModel)]="newJob.encargado_id"
                            placeholder="Elige un encargado" interface="action-sheet">
                  <ion-select-option *ngFor="let e of encargados" [value]="e.id">{{ e.full_name }}</ion-select-option>
                </ion-select>
              </ion-item>
              <p class="price-help" *ngIf="!encargados.length">No hay encargados activos. Crea uno en Equipo.</p>
              <p class="price-help" *ngIf="encargados.length">Solo este encargado verá el trabajo. Los ayudantes no lo ven.</p>
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

              <p *ngIf="selectedJob.price_amount != null">
                <b>Precio:</b>
                {{ selectedJob.price_amount | number: "1.2-2" }} €{{ priceSuffixText(selectedJob.price_type) }}
              </p>

              <p *ngIf="selectedJob.closed_price != null">
                <b>Cobrado (según encargado):</b>
                {{ selectedJob.closed_price | number: "1.2-2" }} €
              </p>
            </div>

            <!-- ==================================================
                 EN REVISIÓN / FINALIZADO -> revisión
            =================================================== -->
            <app-job-review
              *ngIf="selectedJob.status === 'pendiente_revision' || selectedJob.status === 'finalizado'"
              [jobId]="selectedJob.id"
              (done)="afterFlow()"
            ></app-job-review>

            <!-- ==================================================
                 CERRAR (registrar horas y participantes)
            =================================================== -->
            <app-job-close-form
              *ngIf="closingMode"
              [job]="selectedJob"
              [staffMode]="true"
              (saved)="afterFlow()"
              (cancel)="closingMode = false"
            ></app-job-close-form>

            <ng-container *ngIf="!closingMode && isOpenStatus(selectedJob.status)">
              <div class="jf-banner warn" *ngIf="selectedJob.return_reason" style="margin-bottom: 14px">
                <ion-icon name="alert-circle-outline"></ion-icon>
                <div><strong>Devuelto al encargado:</strong> {{ selectedJob.return_reason }}</div>
              </div>

              <div class="form-card">
                <!-- Los trabajos solo están Confirmados hasta que se terminan -->
                <div class="status-fixed">
                  <span>Estado</span>
                  <strong>Confirmado</strong>
                </div>

                <ion-item class="form-item" fill="outline" shape="round">
                  <ion-select label="Encargado *" [(ngModel)]="selectedJob.encargado_id" placeholder="Elige un encargado"
                              interface="action-sheet">
                    <ion-select-option *ngFor="let e of encargados" [value]="e.id">{{ e.full_name }}</ion-select-option>
                  </ion-select>
                </ion-item>

                <div class="price-label">Precio del trabajo</div>
                <div class="jf-seg price-seg">
                  <button type="button" [class.on]="selectedJob.price_type === 'fijo'" (click)="selectedJob.price_type = 'fijo'">Fijo</button>
                  <button type="button" [class.on]="selectedJob.price_type === 'hora'" (click)="selectedJob.price_type = 'hora'">Por hora</button>
                  <button type="button" [class.on]="selectedJob.price_type === 'dia'" (click)="selectedJob.price_type = 'dia'">Por día</button>
                </div>
                <div class="jf-money">
                  <input type="number" inputmode="decimal" min="0" step="0.01" [(ngModel)]="selectedJob.price_amount" placeholder="0,00" />
                  <span>{{ priceSuffix(selectedJob.price_type) }}</span>
                </div>
              </div>

              <div class="form-card">
                <app-job-photos [jobId]="selectedJob.id" [canUpload]="true"></app-job-photos>
              </div>

              <div class="modal-actions">
                <ion-button expand="block" class="primary-btn" (click)="saveStatus()">
                  Guardar cambios
                </ion-button>

                <ion-button
                  *ngIf="selectedJob.status === 'confirmado' || selectedJob.status === 'en_curso'"
                  expand="block"
                  fill="outline"
                  class="outline-btn"
                  (click)="closingMode = true"
                >
                  <ion-icon slot="start" name="checkmark-done-outline"></ion-icon>
                  Trabajo terminado (registrar horas)
                </ion-button>

                <ion-button expand="block" fill="clear" class="cancel-btn" (click)="showDetailModal = false">
                  Cerrar
                </ion-button>
              </div>
            </ng-container>

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

    <app-role-tabbar></app-role-tabbar>
  `,

  styles: [
    `
      .review-switch {
        display: grid;
        grid-template-columns: 1fr 1.4fr;
        gap: 6px;
        padding: 4px;
        margin: 4px 0 12px;
        background: var(--t-surface-2);
        border-radius: 14px;
      }
      .review-switch button {
        min-height: 42px;
        border: 0;
        border-radius: 11px;
        background: transparent;
        color: var(--t-muted);
        font: inherit;
        font-size: 13px;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        cursor: pointer;
      }
      .review-switch button.on {
        background: var(--t-surface);
        color: var(--t-text);
        box-shadow: var(--t-shadow);
      }
      .review-count {
        min-width: 20px;
        height: 20px;
        padding: 0 6px;
        border-radius: 999px;
        background: var(--t-warning);
        color: #fff;
        font-size: 11px;
        font-weight: 800;
        display: inline-grid;
        place-items: center;
      }
      .review-alert {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 14px 16px;
        margin-bottom: 14px;
        border: 1px solid transparent;
        border-radius: var(--t-radius);
        background: var(--t-warning-soft);
        color: var(--t-warning);
        font: inherit;
        text-align: left;
        cursor: pointer;
      }
      .review-alert > ion-icon:first-child {
        font-size: 24px;
        flex-shrink: 0;
      }
      .review-alert span {
        flex: 1;
        font-size: 12px;
        line-height: 1.35;
      }
      .review-alert strong {
        display: block;
        font-size: 14px;
      }

      :host {
        --finance-bg: var(--t-surface-2);
        --finance-white: #ffffff;

        --finance-primary: var(--t-primary);
        --finance-primary-dark: var(--t-text);
        --finance-primary-light: var(--t-primary-soft);

        --finance-text: var(--t-text);
        --finance-text-soft: var(--t-muted);
        --finance-muted: var(--t-muted);

        --finance-border: var(--t-border);

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
        --background: var(--t-surface);
      }

      .trab-header ion-toolbar {
        --background: var(--t-surface);
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

        background: var(--t-surface);

        border: 1px solid var(--t-border);
        border-radius: 24px;

        overflow: hidden;

        padding: 26px 20px 28px;

        margin-bottom: 22px;

        box-shadow: var(--t-shadow);

        cursor: pointer;

        transition: transform 0.2s ease,
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

        display: none;
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
          var(--t-surface) 35%,
          var(--t-primary-soft) 36%,
          var(--t-primary-soft) 100%
        );
      }

      .cta-icon-circle {
        width: 46px;
        height: 46px;

        display: flex;

        align-items: center;
        justify-content: center;

        border-radius: 14px;

        background: var(--t-surface);

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

        background: var(--t-surface);

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

        border-bottom: 1px solid var(--t-surface-2);

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
        background: var(--t-primary-soft);
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

      .status-fixed {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        margin-bottom: 10px;
        border-radius: 14px;
        background: var(--t-primary-soft);
        color: var(--t-primary);
        font-size: 14px;
      }
      .status-fixed span {
        font-weight: 600;
        color: var(--t-text-2);
      }
      .status-fixed strong {
        font-weight: 800;
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

        background: var(--t-surface);

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

        border: 1px dashed var(--t-border);

        background: var(--t-surface-2);
      }

      .empty-icon {
        width: 75px;
        height: 75px;

        display: flex;

        align-items: center;
        justify-content: center;

        border-radius: 22px;

        background: var(--t-primary-soft);
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
        background: var(--t-surface);

        border: 1px solid var(--finance-border);

        border-radius: 20px;

        padding: 16px;

        margin-bottom: 4px;

        box-shadow: var(--finance-shadow-soft);
      }

      .form-item {
        --background: var(--t-surface);

        --border-color: var(--t-border);
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

        background: var(--t-surface);

        border: 1.5px solid var(--t-border);

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
        background: var(--t-surface);

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
        background: var(--t-surface);

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
        --background: var(--t-primary);

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
        --background: var(--t-primary) !important;

        --color: #ffffff !important;

        --border-color: var(--t-primary) !important;
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

  /* Vista por meses (como en Historial) */
  selectedMonth = new Date().getMonth();
  selectedYear = new Date().getFullYear();
  readonly monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
  ];

  get monthJobs(): any[] {
    const prefix = `${this.selectedYear}-${String(this.selectedMonth + 1).padStart(2, "0")}`;
    return this.jobs
      .filter((j) => String(j.job_date || "").startsWith(prefix))
      .sort((a, b) =>
        `${b.job_date} ${b.start_time || ""}`.localeCompare(`${a.job_date} ${a.start_time || ""}`),
      );
  }

  /** Filtro "Pendientes de revisión" (de cualquier mes). */
  reviewOnly = false;

  get reviewJobs(): any[] {
    return this.jobs
      .filter((j) => j.status === "pendiente_revision")
      .sort((a, b) => String(a.closed_at || "").localeCompare(String(b.closed_at || "")));
  }

  get reviewCount(): number {
    return this.reviewJobs.length;
  }

  get visibleJobs(): any[] {
    return this.reviewOnly ? this.reviewJobs : this.monthJobs;
  }

  get encargados(): Profile[] {
    return this.employees.filter(
      (e: any) => e.role === "encargado" && e.account_status === "activo" && !e.deleted_at,
    );
  }

  closingMode = false;

  isOpenStatus(status: string) {
    return status === "pendiente" || status === "confirmado" || status === "en_curso";
  }

  async afterFlow() {
    this.closingMode = false;
    this.showDetailModal = false;
    await this.load();
  }

  get monthFinished(): number {
    return this.monthJobs.filter((j) => j.status === "finalizado").length;
  }

  get monthIncome(): number {
    return this.monthJobs
      .filter((j) => j.status === "finalizado")
      .reduce((t, j) => t + (Number(j.total_cost) || 0), 0);
  }

  shiftMonth(delta: number) {
    const d = new Date(this.selectedYear, this.selectedMonth + delta, 1);
    this.selectedMonth = d.getMonth();
    this.selectedYear = d.getFullYear();
  }

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
    encargado_id: null,
    price_type: "fijo",
    price_amount: null,
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
      "camera-outline": tramoCameraOutline,
      "close-outline": tramoCloseOutline,
      addOutline,
      trashOutline,
      cubeOutline,
      hammerOutline,
      constructOutline,
      chevronForwardOutline,
      chevronBackOutline,
      documentTextOutline,
      calendarOutline,
      timeOutline,
      hourglassOutline,
      alertCircleOutline,
      checkmarkDoneOutline,
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
    return JOB_STATUS_LABELS[status] ?? status;
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
      encargado_id: this.encargados.length === 1 ? this.encargados[0].id : null,
      price_type: "fijo",
      price_amount: null,
    };
    this.clearNewPhotos();

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

    const priceError = this.priceError(this.newJob.price_type, this.newJob.price_amount);
    if (priceError) {
      return priceError;
    }

    if (!this.newJob.encargado_id) {
      return "Elige el encargado del trabajo";
    }

    return null;
  }

  /** Fotos elegidas en "Nuevo trabajo" (se suben al crear). */
  newPhotos: { file: File; preview: string }[] = [];

  addNewPhotos(ev: Event) {
    const input = ev.target as HTMLInputElement;
    for (const file of Array.from(input.files ?? [])) {
      if (!file.type.startsWith("image/")) continue;
      this.newPhotos.push({ file, preview: URL.createObjectURL(file) });
    }
    input.value = "";
  }

  removeNewPhoto(i: number) {
    const [p] = this.newPhotos.splice(i, 1);
    if (p) URL.revokeObjectURL(p.preview);
  }

  clearNewPhotos() {
    this.newPhotos.forEach((p) => URL.revokeObjectURL(p.preview));
    this.newPhotos = [];
  }

  /** Precio obligatorio: tipo + importe válido. */
  priceError(type: string | null, amount: any): string | null {
    if (!type || !["fijo", "hora", "dia"].includes(type)) {
      return "Indica si el precio es fijo, por hora o por día";
    }
    const n = Number(amount);
    if (amount === null || amount === "" || amount === undefined || !Number.isFinite(n) || n <= 0) {
      return type === "fijo" ? "Indica el precio del trabajo" : `Indica cuánto se cobra ${type === "hora" ? "por hora" : "por día"}`;
    }
    return null;
  }

  priceSuffix(type: string | null): string {
    return type === "hora" ? "€ / hora" : type === "dia" ? "€ / día" : "€";
  }

  priceSuffixText(type: string | null): string {
    return type === "hora" ? " por hora" : type === "dia" ? " por día" : " (fijo)";
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

        price_amount: Math.round(Number(this.newJob.price_amount) * 100) / 100,
      };

      const created: any = await this.supabase.createJob(payload);

      // Fotos: se suben cuando el trabajo ya existe (la ruta lleva su id)
      let failed = 0;
      for (const p of this.newPhotos) {
        try {
          await this.supabase.uploadJobPhoto(created.id, p.file);
        } catch {
          failed++;
        }
      }
      this.clearNewPhotos();

      this.showCreateModal = false;

      if (failed > 0) {
        await this.showError(
          "Trabajo creado",
          `No se ${failed === 1 ? "pudo subir 1 foto" : `pudieron subir ${failed} fotos`}. Puedes añadirlas desde el detalle del trabajo.`,
        );
      }

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

    this.closingMode = false;
    this.showDetailModal = true;
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
      if (!this.selectedJob.encargado_id) {
        await this.showError("Revisa el trabajo", "Elige un encargado para este trabajo.");
        return;
      }
      const priceError = this.priceError(this.selectedJob.price_type, this.selectedJob.price_amount);
      if (priceError) {
        await this.showError("Revisa el precio", priceError);
        return;
      }

      await this.supabase.updateJob(this.selectedJob.id, {
        status: "confirmado",
        encargado_id: this.selectedJob.encargado_id,
        price_type: this.selectedJob.price_type,
        price_amount: Math.round(Number(this.selectedJob.price_amount) * 100) / 100,
      });

      this.showDetailModal = false;

      await this.load();
    } catch (err) {
      await this.showError("No se pudo guardar el estado", err);
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
