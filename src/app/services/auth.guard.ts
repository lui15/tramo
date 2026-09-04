import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { SupabaseService } from "./supabase.service";

// =====================================================
// DESTINO SEGÚN EL USUARIO
// =====================================================

async function resolveDestination(supabase: SupabaseService): Promise<string> {
  const user = await supabase.getCurrentUser();

  // No hay sesión
  if (!user) {
    return "/login";
  }

  const profile = await supabase.getMyProfile();

  // Hay sesión pero no existe perfil
  if (!profile) {
    return "/login";
  }

  // Administrador
  if (profile.role === "admin") {
    return "/admin";
  }

  // Empleado pendiente de aprobación
  if (!profile.is_approved) {
    return "/pending-approval";
  }

  // Empleado aprobado
  return "/employee";
}

// =====================================================
// LOGIN / REGISTER
// =====================================================
//
// IMPORTANTE:
//
// NO redirigimos automáticamente desde /login.
//
// Esto permite que:
//   /       -> /login
//
// incluso si Supabase conserva una sesión.
//
// De esta forma, al iniciar la aplicación siempre
// podemos entrar primero al Login.
//
// Las rutas protegidas siguen estando protegidas por
// adminGuard y employeeGuard.
//
// =====================================================

export const publicOnlyGuard: CanActivateFn = async () => {
  return true;
};

// =====================================================
// ADMIN GUARD
// =====================================================
//
// Protege:
//
// /admin
// /admin/finanzas
// /admin/trabajos
// /admin/empleados
// /admin/historial
//
// Si el usuario es administrador:
//      permite la ruta.
//
// Si no es administrador:
//      lo manda a su zona correspondiente.
//
// =====================================================

export const adminGuard: CanActivateFn = async () => {
  const supabase = inject(SupabaseService);
  const router = inject(Router);

  const profile = await supabase.getMyProfile();

  // Administrador → puede entrar
  if (profile?.role === "admin") {
    return true;
  }

  // Cualquier otro usuario → va a su zona
  const destination = await resolveDestination(supabase);

  return router.parseUrl(destination);
};

// =====================================================
// EMPLOYEE GUARD
// =====================================================
//
// Protege:
//
// /employee
// /employee/trabajos
// /employee/finanzas
//
// Solo permite empleados aprobados.
//
// Un administrador NO puede entrar aquí.
//
// =====================================================

export const employeeGuard: CanActivateFn = async () => {
  const supabase = inject(SupabaseService);
  const router = inject(Router);

  const profile = await supabase.getMyProfile();

  // Empleado aprobado → puede entrar
  if (profile && profile.role !== "admin" && profile.is_approved) {
    return true;
  }

  // Si es admin → /admin
  // Si está pendiente → /pending-approval
  // Si no tiene sesión → /login
  const destination = await resolveDestination(supabase);

  return router.parseUrl(destination);
};

// =====================================================
// PENDING APPROVAL GUARD
// =====================================================
//
// Protege:
//
// /pending-approval
//
// Solo permite empleados que todavía NO han sido
// aprobados.
//
// =====================================================

export const pendingGuard: CanActivateFn = async () => {
  const supabase = inject(SupabaseService);
  const router = inject(Router);

  const profile = await supabase.getMyProfile();

  // Empleado pendiente → puede entrar
  if (profile && profile.role !== "admin" && !profile.is_approved) {
    return true;
  }

  // Si es admin → /admin
  // Si está aprobado → /employee
  // Si no tiene sesión → /login
  const destination = await resolveDestination(supabase);

  return router.parseUrl(destination);
};
