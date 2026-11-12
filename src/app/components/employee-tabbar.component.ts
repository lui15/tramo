import { Component, OnInit } from "@angular/core";
import { TabbarComponent, TabItem } from "./tabbar.component";
import { SupabaseService } from "../services/supabase.service";

// Barra inferior del ENCARGADO y del AYUDANTE.
// El encargado no acumula saldo: su tercera pestaña es "Mi historial".
@Component({
  selector: "app-employee-tabbar",
  standalone: true,
  imports: [TabbarComponent],
  template: `<app-tabbar [items]="items"></app-tabbar>`,
})
export class EmployeeTabbarComponent implements OnInit {
  items: TabItem[] = this.build(false);

  constructor(private readonly supabase: SupabaseService) {}

  async ngOnInit() {
    try {
      const profile = await this.supabase.getMyProfile();
      // El encargado tiene su propio "Mi dinero" (sueldo, adelantos y pendiente).
      // Todos (encargado, ayudante fijo y por horas) tienen "Mi dinero".
      void profile;
    } catch {
      // Se queda la barra por defecto
    }
  }

  private build(noBalance: boolean): TabItem[] {
    return [
      { label: "Inicio", route: "/employee/inicio", icon: "home" },
      { label: "Trabajos", route: "/employee/trabajos", icon: "briefcase" },
      noBalance
        ? { label: "Mi historial", route: "/employee/finanzas", icon: "time" }
        : { label: "Mi dinero", route: "/employee/finanzas", icon: "wallet" },
    ];
  }
}
