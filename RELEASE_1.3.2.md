# ChefOS 1.3.2 — correcciones del testeo físico

Fecha: 29-09-2026. Esta nota separa implementación y evidencia de pruebas; no certifica el teléfono del usuario.

## Estado de entrega

Supabase: las dos migraciones de esta entrega están aplicadas y sus permisos/configuración verificados. Android y Next.js compilaron localmente. Código publicado en **main, d466d0d**; Vercel confirmó **success** y el backend remoto responde **1.3.2, ok=true, historial POS y validación por etapas disponibles**. Guía de GitHub comprobada HTTP 200. Esto no sustituye pruebas de negocio autenticadas ni físicas.

No se importaron ni confirmaron ventas reales. No se borraron preparaciones, existencias, recetas, usuarios ni cuentas. El chequeo remoto conserva cuatro paquetes preparando y uno validado, ninguno completado. Los datos de prueba publicados son exclusivamente sintéticos.

## Diagnóstico y cambios

- **Perfil:** usuarios tenía lectura RLS, no una vía autorizada de UPDATE del nombre. El cliente anterior no exigía fila devuelta y podía anunciar éxito sin persistir. `actualizar_mi_nombre` cambia solo el nombre del usuario activo autenticado; el cliente exige confirmación y refresca la cabecera.
- **Configuración:** el flujo anterior rechazaba Chef Ejecutivo e incluía un selector del propio rol. `guardar_configuracion_inicial` admite Dueño/Administrador/Chef Ejecutivo, verifica conteos reales y zona horaria, serializa guardados y nunca cambia cargos. Una propuesta de cambiar el propio rol es rechazada. Autorización explícita del usuario para aplicar estos cambios.
- **Alertas:** faltaba permiso de actualización; `marcar_alerta_leida` permite únicamente marcar lectura de alertas del restaurante del miembro, también antiguas. Reintentar conserva la primera atribución/hora. No amplía UPDATE directo ni repone existencias.
- **Historial:** logs reales confirmaron timeouts. La validación anterior ejecutaba ANALYZE de toda la tabla de preparación y varias verificaciones en una sola petición. Se elimina ese ANALYZE global, se usan planes específicos y seis etapas transaccionales reanudables. Límites por función: 25 s por etapa y 55 s para compatibilidad/confirmación; no se cambia el timeout de toda la base.
- **Recuperación:** GET devuelve los diez últimos paquetes históricos del restaurante autorizado. Se recupera la vista previa o la etapa pendiente. Si una preparación antigua carece de manifiesto, pide los mismos archivos y verifica/reutiliza bloques. No confirma automáticamente ni elimina borradores.
- **Android:** botón real para guardar plantillas y CSV ficticios mediante ACTION_CREATE_DOCUMENT, sin permiso amplio de almacenamiento. La APK registra `ChefArchivos`; los navegadores web mantienen descarga Blob. Errores/cancelación visibles.
- **Merma escrita/voz:** motivo y notas editables en la revisión, antes de confirmar. Mantiene selección explícita y actividad operacional existente.
- **Briefing manual:** el contexto histórico opcional tiene plazo de 3,5 s; su fallo no debe impedir sugerencias operativas verificables. Se muestra hora de respuesta/error y se advierte si se conserva un análisis anterior. No está demostrada la causalidad entre los timeouts de importación y el fallo de Briefing reportado.
- **Snapshots:** explicación de copia de cantidades de ChefOS, consulta fresca completa, fecha actual del restaurante y aviso de reemplazo de otra copia manual del mismo día. No se crea una copia parcial de más de 1000 productos ni se presentan porciones sin masa como gramos.
- **Pruebas del usuario:** ocho CSV ficticios descargables desde Configuración; guía completa, conceptos definidos y cantidades esperadas, sin exigir que el chef confeccione los archivos.

Estos cambios mejoran captura fiable, trazabilidad y acceso a memoria operacional para el Briefing. No amplían ChefOS hacia un POS paralelo.

## Migraciones aplicadas

Los nombres locales corresponden a las versiones registradas remotamente:

1. `supabase/migrations/20260929030320_correcciones_qa_perfil_alertas_configuracion.sql`.
2. `supabase/migrations/20260929030350_historial_validacion_reanudable.sql`.

Verificación remota: todas las RPC nuevas son inaccesibles a anon, disponibles a authenticated con sus comprobaciones internas; la función interna del trigger no es ejecutable por ninguno. `search_path` fijado. Columnas/RPC y timeouts presentes. No reaplicar 013–016: parte del historial antiguo se instaló por SQL Editor y no aparece en schema_migrations; no ejecutar `db push` a ciegas.

## Evidencia de pruebas

- `npm run type-check`: pasa.
- `npm run lint`: sin errores; advertencia conocida de `<img>` para la vista previa OCR.
- `npm run test:correcciones`: PostgreSQL local en memoria, perfil propio/roles/alertas multi-tenant, guardado de recetas sin duplicados, rollback y unidades, producción/corrección/anulación compensatoria, merma/actividad: pasan.
- `npm run test:historial`: parser real, cuatro fixtures descargables, pagos múltiples, no vigentes, claves A/H, idempotencia, conflictos/rollback, RLS/mapeo y cero movimientos de stock: pasan; incluye etapas/reintentos.
- `npm run test:historial-ui`: renderizado de servidor y contratos HTTP sin red; no equivale a pruebas táctiles.
- `npm run test:captura`: 17 pruebas de comandos/CSV pasan.
- `npm run test:briefing` y `npm run test:cron`: pruebas sintéticas; no certifican un ciclo automático real.
- Escala local: **150.000 líneas, 15.000 tickets y 15.000 pagos sintéticos**. Preparación 127,8 s, validación 3,091 s, confirmación atómica 37,782 s; total 168,7 s. No son tiempos prometidos para Supabase ni un teléfono.
- EXPLAIN ANALYZE de solo lectura en Supabase sobre la verificación de duplicados de un paquete grande ya preparado: **185.283 filas; 15,946 s**. Confirma que una etapa puede superar el límite anterior de 8 s. No ejecutó validación con escrituras, confirmación ni consumo.
- `npm run build`: pasa con avisos de Supabase/process.version en Edge Runtime y caché de Webpack; no se actualizó toda la cadena de dependencias en este parche.
- Android: sincronización completa Capacitor y Gradle `assembleDebug` exitosa. Primer intento restringido falló al consultar usuario de Windows; se repitió fuera del sandbox con aprobación, sin omitir sincronización. Avisos existentes de flatDir/deprecaciones Gradle.

## APK

`artifacts/ChefOS-1.3.2-test.apk` — 4.124.472 bytes.

- Package `com.chefos.app`, versionName **1.3.2**, versionCode **6**.
- SHA-256: `e056a674fe3c19323586a207f48625033c541cd52dfef468cd2144f319525f53`.
- Certificado de firma SHA-256: `273c451944c87a4c64060174de59d7960d7ebb80809a8bf5060d4eb3e79b465c`, compatible con 1.3.1.
- Apunta a `https://chefos-pied.vercel.app`. Necesita que los cambios web estén publicados; no es un backend offline empaquetado.
- Reproducir con `powershell -ExecutionPolicy Bypass -File scripts/build-android.ps1 -BackendUrl https://chefos-pied.vercel.app`, sin `-SkipCapacitorSync`.

La APK y la clave de firma permanecen fuera de Git. No contiene secretos de servicio.

## Riesgos y trabajo pendiente

1. No se ha ejecutado confirmación E2E remota del paquete real: el usuario decide cuándo importar. La confirmación sigue siendo atómica en una sola petición y puede superar 55 s; hace falta seguir midiendo y, si ocurre, implementar finalización por trabajo persistente sin visibilidad parcial, no dividir tickets arbitrariamente ni aumentar límites globales.
2. Preparaciones acumuladas: revisión inicial ~531.852 filas/~498 MB; base ~515 MB. No se verificó plan/cuota ni se afirmó modo de solo lectura. No se borró nada. Hace falta política de retención/cancelación y confirmación del usuario antes de limpiar sus paquetes.
3. Motor automático de Briefing aún no está homogeneizado con el manual. PKCE entre dispositivos, Excel multiformato, tutoriales prácticos, OCR manuscrito fiable, sincronización offline completa y previsión calibrada siguen pendientes.
4. Importador antiguo de inventario mantiene límites de concurrencia/transaccionalidad. Las pruebas aquí usan un solo operador y unidades coincidentes; no fusionar silenciosamente nombres iguales con unidades distintas.
5. Snapshot manual admite hasta 1000 productos completos y reemplaza la copia manual del mismo día. Los análisis antiguos no equivalen a demanda prevista ni prueban consumo físico a partir de una sola copia.
6. Asesor de seguridad Supabase: avisos de funciones SECURITY DEFINER expuestas a authenticated (intencionadas para las RPC autorizadas y revisadas; no prueba de fuga por sí mismo), extensiones en public y protección de contraseñas filtradas desactivada. Tablas internas sin políticas conservan acceso directo cerrado. No se activaron servicios de pago ni se movieron extensiones sin analizar dependencias. Referencias: [RPC privilegiadas](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [extensiones](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public), [tablas sin políticas](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [protección de contraseñas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Qué debe probar primero el usuario

Seguir [GUIA_TESTEO_CHEFOS_1.3.2.md](GUIA_TESTEO_CHEFOS_1.3.2.md): perfil/configuración, descarga Android, alerta antigua, paquete POS ficticio y recuperación del validado real sin confirmar todavía. Luego regresión completa de receta/producción/stock/merma/compra y Briefing. No borrar la cuenta ni las existencias para comenzar.

## Cierre de publicación — 29-09-2026

- GitHub: `d466d0d4bf667c2708a50d71e7eb4b55f0133471` publicado en main con 40 archivos, documentación y ocho CSV ficticios. Adjuntos del usuario, secretos y auditoría local ajena excluidos.
- Vercel: [despliegue verificado](https://vercel.com/eddiexe91/chefos/AEsHrmkfK8uRSPbbga34AvA7qnev), estado success. `/api/health`: 1.3.2, Storage accesible y ambas comprobaciones históricas disponibles; Chef IA sigue básico.
- APK verificada con `apksigner`/`aapt`: versión, código, certificado y checksum indicados arriba. Incluye recuperación `offline.html` y ocho CSV; no implica soporte offline completo ni que se haya probado el selector Android en un teléfono.
- Guía publicada accesible en GitHub. Empezar por QA; las pruebas físicas del usuario aún son necesarias antes de aprobar esta versión.
