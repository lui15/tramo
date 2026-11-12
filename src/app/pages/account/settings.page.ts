import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router } from "@angular/router";
import { Capacitor } from "@capacitor/core";
import { AlertController, IonContent, IonIcon, IonSpinner, IonToggle } from "@ionic/angular/standalone";
import { addIcons } from "ionicons";
import {
  fingerPrintOutline,
  keyOutline,
  logOutOutline,
  notificationsOutline,
  chevronForwardOutline,
  shieldCheckmarkOutline,
} from "ionicons/icons";

import { PageHeaderComponent } from "../../components/page-header.component";
import { BiometricSetupService } from "../../services/biometric-setup.service";
import { NotificationsService } from "../../services/notifications.service";
import { Profile, ROLE_LABELS, SupabaseService } from "../../services/supabase.service";
import { ThemeMode, ThemeService } from "../../services/theme.service";

// =====================================================
// AJUSTES (todos los roles)
// Apariencia, acceso con huella o rostro, contraseña,
// notificaciones y cerrar sesión.
// =====================================================
@Component({
  selector: "app-settings",
  standalone: true,
  imports: [CommonModule, IonContent, IonIcon, IonSpinner, IonToggle, PageHeaderComponent],
  template: `
    <app-page-header title="Ajustes" subtitle="Configuración" [back]="true"></app-page-header>

    <ion-content>
      <div class="t-page st-page">
        <!-- PERFIL -->
        <section class="st-profile">
          <div class="st-avatar">{{ initials }}</div>
          <div>
            <strong>{{ profile?.full_name || "Mi cuenta" }}</strong>
            <span>{{ roleLabel }}<ng-container *ngIf="profile?.username"> · {{ profile?.username }}</ng-container></span>
          </div>
        </section>

        <!-- APARIENCIA -->
        <h3 class="st-title">🎨 Apariencia</h3>
        <section class="st-themes">
          <button type="button" class="st-theme light" [class.on]="mode === 'light'" (click)="setMode('light')">
            <span class="st-theme-emoji">☀️</span>
            <strong>Modo claro</strong>
            <span class="st-check" *ngIf="mode === 'light'">✓</span>
          </button>
          <button type="button" class="st-theme dark" [class.on]="mode === 'dark'" (click)="setMode('dark')">
            <span class="st-theme-emoji">🌙</span>
            <strong>Modo oscuro</strong>
            <span class="st-check" *ngIf="mode === 'dark'">✓</span>
          </button>
        </section>

        <!-- SEGURIDAD -->
        <h3 class="st-title">🔐 Seguridad</h3>
        <section class="st-card">
          <div class="st-row">
            <span class="st-icon tone-purple"><ion-icon name="finger-print-outline"></ion-icon></span>
            <div class="st-main">
              <strong>Entrar con huella o rostro</strong>
              <span>{{ bioText }}</span>
            </div>
            <ion-spinner *ngIf="bioBusy" name="crescent"></ion-spinner>
            <ion-toggle
              *ngIf="!bioBusy"
              [checked]="bioEnabled"
              [disabled]="!bioAvailable"
              (ionChange)="toggleBio($event)"
              aria-label="Entrar con huella o rostro"
            ></ion-toggle>
          </div>

          <button type="button" class="st-row link" (click)="go('/cuenta/clave')">
            <span class="st-icon tone-blue"><ion-icon name="key-outline"></ion-icon></span>
            <div class="st-main">
              <strong>Cambiar contraseña</strong>
              <span>Pon una contraseña nueva para tu cuenta</span>
            </div>
            <ion-icon class="st-chev" name="chevron-forward-outline"></ion-icon>
          </button>
        </section>

        <!-- GENERAL -->
        <h3 class="st-title">🔔 General</h3>
        <section class="st-card">
          <button type="button" class="st-row link" (click)="go('/notificaciones')">
            <span class="st-icon tone-orange"><ion-icon name="notifications-outline"></ion-icon></span>
            <div class="st-main">
              <strong>Notificaciones</strong>
              <span>Ver todos tus avisos</span>
            </div>
            <ion-icon class="st-chev" name="chevron-forward-outline"></ion-icon>
          </button>
        </section>

        <button type="button" class="st-logout" (click)="logout()">
          <ion-icon name="log-out-outline"></ion-icon> Cerrar sesión
        </button>

        <p class="st-foot"><ion-icon name="shield-checkmark-outline"></ion-icon> Tramo · tus datos están protegidos</p>
      </div>
    </ion-content>
  `,
  styles: [
    `
      .st-page {
        padding-bottom: calc(40px + env(safe-area-inset-bottom));
      }
      .st-profile {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 18px;
        border-radius: 22px;
        color: #fff;
        background: linear-gradient(135deg, var(--t-primary), #7c5cff);
        box-shadow: 0 12px 30px rgba(59, 91, 219, 0.25);
      }
      .st-avatar {
        width: 54px;
        height: 54px;
        border-radius: 50%;
        display: grid;
        place-items: center;
        font-weight: 800;
        font-size: 18px;
        background: rgba(255, 255, 255, 0.2);
        border: 2px solid rgba(255, 255, 255, 0.5);
      }
      .st-profile div {
        display: grid;
        gap: 3px;
      }
      .st-profile strong {
        font-size: 18px;
      }
      .st-profile span {
        font-size: 13px;
        opacity: 0.9;
      }
      .st-title {
        margin: 24px 4px 10px;
        font-size: 14px;
        font-weight: 800;
        color: var(--t-text-2);
      }
      .st-themes {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }
      .st-theme {
        position: relative;
        display: grid;
        justify-items: center;
        gap: 8px;
        padding: 20px 12px;
        border-radius: 20px;
        border: 2px solid var(--t-border);
        font: inherit;
        transition: border-color 0.25s ease, transform 0.18s ease;
      }
      .st-theme.light {
        background: linear-gradient(160deg, #fff7d6, #ffffff);
        color: #1e293b;
      }
      .st-theme.dark {
        background: linear-gradient(160deg, #1e293b, #0f172a);
        color: #e2e8f0;
      }
      .st-theme.on {
        border-color: var(--t-primary);
        box-shadow: 0 0 0 4px var(--t-primary-soft);
      }
      .st-theme-emoji {
        font-size: 34px;
      }
      .st-theme strong {
        font-size: 14px;
      }
      .st-check {
        position: absolute;
        top: 10px;
        right: 12px;
        width: 22px;
        height: 22px;
        border-radius: 50%;
        display: grid;
        place-items: center;
        background: var(--t-primary);
        color: #fff;
        font-size: 13px;
        font-weight: 800;
      }
      .st-card {
        border-radius: 20px;
        background: var(--t-surface);
        border: 1px solid var(--t-border);
        overflow: hidden;
      }
      .st-row {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 14px 16px;
        border: 0;
        background: transparent;
        color: inherit;
        font: inherit;
        text-align: left;
      }
      .st-row + .st-row {
        border-top: 1px solid var(--t-border);
      }
      .st-icon {
        width: 40px;
        height: 40px;
        border-radius: 13px;
        display: grid;
        place-items: center;
        flex-shrink: 0;
        font-size: 20px;
      }
      .st-icon.tone-purple { background: var(--t-purple-soft); color: var(--t-purple); }
      .st-icon.tone-blue { background: var(--t-primary-soft); color: var(--t-primary); }
      .st-icon.tone-orange { background: var(--t-warning-soft); color: var(--t-warning); }
      .st-main {
        flex: 1;
        min-width: 0;
        display: grid;
        gap: 2px;
      }
      .st-main strong {
        font-size: 15px;
        color: var(--t-text);
      }
      .st-main span {
        font-size: 12px;
        color: var(--t-muted);
        line-height: 1.4;
      }
      .st-chev {
        color: var(--t-faint);
        font-size: 18px;
      }
      .st-row ion-spinner {
        width: 22px;
        height: 22px;
      }
      .st-logout {
        width: 100%;
        margin-top: 24px;
        min-height: 52px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        border-radius: 16px;
        border: 1px solid var(--t-danger);
        background: var(--t-danger-soft);
        color: var(--t-danger);
        font: inherit;
        font-size: 15px;
        font-weight: 800;
      }
      .st-foot {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 6px;
        margin: 18px 0 0;
        font-size: 12px;
        color: var(--t-faint);
      }
    `,
  ],
})
export class SettingsPage {
  profile: Profile | null = null;
  mode: ThemeMode = "light";
  bioAvailable = false;
  bioEnabled = false;
  bioBusy = false;
  readonly native = Capacitor.isNativePlatform();

  constructor(
    private readonly supabase: SupabaseService,
    private readonly theme: ThemeService,
    private readonly bioSetup: BiometricSetupService,
    private readonly notifications: NotificationsService,
    private readonly router: Router,
    private readonly alertCtrl: AlertController,
  ) {
    addIcons({
      "finger-print-outline": fingerPrintOutline,
      "key-outline": keyOutline,
      "log-out-outline": logOutOutline,
      "notifications-outline": notificationsOutline,
      "chevron-forward-outline": chevronForwardOutline,
      "shield-checkmark-outline": shieldCheckmarkOutline,
    });
    this.mode = this.theme.mode;
  }

  async ionViewWillEnter() {
    this.mode = this.theme.mode;
    this.profile = await this.supabase.getMyProfile().catch(() => null);
    this.bioAvailable = await this.bioSetup.isAvailable();
    this.bioEnabled = this.bioSetup.isEnabled();
  }

  get roleLabel(): string {
    return this.profile ? ROLE_LABELS[this.profile.role] ?? "" : "";
  }

  get initials(): string {
    const parts = (this.profile?.full_name || "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "·";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  get bioText(): string {
    if (!this.native) return "Disponible en la app del móvil.";
    if (!this.bioAvailable)
      return "Este móvil no tiene huella ni rostro configurados. Actívalos en los ajustes del teléfono.";
    return this.bioEnabled
      ? "Activado: al abrir la app entrarás con tu huella o tu rostro."
      : "Entra sin escribir la contraseña.";
  }

  setMode(m: ThemeMode) {
    this.theme.set(m);
    this.mode = m;
  }

  async toggleBio(ev: CustomEvent) {
    const want = !!(ev.detail as any)?.checked;
    if (want === this.bioEnabled) return;
    this.bioBusy = true;
    try {
      if (want) {
        this.bioEnabled = await this.bioSetup.promptEnable();
      } else {
        await this.bioSetup.disable();
        this.bioEnabled = false;
      }
    } finally {
      this.bioBusy = false;
    }
  }

  go(url: string) {
    void this.router.navigateByUrl(url);
  }

  async logout() {
    const alert = await this.alertCtrl.create({
      header: "Cerrar sesión",
      message: "¿Seguro que quieres salir?",
      buttons: [
        { text: "Cancelar", role: "cancel" },
        { text: "Cerrar sesión", role: "destructive" },
      ],
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    if (role !== "destructive") return;
    this.notifications.stop();
    await this.supabase.signOut().catch(() => undefined);
    await this.router.navigateByUrl("/login", { replaceUrl: true });
  }
}
