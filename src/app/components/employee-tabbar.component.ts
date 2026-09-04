import { Component } from "@angular/core";
import { RouterLink, RouterLinkActive } from "@angular/router";
import {
  IonFooter,
  IonToolbar,
  IonButtons,
  IonButton,
  IonIcon,
  IonLabel,
} from "@ionic/angular/standalone";
import { addIcons } from "ionicons";
import { briefcaseOutline, walletOutline } from "ionicons/icons";

@Component({
  selector: "app-employee-tabbar",
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive,
    IonFooter,
    IonToolbar,
    IonButtons,
    IonButton,
    IonIcon,
    IonLabel,
  ],
  template: `
    <ion-footer class="employee-footer">
      <ion-toolbar class="employee-toolbar">
        <ion-buttons class="employee-buttons">
          <!-- TRABAJOS -->
          <ion-button
            class="tab-button"
            routerLink="/employee/trabajos"
            routerLinkActive="active-tab"
            [routerLinkActiveOptions]="{ exact: true }"
          >
            <div class="tab-content">
              <div class="icon-container">
                <ion-icon name="briefcase-outline"></ion-icon>
              </div>

              <ion-label>Trabajos</ion-label>
            </div>
          </ion-button>

          <!-- FINANZAS -->
          <ion-button
            class="tab-button"
            routerLink="/employee/finanzas"
            routerLinkActive="active-tab"
            [routerLinkActiveOptions]="{ exact: true }"
          >
            <div class="tab-content">
              <div class="icon-container">
                <ion-icon name="wallet-outline"></ion-icon>
              </div>

              <ion-label>Finanzas</ion-label>
            </div>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-footer>
  `,

  styles: [
    `
      :host {
        display: block;
      }

      /* FOOTER */

      .employee-footer {
        position: fixed;
        left: 0;
        right: 0;
        bottom: 0;
        width: 100%;
        z-index: 99999;

        margin: 0;
        padding: 0;

        background: transparent;
        box-shadow: none;
      }

      /* TOOLBAR */

      .employee-toolbar {
        --background: #ffffff;
        --border-width: 0;
        --min-height: 78px;

        border-top: 1px solid #e8edf3;

        box-shadow: 0 -5px 20px rgba(20, 40, 70, 0.08);

        padding: 7px 12px 8px;
      }

      /* BUTTONS */

      .employee-buttons {
        width: 100%;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;

        margin: 0;
        padding: 0;
      }

      .tab-button {
        --background: transparent;
        --background-activated: transparent;
        --background-focused: transparent;
        --background-hover: transparent;

        --color: #64748b;

        --padding-start: 0;
        --padding-end: 0;
        --padding-top: 0;
        --padding-bottom: 0;

        margin: 0;

        min-height: 62px;

        border-radius: 16px;

        overflow: hidden;

        transition:
          background 0.2s ease,
          color 0.2s ease,
          transform 0.15s ease;
      }

      .tab-button:active {
        transform: scale(0.97);
      }

      /* CONTENIDO */

      .tab-content {
        width: 100%;
        height: 100%;

        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;

        gap: 3px;

        border-radius: 16px;

        transition:
          background 0.2s ease,
          color 0.2s ease;
      }

      /* ICONO */

      .icon-container {
        display: flex;
        align-items: center;
        justify-content: center;

        width: 28px;
        height: 28px;

        border-radius: 9px;
      }

      .tab-button ion-icon {
        font-size: 23px;
        color: #64748b;

        transition: color 0.2s ease;
      }

      /* TEXTO */

      .tab-button ion-label {
        font-size: 11px;
        font-weight: 750;

        color: #64748b;

        transition: color 0.2s ease;
      }

      /* ===================================== */
      /* TAB ACTIVO */
      /* ===================================== */

      .tab-button.active-tab {
        --color: #ffffff;

        --background: #1769e0;

        background: #1769e0;

        color: #ffffff;

        border-radius: 16px;

        box-shadow: 0 6px 16px rgba(23, 105, 224, 0.25);
      }

      .tab-button.active-tab .tab-content {
        background: #1769e0;
        color: #ffffff;
      }

      .tab-button.active-tab ion-icon {
        color: #ffffff;
      }

      .tab-button.active-tab ion-label {
        color: #ffffff;
      }

      .tab-button.active-tab .icon-container {
        color: #ffffff;
      }

      /* ===================================== */
      /* MOBILE */
      /* ===================================== */

      @media (max-width: 600px) {
        .employee-toolbar {
          --min-height: 74px;

          padding: 6px 10px 7px;
        }

        .employee-buttons {
          gap: 8px;
        }

        .tab-button {
          min-height: 59px;
          border-radius: 15px;
        }

        .tab-content {
          border-radius: 15px;
        }

        .tab-button ion-icon {
          font-size: 21px;
        }

        .tab-button ion-label {
          font-size: 10px;
        }
      }
    `,
  ],
})
export class EmployeeTabbarComponent {
  constructor() {
    addIcons({
      briefcaseOutline,
      walletOutline,
    });
  }
}
