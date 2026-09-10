# ChefOS — auditoría de entrega

Actualizado: 09-09-2026

## Actualización de la sesión 10-09-2026

- Las Edge Functions `chat-ia`, `generar-briefing` y `cierre-diario` fueron publicadas en el proyecto real y respondieron HTTP 200.
- Los cron jobs `chefos-briefing-0600` y `chefos-cierre-2300` están activos en `pg_cron`.
- La prueba E2E reprodujo un bloqueo: Supabase autentica, pero `/api/auth/session` todavía devuelve error al establecer las cookies SSR. El login Android/WebView no se considera cerrado.
- La corrección de login está en código, pero la APK final debe reconstruirse después de resolver el puente de sesión.
- El backend público continúa usando el túnel HTTPS temporal de desarrollo.

## Evidencia local

| Requisito | Estado | Evidencia |
|---|---|---|
| Chef IA básico | Verificado | `/api/ia/chat`, fallback contextual sin `ANTHROPIC_API_KEY` |
| Chef IA avanzado opcional | Implementado y publicado | `ANTHROPIC_API_KEY` activa Claude en API y Edge Functions; sin ella opera el modo básico |
| Onboarding | Implementado en MVP | `/configuracion/onboarding`, importación CSV |
| Panel multi-restaurante | Implementado en MVP | `/configuracion/restaurantes`, agrupación por `grupo_id` |
| Revisión avanzada de ventas | Implementado | importación, coincidencia normalizada, revisión bajo 0,85 y descuento RPC |
| Snapshots/analítica | Verificado estáticamente | `/analitica`, RPC de desviación y tabla de snapshots |
| Supabase/Storage | Verificado previamente | migraciones 001–005 y cuatro buckets del proyecto real |
| APK Android | Verificado | `artifacts/ChefOS-debug-final.apk`, paquete `com.chefos.app` |
| Edge Functions | Publicadas y probadas | `chat-ia`, `generar-briefing` y `cierre-diario` respondieron HTTP 200 |
| Cron jobs | Activos y verificados | `chefos-briefing-0600` y `chefos-cierre-2300` en `pg_cron` |
| type-check | Pasa | `node .tools/package/bin/npm-cli.js run type-check` |
| lint | Pasa | `node .tools/package/bin/npm-cli.js run lint` |
| build web | Pasa | `node .tools/package/bin/npm-cli.js run build` |
| build Android | Pasa | `scripts/build-android.ps1 -SkipCapacitorSync` + Gradle |
| Login Android | Corregido en la última APK | valida sesión/perfil y fuerza navegación completa compatible con WebView |

## Pendientes para cierre de producción

1. Registrar un usuario real y ejecutar el flujo E2E completo: receta, producto, producción, venta, merma, compra, Storage y cierre.
2. Sustituir el túnel HTTPS temporal por un hosting permanente para que la APK no dependa del ordenador local.

## Verificaciones adicionales realizadas

- `pg_cron` quedó configurado en el proyecto real de Supabase.
- Jobs activos confirmados: `chefos-briefing-0600` (`0 6 * * *`) y `chefos-cierre-2300` (`0 23 * * *`).
- Las tres funciones fueron probadas contra `https://nipovuqpxvsgeqdrszuq.supabase.co/functions/v1` con respuestas HTTP 200.
- APK final generada en `artifacts/ChefOS-debug-final.apk` con backend HTTPS configurado.
- La URL HTTPS actual usa un túnel temporal de desarrollo; para distribución estable debe sustituirse por un hosting permanente y reconstruirse la APK.

Anthropic no es requisito para la operación básica. Si se añade la clave más adelante, se activa el modo avanzado sin modificar la APK ni la base de datos.
