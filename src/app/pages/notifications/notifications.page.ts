import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router } from "@angular/router";

import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
} from "@ionic/angular/standalone";

import { addIcons } from "ionicons";
import {
  arrowBackOutline,
  notificationsOutline,
  briefcaseOutline,
  createOutline,
  trashOutline,
  checkmarkDoneOutline,
  checkmarkCircleOutline,
  cashOutline,
  walletOutline,
  trendingUpOutline,
  alertCircleOutline,
  alarmOutline as tramoAlarmOutline,
  callOutline as tramoCallOutline,
} from "ionicons/icons";

import {
  NotificationsService,
  AppNotification,
} from "../../services/notifications.service";
import { SupabaseService, homeForRole } from "../../services/supabase.service";

const TYPE_META: Record<string, { emoji: string; tone: string; label: string }> = {
  job_created: { emoji: "🆕", tone: "blue", label: "Nuevo trabajo" },
  job_assigned: { emoji: "🚚", tone: "blue", label: "Trabajo asignado" },
  job_updated: { emoji: "✏️", tone: "orange", label: "Trabajo modificado" },
  job_deleted: { emoji: "🗑️", tone: "red", label: "Trabajo eliminado" },
  job_unassigned: { emoji: "↩️", tone: "orange", label: "Cambio de encargado" },
  job_review: { emoji: "📋", tone: "purple", label: "Para revisar" },
  job_returned: { emoji: "🔁", tone: "orange", label: "Devuelto" },
  job_finished: { emoji: "✅", tone: "green", label: "Trabajo finalizado" },
  job_completed: { emoji: "🎉", tone: "green", label: "Trabajo aprobado" },
  payment: { emoji: "💸", tone: "green", label: "Pago" },
  advance: { emoji: "💶", tone: "purple", label: "Adelanto" },
  salary_changed: { emoji: "💼", tone: "purple", label: "Salario" },
  salary_raise: { emoji: "🚀", tone: "green", label: "Subida de sueldo" },
  job_reminder: { emoji: "⏰", tone: "orange", label: "Recordatorio" },
  job_reminder_staff: { emoji: "📞", tone: "orange", label: "Confirmar con el cliente" },
};

const EMOJI_LEAD = /^(?:\p{Extended_Pictographic}|\uFE0F|\u200D|\s)+/u;

// =====================================================
// CENTRO DE NOTIFICACIONES (todos los roles)
// =====================================================
@Component({
  selector: "app-notifications",
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonSpinner,
    IonRefresher,
    IonRefresherContent,
  ],
  template: `
    <ion-header class="nt-header ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button fill="clear" (click)="back()" aria-label="Volver">
            <ion-icon name="arrow-back-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
        <ion-title>🔔 Notificaciones</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="nt-content">
      <ion-refresher slot="fixed" (ionRefresh)="refresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <div class="nt-wrap">
        <div class="nt-error" *ngIf="errorMessage">
          <ion-icon name="alert-circle-outline"></ion-icon>
          {{ errorMessage }}
        </div>

        <div class="nt-loading" *ngIf="loading">
          <ion-spinner name="crescent"></ion-spinner>
        </div>

        <ng-container *ngIf="!loading">
          <section class="nt-hero" *ngIf="items.length">
            <span class="nt-hero-emoji">{{ newCount ? "✨" : "😌" }}</span>
            <div>
              <strong>{{ newCount ? newCount + (newCount === 1 ? " aviso nuevo" : " avisos nuevos") : "¡Estás al día!" }}</strong>
              <span>{{ newCount ? "Ya los hemos marcado como vistos." : "No tienes avisos sin ver." }}</span>
            </div>
          </section>

          <div class="nt-empty" *ngIf="items.length === 0">
            <div class="nt-empty-icon">📭</div>
            <h2>No tienes notificaciones</h2>
            <p>Aquí verás los avisos de trabajos, pagos y cambios. 🙌</p>
          </div>

          <ng-container *ngFor="let group of groups; let gi = index">
            <h3 class="nt-group">{{ groupEmoji(group.label) }} {{ group.label }}</h3>
            <button
              type="button"
              class="nt-item"
              *ngFor="let n of group.items; let i = index"
              [class.unread]="!n.read_at"
              [attr.data-tone]="meta(n).tone"
              [style.animation-delay.ms]="300 + (gi * 2 + i) * 140"
              (click)="open(n)"
            >
              <div class="nt-icon" [attr.data-tone]="meta(n).tone">{{ meta(n).emoji }}</div>
              <div class="nt-main">
                <div class="nt-top">
                  <strong>{{ cleanTitle(n.title) }}</strong>
                  <span class="nt-new" *ngIf="!n.read_at">NUEVO</span>
                </div>
                <p>{{ n.body }}</p>
                <div class="nt-foot">
                  <span class="nt-chip" [attr.data-tone]="meta(n).tone">{{ meta(n).label }}</span>
                  <small>🕒 {{ n.created_at | date: "dd/MM · HH:mm" }}</small>
                </div>
              </div>
            </button>
          </ng-container>
        </ng-container>
      </div>
    </ion-content>
  `,
  styles: [
    `
      .nt-header ion-toolbar {
        --background: var(--t-bg);
        --color: var(--t-text);
      }
      .nt-header ion-title {
        font-weight: 800;
        font-size: 19px;
      }
      .nt-content {
        --background: var(--t-bg);
      }
      .nt-wrap {
        max-width: 760px;
        margin: 0 auto;
        padding: 8px 16px 48px;
        color: var(--t-text);
      }
      .nt-hero {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 16px 18px;
        margin-bottom: 6px;
        border-radius: 22px;
        color: #fff;
        background: linear-gradient(135deg, var(--t-primary), #7c5cff);
        box-shadow: 0 12px 30px rgba(59, 91, 219, 0.28);
        animation: ntPop 0.8s cubic-bezier(0.22, 0.8, 0.3, 1.1) both;
      }
      .nt-hero-emoji {
        font-size: 34px;
        animation: ntWiggle 1.6s ease-in-out 0.4s 2;
      }
      .nt-hero div {
        display: grid;
        gap: 2px;
      }
      .nt-hero strong {
        font-size: 17px;
        font-weight: 800;
      }
      .nt-hero span {
        font-size: 13px;
        opacity: 0.9;
      }
      .nt-group {
        margin: 20px 4px 10px;
        font-size: 13px;
        font-weight: 800;
        letter-spacing: 0.3px;
        text-transform: capitalize;
        color: var(--t-text-2);
      }
      .nt-item {
        width: 100%;
        display: flex;
        gap: 12px;
        align-items: flex-start;
        text-align: left;
        padding: 14px;
        margin-bottom: 10px;
        border: 1px solid var(--t-border);
        border-radius: 20px;
        background: var(--t-surface);
        color: inherit;
        font: inherit;
        box-shadow: var(--t-shadow);
        position: relative;
        overflow: hidden;
        animation: ntIn 0.9s cubic-bezier(0.22, 0.7, 0.2, 1) both;
        transition: transform 0.15s ease;
      }
      .nt-item:active {
        transform: scale(0.98);
      }
      .nt-item.unread::before {
        content: "";
        position: absolute;
        inset: 0 auto 0 0;
        width: 4px;
        background: var(--nt-accent, var(--t-primary));
      }
      .nt-item.unread {
        border-color: var(--t-border-strong);
      }
      .nt-item[data-tone="green"] { --nt-accent: var(--t-success); }
      .nt-item[data-tone="orange"] { --nt-accent: var(--t-warning); }
      .nt-item[data-tone="red"] { --nt-accent: var(--t-danger); }
      .nt-item[data-tone="purple"] { --nt-accent: var(--t-purple); }
      .nt-icon {
        width: 46px;
        height: 46px;
        border-radius: 15px;
        display: grid;
        place-items: center;
        flex-shrink: 0;
        font-size: 24px;
        background: var(--t-primary-soft);
      }
      .nt-icon[data-tone="green"] { background: var(--t-success-soft); }
      .nt-icon[data-tone="orange"] { background: var(--t-warning-soft); }
      .nt-icon[data-tone="red"] { background: var(--t-danger-soft); }
      .nt-icon[data-tone="purple"] { background: var(--t-purple-soft); }
      .nt-item.unread .nt-icon {
        animation: ntBounce 0.9s ease 0.9s both;
      }
      .nt-main {
        flex: 1;
        min-width: 0;
      }
      .nt-top {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 8px;
      }
      .nt-top strong {
        font-size: 15px;
        font-weight: 800;
        line-height: 1.3;
        color: var(--t-text);
      }
      .nt-new {
        flex-shrink: 0;
        padding: 3px 8px;
        border-radius: 999px;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.5px;
        color: #fff;
        background: var(--nt-accent, var(--t-primary));
      }
      .nt-main p {
        margin: 5px 0 8px;
        font-size: 14px;
        line-height: 1.5;
        color: var(--t-text-2);
      }
      .nt-foot {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        flex-wrap: wrap;
      }
      .nt-chip {
        padding: 3px 10px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 700;
        background: var(--t-primary-soft);
        color: var(--t-primary);
      }
      .nt-chip[data-tone="green"] { background: var(--t-success-soft); color: var(--t-success); }
      .nt-chip[data-tone="orange"] { background: var(--t-warning-soft); color: var(--t-warning); }
      .nt-chip[data-tone="red"] { background: var(--t-danger-soft); color: var(--t-danger); }
      .nt-chip[data-tone="purple"] { background: var(--t-purple-soft); color: var(--t-purple); }
      .nt-foot small {
        font-size: 12px;
        color: var(--t-muted);
      }
      .nt-loading,
      .nt-empty {
        text-align: center;
        padding: 56px 16px;
        color: var(--t-muted);
      }
      .nt-empty-icon {
        width: 84px;
        height: 84px;
        margin: 0 auto 14px;
        border-radius: 28px;
        display: grid;
        place-items: center;
        font-size: 42px;
        background: var(--t-primary-soft);
        animation: ntPop 0.5s cubic-bezier(0.2, 0.9, 0.3, 1.3) both;
      }
      .nt-empty h2 {
        margin: 0 0 6px;
        font-size: 18px;
        color: var(--t-text);
      }
      .nt-error {
        display: flex;
        gap: 8px;
        align-items: center;
        padding: 10px 12px;
        border-radius: 12px;
        background: var(--t-danger-soft);
        color: var(--t-danger);
      }
      @keyframes ntIn {
        from { opacity: 0; transform: translateY(22px) scale(0.97); filter: blur(2px); }
        to { opacity: 1; transform: none; filter: none; }
      }
      @keyframes ntPop {
        from { opacity: 0; transform: scale(0.85); }
        to { opacity: 1; transform: none; }
      }
      @keyframes ntBounce {
        0% { transform: scale(1); }
        40% { transform: scale(1.18) rotate(-6deg); }
        70% { transform: scale(0.95) rotate(3deg); }
        100% { transform: scale(1); }
      }
      @keyframes ntWiggle {
        0%, 100% { transform: rotate(0); }
        25% { transform: rotate(-12deg); }
        75% { transform: rotate(12deg); }
      }
      @media (prefers-reduced-motion: reduce) {
        .nt-item, .nt-hero, .nt-icon, .nt-hero-emoji, .nt-empty-icon { animation: none !important; }
      }
    `,
  ],
})
export class NotificationsPage implements OnInit {
  items: AppNotification[] = [];
  groups: { label: string; items: AppNotification[] }[] = [];
  loading = true;
  errorMessage = "";

  constructor(
    private readonly notifications: NotificationsService,
    private readonly supabase: SupabaseService,
    private readonly router: Router,
  ) {
    addIcons({
      "alarm-outline": tramoAlarmOutline,
      "call-outline": tramoCallOutline,
      arrowBackOutline,
      notificationsOutline,
      briefcaseOutline,
      createOutline,
      trashOutline,
      checkmarkDoneOutline,
      checkmarkCircleOutline,
      cashOutline,
      walletOutline,
      trendingUpOutline,
      alertCircleOutline,
    });
  }

  get unreadCount(): number {
    return this.items.filter((n) => !n.read_at).length;
  }

  async ngOnInit() {
    await this.load();
  }

  async load() {
    this.loading = true;
    this.errorMessage = "";

    try {
      this.items = await this.notifications.list();
      this.buildGroups();

      // Al entrar se marcan como vistas automáticamente. Se mantiene el
      // resaltado de las nuevas mientras se está en la pantalla.
      if (this.items.some((n) => !n.read_at)) {
        await this.notifications.markRead().catch(() => undefined);
      }
      await this.notifications.refreshCount();
    } catch (err: any) {
      this.errorMessage = err?.message || "No se pudieron cargar las notificaciones.";
    } finally {
      this.loading = false;
    }
  }

  async refresh(event: any) {
    await this.load();
    event?.target?.complete?.();
  }

  meta(n: AppNotification) {
    return TYPE_META[n.type] ?? { emoji: "🔔", tone: "blue", label: "Aviso" };
  }

  get newCount(): number {
    return this.items.filter((n) => !n.read_at).length;
  }

  /** El emoji ya sale en el icono: se quita del principio del título. */
  cleanTitle(title: string): string {
    const t = String(title || "").replace(EMOJI_LEAD, "").trim();
    return t || title;
  }

  groupEmoji(label: string): string {
    return label === "Hoy" ? "🌞" : label === "Ayer" ? "🌙" : "🗓️";
  }

  async open(n: AppNotification) {
    if (!n.read_at) {
      n.read_at = new Date().toISOString();
      await this.notifications.markRead([n.id]).catch(() => undefined);
    }

    const route = this.notifications.routeFor(n);

    if (route) {
      await this.router.navigateByUrl(route);
    }
  }

  async markAll() {
    await this.notifications.markRead();
    const now = new Date().toISOString();
    this.items.forEach((n) => (n.read_at = n.read_at ?? now));
  }

  async back() {
    const profile = await this.supabase.getMyProfile();
    await this.router.navigateByUrl(homeForRole(profile?.role));
  }

  private buildGroups() {
    const today = new Date();
    const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const startYesterday = startToday - 86_400_000;

    const groups = new Map<string, AppNotification[]>();

    for (const n of this.items) {
      const t = new Date(n.created_at).getTime();
      const label =
        t >= startToday
          ? "Hoy"
          : t >= startYesterday
            ? "Ayer"
            : new Date(n.created_at).toLocaleDateString("es-ES", {
                month: "long",
                year: "numeric",
              });

      if (!groups.has(label)) groups.set(label, []);
      groups.get(label)!.push(n);
    }

    this.groups = [...groups.entries()].map(([label, items]) => ({ label, items }));
  }
}
