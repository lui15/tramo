import { Component } from "@angular/core";
import { AsyncPipe, NgIf } from "@angular/common";
import { RouterLink } from "@angular/router";
import { IonButton, IonIcon } from "@ionic/angular/standalone";
import { addIcons } from "ionicons";
import { notificationsOutline } from "ionicons/icons";

import { NotificationsService } from "../services/notifications.service";

// Campana con el contador de notificaciones sin leer.
@Component({
  selector: "app-notification-bell",
  standalone: true,
  imports: [IonButton, IonIcon, RouterLink, AsyncPipe, NgIf],
  template: `
    <ion-button
      class="bell-button"
      fill="clear"
      routerLink="/notificaciones"
      aria-label="Notificaciones"
    >
      <ion-icon name="notifications-outline"></ion-icon>
      <span class="bell-badge" *ngIf="(notifications.unread$ | async) as count">
        {{ count > 99 ? "99+" : count }}
      </span>
    </ion-button>
  `,
  styles: [
    `
      .bell-button {
        position: relative;
        --background: #f1f5fb;
        --color: #475569;
        --border-radius: 12px;
        --padding-start: 10px;
        --padding-end: 10px;
        height: 38px;
        margin: 0;
        overflow: visible;
      }
      .bell-button ion-icon {
        font-size: 20px;
      }
      .bell-badge {
        position: absolute;
        top: -4px;
        right: -4px;
        min-width: 18px;
        height: 18px;
        padding: 0 5px;
        border-radius: 999px;
        background: #ef4444;
        color: #fff;
        font-size: 11px;
        font-weight: 800;
        line-height: 18px;
        text-align: center;
        box-shadow: 0 0 0 2px #fff;
      }
    `,
  ],
})
export class NotificationBellComponent {
  constructor(readonly notifications: NotificationsService) {
    addIcons({ notificationsOutline });
  }
}
