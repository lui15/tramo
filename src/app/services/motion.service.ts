import { Injectable, NgZone } from "@angular/core";

// =====================================================
// ANIMACIONES DE ENTRADA DE CADA PANTALLA
// Ionic pasa cada pantalla con su propia transición. Si las
// animaciones de los cuadros empiezan a la vez, terminan
// "tapadas" por esa transición y no se ven. Por eso:
//   1. ionViewWillEnter -> clase .t-pre: los cuadros esperan ocultos.
//   2. ionViewDidEnter  -> clase .t-anim: los cuadros aparecen suaves,
//      uno detrás de otro (ver src/theme/animations.scss).
// Si por lo que sea no llega el DidEnter, se revelan a los 700 ms.
// =====================================================
@Injectable({ providedIn: "root" })
export class MotionService {
  private started = false;
  private readonly timers = new WeakMap<HTMLElement, number>();

  constructor(private readonly zone: NgZone) {}

  start() {
    if (this.started || typeof document === "undefined") return;
    this.started = true;

    this.zone.runOutsideAngular(() => {
      // Los eventos de ciclo de vida de Ionic no burbujean: se escuchan en captura
      document.addEventListener("ionViewWillEnter", (ev) => this.prepare(ev.target), true);
      document.addEventListener("ionViewDidEnter", (ev) => this.reveal(ev.target), true);
    });
  }

  private prepare(target: EventTarget | null) {
    if (!(target instanceof HTMLElement)) return;
    target.classList.remove("t-anim");
    target.classList.add("t-pre");
    const prev = this.timers.get(target);
    if (prev) clearTimeout(prev);
    this.timers.set(target, window.setTimeout(() => this.reveal(target), 700));
  }

  private reveal(target: EventTarget | null) {
    if (!(target instanceof HTMLElement)) return;
    const prev = this.timers.get(target);
    if (prev) clearTimeout(prev);
    this.timers.delete(target);
    if (target.classList.contains("t-anim") && !target.classList.contains("t-pre")) return;
    target.classList.remove("t-anim");
    void target.offsetWidth; // reinicia las animaciones
    target.classList.remove("t-pre");
    target.classList.add("t-anim");
  }
}
