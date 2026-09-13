# ChefOS

> Estado de control 13-09-2026: Supabase, Storage, Edge Functions, cron y la migración operativa 006 están activos. Vercel está publicado en [https://chefos-pied.vercel.app](https://chefos-pied.vercel.app), `/api/health` confirma configuración y Storage accesible, y la APK final ya apunta a ese dominio. Pendientes: prueba física final y E2E completo de negocio.

Sistema operativo gastronómico diseñado para restaurantes.

## Estado del proyecto

Aplicación móvil operativa: inventario, recetas, producción, compras, ventas, Chef IA básico, onboarding, snapshots y panel multi-restaurante. El esquema Supabase, Storage, Edge Functions, cron y backend público ya están desplegados; queda completar la prueba E2E desde un teléfono físico.

## Estado real de Supabase — 13-09-2026

Proyecto configurado: `nipovuqpxvsgeqdrszuq` — [abrir Supabase](https://supabase.com/dashboard/project/nipovuqpxvsgeqdrszuq). Las migraciones `001` a `006`, los cuatro buckets de Storage, las Edge Functions y los cron jobs están aplicados y verificados. La salud de producción confirma Supabase y Storage accesibles. Ya se creó un usuario/restaurante de prueba durante la validación. Nunca publiques `.env.local`, claves `sb_secret`, contraseñas de base de datos ni claves de Anthropic.

## Continuar desde GitHub

La guía completa está en [GITHUB_HANDOFF.md](GITHUB_HANDOFF.md): instalar dependencias, ejecutar `type-check`, `lint` y `build`, y reinstalar [artifacts/ChefOS-debug-final.apk](artifacts/ChefOS-debug-final.apk) para la prueba física. Anthropic es opcional: Chef IA básico funciona sin esa clave.

## Documentos maestros

- CHEFOS_MASTER_ARCHITECTURE.md
- CHEFOS_DATABASE_SPEC.md
- CHEFOS_ROADMAP.md
- INVENTARIO_MAESTRO_SPRINT3.md

## Objetivo

Centralizar inventario, recetas, producción, mermas, costos y alertas operativas en una única plataforma.

## Tecnologías

- Next.js 14
- TypeScript
- Supabase
- PostgreSQL
- React Query
- Tailwind CSS

## Uso en Android

ChefOS se entrega como PWA instalable, optimizada para teléfono Android.

1. Publica la aplicación con HTTPS y configura las variables de Supabase.
2. Abre la URL de ChefOS en Chrome para Android.
3. Usa `⋮ → Instalar aplicación` o `Añadir a pantalla de inicio`.
4. Abre ChefOS desde el icono instalado: se ejecutará en modo independiente y vertical.

El service worker se genera automáticamente durante `npm run build` cuando la dependencia PWA está instalada. El soporte offline de la interfaz utiliza IndexedDB; las operaciones que requieran Supabase necesitan que exista una sesión válida y sincronización disponible.

### APK instalable

Se genera una APK de depuración en `artifacts/ChefOS-debug.apk` (o `artifacts/ChefOS-debug-latest.apk` si el archivo anterior está abierto).

La APK final para teléfono físico apunta a `https://chefos-pied.vercel.app`:

```powershell
$env:CHEFOS_ANDROID_URL = 'https://chefos-pied.vercel.app'
powershell -ExecutionPolicy Bypass -File .\scripts\build-android.ps1 -BackendUrl $env:CHEFOS_ANDROID_URL -SkipCapacitorSync
```

La APK no puede contener por sí sola las rutas API de Next.js: necesita ese backend desplegado y las variables reales de Supabase.

## Configuración de Supabase

1. Crea un proyecto en Supabase.
2. Copia `.env.example` como `.env.local` y completa las claves.
3. Ejecuta en el SQL Editor, en orden, los archivos de `supabase/migrations/`.
4. Registra un usuario desde `/auth/registro`; la migración `005_registro_inicial.sql` crea automáticamente el restaurante, perfil, relación y datos iniciales.
6. Opcional: configura `ANTHROPIC_API_KEY` para respuestas avanzadas de Chef IA.
7. Despliega las Edge Functions de `supabase/functions/` y programa `generar-briefing` a las 06:00 y `cierre-diario` a las 23:00 con pg_cron/pg_net.

## Estado actual

El código, la comprobación de tipos, lint y build Next.js pasan localmente. Supabase, sus tablas principales, Storage, Edge Functions, cron, Vercel y el login SSR fueron validados. La APK final está generada y apunta a producción; falta confirmar el flujo completo desde Android y ejecutar la E2E completa de negocio.
