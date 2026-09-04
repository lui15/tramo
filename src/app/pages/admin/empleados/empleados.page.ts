import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonIcon,
  IonModal,
  IonButtons,
  IonButton,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonBadge,
  IonSpinner,
  IonItem,
  IonLabel,
} from "@ionic/angular/standalone";

import {
  peopleOutline,
  personAddOutline,
  searchOutline,
  checkmarkCircleOutline,
  timeOutline,
  cashOutline,
  walletOutline,
  closeCircleOutline,
  createOutline,
  trashOutline,
  cardOutline,
  briefcaseOutline,
  calendarOutline,
  mailOutline,
  callOutline,
  shieldCheckmarkOutline,
  chevronForwardOutline,
  refreshOutline,
  closeOutline,
  checkmarkOutline,
  alertCircleOutline,
  businessOutline,
} from "ionicons/icons";

import { addIcons } from "ionicons";

import { SupabaseService, Profile } from "../../../services/supabase.service";

import { AdminTabbarComponent } from "../../../components/admin-tabbar.component";

interface EmployeeView extends Profile {
  totalEarned: number;
  totalPaid: number;
  totalPending: number;
  totalJobs: number;
}

@Component({
  selector: "app-admin-empleados",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,

    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonIcon,
    IonModal,
    IonButtons,
    IonButton,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonBadge,
    IonSpinner,
    IonItem,
    IonLabel,

    AdminTabbarComponent,
  ],
  template: `
    <ion-header class="main-header">
      <ion-toolbar>
        <ion-title>Empleados</ion-title>

        <ion-buttons slot="end">
          <ion-button
            class="header-refresh"
            fill="clear"
            (click)="load()"
            [disabled]="loading"
          >
            <ion-icon name="refresh-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true">
      <div class="page-wrap">
        <!-- ==================================================
             RESUMEN
        =================================================== -->

        <section class="summary-grid">
          <div class="summary-card">
            <div class="summary-icon blue">
              <ion-icon name="people-outline"></ion-icon>
            </div>

            <div class="summary-content">
              <span class="summary-label"> EMPLEADOS </span>

              <strong>
                {{ all.length }}
              </strong>
            </div>
          </div>

          <div class="summary-card">
            <div class="summary-icon orange">
              <ion-icon name="time-outline"></ion-icon>
            </div>

            <div class="summary-content">
              <span class="summary-label"> PENDIENTES </span>

              <strong>
                {{ pending.length }}
              </strong>
            </div>
          </div>

          <div class="summary-card">
            <div class="summary-icon green">
              <ion-icon name="checkmark-circle-outline"></ion-icon>
            </div>

            <div class="summary-content">
              <span class="summary-label"> ACTIVOS </span>

              <strong>
                {{ active.length }}
              </strong>
            </div>
          </div>

          <div class="summary-card">
            <div class="summary-icon purple">
              <ion-icon name="wallet-outline"></ion-icon>
            </div>

            <div class="summary-content">
              <span class="summary-label"> PENDIENTE </span>

              <strong> {{ totalPending | number: "1.2-2" }} € </strong>
            </div>
          </div>
        </section>

        <!-- ==================================================
             BUSCADOR
        =================================================== -->

        <section class="search-section">
          <div class="section-heading compact">
            <div class="section-icon">
              <ion-icon name="search-outline"></ion-icon>
            </div>

            <div>
              <h2>Buscar empleados</h2>

              <p>Encuentra un empleado por nombre, email o rol</p>
            </div>
          </div>

          <ion-item class="form-item search-item" lines="none">
            <ion-icon slot="start" name="search-outline"></ion-icon>

            <ion-label position="stacked"> Buscar empleado </ion-label>

            <ion-input
              [(ngModel)]="searchTerm"
              (ionInput)="applyFilters()"
              placeholder="Nombre, email o rol..."
              type="text"
              clearInput="true"
            ></ion-input>
          </ion-item>
        </section>

        <!-- ==================================================
             ERROR
        =================================================== -->

        <div class="error-box" *ngIf="errorMessage">
          <ion-icon name="alert-circle-outline"></ion-icon>

          <div>
            <strong> Ha ocurrido un error </strong>

            <span>
              {{ errorMessage }}
            </span>
          </div>

          <ion-button fill="clear" size="small" (click)="errorMessage = ''">
            <ion-icon name="close-outline"></ion-icon>
          </ion-button>
        </div>

        <!-- ==================================================
             LOADING
        =================================================== -->

        <div class="loading-state" *ngIf="loading">
          <ion-spinner name="crescent"></ion-spinner>

          <span> Cargando empleados... </span>
        </div>

        <ng-container *ngIf="!loading">
          <!-- ==================================================
               PENDIENTES
          =================================================== -->

          <section class="employees-section" *ngIf="filteredPending.length > 0">
            <div class="section-heading">
              <div class="section-icon warning">
                <ion-icon name="time-outline"></ion-icon>
              </div>

              <div>
                <h2>Solicitudes pendientes</h2>

                <p>Revisa y aprueba los empleados pendientes</p>
              </div>

              <ion-badge class="count-badge warning-badge">
                {{ filteredPending.length }}
              </ion-badge>
            </div>

            <div class="ledger">
              <button
                type="button"
                class="employee-row"
                *ngFor="let employee of filteredPending"
                (click)="openDetail(employee)"
              >
                <div class="employee-avatar pending-avatar">
                  {{ getInitials(employee.full_name) }}
                </div>

                <div class="employee-main">
                  <div class="employee-name">
                    {{ employee.full_name || "Sin nombre" }}
                  </div>

                  <div class="employee-email">
                    <ion-icon name="mail-outline"></ion-icon>

                    {{ employee.email || "Sin email" }}
                  </div>

                  <div class="employee-meta">
                    <span>
                      <ion-icon name="briefcase-outline"></ion-icon>

                      {{ employee.role || "ayudante" }}
                    </span>

                    <span>
                      <ion-icon name="time-outline"></ion-icon>

                      Pendiente
                    </span>
                  </div>
                </div>

                <div class="employee-status">
                  <ion-badge class="status-badge pending-status">
                    Pendiente
                  </ion-badge>
                </div>

                <ion-icon
                  class="row-chevron"
                  name="chevron-forward-outline"
                ></ion-icon>
              </button>
            </div>
          </section>

          <!-- ==================================================
               ACTIVOS
          =================================================== -->

          <section class="employees-section" *ngIf="filteredActive.length > 0">
            <div class="section-heading">
              <div class="section-icon success">
                <ion-icon name="checkmark-circle-outline"></ion-icon>
              </div>

              <div>
                <h2>Empleados activos</h2>

                <p>Gestiona los empleados de tu equipo</p>
              </div>

              <ion-badge class="count-badge success-badge">
                {{ filteredActive.length }}
              </ion-badge>
            </div>

            <div class="ledger">
              <button
                type="button"
                class="employee-row"
                *ngFor="let employee of filteredActive"
                (click)="openDetail(employee)"
              >
                <div class="employee-avatar active-avatar">
                  {{ getInitials(employee.full_name) }}
                </div>

                <div class="employee-main">
                  <div class="employee-name">
                    {{ employee.full_name || "Sin nombre" }}
                  </div>

                  <div class="employee-email">
                    <ion-icon name="mail-outline"></ion-icon>

                    {{ employee.email || "Sin email" }}
                  </div>

                  <div class="employee-meta">
                    <span>
                      <ion-icon name="briefcase-outline"></ion-icon>

                      {{ employee.role || "ayudante" }}
                    </span>

                    <span>
                      <ion-icon name="calendar-outline"></ion-icon>

                      {{ employee.totalJobs }} trabajos
                    </span>
                  </div>
                </div>

                <div class="employee-finance">
                  <strong>
                    {{ employee.totalPending | number: "1.2-2" }} €
                  </strong>

                  <span> Pendiente </span>
                </div>

                <ion-icon
                  class="row-chevron"
                  name="chevron-forward-outline"
                ></ion-icon>
              </button>
            </div>
          </section>

          <!-- ==================================================
               SIN RESULTADOS
          =================================================== -->

          <section
            class="empty-state"
            *ngIf="filteredPending.length === 0 && filteredActive.length === 0"
          >
            <div class="empty-icon">
              <ion-icon name="people-outline"></ion-icon>
            </div>

            <h2>
              {{
                searchTerm.trim()
                  ? "No se encontraron empleados"
                  : "No hay empleados"
              }}
            </h2>

            <p>
              {{
                searchTerm.trim()
                  ? "Prueba con otro nombre, email o rol."
                  : "Todavía no hay empleados registrados."
              }}
            </p>

            <ion-button
              *ngIf="searchTerm.trim()"
              class="clear-search-btn"
              fill="outline"
              (click)="searchTerm = ''; applyFilters()"
            >
              Limpiar búsqueda
            </ion-button>
          </section>
        </ng-container>
      </div>
    </ion-content>

    <!-- ======================================================
         TABBAR
         IMPORTANTE: FUERA DEL ION-CONTENT
    ======================================================= -->

    <app-admin-tabbar></app-admin-tabbar>

    <!-- ======================================================
         MODAL EMPLEADO
    ======================================================= -->

    <ion-modal
      [isOpen]="showModal"
      (didDismiss)="closeModal()"
      [backdropDismiss]="!saving"
    >
      <ng-template>
        <ion-header class="modal-header">
          <ion-toolbar>
            <ion-title>
              {{ selected?.is_approved ? "Empleado" : "Solicitud" }}
            </ion-title>

            <ion-buttons slot="end">
              <ion-button
                fill="clear"
                (click)="closeModal()"
                [disabled]="saving"
              >
                <ion-icon name="close-outline"></ion-icon>
              </ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>

        <ion-content class="modal-content">
          <div class="form-wrap" *ngIf="selected">
            <!-- ==================================================
                 EMPLEADO
            =================================================== -->

            <section class="detail-summary">
              <div
                class="detail-avatar"
                [class.pending]="!selected.is_approved"
              >
                {{ getInitials(selected.full_name) }}
              </div>

              <div class="detail-info">
                <h1>
                  {{ selected.full_name || "Sin nombre" }}
                </h1>

                <div class="detail-email">
                  <ion-icon name="mail-outline"></ion-icon>

                  {{ selected.email || "Sin email" }}
                </div>

                <ion-badge
                  class="detail-status"
                  [class.status-approved]="selected.is_approved"
                  [class.status-pending]="!selected.is_approved"
                >
                  {{
                    selected.is_approved
                      ? "Empleado activo"
                      : "Solicitud pendiente"
                  }}
                </ion-badge>
              </div>
            </section>

            <!-- ==================================================
                 CONFIGURACIÓN
            =================================================== -->

            <section class="form-card">
              <div class="block-title">
                <div class="block-icon">
                  <ion-icon name="business-outline"></ion-icon>
                </div>

                <div>
                  <h2>Información del empleado</h2>

                  <p>Configura el puesto y la forma de pago</p>
                </div>
              </div>

              <!-- ROL -->

              <ion-item class="form-item" lines="none">
                <ion-icon slot="start" name="briefcase-outline"></ion-icon>

                <ion-label position="stacked"> Rol </ion-label>

                <ion-select
                  [(ngModel)]="form.role"
                  interface="popover"
                  [disabled]="saving"
                  placeholder="Selecciona un rol"
                >
                  <ion-select-option value="ayudante">
                    Ayudante
                  </ion-select-option>

                  <ion-select-option value="supervisor">
                    Supervisor
                  </ion-select-option>
                </ion-select>
              </ion-item>

              <!-- MÉTODO PAGO -->

              <ion-item class="form-item" lines="none">
                <ion-icon slot="start" name="card-outline"></ion-icon>

                <ion-label position="stacked"> Método de pago </ion-label>

                <ion-select
                  [(ngModel)]="form.payment_method"
                  interface="popover"
                  [disabled]="saving"
                  placeholder="Selecciona un método"
                >
                  <ion-select-option value="acumulativo">
                    Acumulativo
                  </ion-select-option>

                  <ion-select-option value="fijo">
                    Sueldo fijo
                  </ion-select-option>
                </ion-select>
              </ion-item>

              <!-- SUELDO FIJO -->

              <ion-item
                class="form-item"
                lines="none"
                *ngIf="form.payment_method === 'fijo'"
              >
                <ion-icon slot="start" name="cash-outline"></ion-icon>

                <ion-label position="stacked"> Sueldo fijo </ion-label>

                <ion-input
                  [(ngModel)]="form.fixed_salary"
                  type="number"
                  inputmode="decimal"
                  min="0"
                  step="0.01"
                  [disabled]="saving"
                  placeholder="0.00"
                ></ion-input>

                <span class="currency-symbol" slot="end"> € </span>
              </ion-item>
            </section>

            <!-- ==================================================
                 FINANZAS
            =================================================== -->

            <section class="form-card finance-card">
              <div class="block-title">
                <div class="block-icon">
                  <ion-icon name="wallet-outline"></ion-icon>
                </div>

                <div>
                  <h2>Resumen económico</h2>

                  <p>Estado actual de sus pagos</p>
                </div>
              </div>

              <div class="finance-grid">
                <div class="finance-box">
                  <span class="finance-label"> GENERADO </span>

                  <strong>
                    {{ selected.totalEarned | number: "1.2-2" }} €
                  </strong>
                </div>

                <div class="finance-box">
                  <span class="finance-label"> PAGADO </span>

                  <strong>
                    {{ selected.totalPaid | number: "1.2-2" }} €
                  </strong>
                </div>

                <div class="finance-box pending-finance">
                  <span class="finance-label"> PENDIENTE </span>

                  <strong>
                    {{ selected.totalPending | number: "1.2-2" }} €
                  </strong>
                </div>

                <div class="finance-box">
                  <span class="finance-label"> TRABAJOS </span>

                  <strong>
                    {{ selected.totalJobs }}
                  </strong>
                </div>
              </div>
            </section>

            <!-- ==================================================
                 PAGO
            =================================================== -->

            <section class="form-card" *ngIf="selected.totalPending > 0">
              <div class="block-title">
                <div class="block-icon">
                  <ion-icon name="cash-outline"></ion-icon>
                </div>

                <div>
                  <h2>Registrar pago</h2>

                  <p>Registra un pago para reducir el saldo pendiente</p>
                </div>
              </div>

              <ion-item class="form-item" lines="none">
                <ion-icon slot="start" name="wallet-outline"></ion-icon>

                <ion-label position="stacked"> Monto del pago </ion-label>

                <ion-input
                  [(ngModel)]="settleAmount"
                  type="number"
                  inputmode="decimal"
                  min="0"
                  step="0.01"
                  [disabled]="saving"
                  placeholder="0.00"
                ></ion-input>

                <span class="currency-symbol" slot="end"> € </span>
              </ion-item>

              <div class="pending-hint">
                <ion-icon name="alert-circle-outline"></ion-icon>

                <span>
                  Pendiente actual:

                  <strong>
                    {{ selected.totalPending | number: "1.2-2" }} €
                  </strong>
                </span>
              </div>

              <ion-button
                expand="block"
                class="primary-btn"
                (click)="settle()"
                [disabled]="saving"
              >
                <ion-spinner *ngIf="saving" name="crescent"></ion-spinner>

                <ion-icon
                  *ngIf="!saving"
                  slot="start"
                  name="cash-outline"
                ></ion-icon>

                {{ saving ? "Guardando..." : "Registrar pago" }}
              </ion-button>
            </section>

            <!-- ==================================================
                 ACCIONES
            =================================================== -->

            <section class="modal-actions">
              <ion-button
                *ngIf="!selected.is_approved"
                expand="block"
                class="primary-btn"
                (click)="approve()"
                [disabled]="saving"
              >
                <ion-spinner *ngIf="saving" name="crescent"></ion-spinner>

                <ion-icon
                  *ngIf="!saving"
                  slot="start"
                  name="checkmark-outline"
                ></ion-icon>

                {{ saving ? "Aprobando..." : "Aprobar empleado" }}
              </ion-button>

              <ion-button
                *ngIf="selected.is_approved"
                expand="block"
                class="primary-btn"
                (click)="save()"
                [disabled]="saving"
              >
                <ion-spinner *ngIf="saving" name="crescent"></ion-spinner>

                <ion-icon
                  *ngIf="!saving"
                  slot="start"
                  name="checkmark-outline"
                ></ion-icon>

                {{ saving ? "Guardando..." : "Guardar cambios" }}
              </ion-button>

              <ion-button
                expand="block"
                fill="outline"
                class="cancel-btn"
                (click)="closeModal()"
                [disabled]="saving"
              >
                Cancelar
              </ion-button>
            </section>

            <!-- ==================================================
                 ELIMINAR
            =================================================== -->

            <section class="delete-section">
              <div class="delete-title">
                <ion-icon name="trash-outline"></ion-icon>

                <span> Zona de peligro </span>
              </div>

              <p>
                Eliminar este empleado borrará su registro de la administración.
                Esta acción no se puede deshacer.
              </p>

              <ion-button
                expand="block"
                fill="outline"
                class="delete-btn"
                (click)="remove()"
                [disabled]="saving"
              >
                <ion-icon slot="start" name="trash-outline"></ion-icon>

                Eliminar empleado
              </ion-button>
            </section>
          </div>
        </ion-content>
      </ng-template>
    </ion-modal>
  `,

  styles: [
    `
      /* ======================================================
     BASE
    ======================================================= */

      :host {
        --page-bg: #f8fafc;
        --primary: #1769ff;
        --primary-dark: #1255d4;
        --text: #172033;
        --muted: #718096;
        --border: #dfe5ef;
        --soft-blue: #eef5ff;
        --green: #16a34a;
        --orange: #f59e0b;
        --red: #dc2626;
        display: block;
        min-height: 100%;
        background: var(--page-bg);
      }

      ion-content {
        --background: #f8fafc;
        background: #f8fafc;

        /* CAMBIO: el contenido queda por debajo del tabbar */
        position: relative;
        z-index: 1;
      }

      ion-content::part(scroll) {
        background: #f8fafc;
      }

      /* ======================================================
     HEADER
    ======================================================= */

      .main-header {
        box-shadow: 0 1px 8px rgba(20, 40, 80, 0.06);
        z-index: 10;
      }

      .main-header ion-toolbar {
        --background: #ffffff;
        --min-height: 64px;
        --border-width: 0;
        padding: 0 10px;
      }

      .main-header ion-title {
        color: var(--text);
        font-size: 20px;
        font-weight: 800;
        text-align: center;
      }

      .header-refresh {
        --color: var(--primary);
        --padding-start: 8px;
        --padding-end: 8px;
      }

      .header-refresh ion-icon {
        font-size: 22px;
      }

      /* ======================================================
     PAGE
    ======================================================= */

      .page-wrap {
        width: 100%;
        max-width: 900px;
        min-height: calc(100vh - 64px);
        margin: 0 auto;

        /* CAMBIO: antes 140px */
        padding: 22px 18px 110px;

        box-sizing: border-box;
        background: #f8fafc;
      }

      /* ======================================================
     SUMMARY
    ======================================================= */

      .summary-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
        margin-bottom: 24px;
      }

      .summary-card {
        display: flex;
        align-items: center;
        gap: 12px;
        min-height: 82px;
        padding: 15px;
        border-radius: 18px;
        background: #ffffff;
        border: 1px solid #e6ebf3;
        box-shadow: 0 7px 20px rgba(31, 53, 88, 0.06);
      }

      .summary-icon {
        width: 42px;
        height: 42px;
        min-width: 42px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .summary-icon ion-icon {
        font-size: 22px;
      }

      .summary-icon.blue {
        background: #e9f1ff;
        color: #1769ff;
      }

      .summary-icon.orange {
        background: #fff5df;
        color: #e89500;
      }

      .summary-icon.green {
        background: #eaf9ef;
        color: #16a34a;
      }

      .summary-icon.purple {
        background: #f2edff;
        color: #7655d8;
      }

      .summary-content {
        display: flex;
        flex-direction: column;
        min-width: 0;
      }

      .summary-label {
        color: #7a8699;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.07em;
        margin-bottom: 3px;
      }

      .summary-content strong {
        color: var(--text);
        font-size: 19px;
        font-weight: 850;
        white-space: nowrap;
      }

      /* ======================================================
     SEARCH
    ======================================================= */

      .search-section {
        margin-bottom: 28px;
      }

      .section-heading {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 13px;
      }

      .section-heading.compact {
        margin-bottom: 14px;
      }

      .section-heading > div:nth-child(2) {
        flex: 1;
        min-width: 0;
      }

      .section-heading h2 {
        margin: 0;
        color: var(--text);
        font-size: 17px;
        line-height: 1.15;
        font-weight: 850;
        text-transform: uppercase;
        letter-spacing: 0.01em;
      }

      .section-heading p {
        margin: 4px 0 0;
        color: var(--muted);
        font-size: 12px;
        line-height: 1.35;
      }

      .section-icon {
        width: 38px;
        height: 38px;
        min-width: 38px;
        border-radius: 11px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--primary);
        color: #ffffff;
        box-shadow: 0 5px 12px rgba(23, 105, 255, 0.2);
      }

      .section-icon.warning {
        background: #f59e0b;
        box-shadow: 0 5px 12px rgba(245, 158, 11, 0.18);
      }

      .section-icon.success {
        background: #16a34a;
        box-shadow: 0 5px 12px rgba(22, 163, 74, 0.18);
      }

      .section-icon ion-icon {
        font-size: 20px;
      }

      /* ======================================================
     FORM ITEMS
    ======================================================= */

      .form-item {
        --background: #ffffff;
        --border-color: #d3dcec;
        --border-width: 1px;
        --border-style: solid;
        --highlight-color-focused: var(--primary);
        --padding-start: 14px;
        --padding-end: 14px;
        --inner-padding-end: 0;
        position: relative;
        margin-bottom: 12px;
        border-radius: 14px;
        overflow: hidden;
      }

      .form-item::part(native) {
        min-height: 62px;
        border: 1px solid #d3dcec;
        border-radius: 14px;
        background: #ffffff;
        box-shadow: none;
      }

      .form-item ion-icon[slot="start"] {
        color: var(--primary);
        font-size: 19px;
        margin-right: 10px;
      }

      .form-item ion-label {
        color: #6d7890 !important;
        font-size: 11px !important;
        font-weight: 800 !important;
        letter-spacing: 0.02em;
        text-transform: uppercase;
      }

      .form-item ion-input,
      .form-item ion-select {
        --color: var(--text);
        --placeholder-color: #a1aabc;
        --placeholder-opacity: 1;
        font-size: 14px;
        font-weight: 600;
        margin-top: 2px;
      }

      .form-item:focus-within::part(native) {
        border-color: var(--primary);
        box-shadow: 0 0 0 3px rgba(23, 105, 255, 0.08);
      }

      .search-item::part(native) {
        min-height: 58px;
      }

      .search-item ion-input {
        font-size: 15px;
      }

      .currency-symbol {
        color: #7b879b;
        font-size: 15px;
        font-weight: 800;
        margin-left: 6px;
      }

      /* ======================================================
     ERROR
    ======================================================= */

      .error-box {
        display: flex;
        align-items: center;
        gap: 11px;
        padding: 13px 14px;
        margin-bottom: 22px;
        border: 1px solid #fecaca;
        border-radius: 14px;
        background: #fff5f5;
        color: #991b1b;
      }

      .error-box > ion-icon {
        font-size: 21px;
        flex-shrink: 0;
      }

      .error-box > div {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-width: 0;
      }

      .error-box strong {
        font-size: 12px;
        font-weight: 850;
      }

      .error-box span {
        margin-top: 2px;
        font-size: 12px;
        line-height: 1.35;
        word-break: break-word;
      }

      .error-box ion-button {
        --color: #991b1b;
        margin: 0;
      }

      /* ======================================================
     LOADING
    ======================================================= */

      .loading-state {
        min-height: 280px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 13px;
        color: var(--muted);
        font-size: 13px;
        font-weight: 600;
      }

      .loading-state ion-spinner {
        width: 35px;
        height: 35px;
        color: var(--primary);
      }

      /* ======================================================
     EMPLOYEES
    ======================================================= */

      .employees-section {
        margin-bottom: 30px;
      }

      .count-badge {
        --padding-start: 9px;
        --padding-end: 9px;
        --padding-top: 5px;
        --padding-bottom: 5px;
        border-radius: 20px;
        font-size: 11px;
        font-weight: 850;
        margin-left: auto;
      }

      .warning-badge {
        --background: #fff3d7;
        --color: #b56c00;
      }

      .success-badge {
        --background: #eaf8ef;
        --color: #15803d;
      }

      /* ======================================================
     LEDGER
    ======================================================= */

      .ledger {
        overflow: hidden;
        background: #ffffff;
        border: 1px solid #e4e9f1;
        border-radius: 20px;
        box-shadow: 0 8px 25px rgba(30, 49, 80, 0.06);
      }

      .employee-row {
        width: 100%;
        min-height: 86px;
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 13px;
        border: 0;
        border-bottom: 1px solid #edf0f5;
        background: #ffffff;
        text-align: left;
        font: inherit;
        color: inherit;
        cursor: pointer;
        transition:
          background 0.16s ease,
          transform 0.16s ease;
        -webkit-tap-highlight-color: transparent;
      }

      .employee-row:last-child {
        border-bottom: 0;
      }

      .employee-row:active {
        background: #f5f8fd;
        transform: scale(0.995);
      }

      .employee-avatar {
        width: 46px;
        height: 46px;
        min-width: 46px;
        border-radius: 13px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        font-weight: 850;
        letter-spacing: 0.02em;
      }

      .pending-avatar {
        background: #fff2d8;
        color: #b56d00;
      }

      .active-avatar {
        background: #e9f1ff;
        color: var(--primary);
      }

      .employee-main {
        flex: 1;
        min-width: 0;
      }

      .employee-name {
        color: var(--text);
        font-size: 14px;
        font-weight: 800;
        line-height: 1.25;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .employee-email {
        display: flex;
        align-items: center;
        gap: 5px;
        margin-top: 4px;
        color: #7b8799;
        font-size: 11px;
        line-height: 1.2;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .employee-email ion-icon {
        flex-shrink: 0;
        font-size: 13px;
      }

      .employee-meta {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 9px;
        margin-top: 5px;
        color: #8792a4;
        font-size: 10px;
        font-weight: 650;
      }

      .employee-meta span {
        display: inline-flex;
        align-items: center;
        gap: 3px;
      }

      .employee-meta ion-icon {
        font-size: 12px;
      }

      .employee-status {
        flex-shrink: 0;
      }

      .status-badge {
        --padding-start: 8px;
        --padding-end: 8px;
        --padding-top: 5px;
        --padding-bottom: 5px;
        border-radius: 15px;
        font-size: 9px;
        font-weight: 850;
        text-transform: uppercase;
        letter-spacing: 0.03em;
      }

      .pending-status {
        --background: #fff3d7;
        --color: #ae6900;
      }

      .employee-finance {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        flex-shrink: 0;
        min-width: 72px;
      }

      .employee-finance strong {
        color: var(--text);
        font-size: 13px;
        font-weight: 850;
        white-space: nowrap;
      }

      .employee-finance span {
        margin-top: 2px;
        color: #8994a6;
        font-size: 9px;
        font-weight: 700;
        text-transform: uppercase;
      }

      .row-chevron {
        flex-shrink: 0;
        color: #a3adbd;
        font-size: 19px;
      }

      /* ======================================================
     EMPTY
    ======================================================= */

      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 42px 22px;
        margin-top: 8px;
        background: #ffffff;
        border: 1px solid #e4e9f1;
        border-radius: 22px;
        box-shadow: 0 8px 25px rgba(30, 49, 80, 0.05);
        text-align: center;
      }

      .empty-icon {
        width: 92px;
        height: 92px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 18px;
        border: 2px dashed #cdd7e7;
        border-radius: 50%;
        background: #f8fbff;
        color: #9aabc2;
      }

      .empty-icon ion-icon {
        font-size: 38px;
      }

      .empty-state h2 {
        margin: 0;
        color: var(--text);
        font-size: 17px;
        font-weight: 850;
      }

      .empty-state p {
        max-width: 340px;
        margin: 7px 0 0;
        color: var(--muted);
        font-size: 12px;
        line-height: 1.45;
      }

      .clear-search-btn {
        margin-top: 18px;
        --color: var(--primary);
        --border-color: #bcd0f4;
        --border-radius: 12px;
        text-transform: none;
        font-weight: 750;
      }

      /* ======================================================
     MODAL
    ======================================================= */

      ion-modal {
        --border-radius: 24px 24px 0 0;
        --height: 94%;
        --width: min(100%, 700px);
        align-items: flex-end;
      }

      .modal-header ion-toolbar {
        --background: #ffffff;
        --min-height: 62px;
        --border-width: 0 0 1px 0;
        --border-color: #e8ecf3;
        padding: 0 8px;
      }

      .modal-header ion-title {
        color: var(--text);
        font-size: 17px;
        font-weight: 850;
      }

      .modal-header ion-button {
        --color: #65738a;
      }

      .modal-content {
        --background: #f8fafc;
      }

      .form-wrap {
        width: 100%;
        max-width: 680px;
        margin: 0 auto;
        padding: 18px 16px 45px;
        box-sizing: border-box;
      }

      /* ======================================================
     DETAIL
    ======================================================= */

      .detail-summary {
        display: flex;
        align-items: center;
        gap: 14px;
        margin-bottom: 18px;
        padding: 18px;
        border: 1px solid #e1e8f2;
        border-radius: 20px;
        background: linear-gradient(135deg, #ffffff 0%, #f4f8ff 100%);
        box-shadow: 0 8px 25px rgba(31, 53, 88, 0.06);
        position: relative;
        overflow: hidden;
      }

      .detail-summary::before {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 5px;
        background: linear-gradient(90deg, #1769ff, #4d91ff);
      }

      .detail-avatar {
        width: 58px;
        height: 58px;
        min-width: 58px;
        border-radius: 17px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #e9f1ff;
        color: var(--primary);
        font-size: 17px;
        font-weight: 900;
      }

      .detail-avatar.pending {
        background: #fff2d8;
        color: #b56d00;
      }

      .detail-info {
        flex: 1;
        min-width: 0;
      }

      .detail-info h1 {
        margin: 0;
        color: var(--text);
        font-size: 19px;
        font-weight: 850;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .detail-email {
        display: flex;
        align-items: center;
        gap: 5px;
        margin-top: 4px;
        color: #778399;
        font-size: 11px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .detail-email ion-icon {
        font-size: 13px;
        flex-shrink: 0;
      }

      .detail-status {
        display: inline-flex;
        margin-top: 8px;
        --padding-start: 8px;
        --padding-end: 8px;
        --padding-top: 5px;
        --padding-bottom: 5px;
        border-radius: 15px;
        font-size: 9px;
        font-weight: 850;
        text-transform: uppercase;
      }

      .status-approved {
        --background: #eaf8ef;
        --color: #15803d;
      }

      .status-pending {
        --background: #fff3d7;
        --color: #ae6900;
      }

      /* ======================================================
     FORM CARD
    ======================================================= */

      .form-card {
        position: relative;
        margin-bottom: 16px;
        padding: 18px;
        border: 1px solid #dfe7f2;
        border-radius: 20px;
        background: linear-gradient(145deg, #ffffff 0%, #f5f9ff 100%);
        box-shadow: 0 8px 25px rgba(31, 53, 88, 0.055);
        overflow: hidden;
      }

      .form-card::before {
        content: "";
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        height: 3px;
        background: linear-gradient(90deg, #1769ff, #62a0ff);
      }

      .block-title {
        display: flex;
        align-items: center;
        gap: 11px;
        margin-bottom: 16px;
      }

      .block-icon {
        width: 37px;
        height: 37px;
        min-width: 37px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 10px;
        background: #1769ff;
        color: #ffffff;
        box-shadow: 0 5px 12px rgba(23, 105, 255, 0.18);
      }

      .block-icon ion-icon {
        font-size: 19px;
      }

      .block-title h2 {
        margin: 0;
        color: var(--text);
        font-size: 14px;
        font-weight: 850;
        text-transform: uppercase;
      }

      .block-title p {
        margin: 3px 0 0;
        color: #7a879a;
        font-size: 11px;
        line-height: 1.35;
      }

      /* ======================================================
     FINANCE
    ======================================================= */

      .finance-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
      }

      .finance-box {
        padding: 13px;
        border: 1px solid #e1e7f0;
        border-radius: 13px;
        background: rgba(255, 255, 255, 0.82);
      }

      .finance-label {
        display: block;
        color: #7d899b;
        font-size: 9px;
        font-weight: 850;
        letter-spacing: 0.06em;
      }

      .finance-box strong {
        display: block;
        margin-top: 4px;
        color: var(--text);
        font-size: 16px;
        font-weight: 850;
      }

      .pending-finance {
        border-color: #f4dfad;
        background: #fffaf0;
      }

      .pending-finance strong {
        color: #b56d00;
      }

      .pending-hint {
        display: flex;
        align-items: center;
        gap: 7px;
        margin: -2px 2px 14px;
        color: #79869a;
        font-size: 11px;
      }

      .pending-hint ion-icon {
        color: var(--primary);
        font-size: 15px;
      }

      .pending-hint strong {
        color: var(--text);
      }

      /* ======================================================
     BUTTONS
    ======================================================= */

      .primary-btn {
        --background: #1769ff !important;
        --background-activated: #1255d4 !important;
        --color: #ffffff !important;
        --border-radius: 14px;
        --box-shadow: 0 7px 18px rgba(23, 105, 255, 0.22);
        min-height: 50px;
        margin: 0;
        font-size: 13px;
        font-weight: 850;
        text-transform: none;
      }

      .primary-btn ion-spinner {
        width: 18px;
        height: 18px;
        margin-right: 8px;
      }

      .cancel-btn {
        --color: #56657b;
        --border-color: #ccd5e2;
        --border-radius: 14px;
        --background: #ffffff;
        min-height: 48px;
        margin: 0;
        font-size: 13px;
        font-weight: 750;
        text-transform: none;
      }

      .modal-actions {
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin-bottom: 22px;
      }

      /* ======================================================
     DELETE
    ======================================================= */

      .delete-section {
        padding: 17px;
        border: 1px solid #f0d5d5;
        border-radius: 18px;
        background: #fffafa;
      }

      .delete-title {
        display: flex;
        align-items: center;
        gap: 7px;
        color: #b42323;
        font-size: 12px;
        font-weight: 850;
        text-transform: uppercase;
      }

      .delete-title ion-icon {
        font-size: 17px;
      }

      .delete-section p {
        margin: 8px 0 13px;
        color: #8b6666;
        font-size: 11px;
        line-height: 1.45;
      }

      .delete-btn {
        --color: #c62828;
        --border-color: #e4b4b4;
        --background: #ffffff;
        --border-radius: 13px;
        min-height: 46px;
        margin: 0;
        font-size: 12px;
        font-weight: 800;
        text-transform: none;
      }

      /* ======================================================
     TABBAR
     CAMBIO: ESTE ES EL CAMBIO PRINCIPAL
    ======================================================= */

      app-admin-tabbar {
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

        pointer-events: auto !important;
      }

      /* ======================================================
     RESPONSIVE
    ======================================================= */

      @media (min-width: 768px) {
        .page-wrap {
          /* CAMBIO: antes 140px */
          padding: 30px 24px 110px;
        }

        .summary-grid {
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
        }

        .summary-card {
          min-height: 92px;
        }

        .employee-row {
          min-height: 90px;
          padding: 13px 17px;
        }

        .employee-avatar {
          width: 50px;
          height: 50px;
          min-width: 50px;
        }

        .employee-name {
          font-size: 15px;
        }

        .form-wrap {
          padding: 22px 22px 45px;
        }

        .finance-grid {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }
      }

      @media (max-width: 380px) {
        .page-wrap {
          padding-left: 12px;
          padding-right: 12px;

          /* CAMBIO: espacio inferior suficiente para tabbar */
          padding-bottom: 105px;
        }

        .summary-card {
          padding: 12px;
        }

        .summary-icon {
          width: 37px;
          height: 37px;
          min-width: 37px;
        }

        .summary-icon ion-icon {
          font-size: 19px;
        }

        .summary-content strong {
          font-size: 16px;
        }

        .employee-row {
          gap: 8px;
          padding-left: 10px;
          padding-right: 10px;
        }

        .employee-avatar {
          width: 41px;
          height: 41px;
          min-width: 41px;
          border-radius: 11px;
          font-size: 12px;
        }

        .employee-status {
          display: none;
        }

        .employee-finance {
          min-width: 62px;
        }

        .employee-finance strong {
          font-size: 11px;
        }

        .row-chevron {
          font-size: 17px;
        }

        .section-heading h2 {
          font-size: 15px;
        }

        .section-heading p {
          font-size: 11px;
        }

        .form-card {
          padding: 14px;
        }

        .detail-summary {
          padding: 14px;
        }

        .detail-avatar {
          width: 50px;
          height: 50px;
          min-width: 50px;
        }

        .detail-info h1 {
          font-size: 16px;
        }
      }

      /* ======================================================
     SAFE AREA IOS
     ======================================================= */

      @supports (padding-bottom: env(safe-area-inset-bottom)) {
        .page-wrap {
          padding-bottom: calc(110px + env(safe-area-inset-bottom));
        }

        app-admin-tabbar {
          padding-bottom: env(safe-area-inset-bottom);
        }
      }
    `,
  ],
})
export class AdminEmpleadosPage implements OnInit {
  all: EmployeeView[] = [];

  pending: EmployeeView[] = [];

  active: EmployeeView[] = [];

  filteredPending: EmployeeView[] = [];

  filteredActive: EmployeeView[] = [];

  loading = true;

  saving = false;

  errorMessage = "";

  searchTerm = "";

  showModal = false;

  selected: EmployeeView | null = null;

  form: {
    role: "supervisor" | "ayudante";
    payment_method: "acumulativo" | "fijo";
    fixed_salary: number | null;
  } = {
    role: "ayudante",
    payment_method: "acumulativo",
    fixed_salary: null,
  };

  settleAmount: number | null = null;

  totalPending = 0;

  totalEarned = 0;

  totalPaid = 0;

  constructor(private supabase: SupabaseService) {
    addIcons({
      "people-outline": peopleOutline,

      "person-add-outline": personAddOutline,

      "search-outline": searchOutline,

      "checkmark-circle-outline": checkmarkCircleOutline,

      "time-outline": timeOutline,

      "cash-outline": cashOutline,

      "wallet-outline": walletOutline,

      "close-circle-outline": closeCircleOutline,

      "create-outline": createOutline,

      "trash-outline": trashOutline,

      "card-outline": cardOutline,

      "briefcase-outline": briefcaseOutline,

      "calendar-outline": calendarOutline,

      "mail-outline": mailOutline,

      "call-outline": callOutline,

      "shield-checkmark-outline": shieldCheckmarkOutline,

      "chevron-forward-outline": chevronForwardOutline,

      "refresh-outline": refreshOutline,

      "close-outline": closeOutline,

      "checkmark-outline": checkmarkOutline,

      "alert-circle-outline": alertCircleOutline,

      "business-outline": businessOutline,
    });
  }

  async ngOnInit() {
    await this.load();
  }

  async load() {
    this.loading = true;

    this.errorMessage = "";

    try {
      const profiles = await this.supabase.getAllEmployees();

      const employeeIds = profiles.map((employee) => employee.id);

      const earningsMap = new Map<string, number>();

      const jobsMap = new Map<string, number>();

      const paymentsMap = new Map<string, number>();

      employeeIds.forEach((id) => {
        earningsMap.set(id, 0);

        jobsMap.set(id, 0);

        paymentsMap.set(id, 0);
      });

      if (employeeIds.length > 0) {
        const { data: participants, error: participantsError } =
          await this.supabase.supabase
            .from("job_participants")
            .select("employee_id, amount_earned, job_id")
            .in("employee_id", employeeIds);

        if (participantsError) {
          throw participantsError;
        }

        for (const participant of participants ?? []) {
          const employeeId = participant.employee_id;

          const amount = Number(participant.amount_earned) || 0;

          earningsMap.set(
            employeeId,
            (earningsMap.get(employeeId) || 0) + amount,
          );

          jobsMap.set(employeeId, (jobsMap.get(employeeId) || 0) + 1);
        }

        const { data: settlements, error: settlementsError } =
          await this.supabase.supabase
            .from("settlements")
            .select("employee_id, amount")
            .in("employee_id", employeeIds);

        if (settlementsError) {
          throw settlementsError;
        }

        for (const settlement of settlements ?? []) {
          const employeeId = settlement.employee_id;

          const amount = Number(settlement.amount) || 0;

          paymentsMap.set(
            employeeId,
            (paymentsMap.get(employeeId) || 0) + amount,
          );
        }
      }

      this.all = profiles.map((employee) => {
        const earned = earningsMap.get(employee.id) || 0;

        const paid = paymentsMap.get(employee.id) || 0;

        const pending = Math.max(0, earned - paid);

        const jobs = jobsMap.get(employee.id) || 0;

        return {
          ...employee,

          totalEarned: earned,

          totalPaid: paid,

          totalPending: pending,

          totalJobs: jobs,
        };
      });

      this.pending = this.all.filter((employee) => !employee.is_approved);

      this.active = this.all.filter((employee) => employee.is_approved);

      this.totalEarned = this.all.reduce(
        (total, employee) => total + employee.totalEarned,
        0,
      );

      this.totalPaid = this.all.reduce(
        (total, employee) => total + employee.totalPaid,
        0,
      );

      this.totalPending = this.all.reduce(
        (total, employee) => total + employee.totalPending,
        0,
      );

      this.applyFilters();
    } catch (error: any) {
      console.error("Error cargando empleados:", error);

      this.errorMessage = this.getErrorMessage(error);

      this.all = [];

      this.pending = [];

      this.active = [];

      this.filteredPending = [];

      this.filteredActive = [];
    } finally {
      this.loading = false;
    }
  }

  applyFilters() {
    const search = this.searchTerm.trim().toLowerCase();

    if (!search) {
      this.filteredPending = [...this.pending];

      this.filteredActive = [...this.active];

      return;
    }

    this.filteredPending = this.pending.filter((employee) =>
      this.matchesSearch(employee, search),
    );

    this.filteredActive = this.active.filter((employee) =>
      this.matchesSearch(employee, search),
    );
  }

  private matchesSearch(employee: EmployeeView, search: string): boolean {
    return (
      employee.full_name?.toLowerCase().includes(search) ||
      employee.email?.toLowerCase().includes(search) ||
      employee.role?.toLowerCase().includes(search)
    );
  }

  openDetail(employee: EmployeeView) {
    this.selected = employee;

    this.form = {
      role: employee.role === "supervisor" ? "supervisor" : "ayudante",

      payment_method:
        employee.payment_method === "fijo" ? "fijo" : "acumulativo",

      fixed_salary: employee.fixed_salary,
    };

    this.settleAmount = null;

    this.saving = false;

    this.showModal = true;
  }

  closeModal() {
    if (this.saving) {
      return;
    }

    this.showModal = false;

    this.selected = null;

    this.settleAmount = null;
  }

  async approve() {
    if (!this.selected) {
      return;
    }

    if (
      this.form.payment_method === "fijo" &&
      (this.form.fixed_salary === null || Number(this.form.fixed_salary) <= 0)
    ) {
      this.errorMessage = "Introduce un sueldo fijo válido.";

      return;
    }

    this.saving = true;

    try {
      await this.supabase.approveEmployee(this.selected.id, {
        role: this.form.role,

        payment_method: this.form.payment_method,

        fixed_salary:
          this.form.payment_method === "fijo"
            ? Number(this.form.fixed_salary)
            : null,
      });

      this.showModal = false;

      this.selected = null;

      await this.load();
    } catch (error: any) {
      console.error("Error aprobando empleado:", error);

      this.errorMessage = this.getErrorMessage(error);
    } finally {
      this.saving = false;
    }
  }

  async save() {
    if (!this.selected) {
      return;
    }

    if (
      this.form.payment_method === "fijo" &&
      (this.form.fixed_salary === null || Number(this.form.fixed_salary) <= 0)
    ) {
      this.errorMessage = "Introduce un sueldo fijo válido.";

      return;
    }

    this.saving = true;

    try {
      await this.supabase.updateEmployee(this.selected.id, {
        role: this.form.role,

        payment_method: this.form.payment_method,

        fixed_salary:
          this.form.payment_method === "fijo"
            ? Number(this.form.fixed_salary)
            : null,
      });

      this.showModal = false;

      this.selected = null;

      await this.load();
    } catch (error: any) {
      console.error("Error actualizando empleado:", error);

      this.errorMessage = this.getErrorMessage(error);
    } finally {
      this.saving = false;
    }
  }

  async settle() {
    if (!this.selected) {
      return;
    }

    const amount = Number(this.settleAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      this.errorMessage = "Introduce un monto válido.";

      return;
    }

    if (amount > this.selected.totalPending) {
      this.errorMessage = "El monto no puede superar el saldo pendiente.";

      return;
    }

    this.saving = true;

    try {
      await this.supabase.createSettlement(this.selected.id, amount);

      this.showModal = false;

      this.selected = null;

      this.settleAmount = null;

      await this.load();
    } catch (error: any) {
      console.error("Error registrando pago:", error);

      this.errorMessage = this.getErrorMessage(error);
    } finally {
      this.saving = false;
    }
  }

  async remove() {
    if (!this.selected) {
      return;
    }

    const employee = this.selected;

    const confirmed = window.confirm(
      `¿Seguro que quieres eliminar a ${employee.full_name}? Esta acción no se puede deshacer.`,
    );

    if (!confirmed) {
      return;
    }

    this.saving = true;

    try {
      await this.supabase.deleteEmployee(employee.id);

      this.showModal = false;

      this.selected = null;

      await this.load();
    } catch (error: any) {
      console.error("Error eliminando empleado:", error);

      this.errorMessage = this.getErrorMessage(error);
    } finally {
      this.saving = false;
    }
  }

  getInitials(name: string | null | undefined): string {
    if (!name) {
      return "EM";
    }

    const parts = name.trim().split(/\s+/).filter(Boolean);

    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }

    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  private getErrorMessage(error: any): string {
    if (!error) {
      return "Se produjo un error desconocido.";
    }

    if (typeof error === "string") {
      return error;
    }

    if (error.message) {
      return error.message;
    }

    if (error.details) {
      return error.details;
    }

    return "No se pudo completar la operación.";
  }
}
