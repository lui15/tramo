import { Injectable, NgZone } from "@angular/core";
import { Router } from "@angular/router";
import { BehaviorSubject } from "rxjs";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { RealtimeChannel } from "@supabase/supabase-js";
import { ToastController } from "@ionic/angular/standalone";

import { SupabaseService } from "./supabase.service";

export interface AppNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, any>;
  read_at: string | null;
  created_at: string;
}

// =====================================================
// NOTIFICACIONES
// - Registro del dispositivo para push (Android, FCM)
// - Contador de no leídas en tiempo real (campana)
// - Navegación al tocar una notificación
// =====================================================
@Injectable({ providedIn: "root" })
export class NotificationsService {
  readonly unread$ = new BehaviorSubject<number>(0);

  private channel: RealtimeChannel | null = null;
  private userId: string | null = null;
  private listenersReady = false;

  constructor(
    private readonly supabase: SupabaseService,
    private readonly router: Router,
    private readonly zone: NgZone,
    private readonly toastCtrl: ToastController,
  ) {}

  /** Arranca todo para el usuario con sesión. Idempotente. */
  async start() {
    const { data } = await this.supabase.supabase.auth.getSession();
    const user = data.session?.user;

    if (!user) {
      this.stop();
      return;
    }

    if (this.userId === user.id && this.channel) {
      await this.refreshCount();
      return;
    }

    this.stop();
    this.userId = user.id;

    await this.refreshCount();
    this.subscribeRealtime(user.id);
    await this.registerPush();
  }

  /**
   * Detiene la escucha en la app. El dispositivo SIGUE registrado para
   * recibir push aunque se cierre la sesión (si otro usuario entra en este
   * móvil, el dispositivo pasa a ser suyo).
   */
  stop() {
    if (this.channel) {
      this.supabase.supabase.removeChannel(this.channel);
      this.channel = null;
    }

    this.userId = null;
    this.unread$.next(0);
  }

  // ---------------------------------------------------
  // CENTRO DE NOTIFICACIONES
  // ---------------------------------------------------

  async list(limit = 100): Promise<AppNotification[]> {
    const { data, error } = await this.supabase.supabase
      .from("notifications")
      .select("id, user_id, type, title, body, data, read_at, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    return (data ?? []) as AppNotification[];
  }

  async refreshCount() {
    const { count, error } = await this.supabase.supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .is("read_at", null);

    if (!error) {
      this.unread$.next(count ?? 0);
    }
  }

  async markRead(ids?: string[]) {
    const { error } = await this.supabase.supabase.rpc(
      "mark_notifications_read",
      { p_ids: ids && ids.length ? ids : null },
    );

    if (error) {
      throw error;
    }

    await this.refreshCount();
  }

  /** Ruta a la que lleva una notificación. */
  routeFor(n: Pick<AppNotification, "data">): string | null {
    const route = n.data?.["route"];
    return typeof route === "string" && route.startsWith("/") ? route : null;
  }

  private subscribeRealtime(userId: string) {
    this.channel = this.supabase.supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => this.zone.run(() => void this.refreshCount()),
      )
      .subscribe();
  }

  // ---------------------------------------------------
  // PUSH (solo app nativa)
  // ---------------------------------------------------

  private async registerPush() {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    try {
      this.setupListeners();

      let perm = await PushNotifications.checkPermissions();

      if (perm.receive === "prompt" || perm.receive === "prompt-with-rationale") {
        perm = await PushNotifications.requestPermissions();
      }

      if (perm.receive !== "granted") {
        return;
      }

      if (Capacitor.getPlatform() === "android") {
        await PushNotifications.createChannel({
          id: "tramo_general",
          name: "Avisos de Tramo",
          description: "Trabajos, pagos y avisos de la empresa",
          importance: 5,
          visibility: 1,
          sound: "default",
          vibration: true,
        });
      }

      await PushNotifications.register();
    } catch {
      // Sin push: la app sigue funcionando con el centro de notificaciones.
    }
  }

  private setupListeners() {
    if (this.listenersReady) {
      return;
    }

    this.listenersReady = true;

    PushNotifications.addListener("registration", async ({ value }) => {
      await this.supabase.supabase.rpc("registrar_token", {
        p_token: value,
        p_plataforma: Capacitor.getPlatform() === "ios" ? "ios" : "android",
      });
    });

    // Notificación recibida con la app abierta: aviso dentro de la app
    PushNotifications.addListener("pushNotificationReceived", (n) => {
      this.zone.run(async () => {
        await this.refreshCount();

        const toast = await this.toastCtrl.create({
          header: n.title,
          message: n.body,
          duration: 4000,
          position: "top",
          buttons: [
            {
              text: "Ver",
              handler: () => {
                const route = n.data?.["route"];
                void this.router.navigateByUrl(
                  typeof route === "string" ? route : "/notificaciones",
                );
              },
            },
          ],
        });
        await toast.present();
      });
    });

    // El usuario toca la notificación en la bandeja del móvil
    PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      this.zone.run(async () => {
        const data = action.notification?.data ?? {};
        const id = data["notification_id"];

        if (id) {
          await this.markRead([id]).catch(() => undefined);
        }

        const route = data["route"];
        await this.router.navigateByUrl(
          typeof route === "string" && route.startsWith("/") ? route : "/notificaciones",
        );
      });
    });
  }
}
