import { Injectable } from "@angular/core";
import { Capacitor } from "@capacitor/core";
import { NativeBiometric } from "@capgo/capacitor-native-biometric";

const SERVER = "com.tramo.app";
const ENABLED_KEY = "tramo.bio.enabled";
const USER_KEY = "tramo.bio.user";
const DECLINED_KEY = "tramo.bio.declined.";

function readLocal(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLocal(key: string, value: string | null) {
  try {
    if (value === null) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, value);
    }
  } catch {
    // almacenamiento no disponible
  }
}

// =====================================================
// ACCESO CON HUELLA DIGITAL
// Las credenciales se guardan cifradas en el Android
// Keystore y solo se leen tras verificar la huella.
// Nada sensible queda en localStorage (solo una marca
// de "activado" y el nombre de usuario a mostrar).
// =====================================================
@Injectable({ providedIn: "root" })
export class BiometricService {
  /** ¿El dispositivo tiene huella/biometría configurada? */
  async isAvailable(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      return false;
    }

    try {
      const result = await NativeBiometric.isAvailable({ useFallback: false });
      return result.isAvailable;
    } catch {
      return false;
    }
  }

  isEnabled(): boolean {
    return Capacitor.isNativePlatform() && readLocal(ENABLED_KEY) === "1";
  }

  enabledUser(): string | null {
    return this.isEnabled() ? readLocal(USER_KEY) : null;
  }

  wasDeclined(username: string): boolean {
    return readLocal(DECLINED_KEY + username.toLowerCase()) === "1";
  }

  markDeclined(username: string) {
    writeLocal(DECLINED_KEY + username.toLowerCase(), "1");
  }

  /** Activa la huella: pide verificarla y guarda las credenciales cifradas. */
  async enable(username: string, password: string): Promise<void> {
    await NativeBiometric.verifyIdentity({
      title: "Activar huella o rostro",
      subtitle: "Tramo",
      description: "Usa tu huella o tu rostro para confirmar",
      negativeButtonText: "Cancelar",
      maxAttempts: 5,
    });

    await NativeBiometric.setCredentials({ username, password, server: SERVER });

    writeLocal(ENABLED_KEY, "1");
    writeLocal(USER_KEY, username);
    writeLocal(DECLINED_KEY + username.toLowerCase(), null);
  }

  async disable(): Promise<void> {
    try {
      await NativeBiometric.deleteCredentials({ server: SERVER });
    } catch {
      // ya no existían
    }

    writeLocal(ENABLED_KEY, null);
    writeLocal(USER_KEY, null);
  }

  /** Verifica la huella y devuelve las credenciales guardadas. */
  async unlock(): Promise<{ username: string; password: string }> {
    await NativeBiometric.verifyIdentity({
      title: "Entrar en Tramo",
      subtitle: this.enabledUser() ?? undefined,
      description: "Usa tu huella o tu rostro para entrar",
      negativeButtonText: "Usar contraseña",
      maxAttempts: 5,
    });

    const creds = await NativeBiometric.getCredentials({ server: SERVER });

    if (!creds?.username || !creds?.password) {
      await this.disable();
      throw new Error("No hay credenciales guardadas. Entra con tu contraseña.");
    }

    return creds;
  }

  /** Tras cambiar la contraseña, actualiza la guardada (si la huella está activa). */
  async updatePassword(newPassword: string): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }

    const username = readLocal(USER_KEY);

    if (!username) {
      await this.disable();
      return;
    }

    await NativeBiometric.setCredentials({
      username,
      password: newPassword,
      server: SERVER,
    });
  }

  /** true si el error es que el usuario canceló (no mostrar error). */
  isCancel(err: any): boolean {
    const code = Number(err?.code ?? err?.errorCode);
    const msg = String(err?.message ?? "").toLowerCase();
    return [11, 13, 15, 16, 17].includes(code) || msg.includes("cancel");
  }
}
