import { Routes } from "@angular/router";

import {
  adminGuard,
  employeeGuard,
  pendingGuard,
  publicOnlyGuard,
} from "./services/auth.guard";

import { AdminLayoutComponent } from "./components/admin-layout.component";
import { EmployeeLayoutComponent } from "./components/employee-layout.component";

export const routes: Routes = [
  // =====================================================
  // INICIO
  // =====================================================
  //
  // Cuando se abre la aplicación en:
  //
  // /
  //
  // se entra primero en LOGIN.
  //
  {
    path: "",
    redirectTo: "login",
    pathMatch: "full",
  },

  // =====================================================
  // LOGIN
  // =====================================================
  {
    path: "login",
    loadComponent: () =>
      import("./pages/login/login.page").then((m) => m.LoginPage),
    canActivate: [publicOnlyGuard],
  },

  // =====================================================
  // REGISTER
  // =====================================================
  {
    path: "register",
    loadComponent: () =>
      import("./pages/register/register.page").then((m) => m.RegisterPage),
    canActivate: [publicOnlyGuard],
  },

  // =====================================================
  // PENDING APPROVAL
  // =====================================================
  {
    path: "pending-approval",
    loadComponent: () =>
      import("./pages/pending-approval/pending-approval.page").then(
        (m) => m.PendingApprovalPage,
      ),
    canActivate: [pendingGuard],
  },

  // =====================================================
  // ADMIN
  // =====================================================
  {
    path: "admin",

    // Solo puede entrar un administrador
    canActivate: [adminGuard],

    // Layout principal del administrador
    component: AdminLayoutComponent,

    children: [
      // =================================================
      // ADMIN / INICIO
      // =================================================
      //
      // Si alguien entra directamente en:
      //
      // /admin
      //
      // irá a Finanzas.
      //
      // Esto NO afecta a una actualización de:
      //
      // /admin/finanzas
      //
      // porque esa URL ya tiene una ruta específica.
      //
      {
        path: "",
        redirectTo: "finanzas",
        pathMatch: "full",
      },

      // =================================================
      // ADMIN / FINANZAS
      // =================================================
      {
        path: "finanzas",
        loadComponent: () =>
          import("./pages/admin/finanzas/finanzas.page").then(
            (m) => m.AdminFinanzasPage,
          ),
      },

      // =================================================
      // ADMIN / TRABAJOS
      // =================================================
      {
        path: "trabajos",
        loadComponent: () =>
          import("./pages/admin/trabajos/trabajos.page").then(
            (m) => m.AdminTrabajosPage,
          ),
      },

      // =================================================
      // ADMIN / EMPLEADOS
      // =================================================
      {
        path: "empleados",
        loadComponent: () =>
          import("./pages/admin/empleados/empleados.page").then(
            (m) => m.AdminEmpleadosPage,
          ),
      },

      // =================================================
      // ADMIN / HISTORIAL
      // =================================================
      {
        path: "historial",
        loadComponent: () =>
          import("./pages/admin/historial/historial.page").then(
            (m) => m.AdminHistorialPage,
          ),
      },
    ],
  },

  // =====================================================
  // EMPLOYEE
  // =====================================================
  {
    path: "employee",

    // Solo puede entrar un empleado
    canActivate: [employeeGuard],

    // Layout principal del empleado
    component: EmployeeLayoutComponent,

    children: [
      // =================================================
      // EMPLOYEE / INICIO
      // =================================================
      {
        path: "",
        redirectTo: "trabajos",
        pathMatch: "full",
      },

      // =================================================
      // EMPLOYEE / TRABAJOS
      // =================================================
      {
        path: "trabajos",
        loadComponent: () =>
          import("./pages/employee/trabajos/trabajos.page").then(
            (m) => m.EmployeeTrabajosPage,
          ),
      },

      // =================================================
      // EMPLOYEE / FINANZAS
      // =================================================
      {
        path: "finanzas",
        loadComponent: () =>
          import("./pages/employee/finanzas/finanzas.page").then(
            (m) => m.EmployeeFinanzasPage,
          ),
      },
    ],
  },
];
