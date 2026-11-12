import { Component, Input } from "@angular/core";
import { NgFor } from "@angular/common";
import { RouterLink, RouterLinkActive } from "@angular/router";
import { IonFooter, IonIcon } from "@ionic/angular/standalone";
import { addIcons } from "ionicons";
import {
  homeOutline,
  home,
  briefcaseOutline,
  briefcase,
  peopleOutline,
  people,
  walletOutline,
  wallet,
  timeOutline,
  time,
  cashOutline,
  cash,
} from "ionicons/icons";

export interface TabItem {
  label: string;
  route: string;
  icon: string;
}

// =====================================================
// BARRA INFERIOR COMÚN (todos los roles)
// =====================================================
@Component({
  selector: "app-tabbar",
  standalone: true,
  imports: [NgFor, RouterLink, RouterLinkActive, IonFooter, IonIcon],
  template: `
    <ion-footer class="tb-footer ion-no-border">
      <nav class="tb-bar">
        <a
          *ngFor="let t of items"
          class="tb-item"
          [routerLink]="t.route"
          routerLinkActive="tb-active"
          #rla="routerLinkActive"
        >
          <span class="tb-pill">
            <ion-icon [name]="rla.isActive ? t.icon : t.icon + '-outline'"></ion-icon>
          </span>
          <span class="tb-label">{{ t.label }}</span>
        </a>
      </nav>
    </ion-footer>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .tb-footer {
        background: var(--t-surface);
        border-top: 1px solid var(--t-border);
        padding-bottom: env(safe-area-inset-bottom);
      }
      .tb-bar {
        display: flex;
        justify-content: space-around;
        align-items: stretch;
        max-width: 640px;
        margin: 0 auto;
        padding: 6px 6px 8px;
      }
      .tb-item {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 3px;
        padding: 4px 0;
        text-decoration: none;
        color: var(--t-muted);
        -webkit-tap-highlight-color: transparent;
      }
      .tb-pill {
        width: 56px;
        height: 30px;
        border-radius: 999px;
        display: grid;
        place-items: center;
        transition: background 0.2s ease;
      }
      .tb-pill ion-icon {
        font-size: 21px;
      }
      .tb-label {
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.1px;
      }
      .tb-active {
        color: var(--t-primary);
      }
      .tb-active .tb-pill {
        background: var(--t-primary-soft);
      }
      .tb-active .tb-label {
        font-weight: 800;
      }
    `,
  ],
})
export class TabbarComponent {
  @Input() items: TabItem[] = [];

  constructor() {
    addIcons({
      "home-outline": homeOutline,
      home,
      "briefcase-outline": briefcaseOutline,
      briefcase,
      "people-outline": peopleOutline,
      people,
      "wallet-outline": walletOutline,
      wallet,
      "time-outline": timeOutline,
      time,
      "cash-outline": cashOutline,
      cash,
    });
  }
}
