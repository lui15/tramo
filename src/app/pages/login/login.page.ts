import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";

import {
  IonContent,
  IonItem,
  IonInput,
  IonButton,
  IonText,
  IonSpinner,
  IonIcon,
} from "@ionic/angular/standalone";

import { addIcons } from "ionicons";
import {
  mailOutline,
  lockClosedOutline,
  logInOutline,
  personAddOutline,
} from "ionicons/icons";

import { SupabaseService } from "../../services/supabase.service";

@Component({
  selector: "app-login",
  standalone: true,

  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    IonContent,
    IonItem,
    IonInput,
    IonButton,
    IonText,
    IonSpinner,
    IonIcon,
  ],

  template: `
    <ion-content class="login-content">
      <div class="login-wrapper">
        <!-- LOGO / MARCA -->
        <div class="brand-section">
          <div class="brand-icon">T</div>

          <div class="brand-name">Tramo</div>

          <div class="brand-subtitle">Gestión de trabajos y administración</div>
        </div>

        <!-- TARJETA LOGIN -->
        <div class="login-card">
          <div class="welcome-section">
            <h1>Bienvenido</h1>

            <p>Inicia sesión para continuar</p>
          </div>

          <!-- CORREO -->
          <div class="field-wrapper">
            <label class="field-label"> Correo electrónico </label>

            <ion-item class="input-item" lines="none">
              <ion-icon name="mail-outline" slot="start"></ion-icon>

              <ion-input
                type="email"
                placeholder="tu@correo.com"
                [(ngModel)]="email"
                autocomplete="email"
              ></ion-input>
            </ion-item>
          </div>

          <!-- CONTRASEÑA -->
          <div class="field-wrapper">
            <label class="field-label"> Contraseña </label>

            <ion-item class="input-item" lines="none">
              <ion-icon name="lock-closed-outline" slot="start"></ion-icon>

              <ion-input
                type="password"
                placeholder="Introduce tu contraseña"
                [(ngModel)]="password"
                autocomplete="current-password"
              ></ion-input>
            </ion-item>
          </div>

          <!-- ERROR -->
          <div class="error-box" *ngIf="errorMessage">
            <ion-text color="danger">
              <span>{{ errorMessage }}</span>
            </ion-text>
          </div>

          <!-- BOTÓN LOGIN -->
          <ion-button
            class="login-button"
            expand="block"
            (click)="login()"
            [disabled]="loading"
          >
            <ion-spinner *ngIf="loading" name="dots"></ion-spinner>

            <ng-container *ngIf="!loading">
              <ion-icon name="log-in-outline" slot="start"></ion-icon>

              Iniciar sesión
            </ng-container>
          </ion-button>

          <!-- REGISTRO -->
          <div class="register-section">
            <span> ¿No tienes una cuenta? </span>

            <ion-button
              class="register-button"
              fill="clear"
              routerLink="/register"
            >
              <ion-icon name="person-add-outline" slot="start"></ion-icon>

              Regístrate
            </ion-button>
          </div>
        </div>

        <!-- FOOTER -->
        <div class="login-footer">
          <span>Tramo</span>
          <span class="footer-dot">•</span>
          <span>Administración</span>
        </div>
      </div>
    </ion-content>
  `,

  styles: [
    `
      /* =====================================================
         CONTENIDO GENERAL
      ===================================================== */

      .login-content {
        --background: #f8fafc;
      }

      .login-wrapper {
        width: 100%;
        min-height: 100%;

        display: flex;
        flex-direction: column;
        align-items: center;

        box-sizing: border-box;

        padding: 48px 18px 32px;
      }

      /* =====================================================
         MARCA
      ===================================================== */

      .brand-section {
        display: flex;
        flex-direction: column;
        align-items: center;

        text-align: center;

        margin-bottom: 28px;
      }

      .brand-icon {
        width: 58px;
        height: 58px;

        display: flex;
        align-items: center;
        justify-content: center;

        border-radius: 18px;

        background: #1769ff;

        color: #ffffff;

        font-size: 28px;
        font-weight: 900;

        box-shadow: 0 10px 24px rgba(23, 105, 255, 0.22);

        margin-bottom: 13px;
      }

      .brand-name {
        color: #123b78;

        font-size: 28px;
        font-weight: 900;

        letter-spacing: -0.5px;

        line-height: 1;
      }

      .brand-subtitle {
        margin-top: 8px;

        color: #8994a6;

        font-size: 12px;
        font-weight: 500;

        line-height: 1.4;
      }

      /* =====================================================
         TARJETA
      ===================================================== */

      .login-card {
        width: 100%;
        max-width: 420px;

        background: #ffffff;

        border: 1px solid #e5eaf1;

        border-radius: 24px;

        padding: 26px 22px 22px;

        box-sizing: border-box;

        box-shadow: 0 14px 34px rgba(24, 47, 83, 0.08);
      }

      /* =====================================================
         BIENVENIDA
      ===================================================== */

      .welcome-section {
        margin-bottom: 24px;
      }

      .welcome-section h1 {
        margin: 0;

        color: #123b78;

        font-size: 23px;
        font-weight: 800;

        line-height: 1.2;

        letter-spacing: -0.3px;
      }

      .welcome-section p {
        margin: 7px 0 0;

        color: #61708a;

        font-size: 13px;
        font-weight: 500;
      }

      /* =====================================================
         CAMPOS
      ===================================================== */

      .field-wrapper {
        margin-bottom: 17px;
      }

      .field-label {
        display: block;

        margin: 0 0 7px 3px;

        color: #172b4d;

        font-size: 13px;
        font-weight: 700;
      }

      .input-item {
        --background: #f8fafc;
        --border-color: transparent;

        --padding-start: 13px;
        --padding-end: 13px;

        --min-height: 52px;

        width: 100%;

        border: 1px solid #e5eaf1;

        border-radius: 14px;

        box-sizing: border-box;

        transition:
          border-color 0.2s ease,
          box-shadow 0.2s ease,
          background 0.2s ease;
      }

      .input-item:focus-within {
        --background: #ffffff;

        border-color: #1769ff;

        box-shadow: 0 0 0 3px rgba(23, 105, 255, 0.09);
      }

      .input-item ion-icon {
        color: #61708a;

        font-size: 20px;

        margin-right: 8px;
      }

      .input-item ion-input {
        --color: #172b4d;
        --placeholder-color: #8994a6;

        font-size: 14px;
        font-weight: 500;
      }

      /* =====================================================
         ERROR
      ===================================================== */

      .error-box {
        width: 100%;

        box-sizing: border-box;

        padding: 11px 13px;

        margin: 2px 0 17px;

        border-radius: 12px;

        background: #fff0f0;

        border: 1px solid rgba(223, 69, 69, 0.1);

        color: #df4545;

        font-size: 12px;
        font-weight: 600;

        line-height: 1.4;
      }

      /* =====================================================
         BOTÓN INICIAR SESIÓN
      ===================================================== */

      .login-button {
        --background: #1769ff;
        --background-hover: #1260ed;
        --background-activated: #1058dc;
        --background-focused: #1769ff;

        --color: #ffffff;

        --border-radius: 14px;

        --box-shadow: 0 8px 18px rgba(23, 105, 255, 0.2);

        height: 52px;

        margin: 5px 0 0;

        font-size: 14px;
        font-weight: 800;

        letter-spacing: 0;

        transition:
          transform 0.15s ease,
          box-shadow 0.2s ease;
      }

      .login-button ion-icon {
        font-size: 19px;
      }

      .login-button:active {
        transform: scale(0.98);
      }

      /* =====================================================
         REGISTRO
      ===================================================== */

      .register-section {
        display: flex;
        align-items: center;
        justify-content: center;
        flex-wrap: wrap;

        margin-top: 19px;

        text-align: center;
      }

      .register-section > span {
        color: #8994a6;

        font-size: 12px;
        font-weight: 500;
      }

      .register-button {
        --color: #1769ff;

        --padding-start: 5px;
        --padding-end: 5px;

        --padding-top: 0;
        --padding-bottom: 0;

        margin: 0 0 0 2px;

        min-height: 30px;

        font-size: 12px;
        font-weight: 800;
      }

      .register-button ion-icon {
        font-size: 16px;

        margin-right: 3px;
      }

      /* =====================================================
         FOOTER
      ===================================================== */

      .login-footer {
        display: flex;
        align-items: center;
        justify-content: center;

        margin-top: 25px;

        color: #a1aaba;

        font-size: 11px;
        font-weight: 600;
      }

      .footer-dot {
        margin: 0 7px;

        color: #c2c9d4;
      }

      /* =====================================================
         MÓVILES PEQUEÑOS
      ===================================================== */

      @media (max-width: 380px) {
        .login-wrapper {
          padding: 32px 14px 24px;
        }

        .brand-section {
          margin-bottom: 22px;
        }

        .brand-icon {
          width: 52px;
          height: 52px;

          border-radius: 16px;

          font-size: 25px;
        }

        .brand-name {
          font-size: 25px;
        }

        .login-card {
          padding: 22px 17px 18px;

          border-radius: 20px;
        }

        .welcome-section {
          margin-bottom: 21px;
        }

        .welcome-section h1 {
          font-size: 21px;
        }

        .input-item {
          --min-height: 49px;
        }

        .login-button {
          height: 50px;
        }
      }

      /* =====================================================
         TABLETS / ESCRITORIO
      ===================================================== */

      @media (min-width: 768px) {
        .login-wrapper {
          justify-content: center;

          padding: 50px 24px 40px;
        }

        .brand-section {
          margin-bottom: 30px;
        }

        .login-card {
          max-width: 430px;

          padding: 30px 28px 25px;
        }

        .brand-icon {
          width: 62px;
          height: 62px;

          border-radius: 19px;

          font-size: 30px;
        }

        .brand-name {
          font-size: 30px;
        }
      }
    `,
  ],
})
export class LoginPage {
  email = "";
  password = "";
  loading = false;
  errorMessage = "";

  constructor(
    private supabase: SupabaseService,
    private router: Router,
  ) {
    addIcons({
      mailOutline,
      lockClosedOutline,
      logInOutline,
      personAddOutline,
    });
  }

  async login() {
    this.errorMessage = "";

    if (!this.email || !this.password) {
      this.errorMessage = "Completa correo y contraseña.";
      return;
    }

    this.loading = true;

    try {
      const { error } = await this.supabase.signIn(this.email, this.password);

      if (error) {
        throw error;
      }

      const profile = await this.supabase.getMyProfile();

      if (!profile) {
        throw new Error("No se encontró tu perfil.");
      }

      if (profile.role === "admin") {
        this.router.navigateByUrl("/admin");
      } else if (!profile.is_approved) {
        this.router.navigateByUrl("/pending-approval");
      } else {
        this.router.navigateByUrl("/employee");
      }
    } catch (err: any) {
      this.errorMessage = err.message ?? "Correo o contraseña incorrectos.";
    } finally {
      this.loading = false;
    }
  }
}
