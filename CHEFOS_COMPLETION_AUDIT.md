# ChefOS — auditoría de entrega

Actualizado: 13-09-2026

## Actualización de la sesión 13-09-2026

- Las Edge Functions `chat-ia`, `generar-briefing` y `cierre-diario` fueron publicadas en el proyecto real y respondieron HTTP 200.
- Los cron jobs `chefos-briefing-0600` y `chefos-cierre-2300` están activos en `pg_cron`.
- Se corrigió el puente `/api/auth/session`: ahora valida los tokens recibidos, escribe las cookies SSR fragmentadas y permite que el middleware continúe la navegación.
- La validación E2E con un usuario temporal real de Supabase confirmó cookie SSR válida, Storage accesible y `/dashboard` HTTP 200; el usuario temporal fue eliminado después de la prueba.
- Se corrigió el middleware para que las rutas `/api/*` no se conviertan en redirecciones HTML cuando existe sesión autenticada.
- Las herramientas de diagnóstico temporales fueron retiradas del código.
- Se generó `artifacts/ChefOS-debug-final.apk` apuntando al backend de producción `https://chefos-pied.vercel.app`.
- Se corrigió la conversión local de kg/unidades y la importación CSV ahora guarda stock y mínimos en gramos.
- Compras tiene alta, detalle y recepción; recetas tiene edición de datos generales.
- La migración `006_consistencia_operativa.sql` fue ejecutada en el proyecto real y se comprobaron las RPC `registrar_merma_completa` y `recibir_compra_completa`.
- Vercel está operativo en producción en `https://chefos-pied.vercel.app`. `/api/health` responde `ok:true`, con Supabase configurado y Storage accesible.
- La respuesta pública de salud confirmó los buckets `facturas`, `importaciones`, `recetas-imagenes` y `recetas-videos`. `autenticado:false` es el resultado esperado al consultar salud sin una sesión de usuario.

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
| APK Android | Generada y lista para prueba física | `com.chefos.app`; producción `https://chefos-pied.vercel.app`; SHA-256 `FC24CD631AAF6CAAE31E85D57AAEDC8AA9D824F31DF492EE13B860896F1CBA02` |
| Edge Functions | Publicadas y probadas | `chat-ia`, `generar-briefing` y `cierre-diario` respondieron HTTP 200 |
| Cron jobs | Activos y verificados | `chefos-briefing-0600` y `chefos-cierre-2300` en `pg_cron` |
| type-check | Pasa | `node .tools/package/bin/npm-cli.js run type-check` |
| lint | Pasa | `node .tools/package/bin/npm-cli.js run lint` |
| build web | Pasa | `node .tools/package/bin/npm-cli.js run build` |
| build Android | Pasa | `scripts/build-android.ps1 -SkipCapacitorSync` + Gradle |
| Login Android | Corregido y validado en servidor | puente SSR, cookie y `/dashboard` HTTP 200; falta confirmar en el teléfono con la APK final |
| Compras alta/detalle | Implementado y compilado | `/compras/nueva`, `/compras/[id]`, recepción atómica |
| Edición de recetas | Implementado y compilado | `/biblioteca/[id]/editar` y `PATCH /api/biblioteca/recetas/[id]` |
| Conversión/importación | Corregido | kg y unidades con peso se convierten a gramos; CSV conserva stock/minimos |
| Operaciones atómicas | Publicado y comprobado | migración `006_consistencia_operativa.sql` en Supabase real |

## Pendientes para cierre de producción

1. Instalar la APK final en un teléfono físico y confirmar inicio de sesión, creación de restaurante y navegación posterior.
2. Ejecutar con un usuario real el flujo E2E completo: receta, producto, producción, venta, merma, compra, Storage y cierre.

## Verificaciones adicionales realizadas

- `pg_cron` quedó configurado en el proyecto real de Supabase.
- Jobs activos confirmados: `chefos-briefing-0600` (`0 6 * * *`) y `chefos-cierre-2300` (`0 23 * * *`).
- Las tres funciones fueron probadas contra `https://nipovuqpxvsgeqdrszuq.supabase.co/functions/v1` con respuestas HTTP 200.
- La APK `artifacts/ChefOS-debug-final.apk` contiene `server.url=https://chefos-pied.vercel.app`, `appId=com.chefos.app` y `cleartext=false`.
- La compilación web actual pasa type-check, lint y build; la compilación Android terminó correctamente con Gradle.

Anthropic no es requisito para la operación básica. Si se añade la clave más adelante, se activa el modo avanzado sin modificar la APK ni la base de datos.
