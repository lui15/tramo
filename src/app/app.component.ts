import { Component, OnInit } from "@angular/core";
import { IonApp, IonRouterOutlet } from "@ionic/angular/standalone";

import { SupabaseService } from "./services/supabase.service";
import { NotificationsService } from "./services/notifications.service";
import { ThemeService } from "./services/theme.service";
import { MotionService } from "./services/motion.service";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [IonApp, IonRouterOutlet],
  template: `
    <ion-app>
      <ion-router-outlet></ion-router-outlet>
    </ion-app>
  `,
})
export class AppComponent implements OnInit {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly notifications: NotificationsService,
    private readonly theme: ThemeService,
    private readonly motion: MotionService,
  ) {
    // Aplica el modo claro/oscuro guardado antes de pintar nada
    this.theme.init();
  }

  ngOnInit() {
    // Animaciones de entrada y números que cuentan en todas las pantallas
    this.motion.start();

    // Activa notificaciones (campana + push) cuando hay sesión.
    this.supabase.supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        this.notifications.stop();
        return;
      }

      if (event === "INITIAL_SESSION" || event === "SIGNED_IN") {
        // Fuera del callback de auth para no bloquear supabase-js
        setTimeout(() => void this.notifications.start(), 0);
      }
    });
  }
}
