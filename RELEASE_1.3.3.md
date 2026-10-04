# ChefOS 1.3.3 — memoria operacional y correcciones QA

Fecha local de preparación: 03-10-2026. El registro de migraciones puede usar UTC del 04-10. Esta nota separa implementación, activación y testeo físico.

## Cambios y relación con el Norte

- Conservación inmediata del paso de onboarding, cache por cuenta/restaurante y guardado servidor serializado. No cambia roles.
- Duplicados de importación se resuelven en diálogo visible, no al final de una pantalla larga.
- Escalar receta por factor x0,5/x2/etc. con ingredientes y rendimiento resultante, sin producir ni modificar stock.
- Costos visibles como **total del registro** frente a **por unidad del producto**. 1200/7=171,43;2400/10=240;1200/2=600. No se corrigió un cálculo que ya era correcto.
- Merma manual disponible por defecto; voz revisable con motivo/notas.
- Alertas consultables por Sin leer/Leídas/Todas; refresco/paginación, eventos históricos conservados. Nuevo evento al caer bajo mínimo, también al crear un producto.
- Briefing recalcula riesgos de stock desde existencias actuales, no recicla mensajes viejos como riesgos vivos. Producción por mínimo calcula tandas completas según salida; cero mínimo pide configurar, no inventa compras.
- Motor compartido `supabase/functions/_shared/briefingOperativo.ts` y observaciones de ventas compartidas: manual y automático usan las mismas reglas deterministas. IA no sustituye cálculos ni inventa cantidades. Los horarios cron existentes no se modifican.
- CSV operativo directamente en Ventas; revisión enlazada; consumo ya confirmado se presenta como terminado, sin anuncio de segundo descuento ni edición posterior de equivalencia.
- Equivalencias POS buscables y agrupadas en Carta/Recetas/Stock/Inventario; filtro de estados, pendientes por defecto, propuestas exactas solo con confirmación. No fuzzy matching silencioso.
- Historial con explicación y resumen legible. Confirmación por llamadas cortas, progreso persistente y continuación sin resubir archivos. Registros pendientes quedan protegidos por RLS; métricas RPC excluyen pagos pendientes incluso en tickets publicados. Publicación final y agregaciones son atómicas, incrementales y sin movimientos de stock.
- Copia manual de existencias mediante RPC restringida: cantidades/tenant/fecha del servidor, no INSERT abierto ni valores enviados por usuario. Reemplaza la copia manual de hoy; no toca stock.

Todo mejora captura fiable, trazabilidad y decisiones del Briefing; no añade un POS paralelo ni convierte el historial en pronóstico certificado.

## Migraciones locales nuevas

1. `20260930020735_qa133_copias_alertas.sql`: copia server-side, eventos de stock bajo mínimo.
2. `20260930020738_qa133_confirmacion_historial.sql`: agregación incremental y índice por importación. Su confirmación monolítica queda sustituida por la siguiente.
3. `20261004014419_qa133_publicacion_historial_por_bloques.sql`: cursor `publicacion_parcial`, procedencia de pagos, publicación/RLS, RPC de pasos y métrica de pagos publicados. Chef Ejecutivo puede consultar sus preparaciones históricas; no se abre escritura directa.
4. `20261004022735_qa133_busquedas_historial_acotadas.sql`: búsquedas por clave única que evitan barridos por fila cuando las tablas recién cargadas aún carecen de estadísticas actualizadas. Mantiene cursor, contrato y permisos.

Las cuatro migraciones están **aplicadas y verificadas** en Supabase con la autorización otorgada. Versiones remotas20261004021108/20261004021109/20261004021111/20261004023104 corresponden, respectivamente, a los cuatro archivos locales citados. RPC de pasos/snapshot/helper: authenticated autorizado y anon cerrado; triggers internos cerrados también a authenticated; cuatro políticas de publicación/lectura presentes. No ejecutar `db push` indiscriminado: parte del esquema previo se instaló por SQL Editor. No repetir013–016 ni estos complementos. No borra/limpia paquetes, cuentas, recetas o existencias.

## Evidencia y estado de entrega

Las pruebas locales de parser, idempotencia, relaciones/pagos múltiples, productos históricos, RLS/roles/tenants, publicación oculta, recuperación, métricas y cero movimientos pasan. Se comprueba también un pago nuevo de un ticket publicado: queda fuera de consultas y métricas hasta completar su propio paquete.

Pasaron `test:correcciones`, `test:historial`, `test:historial-ui`, `test:captura`, `test:briefing` y `test:cron`: recetas, producción/corrección/anulación, costo unitario, snapshot autorizado, alertas, mermas, Briefing manual y ejecución automática con las mismas reglas. HTTP/SSR no equivale a táctil Android. Type-check y lint sin avisos pasan. Build final completo pasa; el primer intento mostró un error de acceso ESLint pese a devolver0 y no se contó como validación: se repitió fuera del entorno restringido. Avisos previos de Supabase en Edge/Webpack no son funcionalidades implementadas.

Android: sync completo y Gradle pasan fuera del entorno restringido. Primer intento falló al leer archivos generados de Capacitor; no se omitió el sync ni se cambió la firma para solucionarlo. APK `artifacts/ChefOS-1.3.3-test.apk`, **4.110.882bytes**, package`com.chefos.app`, versionName1.3.3/versionCode7. SHA256`35be561967101cb116f9846034909dba6eda3ff69bb98d5e2bb9a6a97971038f`; certificadoSHA256`273c451944c87a4c64060174de59d7960d7ebb80809a8bf5060d4eb3e79b465c`. Firma/versiones comprobadas con apksigner/aapt, compatible con1.3.2.

Edge `generar-briefing` desplegada, ACTIVE versión5, con los dos archivos compartidos. Mantiene autenticación privada antes de leer y verify_jwt=false por ese control propio. Diagnóstico remoto privado: HTTP200, ok=true, versión1.3.3, modo sin escrituras. Petición sin la credencial correcta:401. No se expuso la credencial ni se forzó una generación real. Falta observar el ciclo programado, no equivale al diagnóstico.

Rendimiento: el primer benchmark150.000 se detuvo por lentitud y **no se considera aprobado**. EXPLAIN local identificó búsquedas que barrían el tenant por cada fila con estadísticas nuevas. Tras el cuarto complemento, prueba10.000 líneas/1000tickets/pagos: confirmación6,803s en30pasos, máximo0,336s/paso, frente a69,986s/máximo6,364s antes. Son mediciones sintéticas PostgreSQL local, no promesas de Supabase. Ver cierre para la nueva prueba grande y publicación.

Se realizaron consultas remotas de solo lectura para diagnosticar. A diferencia de la nota histórica1.3.2, **el usuario ya incorporó un paquete real de un año y paquetes QA**. Nosotros no importamos ni confirmamos historial real durante esta corrección, ni alteramos existencias para probar.

## Límites y pendientes

- Los pasos tienen límite20s y lock5s; finalización aún agrega el paquete completo en una transacción. Si esa fase excede tiempo, queda pendiente, no visible; necesita diagnóstico, no reimportación repetida. Prueba local no certifica Supabase real ni Android.
- Solo un paquete en incorporación por restaurante. Un conflicto de contenido/identidad o dato incompatible a mitad requiere revisión del operador; no se cancelan/limpian filas automáticamente. La retención y cancelación segura siguen pendientes.
- La validación continúa con seis etapas anteriores de25s; no se promete ausencia absoluta de timeouts. Manifest/cursor bloqueados durante incorporación; las claves externas se revalidan bajo bloqueo al insertar cada bloque.
- Catálogo POS conserva nombres históricos; no impone mapeo completo. No unifica IDs A-/H-. No se mezcla período entre OCR, operativo e histórico.
- Excel multiformato, tutoriales interactivos, bienvenida Crear/Unirme, PKCE/OTP, permisos finos de futuros cargos, OCR manuscrito fiable y offline integral permanecen pendientes. El usuario pidió diferir la bienvenida.
- Pronóstico calibrado, planificación de descongelación y aprendizaje recomendación/decisión/resultado siguen pendientes; memoria histórica reciente y equivalencias no los implementan automáticamente.
- Analítica antigua de consumo no equivale al nuevo contexto POS. Una copia no prueba consumo real.
- Catálogos para equivalencias tienen límites explícitos10000; consultas de Briefing1000productos/150recetas advierten fuentes incompletas en vez de afirmar cobertura total. Chef IA sigue básico.
- Cron comparte motor, pero falta observación de un ciclo programado real. No se fuerza sobre restaurantes reales para testear.

## Uso y siguientes verificaciones

[GUIA_TESTEO_CHEFOS_1.3.3.md](GUIA_TESTEO_CHEFOS_1.3.3.md) define pasos y vocabulario. No borrar cuenta. Instalar APK como actualización con firma existente, backend HTTPS publicado. Archivos QA132 reutilizados; no volver a sumar existencias para repetir.

Reproducir: `powershell -ExecutionPolicy Bypass -File scripts/build-android.ps1 -BackendUrl https://chefos-pied.vercel.app`, con sync completo. APK y keystore fuera de Git. VersionName1.3.3/versionCode7.

## Cierre de pruebas locales

La nueva escala completa **150.000 líneas,15.000 tickets y15.000 pagos** pasó con el cuarto complemento. Preparación219,0s, validación5,725s, publicación103,479s en422pasos, **máximo0,951s por paso**, finalización0,951s; total328,3s. PostgreSQL local/PGlite, sin red ni datos reales; no certifica tiempos Supabase, capacidad del teléfono ni el paquete de tres años del usuario. Primer benchmark lento interrumpido registrado arriba, no ocultado.

`git diff --check` pasa; diff revisado. No se incluyen adjuntos, secretos, APK/keystore ni `AUDITORIA_NORTE_2026-09-17.md`, que ya estaba fuera del seguimiento. No hubo testeo físico ni escrituras E2E remotas de negocio en esta entrega; se requiere la guía con QA.

## Publicación verificada

Código publicado en `main`: `d98e6e53da9b2d5e00d3fa76148ef35ccc511707`. GitHub informa Vercel **success / Deployment has completed**. Comprobación remota del 04-10-2026 UTC: `/api/health` devuelve versión **1.3.3**, `ok: true`, Storage accesible y disponibilidad del historial, validación por etapas y publicación por bloques. La guía de esta versión en GitHub devuelve HTTP 200.

Las cuatro migraciones y la función automática compartida están activadas según la evidencia anterior. No se importó historial real ni se modificó stock para comprobar la publicación. La APK enlazada conserva la firma de 1.3.2 y no exige reinstalar desde cero. El próximo paso es el testeo físico del usuario con la guía: publicación y pruebas sintéticas no equivalen a una certificación del 100% del producto.
