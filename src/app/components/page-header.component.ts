import { Component, Input, OnDestroy, OnInit } from "@angular/core";
import { NgIf } from "@angular/common";
import { Router } from "@angular/router";
import {
  IonHeader,
  IonToolbar,
  IonButton,
  IonIcon,
  ActionSheetController,
} from "@ionic/angular/standalone";
import { addIcons } from "ionicons";
import {
  arrowBackOutline,
  moonOutline,
  sunnyOutline,
  keyOutline,
  logOutOutline,
  fingerPrintOutline,
  settingsOutline,
} from "ionicons/icons";

import {
  SupabaseService,
  Profile,
  ROLE_LABELS,
  homeForRole,
} from "../services/supabase.service";
import { ThemeService } from "../services/theme.service";
import { BiometricSetupService } from "../services/biometric-setup.service";
import { NotificationsService } from "../services/notifications.service";
import { NotificationBellComponent } from "./notification-bell.component";

// =====================================================
// CABECERA COMÚN DE TODAS LAS PANTALLAS
// - Título (o saludo en la pantalla de Inicio)
// - Campana de notificaciones
// - Avatar: cuenta, modo oscuro y cerrar sesión
// Los botones propios de cada pantalla se proyectan
// con <ng-content>.
// =====================================================
@Component({
  selector: "app-page-header",
  standalone: true,
  imports: [NgIf, IonHeader, IonToolbar, IonButton, IonIcon, NotificationBellComponent],
  template: `
    <ion-header class="ph-header ion-no-border">
      <ion-toolbar class="ph-toolbar">
        <div class="ph-row">
          <ion-button
            *ngIf="back"
            class="ph-icon-btn"
            fill="clear"
            (click)="goBack()"
            aria-label="Volver"
          >
            <ion-icon name="arrow-back-outline"></ion-icon>
          </ion-button>

          <img
            *ngIf="greeting && !back"
            class="ph-logo"
            src="assets/logo/tramo-mark.svg"
            alt="Tramo"
            width="40"
            height="40"
          />

          <div class="ph-titles">
            <ng-container *ngIf="greeting; else plainTitle">
              <span class="ph-eyebrow">{{ today }}</span>
              <h1>Hola, {{ firstName }} 👋</h1>
              <span class="ph-role" *ngIf="profile" [attr.data-role]="profile.role">
                {{ roleLabel }}
              </span>
            </ng-container>
            <ng-template #plainTitle>
              <span class="ph-eyebrow" *ngIf="subtitle">{{ subtitle }}</span>
              <h1>{{ title }}</h1>
            </ng-template>
          </div>

          <div class="ph-actions">
            <ng-content></ng-content>
            <app-notification-bell></app-notification-bell>
            <!-- Avatar: sol en modo claro, luna en modo oscuro. Al tocarlo cambia el modo. -->
            <button
              type="button"
              class="ph-theme"
              [class.is-dark]="dark"
              (click)="toggleTheme()"
              [attr.aria-label]="dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'"
            >
              <span class="ph-rays" aria-hidden="true"></span>
              <span class="ph-stars" aria-hidden="true"><i></i><i></i><i></i></span>
              <span class="ph-disc"></span>
            </button>
            <button type="button" class="ph-gear" (click)="openSettings()" aria-label="Ajustes">
              <ion-icon name="settings-outline"></ion-icon>
            </button>
          </div>
        </div>
      </ion-toolbar>
    </ion-header>
  `,
  styles: [
    `
      .ph-header {
        background: var(--t-bg);
      }
      .ph-toolbar {
        --background: var(--t-bg);
        --border-width: 0;
        --padding-start: 16px;
        --padding-end: 16px;
        --padding-top: 10px;
        --padding-bottom: 8px;
        --min-height: 64px;
      }
      .ph-row {
        display: flex;
        align-items: center;
        gap: 10px;
        max-width: 1100px;
        margin: 0 auto;
      }
      .ph-logo {
        width: 40px;
        height: 40px;
        flex-shrink: 0;
        border-radius: 12px;
      }
      .ph-role {
        display: inline-flex;
        align-items: center;
        margin-top: 5px;
        padding: 3px 10px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.2px;
        background: var(--t-primary-soft);
        color: var(--t-primary);
      }
      .ph-role[data-role="secretaria"] {
        background: var(--t-purple-soft);
        color: var(--t-purple);
      }
      .ph-role[data-role="encargado"] {
        background: var(--t-success-soft);
        color: var(--t-success);
      }
      .ph-role[data-role="ayudante"] {
        background: var(--t-warning-soft);
        color: var(--t-warning);
      }
      .ph-titles {
        flex: 1;
        min-width: 0;
      }
      .ph-eyebrow {
        display: block;
        font-size: 12px;
        font-weight: 600;
        color: var(--t-muted);
        text-transform: capitalize;
        margin-bottom: 2px;
      }
      h1 {
        margin: 0;
        font-size: 24px;
        line-height: 1.15;
        font-weight: 800;
        letter-spacing: -0.4px;
        color: var(--t-text);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .ph-actions {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-shrink: 0;
      }
      .ph-icon-btn {
        --background: var(--t-surface);
        --color: var(--t-text);
        --border-radius: 12px;
        --padding-start: 9px;
        --padding-end: 9px;
        height: 40px;
        margin: 0;
        box-shadow: var(--t-shadow);
        border-radius: 12px;
      }
      .ph-gear {
        width: 40px;
        height: 40px;
        border-radius: 12px;
        border: 0;
        padding: 0;
        display: grid;
        place-items: center;
        background: var(--t-surface);
        color: var(--t-text);
        font-size: 21px;
        box-shadow: var(--t-shadow);
      }
      .ph-gear ion-icon {
        transition: transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
      }
      .ph-gear:active ion-icon {
        transform: rotate(90deg);
      }
      /* ---------- Avatar sol / luna ---------- */
      .ph-theme {
        position: relative;
        width: 44px;
        height: 44px;
        border: 0;
        padding: 0;
        background: transparent;
        display: grid;
        place-items: center;
        flex-shrink: 0;
      }
      .ph-rays {
        position: absolute;
        inset: 0;
        border-radius: 50%;
        background: repeating-conic-gradient(#f59e0b 0deg 12deg, transparent 12deg 30deg);
        -webkit-mask: radial-gradient(circle, transparent 0 60%, #000 61% 100%);
        mask: radial-gradient(circle, transparent 0 60%, #000 61% 100%);
        animation: phSpin 18s linear infinite;
        transition: opacity 0.5s ease, transform 0.6s ease;
      }
      .ph-disc {
        position: relative;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        overflow: hidden;
        display: grid;
        place-items: center;
        font-weight: 800;
        font-size: 12px;
        letter-spacing: 0.3px;
        color: #7c2d12;
        background: radial-gradient(circle at 35% 30%, #fde68a, #fbbf24 55%, #f59e0b);
        box-shadow: 0 0 14px rgba(251, 191, 36, 0.55);
        transition: background 0.6s ease, box-shadow 0.6s ease, color 0.6s ease, transform 0.6s ease;
      }
      .ph-disc img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .ph-stars {
        position: absolute;
        inset: 0;
        opacity: 0;
        transition: opacity 0.6s ease;
      }
      .ph-stars i {
        position: absolute;
        width: 4px;
        height: 4px;
        border-radius: 50%;
        background: #e2e8f0;
        animation: phTwinkle 2.2s ease-in-out infinite;
      }
      .ph-stars i:nth-child(1) { top: 2px; right: 4px; }
      .ph-stars i:nth-child(2) { bottom: 5px; left: 1px; width: 3px; height: 3px; animation-delay: 0.7s; }
      .ph-stars i:nth-child(3) { top: 10px; left: 0; width: 2px; height: 2px; animation-delay: 1.3s; }
      /* Luna */
      .ph-theme.is-dark .ph-rays {
        opacity: 0;
        transform: scale(0.6) rotate(90deg);
      }
      .ph-theme.is-dark .ph-stars {
        opacity: 1;
      }
      /* Luna llena: disco plateado con cráteres y halo */
      .ph-theme.is-dark .ph-disc {
        width: 32px;
        height: 32px;
        background:
          radial-gradient(circle at 30% 35%, rgba(148, 163, 184, 0.55) 0 3px, transparent 4px),
          radial-gradient(circle at 62% 62%, rgba(148, 163, 184, 0.5) 0 4.5px, transparent 5.5px),
          radial-gradient(circle at 68% 30%, rgba(148, 163, 184, 0.45) 0 2px, transparent 3px),
          radial-gradient(circle at 38% 70%, rgba(148, 163, 184, 0.4) 0 1.8px, transparent 2.8px),
          radial-gradient(circle at 40% 35%, #ffffff, #e2e8f0 55%, #cbd5e1);
        box-shadow: 0 0 10px rgba(226, 232, 240, 0.7), 0 0 22px rgba(191, 219, 254, 0.45);
        animation: phGlow 3s ease-in-out infinite;
      }
      @keyframes phGlow {
        0%, 100% { box-shadow: 0 0 10px rgba(226, 232, 240, 0.6), 0 0 18px rgba(191, 219, 254, 0.35); }
        50% { box-shadow: 0 0 14px rgba(226, 232, 240, 0.9), 0 0 28px rgba(191, 219, 254, 0.6); }
      }
      .ph-disc > span {
        transition: transform 0.6s ease;
      }
      @keyframes phSpin {
        to { transform: rotate(360deg); }
      }
      @keyframes phTwinkle {
        0%, 100% { opacity: 0.25; transform: scale(0.8); }
        50% { opacity: 1; transform: scale(1.2); }
      }
      @media (prefers-reduced-motion: reduce) {
        .ph-rays, .ph-stars i, .ph-disc { animation: none; }
      }
      .ph-avatar {
        width: 40px;
        height: 40px;
        border-radius: 13px;
        border: 0;
        padding: 0;
        overflow: hidden;
        background: var(--t-primary);
        color: var(--t-on-primary);
        font-weight: 800;
        font-size: 14px;
        display: grid;
        place-items: center;
        box-shadow: var(--t-shadow);
      }
      .ph-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      :host ::ng-deep app-notification-bell .bell-button {
        --background: var(--t-surface);
        --color: var(--t-text);
        height: 40px;
        box-shadow: var(--t-shadow);
        border-radius: 12px;
      }
      :host ::ng-deep app-notification-bell .bell-badge {
        box-shadow: 0 0 0 2px var(--t-bg);
      }
    `,
  ],
})
export class PageHeaderComponent implements OnInit, OnDestroy {
  @Input() title = "";
  @Input() subtitle = "";
  @Input() greeting = false;
  /** true = vuelve al inicio del rol; string = ruta concreta */
  @Input() back: boolean | string = false;

  profile: Profile | null = null;
  avatarUrl: string | null = null;

  readonly today = new Date().toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  constructor(
    private readonly supabase: SupabaseService,
    private readonly theme: ThemeService,
    private readonly notifications: NotificationsService,
    private readonly actionSheet: ActionSheetController,
    private readonly router: Router,
    private readonly bioSetup: BiometricSetupService,
  ) {
    addIcons({ arrowBackOutline, moonOutline, sunnyOutline, keyOutline, logOutOutline, fingerPrintOutline, settingsOutline });
    this.dark = this.theme.mode === "dark";
    this.themeSub = this.theme.mode$.subscribe((m) => (this.dark = m === "dark"));
  }

  async ngOnInit() {
    try {
      this.profile = await this.supabase.getMyProfile();

      if (this.profile?.avatar_path) {
        const urls = await this.supabase.getAvatarUrls([this.profile.avatar_path]);
        this.avatarUrl = urls[this.profile.avatar_path] ?? null;
      }
    } catch {
      this.profile = null;
    }
  }

  get roleLabel(): string {
    return this.profile ? ROLE_LABELS[this.profile.role] ?? "" : "";
  }

  get firstName(): string {
    return (this.profile?.full_name || "").trim().split(/\s+/)[0] || "";
  }

  get initials(): string {
    const parts = (this.profile?.full_name || "").trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "·";
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  async goBack() {
    if (typeof this.back === "string") {
      await this.router.navigateByUrl(this.back);
      return;
    }

    await this.router.navigateByUrl(homeForRole(this.profile?.role));
  }

  dark = false;
  private themeSub?: { unsubscribe(): void };

  ngOnDestroy() {
    this.themeSub?.unsubscribe();
  }

  toggleTheme() {
    this.theme.toggle();
  }

  async openSettings() {
    await this.router.navigateByUrl("/ajustes");
  }

  async openMenu() {
    const dark = this.theme.mode === "dark";
    const bioAvailable = await this.bioSetup.isAvailable();
    const bioEnabled = this.bioSetup.isEnabled();
    const bioButtons = bioAvailable
      ? [
          bioEnabled
            ? {
                text: "Desactivar huella / rostro",
                icon: "finger-print-outline",
                handler: () => void this.bioSetup.disable(),
              }
            : {
                text: "Entrar con huella / rostro",
                icon: "finger-print-outline",
                handler: () => void this.bioSetup.promptEnable(),
              },
        ]
      : [];

    const sheet = await this.actionSheet.create({
      header: this.profile?.full_name || "Mi cuenta",
      subHeader: this.profile ? ROLE_LABELS[this.profile.role] : undefined,
      buttons: [
        {
          text: "Mi cuenta y contraseña",
          icon: "key-outline",
          handler: () => void this.router.navigateByUrl("/cuenta/clave"),
        },
        {
          text: dark ? "Modo claro" : "Modo oscuro",
          icon: dark ? "sunny-outline" : "moon-outline",
          handler: () => this.theme.toggle(),
        },
        ...bioButtons,
        {
          text: "Cerrar sesión",
          icon: "log-out-outline",
          role: "destructive",
          handler: () => void this.logout(),
        },
        { text: "Cancelar", role: "cancel" },
      ],
    });

    await sheet.present();
  }

  private async logout() {
    this.notifications.stop();
    await this.supabase.signOut().catch(() => undefined);
    await this.router.navigateByUrl("/login", { replaceUrl: true });
  }
}
