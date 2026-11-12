import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";

import {
  IonContent,
  IonItem,
  IonInput,
  IonButton,
  IonText,
  IonSpinner,
  IonIcon,
  AlertController,
} from "@ionic/angular/standalone";

import { addIcons } from "ionicons";
import {
  personOutline,
  lockClosedOutline,
  logInOutline,
  fingerPrintOutline,
} from "ionicons/icons";

import { SupabaseService, homeForRole } from "../../services/supabase.service";
import { BiometricService } from "../../services/biometric.service";

@Component({
  selector: "app-login",
  standalone: true,

  imports: [
    CommonModule,
    FormsModule,
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
          <img class="brand-logo" src="assets/logo/tramo-mark.svg" alt="Tramo" width="72" height="72" />

          <div class="brand-name">Tramo</div>

          <div class="brand-subtitle">Gestión de trabajos y administración</div>
        </div>

        <!-- TARJETA LOGIN -->
        <div class="login-card">
          <div class="welcome-section">
            <h1>Bienvenido</h1>

            <p>Inicia sesión para continuar</p>
          </div>

          <!-- USUARIO -->
          <div class="field-wrapper">
            <label class="field-label"> Usuario o correo </label>

            <ion-item class="input-item" lines="none">
              <ion-icon name="person-outline" slot="start"></ion-icon>

              <ion-input
                type="text"
                placeholder="Tu usuario o correo"
                [(ngModel)]="username"
                autocomplete="username"
                autocapitalize="off"
                [spellcheck]="false"
                (keyup.enter)="login()"
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
                (keyup.enter)="login()"
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

          <!-- HUELLA DIGITAL -->
          <ion-button
            *ngIf="bioEnabled"
            class="bio-button"
            expand="block"
            fill="outline"
            (click)="loginWithBiometric()"
            [disabled]="loading"
          >
            <ion-icon name="finger-print-outline" slot="start"></ion-icon>
            Entrar con huella
            <span class="bio-user" *ngIf="bioUser">· {{ bioUser }}</span>
          </ion-button>

          <!-- AYUDA DE ACCESO -->
          <div class="register-section">
            <span>
              ¿Has olvidado tu contraseña o no tienes cuenta? Pide a
              administración que te la restablezca o te dé de alta.
            </span>
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
        --background: var(--t-surface-2);
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

      .brand-logo {
        width: 72px;
        height: 72px;
        margin-bottom: 14px;
        border-radius: 18px;
        box-shadow: 0 12px 28px rgba(37, 99, 235, 0.28);
      }

      .brand-icon {
        width: 58px;
        height: 58px;

        display: flex;
        align-items: center;
        justify-content: center;

        border-radius: 18px;

        background: var(--t-primary);

        color: #ffffff;

        font-size: 28px;
        font-weight: 900;

        box-shadow: 0 10px 24px rgba(23, 105, 255, 0.22);

        margin-bottom: 13px;
      }

      .brand-name {
        color: var(--t-text);

        font-size: 28px;
        font-weight: 900;

        letter-spacing: -0.5px;

        line-height: 1;
      }

      .brand-subtitle {
        margin-top: 8px;

        color: var(--t-muted);

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

        background: var(--t-surface);

        border: 1px solid var(--t-border);

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

        color: var(--t-text);

        font-size: 23px;
        font-weight: 800;

        line-height: 1.2;

        letter-spacing: -0.3px;
      }

      .welcome-section p {
        margin: 7px 0 0;

        color: var(--t-muted);

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

        color: var(--t-text);

        font-size: 13px;
        font-weight: 700;
      }

      .input-item {
        --background: var(--t-surface-2);
        --border-color: transparent;

        --padding-start: 13px;
        --padding-end: 13px;

        --min-height: 52px;

        width: 100%;

        border: 1px solid var(--t-border);

        border-radius: 14px;

        box-sizing: border-box;

        transition: border-color 0.2s ease,
          box-shadow 0.2s ease,
          background 0.2s ease;
      }

      .input-item:focus-within {
        --background: var(--t-surface);

        border-color: var(--t-primary);

        box-shadow: 0 0 0 3px rgba(23, 105, 255, 0.09);
      }

      .input-item ion-icon {
        color: var(--t-muted);

        font-size: 20px;

        margin-right: 8px;
      }

      .input-item ion-input {
        --color: var(--t-text);
        --placeholder-color: var(--t-muted);

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

      .bio-button {
        margin-top: 12px;
        height: 52px;
        --border-radius: 14px;
        --border-color: var(--t-primary);
        --color: var(--t-primary);
        font-weight: 700;
        text-transform: none;
      }

      .bio-button ion-icon {
        font-size: 22px;
      }

      .bio-user {
        margin-left: 4px;
        font-weight: 500;
        opacity: 0.75;
      }

      .login-button {
        --background: var(--t-primary);
        --background-hover: var(--t-primary);
        --background-activated: var(--t-primary);
        --background-focused: var(--t-primary);

        --color: #ffffff;

        --border-radius: 14px;

        --box-shadow: 0 8px 18px rgba(23, 105, 255, 0.2);

        height: 52px;

        margin: 5px 0 0;

        font-size: 14px;
        font-weight: 800;

        letter-spacing: 0;

        transition: transform 0.15s ease,
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
        color: var(--t-muted);

        font-size: 12px;
        font-weight: 500;
      }

      .register-button {
        --color: var(--t-primary);

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
  username = "";
  password = "";
  loading = false;
  errorMessage = "";
  bioEnabled = false;
  bioUser: string | null = null;

  private autoPrompted = false;

  constructor(
    private supabase: SupabaseService,
    private biometric: BiometricService,
    private alertCtrl: AlertController,
    private router: Router,
    route: ActivatedRoute,
  ) {
    addIcons({
      personOutline,
      lockClosedOutline,
      logInOutline,
      fingerPrintOutline,
    });

    if (route.snapshot.queryParamMap.get("motivo") === "cuenta") {
      this.errorMessage =
        "Tu cuenta no está activa. Contacta con administración.";
      void this.biometric.disable();
    }
  }

  async ionViewWillEnter() {
    this.bioEnabled = this.biometric.isEnabled() && (await this.biometric.isAvailable());
    this.bioUser = this.biometric.enabledUser();

    // Al abrir la app con la huella activada, se pide directamente una vez
    if (this.bioEnabled && !this.autoPrompted && !this.errorMessage) {
      this.autoPrompted = true;
      setTimeout(() => void this.loginWithBiometric(), 300);
    }
  }

  async login() {
    this.errorMessage = "";

    const username = this.username.trim();

    if (!username || !this.password) {
      this.errorMessage = "Introduce tu usuario o correo y tu contraseña.";
      return;
    }

    this.loading = true;
    const password = this.password;

    try {
      const result = await this.supabase.signInWithUsername(username, password);

      this.password = "";

      if (!result.must_change_password) {
        await this.offerBiometric(username, password);
      }

      await this.router.navigateByUrl(
        result.must_change_password ? "/cuenta/clave" : homeForRole(result.role),
        { replaceUrl: true },
      );
    } catch (err: any) {
      this.errorMessage = err?.message || "Usuario o contraseña incorrectos.";
    } finally {
      this.loading = false;
    }
  }

  async loginWithBiometric() {
    if (this.loading) {
      return;
    }

    this.errorMessage = "";

    let creds: { username: string; password: string };

    try {
      creds = await this.biometric.unlock();
    } catch (err: any) {
      if (!this.biometric.isCancel(err)) {
        this.errorMessage = err?.message || "No se pudo verificar la huella.";
      }
      return;
    }

    this.loading = true;

    try {
      const result = await this.supabase.signInWithUsername(
        creds.username,
        creds.password,
      );

      await this.router.navigateByUrl(
        result.must_change_password ? "/cuenta/clave" : homeForRole(result.role),
        { replaceUrl: true },
      );
    } catch (err: any) {
      const message: string = err?.message || "";

      // La contraseña guardada ya no es válida (cambiada o restablecida)
      if (message.includes("incorrectos")) {
        await this.biometric.disable();
        this.bioEnabled = false;
        this.username = creds.username;
        this.errorMessage =
          "Tu contraseña ha cambiado. Entra con la nueva contraseña para volver a activar la huella.";
      } else {
        this.errorMessage = message || "No se pudo iniciar sesión.";
      }
    } finally {
      this.loading = false;
    }
  }

  /** Tras entrar con contraseña, propone activar la huella (una vez). */
  private async offerBiometric(username: string, password: string) {
    try {
      if (
        this.biometric.isEnabled() ||
        this.biometric.wasDeclined(username) ||
        !(await this.biometric.isAvailable())
      ) {
        // Si ya estaba activada, mantener la contraseña guardada al día
        if (this.biometric.isEnabled() && this.biometric.enabledUser() === username) {
          await this.biometric.updatePassword(password);
        }
        return;
      }

      const alert = await this.alertCtrl.create({
        header: "Acceso con huella",
        message:
          "¿Quieres entrar con tu huella digital la próxima vez? Tu contraseña se guardará cifrada en este móvil.",
        buttons: [
          { text: "Ahora no", role: "cancel" },
          { text: "Activar", role: "confirm" },
        ],
      });

      await alert.present();
      const { role } = await alert.onDidDismiss();

      if (role !== "confirm") {
        this.biometric.markDeclined(username);
        return;
      }

      await this.biometric.enable(username, password);
    } catch {
      // Si cancela la huella, se entra igualmente con normalidad
    }
  }
}
