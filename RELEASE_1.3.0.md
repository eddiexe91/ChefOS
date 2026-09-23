# ChefOS 1.3.0 — entrega de pruebas

22-09-2026. Esta entrega no certifica el 100% de ChefOS ni sustituye el testeo Android.

## Publicación verificada — 23-09-2026

- Código, guía y APK publicados en `main`, commit `0c2a2a07762e251733565d56a9898ac157d3d981`.
- Vercel confirmó despliegue exitoso. Tras la activación de Supabase del 23-09, `/api/health` devuelve `version: 1.3.0`, `ok: true`, Storage accesible y **`historialPos.disponible: true`**.
- Se descargó la APK desde GitHub para comprobar bytes y SHA-256: coincide exactamente con el artefacto local documentado abajo.
- El historial ya está habilitado para el test H. Las migraciones 013/014 se aplicaron una vez con resultado `Success. No rows returned`. No borrar ni recrear cuenta.

## Activación y seguridad de tareas — 23-09-2026

- Verificación remota: siete tablas nuevas, siete con RLS, ocho RPC esperadas, cero permisos INSERT/UPDATE/DELETE para anon/authenticated/PUBLIC sobre tablas nuevas; confirmación ejecutable por authenticated, no anon.
- Cero tickets históricos después de la activación. No se importaron documentos reales ni se borraron productos/recetas/cuentas.
- Se encontró código remoto mezclado con una plantilla de ejemplo, distinto al repositorio. Se reemplazaron íntegramente `generar-briefing` y `cierre-diario`; no basta un antiguo HTTP 200 como prueba funcional.
- Credencial aleatoria exclusiva de cron, creada con autorización expresa: Vault `chefos_cron_secret_v1` y Edge Secret `CHEFOS_CRON_SECRET`. Su valor no está en Git, archivos locales ni APK. Los handlers comprueban `x-chefos-cron-secret` antes de leer restaurantes. Falta de clave o clave incorrecta devuelve 401.
- `verify_jwt=false` en esas dos funciones porque el mecanismo efectivo es el secreto privado, no un JWT anónimo público. `chat-ia` no se modificó.
- Migración **015_cron_privado.sql** aplicada; helper solo administrativo. Actualiza los dos cron existentes para consultar Vault sin incrustar el secreto en sus comandos. Mantiene horarios 06:00/23:00 GMT, no hora local chilena.
- Prueba por `pg_net` con `{"verificar":true}`: Briefing HTTP 200; cierre inicialmente 500 al consultar restaurantes, reintento HTTP 200. Ambas funciones devuelven `modo: verificacion_sin_escrituras`; se verificó el RPC de contexto/total con un restaurante, no una escritura para todos. Sin credencial: HTTP 401 en ambas.
- Código de seguridad `88901f1` publicado en main; Vercel success. Pruebas locales nuevas `npm run test:cron` y repetidas `test:historial`, `test:historial-ui`, type-check: aprobadas.
- Esta activación es de servidor. **No cambia el binario ni el hash de la APK 1.3.0.**

## Artefacto

- APK: [ChefOS-1.3.0-test.apk](artifacts/ChefOS-1.3.0-test.apk).
- Application ID `com.chefos.app`; versionName `1.3.0`; versionCode `4`; Android mínimo API 24.
- 4.120.129 bytes. SHA-256: `45d6c41ef7359b4fd1f31ecf9b775478ac8c094a4d1cbc64a2497061d4b9c0d3`.
- Firma debug verificada con apksigner; mismo certificado que `ChefOS-1.2.0-test.apk`. Instalar encima de la versión anterior, sin desinstalar ni borrar almacenamiento.
- Backend HTTPS: `https://chefos-pied.vercel.app`. La APK depende de ese servicio; no contiene un servidor de base de datos ni importa ventas por sí sola.

## Cambios

Historial canónico POS, cuatro CSV Soft Restaurant, preparación por lotes, preview, confirmación atómica, deduplicación, equivalencias, agregados y contexto histórico del Briefing. Ver [arquitectura](HISTORIAL_POS_ARQUITECTURA.md).

Estado del sistema muestra versión web y disponibilidad del esquema histórico. El importador bloquea el envío si falta verificar/aplicar 013/014. Inicio y Chef IA conservan lectura de ventas operativas antes de esas migraciones; si existe esquema histórico parcial no se sustituye facturación oficial por una suma de líneas.

Guía de cobertura: [GUIA_TESTEO_CHEFOS_1.3.0.md](GUIA_TESTEO_CHEFOS_1.3.0.md), accesible también desde Estado del sistema. Incluye inventario/stock CSV, recetas, carta, producción, mermas, compras, alertas, voz/OCR, historial, Briefing, equipo y pruebas móviles/conexión.

## Verificado localmente

- `test:historial`, `test:historial-ui`, `test:captura`, type-check, lint y build Next completados. Lint conserva aviso anterior de `guardarAvance`; build avisa de Supabase/Edge Runtime y caché webpack.
- Prueba histórica previa con 50.000 líneas sintéticas, pagos múltiples, RLS, reimportación y rollback. No se importó ningún archivo real.
- Compatibilidad de totales antes de 013/014 probada con más de 1.000 filas; se rechaza la sustitución si hay esquema histórico parcial.
- Capacitor sincronizado; Gradle `assembleDebug` finalizó correctamente. APK verificada mediante aapt/apksigner.
- No se ha realizado una prueba física en el teléfono ni una E2E autenticada remota en esta entrega.

## Pendiente de testeo y siguientes mejoras

- Probar en Android la importación real, correspondencias, métricas y actualización manual del Briefing siguiendo la guía. No se simularon resultados del restaurante.
- Verificar el próximo ciclo programado real, incluyendo persistencia de briefing/cierre. El diagnóstico remoto no ejecuta esas escrituras. Investigar si vuelve el 500 de consulta.
- Acordar horarios del servicio y cierre, y adaptar calendario/zona horaria por restaurante. Los horarios conservados están en GMT; no prometer 06:00 local. El cierre actual toma por defecto la fecha UTC anterior.
- Unificar el motor manual y el programado: comparten contexto histórico SQL, pero sus reglas operativas todavía no son idénticas. El programado conserva límites de lectura y reglas heredadas de cantidades/unidades que deben contrastarse con Inventario; no tratar sus cantidades como un forecast validado. Para este test, actualizar el Briefing manualmente y reportar cualquier cantidad incoherente.
- La credencial administrativa de `.env.local` falló anteriormente con HTTP 401; no se sustituyó por secretos del navegador. El despliegue actual se realizó desde la sesión autorizada del Dashboard.

No ejecutar `db push` ciegamente: las migraciones se aplicaron mediante SQL Editor y el registro del CLI puede diferir. No volver a aplicar 013/014. Rotar el secreto de cron requiere actualizar Vault y Edge Secrets coordinadamente; nunca usar una clave pública ni poner una clave administrativa en la APK.

No se eliminaron cuentas, productos, recetas ni ventas. No es necesario empezar de cero. Mantener ensayos destructivos o de consumo ficticio fuera del restaurante real.
