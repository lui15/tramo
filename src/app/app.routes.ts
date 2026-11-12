import { Routes } from "@angular/router";

import {
  adminGuard,
  employeeGuard,
  encargadoMatch,
  myMoneyMatch,
  pendingGuard,
  publicOnlyGuard,
  secretaryGuard,
  signedInGuard,
} from "./services/auth.guard";

import { AdminLayoutComponent } from "./components/admin-layout.component";
import { EmployeeLayoutComponent } from "./components/employee-layout.component";
import { SecretaryLayoutComponent } from "./components/secretary-layout.component";

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
  // REGISTER (deshabilitado)
  // =====================================================
  //
  // Las cuentas las crea el administrador desde
  // Colaboradores. El registro público está bloqueado
  // también en la base de datos.
  //
  {
    path: "register",
    redirectTo: "login",
    pathMatch: "full",
  },

  // =====================================================
  // CUENTA / CAMBIAR CONTRASEÑA (cualquier rol)
  // =====================================================
  {
    path: "cuenta/clave",
    loadComponent: () =>
      import("./pages/account/change-password.page").then(
        (m) => m.ChangePasswordPage,
      ),
    canActivate: [signedInGuard],
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
      {
        path: "",
        redirectTo: "inicio",
        pathMatch: "full",
      },
      {
        path: "inicio",
        loadComponent: () =>
          import("./pages/admin/inicio/inicio.page").then(
            (m) => m.AdminInicioPage,
          ),
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
      // ADMIN / COLABORADORES
      // =================================================
      {
        path: "colaboradores",
        loadComponent: () =>
          import("./pages/admin/empleados/empleados.page").then(
            (m) => m.AdminEmpleadosPage,
          ),
      },

      // Compatibilidad con la ruta antigua
      {
        path: "empleados",
        redirectTo: "colaboradores",
        pathMatch: "full",
      },

      // =================================================
      // ADMIN / VEHÍCULOS
      // =================================================
      {
        path: "vehiculos",
        loadComponent: () =>
          import("./pages/admin/vehiculos/vehiculos.page").then((m) => m.VehiculosPage),
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
  // AJUSTES (cualquier rol)
  // =====================================================
  {
    path: "ajustes",
    loadComponent: () =>
      import("./pages/account/settings.page").then((m) => m.SettingsPage),
    canActivate: [signedInGuard],
  },

  // =====================================================
  // NOTIFICACIONES (cualquier rol)
  // =====================================================
  {
    path: "notificaciones",
    loadComponent: () =>
      import("./pages/notifications/notifications.page").then(
        (m) => m.NotificationsPage,
      ),
    canActivate: [signedInGuard],
  },

  // =====================================================
  // SECRETARÍA
  // =====================================================
  {
    path: "secretaria",
    canActivate: [secretaryGuard],
    component: SecretaryLayoutComponent,
    children: [
      {
        path: "",
        redirectTo: "inicio",
        pathMatch: "full",
      },
      {
        path: "inicio",
        loadComponent: () =>
          import("./pages/secretary/inicio/inicio.page").then(
            (m) => m.SecretaryInicioPage,
          ),
      },
      // La secretaría usa las mismas pantallas que administración
      // Los permisos los aplica el servidor.
      {
        path: "trabajos",
        loadComponent: () =>
          import("./pages/admin/trabajos/trabajos.page").then(
            (m) => m.AdminTrabajosPage,
          ),
      },
      {
        path: "equipo",
        loadComponent: () =>
          import("./pages/admin/empleados/empleados.page").then(
            (m) => m.AdminEmpleadosPage,
          ),
      },
      // Finanzas: ve ingresos, gastos y ganancia; puede añadir gastos.
      {
        path: "finanzas",
        loadComponent: () =>
          import("./pages/admin/finanzas/finanzas.page").then(
            (m) => m.AdminFinanzasPage,
          ),
      },
      {
        path: "vehiculos",
        loadComponent: () =>
          import("./pages/admin/vehiculos/vehiculos.page").then((m) => m.VehiculosPage),
      },
      // Mi dinero de la secretaría (siempre sueldo fijo)
      {
        path: "mi-dinero",
        loadComponent: () =>
          import("./pages/encargado/encargado-dinero.page").then((m) => m.EncargadoDineroPage),
      },
      // Directorio sencillo del equipo (vista anterior)
      {
        path: "directorio",
        loadComponent: () =>
          import("./pages/secretary/panel/panel.page").then(
            (m) => m.SecretaryPanelPage,
          ),
      },
      // Compatibilidad con la ruta anterior
      {
        path: "panel",
        redirectTo: "equipo",
        pathMatch: "full",
      },
    ],
  },

  // =====================================================
  // EMPLOYEE (encargado y ayudante)
  // =====================================================
  {
    path: "employee",

    // Solo encargados y ayudantes
    canActivate: [employeeGuard],

    // Layout principal del empleado
    component: EmployeeLayoutComponent,

    children: [
      // =================================================
      // EMPLOYEE / INICIO
      // =================================================
      {
        path: "",
        redirectTo: "inicio",
        pathMatch: "full",
      },
      // Panel propio del ENCARGADO (canMatch). El ayudante sigue con las
      // pantallas de siempre, que vienen justo después.
      {
        path: "inicio",
        canMatch: [encargadoMatch],
        loadComponent: () =>
          import("./pages/encargado/encargado-inicio.page").then((m) => m.EncargadoInicioPage),
      },
      {
        path: "trabajos",
        canMatch: [encargadoMatch],
        loadComponent: () =>
          import("./pages/encargado/encargado-trabajos.page").then((m) => m.EncargadoTrabajosPage),
      },
      {
        path: "finanzas",
        canMatch: [myMoneyMatch],
        loadComponent: () =>
          import("./pages/encargado/encargado-dinero.page").then((m) => m.EncargadoDineroPage),
      },
      {
        path: "inicio",
        loadComponent: () =>
          import("./pages/employee/inicio/inicio.page").then(
            (m) => m.EmployeeInicioPage,
          ),
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

  // =====================================================
  // CUALQUIER OTRA RUTA
  // =====================================================
  {
    path: "**",
    redirectTo: "login",
  },
];
