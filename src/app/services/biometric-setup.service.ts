import { Injectable } from "@angular/core";
import { AlertController, ToastController } from "@ionic/angular/standalone";

import { BiometricService } from "./biometric.service";
import { SupabaseService } from "./supabase.service";

// =====================================================
// ACTIVAR / DESACTIVAR HUELLA O ROSTRO YA DENTRO DE LA APP
// Pide la contraseña una vez (se comprueba contra el
// servidor) y la guarda cifrada en el Keystore del móvil
// tras verificar la biometría.
// =====================================================
@Injectable({ providedIn: "root" })
export class BiometricSetupService {
  constructor(
    private readonly biometric: BiometricService,
    private readonly supabase: SupabaseService,
    private readonly alertCtrl: AlertController,
    private readonly toastCtrl: ToastController,
  ) {}

  isAvailable() {
    return this.biometric.isAvailable();
  }

  isEnabled() {
    return this.biometric.isEnabled();
  }

  /** Devuelve true si quedó activada. */
  async promptEnable(): Promise<boolean> {
    if (!(await this.biometric.isAvailable())) {
      await this.toast(
        "Este móvil no tiene huella ni reconocimiento facial configurados. Actívalos en los ajustes del teléfono.",
        "warning",
      );
      return false;
    }

    const profile = await this.supabase.getMyProfile().catch(() => null);
    const username = profile?.username || profile?.email || "";
    if (!username) {
      await this.toast("No se ha podido identificar tu usuario.", "danger");
      return false;
    }

    const password = await this.askPassword(username);
    if (!password) return false;

    try {
      // Comprueba que la contraseña es correcta (renueva la sesión del mismo usuario)
      await this.supabase.signInWithUsername(username, password);
    } catch {
      await this.toast("Contraseña incorrecta. No se ha activado.", "danger");
      return false;
    }

    try {
      await this.biometric.enable(username, password);
      await this.toast("Listo. La próxima vez podrás entrar con tu huella o tu rostro.", "success");
      return true;
    } catch (err: any) {
      if (!this.biometric.isCancel(err)) {
        await this.toast(err?.message || "No se pudo activar.", "danger");
      }
      return false;
    }
  }

  async disable() {
    await this.biometric.disable();
    await this.toast("Acceso con huella o rostro desactivado en este móvil.", "medium");
  }

  private async askPassword(username: string): Promise<string | null> {
    const alert = await this.alertCtrl.create({
      header: "Entrar con huella o rostro",
      message: `Escribe tu contraseña de ${username} para activarlo en este móvil.`,
      inputs: [{ name: "password", type: "password", placeholder: "Contraseña" }],
      buttons: [
        { text: "Cancelar", role: "cancel" },
        { text: "Activar", role: "confirm" },
      ],
    });
    await alert.present();
    const { role, data } = await alert.onDidDismiss();
    const pwd = data?.values?.password;
    return role === "confirm" && pwd ? String(pwd) : null;
  }

  private async toast(message: string, color: string) {
    const t = await this.toastCtrl.create({ message, color, duration: 3000, position: "top" });
    await t.present();
  }
}
