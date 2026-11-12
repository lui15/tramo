import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";

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
  IonSegment,
  IonSegmentButton,
  IonTextarea,
  AlertController,
  ToastController,
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
  personOutline,
  shieldCheckmarkOutline,
  chevronForwardOutline,
  refreshOutline,
  closeOutline,
  checkmarkOutline,
  alertCircleOutline,
  businessOutline,
  addOutline,
  keyOutline,
  lockClosedOutline,
  lockOpenOutline,
  pauseCircleOutline,
  playCircleOutline,
  banOutline,
  logOutOutline,
  cameraOutline,
  trendingUpOutline,
  atOutline,
  eyeOutline,
  eyeOffOutline,
} from "ionicons/icons";

import { addIcons } from "ionicons";

import {
  SupabaseService,
  Profile,
  Role,
  SalaryType,
  AccountStatus,
  SalaryHistoryEntry,
  ROLE_LABELS,
  SALARY_TYPE_LABELS,
  SALARY_UNIT,
  STATUS_LABELS,
} from "../../../services/supabase.service";

import { RoleTabbarComponent } from "../../../components/role-tabbar.component";

interface EmployeeView extends Profile {
  totalEarned: number;
  totalPaid: number;
  totalPending: number;
  totalJobs: number;
}

type ListFilter = "activos" | "suspendidos" | "eliminados" | "todos";
type DetailTab = "datos" | "salario" | "pagos" | "acceso";
type StaffRole = Exclude<Role, "admin">;

function todayISO(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

import { PageHeaderComponent } from "../../../components/page-header.component";
import { PayrollPanelComponent } from "../../../components/payroll-panel.component";

@Component({
  selector: "app-admin-empleados",
  standalone: true,
  imports: [
    PageHeaderComponent,
    PayrollPanelComponent,
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
    IonSegment,
    IonSegmentButton,
    IonTextarea,

    RoleTabbarComponent,
  ],
  template: `
    <app-page-header title="Colaboradores" subtitle="Equipo">
      <ion-button class="ph-refresh" fill="clear" (click)="load()" [disabled]="loading" aria-label="Recargar">
        <ion-icon name="refresh-outline"></ion-icon>
      </ion-button>
    </app-page-header>

    <ion-content [fullscreen]="true">
      <div class="page-wrap">
        <!-- ==================================================
             NUEVO COLABORADOR
        =================================================== -->
        <ion-button
          expand="block"
          class="primary-btn new-btn"
          (click)="openCreate()"
        >
          <ion-icon slot="start" name="add-outline"></ion-icon>
          NUEVO COLABORADOR
        </ion-button>

        <!-- ==================================================
             RESUMEN
        =================================================== -->
        <section class="summary-grid">
          <div class="summary-card">
            <div class="summary-icon blue">
              <ion-icon name="people-outline"></ion-icon>
            </div>
            <div class="summary-content">
              <span class="summary-label"> ACTIVOS </span>
              <strong>{{ countBy("activos") }}</strong>
            </div>
          </div>

          <div class="summary-card">
            <div class="summary-icon orange">
              <ion-icon name="pause-circle-outline"></ion-icon>
            </div>
            <div class="summary-content">
              <span class="summary-label"> SUSPENDIDOS </span>
              <strong>{{ countBy("suspendidos") }}</strong>
            </div>
          </div>

          <div class="summary-card">
            <div class="summary-icon green">
              <ion-icon name="briefcase-outline"></ion-icon>
            </div>
            <div class="summary-content">
              <span class="summary-label"> ENCARGADOS </span>
              <strong>{{ countRole("encargado") }}</strong>
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
             BUSCADOR Y FILTROS
        =================================================== -->
        <section class="search-section">
          <ion-item class="form-item search-item" lines="none">
            <ion-icon slot="start" name="search-outline"></ion-icon>
            <ion-label position="stacked"> Buscar colaborador </ion-label>
            <ion-input
              [(ngModel)]="searchTerm"
              (ionInput)="applyFilters()"
              placeholder="Nombre, usuario o cargo..."
              type="text"
              clearInput="true"
            ></ion-input>
          </ion-item>

          <div class="chip-row">
            <button
              type="button"
              class="chip"
              *ngFor="let f of filters"
              [class.chip-active]="listFilter === f.value"
              (click)="setFilter(f.value)"
            >
              {{ f.label }}
              <span>{{ countBy(f.value) }}</span>
            </button>
          </div>
        </section>

        <!-- ERROR -->
        <div class="error-box" *ngIf="errorMessage && !showModal && !showCreate">
          <ion-icon name="alert-circle-outline"></ion-icon>
          <div>
            <strong> Ha ocurrido un error </strong>
            <span>{{ errorMessage }}</span>
          </div>
          <ion-button fill="clear" size="small" (click)="errorMessage = ''">
            <ion-icon name="close-outline"></ion-icon>
          </ion-button>
        </div>

        <!-- LOADING -->
        <div class="loading-state" *ngIf="loading">
          <ion-spinner name="crescent"></ion-spinner>
          <span> Cargando colaboradores... </span>
        </div>

        <!-- ==================================================
             LISTADO
        =================================================== -->
        <ng-container *ngIf="!loading">
          <section class="employees-section" *ngIf="filtered.length > 0">
            <div class="ledger">
              <button
                type="button"
                class="employee-row"
                *ngFor="let employee of filtered"
                (click)="openDetail(employee)"
              >
                <div
                  class="employee-avatar active-avatar"
                  [class.pending-avatar]="employee.account_status !== 'activo'"
                >
                  <img
                    *ngIf="avatarUrl(employee)"
                    [src]="avatarUrl(employee)"
                    alt=""
                  />
                  <ng-container *ngIf="!avatarUrl(employee)">
                    {{ getInitials(employee.full_name) }}
                  </ng-container>
                </div>

                <div class="employee-main">
                  <div class="employee-name">
                    {{ employee.full_name || "Sin nombre" }}
                  </div>

                  <div class="employee-email">
                    <ion-icon name="at-outline"></ion-icon>
                    {{ employee.username || "sin usuario" }}
                  </div>

                  <div class="employee-meta">
                    <span class="role-pill" [attr.data-role]="employee.role">
                      {{ roleLabels[employee.role] || employee.role }}
                    </span>
                    <span>
                      <ion-icon name="cash-outline"></ion-icon>
                      {{ salaryText(employee) }}
                    </span>
                    <span
                      class="status-pill"
                      *ngIf="statusOf(employee) !== 'activo'"
                      [attr.data-status]="statusOf(employee)"
                    >
                      {{ statusText(employee) }}
                    </span>
                    <span class="status-pill" data-status="bloqueado" *ngIf="isLocked(employee)">
                      Bloqueado
                    </span>
                  </div>
                </div>

                <div class="employee-finance">
                  <strong>{{ employee.totalPending | number: "1.2-2" }} €</strong>
                  <span> Pendiente </span>
                </div>

                <ion-icon class="row-chevron" name="chevron-forward-outline"></ion-icon>
              </button>
            </div>
          </section>

          <section class="empty-state" *ngIf="filtered.length === 0">
            <div class="empty-icon">
              <ion-icon name="people-outline"></ion-icon>
            </div>
            <h2>
              {{ searchTerm.trim() ? "No se encontraron colaboradores" : "No hay colaboradores aquí" }}
            </h2>
            <p>
              {{
                searchTerm.trim()
                  ? "Prueba con otro nombre, usuario o cargo."
                  : "Pulsa «Nuevo colaborador» para dar de alta a tu equipo."
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

    <app-role-tabbar></app-role-tabbar>

    <!-- ======================================================
         MODAL: NUEVO COLABORADOR
    ======================================================= -->
    <ion-modal [isOpen]="showCreate" (didDismiss)="closeCreate()" [backdropDismiss]="!saving">
      <ng-template>
        <ion-header class="modal-header">
          <ion-toolbar>
            <ion-title>Nuevo colaborador</ion-title>
            <ion-buttons slot="end">
              <ion-button fill="clear" (click)="closeCreate()" [disabled]="saving">
                <ion-icon name="close-outline"></ion-icon>
              </ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>

        <ion-content class="modal-content">
          <div class="form-wrap">
            <div class="error-box" *ngIf="errorMessage">
              <ion-icon name="alert-circle-outline"></ion-icon>
              <div><span>{{ errorMessage }}</span></div>
            </div>

            <!-- FOTO -->
            <section class="photo-picker">
              <label class="photo-circle">
                <img *ngIf="createPhotoPreview" [src]="createPhotoPreview" alt="" />
                <ion-icon *ngIf="!createPhotoPreview" name="camera-outline"></ion-icon>
                <input type="file" accept="image/jpeg,image/png,image/webp" (change)="pickCreatePhoto($event)" hidden />
              </label>
              <span>Fotografía de perfil (opcional)</span>
            </section>

            <section class="form-card">
              <div class="block-title">
                <div class="block-icon"><ion-icon name="person-outline"></ion-icon></div>
                <div>
                  <h2>Datos y acceso</h2>
                  <p>Con este usuario y contraseña entrará en la app</p>
                </div>
              </div>

              <ion-item class="form-item" lines="none">
                <ion-icon slot="start" name="person-outline"></ion-icon>
                <ion-label position="stacked"> Nombre y apellidos </ion-label>
                <ion-input [(ngModel)]="createForm.full_name" (ionInput)="suggestUsername()" placeholder="Rafael Pérez"></ion-input>
              </ion-item>

              <ion-item class="form-item" lines="none">
                <ion-icon slot="start" name="at-outline"></ion-icon>
                <ion-label position="stacked"> Nombre de usuario </ion-label>
                <ion-input
                  [(ngModel)]="createForm.username"
                  (ionInput)="usernameTouched = true"
                  placeholder="rafael01"
                  autocapitalize="off"
                  [spellcheck]="false"
                ></ion-input>
              </ion-item>
              <p class="field-hint">3-30 caracteres: minúsculas, números, punto, guion o guion bajo.</p>

              <ion-item class="form-item" lines="none">
                <ion-icon slot="start" name="lock-closed-outline"></ion-icon>
                <ion-label position="stacked"> Contraseña inicial </ion-label>
                <ion-input
                  [(ngModel)]="createForm.password"
                  [type]="showPassword ? 'text' : 'password'"
                  placeholder="Mínimo 8 caracteres"
                  autocomplete="new-password"
                ></ion-input>
                <ion-button slot="end" fill="clear" (click)="showPassword = !showPassword">
                  <ion-icon [name]="showPassword ? 'eye-off-outline' : 'eye-outline'"></ion-icon>
                </ion-button>
              </ion-item>
              <div class="inline-actions">
                <ion-button size="small" fill="clear" (click)="generatePassword('create')">
                  <ion-icon slot="start" name="key-outline"></ion-icon>
                  Generar contraseña
                </ion-button>
              </div>
              <p class="field-hint">Se le pedirá que la cambie la primera vez que entre.</p>

              <ion-item class="form-item" lines="none">
                <ion-icon slot="start" name="briefcase-outline"></ion-icon>
                <ion-label position="stacked"> Cargo </ion-label>
                <ion-select [(ngModel)]="createForm.role" (ngModelChange)="onCreateRole($event)" interface="popover">
                  <ion-select-option *ngFor="let r of staffRoles" [value]="r">{{ roleLabels[r] }}</ion-select-option>
                </ion-select>
              </ion-item>

              <ion-item class="form-item" lines="none">
                <ion-icon slot="start" name="calendar-outline"></ion-icon>
                <ion-label position="stacked"> Fecha de incorporación </ion-label>
                <ion-input type="date" [(ngModel)]="createForm.hire_date"></ion-input>
              </ion-item>

              <ion-item class="form-item" lines="none">
                <ion-icon slot="start" name="shield-checkmark-outline"></ion-icon>
                <ion-label position="stacked"> Estado de la cuenta </ion-label>
                <ion-select [(ngModel)]="createForm.account_status" interface="popover">
                  <ion-select-option value="activo">Activa</ion-select-option>
                  <ion-select-option value="suspendido">Suspendida</ion-select-option>
                </ion-select>
              </ion-item>
            </section>

            <section class="form-card">
              <div class="block-title">
                <div class="block-icon"><ion-icon name="cash-outline"></ion-icon></div>
                <div>
                  <h2>Salario</h2>
                  <p>Modalidad e importe que se aplicará desde su incorporación</p>
                </div>
              </div>

              <ion-item class="form-item" lines="none">
                <ion-icon slot="start" name="card-outline"></ion-icon>
                <ion-label position="stacked"> Modalidad salarial </ion-label>
                <ion-select [(ngModel)]="createForm.salary_type" interface="popover">
                  <ion-select-option *ngFor="let t of typesFor(createForm.role)" [value]="t">{{ salaryTypeLabels[t] }}</ion-select-option>
                </ion-select>
              </ion-item>

              <ion-item class="form-item" lines="none">
                <ion-icon slot="start" name="cash-outline"></ion-icon>
                <ion-label position="stacked"> Importe </ion-label>
                <ion-input type="number" inputmode="decimal" min="0" step="0.01" [(ngModel)]="createForm.salary_rate" placeholder="0.00"></ion-input>
                <span class="currency-symbol" slot="end">{{ salaryUnit[createForm.salary_type] }}</span>
              </ion-item>
            </section>

            <section class="modal-actions">
              <ion-button expand="block" class="primary-btn" (click)="create()" [disabled]="saving">
                <ion-spinner *ngIf="saving" name="crescent"></ion-spinner>
                <ion-icon *ngIf="!saving" slot="start" name="person-add-outline"></ion-icon>
                {{ saving ? "Creando..." : "Crear colaborador" }}
              </ion-button>
              <ion-button expand="block" fill="outline" class="cancel-btn" (click)="closeCreate()" [disabled]="saving">
                Cancelar
              </ion-button>
            </section>
          </div>
        </ion-content>
      </ng-template>
    </ion-modal>

    <!-- ======================================================
         MODAL: FICHA DEL COLABORADOR
    ======================================================= -->
    <ion-modal [isOpen]="showModal" (didDismiss)="closeModal()" [backdropDismiss]="!saving">
      <ng-template>
        <ion-header class="modal-header">
          <ion-toolbar>
            <ion-title>Colaborador</ion-title>
            <ion-buttons slot="end">
              <ion-button fill="clear" (click)="closeModal()" [disabled]="saving">
                <ion-icon name="close-outline"></ion-icon>
              </ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>

        <ion-content class="modal-content">
          <div class="form-wrap" *ngIf="selected">
            <!-- CABECERA -->
            <section class="detail-summary">
              <div class="detail-avatar" [class.pending]="statusOf(selected) !== 'activo'">
                <img *ngIf="avatarUrl(selected)" [src]="avatarUrl(selected)" alt="" />
                <ng-container *ngIf="!avatarUrl(selected)">{{ getInitials(selected.full_name) }}</ng-container>
              </div>

              <div class="detail-info">
                <h1>{{ selected.full_name || "Sin nombre" }}</h1>
                <div class="detail-email">
                  <ion-icon name="at-outline"></ion-icon>
                  {{ selected.username || "sin usuario" }}
                  · {{ roleLabels[selected.role] }}
                </div>
                <ion-badge
                  class="detail-status"
                  [class.status-approved]="statusOf(selected) === 'activo'"
                  [class.status-pending]="statusOf(selected) !== 'activo'"
                >
                  {{ statusText(selected) }}
                </ion-badge>
              </div>
            </section>

            <div class="error-box" *ngIf="errorMessage">
              <ion-icon name="alert-circle-outline"></ion-icon>
              <div><span>{{ errorMessage }}</span></div>
              <ion-button fill="clear" size="small" (click)="errorMessage = ''">
                <ion-icon name="close-outline"></ion-icon>
              </ion-button>
            </div>

            <ion-segment class="detail-tabs" [value]="tab" (ionChange)="tab = $any($event.detail.value)">
              <ion-segment-button value="datos"><ion-label>Datos</ion-label></ion-segment-button>
              <ion-segment-button value="salario"><ion-label>Salario</ion-label></ion-segment-button>
              <ion-segment-button value="pagos"><ion-label>Pagos</ion-label></ion-segment-button>
              <ion-segment-button value="acceso"><ion-label>Acceso</ion-label></ion-segment-button>
            </ion-segment>

            <!-- ==================== DATOS ==================== -->
            <ng-container *ngIf="tab === 'datos'">
              <section class="form-card">
                <div class="block-title">
                  <div class="block-icon"><ion-icon name="business-outline"></ion-icon></div>
                  <div>
                    <h2>Información del colaborador</h2>
                    <p>Nombre, usuario, cargo y fecha de incorporación</p>
                  </div>
                </div>

                <section class="photo-picker compact">
                  <label class="photo-circle">
                    <img *ngIf="editPhotoPreview || avatarUrl(selected)" [src]="editPhotoPreview || avatarUrl(selected)" alt="" />
                    <ion-icon *ngIf="!(editPhotoPreview || avatarUrl(selected))" name="camera-outline"></ion-icon>
                    <input type="file" accept="image/jpeg,image/png,image/webp" (change)="pickEditPhoto($event)" hidden />
                  </label>
                  <span>Cambiar fotografía</span>
                </section>

                <ion-item class="form-item" lines="none">
                  <ion-icon slot="start" name="person-outline"></ion-icon>
                  <ion-label position="stacked"> Nombre y apellidos </ion-label>
                  <ion-input [(ngModel)]="editForm.full_name" [disabled]="saving || isDeleted(selected)"></ion-input>
                </ion-item>

                <ion-item class="form-item" lines="none">
                  <ion-icon slot="start" name="at-outline"></ion-icon>
                  <ion-label position="stacked"> Nombre de usuario </ion-label>
                  <ion-input [(ngModel)]="editForm.username" autocapitalize="off" [spellcheck]="false" [disabled]="saving || isDeleted(selected)"></ion-input>
                </ion-item>

                <ion-item class="form-item" lines="none">
                  <ion-icon slot="start" name="briefcase-outline"></ion-icon>
                  <ion-label position="stacked"> Cargo </ion-label>
                  <ion-select [(ngModel)]="editForm.role" interface="popover" [disabled]="saving || isDeleted(selected)">
                    <ion-select-option *ngFor="let r of staffRoles" [value]="r">{{ roleLabels[r] }}</ion-select-option>
                  </ion-select>
                </ion-item>

                <ion-item class="form-item" lines="none">
                  <ion-icon slot="start" name="calendar-outline"></ion-icon>
                  <ion-label position="stacked"> Fecha de incorporación </ion-label>
                  <ion-input type="date" [(ngModel)]="editForm.hire_date" [disabled]="saving || isDeleted(selected)"></ion-input>
                </ion-item>

                <ion-button expand="block" class="primary-btn" (click)="saveData()" [disabled]="saving || isDeleted(selected)">
                  <ion-spinner *ngIf="saving" name="crescent"></ion-spinner>
                  <ion-icon *ngIf="!saving" slot="start" name="checkmark-outline"></ion-icon>
                  {{ saving ? "Guardando..." : "Guardar cambios" }}
                </ion-button>
              </section>
            </ng-container>

            <!-- ==================== SALARIO ==================== -->
            <ng-container *ngIf="tab === 'salario'">
              <section class="form-card">
                <div class="block-title">
                  <div class="block-icon"><ion-icon name="cash-outline"></ion-icon></div>
                  <div>
                    <h2>Salario vigente</h2>
                    <p>{{ salaryText(selected) }}</p>
                  </div>
                </div>

                <div class="info-note">
                  <ion-icon name="alert-circle-outline"></ion-icon>
                  <span>
                    Los cambios se aplican desde la fecha indicada. Los trabajos y
                    remuneraciones anteriores conservan la tarifa con la que se hicieron.
                  </span>
                </div>

                <ion-item class="form-item" lines="none">
                  <ion-icon slot="start" name="card-outline"></ion-icon>
                  <ion-label position="stacked"> Nueva modalidad </ion-label>
                  <ion-select [(ngModel)]="salaryForm.salary_type" interface="popover" [disabled]="saving || isDeleted(selected)">
                    <ion-select-option *ngFor="let t of typesFor(selected?.role)" [value]="t">{{ salaryTypeLabels[t] }}</ion-select-option>
                  </ion-select>
                </ion-item>

                <ion-item class="form-item" lines="none">
                  <ion-icon slot="start" name="cash-outline"></ion-icon>
                  <ion-label position="stacked"> Nuevo importe </ion-label>
                  <ion-input type="number" inputmode="decimal" min="0" step="0.01" [(ngModel)]="salaryForm.salary_rate" [disabled]="saving || isDeleted(selected)"></ion-input>
                  <span class="currency-symbol" slot="end">{{ salaryUnit[salaryForm.salary_type] }}</span>
                </ion-item>

                <ion-item class="form-item" lines="none">
                  <ion-icon slot="start" name="calendar-outline"></ion-icon>
                  <ion-label position="stacked"> Se aplica desde </ion-label>
                  <ion-input type="date" [(ngModel)]="salaryForm.effective_from" [disabled]="saving || isDeleted(selected)"></ion-input>
                </ion-item>

                <ion-item class="form-item" lines="none">
                  <ion-icon slot="start" name="create-outline"></ion-icon>
                  <ion-label position="stacked"> Motivo (opcional) </ion-label>
                  <ion-textarea [(ngModel)]="salaryForm.note" autoGrow="true" rows="2" [disabled]="saving || isDeleted(selected)"></ion-textarea>
                </ion-item>

                <ion-button expand="block" class="primary-btn" (click)="saveSalary()" [disabled]="saving || isDeleted(selected)">
                  <ion-spinner *ngIf="saving" name="crescent"></ion-spinner>
                  <ion-icon *ngIf="!saving" slot="start" name="trending-up-outline"></ion-icon>
                  {{ saving ? "Guardando..." : "Registrar cambio de salario" }}
                </ion-button>
              </section>

              <section class="form-card">
                <div class="block-title">
                  <div class="block-icon"><ion-icon name="time-outline"></ion-icon></div>
                  <div>
                    <h2>Historial salarial</h2>
                    <p>Todas las tarifas que ha tenido</p>
                  </div>
                </div>

                <div class="loading-state small" *ngIf="historyLoading">
                  <ion-spinner name="crescent"></ion-spinner>
                </div>

                <div class="history-list" *ngIf="!historyLoading">
                  <div class="history-row" *ngFor="let h of salaryHistory; let first = first">
                    <div class="history-dot" [class.current]="h.id === currentHistoryId"></div>
                    <div class="history-main">
                      <strong>
                        {{ h.salary_rate | number: "1.2-2" }} {{ salaryUnit[h.salary_type] }}
                        <small>· {{ salaryTypeLabels[h.salary_type] }}</small>
                      </strong>
                      <span>
                        Desde {{ h.effective_from | date: "dd/MM/yyyy" }}
                        <ng-container *ngIf="h.effective_from > today"> · programado</ng-container>
                        <ng-container *ngIf="h.id === currentHistoryId"> · vigente</ng-container>
                      </span>
                      <em *ngIf="h.note">{{ h.note }}</em>
                    </div>
                  </div>
                  <p class="field-hint" *ngIf="salaryHistory.length === 0">
                    Aún no hay cambios registrados en el historial.
                  </p>
                </div>
              </section>
            </ng-container>

            <!-- ==================== PAGOS ==================== -->
            <ng-container *ngIf="tab === 'pagos'">
              <app-payroll-panel
                [employeeId]="selected.id"
                [employeeName]="selected.full_name"
                (changed)="load()"
              ></app-payroll-panel>
            </ng-container>

            <!-- ==================== ACCESO ==================== -->
            <ng-container *ngIf="tab === 'acceso'">
              <section class="form-card">
                <div class="block-title">
                  <div class="block-icon"><ion-icon name="shield-checkmark-outline"></ion-icon></div>
                  <div>
                    <h2>Estado de la cuenta</h2>
                    <p>
                      {{ statusText(selected) }}
                      <ng-container *ngIf="selected.last_login_at">
                        · último acceso {{ selected.last_login_at | date: "dd/MM/yyyy HH:mm" }}
                      </ng-container>
                    </p>
                  </div>
                </div>

                <div class="info-note warn" *ngIf="isLocked(selected)">
                  <ion-icon name="lock-closed-outline"></ion-icon>
                  <span>
                    Bloqueada por intentos fallidos hasta las
                    {{ selected.locked_until | date: "HH:mm" }}.
                  </span>
                </div>

                <div class="action-grid" *ngIf="!isDeleted(selected)">
                  <button type="button" class="action-tile" *ngIf="statusOf(selected) !== 'activo'" (click)="changeStatus('activo')" [disabled]="saving">
                    <ion-icon name="play-circle-outline"></ion-icon>
                    <span>Reactivar</span>
                  </button>
                  <button type="button" class="action-tile warn" *ngIf="statusOf(selected) === 'activo'" (click)="changeStatus('suspendido')" [disabled]="saving">
                    <ion-icon name="pause-circle-outline"></ion-icon>
                    <span>Suspender</span>
                  </button>
                  <button type="button" class="action-tile warn" *ngIf="statusOf(selected) !== 'desactivado'" (click)="changeStatus('desactivado')" [disabled]="saving">
                    <ion-icon name="ban-outline"></ion-icon>
                    <span>Desactivar</span>
                  </button>
                  <button type="button" class="action-tile" *ngIf="isLocked(selected)" (click)="unlock()" [disabled]="saving">
                    <ion-icon name="lock-open-outline"></ion-icon>
                    <span>Desbloquear</span>
                  </button>
                  <button type="button" class="action-tile" (click)="revokeSessions()" [disabled]="saving">
                    <ion-icon name="log-out-outline"></ion-icon>
                    <span>Cerrar sesiones</span>
                  </button>
                </div>
              </section>

              <section class="form-card" *ngIf="!isDeleted(selected)">
                <div class="block-title">
                  <div class="block-icon"><ion-icon name="key-outline"></ion-icon></div>
                  <div>
                    <h2>Restablecer contraseña</h2>
                    <p>Se cerrarán sus sesiones y deberá cambiarla al entrar</p>
                  </div>
                </div>

                <ion-item class="form-item" lines="none">
                  <ion-icon slot="start" name="lock-closed-outline"></ion-icon>
                  <ion-label position="stacked"> Nueva contraseña </ion-label>
                  <ion-input [(ngModel)]="resetPassword" [type]="showPassword ? 'text' : 'password'" autocomplete="new-password" placeholder="Mínimo 8 caracteres"></ion-input>
                  <ion-button slot="end" fill="clear" (click)="showPassword = !showPassword">
                    <ion-icon [name]="showPassword ? 'eye-off-outline' : 'eye-outline'"></ion-icon>
                  </ion-button>
                </ion-item>
                <div class="inline-actions">
                  <ion-button size="small" fill="clear" (click)="generatePassword('reset')">
                    <ion-icon slot="start" name="key-outline"></ion-icon>
                    Generar contraseña
                  </ion-button>
                </div>

                <ion-button expand="block" class="primary-btn" (click)="doResetPassword()" [disabled]="saving">
                  <ion-spinner *ngIf="saving" name="crescent"></ion-spinner>
                  <ion-icon *ngIf="!saving" slot="start" name="key-outline"></ion-icon>
                  {{ saving ? "Guardando..." : "Restablecer contraseña" }}
                </ion-button>
              </section>

              <section class="delete-section" *ngIf="!isDeleted(selected)">
                <div class="delete-title">
                  <ion-icon name="trash-outline"></ion-icon>
                  <span> Eliminar colaborador </span>
                </div>
                <p>
                  Se desactivará su cuenta y dejará de aparecer en el equipo. Su historial
                  laboral, pagos, adelantos y registros económicos se conservan.
                </p>
                <ion-button expand="block" fill="outline" class="delete-btn" (click)="remove()" [disabled]="saving">
                  <ion-icon slot="start" name="trash-outline"></ion-icon>
                  Eliminar colaborador
                </ion-button>
              </section>

              <div class="info-note" *ngIf="isDeleted(selected)">
                <ion-icon name="alert-circle-outline"></ion-icon>
                <span>
                  Colaborador eliminado el {{ selected.deleted_at | date: "dd/MM/yyyy" }}.
                  Su historial se conserva.
                </span>
              </div>
            </ng-container>
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
        --page-bg: var(--t-surface-2);
        --primary: var(--t-primary);
        --primary-dark: var(--t-primary);
        --text: var(--t-text);
        --muted: var(--t-muted);
        --border: var(--t-border);
        --soft-blue: var(--t-primary-soft);
        --green: #16a34a;
        --orange: #f59e0b;
        --red: #dc2626;
        background: var(--page-bg);
      }

      ion-content {
        --background: var(--t-surface-2);
        background: var(--t-surface-2);

        /* CAMBIO: el contenido queda por debajo del tabbar */
        position: relative;
        z-index: 1;
      }

      ion-content::part(scroll) {
        background: var(--t-surface-2);
      }

      /* ======================================================
     HEADER
    ======================================================= */

      .main-header {
        box-shadow: 0 1px 8px rgba(20, 40, 80, 0.06);
        z-index: 10;
      }

      .main-header ion-toolbar {
        --background: var(--t-surface);
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
        background: var(--t-surface-2);
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
        background: var(--t-surface);
        border: 1px solid var(--t-border);
        box-shadow: var(--t-shadow);
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
        background: var(--t-primary-soft);
        color: var(--t-primary);
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
        color: var(--t-muted);
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
        --background: var(--t-surface);
        --border-color: var(--t-border);
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
        border: 1px solid var(--t-border);
        border-radius: 14px;
        background: var(--t-surface);
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
        border: 1px solid var(--t-border);
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
        background: var(--t-surface);
        border: 1px solid var(--t-border);
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
        background: var(--t-surface);
        text-align: left;
        font: inherit;
        color: inherit;
        cursor: pointer;
        transition: background 0.16s ease,
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
        background: var(--t-primary-soft);
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
        color: var(--t-muted);
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
        background: var(--t-surface);
        border: 1px solid var(--t-border);
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
        background: var(--t-surface-2);
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
        --background: var(--t-surface);
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
        --background: var(--t-surface-2);
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
        border: 1px solid var(--t-border);
        border-radius: 20px;
        background: var(--t-surface);
        box-shadow: var(--t-shadow);
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
        display: none;
      }

      .detail-avatar {
        width: 58px;
        height: 58px;
        min-width: 58px;
        border-radius: 17px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--t-primary-soft);
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
        border: 1px solid var(--t-border);
        border-radius: 20px;
        background: var(--t-surface);
        box-shadow: var(--t-shadow);
        overflow: hidden;
      }

      .form-card::before {
        content: "";
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        height: 3px;
        display: none;
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
        background: var(--t-primary);
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
        border: 1px solid var(--t-border);
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
        --background: var(--t-primary) !important;
        --background-activated: var(--t-primary) !important;
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
        --background: var(--t-surface);
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
        border: 1px solid var(--t-border);
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
        --background: var(--t-surface);
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
    `
      /* ======================================================
         COLABORADORES (Fase 2)
      ======================================================= */
      .ph-refresh {
        --background: var(--t-surface);
        --color: var(--t-text);
        --border-radius: 12px;
        --padding-start: 9px;
        --padding-end: 9px;
        height: 40px;
        margin: 0;
        border-radius: 12px;
        box-shadow: var(--t-shadow);
      }
      .new-btn {
        margin: 0 0 16px;
        height: 52px;
        font-weight: 800;
        letter-spacing: 0.3px;
      }
      .chip-row {
        display: flex;
        gap: 8px;
        overflow-x: auto;
        padding: 12px 0 2px;
        scrollbar-width: none;
      }
      .chip {
        border: 1px solid var(--border);
        background: var(--t-surface);
        color: var(--text);
        border-radius: 999px;
        padding: 8px 14px;
        font-size: 13px;
        font-weight: 700;
        white-space: nowrap;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .chip span {
        background: var(--soft-blue);
        color: var(--primary);
        border-radius: 999px;
        padding: 1px 8px;
        font-size: 12px;
      }
      .chip-active {
        background: var(--primary);
        border-color: var(--primary);
        color: #fff;
      }
      .chip-active span {
        background: rgba(255, 255, 255, 0.22);
        color: #fff;
      }
      .employee-avatar img,
      .detail-avatar img,
      .photo-circle img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: inherit;
      }
      .employee-avatar,
      .detail-avatar {
        overflow: hidden;
      }
      .role-pill,
      .status-pill {
        border-radius: 999px;
        padding: 2px 9px !important;
        font-weight: 700;
        font-size: 11px;
      }
      .role-pill {
        background: var(--t-primary-soft);
        color: var(--t-primary);
      }
      .role-pill[data-role="encargado"] {
        background: #e3f6ee;
        color: #0f9f6e;
      }
      .role-pill[data-role="ayudante"] {
        background: #fff1e3;
        color: #e8590c;
      }
      .role-pill[data-role="secretaria"] {
        background: #f3e8ff;
        color: #7c3aed;
      }
      .status-pill {
        background: #fee2e2;
        color: #dc2626;
      }
      .status-pill[data-status="suspendido"] {
        background: #fff4d6;
        color: #b7791f;
      }
      .photo-picker {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        margin: 4px 0 16px;
        color: var(--muted);
        font-size: 13px;
        font-weight: 600;
      }
      .photo-picker.compact {
        flex-direction: row;
        justify-content: flex-start;
        gap: 12px;
      }
      .photo-circle {
        width: 84px;
        height: 84px;
        border-radius: 26px;
        background: var(--soft-blue);
        color: var(--primary);
        display: grid;
        place-items: center;
        font-size: 30px;
        cursor: pointer;
        border: 2px dashed rgba(23, 105, 255, 0.3);
        overflow: hidden;
      }
      .photo-picker.compact .photo-circle {
        width: 60px;
        height: 60px;
        border-radius: 18px;
        font-size: 22px;
      }
      .field-hint {
        margin: 4px 4px 12px;
        font-size: 12px;
        color: var(--muted);
        line-height: 1.4;
      }
      .inline-actions {
        display: flex;
        justify-content: flex-end;
        margin-top: -4px;
      }
      .detail-tabs {
        margin: 4px 0 16px;
        --background: var(--t-surface-2);
        border-radius: 14px;
        padding: 3px;
      }
      .detail-tabs ion-segment-button {
        --indicator-color: #fff;
        --color-checked: var(--primary);
        --border-radius: 11px;
        font-weight: 700;
        min-height: 38px;
        text-transform: none;
        letter-spacing: 0;
      }
      .info-note {
        display: flex;
        gap: 10px;
        align-items: flex-start;
        padding: 12px;
        margin-bottom: 14px;
        border-radius: 14px;
        background: var(--soft-blue);
        color: #1e3a8a;
        font-size: 13px;
        line-height: 1.45;
      }
      .info-note ion-icon {
        font-size: 18px;
        flex-shrink: 0;
        margin-top: 1px;
      }
      .info-note.warn {
        background: #fff4d6;
        color: #8a5a00;
      }
      .history-list {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .history-row {
        display: flex;
        gap: 12px;
        padding: 10px 4px;
        border-bottom: 1px solid var(--border);
      }
      .history-row:last-child {
        border-bottom: 0;
      }
      .history-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: var(--t-border);
        margin-top: 6px;
        flex-shrink: 0;
      }
      .history-dot.current {
        background: var(--green);
        box-shadow: 0 0 0 4px rgba(22, 163, 74, 0.15);
      }
      .history-main strong {
        display: block;
        font-size: 15px;
        color: var(--text);
      }
      .history-main small {
        font-weight: 600;
        color: var(--muted);
      }
      .history-main span {
        display: block;
        font-size: 12px;
        color: var(--muted);
        margin-top: 2px;
      }
      .history-main em {
        display: block;
        font-size: 12px;
        color: var(--text);
        margin-top: 4px;
      }
      .action-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
        gap: 10px;
      }
      .action-tile {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        padding: 14px 10px;
        border-radius: 16px;
        border: 1px solid var(--border);
        background: var(--t-surface);
        color: var(--primary);
        font-weight: 700;
        font-size: 13px;
      }
      .action-tile ion-icon {
        font-size: 24px;
      }
      .action-tile.warn {
        color: #c2410c;
        background: #fff7ed;
        border-color: #fed7aa;
      }
      .action-tile:disabled {
        opacity: 0.5;
      }
      .loading-state.small {
        padding: 12px;
      }
    `,
  ],
})
export class AdminEmpleadosPage implements OnInit {
  all: EmployeeView[] = [];

  filtered: EmployeeView[] = [];

  avatars: Record<string, string> = {};

  loading = true;

  saving = false;

  errorMessage = "";

  searchTerm = "";

  listFilter: ListFilter = "activos";

  readonly filters: { value: ListFilter; label: string }[] = [
    { value: "activos", label: "Activos" },
    { value: "suspendidos", label: "Suspendidos" },
    { value: "eliminados", label: "Eliminados" },
    { value: "todos", label: "Todos" },
  ];

  /** La secretaría usa esta misma pantalla pero solo gestiona encargados y ayudantes. */
  readonly isSecretary: boolean;

  readonly staffRoles: StaffRole[];

  readonly salaryTypes: SalaryType[] = ["hora", "dia", "mes"];

  /** La secretaría siempre cobra sueldo fijo mensual. */
  typesFor(role: string | null | undefined): SalaryType[] {
    return role === "secretaria" ? ["mes"] : this.salaryTypes;
  }

  onCreateRole(role: string) {
    if (role === "secretaria") this.createForm.salary_type = "mes";
  }

  readonly roleLabels = ROLE_LABELS;

  readonly salaryTypeLabels = SALARY_TYPE_LABELS;

  readonly salaryUnit = SALARY_UNIT;

  readonly today = todayISO();

  totalPending = 0;

  // ---------- Crear ----------
  showCreate = false;

  usernameTouched = false;

  showPassword = false;

  createPhoto: File | null = null;

  createPhotoPreview: string | null = null;

  createForm = this.emptyCreateForm();

  // ---------- Ficha ----------
  showModal = false;

  selected: EmployeeView | null = null;

  tab: DetailTab = "datos";

  editForm: {
    full_name: string;
    username: string;
    role: StaffRole;
    hire_date: string;
  } = { full_name: "", username: "", role: "ayudante", hire_date: "" };

  editPhoto: File | null = null;

  editPhotoPreview: string | null = null;

  salaryForm: {
    salary_type: SalaryType;
    salary_rate: number | null;
    effective_from: string;
    note: string;
  } = { salary_type: "hora", salary_rate: null, effective_from: todayISO(), note: "" };

  salaryHistory: SalaryHistoryEntry[] = [];

  historyLoading = false;

  currentHistoryId: string | null = null;

  resetPassword = "";

  settleAmount: number | null = null;

  constructor(
    private readonly supabase: SupabaseService,
    private readonly alertCtrl: AlertController,
    private readonly toastCtrl: ToastController,
    router: Router,
  ) {
    this.isSecretary = router.url.startsWith("/secretaria");
    this.staffRoles = this.isSecretary
      ? ["encargado", "ayudante"]
      : ["secretaria", "encargado", "ayudante"];

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
      "person-outline": personOutline,
      "shield-checkmark-outline": shieldCheckmarkOutline,
      "chevron-forward-outline": chevronForwardOutline,
      "refresh-outline": refreshOutline,
      "close-outline": closeOutline,
      "checkmark-outline": checkmarkOutline,
      "alert-circle-outline": alertCircleOutline,
      "business-outline": businessOutline,
      "add-outline": addOutline,
      "key-outline": keyOutline,
      "lock-closed-outline": lockClosedOutline,
      "lock-open-outline": lockOpenOutline,
      "pause-circle-outline": pauseCircleOutline,
      "play-circle-outline": playCircleOutline,
      "ban-outline": banOutline,
      "log-out-outline": logOutOutline,
      "camera-outline": cameraOutline,
      "trending-up-outline": trendingUpOutline,
      "at-outline": atOutline,
      "eye-outline": eyeOutline,
      "eye-off-outline": eyeOffOutline,
    });
  }

  async ngOnInit() {
    await this.load();
  }

  // =========================================================
  // CARGA
  // =========================================================

  async load() {
    this.loading = true;
    this.errorMessage = "";

    try {
      const profiles = await this.supabase.getAllEmployees();
      const employeeIds = profiles.map((employee) => employee.id);

      const earningsMap = new Map<string, number>();
      const jobsMap = new Map<string, number>();
      const paymentsMap = new Map<string, number>();

      if (employeeIds.length > 0) {
        const [participantsRes, settlementsRes] = await Promise.all([
          this.supabase.supabase
            .from("job_participants")
            .select("employee_id, amount_earned, job_id")
            .in("employee_id", employeeIds),
          this.supabase.supabase
            .from("settlements")
            .select("employee_id, amount")
            .in("employee_id", employeeIds),
        ]);

        if (participantsRes.error) throw participantsRes.error;
        if (settlementsRes.error) throw settlementsRes.error;

        for (const p of participantsRes.data ?? []) {
          earningsMap.set(p.employee_id, (earningsMap.get(p.employee_id) || 0) + (Number(p.amount_earned) || 0));
          jobsMap.set(p.employee_id, (jobsMap.get(p.employee_id) || 0) + 1);
        }

        for (const s of settlementsRes.data ?? []) {
          paymentsMap.set(s.employee_id, (paymentsMap.get(s.employee_id) || 0) + (Number(s.amount) || 0));
        }
      }

      const manageable = this.isSecretary
        ? profiles.filter((p) => p.role === "encargado" || p.role === "ayudante")
        : profiles;

      this.all = manageable.map((employee) => {
        const earned = earningsMap.get(employee.id) || 0;
        const paid = paymentsMap.get(employee.id) || 0;

        return {
          ...employee,
          totalEarned: earned,
          totalPaid: paid,
          totalPending: Math.max(0, earned - paid),
          totalJobs: jobsMap.get(employee.id) || 0,
        };
      });

      this.totalPending = this.all
        .filter((e) => !this.isDeleted(e))
        .reduce((total, e) => total + e.totalPending, 0);

      this.avatars = await this.supabase.getAvatarUrls(
        this.all.map((e) => e.avatar_path || ""),
      );

      // Mantener la ficha abierta sincronizada tras recargar
      if (this.selected) {
        this.selected = this.all.find((e) => e.id === this.selected!.id) ?? null;
      }

      this.applyFilters();
    } catch (error: any) {
      this.errorMessage = this.getErrorMessage(error);
      this.all = [];
      this.filtered = [];
    } finally {
      this.loading = false;
    }
  }

  // =========================================================
  // FILTROS
  // =========================================================

  setFilter(filter: ListFilter) {
    this.listFilter = filter;
    this.applyFilters();
  }

  private matchesFilter(e: EmployeeView, filter: ListFilter): boolean {
    switch (filter) {
      case "activos":
        return !this.isDeleted(e) && e.account_status === "activo";
      case "suspendidos":
        return !this.isDeleted(e) && e.account_status !== "activo";
      case "eliminados":
        return this.isDeleted(e);
      default:
        return true;
    }
  }

  countBy(filter: ListFilter): number {
    return this.all.filter((e) => this.matchesFilter(e, filter)).length;
  }

  countRole(role: Role): number {
    return this.all.filter((e) => e.role === role && this.matchesFilter(e, "activos")).length;
  }

  applyFilters() {
    const search = this.searchTerm.trim().toLowerCase();

    this.filtered = this.all.filter(
      (e) =>
        this.matchesFilter(e, this.listFilter) &&
        (!search ||
          e.full_name?.toLowerCase().includes(search) ||
          e.username?.toLowerCase().includes(search) ||
          (ROLE_LABELS[e.role] || e.role).toLowerCase().includes(search)),
    );
  }

  // =========================================================
  // CREAR COLABORADOR
  // =========================================================

  private emptyCreateForm() {
    return {
      full_name: "",
      username: "",
      password: "",
      role: "ayudante" as StaffRole,
      hire_date: todayISO(),
      salary_type: "hora" as SalaryType,
      salary_rate: null as number | null,
      account_status: "activo" as AccountStatus,
    };
  }

  openCreate() {
    this.createForm = this.emptyCreateForm();
    this.usernameTouched = false;
    this.showPassword = false;
    this.createPhoto = null;
    this.createPhotoPreview = null;
    this.errorMessage = "";
    this.showCreate = true;
  }

  closeCreate() {
    if (this.saving) return;
    this.showCreate = false;
  }

  suggestUsername() {
    if (this.usernameTouched) return;

    const base = this.createForm.full_name
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (base.length === 0) {
      this.createForm.username = "";
      return;
    }

    const candidate = (base[0] + (base[1] ? "." + base[1] : ""))
      .replace(/[^a-z0-9._-]/g, "")
      .slice(0, 30);

    this.createForm.username = candidate;
  }

  generatePassword(target: "create" | "reset") {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    const bytes = new Uint32Array(10);
    crypto.getRandomValues(bytes);
    const password = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");

    this.showPassword = true;

    if (target === "create") {
      this.createForm.password = password;
    } else {
      this.resetPassword = password;
    }
  }

  pickCreatePhoto(event: Event) {
    const file = this.readPhoto(event);
    if (!file) return;
    this.createPhoto = file;
    this.createPhotoPreview = URL.createObjectURL(file);
  }

  pickEditPhoto(event: Event) {
    const file = this.readPhoto(event);
    if (!file) return;
    this.editPhoto = file;
    this.editPhotoPreview = URL.createObjectURL(file);
  }

  private readPhoto(event: Event): File | null {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = "";

    if (!file) return null;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      this.errorMessage = "La foto debe ser JPG, PNG o WEBP.";
      return null;
    }

    if (file.size > 3 * 1024 * 1024) {
      this.errorMessage = "La foto no puede superar 3 MB.";
      return null;
    }

    return file;
  }

  async create() {
    this.errorMessage = "";
    const f = this.createForm;
    const username = f.username.trim().toLowerCase();
    const rate = Number(f.salary_rate);

    if (f.full_name.trim().length < 2) {
      this.errorMessage = "Introduce el nombre y apellidos.";
      return;
    }
    if (!/^[a-z0-9._-]{3,30}$/.test(username)) {
      this.errorMessage = "El usuario debe tener 3-30 caracteres: minúsculas, números, punto, guion o guion bajo.";
      return;
    }
    if (f.password.length < 8) {
      this.errorMessage = "La contraseña inicial debe tener al menos 8 caracteres.";
      return;
    }
    if (f.salary_rate === null || !Number.isFinite(rate) || rate < 0) {
      this.errorMessage = "Introduce un importe de salario válido.";
      return;
    }

    this.saving = true;

    try {
      const avatarPath = this.createPhoto
        ? await this.supabase.uploadAvatar(this.createPhoto)
        : null;

      await this.supabase.createCollaborator({
        full_name: f.full_name.trim(),
        username,
        password: f.password,
        role: f.role,
        hire_date: f.hire_date || todayISO(),
        salary_type: f.salary_type,
        salary_rate: rate,
        account_status: f.account_status,
        avatar_path: avatarPath,
      });

      const credentials = `Usuario: ${username}\nContraseña: ${f.password}`;

      this.saving = false;
      this.showCreate = false;
      await this.load();

      const alert = await this.alertCtrl.create({
        header: "Colaborador creado",
        subHeader: f.full_name.trim(),
        message:
          `Entrega estas credenciales al colaborador. ` +
          `Por seguridad, no se volverán a mostrar.\n\n${credentials}`,
        cssClass: "credentials-alert",
        buttons: [
          {
            text: "Copiar",
            handler: () => {
              navigator.clipboard?.writeText(credentials).catch(() => undefined);
              return false;
            },
          },
          { text: "Hecho", role: "cancel" },
        ],
      });
      await alert.present();
    } catch (error: any) {
      this.errorMessage = this.getErrorMessage(error);
    } finally {
      this.saving = false;
    }
  }

  // =========================================================
  // FICHA
  // =========================================================

  openDetail(employee: EmployeeView) {
    this.selected = employee;
    this.tab = "datos";
    this.errorMessage = "";
    this.showPassword = false;
    this.resetPassword = "";
    this.settleAmount = null;
    this.editPhoto = null;
    this.editPhotoPreview = null;

    this.editForm = {
      full_name: employee.full_name || "",
      username: employee.username || "",
      role: (employee.role === "admin" ? "ayudante" : employee.role) as StaffRole,
      hire_date: employee.hire_date || "",
    };

    this.salaryForm = {
      salary_type: employee.role === "secretaria" ? "mes" : employee.salary_type || "hora",
      salary_rate: employee.salary_rate,
      effective_from: todayISO(),
      note: "",
    };

    this.saving = false;
    this.showModal = true;
    void this.loadSalaryHistory(employee.id);
  }

  closeModal() {
    if (this.saving) return;
    this.showModal = false;
    this.selected = null;
  }

  private async loadSalaryHistory(employeeId: string) {
    this.historyLoading = true;

    try {
      this.salaryHistory = await this.supabase.getSalaryHistory(employeeId);
      const current = this.salaryHistory.find((h) => h.effective_from <= this.today);
      this.currentHistoryId = current?.id ?? null;
    } catch {
      this.salaryHistory = [];
      this.currentHistoryId = null;
    } finally {
      this.historyLoading = false;
    }
  }

  async saveData() {
    if (!this.selected) return;
    this.errorMessage = "";

    const username = this.editForm.username.trim().toLowerCase();

    if (this.editForm.full_name.trim().length < 2) {
      this.errorMessage = "Introduce el nombre y apellidos.";
      return;
    }
    if (!/^[a-z0-9._-]{3,30}$/.test(username)) {
      this.errorMessage = "Nombre de usuario no válido.";
      return;
    }

    if (this.editForm.role !== this.selected.role) {
      const ok = await this.confirm(
        "Cambiar cargo",
        `${this.selected.full_name} pasará de ${ROLE_LABELS[this.selected.role]} a ${ROLE_LABELS[this.editForm.role]}. Sus permisos cambiarán de inmediato.`,
        "Cambiar cargo",
      );
      if (!ok) return;
    }

    this.saving = true;

    try {
      const avatarPath = this.editPhoto
        ? await this.supabase.uploadAvatar(this.editPhoto)
        : undefined;

      await this.supabase.updateCollaborator(this.selected.id, {
        full_name: this.editForm.full_name.trim(),
        username,
        role: this.editForm.role,
        hire_date: this.editForm.hire_date || null,
        ...(avatarPath ? { avatar_path: avatarPath } : {}),
      });

      this.editPhoto = null;
      this.editPhotoPreview = null;
      await this.load();
      await this.toast("Datos guardados.");
    } catch (error: any) {
      this.errorMessage = this.getErrorMessage(error);
    } finally {
      this.saving = false;
    }
  }

  async saveSalary() {
    if (!this.selected) return;
    this.errorMessage = "";

    const rate = Number(this.salaryForm.salary_rate);

    if (this.salaryForm.salary_rate === null || !Number.isFinite(rate) || rate < 0) {
      this.errorMessage = "Introduce un importe de salario válido.";
      return;
    }
    if (!this.salaryForm.effective_from) {
      this.errorMessage = "Indica desde qué fecha se aplica.";
      return;
    }

    const ok = await this.confirm(
      "Cambio de salario",
      `Nuevo salario: ${rate.toFixed(2)} ${SALARY_UNIT[this.salaryForm.salary_type]} (${SALARY_TYPE_LABELS[this.salaryForm.salary_type]}) desde el ${this.formatDate(this.salaryForm.effective_from)}. Los trabajos anteriores no se recalculan.`,
      "Registrar",
    );
    if (!ok) return;

    this.saving = true;

    try {
      await this.supabase.changeSalary(
        this.selected.id,
        this.salaryForm.salary_type,
        rate,
        this.salaryForm.effective_from,
        this.salaryForm.note.trim() || undefined,
      );

      this.salaryForm.note = "";
      await this.load();
      await this.loadSalaryHistory(this.selected!.id);
      await this.toast("Cambio de salario registrado.");
    } catch (error: any) {
      this.errorMessage = this.getErrorMessage(error);
    } finally {
      this.saving = false;
    }
  }

  async settle() {
    if (!this.selected) return;

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
      this.settleAmount = null;
      await this.load();
      await this.toast("Pago registrado.");
    } catch (error: any) {
      this.errorMessage = this.getErrorMessage(error);
    } finally {
      this.saving = false;
    }
  }

  // =========================================================
  // ACCESO
  // =========================================================

  async changeStatus(status: AccountStatus) {
    if (!this.selected) return;

    const texts: Record<AccountStatus, [string, string]> = {
      activo: ["Reactivar cuenta", "Podrá volver a entrar en la app."],
      suspendido: ["Suspender cuenta", "No podrá entrar hasta que la reactives. Se cerrarán sus sesiones."],
      desactivado: ["Desactivar cuenta", "La cuenta quedará desactivada. Se cerrarán sus sesiones."],
    };

    const [header, message] = texts[status];
    const ok = await this.confirm(header, `${this.selected.full_name}: ${message}`, header.split(" ")[0]);
    if (!ok) return;

    await this.run(() => this.supabase.setCollaboratorStatus(this.selected!.id, status), "Estado actualizado.");
  }

  async unlock() {
    if (!this.selected) return;
    await this.run(() => this.supabase.unlockCollaborator(this.selected!.id), "Cuenta desbloqueada.");
  }

  async revokeSessions() {
    if (!this.selected) return;
    const ok = await this.confirm("Cerrar sesiones", "Se cerrará su sesión en todos los dispositivos.", "Cerrar sesiones");
    if (!ok) return;
    await this.run(() => this.supabase.revokeCollaboratorSessions(this.selected!.id), "Sesiones cerradas.");
  }

  async doResetPassword() {
    if (!this.selected) return;

    if (this.resetPassword.length < 8) {
      this.errorMessage = "La contraseña debe tener al menos 8 caracteres.";
      return;
    }

    const password = this.resetPassword;
    const username = this.selected.username;

    await this.run(
      () => this.supabase.resetCollaboratorPassword(this.selected!.id, password),
      "Contraseña restablecida.",
    );

    if (!this.errorMessage) {
      this.resetPassword = "";
      const alert = await this.alertCtrl.create({
        header: "Contraseña restablecida",
        message: `Entrega la nueva contraseña al colaborador.\n\nUsuario: ${username}\nContraseña: ${password}`,
        cssClass: "credentials-alert",
        buttons: ["Hecho"],
      });
      await alert.present();
    }
  }

  async remove() {
    if (!this.selected) return;

    const ok = await this.confirm(
      "Eliminar colaborador",
      `${this.selected.full_name} dejará de tener acceso y no aparecerá en el equipo. Su historial laboral, pagos y adelantos se conservan.`,
      "Eliminar",
    );
    if (!ok) return;

    await this.run(() => this.supabase.deleteCollaborator(this.selected!.id), "Colaborador eliminado.");
  }

  private async run(action: () => Promise<unknown>, success: string) {
    this.saving = true;
    this.errorMessage = "";

    try {
      await action();
      await this.load();
      await this.toast(success);
    } catch (error: any) {
      this.errorMessage = this.getErrorMessage(error);
    } finally {
      this.saving = false;
    }
  }

  // =========================================================
  // AYUDAS DE PRESENTACIÓN
  // =========================================================

  isDeleted(e: Profile): boolean {
    return !!e.deleted_at || e.is_active === false;
  }

  isLocked(e: Profile): boolean {
    return !!e.locked_until && new Date(e.locked_until).getTime() > Date.now();
  }

  statusOf(e: Profile): AccountStatus | "eliminado" {
    return this.isDeleted(e) ? "eliminado" : e.account_status;
  }

  statusText(e: Profile): string {
    const s = this.statusOf(e);
    return s === "eliminado" ? "Eliminado" : STATUS_LABELS[s];
  }

  salaryText(e: Profile): string {
    if (!e.salary_type || e.salary_rate === null || e.salary_rate === undefined) {
      return "Sin salario configurado";
    }
    return `${Number(e.salary_rate).toFixed(2)} ${SALARY_UNIT[e.salary_type]}`;
  }

  avatarUrl(e: Profile | null): string | null {
    return e?.avatar_path ? this.avatars[e.avatar_path] ?? null : null;
  }

  getInitials(name: string | null | undefined): string {
    if (!name) return "CO";
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  private formatDate(iso: string): string {
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  }

  private async confirm(header: string, message: string, confirmText: string): Promise<boolean> {
    const alert = await this.alertCtrl.create({
      header,
      message,
      buttons: [
        { text: "Cancelar", role: "cancel" },
        { text: confirmText, role: "confirm" },
      ],
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    return role === "confirm";
  }

  private async toast(message: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2200,
      position: "top",
      color: "success",
    });
    await toast.present();
  }

  private getErrorMessage(error: any): string {
    if (!error) return "Se produjo un error desconocido.";
    if (typeof error === "string") return error;
    if (error.message) return error.message;
    if (error.details) return error.details;
    return "No se pudo completar la operación.";
  }
}
