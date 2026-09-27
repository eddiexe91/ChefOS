# ChefOS 1.3.1 — entrega de pruebas, 27-09-2026

## Publicación

Código publicado en `main`: [`cb08648`](https://github.com/eddiexe91/ChefOS/commit/cb08648174c8ae9f5ee7052c7e7aa6595b748169). Vercel informó **Deployment has completed / success** el 27-09 y `https://chefos-pied.vercel.app/api/health` devolvió versión **1.3.1**, `ok: true`, historial POS disponible y Storage accesible. La guía fue comprobada en GitHub con HTTP 200. La APK apunta a ese backend. Estos checks no son una prueba de escritura autenticada ni física en Android.

## Qué cambia

- Recetas y Carta: búsqueda visible, unidad del producto, ingredientes/pasos compactos y salida elaborada creada dentro del guardado. Una transacción guarda hijos, costo y actividad; reintentos con el mismo identificador no duplican. Control de versión para ediciones concurrentes.
- Producción: tandas y cantidad realmente obtenida separadas; registro terminado; corrección/anulación con motivo y movimientos compensatorios. Conserva historial y rechaza falta de stock o conversiones incompatibles.
- Porciones sin peso no se confunden con gramos. Mermas generan actividad transaccional.
- Selector CSV Android más tolerante al MIME; nombres de archivos y errores visibles. Proveedor nuevo y buscador en Compras. Cámara/galería, giro de imagen, revisión y advertencia de OCR incierto.
- Desconexión: no simular guardado ni reenviar automáticamente colas antiguas; pantalla local para recuperar navegación. No es modo offline completo.
- Briefing manual: mínimo cero requiere configurar, no comprar 1 g por defecto; faltantes calculados en su unidad. Objetivo: información más fiable para decidir, no más módulos.

## Base de datos y seguridad

- `016_guardado_recetas_seguro.sql` aplicada una vez con autorización el 26-09, por SQL Editor. Nuevas tablas privadas `recetas_guardados` y `produccion_correcciones`, columnas aditivas y tres RPC principales. No repara ni borra datos históricos.
- Complemento local `20260927120202_cierre_permisos_operativos.sql`, aplicado por conector el 27-09 con versión remota `20260927122308`: revoca PUBLIC/anon en funciones privilegiadas de aplicación, mantiene solo accesos previos legítimos, restringe auxiliares/cron antiguo, activa RLS de unidades y escalado con permisos del usuario.
- Confirmado remotamente: hashes de ocho cuerpos de 016 coinciden con el archivo; cero funciones privilegiadas de aplicación ejecutables por anon; RPC principales autenticadas; unidades con RLS; conversión sintética 2 porciones = 2.
- No se importó historial real, no se reiniciaron cuentas y no se descontó stock real para las pruebas.
- Historial CLI incompleto por migraciones previas vía editor: no usar `db push` sin conciliar esquema real y registro. No repetir 006–016 a ciegas.

Advisors después del complemento: sin errores de nivel ERROR. Quedan avisos de [extensiones en public](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public) (pg_trgm/unaccent/pg_net), [RPC privilegiadas para usuarios autenticados](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) —intencionales con guards, no certificación de auditoría global— y [protección de contraseñas filtradas desactivada](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Las dos tablas privadas sin políticas de cliente quedan bloqueadas deliberadamente; no agregarles políticas permisivas para eliminar un aviso INFO.

## APK verificada

- Archivo local: `artifacts/ChefOS-1.3.1-test.apk` (los APK no se versionan en main).
- App `com.chefos.app`, versión **1.3.1**, versionCode **5**, Android mínimo 24.
- Tamaño: **4.120.798 bytes**.
- SHA-256: `bba33ad77aabe9dbe3773bd706c4171c38be91f3e75016b8ea8b10943358a439`.
- Certificado SHA-256: `273c451944c87a4c64060174de59d7960d7ebb80809a8bf5060d4eb3e79b465c`, idéntico a 1.3.0.
- Verificados con aapt/apksigner: versión, firma; ZIP contiene offline.html y configuración HTTPS/errorPath.
- Instalar encima de la anterior; no desinstalar ni borrar almacenamiento. Es una compilación debug para testeo, no una publicación de Play Store.

Reproducir con la firma existente:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/build-android.ps1 -BackendUrl https://chefos-pied.vercel.app
```

Usar sincronización completa, sin SkipCapacitorSync. No incluir el almacén de firma ni .env en GitHub.

## Pruebas y evidencia

- `npm run build`: completó 55 páginas, typecheck y lint. Avisos no bloqueantes: imagen OCR, efecto onboarding, Supabase en Edge Runtime y caché webpack. Primer intento falló por lectura del entorno; reintento escalado completó.
- `test:correcciones`: PostgreSQL en memoria y fixtures ficticios; grants explícitos Supabase, RLS/escalado entre dos tenants, guardado repetido sin duplicados, rollback, versión obsoleta, salida, costos, consumo/compensación/anulación y merma.
- `test:briefing`: mínimo cero, diferencia correcta, umbral exacto y fuentes incompletas.
- `test:historial`: parser/streaming 5.000 filas sintéticas, relaciones, pagos múltiples, idempotencia/conflictos/parciales, métricas, aislamiento/mapeo y cero movimientos de stock.
- `test:historial-ui`, `test:captura` (17 casos), `test:cron`: pasan localmente. Cron prueba autenticación/diagnóstico, no un ciclo diario real.
- Capacitor sync y Gradle `assembleDebug`: BUILD SUCCESSFUL.
- Sonda REST local `verify-016-remote.cjs`: no aprobada (401 inicial con credencial admin local). Verificación real de esquema/permisos realizada por conector Supabase, sin exposición de secretos.
- Pendientes: E2E autenticada de negocio en despliegue y Android físico, especialmente selector de archivos, cámara, diálogos y recuperación sin conexión.

## Pendientes que esta entrega NO declara resueltos

Excel multiformato; tutoriales prácticos simulados; PKCE entre dispositivos; unificación del Briefing automático/manual; forecast calibrado/descongelación; reparación supervisada de duplicados y rendimientos históricos; atomicidad completa del importador antiguo de inventario; OCR fiable de manuscritos; todas las funciones por voz; offline completo. La documentación de diseño no prueba implementación.

## Testeo del usuario

Seguir [GUIA_TESTEO_CHEFOS_1.3.1.md](GUIA_TESTEO_CHEFOS_1.3.1.md). Incluye preparación segura, comprobaciones por función, cantidades exactas para receta/producción/corrección, expectativas, límites conocidos y plantilla de reporte. No es necesario comenzar desde cero con la cuenta real.
