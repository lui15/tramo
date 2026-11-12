import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

import {
  IonContent,
  IonIcon,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  IonSearchbar,
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
} from "@ionic/angular/standalone";

import { addIcons } from "ionicons";
import {
  peopleOutline,
  briefcaseOutline,
  notificationsOutline,
  personOutline,
  alertCircleOutline,
  chevronForwardOutline,
  closeOutline,
} from "ionicons/icons";

import {
  SupabaseService,
  TeamMember,
  ROLE_LABELS,
  STATUS_LABELS,
} from "../../../services/supabase.service";

import { PageHeaderComponent } from "../../../components/page-header.component";
import { SecretaryTabbarComponent } from "../../../components/secretary-tabbar.component";
import { PayrollPanelComponent } from "../../../components/payroll-panel.component";

// =====================================================
// EQUIPO (SECRETARÍA)
// Directorio del equipo. Al tocar un colaborador se abre su ficha con
// "Adelantar parte del pago" y "Pagar salario".
// =====================================================
@Component({
  selector: "app-secretary-panel",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonIcon,
    IonSpinner,
    IonRefresher,
    IonRefresherContent,
    IonSearchbar,
    IonModal,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    PageHeaderComponent,
    PayrollPanelComponent,
    SecretaryTabbarComponent,
  ],
  template: `
    <app-page-header title="Equipo" subtitle="Secretaría"></app-page-header>

    <ion-content class="sp-content">
      <ion-refresher slot="fixed" (ionRefresh)="refresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <div class="sp-wrap">
        <section class="sp-stats">
          <div class="sp-stat blue">
            <ion-icon name="people-outline"></ion-icon>
            <div>
              <strong>{{ active.length }}</strong>
              <span>Colaboradores activos</span>
            </div>
          </div>
          <div class="sp-stat green">
            <ion-icon name="briefcase-outline"></ion-icon>
            <div>
              <strong>{{ countRole("encargado") }}</strong>
              <span>Encargados</span>
            </div>
          </div>
          <div class="sp-stat orange">
            <ion-icon name="person-outline"></ion-icon>
            <div>
              <strong>{{ countRole("ayudante") }}</strong>
              <span>Ayudantes</span>
            </div>
          </div>
        </section>

        <section class="sp-section">
          <div class="sp-section-head">
            <h2>Equipo</h2>
            <span>{{ filtered.length }}</span>
          </div>

          <ion-searchbar
            class="sp-search"
            placeholder="Buscar por nombre, usuario o cargo"
            [(ngModel)]="search"
            (ionInput)="applyFilter()"
          ></ion-searchbar>

          <div class="sp-error" *ngIf="errorMessage">
            <ion-icon name="alert-circle-outline"></ion-icon>
            {{ errorMessage }}
          </div>

          <div class="sp-loading" *ngIf="loading">
            <ion-spinner name="crescent"></ion-spinner>
          </div>

          <div class="sp-list" *ngIf="!loading">
            <button type="button" class="sp-member" *ngFor="let m of filtered" (click)="open(m)">
              <div class="sp-avatar">
                <img
                  *ngIf="m.avatar_path && avatars[m.avatar_path]"
                  [src]="avatars[m.avatar_path]"
                  alt=""
                />
                <span *ngIf="!(m.avatar_path && avatars[m.avatar_path])">
                  {{ initials(m.full_name) }}
                </span>
              </div>
              <div class="sp-member-info">
                <strong>{{ m.full_name }}</strong>
                <span>&#64;{{ m.username || "—" }}</span>
              </div>
              <div class="sp-tags">
                <span class="sp-role" [attr.data-role]="m.role">
                  {{ roleLabels[m.role] }}
                </span>
                <span
                  class="sp-status"
                  *ngIf="m.account_status !== 'activo'"
                >
                  {{ statusLabels[m.account_status] }}
                </span>
              </div>
              <ion-icon class="sp-chev" name="chevron-forward-outline"></ion-icon>
            </button>

            <div class="sp-empty" *ngIf="filtered.length === 0">
              No hay colaboradores que mostrar.
            </div>
          </div>
        </section>
      </div>
    </ion-content>

    <app-secretary-tabbar></app-secretary-tabbar>

    <!-- FICHA DEL COLABORADOR: pagos -->
    <ion-modal [isOpen]="!!selected" (didDismiss)="selected = null">
      <ng-template>
        <ion-header class="ion-no-border">
          <ion-toolbar>
            <ion-title>Ficha</ion-title>
            <ion-buttons slot="end">
              <ion-button (click)="selected = null" aria-label="Cerrar">
                <ion-icon name="close-outline"></ion-icon>
              </ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content>
          <div class="t-page" *ngIf="selected">
            <section class="t-card sp-detail">
              <div class="sp-avatar big">
                <img *ngIf="selected.avatar_path && avatars[selected.avatar_path]" [src]="avatars[selected.avatar_path]" alt="" />
                <span *ngIf="!(selected.avatar_path && avatars[selected.avatar_path])">{{ initials(selected.full_name) }}</span>
              </div>
              <div class="sp-member-info">
                <strong>{{ selected.full_name }}</strong>
                <span>&#64;{{ selected.username || "—" }} · {{ roleLabels[selected.role] }}</span>
              </div>
            </section>

            <app-payroll-panel [employeeId]="selected.id" [employeeName]="selected.full_name"></app-payroll-panel>
          </div>
        </ion-content>
      </ng-template>
    </ion-modal>
  `,
  styles: [
    `
      .sp-content {
        --background: var(--tramo-bg, var(--t-surface-2));
      }
      .sp-wrap {
        max-width: 960px;
        margin: 0 auto;
        padding: 20px 16px 40px;
        color: var(--tramo-text, var(--t-text));
      }
      .sp-hero h1 {
        margin: 0;
        font-size: 24px;
        font-weight: 800;
      }
      .sp-hero p {
        margin: 6px 0 18px;
        color: var(--tramo-muted, var(--t-muted));
      }
      .sp-stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 12px;
        margin-bottom: 22px;
      }
      .sp-stat {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px;
        border-radius: 18px;
        background: var(--tramo-surface, var(--t-surface));
        box-shadow: var(--t-shadow);
      }
      .sp-stat ion-icon {
        font-size: 22px;
        padding: 10px;
        border-radius: 14px;
      }
      .sp-stat.blue ion-icon { background: var(--t-primary-soft); color: var(--t-primary); }
      .sp-stat.green ion-icon { background: #e3f6ee; color: #0f9f6e; }
      .sp-stat.orange ion-icon { background: #fff1e3; color: #e8590c; }
      .sp-stat strong {
        display: block;
        font-size: 22px;
        font-weight: 800;
      }
      .sp-stat span {
        font-size: 13px;
        color: var(--tramo-muted, var(--t-muted));
      }
      .sp-section {
        background: var(--tramo-surface, var(--t-surface));
        border-radius: 20px;
        padding: 16px;
        box-shadow: var(--t-shadow);
      }
      .sp-section-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .sp-section-head h2 {
        margin: 0;
        font-size: 18px;
        font-weight: 800;
      }
      .sp-section-head span {
        font-size: 13px;
        font-weight: 700;
        background: var(--tramo-input, var(--t-surface-2));
        padding: 4px 10px;
        border-radius: 999px;
      }
      .sp-search {
        --border-radius: 14px;
        --background: var(--tramo-input, var(--t-surface-2));
        --box-shadow: none;
        padding: 12px 0;
      }
      .sp-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .sp-member {
        width: 100%;
        border: 0;
        font: inherit;
        color: inherit;
        text-align: left;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        border-radius: 14px;
        background: var(--tramo-input, var(--t-surface-2));
      }
      .sp-avatar {
        width: 42px;
        height: 42px;
        border-radius: 14px;
        background: var(--t-primary-soft);
        color: var(--t-primary);
        display: grid;
        place-items: center;
        font-weight: 800;
        overflow: hidden;
        flex-shrink: 0;
      }
      .sp-avatar.big {
        width: 56px;
        height: 56px;
        border-radius: 18px;
        font-size: 18px;
      }
      .sp-chev {
        color: var(--t-faint);
        font-size: 18px;
        flex-shrink: 0;
      }
      .sp-detail {
        display: flex;
        align-items: center;
        gap: 14px;
        margin-bottom: 14px;
      }
      .sp-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .sp-member-info {
        flex: 1;
        min-width: 0;
      }
      .sp-member-info strong {
        display: block;
        font-size: 15px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .sp-member-info span {
        font-size: 13px;
        color: var(--tramo-muted, var(--t-muted));
      }
      .sp-tags {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 4px;
      }
      .sp-role,
      .sp-status {
        font-size: 12px;
        font-weight: 700;
        padding: 4px 10px;
        border-radius: 999px;
        white-space: nowrap;
      }
      .sp-role { background: var(--t-primary-soft); color: var(--t-primary); }
      .sp-role[data-role="encargado"] { background: #e3f6ee; color: #0f9f6e; }
      .sp-role[data-role="ayudante"] { background: #fff1e3; color: #e8590c; }
      .sp-role[data-role="secretaria"] { background: #f3e8ff; color: #7c3aed; }
      .sp-status { background: #fee2e2; color: #dc2626; }
      .sp-loading,
      .sp-empty {
        padding: 24px;
        text-align: center;
        color: var(--tramo-muted, var(--t-muted));
      }
      .sp-error {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 12px;
        margin-bottom: 10px;
        border-radius: 12px;
        background: rgba(239, 68, 68, 0.1);
        color: #dc2626;
        font-size: 14px;
      }
    `,
  ],
})
export class SecretaryPanelPage implements OnInit {
  team: TeamMember[] = [];
  active: TeamMember[] = [];
  filtered: TeamMember[] = [];
  avatars: Record<string, string> = {};
  search = "";
  loading = true;
  errorMessage = "";
  selected: TeamMember | null = null;

  readonly roleLabels = ROLE_LABELS;
  readonly statusLabels = STATUS_LABELS;

  constructor(private readonly supabase: SupabaseService) {
    addIcons({
      peopleOutline,
      briefcaseOutline,
      notificationsOutline,
      personOutline,
      alertCircleOutline,
      chevronForwardOutline,
      closeOutline,
    });
  }

  async ngOnInit() {
    await this.load();
  }

  async load() {
    this.loading = true;
    this.errorMessage = "";

    try {
      this.team = await this.supabase.listTeam();
      this.active = this.team.filter((m) => m.account_status === "activo");
      this.avatars = await this.supabase.getAvatarUrls(
        this.team.map((m) => m.avatar_path || ""),
      );
      this.applyFilter();
    } catch (err: any) {
      this.errorMessage = err?.message || "No se pudo cargar el equipo.";
    } finally {
      this.loading = false;
    }
  }

  async refresh(event: any) {
    await this.load();
    event?.target?.complete?.();
  }

  applyFilter() {
    const q = this.search.trim().toLowerCase();

    this.filtered = q
      ? this.team.filter(
          (m) =>
            m.full_name?.toLowerCase().includes(q) ||
            m.username?.toLowerCase().includes(q) ||
            ROLE_LABELS[m.role].toLowerCase().includes(q),
        )
      : [...this.team];
  }

  open(member: TeamMember) {
    this.selected = member;
  }

  countRole(role: TeamMember["role"]): number {
    return this.active.filter((m) => m.role === role).length;
  }

  initials(name: string): string {
    const parts = (name || "").trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
}
