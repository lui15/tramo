import { Component, Input, OnChanges, SimpleChanges } from "@angular/core";
import { CommonModule } from "@angular/common";
import { IonIcon, IonSpinner } from "@ionic/angular/standalone";
import { addIcons } from "ionicons";
import { cameraOutline, closeOutline, trashOutline, imagesOutline } from "ionicons/icons";

import { JobPhoto, SupabaseService } from "../services/supabase.service";

// =====================================================
// FOTOS DE UN TRABAJO
// Lo usan: encargado (ficha y cierre), secretaría y admin.
// Los permisos reales los aplica el servidor (RLS + storage).
// =====================================================
@Component({
  selector: "app-job-photos",
  standalone: true,
  imports: [CommonModule, IonIcon, IonSpinner],
  template: `
    <section class="jp">
      <div class="jp-head">
        <span class="jp-title"><ion-icon name="images-outline"></ion-icon> Fotos del trabajo</span>
        <label class="jp-add" *ngIf="canUpload" [class.disabled]="uploading">
          <input type="file" accept="image/*" multiple (change)="onFiles($event)" [disabled]="uploading" hidden />
          <ion-spinner *ngIf="uploading" name="crescent"></ion-spinner>
          <ion-icon *ngIf="!uploading" name="camera-outline"></ion-icon>
          {{ uploading ? "Subiendo…" : "Añadir fotos" }}
        </label>
      </div>

      <p class="jp-error" *ngIf="error">{{ error }}</p>

      <div class="jp-grid" *ngIf="photos.length; else empty">
        <div class="jp-item" *ngFor="let p of photos">
          <img [src]="p.url" alt="Foto del trabajo" loading="lazy" (click)="preview = p" />
          <button type="button" class="jp-del" *ngIf="canUpload" (click)="remove(p)" aria-label="Borrar foto">
            <ion-icon name="trash-outline"></ion-icon>
          </button>
        </div>
      </div>
      <ng-template #empty>
        <p class="jp-empty" *ngIf="!loading">Todavía no hay fotos.</p>
        <p class="jp-empty" *ngIf="loading">Cargando fotos…</p>
      </ng-template>

      <div class="jp-preview" *ngIf="preview" (click)="preview = null">
        <img [src]="preview.url" alt="Foto ampliada" />
        <button type="button" class="jp-close" aria-label="Cerrar"><ion-icon name="close-outline"></ion-icon></button>
      </div>
    </section>
  `,
  styles: [
    `
      .jp { display: grid; gap: 10px; }
      .jp-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
      .jp-title { display: inline-flex; align-items: center; gap: 6px; font-weight: 800; color: var(--t-text); font-size: 14px; }
      .jp-add {
        display: inline-flex; align-items: center; gap: 6px; cursor: pointer;
        padding: 8px 12px; border-radius: 999px; font-size: 13px; font-weight: 700;
        background: var(--t-primary-soft); color: var(--t-primary);
      }
      .jp-add.disabled { opacity: 0.6; pointer-events: none; }
      .jp-add ion-spinner { width: 16px; height: 16px; }
      .jp-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
      .jp-item { position: relative; aspect-ratio: 1; border-radius: 12px; overflow: hidden; background: var(--t-surface-2); border: 1px solid var(--t-border); }
      .jp-item img { width: 100%; height: 100%; object-fit: cover; display: block; cursor: zoom-in; }
      .jp-del {
        position: absolute; top: 4px; right: 4px; width: 28px; height: 28px; border-radius: 50%;
        border: none; background: rgba(0, 0, 0, 0.55); color: #fff; display: grid; place-items: center;
      }
      .jp-empty { margin: 0; color: var(--t-muted); font-size: 13px; }
      .jp-error { margin: 0; color: var(--t-danger, #dc2626); font-size: 13px; font-weight: 600; }
      .jp-preview {
        position: fixed; inset: 0; z-index: 100000; background: rgba(0, 0, 0, 0.88);
        display: grid; place-items: center; padding: 16px;
      }
      .jp-preview img { max-width: 100%; max-height: 100%; border-radius: 10px; }
      .jp-close {
        position: absolute; top: calc(16px + env(safe-area-inset-top)); right: 16px;
        width: 40px; height: 40px; border-radius: 50%; border: none; background: rgba(255, 255, 255, 0.15);
        color: #fff; font-size: 22px; display: grid; place-items: center;
      }
    `,
  ],
})
export class JobPhotosComponent implements OnChanges {
  @Input() jobId: string | null = null;
  @Input() canUpload = false;

  photos: JobPhoto[] = [];
  loading = false;
  uploading = false;
  error = "";
  preview: JobPhoto | null = null;

  constructor(private readonly supabase: SupabaseService) {
    addIcons({
      "camera-outline": cameraOutline,
      "close-outline": closeOutline,
      "trash-outline": trashOutline,
      "images-outline": imagesOutline,
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes["jobId"]) this.load();
  }

  async load() {
    this.photos = [];
    this.error = "";
    if (!this.jobId) return;
    const id = this.jobId;
    this.loading = true;
    try {
      const photos = await this.supabase.listJobPhotos(id);
      if (id === this.jobId) this.photos = photos;
    } catch (e: any) {
      this.error = e?.message || "No se han podido cargar las fotos.";
    } finally {
      this.loading = false;
    }
  }

  async onFiles(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = "";
    if (!files.length || !this.jobId) return;

    this.uploading = true;
    this.error = "";
    try {
      for (const file of files) {
        await this.supabase.uploadJobPhoto(this.jobId, file);
      }
      await this.load();
    } catch (e: any) {
      this.error = e?.message || "No se ha podido subir la foto.";
      await this.load();
    } finally {
      this.uploading = false;
    }
  }

  async remove(p: JobPhoto) {
    if (!window.confirm("¿Borrar esta foto?")) return;
    try {
      await this.supabase.deleteJobPhoto(p);
      this.photos = this.photos.filter((x) => x.id !== p.id);
    } catch (e: any) {
      this.error = e?.message || "No se ha podido borrar la foto.";
    }
  }
}
