import { Component } from "@angular/core";
import { IonRouterOutlet } from "@ionic/angular/standalone";

// Contenedor de las pantallas del rol. Cada pantalla trae su propia
// cabecera (app-page-header) y su barra inferior.
@Component({
  selector: "app-employee-layout",
  standalone: true,
  imports: [IonRouterOutlet],
  template: `<ion-router-outlet></ion-router-outlet>`,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        height: 100%;
      }
    `,
  ],
})
export class EmployeeLayoutComponent {}
