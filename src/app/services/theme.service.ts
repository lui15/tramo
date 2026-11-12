import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";

export type ThemeMode = "light" | "dark";

const KEY = "tramo.theme";

// =====================================================
// MODO CLARO / OSCURO
// La preferencia se guarda en el dispositivo y se
// aplica al abrir la app. Si nunca se ha elegido,
// se usa la del sistema.
// =====================================================
@Injectable({ providedIn: "root" })
export class ThemeService {
  readonly mode$ = new BehaviorSubject<ThemeMode>("light");

  init() {
    let saved: string | null = null;

    try {
      saved = localStorage.getItem(KEY);
    } catch {
      saved = null;
    }

    const systemDark =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-color-scheme: dark)").matches;

    this.apply(saved === "dark" || saved === "light" ? saved : systemDark ? "dark" : "light");
  }

  get mode(): ThemeMode {
    return this.mode$.value;
  }

  toggle() {
    this.set(this.mode === "dark" ? "light" : "dark");
  }

  set(mode: ThemeMode) {
    // Transición suave de colores al cambiar de claro a oscuro
    const root = document.documentElement;
    root.classList.add("t-theme-switching");
    window.setTimeout(() => root.classList.remove("t-theme-switching"), 700);

    try {
      localStorage.setItem(KEY, mode);
    } catch {
      // sin almacenamiento: se aplica solo en esta sesión
    }

    this.apply(mode);
  }

  private apply(mode: ThemeMode) {
    document.documentElement.classList.toggle("ion-palette-dark", mode === "dark");
    this.mode$.next(mode);

    if (Capacitor.isNativePlatform()) {
      StatusBar.setStyle({ style: mode === "dark" ? Style.Dark : Style.Light }).catch(() => undefined);
      StatusBar.setBackgroundColor({ color: mode === "dark" ? "#131b2e" : "#ffffff" }).catch(() => undefined);
    }
  }
}
