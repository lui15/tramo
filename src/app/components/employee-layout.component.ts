import { Component } from "@angular/core";
import { IonRouterOutlet } from "@ionic/angular/standalone";
import { EmployeeHeaderComponent } from "./employee-header.component";

@Component({
  selector: "app-employee-layout",
  standalone: true,

  imports: [IonRouterOutlet, EmployeeHeaderComponent],

  template: `
    <app-employee-header></app-employee-header>

    <ion-router-outlet></ion-router-outlet>
  `,

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
