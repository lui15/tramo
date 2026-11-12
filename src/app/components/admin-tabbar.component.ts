import { Component } from "@angular/core";
import { TabbarComponent, TabItem } from "./tabbar.component";

// Barra inferior del ADMINISTRADOR
@Component({
  selector: "app-admin-tabbar",
  standalone: true,
  imports: [TabbarComponent],
  template: `<app-tabbar [items]="items"></app-tabbar>`,
})
export class AdminTabbarComponent {
  readonly items: TabItem[] = [
    { label: "Inicio", route: "/admin/inicio", icon: "home" },
    { label: "Trabajos", route: "/admin/trabajos", icon: "briefcase" },
    { label: "Equipo", route: "/admin/colaboradores", icon: "people" },
    { label: "Finanzas", route: "/admin/finanzas", icon: "wallet" },
    { label: "Historial", route: "/admin/historial", icon: "time" },
  ];
}
