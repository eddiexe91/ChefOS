# Correcciones del testeo de ChefOS 1.3

Actualizado al 27-09-2026: 016 y complemento de permisos aplicados/verificados en Supabase; compilaciones web/Android y pruebas locales completas. Para publicación/artefacto consultar `RELEASE_1.3.1.md`; guía física `GUIA_TESTEO_CHEFOS_1.3.1.md`. No se han importado archivos reales ni borrado datos del restaurante.

## Cambios preparados

- Recetas/Carta: editor compacto; búsqueda con resultados visibles, unidad inicial tomada del producto, diálogo de ingrediente con Listo y lista resumida; pasos editables en diálogo; crear salida de Stock dentro del guardado sin abandonar la receta.
- RPC transaccional `guardar_receta_atomica`: valida tenant y rol, reemplaza ingredientes/pasos dentro de la misma transacción, recalcula costos, conserva versión, registra actividad. Recibos persistentes impiden duplicar con reintentos tardíos. Rechaza edición sobre una versión que cambió.
- Producción: cantidad de recetas completas (tandas), vista de salida prevista y cantidad real obtenida. Registro de producción terminada, salida a Stock, solicitud idempotente. Corrección/anulación con motivo y movimientos compensatorios; conserva los originales. Detecta cambios posteriores de equivalencia/unidad y stock insuficiente. No adivina el significado de los antiguos registros de 400.
- Conversión: porción sin peso puede utilizarse en porciones; no equivale a gramos. Mermas quedan en actividad dentro de la transacción. Corrección del factor de costo unitario. No recalcular masivamente precios o existencias históricas al migrar.
- Desconexión: se detiene el envío de operaciones cuando el dispositivo informa offline. Las colas antiguas sin tenant/idempotencia quedan preservadas, sin reenvío automático. No se confirma éxito con una respuesta vacía. Formulario de producto conserva datos si falla red. Se añade pantalla nativa local de recuperación, que requiere compilar/sincronizar Android.
- Historial POS: selector Android permite proveedores de archivo con MIME genérico, valida extensión/tamaño y muestra archivo seleccionado; no se ha verificado aún con el teléfono que fallaba. No cambia las reglas de normalización del historial.
- Compras: creación de proveedor en el formulario y filtro de productos por nombre.
- Alertas: lectura comprueba respuesta y muestra error si no pudo persistirla.
- Captura: entrada de cámara separada de galería, previsualización, giro manual de 90 grados, lectura explícita y advertencia de baja confianza. No promete OCR fiable de manuscritos; siempre requiere revisión.
- Mis restaurantes: restricción de middleware deja de confundir ruta plural con gestión singular. Página explicita consulta, no selector multicuenta.
- PKCE: mensaje comprensible y procesamiento del callback aun con sesión; **no equivale a resolver verificación entre dispositivos**. Falta flujo token_hash/OTP y revisar plantilla de correo de Supabase.
- Briefing manual: mínimo cero no inventa compra de 1 g; con existencias cero solicita verificar conteo/unidad/mínimo. Mínimo positivo calcula diferencia en unidad real. No sugiere producción por el mero hecho de existir un lote abierto; registros anulados no cubren pendientes. Faltante por plato explicita que no es demanda prevista del día.
- Analítica explica que snapshot guarda cantidades, no toma una fotografía ni cambia existencias.

## Migración 016

Archivo: `supabase/migrations/016_guardado_recetas_seguro.sql`. Nuevas tablas `recetas_guardados` (recibos privados) y `produccion_correcciones` (historial con RLS), columnas aditivas en recetas/producción y RPC acotadas por sesión/rol/restaurante. Los registros anteriores permanecen sin reinterpretación. No incluye importación real ni deduplicación automática.

El usuario autorizó aplicarla **después de verificarla**. Se ejecutó una vez por SQL Editor el 26-09: Success, sin filas devueltas. El conector disponible el 27-09 confirmó tablas/RLS y ocho cuerpos de funciones idénticos (normalizando CRLF). Se detectaron grants explícitos a anon heredados de Supabase que REVOKE PUBLIC no retiraba: el complemento `20260927120202_cierre_permisos_operativos.sql` los cierra, restringe auxiliares internos, activa RLS del catálogo de unidades y hace que el escalado respete RLS. Aplicado remotamente como `20260927122308_cierre_permisos_operativos`. No reaplicar 016.

## Verificación reproducible

Resultado al 27-09: type-check/lint/build web completados, historial, historial-ui, captura (17), cron, Briefing operativo y correcciones SQL pasan. Gradle BUILD SUCCESSFUL, APK 1.3.1/versionCode 5 con mismo certificado que 1.3.0 y offline.html incluido. Lint conserva avisos de imagen OCR y dependencia del efecto de onboarding; build añade aviso Supabase/Edge Runtime y caché webpack. Un primer build falló leyendo node_modules; el reintento fuera del entorno restringido terminó correctamente. Un test asumía orden sin ORDER BY: corregido para buscar por producto. Falta E2E autenticado de negocio en producción y testeo físico.

Verificación remota por conector: cero funciones SECURITY DEFINER de aplicación accesibles a anon; nuevas RPC ejecutables por authenticated; inicializador y cron antiguo no ejecutables por usuarios; RLS activo en unidades; dos porciones sin peso siguen siendo dos. La sonda REST `verify-016-remote.cjs` encontró 401 en la credencial admin local antes de comprobar esquema: no se declara aprobada ni se imprimieron claves; se verificó por el conector autorizado. No pedir tokens por chat.

Ejecutar en este workspace; son pruebas sintéticas, no mutaciones de producción:

```powershell
npm.cmd run type-check
npm.cmd run lint
node scripts/test-correcciones.cjs
node scripts/test-briefing-operativo.cjs
npm.cmd run test:captura
npm.cmd run test:historial
npm.cmd run test:historial-ui
npm.cmd run test:cron
npm.cmd run build
git diff --check
```

La prueba PostgreSQL comprueba rollback, reintentos, receta editada repetidamente, unidades contadas sin masa, productos ajenos, permisos, versión obsoleta, consumo/salida, compensación y cambio de equivalencia. La prueba de Briefing verifica mínimos cero, diferencia correcta y advertencia de fuentes incompletas. No confundir estas pruebas con una certificación de uso en Android.

## Orden seguro para publicar y testear

1. Terminar pruebas y revisión del diff; conservar `AUDITORIA_NORTE_2026-09-17.md`, archivo preexistente ajeno a este parche.
2. 016 y complemento ya aplicados: solo verificar, no repetir. Probar escrituras únicamente en restaurante QA con ingredientes ficticios.
3. Publicar código en GitHub/Vercel tras confirmar la migración. Verificar despliegue, rutas y sesión; health general por sí solo no prueba las nuevas RPC.
4. Subir versión de backend/Android, sincronizar Capacitor, compilar con firma existente y comprobar nombre/versión/checksum del APK. La APK consume backend remoto: un binario nuevo por sí solo no publica el código web.
5. En QA: crear ingrediente de 10 kg, receta que usa 1 kg y rinde 2 porciones, crear salida desde editor; guardar/editar varias veces: nunca se multiplican hijos.
6. Producir 1 tanda con salida real 7: ingrediente 9 kg, salida 7 porciones. Corregir a 2 tandas y 10 porciones: ingrediente 8 kg, salida 10. Anular con motivo: ingrediente 10 kg, salida 0, historial conservado. Si se consumió salida y no alcanza para compensar, debe rechazar sin cambios.
7. Probar merma de una porción sin peso en QA: baja una porción y aparece actividad. No aceptar gramos para ese mismo producto sin equivalencia.
8. Probar mínimo cero sin existencias: acción de configuración, no compra inventada. Mínimo 5 kg con 2 kg: compra sugerida 3 kg. Repetir revisión tras actualizar briefing.
9. En Android comprobar cámara/galería/giro, selección de los cuatro CSV y nombres visibles; modo avión no informa guardado exitoso. Reconexión no reenvía automáticamente operaciones antiguas. No probar ajustes sobre existencias reales.

## Pendientes explícitos

- Importador Excel de múltiples formatos: diseño separado, aún no implementado. No requiere plantilla única ni convertir manualmente a CSV; revisar correspondencias cuando sea ambiguo.
- Tutoriales prácticos simulados: los actuales siguen siendo tarjetas descriptivas; falta ejercicio guiado sin escrituras reales.
- Resolver PKCE entre dispositivos con flujo adecuado y plantilla verificada; no considerar el mensaje amable una solución completa.
- Homogeneizar motor del briefing automático y manual. La función Edge actual sigue su lógica anterior; no declarar corregida la generación automática sin desplegarla y probar el ciclo real.
- Reparación supervisada de recetas históricas duplicadas y producciones antiguas ambiguas. El nuevo guardado evita nuevas duplicaciones, pero no decide qué borrar del pasado.
- Importación de inventario antigua aún necesita atomicidad, revalidación concurrente y mejor informe de errores al sumar duplicados. Resolverlo al extender el asistente multiformato; no usar importaciones repetidas para reparar stock.
- Modo offline completo y sincronización idempotente por tenant: no implementado. Revisar caso de cantidades canónicas frente a visuales y confirmar corrección con el dispositivo real.
- OCR manuscrito sigue limitado; no ejecutar ventas/mermas automáticamente a partir de texto no revisado.
