# ChefOS — auditoría de entrega

Actualizado: 10-09-2026

## Actualización de la sesión 10-09-2026

- Las Edge Functions `chat-ia`, `generar-briefing` y `cierre-diario` fueron publicadas en el proyecto real y respondieron HTTP 200.
- Los cron jobs `chefos-briefing-0600` y `chefos-cierre-2300` están activos en `pg_cron`.
- Se corrigió el puente `/api/auth/session`: ahora valida los tokens recibidos, escribe las cookies SSR fragmentadas y permite que el middleware continúe la navegación.
- La validación E2E con un usuario temporal real de Supabase confirmó cookie SSR válida, Storage accesible y `/dashboard` HTTP 200; el usuario temporal fue eliminado después de la prueba.
- Se corrigió el middleware para que las rutas `/api/*` no se conviertan en redirecciones HTML cuando existe sesión autenticada.
- Las herramientas de diagnóstico temporales fueron retiradas del código.
- La APK existente en `artifacts/ChefOS-debug-final.apk` es anterior a esta última corrección y debe regenerarse cuando exista una URL HTTPS estable.
- Se corrigió la conversión local de kg/unidades y la importación CSV ahora guarda stock y mínimos en gramos.
- Compras tiene alta, detalle y recepción; recetas tiene edición de datos generales.
- La migración `006_consistencia_operativa.sql` fue ejecutada en el proyecto real y se comprobaron las RPC `registrar_merma_completa` y `recibir_compra_completa`.
- El backend público no está disponible actualmente: el túnel HTTPS temporal está detenido y no se sustituirá sin una autorización explícita o un hosting permanente.

## Evidencia local

| Requisito | Estado | Evidencia |
|---|---|---|
| Chef IA básico | Verificado | `/api/ia/chat`, fallback contextual sin `ANTHROPIC_API_KEY` |
| Chef IA avanzado opcional | Implementado y publicado | `ANTHROPIC_API_KEY` activa Claude en API y Edge Functions; sin ella opera el modo básico |
| Onboarding | Implementado en MVP | `/configuracion/onboarding`, importación CSV |
| Panel multi-restaurante | Implementado en MVP | `/configuracion/restaurantes`, agrupación por `grupo_id` |
| Revisión avanzada de ventas | Implementado | importación, coincidencia normalizada, revisión bajo 0,85 y descuento RPC |
| Snapshots/analítica | Verificado estáticamente | `/analitica`, RPC de desviación y tabla de snapshots |
| Supabase/Storage | Verificado | migraciones 001–006 y cuatro buckets del proyecto real |
| APK Android | Compilable, pendiente de URL estable | `com.chefos.app`; la APK anterior requiere backend HTTPS activo |
| Edge Functions | Publicadas y probadas | `chat-ia`, `generar-briefing` y `cierre-diario` respondieron HTTP 200 |
| Cron jobs | Activos y verificados | `chefos-briefing-0600` y `chefos-cierre-2300` en `pg_cron` |
| type-check | Pasa | `node .tools/package/bin/npm-cli.js run type-check` |
| lint | Pasa | `node .tools/package/bin/npm-cli.js run lint` |
| build web | Pasa | `node .tools/package/bin/npm-cli.js run build` |
| build Android | Pasa | `scripts/build-android.ps1 -SkipCapacitorSync` + Gradle |
| Login Android | Corregido y validado en servidor | puente SSR, cookie y `/dashboard` HTTP 200; falta repetir en APK regenerada |
| Compras alta/detalle | Implementado y compilado | `/compras/nueva`, `/compras/[id]`, recepción atómica |
| Edición de recetas | Implementado y compilado | `/biblioteca/[id]/editar` y `PATCH /api/biblioteca/recetas/[id]` |
| Conversión/importación | Corregido | kg y unidades con peso se convierten a gramos; CSV conserva stock/minimos |
| Operaciones atómicas | Publicado y comprobado | migración `006_consistencia_operativa.sql` en Supabase real |

## Pendientes para cierre de producción

1. Configurar hosting HTTPS permanente (recomendado) o autorizar explícitamente un túnel temporal.
2. Regenerar la APK apuntando a esa URL y confirmar en el teléfono físico login, creación de restaurante y navegación posterior.
3. Registrar un usuario real y ejecutar el flujo E2E completo: receta, producto, producción, venta, merma, compra, Storage y cierre.

## Verificaciones adicionales realizadas

- `pg_cron` quedó configurado en el proyecto real de Supabase.
- Jobs activos confirmados: `chefos-briefing-0600` (`0 6 * * *`) y `chefos-cierre-2300` (`0 23 * * *`).
- Las tres funciones fueron probadas contra `https://nipovuqpxvsgeqdrszuq.supabase.co/functions/v1` con respuestas HTTP 200.
- La última APK guardada en `artifacts/ChefOS-debug-final.apk` conserva una URL HTTPS temporal de desarrollo; no se considera entrega final mientras esa URL no esté activa.
- La compilación web actual pasa type-check, lint y build; la APK final debe generarse después de fijar el backend HTTPS.

Anthropic no es requisito para la operación básica. Si se añade la clave más adelante, se activa el modo avanzado sin modificar la APK ni la base de datos.
