import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router } from "@angular/router";

import { AdminTabbarComponent } from "./admin-tabbar.component";
import { SecretaryTabbarComponent } from "./secretary-tabbar.component";

// Barra inferior para pantallas compartidas por administración y secretaría
// (Trabajos y Colaboradores): muestra la barra del rol según la ruta.
@Component({
  selector: "app-role-tabbar",
  standalone: true,
  imports: [CommonModule, AdminTabbarComponent, SecretaryTabbarComponent],
  template: `
    <app-secretary-tabbar *ngIf="isSecretary; else adminBar"></app-secretary-tabbar>
    <ng-template #adminBar><app-admin-tabbar></app-admin-tabbar></ng-template>
  `,
})
export class RoleTabbarComponent implements OnInit {
  isSecretary = false;

  constructor(private readonly router: Router) {}

  ngOnInit() {
    this.isSecretary = this.router.url.startsWith("/secretaria");
  }
}
