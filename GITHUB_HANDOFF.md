# ChefOS — guía de continuación

## Entrega 1.3.3 — 03-10-2026

Consultar primero [RELEASE_1.3.3.md](RELEASE_1.3.3.md) y [GUIA_TESTEO_CHEFOS_1.3.3.md](GUIA_TESTEO_CHEFOS_1.3.3.md). Reemplazan el estado anterior: el usuario ya importó historial real de un año y fixtures QA. No borrar cuenta, stock ni preparaciones. Preservar regresiones aprobadas de recetas/producción/unidades.

Cambios: avance onboarding inmediato, diálogo de duplicados, escalar por factor, total frente a costo por unidad, merma manual directa, historial/refresh de alertas, riesgo actual del Briefing, motor compartido manual/cron, snapshot mediante RPC segura, CSV operativo en Ventas, equivalencias buscables/filtrables y publicación histórica por bloques con RLS y métricas que ocultan filas pendientes. Cuatro migraciones nuevas; ver release para activación y pruebas concretas. No asumir que publicaciones/teléfono pasan por compilar.

Pendientes: validar paquete grande real y testeo físico1.3.3; retención/cancelación segura; bienvenida Crear/Unirme solicitada para futuro; Excel flexible, tutoriales interactivos, PKCE/OTP, offline completo y modelos de previsión/decisiones. No reimplementar estos cambios ni declarar visión100%. Los archivos descargables se reutilizan de1.3.2 con nombresQA132; la guía explica cómo no duplicar existencias.

## Entrega 1.3.2 — 29-09-2026

Consultar primero [RELEASE_1.3.2.md](RELEASE_1.3.2.md) y [GUIA_TESTEO_CHEFOS_1.3.2.md](GUIA_TESTEO_CHEFOS_1.3.2.md). Corrige nombre de perfil, configuración del Chef Ejecutivo sin autoasignación de cargo, lectura de alertas antiguas, guardado nativo de CSV, motivos/notas de merma, recuperación/validación por etapas del historial y errores visibles del Briefing manual. Ocho CSV ficticios en `public/qa/1.3.2`, accesibles desde Configuración → Archivos ficticios y guía de pruebas.

**Migraciones nuevas aplicadas y verificadas:** `20260929030320_correcciones_qa_perfil_alertas_configuracion.sql` y `20260929030350_historial_validacion_reanudable.sql`. El usuario autorizó activar permisos. No se importaron ventas reales ni se eliminaron borradores/datos. Cuatro preparaciones y una vista previa validada siguen conservadas; usar Recuperar, no cargar otra copia del mismo período. La confirmación final sigue siendo atómica y tiene límites de tiempo; no está certificada con el paquete real.

**Publicación verificada:** código `d466d0d` en main, Vercel success, health remoto 1.3.2/ok y validación histórica por etapas disponible; guía GitHub HTTP 200. APK 1.3.2/versionCode 6 compilada y firma compatible, `artifacts/ChefOS-1.3.2-test.apk`. Escala sintética local de 150.000 líneas aprobada, no equivale al test físico. El testeo físico 1.3.1 del usuario confirmó recetas/Carta sin duplicados, producción/corrección/anulación y existencias; esta versión requiere nueva regresión, no una declaración del 100%.

Pendientes prioritarios: prueba real de importación y contexto del Briefing, retención segura de preparaciones, unificar motor automático/manual, Excel multiformato, tutoriales prácticos y PKCE. No reimplementar recetas ni revertir unidades contadas a gramos. No tocar el archivo local ajeno `AUDITORIA_NORTE_2026-09-17.md` sin inspección/autorización.

## Entrega de pruebas 1.3.1 — 27-09-2026

Leer [RELEASE_1.3.1.md](RELEASE_1.3.1.md), [GUIA_TESTEO_CHEFOS_1.3.1.md](GUIA_TESTEO_CHEFOS_1.3.1.md) y [CORRECCIONES_QA_2026-09-26.md](CORRECCIONES_QA_2026-09-26.md). Código **1.3.1 publicado en main, cb08648**, Vercel success y health remoto 1.3.1/ok/historial/Storage confirmados el 27-09. Android 1.3.1/versionCode 5 compilado, firma compatible y pantalla offline incluidas; APK local enlazada abajo. Guía accesible en GitHub. Estos checks no certifican Android físico ni escrituras E2E del restaurante.

**016 aplicada** el 26-09 con autorización en SQL Editor; ocho cuerpos de funciones comparados contra el archivo local. El 27-09 el conector Supabase ya funciona: se aplicó `cierre_permisos_operativos`, cerrando permisos anónimos explícitos heredados, auxiliares internos y catálogo de unidades. Comprobación remota: cero funciones SECURITY DEFINER de aplicación ejecutables por anon; las tres RPC nuevas siguen disponibles para authenticated, con sus controles de restaurante/rol. No se importaron ventas reales ni se borraron registros.

No repetir 013/014/015/016 ni borrar datos. La 016 no repara automáticamente duplicados o rendimientos históricos ambiguos. Los tests usan PostgreSQL en memoria y datos ficticios. Faltan pruebas E2E autenticadas de negocio remotas y físicas. El historial de migraciones de Supabase solo refleja 001–005 y el complemento nuevo; varias migraciones se aplicaron por SQL Editor. **No ejecutar db push a ciegas**: conciliar primero el registro con objetos reales. El complemento local `20260927120202_cierre_permisos_operativos.sql` corresponde a versión remota `20260927122308` con el mismo contenido.

Excel debe ser multiformato, no específico de Cocina Puerto. [IMPORTACION_PLANILLAS_FLEXIBLES.md](IMPORTACION_PLANILLAS_FLEXIBLES.md) define el asistente de columnas, unidades, vista previa e importación idempotente. **Diseño pendiente de implementación**, no venderlo como capacidad actual. Una muestra del usuario amplía casos de prueba, no es requisito del diseño.

APK local: `artifacts/ChefOS-1.3.1-test.apk`, 4.120.798 bytes, SHA-256 `bba33ad77aabe9dbe3773bd706c4171c38be91f3e75016b8ea8b10943358a439`. Mantener firma existente. No requiere borrar cuenta ni datos. Para reproducir usar sincronización completa: `scripts/build-android.ps1 -BackendUrl https://chefos-pied.vercel.app`; no usar `-SkipCapacitorSync` porque su rama histórica no incorpora `server.errorPath`.

## Entrega de pruebas 1.3.0 — 22-09-2026

Activación verificada el 23-09: migraciones **013, 014 y 015 aplicadas** en Supabase. Health informa `historialPos.disponible: true`, backend Vercel 1.3.0 operativo. La APK publicada sigue siendo válida; no borrar cuenta ni reinstalar desde cero. Código de seguridad publicado en `88901f1` (Vercel success).

Consultar [RELEASE_1.3.0.md](RELEASE_1.3.0.md) y [GUIA_TESTEO_CHEFOS_1.3.0.md](GUIA_TESTEO_CHEFOS_1.3.0.md). APK 1.3.0 compilada, con firma compatible con 1.2.0. El usuario puede iniciar el test histórico desde la app. No se importó ningún CSV real: cero tickets históricos al terminar la activación. Las notas históricas no certifican pruebas físicas.

Funciones `generar-briefing` y `cierre-diario` reemplazadas por código del repositorio, protegido con credencial privada solo en Vault/Edge Secrets. Pruebas remotas sin escrituras: HTTP 200 con credencial y 401 sin ella en ambas. Cierre tuvo un primer 500 de consulta y el segundo intento pasó; no ocultar el incidente ni afirmar que ya pasó una ejecución programada completa. Los cron siguen activos a 06:00 y 23:00 **GMT**, conservando los horarios anteriores; falta acordar horario operacional local y comprobar el siguiente ciclo real. No usar la clave pública como autorización del cron. Ver release para límites del motor automático.

## Infraestructura de historial POS

Leer [HISTORIAL_POS_ARQUITECTURA.md](HISTORIAL_POS_ARQUITECTURA.md). Se amplían ventas con tickets, pagos múltiples, productos POS/mapeos, preparación por bloques, validación, confirmación atómica e idempotencia. **013/014 aplicadas:** siete tablas nuevas con RLS, ocho RPC presentes, sin escritura directa anon/authenticated en tablas nuevas y ejecución anónima de confirmación bloqueada. No se importó historial real.

Nuevas pantallas: `/ventas/importar` (cuatro CSV), `/ventas/mapeos`, `/ventas/analitica`. El Briefing recibe contexto agregado y observaciones con período/limitaciones; no se ha calibrado un forecast ni implementado el ciclo de descongelación. No volver a ejecutar 013/014: ya existen sus tablas y funciones. El Dashboard utiliza `total_ventas_periodo`.

Pruebas locales: `npm run test:historial` (PostgreSQL en memoria, sin Supabase), `npm run test:historial-ui`, `node scripts/test-historial.cjs --scale` (50.000 líneas sintéticas), `npm run test:captura`, type-check, lint y build. Pasaron localmente; lint/build conservan advertencias documentadas. Los resultados y límites deben consultarse en el documento citado; no confundirlos con una validación en Android o en producción. Los flujos antiguos de revisión/descuento están separados del historial y las escrituras históricas directas se rechazan también en PostgreSQL.

## Norte permanente y corrección de captura

El documento rector [CHEFOS_NORTE_ESTRATEGICO.md](CHEFOS_NORTE_ESTRATEGICO.md) y `AGENTS.md` gobiernan próximas decisiones junto con la arquitectura maestra. Prioridad: Briefing accionable en menos de 30 segundos, captura fiable, cálculos explicables, incertidumbre y resultado real; no agregar módulos por cantidad.

Corrección de testeo: colores base explícitos en modo oscuro y contraste de texto secundario; voz admite “registro dos porciones de merma de congrio” además de “2 porciones de congrio como merma”. Sigue siendo un intérprete determinista de variantes acotadas, con selección/revisión y confirmación; no es comprensión libre de cualquier frase. Se mantiene la APK 1.2.0 porque son cambios web, sin cambios nativos.

## Actualización 16-09-2026 — versión 1.2.0

Consultar primero [RELEASE_1.2.0.md](RELEASE_1.2.0.md): reemplaza las afirmaciones de validación general de la sección histórica. Incluye causa comprobada de Recetas/Carta, briefing dinámico, migración 012 aplicada, capturas por voz/foto, pruebas y limitaciones. Las funciones pendientes de 010 ya se aplicaron: prueba transaccional PASS de consumo, salida a Stock disponible, actividad y merma. Sigue pendiente el testeo físico de la nueva versión.

## Estado histórico al 15-09-2026

`main` contiene la versión validada de ChefOS. Login, onboarding con cargo, Inventario, Recetas, Carta, Producción, actividad reciente, compras, alertas, briefing y Chef IA básico están conectados al backend publicado.

Validado en teléfono: creación de recetas, creación de producciones, producciones pendientes y descuento de ingredientes del inventario al registrar producción. La migración `009_categoria_postres.sql` está en el repositorio y fue aplicada en Supabase.

La especificación completa de la siguiente iteración está en [COPILOT_NEXT_ITERATION.md](COPILOT_NEXT_ITERATION.md). Incluye separación Inventario/Stock disponible, elaboración de Carta, edición y archivado, onboarding, briefing y criterios de aceptación.

## Servicios actuales

- Vercel: [https://chefos-pied.vercel.app](https://chefos-pied.vercel.app)
- Supabase: proyecto `nipovuqpxvsgeqdrszuq`
- Supabase URL: `https://nipovuqpxvsgeqdrszuq.supabase.co`
- Rama fuente: `main`
- Chef IA: modo básico; Anthropic es opcional.

## Preparar y verificar

```powershell
Copy-Item .env.example .env.local
node .tools/package/bin/npm-cli.js install --no-audit --no-fund
node .tools/package/bin/npm-cli.js run type-check
node .tools/package/bin/npm-cli.js run lint
node .tools/package/bin/npm-cli.js run build
```

Si cambia el esquema, aplicar la nueva migración en el SQL Editor de Supabase antes de probar. No guardar secretos en GitHub.

## Generar APK

```powershell
powershell -ExecutionPolicy Bypass -File scripts/build-android.ps1 -BackendUrl https://chefos-pied.vercel.app
```

Resultado esperado: `artifacts/ChefOS-debug.apk` o `artifacts/ChefOS-debug-latest.apk`. Es una APK debug instalable en Android y necesita el backend HTTPS publicado.

## Documentos de referencia

- [COPILOT_NEXT_ITERATION.md](COPILOT_NEXT_ITERATION.md)
- `CHEFOS_MASTER_ARCHITECTURE.md`
- `CHEFOS_DATABASE_SPEC.md`
- `CHEFOS_ROADMAP.md`
- `INVENTARIO_MAESTRO_SPRINT3.md`
- `supabase/DEPLOYMENT.md`
