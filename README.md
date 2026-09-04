# Tramo — App de gestión de trabajos y empleados

Proyecto Ionic + Angular (standalone components) + Supabase.

## 1. Instalar dependencias

```bash
npm install
```

## 2. Levantar en el navegador

```bash
ionic serve
```

(o `npm start`, que hace lo mismo con `ng serve`)

## 3. Ya está conectado a tu Supabase

Las credenciales en `src/environments/environment.ts` ya apuntan a tu proyecto
"tramo" en Supabase (URL + anon key). La base de datos (tablas, RLS, triggers,
vistas) ya está creada ahí. Tu usuario admin ya existe:

- Correo: luispichardo@gmail.com
- (usa la contraseña que definiste)

## 4. Estructura del proyecto

```
src/app/
  services/
    supabase.service.ts   -> toda la lógica de datos (auth, trabajos, empleados, finanzas)
    auth.guard.ts          -> redirige según el rol (admin / empleado / pendiente)
  components/
    admin-tabbar.component.ts
    employee-tabbar.component.ts
  pages/
    login/
    register/
    pending-approval/
    admin/
      finanzas/    -> generado, pendiente, pagado, ganancia + trabajos finalizados
      trabajos/    -> crear, editar estado, finalizar (con participantes)
      empleados/   -> aprobar, editar, saldar acumulado
      historial/   -> trabajos finalizados con detalle expandible
    employee/
      inicio/      -> nombre + acumulado
      trabajos/    -> trabajos confirmados (sin costo)
      finanzas/    -> acumulado + historial de trabajos y saldos
```

## 5. Pendiente por hacer (siguientes pasos)

- Pulir el diseño visual (colores, espaciados) — la base funcional ya está.
- Validaciones de formulario más estrictas (fechas, teléfonos).
- Empaquetar con Capacitor para Android/iOS:
  ```bash
  ionic build
  npx cap add android
  npx cap add ios
  npx cap sync
  ```
- Si más adelante quieres que el empleado "solicite" su retiro en vez de que
  tú lo registres directamente, se puede agregar una tabla de "solicitudes".

## 6. Notas de seguridad

- La `anon key` en `environment.ts` es pública y segura de exponer en el
  cliente — el acceso real está controlado por las políticas RLS en Supabase.
- Nunca pongas la `service role key` en esta app — solo se usa desde el
  backend/Edge Functions (por ejemplo si luego automatizas la creación de
  empleados con contraseña asignada por ti en vez de autoregistro).
