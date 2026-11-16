import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import {
  AlertController,
  IonContent,
  IonIcon,
  IonModal,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
  ToastController,
} from "@ionic/angular/standalone";
import { addIcons } from "ionicons";
import { addOutline, callOutline, closeOutline, peopleOutline, alertCircleOutline, trashOutline } from "ionicons/icons";

import { PageHeaderComponent } from "../../../components/page-header.component";
import { AdminTabbarComponent } from "../../../components/admin-tabbar.component";
import { Associate, SERVICE_LABELS, ServiceType, SupabaseService } from "../../../services/supabase.service";

const SERVICES: ServiceType[] = ["mudanza", "montaje", "reforma"];
const SERVICE_EMOJI: Record<ServiceType, string> = { mudanza: "🚚", montaje: "🔧", reforma: "🏗️" };

// =====================================================================
// ASOCIADOS (solo administrador)
// Personas o empresas a las que se pasan trabajos como contratista.
// No son usuarios: no tienen cuenta, rol ni acceso a la app.
// =====================================================================
@Component({
  selector: "app-asociados",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonIcon,
    IonModal,
    IonRefresher,
    IonRefresherContent,
    IonSpinner,
    PageHeaderComponent,
    AdminTabbarComponent,
  ],
  template: `
    <app-page-header title="Asociados" subtitle="Contratista" [back]="'/admin/trabajos'">
      <button type="button" class="as-add" (click)="openNew()" aria-label="Nuevo asociado">
        <ion-icon name="add-outline"></ion-icon>
      </button>
    </app-page-header>

    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="refresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <div class="t-page">
        <p class="as-intro">
          🤝 Personas o empresas a las que pasas trabajos. No tienen cuenta en la app ni ven nada.
        </p>

        <div class="as-error" *ngIf="error">
          <ion-icon name="alert-circle-outline"></ion-icon><span>{{ error }}</span>
        </div>

        <div class="t-skeleton" *ngIf="loading && !list.length" style="height: 120px"></div>

        <div class="as-list">
          <button type="button" class="as-card" *ngFor="let a of list" (click)="openEdit(a)" [class.off]="!a.is_active">
            <span class="as-avatar">{{ initials(a.full_name) }}</span>
            <div class="as-info">
              <strong>{{ a.full_name }}<small *ngIf="!a.is_active"> · de baja</small></strong>
              <span class="as-phone" *ngIf="a.phone"><ion-icon name="call-outline"></ion-icon> {{ a.phone }}</span>
              <div class="as-chips">
                <span class="as-chip" *ngFor="let s of a.specialties" [attr.data-s]="s">{{ emoji[s] }} {{ labels[s] }}</span>
              </div>
            </div>
          </button>

          <div class="t-empty" *ngIf="!loading && !list.length && !error">
            <ion-icon name="people-outline"></ion-icon>
            Aún no tienes asociados. Pulsa + para añadir el primero.
          </div>
        </div>
      </div>
    </ion-content>

    <ion-modal [isOpen]="!!form" (didDismiss)="form = null">
      <ng-template>
        <ion-content>
          <div class="jf-modal-head">
            <h2>{{ form?.id ? "Editar asociado" : "Nuevo asociado" }}</h2>
            <button type="button" (click)="form = null" aria-label="Cerrar"><ion-icon name="close-outline"></ion-icon></button>
          </div>

          <div class="v-form" *ngIf="form">
            <label class="jf-input">
              <span>Nombre o empresa *</span>
              <input [(ngModel)]="form.full_name" maxlength="80" placeholder="Reformas García" />
            </label>
            <label class="jf-input">
              <span>Teléfono</span>
              <input [(ngModel)]="form.phone" maxlength="20" inputmode="tel" placeholder="600 000 000" />
            </label>

            <div class="price-label">¿En qué es especialista? *</div>
            <div class="as-pick">
              <button type="button" *ngFor="let s of services" [class.on]="has(s)" (click)="toggle(s)">
                <span>{{ emoji[s] }}</span> {{ labels[s] }}
              </button>
            </div>

            <label class="jf-input">
              <span>Notas</span>
              <textarea [(ngModel)]="form.notes" maxlength="500" placeholder="Zona, horarios, cómo trabaja…"></textarea>
            </label>

            <p class="as-problem" *ngIf="problem">{{ problem }}</p>

            <div class="jf-actions">
              <button type="button" class="jf-btn primary" (click)="save()" [disabled]="saving || !!problem">
                <ion-spinner *ngIf="saving" name="crescent"></ion-spinner>
                {{ form.id ? "Guardar cambios" : "Añadir asociado" }}
              </button>
              <button type="button" class="jf-btn ghost" *ngIf="form.id" (click)="toggleActive()" [disabled]="saving">
                <ion-icon name="trash-outline" *ngIf="form.is_active"></ion-icon>
                {{ form.is_active ? "Dar de baja" : "Volver a dar de alta" }}
              </button>
            </div>
          </div>
        </ion-content>
      </ng-template>
    </ion-modal>

    <app-admin-tabbar></app-admin-tabbar>
  `,
  styles: [
    `
      .as-add {
        width: 40px;
        height: 40px;
        border-radius: 12px;
        border: 0;
        background: var(--t-primary);
        color: var(--t-on-primary);
        font-size: 22px;
        display: grid;
        place-items: center;
        box-shadow: var(--t-shadow);
      }
      .as-intro {
        margin: 0 0 14px;
        font-size: 13px;
        color: var(--t-text-2);
      }
      .as-error {
        display: flex;
        gap: 8px;
        align-items: center;
        padding: 12px 14px;
        margin-bottom: 12px;
        border-radius: 14px;
        background: var(--t-danger-soft);
        color: var(--t-danger);
        font-size: 13px;
        font-weight: 600;
      }
      .as-list {
        display: grid;
        gap: 10px;
      }
      .as-card {
        display: flex;
        gap: 12px;
        align-items: center;
        width: 100%;
        padding: 14px;
        border-radius: 18px;
        border: 1px solid var(--t-border);
        background: var(--t-surface);
        color: var(--t-text);
        font: inherit;
        text-align: left;
      }
      .as-card.off {
        opacity: 0.55;
      }
      .as-avatar {
        width: 46px;
        height: 46px;
        border-radius: 15px;
        flex-shrink: 0;
        display: grid;
        place-items: center;
        font-weight: 800;
        background: var(--t-purple-soft);
        color: var(--t-purple);
      }
      .as-info {
        display: grid;
        gap: 4px;
        min-width: 0;
      }
      .as-info strong {
        font-size: 15px;
      }
      .as-info small {
        color: var(--t-muted);
        font-weight: 600;
      }
      .as-phone {
        display: flex;
        align-items: center;
        gap: 5px;
        font-size: 12px;
        color: var(--t-muted);
      }
      .as-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .as-chip {
        padding: 3px 9px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 700;
        background: var(--t-primary-soft);
        color: var(--t-primary);
      }
      .as-chip[data-s="montaje"] {
        background: var(--t-warning-soft);
        color: var(--t-warning);
      }
      .as-chip[data-s="reforma"] {
        background: var(--t-success-soft);
        color: var(--t-success);
      }
      .as-pick {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
      }
      .as-pick button {
        display: grid;
        justify-items: center;
        gap: 4px;
        padding: 12px 6px;
        border-radius: 14px;
        border: 2px solid var(--t-border);
        background: var(--t-surface);
        color: var(--t-text-2);
        font: inherit;
        font-size: 13px;
        font-weight: 700;
      }
      .as-pick button span {
        font-size: 24px;
      }
      .as-pick button.on {
        border-color: var(--t-primary);
        background: var(--t-primary-soft);
        color: var(--t-primary);
      }
      .as-problem {
        margin: 0;
        color: var(--t-danger);
        font-size: 13px;
        font-weight: 600;
      }
    `,
  ],
})
export class AsociadosPage {
  list: Associate[] = [];
  loading = true;
  error = "";
  form: Partial<Associate> | null = null;
  saving = false;

  readonly services = SERVICES;
  readonly labels = SERVICE_LABELS;
  readonly emoji = SERVICE_EMOJI;

  constructor(
    private readonly supabase: SupabaseService,
    private readonly toastCtrl: ToastController,
    private readonly alertCtrl: AlertController,
  ) {
    addIcons({
      "add-outline": addOutline,
      "call-outline": callOutline,
      "close-outline": closeOutline,
      "people-outline": peopleOutline,
      "alert-circle-outline": alertCircleOutline,
      "trash-outline": trashOutline,
    });
  }

  async ionViewWillEnter() {
    await this.load();
  }

  async refresh(ev: any) {
    await this.load();
    ev?.target?.complete?.();
  }

  async load() {
    this.loading = true;
    this.error = "";
    try {
      const all = await this.supabase.listAssociates(true);
      this.list = [...all.filter((a) => a.is_active), ...all.filter((a) => !a.is_active)];
    } catch (e: any) {
      this.error = e?.message || "No se pudieron cargar los asociados.";
    } finally {
      this.loading = false;
    }
  }

  openNew() {
    this.form = { full_name: "", phone: "", specialties: [], notes: "", is_active: true };
  }

  openEdit(a: Associate) {
    this.form = { ...a, specialties: [...a.specialties] };
  }

  has(s: ServiceType) {
    return !!this.form?.specialties?.includes(s);
  }

  toggle(s: ServiceType) {
    if (!this.form) return;
    const cur = this.form.specialties ?? [];
    this.form.specialties = cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s];
  }

  get problem(): string {
    if (!this.form) return "";
    if (!this.form.full_name?.trim()) return "Escribe el nombre o la empresa.";
    if (!this.form.specialties?.length) return "Elige al menos una especialidad.";
    return "";
  }

  async save() {
    if (!this.form || this.problem || this.saving) return;
    this.saving = true;
    try {
      await this.supabase.saveAssociate(this.form);
      await this.toast(this.form.id ? "Asociado guardado." : "Asociado añadido. 🤝", "success");
      this.form = null;
      await this.load();
    } catch (e: any) {
      await this.toast(e?.message || "No se pudo guardar.", "danger");
    } finally {
      this.saving = false;
    }
  }

  async toggleActive() {
    if (!this.form?.id) return;
    const deactivate = this.form.is_active !== false;
    if (deactivate) {
      const alert = await this.alertCtrl.create({
        header: "Dar de baja",
        message: `${this.form.full_name} dejará de salir al crear trabajos. Sus trabajos anteriores se conservan.`,
        buttons: [
          { text: "Cancelar", role: "cancel" },
          { text: "Dar de baja", role: "destructive" },
        ],
      });
      await alert.present();
      const { role } = await alert.onDidDismiss();
      if (role !== "destructive") return;
    }
    this.form.is_active = !deactivate;
    await this.save();
  }

  initials(name: string) {
    return String(name || "?")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("");
  }

  private async toast(message: string, color: string) {
    const t = await this.toastCtrl.create({ message, color, duration: 2600, position: "top" });
    await t.present();
  }
}
