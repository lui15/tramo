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
  trendingUpOutline,
  documentTextOutline,
  receiptOutline,
  addOutline,
  createOutline,
  trashOutline,
  closeOutline,
  chevronBackOutline,
  chevronForwardOutline,
  cashOutline,
  carOutline,
  flameOutline,
  constructOutline,
  buildOutline,
  speedometerOutline,
  businessOutline,
  calendarOutline,
} from "ionicons/icons";

import { addIcons } from "ionicons";
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
  created_at?: string;
  updated_at?: string;
}

interface FinancialActivity {
  id: string;
  type: "job" | "settlement" | "expense";
  title: string;
  description: string;
  date: string;
  time: string;
  amount: number;
  icon: string;
  iconClass: string;
  expense?: Expense;
}

@Component({
  selector: "app-admin-finanzas",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonIcon,
    AdminTabbarComponent,
  ],
  template: `
    <ion-header class="finance-header">
      <ion-toolbar>
        <ion-title>Finanzas</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="fin-content">
      <div class="fin-wrap" *ngIf="summary">
        <!-- =====================================================
             HERO / GENERADO
        ====================================================== -->

        <section class="hero-card">
          <div class="hero-top-line"></div>

          <div class="hero-icon-wrapper">
            <div class="hero-icon-circle">
              <ion-icon name="wallet-outline"></ion-icon>
            </div>
          </div>

          <span class="hero-label"> GENERADO </span>

          <div class="hero-value">
            {{ displayedGenerated | number: "1.2-2" }}
            <small>€</small>
          </div>

          <div class="hero-rule"></div>

          <span class="hero-sub">
            Total facturado en trabajos finalizados
          </span>

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
              <span class="stat-label"> PENDIENTE </span>

              <span class="stat-value">
                {{ displayedPending | number: "1.2-2" }}
                <small>€</small>
              </span>
            </div>

            <div class="stat-decoration"></div>
          </div>

          <!-- PAGADO -->

          <div class="stat-card pagado">
            <div class="stat-icon">
              <ion-icon name="checkmark-circle-outline"></ion-icon>
            </div>

            <div class="stat-info">
              <span class="stat-label"> PAGADO </span>

              <span class="stat-value">
                {{ displayedPaid | number: "1.2-2" }}
                <small>€</small>
              </span>
            </div>

            <div class="stat-decoration"></div>
          </div>

          <!-- GANANCIA -->

          <div class="stat-card ganancia">
            <div class="stat-icon">
              <ion-icon name="trending-up-outline"></ion-icon>
            </div>

            <div class="stat-info">
              <span class="stat-label"> GANANCIA </span>

              <span class="stat-value">
                {{ displayedProfit | number: "1.2-2" }}
                <small>€</small>
              </span>
            </div>

            <div class="stat-decoration"></div>
          </div>

          <!-- GASTOS -->

          <div class="stat-card gastos">
            <div class="stat-icon">
              <ion-icon name="receipt-outline"></ion-icon>
            </div>

            <div class="stat-info">
              <span class="stat-label"> GASTOS </span>

              <span class="stat-value">
                {{ displayedExpenses | number: "1.2-2" }}
                <small>€</small>
              </span>
            </div>

            <div class="stat-decoration"></div>
          </div>
        </section>

        <!-- =====================================================
             REPARTO A EMPLEADOS
        ====================================================== -->

        <section class="split-section" *ngIf="displayedDistributed > 0">
          <div class="split-header">
            <div class="split-title">
              <span> Reparto a empleados saldado </span>
            </div>

            <span class="split-percentage">
              {{ displayedPaidPercentage | number: "1.0-0" }}%
            </span>
          </div>

          <div class="split-progress">
            <div
              class="split-progress-fill"
              [style.width.%]="displayedPaidPercentage"
            ></div>
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
              <span> MES SELECCIONADO </span>

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
             ACTIVIDAD ECONÓMICA
        ====================================================== -->

        <section class="activity-section">
          <div class="section-header">
            <div class="section-title-wrapper">
              <div class="section-icon">
                <ion-icon name="cash-outline"></ion-icon>
              </div>

              <div class="section-title-text">
                <h3>ACTIVIDAD DE {{ currentMonthLabel | uppercase }}</h3>

                <span> Ingresos y salidas de dinero </span>
              </div>
            </div>

            <!-- =================================================
                 AÑADIR GASTO
            ================================================== -->

            <button
              type="button"
              class="add-expense-button"
              (click)="openNewExpense()"
            >
              <ion-icon name="add-outline"></ion-icon>
              <span> Añadir gasto </span>
            </button>
          </div>

          <!-- ===================================================
               LISTADO
          ==================================================== -->

          <div class="ledger-scroll" *ngIf="filteredActivities.length > 0">
            <div class="ledger">
              <div
                class="ledger-row"
                *ngFor="let activity of filteredActivities"
                [class.expense-row]="activity.type === 'expense'"
              >
                <!-- ICONO -->

                <div class="activity-icon" [ngClass]="activity.iconClass">
                  <ion-icon [name]="activity.icon"></ion-icon>
                </div>

                <!-- INFORMACIÓN -->

                <div class="ledger-main">
                  <span class="ledger-type">
                    {{ activity.title }}
                  </span>

                  <span class="ledger-description">
                    {{ activity.description }}
                  </span>

                  <span class="ledger-date">
                    {{ formatDate(activity.date) }}

                    <span class="dot"> · </span>

                    {{ activity.time || "--:--" }}
                  </span>
                </div>

                <!-- DERECHA -->

                <div class="ledger-right">
                  <span
                    class="ledger-amount"
                    [ngClass]="{
                      income: activity.amount > 0,
                      expense: activity.amount < 0,
                    }"
                  >
                    {{ activity.amount > 0 ? "+" : "" }}
                    {{ activity.amount | number: "1.2-2" }}
                    €
                  </span>

                  <!-- ACCIONES SOLO GASTOS -->

                  <div
                    class="expense-actions"
                    *ngIf="activity.type === 'expense'"
                  >
                    <button
                      type="button"
                      class="row-action edit"
                      (click)="
                        editExpense(activity.expense!); $event.stopPropagation()
                      "
                      aria-label="Editar gasto"
                    >
                      <ion-icon name="create-outline"></ion-icon>
                    </button>

                    <button
                      type="button"
                      class="row-action delete"
                      (click)="
                        deleteExpense(activity.expense!);
                        $event.stopPropagation()
                      "
                      aria-label="Eliminar gasto"
                    >
                      <ion-icon name="trash-outline"></ion-icon>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- ===================================================
               VACÍO
          ==================================================== -->

          <div class="empty-state" *ngIf="filteredActivities.length === 0">
            <div class="empty-icon-wrapper">
              <div class="empty-icon">
                <ion-icon name="cash-outline"></ion-icon>
              </div>
            </div>

            <h4>No hay movimientos económicos en este mes.</h4>

            <p>
              Los trabajos finalizados, pagos a empleados y gastos aparecerán
              aquí.
            </p>
          </div>
        </section>
      </div>

      <!-- =====================================================
           LOADING
      ====================================================== -->

      <div class="loading-state" *ngIf="!summary">
        <div class="loading-spinner"></div>

        <span> Cargando finanzas... </span>
      </div>
    </ion-content>

    <!-- =======================================================
         MODAL GASTO
    ======================================================== -->

    <div
      class="expense-modal"
      *ngIf="showExpenseModal"
      (click)="closeExpenseModal()"
    >
      <div class="expense-modal-card" (click)="$event.stopPropagation()">
        <!-- CABECERA -->

        <div class="modal-header">
          <div>
            <span class="modal-eyebrow"> FINANZAS </span>

            <h2>
              {{ editingExpense ? "Editar gasto" : "Añadir gasto" }}
            </h2>
          </div>

          <button
            type="button"
            class="modal-close"
            (click)="closeExpenseModal()"
            aria-label="Cerrar"
          >
            <ion-icon name="close-outline"></ion-icon>
          </button>
        </div>

        <!-- FORMULARIO -->

        <div class="expense-form">
          <!-- TIPO -->

          <label class="form-field">
            <span> Tipo de gasto </span>

            <select [(ngModel)]="expenseForm.expense_type">
              <option value="pago_vehiculo">Pago vehículo</option>

              <option value="combustible">Combustible</option>

              <option value="material">Material</option>

              <option value="herramientas">Herramientas</option>

              <option value="mantenimiento">Mantenimiento</option>

              <option value="peajes_parking">Peajes / Parking</option>

              <option value="alquiler_equipo">Alquiler de equipo</option>

              <option value="otros">Otros</option>
            </select>
          </label>

          <!-- DESCRIPCIÓN -->

          <label class="form-field">
            <span> Descripción * </span>

            <input
              type="text"
              [(ngModel)]="expenseForm.description"
              placeholder="Ej. Gasolina vehículo"
              maxlength="200"
            />
          </label>

          <!-- IMPORTE -->

          <label class="form-field">
            <span> Importe * </span>

            <div class="input-with-symbol">
              <input
                type="number"
                [(ngModel)]="expenseForm.amount"
                min="0"
                step="0.01"
                placeholder="0.00"
              />

              <span> € </span>
            </div>
          </label>

          <!-- FECHA Y HORA -->

          <div class="form-grid">
            <label class="form-field">
              <span> Fecha * </span>

              <input type="date" [(ngModel)]="expenseForm.expense_date" />
            </label>

            <label class="form-field">
              <span> Hora * </span>

              <input type="time" [(ngModel)]="expenseForm.expense_time" />
            </label>
          </div>

          <!-- ERROR -->

          <div class="form-error" *ngIf="formError">
            {{ formError }}
          </div>

          <!-- BOTONES -->

          <div class="modal-actions">
            <button
              type="button"
              class="cancel-button"
              (click)="closeExpenseModal()"
              [disabled]="savingExpense"
            >
              Cancelar
            </button>

            <button
              type="button"
              class="save-button"
              (click)="saveExpense()"
              [disabled]="savingExpense"
            >
              <span *ngIf="!savingExpense">
                {{ editingExpense ? "Guardar cambios" : "Guardar gasto" }}
              </span>

              <span *ngIf="savingExpense"> Guardando... </span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- =======================================================
         TABBAR
    ======================================================== -->

    <div class="admin-tabbar-container">
      <app-admin-tabbar></app-admin-tabbar>
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
        --finance-red: #df4545;
        --finance-red-bg: #fff0f0;
        --finance-teal: #269e8b;
        --finance-teal-bg: #e9f8f5;
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
        padding: 20px 16px 130px;
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
        grid-template-columns: repeat(4, minmax(0, 1fr));
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

      /* PENDIENTE */

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

      /* PAGADO */

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

      /* GANANCIA */

      .stat-card.ganancia {
        background: linear-gradient(180deg, #ffffff 0%, #f4fcfa 100%);
      }

      .stat-card.ganancia .stat-icon {
        background: var(--finance-teal-bg);
      }

      .stat-card.ganancia .stat-icon ion-icon {
        color: var(--finance-teal);
      }

      .stat-card.ganancia .stat-value {
        color: var(--finance-teal);
      }

      /* GASTOS */

      .stat-card.gastos {
        background: linear-gradient(180deg, #ffffff 0%, #fff8f8 100%);
      }

      .stat-card.gastos .stat-icon {
        background: var(--finance-red-bg);
      }

      .stat-card.gastos .stat-icon ion-icon {
        color: var(--finance-red);
      }

      .stat-card.gastos .stat-value {
        color: var(--finance-red);
      }

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

      .ganancia .stat-decoration {
        background: var(--finance-teal);
      }

      .gastos .stat-decoration {
        background: var(--finance-red);
      }

      /* =========================================================
         REPARTO
      ========================================================= */

      .split-section {
        padding: 4px 4px 18px;
        margin-bottom: 2px;
      }

      .split-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 9px;
      }

      .split-title {
        color: var(--finance-text-soft);
        font-size: 0.78rem;
        font-weight: 600;
      }

      .split-percentage {
        color: var(--finance-primary-dark);
        font-size: 0.82rem;
        font-weight: 800;
      }

      .split-progress {
        width: 100%;
        height: 7px;
        overflow: hidden;
        border-radius: 20px;
        background: #e7ebf1;
      }

      .split-progress-fill {
        height: 100%;
        border-radius: inherit;
        background: linear-gradient(90deg, #1769ff, #4385ff);
        transition: width 0.5s ease;
      }

      /* =========================================================
         SELECTOR DE MES
      ========================================================= */

      .month-selector {
        position: relative;
        display: grid;
        grid-template-columns: 44px minmax(0, 1fr) 44px;
        align-items: center;
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
        min-width: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        padding: 0 10px;
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
         AÑADIR GASTO
      ========================================================= */

      .add-expense-button {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 5px;
        min-height: 38px;
        padding: 0 13px;
        border: 1px solid var(--finance-red);
        border-radius: 12px;
        background: var(--finance-red);
        color: #ffffff;
        font-size: 0.76rem;
        font-weight: 800;
        white-space: nowrap;
        cursor: pointer;
        box-shadow: 0 5px 14px rgba(223, 69, 69, 0.2);
        transition:
          transform 0.15s ease,
          box-shadow 0.15s ease,
          background 0.15s ease;
      }

      .add-expense-button ion-icon {
        font-size: 18px;
      }

      .add-expense-button:hover {
        background: #c93636;
        border-color: #c93636;
        box-shadow: 0 7px 18px rgba(223, 69, 69, 0.26);
      }

      .add-expense-button:active {
        transform: scale(0.97);
      }

      /* =========================================================
         LISTADO
      ========================================================= */

      .ledger-scroll {
        width: 100%;
        max-height: 560px;
        overflow-y: auto;
        overflow-x: hidden;
        box-sizing: border-box;
        overscroll-behavior: contain;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: thin;
        scrollbar-color: #cbd5e1 transparent;
        padding: 2px 5px 8px 2px;
      }

      .ledger-scroll::-webkit-scrollbar {
        width: 7px;
      }

      .ledger-scroll::-webkit-scrollbar-track {
        background: transparent;
      }

      .ledger-scroll::-webkit-scrollbar-thumb {
        background: #cbd5e1;
        border-radius: 20px;
      }

      .ledger-scroll::-webkit-scrollbar-thumb:hover {
        background: #94a3b8;
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
        min-height: 78px;
        padding: 12px 15px;
        box-sizing: border-box;
        border-bottom: 1px solid #edf0f4;
      }

      .ledger-row:last-child {
        border-bottom: none;
      }

      .activity-icon {
        width: 44px;
        height: 44px;
        flex: 0 0 44px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 14px;
      }

      .activity-icon ion-icon {
        font-size: 21px;
      }

      /* INGRESO */

      .activity-icon.income {
        background: var(--finance-green-bg);
        color: var(--finance-green);
      }

      /* LIQUIDACIÓN */

      .activity-icon.settlement {
        background: var(--finance-orange-bg);
        color: var(--finance-orange);
      }

      /* GASTO */

      .activity-icon.expense {
        background: var(--finance-red-bg);
        color: var(--finance-red);
      }

      .activity-icon.pago-vehiculo {
        background: #edf4ff;
        color: var(--finance-primary);
      }

      .activity-icon.combustible {
        background: #fff4e4;
        color: var(--finance-orange);
      }

      .activity-icon.material {
        background: #edf8f6;
        color: var(--finance-teal);
      }

      .activity-icon.herramientas {
        background: #f1efff;
        color: #6f57c7;
      }

      .activity-icon.mantenimiento {
        background: #fff0f0;
        color: var(--finance-red);
      }

      .activity-icon.peajes {
        background: #f2f4f7;
        color: #61708a;
      }

      .activity-icon.alquiler {
        background: #edf4ff;
        color: var(--finance-primary);
      }

      .activity-icon.otros {
        background: #f2f4f7;
        color: #61708a;
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
        font-weight: 800;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .ledger-description {
        margin-top: 3px;
        overflow: hidden;
        color: var(--finance-text-soft);
        font-size: 0.76rem;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .ledger-date {
        margin-top: 4px;
        color: var(--finance-muted);
        font-size: 0.69rem;
        font-weight: 500;
      }

      .dot {
        margin: 0 3px;
      }

      .ledger-right {
        display: flex;
        align-items: center;
        gap: 7px;
        margin-left: 5px;
      }

      .ledger-amount {
        font-size: 0.92rem;
        font-weight: 800;
        white-space: nowrap;
        font-variant-numeric: tabular-nums;
      }

      .ledger-amount.income {
        color: var(--finance-green);
      }

      .ledger-amount.expense {
        color: var(--finance-red);
      }

      /* =========================================================
         ACCIONES
      ========================================================= */

      .expense-actions {
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .row-action {
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        border: 0;
        border-radius: 9px;
        cursor: pointer;
      }

      .row-action ion-icon {
        font-size: 17px;
      }

      .row-action.edit {
        background: var(--finance-primary-light);
        color: var(--finance-primary);
      }

      .row-action.delete {
        background: var(--finance-red-bg);
        color: var(--finance-red);
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
         MODAL
      ========================================================= */

      .expense-modal {
        position: fixed;
        inset: 0;
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        box-sizing: border-box;
        background: rgba(15, 30, 55, 0.45);
        backdrop-filter: blur(4px);
      }

      .expense-modal-card {
        position: relative;
        z-index: 10000;
        width: min(100%, 520px);
        max-height: calc(100vh - 40px);
        overflow-y: auto;
        padding: 24px;
        box-sizing: border-box;
        background: #ffffff;
        border-radius: 24px;
        box-shadow: 0 24px 70px rgba(18, 59, 120, 0.25);
      }

      .modal-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 20px;
        margin-bottom: 22px;
      }

      .modal-eyebrow {
        display: block;
        margin-bottom: 4px;
        color: var(--finance-primary);
        font-size: 0.65rem;
        font-weight: 800;
        letter-spacing: 0.14em;
      }

      .modal-header h2 {
        margin: 0;
        color: var(--finance-text);
        font-size: 1.35rem;
        font-weight: 800;
      }

      .modal-close {
        width: 38px;
        height: 38px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex: 0 0 38px;
        padding: 0;
        border: 0;
        border-radius: 11px;
        background: #f1f4f8;
        color: var(--finance-text-soft);
        cursor: pointer;
      }

      .modal-close ion-icon {
        font-size: 21px;
      }

      /* =========================================================
         FORMULARIO
      ========================================================= */

      .expense-form {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .form-field {
        display: flex;
        flex-direction: column;
        gap: 7px;
      }

      .form-field > span {
        color: var(--finance-text);
        font-size: 0.78rem;
        font-weight: 800;
      }

      .form-field input,
      .form-field select {
        width: 100%;
        min-height: 48px;
        padding: 0 13px;
        box-sizing: border-box;
        border: 1px solid #dfe5ee;
        border-radius: 13px;
        outline: none;
        background: #ffffff;
        color: var(--finance-text);
        font-family: inherit;
        font-size: 0.88rem;
      }

      .form-field input:focus,
      .form-field select:focus {
        border-color: var(--finance-primary);
        box-shadow: 0 0 0 3px rgba(23, 105, 255, 0.09);
      }

      .input-with-symbol {
        position: relative;
      }

      .input-with-symbol input {
        padding-right: 40px;
      }

      .input-with-symbol > span {
        position: absolute;
        top: 50%;
        right: 14px;
        transform: translateY(-50%);
        color: var(--finance-text-soft);
        font-size: 0.85rem;
        font-weight: 700;
      }

      .form-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }

      .form-error {
        padding: 11px 13px;
        border-radius: 11px;
        background: var(--finance-red-bg);
        color: var(--finance-red);
        font-size: 0.78rem;
        font-weight: 700;
      }

      /* =========================================================
         BOTONES MODAL
      ========================================================= */

      .modal-actions {
        display: grid;
        grid-template-columns: 1fr 1.3fr;
        gap: 10px;
        margin-top: 5px;
      }

      .cancel-button,
      .save-button {
        min-height: 48px;
        border: 0;
        border-radius: 13px;
        font-family: inherit;
        font-size: 0.85rem;
        font-weight: 800;
        cursor: pointer;
      }

      .cancel-button {
        background: #f1f4f8;
        color: var(--finance-text-soft);
      }

      .save-button {
        background: var(--finance-primary);
        color: #ffffff;
        box-shadow: 0 7px 18px rgba(23, 105, 255, 0.2);
      }

      .cancel-button:disabled,
      .save-button:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }

      /* =========================================================
         LOADING
      ========================================================= */

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
        animation: financeSpin 0.8s linear infinite;
      }

      @keyframes financeSpin {
        to {
          transform: rotate(360deg);
        }
      }

      /* =========================================================
         TABBAR
      ========================================================= */

      .admin-tabbar-container {
        position: fixed;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 1000;
        width: 100%;
        background: #ffffff;
        border-top: 1px solid var(--finance-border);
        box-shadow: 0 -6px 20px rgba(24, 47, 83, 0.08);
        padding-bottom: env(safe-area-inset-bottom);
      }

      /* =========================================================
         TABLET
      ========================================================= */

      @media (max-width: 700px) {
        .stat-row {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .ledger-scroll {
          max-height: 55vh;
        }
      }

      /* =========================================================
         MÓVIL
      ========================================================= */

      @media (max-width: 500px) {
        .fin-wrap {
          padding: 14px 12px 125px;
        }

        /* =====================================================
           1. GENERADO
        ===================================================== */

        .hero-card {
          min-height: 0;
          height: 205px;
          padding: 20px 14px 22px;
          margin-bottom: 12px;
          border-radius: 20px;
        }

        .hero-top-line {
          height: 5px;
        }

        .hero-icon-wrapper {
          width: 48px;
          height: 48px;
          margin-top: 0;
          margin-bottom: 7px;
        }

        .hero-icon-circle {
          width: 38px;
          height: 38px;
          border-radius: 11px;
        }

        .hero-icon-circle ion-icon {
          font-size: 21px;
        }

        .hero-label {
          font-size: 0.61rem;
          letter-spacing: 0.17em;
        }

        .hero-value {
          margin-top: 6px;
          font-size: 2.55rem;
          letter-spacing: -1.4px;
        }

        .hero-value small {
          margin-left: 4px;
          font-size: 0.95rem;
        }

        .hero-rule {
          width: 45px;
          height: 2px;
          margin: 10px 0 8px;
        }

        .hero-sub {
          max-width: 250px;
          font-size: 0.68rem;
          line-height: 1.35;
        }

        .hero-wave {
          bottom: -105px;
          height: 130px;
        }

        /* =====================================================
           2. CUATRO TARJETAS
        ===================================================== */

        .stat-row {
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 9px;
          margin-bottom: 13px;
        }

        .stat-card {
          min-height: 104px;
          height: 104px;
          padding: 9px 7px;
          border-radius: 15px;
          box-shadow: 0 3px 12px rgba(24, 47, 83, 0.045);
        }

        .stat-icon {
          width: 34px;
          height: 34px;
          margin-bottom: 6px;
          border-radius: 10px;
        }

        .stat-icon ion-icon {
          font-size: 19px;
        }

        .stat-info {
          gap: 3px;
        }

        .stat-label {
          font-size: 0.54rem;
          letter-spacing: 0.08em;
        }

        .stat-value {
          font-size: 0.96rem;
          line-height: 1;
        }

        .stat-value small {
          font-size: 0.68rem;
        }

        .stat-decoration {
          bottom: 5px;
          width: 28px;
          height: 2px;
        }

        /* =====================================================
           3. REPARTO
        ===================================================== */

        .split-section {
          padding: 2px 2px 12px;
          margin-bottom: 0;
        }

        .split-title {
          font-size: 0.68rem;
        }

        .split-percentage {
          font-size: 0.72rem;
        }

        .split-progress {
          height: 5px;
        }

        /* =====================================================
           4. SELECTOR DE MES
        ===================================================== */

        .month-selector {
          grid-template-columns: 40px minmax(0, 1fr) 40px;
          min-height: 58px;
          padding: 7px;
          margin-bottom: 18px;
          border-radius: 15px;
        }

        .month-selector::before {
          height: 3px;
        }

        .month-arrow {
          width: 40px;
          height: 40px;
          border-radius: 11px;
        }

        .month-arrow ion-icon {
          font-size: 19px;
        }

        .month-current {
          gap: 7px;
          padding: 0 4px;
          justify-content: center;
        }

        .month-icon {
          width: 34px;
          height: 34px;
          flex-basis: 34px;
          border-radius: 10px;
        }

        .month-icon ion-icon {
          font-size: 18px;
        }

        .month-info {
          text-align: left;
        }

        .month-info span {
          display: none;
        }

        .month-info strong {
          font-size: 14px;
          line-height: 1.1;
        }

        /* =====================================================
           5. ACTIVIDAD
        ===================================================== */

        .section-header {
          display: flex;
          flex-direction: column;
          align-items: stretch;
          justify-content: flex-start;
          gap: 10px;
          margin: 0 2px 15px;
        }

        .section-title-wrapper {
          width: 100%;
          gap: 8px;
        }

        .section-icon {
          width: 36px;
          height: 36px;
          flex-basis: 36px;
          border-radius: 10px;
        }

        .section-icon ion-icon {
          font-size: 19px;
        }

        .section-title-text {
          flex: 1;
          min-width: 0;
        }

        .section-title-text h3 {
          font-size: 0.72rem;
          line-height: 1.2;
        }

        .section-title-text span {
          margin-top: 3px;
          font-size: 0.64rem;
        }

        /* =====================================================
           6. AÑADIR GASTO
        ===================================================== */

        .add-expense-button {
          width: 100%;
          min-height: 44px;
          height: 44px;
          padding: 0 14px;
          gap: 7px;
          border-radius: 12px;
          background: var(--finance-red);
          border-color: var(--finance-red);
          color: #ffffff;
          font-size: 0.78rem;
          box-shadow: 0 5px 14px rgba(223, 69, 69, 0.18);
        }

        .add-expense-button ion-icon {
          font-size: 19px;
        }

        .add-expense-button span {
          display: inline;
        }

        /* =====================================================
           7. LISTA DE MOVIMIENTOS
        ===================================================== */

        .ledger-scroll {
          max-height: none;
          padding: 0 2px 8px 0;
          overflow-y: visible;
        }

        .ledger {
          border-radius: 16px;
        }

        .ledger-row {
          min-height: 94px;
          gap: 9px;
          padding: 15px 11px;
          align-items: center;
        }

        .activity-icon {
          width: 39px;
          height: 39px;
          flex-basis: 39px;
          border-radius: 11px;
        }

        .activity-icon ion-icon {
          font-size: 19px;
        }

        .ledger-main {
          min-width: 0;
        }

        .ledger-type {
          font-size: 0.78rem;
          line-height: 1.25;
        }

        .ledger-description {
          margin-top: 4px;
          font-size: 0.67rem;
          line-height: 1.25;
        }

        .ledger-date {
          margin-top: 5px;
          font-size: 0.61rem;
        }

        .ledger-right {
          gap: 3px;
          margin-left: 2px;
          flex-direction: column;
          align-items: flex-end;
        }

        .ledger-amount {
          font-size: 0.76rem;
        }

        .expense-actions {
          gap: 3px;
        }

        .row-action {
          width: 27px;
          height: 27px;
          border-radius: 8px;
        }

        .row-action ion-icon {
          font-size: 14px;
        }

        /* =====================================================
           8. VACÍO
        ===================================================== */

        .empty-state {
          min-height: 230px;
          padding: 28px 16px;
          border-radius: 16px;
        }

        .empty-icon-wrapper {
          width: 85px;
          height: 85px;
          margin-bottom: 12px;
        }

        .empty-icon {
          width: 55px;
          height: 55px;
          border-radius: 16px;
        }

        .empty-icon ion-icon {
          font-size: 29px;
        }

        .empty-state h4 {
          font-size: 0.88rem;
        }

        .empty-state p {
          font-size: 0.72rem;
        }

        /* =====================================================
           9. MODAL EN MÓVIL
        ===================================================== */

        .expense-modal {
          padding: 12px;
          align-items: center;
        }

        .expense-modal-card {
          width: 100%;
          max-height: calc(100vh - 24px);
          padding: 18px;
          border-radius: 20px;
        }

        .modal-header {
          margin-bottom: 18px;
        }

        .modal-header h2 {
          font-size: 1.15rem;
        }

        .form-grid {
          grid-template-columns: 1fr;
        }
      }

      /* =========================================================
         MÓVILES MUY PEQUEÑOS
      ========================================================= */

      @media (max-width: 380px) {
        .fin-wrap {
          padding-left: 10px;
          padding-right: 10px;
        }

        .hero-card {
          height: 195px;
        }

        .hero-value {
          font-size: 2.3rem;
        }

        .stat-row {
          gap: 7px;
        }

        .stat-card {
          min-height: 98px;
          height: 98px;
        }

        .stat-label {
          font-size: 0.49rem;
        }

        .stat-value {
          font-size: 0.89rem;
        }

        .month-selector {
          grid-template-columns: 38px minmax(0, 1fr) 38px;
        }

        .month-arrow {
          width: 38px;
          height: 38px;
        }

        .month-icon {
          width: 32px;
          height: 32px;
          flex-basis: 32px;
        }

        .month-info strong {
          font-size: 13px;
        }

        .section-title-text h3 {
          font-size: 0.68rem;
        }

        .add-expense-button {
          min-height: 42px;
          height: 42px;
          font-size: 0.75rem;
        }

        .ledger-row {
          min-height: 96px;
          padding: 16px 9px;
        }
      }

      /* =========================================================
         DESKTOP
      ========================================================= */

      @media (min-width: 768px) {
        .fin-wrap {
          padding: 30px 30px 130px;
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

        .ledger-row {
          padding-left: 20px;
          padding-right: 20px;
        }
      }
    `,
  ],
})
export class AdminFinanzasPage implements OnInit {
  /* =========================================================
     DATOS GENERALES
  ========================================================= */

  summary: any = null;

  finishedJobs: any[] = [];

  settlements: any[] = [];

  participants: any[] = [];

  expenses: Expense[] = [];

  activities: FinancialActivity[] = [];

  filteredActivities: FinancialActivity[] = [];

  repartoTotal = 0;

  repartoPagadoPct = 0;

  /* =========================================================
     MES SELECCIONADO
  ========================================================= */

  selectedMonth = new Date();

  /* =========================================================
     MODAL
  ========================================================= */

  showExpenseModal = false;

  editingExpense = false;

  savingExpense = false;

  formError = "";

  expenseForm: Expense = {
    expense_type: "otros",
    description: "",
    amount: 0,
    expense_date: this.getTodayDate(),
    expense_time: this.getCurrentTime(),
  };

  constructor(private supabase: SupabaseService) {
    addIcons({
      "wallet-outline": walletOutline,
      "time-outline": timeOutline,
      "checkmark-circle-outline": checkmarkCircleOutline,
      "trending-up-outline": trendingUpOutline,
      "document-text-outline": documentTextOutline,
      "receipt-outline": receiptOutline,
      "add-outline": addOutline,
      "create-outline": createOutline,
      "trash-outline": trashOutline,
      "close-outline": closeOutline,
      "chevron-back-outline": chevronBackOutline,
      "chevron-forward-outline": chevronForwardOutline,
      "cash-outline": cashOutline,
      "car-outline": carOutline,
      "flame-outline": flameOutline,
      "construct-outline": constructOutline,
      "build-outline": buildOutline,
      "speedometer-outline": speedometerOutline,
      "business-outline": businessOutline,
      "calendar-outline": calendarOutline,
    });
  }

  /* =========================================================
     INIT
  ========================================================= */

  async ngOnInit() {
    await this.loadFinancialData();
  }

  /* =========================================================
     ETIQUETA DEL MES
  ========================================================= */

  get currentMonthLabel(): string {
    return this.selectedMonth.toLocaleDateString("es-ES", {
      month: "long",
      year: "numeric",
    });
  }

  /* =========================================================
     TRABAJOS DEL MES
  ========================================================= */

  get monthlyFinishedJobs(): any[] {
    return this.finishedJobs.filter((job: any) => {
      const date = job.job_date || this.extractDate(job.created_at);

      return this.isDateInSelectedMonth(date);
    });
  }

  /* =========================================================
     GENERADO DEL MES
  ========================================================= */

  get displayedGenerated(): number {
    return this.monthlyFinishedJobs.reduce((total: number, job: any) => {
      const amount = Number(job.total_cost ?? 0);

      return Number.isFinite(amount) ? total + amount : total;
    }, 0);
  }

  /* =========================================================
     REPARTO A EMPLEADOS DEL MES
  ========================================================= */

  get displayedDistributed(): number {
    const monthlyJobIds = new Set(
      this.monthlyFinishedJobs
        .map((job: any) => String(job.id))
        .filter(Boolean),
    );

    return this.participants.reduce((total: number, participant: any) => {
      const participantJobId = String(participant.job_id ?? "");

      if (!monthlyJobIds.has(participantJobId)) {
        return total;
      }

      const amount = Number(participant.amount_earned ?? 0);

      return Number.isFinite(amount) ? total + amount : total;
    }, 0);
  }

  /* =========================================================
     PAGADO DEL MES
  ========================================================= */

  get displayedPaid(): number {
    return this.settlements.reduce((total: number, settlement: any) => {
      const date =
        settlement.settlement_date ||
        settlement.payment_date ||
        settlement.date ||
        this.extractDate(settlement.created_at);

      if (!this.isDateInSelectedMonth(date)) {
        return total;
      }

      const amount = Number(settlement.amount ?? 0);

      return Number.isFinite(amount) ? total + amount : total;
    }, 0);
  }

  /* =========================================================
     GASTOS DEL MES
  ========================================================= */

  get displayedExpenses(): number {
    return this.expenses.reduce((total: number, expense: Expense) => {
      if (!this.isDateInSelectedMonth(expense.expense_date)) {
        return total;
      }

      const amount = Number(expense.amount ?? 0);

      return Number.isFinite(amount) ? total + amount : total;
    }, 0);
  }

  /* =========================================================
     PENDIENTE DEL MES
  ========================================================= */

  get displayedPending(): number {
    return Math.max(0, this.displayedDistributed - this.displayedPaid);
  }

  /* =========================================================
     GANANCIA DEL MES
  ========================================================= */

  get displayedProfit(): number {
    return (
      this.displayedGenerated -
      this.displayedDistributed -
      this.displayedExpenses
    );
  }

  /* =========================================================
     PORCENTAJE PAGADO DEL MES
  ========================================================= */

  get displayedPaidPercentage(): number {
    if (this.displayedDistributed <= 0) {
      return 0;
    }

    return Math.min(
      100,
      Math.max(0, (this.displayedPaid / this.displayedDistributed) * 100),
    );
  }

  /* =========================================================
     COMPROBAR FECHA DEL MES
  ========================================================= */

  private isDateInSelectedMonth(value: string): boolean {
    if (!value) {
      return false;
    }

    const parsed = this.parseDate(value);

    if (!parsed) {
      return false;
    }

    return (
      parsed.getFullYear() === this.selectedMonth.getFullYear() &&
      parsed.getMonth() === this.selectedMonth.getMonth()
    );
  }

  /* =========================================================
     MES ANTERIOR
  ========================================================= */

  previousMonth() {
    this.selectedMonth = new Date(
      this.selectedMonth.getFullYear(),
      this.selectedMonth.getMonth() - 1,
      1,
    );

    this.updateFilteredActivities();
  }

  /* =========================================================
     MES SIGUIENTE
  ========================================================= */

  nextMonth() {
    this.selectedMonth = new Date(
      this.selectedMonth.getFullYear(),
      this.selectedMonth.getMonth() + 1,
      1,
    );

    this.updateFilteredActivities();
  }

  /* =========================================================
     CARGAR DATOS
  ========================================================= */

  private async loadFinancialData() {
    try {
      this.summary = null;

      /* =======================================================
         1. TRABAJOS FINALIZADOS
      ======================================================= */

      const { data: jobs, error: jobsError } = await this.supabase.supabase
        .from("jobs")
        .select("*")
        .eq("status", "finalizado")
        .order("job_date", {
          ascending: false,
        });

      if (jobsError) {
        throw jobsError;
      }

      this.finishedJobs = jobs ?? [];

      /* =======================================================
         2. PARTICIPANTES
      ======================================================= */

      const finishedJobIds = this.finishedJobs
        .map((job: any) => job.id)
        .filter(Boolean);

      let participants: any[] = [];

      if (finishedJobIds.length > 0) {
        const { data: participantsData, error: participantsError } =
          await this.supabase.supabase
            .from("job_participants")
            .select("*")
            .in("job_id", finishedJobIds);

        if (participantsError) {
          throw participantsError;
        }

        participants = participantsData ?? [];
      }

      this.participants = participants;

      /* =======================================================
         3. SETTLEMENTS
      ======================================================= */

      const { data: settlements, error: settlementsError } =
        await this.supabase.supabase
          .from("settlements")
          .select("*")
          .order("settlement_date", {
            ascending: false,
          });

      if (settlementsError) {
        throw settlementsError;
      }

      /* =======================================================
         4. PERFILES
      ======================================================= */

      const { data: profiles, error: profilesError } =
        await this.supabase.supabase.from("profiles").select("id, full_name");

      if (profilesError) {
        console.error("Error obteniendo perfiles:", profilesError);

        throw profilesError;
      }

      /* =======================================================
         MAPA DE PERFILES
      ======================================================= */

      const profileMap = new Map<string, string>();

      for (const profile of profiles ?? []) {
        if (profile.id && profile.full_name) {
          profileMap.set(
            String(profile.id).trim(),
            String(profile.full_name).trim(),
          );
        }
      }

      /* =======================================================
         NOMBRES EMPLEADOS
      ======================================================= */

      this.settlements = (settlements ?? []).map((settlement: any) => {
        const employeeId = String(settlement.employee_id ?? "").trim();

        const employeeName = profileMap.get(employeeId) || "Empleado";

        return {
          ...settlement,
          employee_name: employeeName,
        };
      });

      /* =======================================================
         5. GASTOS
      ======================================================= */

      const { data: expenses, error: expensesError } =
        await this.supabase.supabase
          .from("expenses")
          .select("*")
          .order("expense_date", {
            ascending: false,
          });

      if (expensesError) {
        console.error("Error obteniendo gastos:", expensesError);

        this.expenses = [];
      } else {
        this.expenses = (expenses ?? []) as Expense[];
      }

      /* =======================================================
         6. TOTALES GENERALES
      ======================================================= */

      const ingresosTotales = this.finishedJobs.reduce(
        (total: number, job: any) => {
          const amount = Number(job.total_cost ?? 0);

          return Number.isFinite(amount) ? total + amount : total;
        },
        0,
      );

      const totalRepartidoEmpleados = participants.reduce(
        (total: number, participant: any) => {
          const amount = Number(participant.amount_earned ?? 0);

          return Number.isFinite(amount) ? total + amount : total;
        },
        0,
      );

      const totalYaPagado = this.settlements.reduce(
        (total: number, settlement: any) => {
          const amount = Number(settlement.amount ?? 0);

          return Number.isFinite(amount) ? total + amount : total;
        },
        0,
      );

      const totalGastos = this.expenses.reduce(
        (total: number, expense: Expense) => {
          const amount = Number(expense.amount ?? 0);

          return Number.isFinite(amount) ? total + amount : total;
        },
        0,
      );

      const totalPendientePagar = Math.max(
        0,
        totalRepartidoEmpleados - totalYaPagado,
      );

      const gananciaNeta =
        ingresosTotales - totalRepartidoEmpleados - totalGastos;

      /* =======================================================
         RESUMEN
      ======================================================= */

      this.summary = {
        ingresos_totales: ingresosTotales,

        total_pendiente_pagar: totalPendientePagar,

        total_ya_pagado: totalYaPagado,

        ganancia_neta: gananciaNeta,

        total_repartido_empleados: totalRepartidoEmpleados,

        total_gastos: totalGastos,
      };

      /* =======================================================
         PROGRESO GENERAL
      ======================================================= */

      this.repartoTotal = totalRepartidoEmpleados;

      if (this.repartoTotal > 0) {
        this.repartoPagadoPct = Math.min(
          100,
          Math.max(0, (totalYaPagado / this.repartoTotal) * 100),
        );
      } else {
        this.repartoPagadoPct = 0;
      }

      /* =======================================================
         ACTIVIDADES
      ======================================================= */

      this.buildActivities();
    } catch (error) {
      console.error("Error cargando las finanzas:", error);

      this.summary = {
        ingresos_totales: 0,
        total_pendiente_pagar: 0,
        total_ya_pagado: 0,
        ganancia_neta: 0,
        total_repartido_empleados: 0,
        total_gastos: 0,
      };

      this.finishedJobs = [];
      this.settlements = [];
      this.participants = [];
      this.expenses = [];
      this.activities = [];
      this.filteredActivities = [];
      this.repartoTotal = 0;
      this.repartoPagadoPct = 0;
    }
  }

  /* =========================================================
     CREAR ACTIVIDADES
  ========================================================= */

  private buildActivities() {
    const activities: FinancialActivity[] = [];

    /* =======================================================
       TRABAJOS
    ======================================================= */

    for (const job of this.finishedJobs) {
      const amount = Number(job.total_cost ?? 0);

      const jobType = this.getJobTypeLabel(job.job_type);

      activities.push({
        id: `job-${job.id}`,

        type: "job",

        title: jobType,

        description: job.client_name
          ? `Trabajo finalizado · ${job.client_name}`
          : "Trabajo finalizado",

        date: job.job_date || this.extractDate(job.created_at),

        time: job.start_time || this.extractTime(job.created_at),

        amount: Number.isFinite(amount) ? amount : 0,

        icon: "receipt-outline",

        iconClass: "income",
      });
    }

    /* =======================================================
       PAGOS EMPLEADOS
    ======================================================= */

    for (const settlement of this.settlements) {
      const amount = Number(settlement.amount ?? 0);

      const date =
        settlement.settlement_date ||
        settlement.payment_date ||
        settlement.date ||
        this.extractDate(settlement.created_at);

      const time = settlement.time || this.extractTime(settlement.created_at);

      const employeeName =
        settlement.employee_name ||
        settlement.full_name ||
        settlement.name ||
        "Empleado";

      activities.push({
        id: `settlement-${settlement.id}`,

        type: "settlement",

        title: `Pago a ${employeeName}`,

        description: employeeName,

        date: date || "",

        time: time || "",

        amount: Number.isFinite(amount) ? -Math.abs(amount) : 0,

        icon: "cash-outline",

        iconClass: "settlement",
      });
    }

    /* =======================================================
       GASTOS
    ======================================================= */

    for (const expense of this.expenses) {
      const amount = Number(expense.amount ?? 0);

      activities.push({
        id: `expense-${expense.id}`,

        type: "expense",

        title: this.getExpenseTypeLabel(expense.expense_type),

        description: expense.description,

        date: expense.expense_date,

        time: expense.expense_time,

        amount: Number.isFinite(amount) ? -Math.abs(amount) : 0,

        icon: this.getExpenseIcon(expense.expense_type),

        iconClass: `expense ${this.getExpenseIconClass(expense.expense_type)}`,

        expense,
      });
    }

    /* =======================================================
       ORDENAR
    ======================================================= */

    activities.sort((a, b) => {
      const dateA = this.getActivityTimestamp(a);

      const dateB = this.getActivityTimestamp(b);

      return dateB - dateA;
    });

    this.activities = activities;

    this.updateFilteredActivities();
  }

  /* =========================================================
     FILTRAR ACTIVIDADES POR MES
  ========================================================= */

  private updateFilteredActivities() {
    const year = this.selectedMonth.getFullYear();

    const month = this.selectedMonth.getMonth();

    this.filteredActivities = this.activities.filter((activity) => {
      if (!activity.date) {
        return false;
      }

      const parsed = this.parseDate(activity.date);

      if (!parsed) {
        return false;
      }

      return parsed.getFullYear() === year && parsed.getMonth() === month;
    });
  }

  /* =========================================================
     NUEVO GASTO
  ========================================================= */

  openNewExpense() {
    this.editingExpense = false;

    this.formError = "";

    this.expenseForm = {
      expense_type: "otros",
      description: "",
      amount: 0,
      expense_date: this.getTodayDate(),
      expense_time: this.getCurrentTime(),
    };

    this.showExpenseModal = true;
  }

  /* =========================================================
     EDITAR GASTO
  ========================================================= */

  editExpense(expense: Expense) {
    this.editingExpense = true;

    this.formError = "";

    this.expenseForm = {
      id: expense.id,

      expense_type: expense.expense_type,

      description: expense.description,

      amount: Number(expense.amount),

      expense_date: expense.expense_date,

      expense_time: expense.expense_time,
    };

    this.showExpenseModal = true;
  }

  /* =========================================================
     CERRAR MODAL
  ========================================================= */

  closeExpenseModal() {
    if (this.savingExpense) {
      return;
    }

    this.showExpenseModal = false;

    this.formError = "";
  }

  /* =========================================================
     GUARDAR GASTO
  ========================================================= */

  async saveExpense() {
    this.formError = "";

    const description = String(this.expenseForm.description ?? "").trim();

    const amount = Number(this.expenseForm.amount);

    const date = String(this.expenseForm.expense_date ?? "").trim();

    const time = String(this.expenseForm.expense_time ?? "").trim();

    if (!description) {
      this.formError = "La descripción es obligatoria.";

      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      this.formError = "Introduce un importe válido mayor que 0.";

      return;
    }

    if (!date) {
      this.formError = "La fecha es obligatoria.";

      return;
    }

    if (!time) {
      this.formError = "La hora es obligatoria.";

      return;
    }

    this.savingExpense = true;

    try {
      const payload = {
        expense_type: this.expenseForm.expense_type,

        description: description,

        amount: Number(amount.toFixed(2)),

        expense_date: date,

        expense_time: time,
      };

      /* =====================================================
         ACTUALIZAR
      ===================================================== */

      if (this.editingExpense && this.expenseForm.id) {
        const { data, error } = await this.supabase.supabase
          .from("expenses")
          .update(payload)
          .eq("id", this.expenseForm.id)
          .select()
          .single();

        if (error) {
          throw error;
        }

        const index = this.expenses.findIndex(
          (expense) => expense.id === this.expenseForm.id,
        );

        if (index !== -1) {
          this.expenses[index] = data as Expense;
        }
      } else {
        /* ===================================================
           CREAR
        =================================================== */

        const { data, error } = await this.supabase.supabase
          .from("expenses")
          .insert([payload])
          .select()
          .single();

        if (error) {
          throw error;
        }

        if (data) {
          this.expenses.unshift(data as Expense);
        }
      }

      await this.refreshFinancialTotals();

      this.showExpenseModal = false;
    } catch (error: any) {
      console.error("Error guardando gasto:", error);

      this.formError = error?.message || "No se ha podido guardar el gasto.";
    } finally {
      this.savingExpense = false;
    }
  }

  /* =========================================================
     ELIMINAR GASTO
  ========================================================= */

  async deleteExpense(expense: Expense) {
    if (!expense.id) {
      return;
    }

    const confirmed = window.confirm(
      `¿Quieres eliminar el gasto "${expense.description}"?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      const { error } = await this.supabase.supabase
        .from("expenses")
        .delete()
        .eq("id", expense.id);

      if (error) {
        throw error;
      }

      this.expenses = this.expenses.filter((item) => item.id !== expense.id);

      await this.refreshFinancialTotals();
    } catch (error) {
      console.error("Error eliminando gasto:", error);

      window.alert("No se ha podido eliminar el gasto.");
    }
  }

  /* =========================================================
     RECALCULAR TOTALES
  ========================================================= */

  private async refreshFinancialTotals() {
    const ingresosTotales = this.finishedJobs.reduce(
      (total: number, job: any) => {
        const amount = Number(job.total_cost ?? 0);

        return Number.isFinite(amount) ? total + amount : total;
      },
      0,
    );

    const { data: participants, error: participantsError } =
      await this.supabase.supabase
        .from("job_participants")
        .select("amount_earned, job_id");

    if (participantsError) {
      throw participantsError;
    }

    this.participants = participants ?? [];

    const totalRepartidoEmpleados = this.participants.reduce(
      (total: number, participant: any) => {
        const amount = Number(participant.amount_earned ?? 0);

        return Number.isFinite(amount) ? total + amount : total;
      },
      0,
    );

    const totalYaPagado = this.settlements.reduce(
      (total: number, settlement: any) => {
        const amount = Number(settlement.amount ?? 0);

        return Number.isFinite(amount) ? total + amount : total;
      },
      0,
    );

    const totalGastos = this.expenses.reduce(
      (total: number, expense: Expense) => {
        const amount = Number(expense.amount ?? 0);

        return Number.isFinite(amount) ? total + amount : total;
      },
      0,
    );

    const totalPendientePagar = Math.max(
      0,
      totalRepartidoEmpleados - totalYaPagado,
    );

    const gananciaNeta =
      ingresosTotales - totalRepartidoEmpleados - totalGastos;

    this.summary = {
      ingresos_totales: ingresosTotales,

      total_pendiente_pagar: totalPendientePagar,

      total_ya_pagado: totalYaPagado,

      ganancia_neta: gananciaNeta,

      total_repartido_empleados: totalRepartidoEmpleados,

      total_gastos: totalGastos,
    };

    this.repartoTotal = totalRepartidoEmpleados;

    if (this.repartoTotal > 0) {
      this.repartoPagadoPct = Math.min(
        100,
        Math.max(0, (totalYaPagado / this.repartoTotal) * 100),
      );
    } else {
      this.repartoPagadoPct = 0;
    }

    this.buildActivities();
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
     PARSEAR FECHA
  ========================================================= */

  private parseDate(value: string): Date | null {
    if (!value) {
      return null;
    }

    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);

    if (match) {
      return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    }

    const parsed = new Date(value);

    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  /* =========================================================
     TIMESTAMP
  ========================================================= */

  private getActivityTimestamp(activity: FinancialActivity): number {
    if (!activity.date) {
      return 0;
    }

    const date = this.parseDate(activity.date);

    if (!date) {
      return 0;
    }

    if (activity.time) {
      const parts = activity.time.split(":");

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

  /* =========================================================
     EXTRAER FECHA
  ========================================================= */

  private extractDate(value: string): string {
    if (!value) {
      return "";
    }

    return value.substring(0, 10);
  }

  /* =========================================================
     EXTRAER HORA
  ========================================================= */

  private extractTime(value: string): string {
    if (!value) {
      return "";
    }

    if (value.length >= 16) {
      return value.substring(11, 16);
    }

    return "";
  }

  /* =========================================================
     FECHA HOY
  ========================================================= */

  private getTodayDate(): string {
    const now = new Date();

    const year = now.getFullYear();

    const month = String(now.getMonth() + 1).padStart(2, "0");

    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  /* =========================================================
     HORA ACTUAL
  ========================================================= */

  private getCurrentTime(): string {
    const now = new Date();

    const hours = String(now.getHours()).padStart(2, "0");

    const minutes = String(now.getMinutes()).padStart(2, "0");

    return `${hours}:${minutes}`;
  }

  /* =========================================================
     TIPO TRABAJO
  ========================================================= */

  private getJobTypeLabel(type: string): string {
    if (!type) {
      return "Trabajo";
    }

    return type
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  /* =========================================================
     TIPO GASTO
  ========================================================= */

  private getExpenseTypeLabel(type: ExpenseType): string {
    const labels: Record<ExpenseType, string> = {
      pago_vehiculo: "Pago vehículo",

      combustible: "Combustible",

      material: "Material",

      herramientas: "Herramientas",

      mantenimiento: "Mantenimiento",

      peajes_parking: "Peajes / Parking",

      alquiler_equipo: "Alquiler de equipo",

      otros: "Otros",
    };

    return labels[type] || "Otros";
  }

  /* =========================================================
     ICONO GASTO
  ========================================================= */

  private getExpenseIcon(type: ExpenseType): string {
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

  /* =========================================================
     CLASE ICONO GASTO
  ========================================================= */

  private getExpenseIconClass(type: ExpenseType): string {
    switch (type) {
      case "pago_vehiculo":
        return "pago-vehiculo";

      case "combustible":
        return "combustible";

      case "material":
        return "material";

      case "herramientas":
        return "herramientas";

      case "mantenimiento":
        return "mantenimiento";

      case "peajes_parking":
        return "peajes";

      case "alquiler_equipo":
        return "alquiler";

      default:
        return "otros";
    }
  }
}
