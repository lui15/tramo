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
import {
  cashOutline,
  briefcaseOutline,
  peopleOutline,
  timeOutline,
} from "ionicons/icons";

@Component({
  selector: "app-admin-tabbar",
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
    <ion-footer class="admin-footer">
      <ion-toolbar class="admin-toolbar">
        <ion-buttons class="admin-buttons">
          <!-- FINANZAS -->
          <ion-button
            class="admin-tab"
            routerLink="/admin/finanzas"
            routerLinkActive="active-tab"
            [routerLinkActiveOptions]="{ exact: true }"
          >
            <div class="tab-content">
              <ion-icon name="cash-outline"></ion-icon>
              <ion-label>Finanzas</ion-label>
            </div>
          </ion-button>

          <!-- TRABAJOS -->
          <ion-button
            class="admin-tab"
            routerLink="/admin/trabajos"
            routerLinkActive="active-tab"
            [routerLinkActiveOptions]="{ exact: true }"
          >
            <div class="tab-content">
              <ion-icon name="briefcase-outline"></ion-icon>
              <ion-label>Trabajos</ion-label>
            </div>
          </ion-button>

          <!-- EMPLEADOS -->
          <ion-button
            class="admin-tab"
            routerLink="/admin/empleados"
            routerLinkActive="active-tab"
            [routerLinkActiveOptions]="{ exact: true }"
          >
            <div class="tab-content">
              <ion-icon name="people-outline"></ion-icon>
              <ion-label>Empleados</ion-label>
            </div>
          </ion-button>

          <!-- HISTORIAL -->
          <ion-button
            class="admin-tab"
            routerLink="/admin/historial"
            routerLinkActive="active-tab"
            [routerLinkActiveOptions]="{ exact: true }"
          >
            <div class="tab-content">
              <ion-icon name="time-outline"></ion-icon>
              <ion-label>Historial</ion-label>
            </div>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-footer>
  `,

  styles: [
    `
      /* =========================================================
       BARRA INFERIOR
       ========================================================= */

      .admin-footer {
        --background: #ffffff;

        background: #ffffff;

        border-top: 1px solid #e5eaf1;

        box-shadow: 0 -5px 20px rgba(24, 47, 83, 0.08);

        z-index: 1000;
      }

      /* =========================================================
       TOOLBAR
       ========================================================= */

      .admin-toolbar {
        --background: #ffffff;

        --border-width: 0;

        height: 72px;

        padding: 6px 8px;

        box-sizing: border-box;
      }

      /* =========================================================
       BOTONES
       ========================================================= */

      .admin-buttons {
        display: flex;

        align-items: center;
        justify-content: space-around;

        width: 100%;
        height: 100%;

        margin: 0;
        padding: 0;
      }

      .admin-tab {
        --background: transparent;
        --background-activated: transparent;
        --background-focused: transparent;
        --background-hover: transparent;

        --color: #61708a;

        --padding-start: 0;
        --padding-end: 0;
        --padding-top: 0;
        --padding-bottom: 0;

        --border-radius: 14px;

        width: 25%;
        max-width: 110px;

        height: 58px;

        margin: 0;

        color: #61708a;

        transition:
          background 0.2s ease,
          color 0.2s ease,
          transform 0.15s ease;
      }

      /* =========================================================
       CONTENIDO DEL BOTÓN
       ========================================================= */

      .tab-content {
        display: flex;

        flex-direction: column;

        align-items: center;
        justify-content: center;

        gap: 3px;

        width: 100%;
        height: 100%;

        border-radius: 14px;

        box-sizing: border-box;

        padding: 6px 8px;
      }

      .tab-content ion-icon {
        font-size: 22px;

        color: #61708a;

        transition:
          color 0.2s ease,
          transform 0.2s ease;
      }

      .tab-content ion-label {
        margin: 0;

        color: #61708a;

        font-size: 11px;

        font-weight: 700;

        line-height: 1;
        text-align: center;

        transition: color 0.2s ease;
      }

      /* =========================================================
       APARTADO ACTIVO
       
       ESTE ES EL CAMBIO IMPORTANTE
       ========================================================= */

      .admin-tab.active-tab {
        --background: #1769ff;
        --color: #ffffff;

        background: #1769ff;

        color: #ffffff;

        border-radius: 14px;

        box-shadow: 0 5px 14px rgba(23, 105, 255, 0.22);

        transform: translateY(-1px);
      }

      .admin-tab.active-tab .tab-content {
        background: #1769ff;
      }

      .admin-tab.active-tab ion-icon {
        color: #ffffff;

        transform: translateY(-1px);
      }

      .admin-tab.active-tab ion-label {
        color: #ffffff;

        font-weight: 800;
      }

      /* =========================================================
       EFECTO AL PULSAR
       ========================================================= */

      .admin-tab:active {
        transform: scale(0.96);
      }

      /* =========================================================
       MÓVIL PEQUEÑO
       ========================================================= */

      @media (max-width: 380px) {
        .admin-toolbar {
          height: 68px;

          padding-left: 5px;
          padding-right: 5px;
        }

        .admin-tab {
          height: 54px;

          max-width: 90px;
        }

        .tab-content {
          padding-left: 4px;
          padding-right: 4px;
        }

        .tab-content ion-icon {
          font-size: 20px;
        }

        .tab-content ion-label {
          font-size: 10px;
        }
      }

      /* =========================================================
       TABLET / PC
       ========================================================= */

      @media (min-width: 768px) {
        .admin-toolbar {
          height: 76px;
        }

        .admin-tab {
          height: 62px;

          max-width: 120px;
        }

        .tab-content ion-icon {
          font-size: 23px;
        }

        .tab-content ion-label {
          font-size: 12px;
        }
      }
    `,
  ],
})
export class AdminTabbarComponent {
  constructor() {
    addIcons({
      cashOutline,
      briefcaseOutline,
      peopleOutline,
      timeOutline,
    });
  }
}
