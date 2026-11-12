import { inject } from "@angular/core";
import { CanActivateFn, CanMatchFn, Router, UrlTree } from "@angular/router";
import { SupabaseService, Profile, Role, homeForRole } from "./supabase.service";

// =====================================================
// GUARDS POR ROL
// =====================================================
//
// Importante: esto solo decide QUÉ PANTALLAS se ven.
// La protección real de los datos está en Supabase (RLS).
//
// - admin       -> /admin
// - secretaria  -> /secretaria
// - encargado   -> /employee
// - ayudante    -> /employee
//
// Si la cuenta no está activa se cierra la sesión.
// Si tiene que cambiar la contraseña inicial -> /cuenta/clave
// =====================================================

async function loadProfile(supabase: SupabaseService): Promise<Profile | null> {
  try {
    return await supabase.getMyProfile();
  } catch {
    return null;
  }
}

function isUsable(profile: Profile | null): profile is Profile {
  return (
    !!profile &&
    profile.is_active !== false &&
    profile.account_status === "activo" &&
    !profile.deleted_at
  );
}

async function redirectOut(
  supabase: SupabaseService,
  router: Router,
  profile: Profile | null,
): Promise<UrlTree> {
  if (profile && !isUsable(profile)) {
    await supabase.signOut();
    return router.parseUrl("/login?motivo=cuenta");
  }

  if (!profile) {
    return router.parseUrl("/login");
  }

  if (profile.must_change_password) {
    return router.parseUrl("/cuenta/clave");
  }

  return router.parseUrl(homeForRole(profile.role));
}

/** Guard genérico: permite la ruta solo a los roles indicados. */
export function roleGuard(...roles: Role[]): CanActivateFn {
  return async () => {
    const supabase = inject(SupabaseService);
    const router = inject(Router);

    const profile = await loadProfile(supabase);

    if (
      isUsable(profile) &&
      roles.includes(profile.role) &&
      !profile.must_change_password
    ) {
      return true;
    }

    return redirectOut(supabase, router, profile);
  };
}

export const adminGuard: CanActivateFn = roleGuard("admin");

export const secretaryGuard: CanActivateFn = roleGuard("secretaria");

export const employeeGuard: CanActivateFn = roleGuard("encargado", "ayudante");

/** Cualquier usuario con sesión y cuenta activa (p. ej. cambiar contraseña). */
export const signedInGuard: CanActivateFn = async () => {
  const supabase = inject(SupabaseService);
  const router = inject(Router);

  const profile = await loadProfile(supabase);

  if (isUsable(profile)) {
    return true;
  }

  return redirectOut(supabase, router, profile);
};

// =====================================================
// LOGIN
// =====================================================
//
// No redirigimos automáticamente desde /login: al abrir
// la app siempre se puede ver el login. Las rutas
// protegidas siguen protegidas por sus guards.
//
export const publicOnlyGuard: CanActivateFn = () => true;

// Compatibilidad: la antigua pantalla "pendiente de aprobación" ya no se usa
// (las cuentas las crea el administrador). Redirige a donde corresponda.
export const pendingGuard: CanActivateFn = async () => {
  const supabase = inject(SupabaseService);
  const router = inject(Router);
  return redirectOut(supabase, router, await loadProfile(supabase));
};

// =====================================================
// PANEL DEL ENCARGADO
// =====================================================
// Las rutas /employee/inicio, /trabajos y /finanzas tienen una versión
// propia para el encargado. Este canMatch elige esa versión solo cuando el
// usuario conectado es encargado; el ayudante sigue con las de siempre.
export const encargadoMatch: CanMatchFn = async () => {
  const supabase = inject(SupabaseService);
  const profile = await loadProfile(supabase);
  return isUsable(profile) && profile.role === "encargado";
};

/**
 * "Mi dinero" nuevo (sueldo del mes, adelantos y pendiente): encargados y
 * ayudantes con sueldo fijo. El ayudante por horas/días sigue con el suyo.
 */
export const myMoneyMatch: CanMatchFn = async () => {
  const supabase = inject(SupabaseService);
  const profile = await loadProfile(supabase);
  if (!isUsable(profile)) return false;
  if (profile.role === "encargado") return true;
  return (
    profile.role === "ayudante" &&
    (profile.payment_method === "fijo" || profile.salary_type === "mes")
  );
};
