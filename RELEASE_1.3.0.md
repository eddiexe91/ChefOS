# ChefOS 1.3.0 — entrega de pruebas

22-09-2026. Esta entrega no certifica el 100% de ChefOS ni sustituye el testeo Android.

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

## Pendiente externo

Las migraciones 013 y 014 y las Edge Functions modificadas no se han aplicado/desplegado por esta tarea. No hay navegador conectado ni token Supabase CLI disponible; la credencial administrativa local tampoco permitió verificar el esquema remoto (HTTP 401). Esto no significa que la configuración de Vercel esté mal: su `/api/health` anterior respondió correctamente con Storage accesible.

Para habilitar el historial: conectar sesión autorizada de Supabase, comprobar qué migraciones existen, aplicar solo las pendientes en orden y verificar RPC/RLS antes de importar datos reales. Desplegar después `generar-briefing` y `cierre-diario`. No ejecutar `db push` ciegamente: migraciones anteriores se aplicaron mediante SQL Editor.

No se eliminaron cuentas, productos, recetas ni ventas. No es necesario empezar de cero. Mantener ensayos destructivos o de consumo ficticio fuera del restaurante real.
