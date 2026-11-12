import { Component } from "@angular/core";
import { TabbarComponent, TabItem } from "./tabbar.component";

// Barra inferior de SECRETARÍA
@Component({
  selector: "app-secretary-tabbar",
  standalone: true,
  imports: [TabbarComponent],
  template: `<app-tabbar [items]="items"></app-tabbar>`,
})
export class SecretaryTabbarComponent {
  readonly items: TabItem[] = [
    { label: "Inicio", route: "/secretaria/inicio", icon: "home" },
    { label: "Trabajos", route: "/secretaria/trabajos", icon: "briefcase" },
    { label: "Equipo", route: "/secretaria/equipo", icon: "people" },
    { label: "Finanzas", route: "/secretaria/finanzas", icon: "wallet" },
    { label: "Mi dinero", route: "/secretaria/mi-dinero", icon: "cash" },
  ];
}
