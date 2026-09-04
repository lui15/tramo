import { Component } from "@angular/core";
import { IonRouterOutlet } from "@ionic/angular/standalone";
import { AdminHeaderComponent } from "./admin-header.component";

@Component({
  selector: "app-admin-layout",
  standalone: true,
  imports: [IonRouterOutlet, AdminHeaderComponent],
  template: `
    <app-admin-header></app-admin-header>

    <ion-router-outlet></ion-router-outlet>
  `,
})
export class AdminLayoutComponent {}
