import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

import { IonContent, IonIcon } from "@ionic/angular/standalone";

import {
  walletOutline,
  timeOutline,
  checkmarkCircleOutline,
  trendingUpOutline,
  receiptOutline,
  addOutline,
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

type ActivityFilter = "all" | FinancialActivity["type"];

interface DayGroup {
  date: string;
  label: string;
  total: number;
  items: FinancialActivity[];
}

@Component({
  selector: "app-admin-finanzas",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonIcon,
    AdminTabbarComponent,
  ],
  template: `
    <ion-content class="fin-content" [fullscreen]="false">
      <div class="fin-wrap" *ngIf="loaded">
        <!-- 1. SELECTOR DE MES (fijo arriba al hacer scroll) -->
        <nav class="month-selector">
          <button
            type="button"
            class="month-arrow"
            (click)="previousMonth()"
            aria-label="Mes anterior"
          >
            <ion-icon name="chevron-back-outline"></ion-icon>
          </button>

          <div class="month-current">
            <ion-icon name="calendar-outline"></ion-icon>
            <strong>{{ currentMonthLabel }}</strong>
          </div>

          <button
            type="button"
            class="month-arrow"
            (click)="nextMonth()"
            aria-label="Mes siguiente"
          >
            <ion-icon name="chevron-forward-outline"></ion-icon>
          </button>
        </nav>

        <!-- 2. GANANCIA -->
        <section class="profit-card" [class.negative]="displayedProfit < 0">
          <div class="profit-icon">
            <ion-icon name="trending-up-outline"></ion-icon>
          </div>
          <span class="profit-label">Ganancia del mes</span>
          <div class="profit-value">
            {{ displayedProfit | number: "1.2-2" }}<small>€</small>
          </div>
          <span class="profit-sub">Generado − Empleados − Gastos</span>
        </section>

        <!-- 3. GENERADO / GASTOS -->
        <section class="stat-row">
          <div class="stat-card generado">
            <ion-icon name="wallet-outline"></ion-icon>
            <span class="stat-label">Generado</span>
            <span class="stat-value">
              {{ displayedGenerated | number: "1.2-2" }}<small>€</small>
            </span>
          </div>

          <div class="stat-card gastos">
            <ion-icon name="receipt-outline"></ion-icon>
            <span class="stat-label">Gastos</span>
            <span class="stat-value">
              {{ displayedExpenses | number: "1.2-2" }}<small>€</small>
            </span>
          </div>
        </section>

        <!-- 4. DEUDA CON EMPLEADOS (acumulado hasta el mes) -->
        <section class="debt-card">
          <div class="debt-title">
            <strong>Saldo con empleados</strong>
            <span>Acumulado hasta {{ currentMonthLabel }}</span>
          </div>

          <div class="debt-row">
            <div class="debt-item pendiente">
              <ion-icon name="time-outline"></ion-icon>
              <div>
                <span class="stat-label">Pendiente</span>
                <span class="debt-value">
                  {{ displayedPending | number: "1.2-2" }} €
                </span>
              </div>
            </div>

            <div class="debt-item pagado">
              <ion-icon name="checkmark-circle-outline"></ion-icon>
              <div>
                <span class="stat-label">Pagado</span>
                <span class="debt-value">
                  {{ cumulativePaid | number: "1.2-2" }} €
                </span>
              </div>
            </div>
          </div>

          <div class="split-progress" *ngIf="cumulativeEarned > 0">
            <div
              class="split-progress-fill"
              [style.width.%]="displayedPaidPercentage"
            ></div>
          </div>
          <span class="split-caption" *ngIf="cumulativeEarned > 0">
            {{ displayedPaidPercentage | number: "1.0-0" }}% del reparto saldado
          </span>
        </section>

        <!-- 5. ACTIVIDAD -->
        <section class="activity-section">
          <div class="section-title">
            <strong>Movimientos</strong>
            <span>Ingresos y salidas de {{ currentMonthLabel }}</span>
          </div>

          <div class="filter-chips">
            <button
              *ngFor="let f of filters"
              type="button"
              class="chip"
              [class.active]="activityFilter === f.value"
              (click)="setFilter(f.value)"
            >
              {{ f.label }}
            </button>
          </div>

          <div class="day-group" *ngFor="let group of groupedActivities">
            <div class="day-header">
              <span>{{ group.label }}</span>
              <span [class.neg]="group.total < 0">
                {{ group.total > 0 ? "+" : ""
                }}{{ group.total | number: "1.2-2" }} €
              </span>
            </div>

            <div class="ledger">
              <div
                class="ledger-row"
                *ngFor="let activity of group.items"
                [class.tappable]="activity.type === 'expense'"
                [attr.role]="activity.type === 'expense' ? 'button' : null"
                [attr.tabindex]="activity.type === 'expense' ? 0 : null"
                (click)="activity.expense && editExpense(activity.expense)"
                (keyup.enter)="
                  activity.expense && editExpense(activity.expense)
                "
              >
                <div class="activity-icon" [ngClass]="activity.iconClass">
                  <ion-icon [name]="activity.icon"></ion-icon>
                </div>

                <div class="ledger-main">
                  <span class="ledger-type">{{ activity.title }}</span>
                  <span class="ledger-description">{{
                    activity.description
                  }}</span>
                  <span class="ledger-date">{{
                    activity.time || "--:--"
                  }}</span>
                </div>

                <span
                  class="ledger-amount"
                  [ngClass]="{
                    income: activity.amount > 0,
                    expense: activity.amount < 0,
                  }"
                >
                  {{ activity.amount > 0 ? "+" : ""
                  }}{{ activity.amount | number: "1.2-2" }} €
                </span>
              </div>
            </div>
          </div>

          <div class="empty-state" *ngIf="groupedActivities.length === 0">
            <ion-icon name="cash-outline"></ion-icon>
            <h4>No hay movimientos en este mes</h4>
            <p>
              Los trabajos finalizados, los pagos a empleados y los gastos
              aparecerán aquí.
            </p>
          </div>
        </section>
      </div>

      <div class="loading-state" *ngIf="!loaded">
        <div class="loading-spinner"></div>
        <span>Cargando finanzas...</span>
      </div>
    </ion-content>

    <!-- BOTÓN FLOTANTE: AÑADIR GASTO -->
    <button
      type="button"
      class="fab-expense"
      *ngIf="loaded && !showExpenseModal"
      (click)="openNewExpense()"
      aria-label="Añadir gasto"
    >
      <ion-icon name="add-outline"></ion-icon>
      <span>Gasto</span>
    </button>

    <!-- MODAL GASTO -->
    <div
      class="expense-modal"
      *ngIf="showExpenseModal"
      (click)="closeExpenseModal()"
    >
      <div class="expense-modal-card" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2>{{ editingExpense ? "Editar gasto" : "Añadir gasto" }}</h2>

          <button
            type="button"
            class="modal-close"
            (click)="closeExpenseModal()"
            aria-label="Cerrar"
          >
            <ion-icon name="close-outline"></ion-icon>
          </button>
        </div>

        <div class="expense-form">
          <label class="form-field">
            <span>Tipo de gasto</span>
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

          <label class="form-field">
            <span>Descripción *</span>
            <input
              type="text"
              [(ngModel)]="expenseForm.description"
              placeholder="Ej. Gasolina vehículo"
              maxlength="200"
            />
          </label>

          <label class="form-field">
            <span>Importe *</span>
            <div class="input-with-symbol">
              <input
                type="number"
                inputmode="decimal"
                [(ngModel)]="expenseForm.amount"
                min="0"
                step="0.01"
                placeholder="0.00"
              />
              <span>€</span>
            </div>
          </label>

          <div class="form-grid">
            <label class="form-field">
              <span>Fecha *</span>
              <input type="date" [(ngModel)]="expenseForm.expense_date" />
            </label>

            <label class="form-field">
              <span>Hora *</span>
              <input type="time" [(ngModel)]="expenseForm.expense_time" />
            </label>
          </div>

          <div class="form-error" *ngIf="formError">{{ formError }}</div>

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
              {{
                savingExpense
                  ? "Guardando..."
                  : editingExpense
                    ? "Guardar cambios"
                    : "Guardar gasto"
              }}
            </button>
          </div>

          <button
            type="button"
            class="delete-button"
            *ngIf="editingExpense"
            (click)="deleteFromModal()"
            [disabled]="savingExpense"
          >
            <ion-icon name="trash-outline"></ion-icon>
            Eliminar gasto
          </button>
        </div>
      </div>
    </div>

    <div class="admin-tabbar-container">
      <app-admin-tabbar></app-admin-tabbar>
    </div>
  `,
  styles: [
    `
      :host {
        /* Altura real del header del layout padre */
        --admin-header-offset: calc(78px + env(safe-area-inset-top));

        --finance-bg: #f8fafc;
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
        --finance-shadow: 0 4px 18px rgba(24, 47, 83, 0.05);
      }

      /* ---------- Contenedor ---------- */

      .fin-content {
        --background: var(--finance-bg);
        --padding-top: 0;
        --padding-bottom: 0;
      }

      .fin-wrap {
        width: 100%;
        max-width: 900px;
        margin: 0 auto;
        padding: var(--admin-header-offset) 14px 190px;
        box-sizing: border-box;
      }

      /* ---------- Selector de mes ---------- */

      .month-selector {
        position: sticky;
        top: var(--admin-header-offset);
        z-index: 20;
        display: grid;
        grid-template-columns: 44px minmax(0, 1fr) 44px;
        align-items: center;
        gap: 6px;
        padding: 10px 0;
        background: var(--finance-bg);
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
        font-size: 21px;
      }

      .month-arrow:active {
        background: var(--finance-primary-light);
      }

      .month-current {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        min-height: 44px;
        border: 1px solid var(--finance-border);
        border-radius: 14px;
        background: #ffffff;
        color: var(--finance-primary-dark);
      }

      .month-current ion-icon {
        font-size: 19px;
        color: var(--finance-primary);
      }

      .month-current strong {
        font-size: 15px;
        font-weight: 800;
        text-transform: capitalize;
      }

      /* ---------- Ganancia ---------- */

      .profit-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 22px 16px 20px;
        margin-bottom: 12px;
        text-align: center;
        background: #ffffff;
        border: 1px solid var(--finance-border);
        border-top: 5px solid var(--finance-teal);
        border-radius: 20px;
        box-shadow: var(--finance-shadow);
      }

      .profit-icon {
        width: 42px;
        height: 42px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 8px;
        border-radius: 13px;
        background: var(--finance-teal-bg);
        color: var(--finance-teal);
        font-size: 23px;
      }

      .profit-label {
        color: var(--finance-text-soft);
        font-size: 0.8rem;
        font-weight: 700;
      }

      .profit-value {
        margin-top: 4px;
        color: var(--finance-teal);
        font-size: 2.6rem;
        font-weight: 800;
        line-height: 1.1;
        letter-spacing: -1px;
        font-variant-numeric: tabular-nums;
      }

      .profit-value small {
        margin-left: 4px;
        font-size: 1.1rem;
        font-weight: 600;
      }

      .profit-sub {
        margin-top: 6px;
        color: var(--finance-muted);
        font-size: 0.72rem;
      }

      .profit-card.negative {
        border-top-color: var(--finance-red);
      }

      .profit-card.negative .profit-icon {
        background: var(--finance-red-bg);
        color: var(--finance-red);
      }

      .profit-card.negative .profit-value {
        color: var(--finance-red);
      }

      /* ---------- Cifras (Generado / Gastos) ---------- */

      .stat-row {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
        margin-bottom: 12px;
      }

      .stat-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 3px;
        padding: 12px 4px;
        text-align: center;
        background: #ffffff;
        border: 1px solid var(--finance-border);
        border-radius: 16px;
        box-shadow: var(--finance-shadow);
      }

      .stat-card > ion-icon {
        font-size: 22px;
        margin-bottom: 2px;
      }

      .stat-label {
        display: block;
        color: var(--finance-text-soft);
        font-size: 0.68rem;
        font-weight: 700;
      }

      .stat-value {
        font-size: 0.95rem;
        font-weight: 800;
        font-variant-numeric: tabular-nums;
      }

      .stat-value small {
        margin-left: 2px;
        font-size: 0.7rem;
      }

      .stat-card.generado > ion-icon,
      .stat-card.generado .stat-value {
        color: var(--finance-primary);
      }

      .stat-card.gastos > ion-icon,
      .stat-card.gastos .stat-value {
        color: var(--finance-red);
      }

      /* ---------- Saldo con empleados ---------- */

      .debt-card {
        padding: 14px;
        margin-bottom: 18px;
        background: #ffffff;
        border: 1px solid var(--finance-border);
        border-radius: 18px;
        box-shadow: var(--finance-shadow);
      }

      .debt-title {
        display: flex;
        flex-direction: column;
        gap: 2px;
        margin-bottom: 12px;
      }

      .debt-title strong,
      .section-title strong {
        color: var(--finance-text);
        font-size: 0.92rem;
        font-weight: 800;
      }

      .debt-title span,
      .section-title span {
        color: var(--finance-text-soft);
        font-size: 0.72rem;
        text-transform: capitalize;
      }

      .section-title span {
        text-transform: none;
      }

      .debt-row {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
      }

      .debt-item {
        display: flex;
        align-items: center;
        gap: 9px;
        padding: 10px;
        border-radius: 14px;
      }

      .debt-item ion-icon {
        font-size: 24px;
        flex: 0 0 24px;
      }

      .debt-item.pendiente {
        background: var(--finance-orange-bg);
        color: var(--finance-orange);
      }

      .debt-item.pagado {
        background: var(--finance-green-bg);
        color: var(--finance-green);
      }

      .debt-value {
        display: block;
        margin-top: 1px;
        font-size: 1rem;
        font-weight: 800;
        font-variant-numeric: tabular-nums;
      }

      .split-progress {
        height: 6px;
        margin-top: 12px;
        overflow: hidden;
        border-radius: 20px;
        background: #e7ebf1;
      }

      .split-progress-fill {
        height: 100%;
        border-radius: inherit;
        background: linear-gradient(90deg, #1769ff, #4385ff);
        transition: width 0.4s ease;
      }

      .split-caption {
        display: block;
        margin-top: 6px;
        color: var(--finance-text-soft);
        font-size: 0.7rem;
      }

      /* ---------- Movimientos ---------- */

      .section-title {
        display: flex;
        flex-direction: column;
        gap: 2px;
        margin: 0 2px 10px;
      }

      .filter-chips {
        display: flex;
        gap: 8px;
        padding: 0 2px 12px;
        overflow-x: auto;
        scrollbar-width: none;
      }

      .filter-chips::-webkit-scrollbar {
        display: none;
      }

      .chip {
        flex: 0 0 auto;
        min-height: 38px;
        padding: 0 16px;
        border: 1px solid var(--finance-border);
        border-radius: 999px;
        background: #ffffff;
        color: var(--finance-text-soft);
        font-family: inherit;
        font-size: 0.78rem;
        font-weight: 700;
      }

      .chip.active {
        background: var(--finance-primary);
        border-color: var(--finance-primary);
        color: #ffffff;
      }

      .day-group {
        margin-bottom: 14px;
      }

      .day-header {
        display: flex;
        justify-content: space-between;
        padding: 0 4px 6px;
        color: var(--finance-text-soft);
        font-size: 0.74rem;
        font-weight: 800;
        text-transform: capitalize;
        font-variant-numeric: tabular-nums;
      }

      .day-header .neg {
        color: var(--finance-red);
      }

      .ledger {
        overflow: hidden;
        background: #ffffff;
        border: 1px solid var(--finance-border);
        border-radius: 16px;
        box-shadow: var(--finance-shadow);
      }

      .ledger-row {
        display: flex;
        align-items: center;
        gap: 11px;
        min-height: 72px;
        padding: 12px;
        box-sizing: border-box;
        border-bottom: 1px solid #edf0f4;
      }

      .ledger-row:last-child {
        border-bottom: none;
      }

      .ledger-row.tappable:active {
        background: #f6f8fb;
      }

      .activity-icon {
        width: 40px;
        height: 40px;
        flex: 0 0 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 12px;
        font-size: 20px;
      }

      .activity-icon.income {
        background: var(--finance-green-bg);
        color: var(--finance-green);
      }

      .activity-icon.settlement {
        background: var(--finance-orange-bg);
        color: var(--finance-orange);
      }

      .activity-icon.expense {
        background: var(--finance-red-bg);
        color: var(--finance-red);
      }

      .activity-icon.pago-vehiculo,
      .activity-icon.alquiler {
        background: #edf4ff;
        color: var(--finance-primary);
      }

      .activity-icon.combustible {
        background: var(--finance-orange-bg);
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
        background: var(--finance-red-bg);
        color: var(--finance-red);
      }

      .activity-icon.peajes,
      .activity-icon.otros {
        background: #f2f4f7;
        color: var(--finance-text-soft);
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
        font-size: 0.86rem;
        font-weight: 800;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .ledger-description {
        margin-top: 2px;
        overflow: hidden;
        color: var(--finance-text-soft);
        font-size: 0.74rem;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .ledger-date {
        margin-top: 3px;
        color: var(--finance-muted);
        font-size: 0.68rem;
      }

      .ledger-amount {
        margin-left: 4px;
        font-size: 0.88rem;
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

      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 32px 18px;
        text-align: center;
        background: #ffffff;
        border: 1px dashed #dce7fa;
        border-radius: 16px;
      }

      .empty-state ion-icon {
        font-size: 34px;
        color: var(--finance-primary);
      }

      .empty-state h4 {
        margin: 10px 0 6px;
        color: var(--finance-text);
        font-size: 0.92rem;
        font-weight: 800;
      }

      .empty-state p {
        max-width: 280px;
        margin: 0;
        color: var(--finance-text-soft);
        font-size: 0.78rem;
        line-height: 1.5;
      }

      /* ---------- Botón flotante ---------- */

      .fab-expense {
        position: fixed;
        right: 16px;
        bottom: calc(86px + env(safe-area-inset-bottom));
        z-index: 900;
        display: flex;
        align-items: center;
        gap: 6px;
        min-height: 52px;
        padding: 0 20px 0 14px;
        border: 0;
        border-radius: 999px;
        background: var(--finance-red);
        color: #ffffff;
        font-family: inherit;
        font-size: 0.88rem;
        font-weight: 800;
        box-shadow: 0 8px 20px rgba(223, 69, 69, 0.32);
      }

      .fab-expense ion-icon {
        font-size: 24px;
      }

      .fab-expense:active {
        transform: scale(0.96);
      }

      /* ---------- Modal ---------- */

      .expense-modal {
        position: fixed;
        inset: 0;
        z-index: 9999;
        display: flex;
        align-items: flex-end;
        justify-content: center;
        padding: 0;
        background: rgba(15, 30, 55, 0.45);
      }

      .expense-modal-card {
        width: min(100%, 520px);
        max-height: 92dvh;
        overflow-y: auto;
        overscroll-behavior: contain;
        padding: 20px 18px calc(20px + env(safe-area-inset-bottom));
        box-sizing: border-box;
        background: #ffffff;
        border-radius: 24px 24px 0 0;
      }

      .modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 18px;
      }

      .modal-header h2 {
        margin: 0;
        color: var(--finance-text);
        font-size: 1.2rem;
        font-weight: 800;
      }

      .modal-close {
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        border: 0;
        border-radius: 12px;
        background: #f1f4f8;
        color: var(--finance-text-soft);
        font-size: 21px;
      }

      .expense-form {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }

      .form-field {
        display: flex;
        flex-direction: column;
        gap: 6px;
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
        font-size: 16px; /* evita el zoom automático en iOS */
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
        font-weight: 700;
      }

      .form-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
      }

      .form-error {
        padding: 11px 13px;
        border-radius: 11px;
        background: var(--finance-red-bg);
        color: var(--finance-red);
        font-size: 0.78rem;
        font-weight: 700;
      }

      .modal-actions {
        display: grid;
        grid-template-columns: 1fr 1.3fr;
        gap: 10px;
      }

      .cancel-button,
      .save-button,
      .delete-button {
        min-height: 50px;
        border: 0;
        border-radius: 13px;
        font-family: inherit;
        font-size: 0.88rem;
        font-weight: 800;
      }

      .cancel-button {
        background: #f1f4f8;
        color: var(--finance-text-soft);
      }

      .save-button {
        background: var(--finance-primary);
        color: #ffffff;
      }

      .delete-button {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        background: var(--finance-red-bg);
        color: var(--finance-red);
      }

      .cancel-button:disabled,
      .save-button:disabled,
      .delete-button:disabled {
        opacity: 0.55;
      }

      /* ---------- Carga y tabbar ---------- */

      .loading-state {
        min-height: 65vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 14px;
        padding-top: var(--admin-header-offset);
        box-sizing: border-box;
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

      .admin-tabbar-container {
        position: fixed;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 1000;
        background: #ffffff;
        border-top: 1px solid var(--finance-border);
        box-shadow: 0 -6px 20px rgba(24, 47, 83, 0.08);
        padding-bottom: env(safe-area-inset-bottom);
      }

      @media (prefers-reduced-motion: reduce) {
        .split-progress-fill,
        .loading-spinner {
          transition: none;
          animation-duration: 2s;
        }
      }

      /* ---------- Pantallas grandes ---------- */

      @media (min-width: 768px) {
        :host {
          --admin-header-offset: calc(82px + env(safe-area-inset-top));
        }

        .fin-wrap {
          padding: var(--admin-header-offset) 30px 190px;
        }

        .profit-value {
          font-size: 3.4rem;
        }

        .stat-value {
          font-size: 1.15rem;
        }

        .expense-modal {
          align-items: center;
          padding: 20px;
        }

        .expense-modal-card {
          border-radius: 24px;
        }

        .fab-expense {
          right: calc(50% - 450px + 16px);
        }
      }

      /* ---------- Móviles muy pequeños ---------- */

      @media (max-width: 380px) {
        :host {
          --admin-header-offset: calc(70px + env(safe-area-inset-top));
        }

        .fin-wrap {
          padding-left: 10px;
          padding-right: 10px;
        }

        .stat-value {
          font-size: 0.85rem;
        }

        .form-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class AdminFinanzasPage implements OnInit {
  /* ---------- Datos ---------- */

  loaded = false;

  finishedJobs: any[] = [];
  settlements: any[] = [];
  participants: any[] = [];
  expenses: Expense[] = [];

  activities: FinancialActivity[] = [];
  filteredActivities: FinancialActivity[] = [];
  groupedActivities: DayGroup[] = [];

  /* ---------- Mes y filtro ---------- */

  selectedMonth = new Date();

  activityFilter: ActivityFilter = "all";

  readonly filters = [
    { value: "all", label: "Todo" },
    { value: "job", label: "Ingresos" },
    { value: "settlement", label: "Pagos" },
    { value: "expense", label: "Gastos" },
  ] as const;

  /* ---------- Modal ---------- */

  showExpenseModal = false;
  editingExpense = false;
  savingExpense = false;
  formError = "";

  expenseForm: Expense = this.emptyExpense();

  constructor(private supabase: SupabaseService) {
    addIcons({
      "wallet-outline": walletOutline,
      "time-outline": timeOutline,
      "checkmark-circle-outline": checkmarkCircleOutline,
      "trending-up-outline": trendingUpOutline,
      "receipt-outline": receiptOutline,
      "add-outline": addOutline,
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

  async ngOnInit() {
    await this.loadFinancialData();
  }

  /* =========================================================
     CÁLCULOS DEL MES SELECCIONADO
  ========================================================= */

  get currentMonthLabel(): string {
    return this.selectedMonth.toLocaleDateString("es-ES", {
      month: "long",
      year: "numeric",
    });
  }

  get monthlyFinishedJobs(): any[] {
    return this.finishedJobs.filter((job: any) =>
      this.isInSelectedMonth(this.jobDate(job)),
    );
  }

  /** Facturado en trabajos finalizados del mes. */
  get displayedGenerated(): number {
    return this.sum(this.monthlyFinishedJobs, (job) => job.total_cost);
  }

  /** Repartido a empleados por los trabajos finalizados del mes. */
  get displayedDistributed(): number {
    const ids = new Set(this.monthlyFinishedJobs.map((j) => String(j.id)));

    return this.sum(
      this.participants.filter((p) => ids.has(String(p.job_id ?? ""))),
      (p) => p.amount_earned,
    );
  }

  /** Gastos registrados en el mes. */
  get displayedExpenses(): number {
    return this.sum(
      this.expenses.filter((e) => this.isInSelectedMonth(e.expense_date)),
      (e) => e.amount,
    );
  }

  /** Ganancia del mes = generado − repartido − gastos. */
  get displayedProfit(): number {
    return (
      this.displayedGenerated -
      this.displayedDistributed -
      this.displayedExpenses
    );
  }

  /** Lo que se ha ganado en total hasta el mes seleccionado (acumulado). */
  get cumulativeEarned(): number {
    const ids = new Set(
      this.finishedJobs
        .filter((job) => this.isUpToSelectedMonth(this.jobDate(job)))
        .map((job) => String(job.id)),
    );

    return this.sum(
      this.participants.filter((p) => ids.has(String(p.job_id ?? ""))),
      (p) => p.amount_earned,
    );
  }

  /** Lo que se ha pagado en total hasta el mes seleccionado (acumulado). */
  get cumulativePaid(): number {
    return this.sum(
      this.settlements.filter((s) =>
        this.isUpToSelectedMonth(this.settlementDate(s)),
      ),
      (s) => s.amount,
    );
  }

  /** Pendiente de pago a empleados, acumulado hasta el mes. */
  get displayedPending(): number {
    return Math.max(0, this.cumulativeEarned - this.cumulativePaid);
  }

  get displayedPaidPercentage(): number {
    if (this.cumulativeEarned <= 0) {
      return 0;
    }

    return Math.min(
      100,
      Math.max(0, (this.cumulativePaid / this.cumulativeEarned) * 100),
    );
  }

  /* =========================================================
     NAVEGACIÓN Y FILTROS
  ========================================================= */

  previousMonth() {
    this.selectedMonth = new Date(
      this.selectedMonth.getFullYear(),
      this.selectedMonth.getMonth() - 1,
      1,
    );

    this.updateFilteredActivities();
  }

  nextMonth() {
    this.selectedMonth = new Date(
      this.selectedMonth.getFullYear(),
      this.selectedMonth.getMonth() + 1,
      1,
    );

    this.updateFilteredActivities();
  }

  setFilter(filter: ActivityFilter) {
    this.activityFilter = filter;

    this.updateFilteredActivities();
  }

  /* =========================================================
     CARGA DE DATOS
  ========================================================= */

  private async loadFinancialData() {
    try {
      this.loaded = false;

      const { data: jobs, error: jobsError } = await this.supabase.supabase
        .from("jobs")
        .select("*")
        .eq("status", "finalizado")
        .order("job_date", { ascending: false });

      if (jobsError) {
        throw jobsError;
      }

      this.finishedJobs = jobs ?? [];

      const [participants, settlementsRes, profilesRes, expensesRes] =
        await Promise.all([
          this.fetchParticipants(),
          this.supabase.supabase
            .from("settlements")
            .select("*")
            .order("settlement_date", { ascending: false }),
          this.supabase.supabase.from("profiles").select("id, full_name"),
          this.supabase.supabase
            .from("expenses")
            .select("*")
            .order("expense_date", { ascending: false }),
        ]);

      if (settlementsRes.error) {
        throw settlementsRes.error;
      }

      if (profilesRes.error) {
        throw profilesRes.error;
      }

      this.participants = participants;

      const profileMap = new Map<string, string>();

      for (const profile of profilesRes.data ?? []) {
        if (profile.id && profile.full_name) {
          profileMap.set(
            String(profile.id).trim(),
            String(profile.full_name).trim(),
          );
        }
      }

      this.settlements = (settlementsRes.data ?? []).map((s: any) => ({
        ...s,
        employee_name:
          profileMap.get(String(s.employee_id ?? "").trim()) || "Empleado",
      }));

      if (expensesRes.error) {
        console.error("Error obteniendo gastos:", expensesRes.error);

        this.expenses = [];
      } else {
        this.expenses = (expensesRes.data ?? []) as Expense[];
      }

      this.buildActivities();
    } catch (error) {
      console.error("Error cargando las finanzas:", error);

      this.finishedJobs = [];
      this.settlements = [];
      this.participants = [];
      this.expenses = [];
      this.activities = [];
      this.filteredActivities = [];
      this.groupedActivities = [];
    } finally {
      this.loaded = true;
    }
  }

  /** Participantes SOLO de trabajos finalizados. */
  private async fetchParticipants(): Promise<any[]> {
    const ids = this.finishedJobs.map((job: any) => job.id).filter(Boolean);

    if (ids.length === 0) {
      return [];
    }

    const { data, error } = await this.supabase.supabase
      .from("job_participants")
      .select("*")
      .in("job_id", ids);

    if (error) {
      throw error;
    }

    return data ?? [];
  }

  /* =========================================================
     MOVIMIENTOS
  ========================================================= */

  private buildActivities() {
    const activities: FinancialActivity[] = [];

    for (const job of this.finishedJobs) {
      const amount = this.num(job.total_cost);

      activities.push({
        id: `job-${job.id}`,
        type: "job",
        title: this.getJobTypeLabel(job.job_type),
        description: job.client_name
          ? `Trabajo finalizado · ${job.client_name}`
          : "Trabajo finalizado",
        date: this.jobDate(job),
        time:
          this.shortTime(job.start_time) || this.extractTime(job.created_at),
        amount,
        icon: "receipt-outline",
        iconClass: "income",
      });
    }

    for (const settlement of this.settlements) {
      const employeeName =
        settlement.employee_name ||
        settlement.full_name ||
        settlement.name ||
        "Empleado";

      activities.push({
        id: `settlement-${settlement.id}`,
        type: "settlement",
        title: `Pago a ${employeeName}`,
        description: "Saldo de empleado",
        date: this.settlementDate(settlement),
        time:
          this.shortTime(settlement.time) ||
          this.extractTime(settlement.created_at),
        amount: -Math.abs(this.num(settlement.amount)),
        icon: "cash-outline",
        iconClass: "settlement",
      });
    }

    for (const expense of this.expenses) {
      activities.push({
        id: `expense-${expense.id}`,
        type: "expense",
        title: this.getExpenseTypeLabel(expense.expense_type),
        description: expense.description,
        date: expense.expense_date,
        time: this.shortTime(expense.expense_time),
        amount: -Math.abs(this.num(expense.amount)),
        icon: this.getExpenseIcon(expense.expense_type),
        iconClass: `expense ${this.getExpenseIconClass(expense.expense_type)}`,
        expense,
      });
    }

    activities.sort(
      (a, b) => this.getActivityTimestamp(b) - this.getActivityTimestamp(a),
    );

    this.activities = activities;

    this.updateFilteredActivities();
  }

  /** Filtra por mes y por tipo, y agrupa por día. */
  private updateFilteredActivities() {
    this.filteredActivities = this.activities.filter((activity) => {
      if (!this.isInSelectedMonth(activity.date)) {
        return false;
      }

      return (
        this.activityFilter === "all" || activity.type === this.activityFilter
      );
    });

    const groups: DayGroup[] = [];

    for (const activity of this.filteredActivities) {
      const key = activity.date.substring(0, 10);

      let group = groups[groups.length - 1];

      if (!group || group.date !== key) {
        group = { date: key, label: this.dayLabel(key), total: 0, items: [] };

        groups.push(group);
      }

      group.items.push(activity);
      group.total += activity.amount;
    }

    this.groupedActivities = groups;
  }

  private dayLabel(date: string): string {
    const yesterday = new Date();

    yesterday.setDate(yesterday.getDate() - 1);

    if (date === this.getTodayDate()) {
      return "Hoy";
    }

    if (date === this.toDateString(yesterday)) {
      return "Ayer";
    }

    return (
      this.parseDate(date)?.toLocaleDateString("es-ES", {
        weekday: "short",
        day: "numeric",
        month: "short",
      }) ?? date
    );
  }

  /* =========================================================
     GASTOS (CRUD)
  ========================================================= */

  openNewExpense() {
    this.editingExpense = false;
    this.formError = "";
    this.expenseForm = this.emptyExpense();
    this.showExpenseModal = true;
  }

  editExpense(expense: Expense) {
    this.editingExpense = true;
    this.formError = "";

    this.expenseForm = {
      id: expense.id,
      expense_type: expense.expense_type,
      description: expense.description,
      amount: Number(expense.amount),
      expense_date: expense.expense_date,
      expense_time: this.shortTime(expense.expense_time),
    };

    this.showExpenseModal = true;
  }

  closeExpenseModal() {
    if (this.savingExpense) {
      return;
    }

    this.showExpenseModal = false;
    this.formError = "";
  }

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
        description,
        amount: Number(amount.toFixed(2)),
        expense_date: date,
        expense_time: time,
      };

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

        this.expenses = this.expenses.map((expense) =>
          expense.id === this.expenseForm.id ? (data as Expense) : expense,
        );
      } else {
        const { data, error } = await this.supabase.supabase
          .from("expenses")
          .insert([payload])
          .select()
          .single();

        if (error) {
          throw error;
        }

        if (data) {
          this.expenses = [data as Expense, ...this.expenses];
        }
      }

      this.buildActivities();

      this.showExpenseModal = false;
    } catch (error: any) {
      console.error("Error guardando gasto:", error);

      this.formError = error?.message || "No se ha podido guardar el gasto.";
    } finally {
      this.savingExpense = false;
    }
  }

  async deleteFromModal() {
    const deleted = await this.deleteExpense(this.expenseForm);

    if (deleted) {
      this.showExpenseModal = false;
    }
  }

  async deleteExpense(expense: Expense): Promise<boolean> {
    if (!expense.id) {
      return false;
    }

    if (
      !window.confirm(`¿Quieres eliminar el gasto "${expense.description}"?`)
    ) {
      return false;
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

      this.buildActivities();

      return true;
    } catch (error) {
      console.error("Error eliminando gasto:", error);

      window.alert("No se ha podido eliminar el gasto.");

      return false;
    }
  }

  /* =========================================================
     UTILIDADES DE IMPORTES Y FECHAS
  ========================================================= */

  private num(value: any): number {
    const n = Number(value ?? 0);

    return Number.isFinite(n) ? n : 0;
  }

  private sum<T>(items: T[], pick: (item: T) => any): number {
    return items.reduce((total, item) => total + this.num(pick(item)), 0);
  }

  private jobDate(job: any): string {
    return job.job_date || this.extractDate(job.created_at);
  }

  private settlementDate(settlement: any): string {
    return (
      settlement.settlement_date ||
      settlement.payment_date ||
      settlement.date ||
      this.extractDate(settlement.created_at)
    );
  }

  private monthIndex(date: Date): number {
    return date.getFullYear() * 12 + date.getMonth();
  }

  private isInSelectedMonth(value: string): boolean {
    const parsed = this.parseDate(value);

    return (
      !!parsed &&
      this.monthIndex(parsed) === this.monthIndex(this.selectedMonth)
    );
  }

  private isUpToSelectedMonth(value: string): boolean {
    const parsed = this.parseDate(value);

    return (
      !!parsed && this.monthIndex(parsed) <= this.monthIndex(this.selectedMonth)
    );
  }

  private parseDate(value: string): Date | null {
    if (!value) {
      return null;
    }

    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})(?!T)/);

    if (match) {
      return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    }

    const parsed = new Date(value);

    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private getActivityTimestamp(activity: FinancialActivity): number {
    const date = this.parseDate(activity.date);

    if (!date) {
      return 0;
    }

    if (activity.time) {
      const [h, m, s] = activity.time.split(":").map(Number);

      date.setHours(h || 0, m || 0, s || 0);
    }

    return date.getTime();
  }

  private toDateString(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${date.getFullYear()}-${month}-${day}`;
  }

  /** Fecha local (YYYY-MM-DD). Si viene un timestamp ISO, lo pasa a hora local. */
  private extractDate(value: string): string {
    if (!value) {
      return "";
    }

    if (value.length > 10 && value.includes("T")) {
      const parsed = new Date(value);

      if (!Number.isNaN(parsed.getTime())) {
        return this.toDateString(parsed);
      }
    }

    return value.substring(0, 10);
  }

  /** Hora local (HH:mm) de un timestamp ISO. */
  private extractTime(value: string): string {
    if (!value || value.length < 16) {
      return "";
    }

    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
      return value.substring(11, 16);
    }

    return `${String(parsed.getHours()).padStart(2, "0")}:${String(
      parsed.getMinutes(),
    ).padStart(2, "0")}`;
  }

  private shortTime(value: string | undefined | null): string {
    return value ? String(value).substring(0, 5) : "";
  }

  private getTodayDate(): string {
    return this.toDateString(new Date());
  }

  private getCurrentTime(): string {
    const now = new Date();

    return `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes(),
    ).padStart(2, "0")}`;
  }

  private emptyExpense(): Expense {
    return {
      expense_type: "otros",
      description: "",
      amount: 0,
      expense_date: this.getTodayDate(),
      expense_time: this.getCurrentTime(),
    };
  }

  /* =========================================================
     ETIQUETAS E ICONOS
  ========================================================= */

  private getJobTypeLabel(type: string): string {
    if (!type) {
      return "Trabajo";
    }

    return type
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

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

  private getExpenseIcon(type: ExpenseType): string {
    switch (type) {
      case "pago_vehiculo":
        return "car-outline";
      case "combustible":
        return "flame-outline";
      case "material":
      case "mantenimiento":
        return "construct-outline";
      case "herramientas":
        return "build-outline";
      case "peajes_parking":
        return "speedometer-outline";
      case "alquiler_equipo":
        return "business-outline";
      default:
        return "receipt-outline";
    }
  }

  private getExpenseIconClass(type: ExpenseType): string {
    switch (type) {
      case "pago_vehiculo":
        return "pago-vehiculo";
      case "peajes_parking":
        return "peajes";
      case "alquiler_equipo":
        return "alquiler";
      default:
        return type || "otros";
    }
  }
}
