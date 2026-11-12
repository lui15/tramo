import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";

import {
  IonContent,
  IonItem,
  IonInput,
  IonButton,
  IonSpinner,
  IonIcon,
} from "@ionic/angular/standalone";

import { addIcons } from "ionicons";
import {
  lockClosedOutline,
  shieldCheckmarkOutline,
  arrowBackOutline,
  logOutOutline,
  fingerPrintOutline,
} from "ionicons/icons";
import { BiometricService } from "../../services/biometric.service";
import { BiometricSetupService } from "../../services/biometric-setup.service";

import {
  SupabaseService,
  Profile,
  homeForRole,
} from "../../services/supabase.service";

@Component({
  selector: "app-change-password",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonItem,
    IonInput,
    IonButton,
    IonSpinner,
    IonIcon,
  ],
  template: `
    <ion-content class="cp-content">
      <div class="cp-wrap">
        <div class="cp-card">
          <div class="cp-icon">
            <ion-icon name="shield-checkmark-outline"></ion-icon>
          </div>

          <h1>{{ forced ? "Crea tu contraseña" : "Cambiar contraseña" }}</h1>

          <p class="cp-sub" *ngIf="forced">
            Por seguridad, cambia la contraseña inicial que te dio
            administración antes de continuar.
          </p>

          <p class="cp-sub" *ngIf="!forced">
            Elige una contraseña nueva de al menos 8 caracteres.
          </p>

          <label class="cp-label">Nueva contraseña</label>
          <ion-item class="cp-input" lines="none">
            <ion-icon name="lock-closed-outline" slot="start"></ion-icon>
            <ion-input
              type="password"
              [(ngModel)]="password"
              autocomplete="new-password"
              placeholder="Mínimo 8 caracteres"
            ></ion-input>
          </ion-item>

          <label class="cp-label">Repite la contraseña</label>
          <ion-item class="cp-input" lines="none">
            <ion-icon name="lock-closed-outline" slot="start"></ion-icon>
            <ion-input
              type="password"
              [(ngModel)]="confirm"
              autocomplete="new-password"
              placeholder="Repite la contraseña"
              (keyup.enter)="save()"
            ></ion-input>
          </ion-item>

          <div class="cp-error" *ngIf="errorMessage">{{ errorMessage }}</div>
          <div class="cp-ok" *ngIf="done">Contraseña actualizada.</div>

          <ion-button
            expand="block"
            class="cp-btn"
            (click)="save()"
            [disabled]="saving"
          >
            <ion-spinner *ngIf="saving" name="dots"></ion-spinner>
            <span *ngIf="!saving">Guardar contraseña</span>
          </ion-button>

          <!-- HUELLA DIGITAL -->
          <div class="cp-bio" *ngIf="!forced && bioAvailable">
            <div class="cp-bio-head">
              <ion-icon name="finger-print-outline"></ion-icon>
              <div>
                <strong>Acceso con huella o rostro</strong>
                <span>{{ bioEnabled ? "Activado en este móvil" : "Desactivado" }}</span>
              </div>
            </div>
            <ion-button
              *ngIf="bioEnabled"
              size="small"
              fill="outline"
              color="danger"
              (click)="disableBio()"
            >
              Desactivar
            </ion-button>
            <ion-button
              *ngIf="!bioEnabled"
              size="small"
              fill="outline"
              (click)="enableBioNow()"
            >
              Activar
            </ion-button>
          </div>
          <p class="cp-sub cp-bio-hint" *ngIf="bioHint">{{ bioHint }}</p>

          <ion-button
            *ngIf="!forced"
            expand="block"
            fill="clear"
            class="cp-link"
            (click)="back()"
          >
            <ion-icon name="arrow-back-outline" slot="start"></ion-icon>
            Volver
          </ion-button>

          <ion-button
            *ngIf="forced"
            expand="block"
            fill="clear"
            class="cp-link"
            (click)="logout()"
          >
            <ion-icon name="log-out-outline" slot="start"></ion-icon>
            Cerrar sesión
          </ion-button>
        </div>
      </div>
    </ion-content>
  `,
  styles: [
    `
      .cp-content {
        --background: var(--tramo-bg, #f4f6fb);
      }
      .cp-wrap {
        min-height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px 16px;
      }
      .cp-card {
        width: 100%;
        max-width: 420px;
        background: var(--tramo-surface, #fff);
        border-radius: 24px;
        padding: 28px 22px;
        box-shadow: var(--t-shadow);
        color: var(--tramo-text, #0f172a);
      }
      .cp-icon {
        width: 56px;
        height: 56px;
        border-radius: 18px;
        display: grid;
        place-items: center;
        background: var(--tramo-primary-soft, #e8eefc);
        color: var(--tramo-primary, #3b5bdb);
        font-size: 28px;
        margin-bottom: 16px;
      }
      h1 {
        margin: 0 0 6px;
        font-size: 22px;
        font-weight: 800;
      }
      .cp-sub {
        margin: 0 0 20px;
        color: var(--tramo-muted, #64748b);
        font-size: 14px;
        line-height: 1.5;
      }
      .cp-label {
        display: block;
        font-size: 13px;
        font-weight: 700;
        margin: 12px 0 6px;
      }
      .cp-input {
        --background: var(--tramo-input, #f1f4f9);
        --border-radius: 14px;
        border-radius: 14px;
        --color: var(--tramo-text, #0f172a);
      }
      .cp-input ion-icon {
        color: var(--tramo-muted, #64748b);
        margin-right: 8px;
      }
      .cp-error,
      .cp-ok {
        margin-top: 14px;
        padding: 10px 12px;
        border-radius: 12px;
        font-size: 13px;
        font-weight: 600;
      }
      .cp-error {
        background: rgba(239, 68, 68, 0.1);
        color: #dc2626;
      }
      .cp-ok {
        background: rgba(16, 185, 129, 0.12);
        color: #059669;
      }
      .cp-btn {
        margin-top: 20px;
        --border-radius: 14px;
        --background: var(--tramo-primary, #3b5bdb);
        height: 50px;
        font-weight: 700;
      }
      .cp-bio {
        margin-top: 22px;
        padding: 14px;
        border-radius: 16px;
        background: var(--tramo-input, #f1f4f9);
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
      }
      .cp-bio-head {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .cp-bio-head ion-icon {
        font-size: 28px;
        color: var(--tramo-primary, #3b5bdb);
      }
      .cp-bio-head strong {
        display: block;
        font-size: 14px;
      }
      .cp-bio-head span {
        font-size: 12px;
        color: var(--tramo-muted, #64748b);
      }
      .cp-bio-hint {
        margin: 8px 2px 0;
        font-size: 13px;
      }
      .cp-link {
        margin-top: 6px;
        --color: var(--tramo-muted, #64748b);
      }
    `,
  ],
})
export class ChangePasswordPage implements OnInit {
  password = "";
  confirm = "";
  saving = false;
  done = false;
  errorMessage = "";
  forced = false;
  bioAvailable = false;
  bioEnabled = false;
  bioHint = "";

  private profile: Profile | null = null;

  constructor(
    private supabase: SupabaseService,
    private biometric: BiometricService,
    private bioSetup: BiometricSetupService,
    private router: Router,
  ) {
    addIcons({
      lockClosedOutline,
      shieldCheckmarkOutline,
      arrowBackOutline,
      logOutOutline,
      fingerPrintOutline,
    });
  }

  async ngOnInit() {
    this.profile = await this.supabase.getMyProfile(true);
    this.forced = !!this.profile?.must_change_password;
    this.bioAvailable = await this.biometric.isAvailable();
    this.bioEnabled = this.biometric.isEnabled();
  }

  async disableBio() {
    await this.biometric.disable();
    this.bioEnabled = false;
    this.bioHint = "La huella se ha desactivado en este móvil.";
  }

  async enableBioNow() {
    this.bioHint = "";
    this.bioEnabled = await this.bioSetup.promptEnable();
  }

  enableBioNextLogin() {
    const username = this.profile?.username || this.profile?.email || "";
    // Borra el "ahora no" para que se ofrezca al volver a entrar con contraseña
    try {
      localStorage.removeItem("tramo.bio.declined." + username.toLowerCase());
    } catch {
      // sin almacenamiento
    }
    this.bioHint =
      "Cierra sesión y vuelve a entrar con tu contraseña: te pediremos activar la huella.";
  }

  async save() {
    this.errorMessage = "";
    this.done = false;

    if (this.password.length < 8) {
      this.errorMessage = "La contraseña debe tener al menos 8 caracteres.";
      return;
    }

    if (this.password !== this.confirm) {
      this.errorMessage = "Las contraseñas no coinciden.";
      return;
    }

    this.saving = true;

    try {
      const newPassword = this.password;
      await this.supabase.changeMyPassword(newPassword);
      await this.biometric.updatePassword(newPassword).catch(() => this.biometric.disable());
      this.password = "";
      this.confirm = "";
      this.done = true;

      const profile = await this.supabase.getMyProfile(true);

      if (profile?.must_change_password) {
        throw new Error(
          "La contraseña se cambió, pero no se pudo completar el acceso. Contacta con administración.",
        );
      }

      await this.router.navigateByUrl(homeForRole(profile?.role), {
        replaceUrl: true,
      });
    } catch (err: any) {
      this.errorMessage =
        err?.message === "New password should be different from the old password."
          ? "La nueva contraseña debe ser distinta de la anterior."
          : err?.message || "No se pudo cambiar la contraseña.";
    } finally {
      this.saving = false;
    }
  }

  back() {
    this.router.navigateByUrl(homeForRole(this.profile?.role));
  }

  async logout() {
    await this.supabase.signOut();
    await this.router.navigateByUrl("/login", { replaceUrl: true });
  }
}
