import { Component } from '@angular/core';
import { IonContent, IonButton, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { timeOutline } from 'ionicons/icons';
import { SupabaseService } from '../../services/supabase.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-pending-approval',
  standalone: true,
  imports: [IonContent, IonButton, IonIcon],
  template: `
    <ion-content class="ion-padding">
      <div style="max-width: 400px; margin: 100px auto; text-align: center;">
        <ion-icon name="time-outline" style="font-size: 64px;"></ion-icon>
        <h2>Tu cuenta está pendiente</h2>
        <p>Un administrador debe aprobar tu cuenta antes de que puedas ver los trabajos y tu información. Vuelve a intentarlo más tarde.</p>
        <ion-button expand="block" (click)="logout()">Cerrar sesión</ion-button>
      </div>
    </ion-content>
  `
})
export class PendingApprovalPage {
  constructor(private supabase: SupabaseService, private router: Router) {
    addIcons({ timeOutline });
  }

  async logout() {
    await this.supabase.signOut();
    this.router.navigateByUrl('/login');
  }
}
