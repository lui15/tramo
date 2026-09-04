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
} from "@ionic/angular/standalone";

import { SupabaseService } from "../../services/supabase.service";

// Solo permite direcciones @gmail.com
const GMAIL_REGEX = /^[A-Za-z0-9._%+-]+@gmail\.com$/i;

@Component({
  selector: "app-register",
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
  ],

  template: `
    <ion-content [fullscreen]="true" class="register-page">
      <div class="register-background">
        <div class="register-container">
          <!-- CABECERA -->
          <div class="register-header">
            <div class="logo-box">
              <span>TR</span>
            </div>

            <h1>Crear cuenta</h1>

            <p>
              Regístrate para comenzar a utilizar<br />
              nuestra plataforma
            </p>
          </div>

          <!-- TARJETA -->
          <div class="register-card">
            <div class="card-top-line"></div>

            <div class="form-header">
              <h2>Datos de acceso</h2>
              <p>Completa tus datos para crear tu cuenta</p>
            </div>

            <!-- NOMBRE -->
            <div class="field-group">
              <ion-item lines="none" class="form-field">
                <ion-input
                  label="Nombre"
                  labelPlacement="stacked"
                  type="text"
                  [(ngModel)]="fullName"
                  placeholder="Tu nombre completo"
                >
                </ion-input>
              </ion-item>
            </div>

            <!-- CORREO -->
            <div class="field-group">
              <ion-item lines="none" class="form-field">
                <ion-input
                  label="Correo electrónico"
                  labelPlacement="stacked"
                  type="email"
                  [(ngModel)]="email"
                  placeholder="tunombre@gmail.com"
                >
                </ion-input>
              </ion-item>
            </div>

            <!-- CONTRASEÑA -->
            <div class="field-group">
              <ion-item lines="none" class="form-field">
                <ion-input
                  label="Contraseña"
                  labelPlacement="stacked"
                  type="password"
                  [(ngModel)]="password"
                  placeholder="Introduce una contraseña"
                >
                </ion-input>
              </ion-item>
            </div>

            <!-- ERROR -->
            <ion-text color="danger" *ngIf="errorMessage">
              <div class="error-box">
                <span class="error-icon">!</span>
                <p>{{ errorMessage }}</p>
              </div>
            </ion-text>

            <!-- REGISTRARSE -->
            <ion-button
              expand="block"
              class="register-button"
              type="button"
              (click)="register()"
              [disabled]="loading"
            >
              <ion-spinner *ngIf="loading" name="dots"></ion-spinner>

              <span *ngIf="!loading"> Crear mi cuenta </span>
            </ion-button>

            <!-- LOGIN -->
            <div class="login-link">
              <span>¿Ya tienes una cuenta?</span>

              <ion-button fill="clear" routerLink="/login" class="login-button">
                Iniciar sesión
              </ion-button>
            </div>
          </div>

          <!-- FOOTER -->
          <div class="register-footer">
            <span> Tu cuenta quedará pendiente de aprobación </span>
          </div>
        </div>
      </div>
    </ion-content>
  `,

  styles: [
    `
      ion-content.register-page {
        --background: #f4f8ff;
      }

      .register-background {
        min-height: 100%;
        width: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 40px 20px;
        box-sizing: border-box;

        background:
          radial-gradient(
            circle at 10% 10%,
            rgba(23, 105, 255, 0.1),
            transparent 30%
          ),
          radial-gradient(
            circle at 90% 90%,
            rgba(23, 105, 255, 0.08),
            transparent 30%
          ),
          linear-gradient(135deg, #f7faff 0%, #eef5ff 50%, #f8fbff 100%);
      }

      .register-container {
        width: 100%;
        max-width: 440px;
        margin: auto;
      }

      /* CABECERA */

      .register-header {
        text-align: center;
        margin-bottom: 28px;
      }

      .logo-box {
        width: 58px;
        height: 58px;
        margin: 0 auto 18px;

        display: flex;
        align-items: center;
        justify-content: center;

        border-radius: 17px;

        background: linear-gradient(135deg, #1769ff, #4b8dff);

        box-shadow: 0 12px 28px rgba(23, 105, 255, 0.25);
      }

      .logo-box span {
        color: white;
        font-size: 20px;
        font-weight: 800;
        letter-spacing: -1px;
      }

      .register-header h1 {
        margin: 0;
        color: #14213d;
        font-size: 30px;
        line-height: 1.15;
        font-weight: 800;
        letter-spacing: -0.7px;
      }

      .register-header p {
        margin: 10px 0 0;
        color: #71809a;
        font-size: 14px;
        line-height: 1.55;
      }

      /* TARJETA */

      .register-card {
        position: relative;

        background: #ffffff;

        border-radius: 24px;

        padding: 34px 30px 28px;

        box-shadow:
          0 18px 50px rgba(30, 67, 120, 0.1),
          0 4px 14px rgba(30, 67, 120, 0.05);

        overflow: hidden;
      }

      .card-top-line {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;

        height: 7px;

        background: linear-gradient(90deg, #1769ff, #4b8dff);
      }

      .form-header {
        margin-bottom: 24px;
      }

      .form-header h2 {
        margin: 0;
        color: #17243c;
        font-size: 18px;
        font-weight: 800;
      }

      .form-header p {
        margin: 6px 0 0;
        color: #8490a5;
        font-size: 13px;
      }

      /* CAMPOS */

      .field-group {
        margin-bottom: 15px;
      }

      .form-field {
        --background: #f8faff;
        --border-color: #dce5f2;
        --border-width: 1px;
        --border-style: solid;
        --border-radius: 14px;
        --padding-start: 15px;
        --padding-end: 15px;

        min-height: 66px;

        border: 1px solid #dce5f2;
        border-radius: 14px;

        overflow: hidden;

        transition:
          border-color 0.2s ease,
          box-shadow 0.2s ease,
          background 0.2s ease;
      }

      .form-field:focus-within {
        --background: #ffffff;

        border-color: #1769ff;

        box-shadow: 0 0 0 3px rgba(23, 105, 255, 0.1);
      }

      .form-field ion-input {
        --color: #1c2942;
        --placeholder-color: #a3adbd;

        font-size: 14px;
      }

      .form-field ion-input::part(label) {
        color: #66758d;
        font-size: 12px;
        font-weight: 700;
        margin-bottom: 3px;
      }

      /* ERROR */

      .error-box {
        display: flex;
        align-items: flex-start;
        gap: 10px;

        margin: 8px 0 16px;
        padding: 12px 14px;

        border-radius: 12px;

        background: #fff3f3;
        border: 1px solid #ffd5d5;
      }

      .error-icon {
        flex: 0 0 auto;

        width: 20px;
        height: 20px;

        display: flex;
        align-items: center;
        justify-content: center;

        border-radius: 50%;

        background: #e5484d;
        color: white;

        font-size: 12px;
        font-weight: 800;
      }

      .error-box p {
        margin: 1px 0 0;

        color: #c9363d;

        font-size: 13px;
        line-height: 1.4;
      }

      /* BOTÓN PRINCIPAL */

      .register-button {
        --background: #1769ff;
        --background-hover: #0f5de8;
        --background-activated: #0f5de8;
        --border-radius: 14px;

        height: 50px;

        margin: 22px 0 0;

        font-size: 14px;
        font-weight: 800;
        letter-spacing: 0;

        box-shadow: 0 10px 22px rgba(23, 105, 255, 0.22);
      }

      .register-button ion-spinner {
        width: 22px;
        height: 22px;
      }

      /* LOGIN */

      .login-link {
        display: flex;
        align-items: center;
        justify-content: center;
        flex-wrap: wrap;
        gap: 2px;

        margin-top: 20px;

        color: #7d899d;
        font-size: 13px;
      }

      .login-button {
        --color: #1769ff;

        height: 30px;

        margin: 0;

        font-size: 13px;
        font-weight: 800;

        text-transform: none;
      }

      /* FOOTER */

      .register-footer {
        text-align: center;

        margin-top: 20px;

        color: #9aa5b7;

        font-size: 11px;
      }

      /* RESPONSIVE */

      @media (max-width: 480px) {
        .register-background {
          align-items: flex-start;
          padding: 28px 16px 30px;
        }

        .register-container {
          margin-top: 15px;
        }

        .register-header {
          margin-bottom: 22px;
        }

        .logo-box {
          width: 52px;
          height: 52px;
          margin-bottom: 14px;
        }

        .register-header h1 {
          font-size: 26px;
        }

        .register-card {
          padding: 30px 20px 24px;
          border-radius: 20px;
        }
      }

      @media (max-width: 360px) {
        .register-background {
          padding-left: 12px;
          padding-right: 12px;
        }

        .register-card {
          padding-left: 16px;
          padding-right: 16px;
        }

        .register-header h1 {
          font-size: 24px;
        }
      }
    `,
  ],
})
export class RegisterPage {
  fullName = "";
  email = "";
  password = "";

  loading = false;
  errorMessage = "";

  constructor(
    private supabase: SupabaseService,
    private router: Router,
  ) {}

  async register() {
    this.errorMessage = "";

    // Limpiamos los valores
    const name = this.fullName.trim();
    const email = this.email.trim().toLowerCase();
    const password = this.password.trim();

    // Validar nombre
    if (!name) {
      this.errorMessage = "Introduce tu nombre completo.";
      return;
    }

    // Validar email
    if (!email) {
      this.errorMessage = "Introduce tu correo electrónico.";
      return;
    }

    // Validar Gmail
    if (!GMAIL_REGEX.test(email)) {
      this.errorMessage =
        "El correo debe ser una dirección de Gmail (@gmail.com).";
      return;
    }

    // Validar contraseña
    if (!password) {
      this.errorMessage = "Introduce una contraseña.";
      return;
    }

    if (password.length < 6) {
      this.errorMessage = "La contraseña debe tener al menos 6 caracteres.";
      return;
    }

    // Evitar dobles clics
    if (this.loading) {
      return;
    }

    this.loading = true;

    try {
      console.log("Intentando registrar empleado:", email);

      const { error } = await this.supabase.signUp(email, password, name);

      if (error) {
        console.error("Error de Supabase:", error);
        throw error;
      }

      console.log("Registro correcto");

      await this.router.navigateByUrl("/pending-approval", {
        replaceUrl: true,
      });
    } catch (err: any) {
      console.error("Error registrando empleado:", err);

      this.errorMessage = err?.message ?? "No se pudo crear la cuenta.";
    } finally {
      this.loading = false;
    }
  }
}
