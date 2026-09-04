import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";

import {
  IonHeader,
  IonToolbar,
  IonButton,
  IonIcon,
} from "@ionic/angular/standalone";

import { addIcons } from "ionicons";
import { logOutOutline } from "ionicons/icons";

import { SupabaseService, Profile } from "../services/supabase.service";

@Component({
  selector: "app-employee-header",
  standalone: true,

  imports: [IonHeader, IonToolbar, IonButton, IonIcon],

  template: `
    <ion-header class="employee-header">
      <ion-toolbar class="employee-toolbar">
        <div class="header-content">
          <!-- =========================
               USUARIO
          ========================== -->
          <div class="user-section">
            <div class="avatar">
              <span>{{ initials }}</span>
            </div>

            <div class="user-info">
              <div class="user-name">
                {{ profile?.full_name || "Empleado" }}
              </div>

              <div class="user-role">
                {{ roleLabel }}
              </div>
            </div>
          </div>

          <!-- =========================
               CERRAR SESIÓN
          ========================== -->
          <ion-button class="logout-button" fill="clear" (click)="logout()">
            <ion-icon name="log-out-outline" slot="start"></ion-icon>

            <span>Cerrar</span>
          </ion-button>
        </div>
      </ion-toolbar>
    </ion-header>
  `,

  styles: [
    `
      /* =====================================================
         HEADER GENERAL
      ===================================================== */

      .employee-header {
        --background: #ffffff;
        background: #ffffff;

        position: relative;
        z-index: 100;
      }

      .employee-toolbar {
        --background: #ffffff;
        --border-width: 0;
        --min-height: 78px;

        height: 78px;

        padding: 0 16px;

        box-sizing: border-box;

        border-bottom: 1px solid #e5eaf1;

        box-shadow: 0 4px 16px rgba(24, 47, 83, 0.05);
      }

      /* =====================================================
         CONTENIDO
      ===================================================== */

      .header-content {
        width: 100%;
        height: 100%;

        display: flex;
        align-items: center;
        justify-content: space-between;

        box-sizing: border-box;
      }

      /* =====================================================
         USUARIO
      ===================================================== */

      .user-section {
        display: flex;
        align-items: center;

        min-width: 0;
      }

      /* =====================================================
         AVATAR
      ===================================================== */

      .avatar {
        width: 44px;
        height: 44px;

        flex-shrink: 0;

        display: flex;
        align-items: center;
        justify-content: center;

        border-radius: 14px;

        background: #eaf1ff;

        color: #1769ff;

        box-shadow: inset 0 0 0 1px rgba(23, 105, 255, 0.08);
      }

      .avatar span {
        font-size: 14px;
        font-weight: 800;

        letter-spacing: 0.3px;
      }

      /* =====================================================
         INFORMACIÓN
      ===================================================== */

      .user-info {
        display: flex;
        flex-direction: column;

        justify-content: center;

        margin-left: 11px;

        min-width: 0;
      }

      .user-name {
        color: #123b78;

        font-size: 17px;
        font-weight: 800;

        line-height: 1.15;

        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .user-role {
        margin-top: 4px;

        color: #61708a;

        font-size: 12px;
        font-weight: 600;

        line-height: 1;

        text-transform: capitalize;
      }

      /* =====================================================
         BOTÓN CERRAR
      ===================================================== */

      .logout-button {
        --background: #fff5f5;
        --background-hover: #ffeaea;
        --background-activated: #ffeaea;
        --background-focused: #ffeaea;

        --color: #df4545;

        --padding-start: 11px;
        --padding-end: 11px;

        --padding-top: 8px;
        --padding-bottom: 8px;

        --border-radius: 12px;

        margin: 0;

        min-height: 40px;

        font-size: 13px;
        font-weight: 800;

        letter-spacing: 0;

        transition:
          transform 0.15s ease,
          box-shadow 0.2s ease;
      }

      .logout-button ion-icon {
        font-size: 19px;

        margin-right: 5px;

        color: #df4545;
      }

      .logout-button:hover {
        box-shadow: 0 5px 14px rgba(223, 69, 69, 0.1);
      }

      .logout-button:active {
        transform: scale(0.96);
      }

      /* =====================================================
         TABLETS / PANTALLAS GRANDES
      ===================================================== */

      @media (min-width: 768px) {
        .employee-toolbar {
          height: 82px;
          --min-height: 82px;

          padding-left: 22px;
          padding-right: 22px;
        }

        .avatar {
          width: 46px;
          height: 46px;

          border-radius: 15px;
        }

        .user-name {
          font-size: 18px;
        }

        .user-role {
          font-size: 13px;
        }

        .logout-button {
          min-height: 42px;

          font-size: 14px;

          --padding-start: 13px;
          --padding-end: 13px;
        }

        .logout-button ion-icon {
          font-size: 20px;
        }
      }

      /* =====================================================
         MÓVILES PEQUEÑOS
      ===================================================== */

      @media (max-width: 380px) {
        .employee-toolbar {
          height: 70px;
          --min-height: 70px;

          padding-left: 12px;
          padding-right: 12px;
        }

        .avatar {
          width: 40px;
          height: 40px;

          border-radius: 12px;
        }

        .avatar span {
          font-size: 13px;
        }

        .user-info {
          margin-left: 9px;
        }

        .user-name {
          font-size: 15px;
        }

        .user-role {
          font-size: 11px;
        }

        .logout-button {
          min-height: 38px;

          --padding-start: 8px;
          --padding-end: 8px;

          font-size: 12px;
        }

        .logout-button ion-icon {
          font-size: 18px;

          margin-right: 3px;
        }
      }
    `,
  ],
})
export class EmployeeHeaderComponent implements OnInit {
  profile: Profile | null = null;

  constructor(
    private supabase: SupabaseService,
    private router: Router,
  ) {
    addIcons({
      logOutOutline,
    });
  }

  async ngOnInit() {
    try {
      this.profile = await this.supabase.getMyProfile();
    } catch (error) {
      console.error("Error cargando perfil del empleado:", error);
    }
  }

  get initials(): string {
    const name = this.profile?.full_name?.trim();

    if (!name) {
      return "EM";
    }

    const parts = name.split(/\s+/);

    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }

    return (
      parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
    ).toUpperCase();
  }

  get roleLabel(): string {
    switch (this.profile?.role) {
      case "ayudante":
        return "Ayudante";

      case "supervisor":
        return "Supervisor";

      case "admin":
        return "Administrador";

      default:
        return "Empleado";
    }
  }

  async logout() {
    try {
      await this.supabase.signOut();

      await this.router.navigateByUrl("/login", {
        replaceUrl: true,
      });
    } catch (error) {
      console.error("Error al cerrar sesión:", error);

      await this.router.navigateByUrl("/login", {
        replaceUrl: true,
      });
    }
  }
}
