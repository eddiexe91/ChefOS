# Historial POS y memoria operacional

Implementación local revisada el 18-09-2026. Activación remota verificada el 23-09-2026: 013/014 aplicadas, RLS/RPC comprobadas, `historialPos.disponible=true`, sin importar ventas reales. La 015 configura autenticación privada de cron. Consultar [RELEASE_1.3.0.md](RELEASE_1.3.0.md) para pruebas y límites de las tareas programadas.

## Estado inicial y alcance

Base inspeccionada: ChefOS Next.js 14, React Query, TypeScript, Supabase/PostgreSQL, Auth/RLS y contenedor Android Capacitor. Se reutilizan `ventas_importaciones`, `ventas_items`, `usuarios`, `restaurantes`, `recetas`, `productos` y los generadores de Briefing existentes. No se sustituyen Inventario, Stock, producción, compras, mermas ni biblioteca culinaria.

El importador operativo existente recibía un CSV simple, aplicaba una fecha a todo el archivo y podía descontar inventario. No contenía tickets, pagos múltiples ni una identidad persistente de producto POS. El briefing visible consultaba mínimos y recetas, no un contexto histórico agregado. La arquitectura maestra contiene descripciones históricas que ya no reflejan las migraciones/rutas actuales; el código y los tests son la evidencia de esta entrega.

Esta implementación añade preparación histórica manual. No es un conector automático de Soft Restaurant ni Fudo, no ejecuta ventas reales y no demuestra que un forecast esté calibrado. Sigue el Norte: obtener información fiable antes de recomendar cantidades.

## Modelo

- `ventas_importaciones`: reutilizada. Añade modo histórico, zona horaria, manifiesto, resultado y estados preparando/validado/completado.
- `ventas_preparacion`: bloques normalizados por importación/tipo/secuencia. No visibles como ventas hasta confirmar.
- `productos_pos`: identidad `(restaurante_id, fuente, id_externo)`, nombre/categoría y atributos normalizados.
- `productos_pos_mapeos`: equivalencia explícita a receta o producto interno, pendiente o ignorada; actor y fecha. No cambia existencias.
- `ventas_tickets`: identidad externa, fecha/hora local, franja, total oficial, atributos de cabecera y huella de contenido.
- `ventas_items`: se amplía, no se duplica. Conserva línea transaccional, ticket, producto POS, identidad externa, franja y datos de origen normalizados.
- `ventas_pagos`: varias filas por ticket, importe y atributos del medio de pago.
- `ventas_resumen_productos`: día/producto/hora/franja, unidades e importe de línea estimado.
- `ventas_resumen_servicios`: día/hora/franja, totales oficiales, tickets, cubiertos, descuentos, cortesías y duración.

Los datos específicos del proveedor se traducen en `src/lib/ventas/softRestaurant.ts`; las tablas no usan nombres de peculiaridades de Soft Restaurant. Las relaciones compuestas de tickets y productos POS impiden referencias entre restaurantes. RLS y RPC verifican pertenencia. Crear/importar/mapear requiere Dueño, Administración o Chef Ejecutivo; el contexto agregado se puede leer como miembro del restaurante. No usar una service-role key en el navegador.

Las tablas nuevas no admiten escritura directa de clientes. Un trigger protege también las filas históricas de las tablas reutilizadas frente a escrituras REST autorizadas por políticas antiguas: solo los RPC controlados pueden publicar historial, manteniendo huellas y agregados consistentes.

## Flujo

1. Seleccionar los cuatro CSV del mismo restaurante/período y codificación.
2. Leer en bloques de 64 KiB, preservar registros entrecomillados/multilínea y enviar lotes de 250 registros.
3. El servidor normaliza y vuelve a validar. Cada bloque es idempotente por importación/tipo/secuencia; otro contenido en un reintento se rechaza.
4. El manifiesto exige los cuatro archivos completos, secuencias contiguas y conteos exactos.
5. Vista previa: registros, fechas, duplicados, existentes, errores, tickets sin detalle y productos sin catálogo/mapeo.
6. Confirmar publica todo mediante una transacción PostgreSQL y actualiza agregados. Si falla, no queda media importación publicada. La confirmación puede reintentarse si se pierde la respuesta.
7. Revisar equivalencias; el nombre exacto único es una propuesta que requiere confirmación, nunca fuzzy matching silencioso.

El cierre de la app pierde el ID de preparación de la interfaz en esta versión. Se puede iniciar otra preparación: las identidades externas impiden duplicar ventas ya confirmadas. Las preparaciones abandonadas se conservan para auditoría; no hay limpieza automática destructiva.

## Formato Soft Restaurant 8.1

Fuente: contrato proporcionado por el usuario, no una especificación del fabricante verificada externamente. Archivos: `productos.csv`, `tickets.csv`, `ventas_detalle.csv`, `pagos.csv`.

Columnas mínimas:

| Archivo | Campos obligatorios |
|---|---|
| productos | producto_id, producto |
| tickets | ticket_id, fecha, total_ticket |
| ventas_detalle | ticket_id, movimiento, producto_id, producto, fecha, cantidad, precio_unitario, importe_linea_estimado |
| pagos | ticket_id, forma_pago_id, importe |

Se reconocen los campos auxiliares suministrados: origen, folio, turno, comanda, categoría, clasificación, apertura/cierre, hora/franja, mesa, personas, mesero, servicio/área, duración, descuentos/cortesías, impuesto, cambios, comentario, nombre corto, precio de catálogo, bloqueo, propina y cambio. Día de semana y mes se derivan de la fecha validada. Los atributos sin valor no se inventan. Fechas admitidas AAAA-MM-DD o DD/MM/AAAA; horas HH:mm[:ss], también dentro de timestamps locales. No se interpretan timestamps con offset como si fueran locales.

Codificaciones seleccionables: UTF-8 y Windows-1252. Delimitador coma o punto y coma, comillas dobles escapadas y saltos dentro de campos. Decimales con punto o coma; los separadores de miles ambiguos se rechazan. No se completan importes obligatorios vacíos con cero. Cantidades negativas/cero, pagos negativos, estados no pagados/cancelados e indicadores desconocidos requieren corrección explícita. Un ticket gratuito con importe cero sí es válido.

Se conserva la fecha comercial y la hora local; la zona queda en la importación. No se inventa un instante UTC ni se resuelve automáticamente la ambigüedad de un cambio horario. No se infiere una franja si falta. Números de personas ausentes/cero no participan en venta por persona: el numerador usa solo tickets con personas positivas.

### Identidades y duplicados

- Ticket: restaurante + fuente + `ticket_id` completo. H-1 y A-1 son distintos, aunque tengan el mismo folio.
- Línea: ticket externo + movimiento. No usar nombre ni precio como identidad de una línea.
- Pago: ticket + método + importe + propina + cambio + número de ocurrencia del mismo contenido. Esto permite dos pagos idénticos legítimos sin colapsarlos.
- Producto: fuente + producto_id dentro del restaurante. No es un UUID interno.
- Una identidad existente con contenido diferente bloquea el paquete. No hay actualización destructiva automática de históricos. La huella sirve para detectar diferencias, no para autorizar usuarios.
- Productos no vigentes o sin catálogo se conservan desde la línea con su nombre histórico.
- Duplicados idénticos de tickets/líneas se omiten. Pagos idénticos se preservan por multiplicidad porque no hay ID de pago fiable en este contrato.

Una transición de un ticket A a uno H o un cambio de POS no se deduplica por folio: requiere un identificador de enlace verificado o períodos no solapados. Tampoco se deduplica automáticamente contra antiguos CSV simples sin identidad. No importar las mismas ventas por ambos flujos.

## Analítica y Briefing

La confirmación recalcula agregados del restaurante dentro de su transacción. Lecturas posteriores consultan agregados, no vuelven a enviar miles de ventas al navegador/IA. `metricas_historial` ofrece días, horas, días de semana, productos/categorías, franjas, semanas/meses, tickets, cubiertos, ticket promedio, venta por persona, duración, descuentos, cortesías y medios de pago. La API calcula también el período anterior de igual duración.

**Facturación = suma de cabeceras oficiales**, nunca suma ingenua de las líneas. Los importes por producto son estimados y no se denominan facturación oficial. Pagos y tickets se agregan por separado. `total_ventas_periodo` adapta Dashboard, chat y cierre a tickets oficiales más líneas operativas antiguas sin ticket; no mezclar el mismo origen por ambos flujos.

`contexto_ventas_briefing` entrega hasta ocho productos, últimos 56 días, días comparables, promedios observados, comparación de cuatro semanas contra cuatro anteriores, mapeos y limitaciones. Los dos generadores consumen este mismo contexto SQL. El generador visible muestra hasta tres observaciones verificables; si faltan días comparables o el último dato tiene más de siete días, avisa en lugar de recomendar cantidades. La confianza es no calibrada. El contexto no contiene filas crudas ni nombres de empleados.

Las reglas operativas previas de mínimos/lotes siguen existiendo y no se convierten en un forecast por disponer de histórico. Falta validar un motor único completo de necesidades, stock congelado/descongelando/disponible, rendimientos y decisiones del chef. Las existencias congeladas de la metodología del usuario no se confunden con ventas ya realizadas.

## Extender a otro POS

Implementar otro normalizador que produzca `FilaCanonica`, registrar su fuente del lado servidor y conservar las mismas funciones de preparación/validación/persistencia. Definir identidades, estados, fechas, monedas, unidades y reglas de reversión antes de aceptar archivos. Añadir fixtures, pruebas de importación repetida y cobertura de mapeo. No duplicar las tablas para Fudo ni convertir sus IDs en recetas automáticamente.

Afinidad entre productos puede consultarse por ticket_id; contribución por mapeo a receta/producto y versiones de costos. Modelos de demanda, estacionalidad, anomalías, aprendizaje recomendación→decisión→resultado y sincronización API son siguientes extensiones, no capacidades terminadas de esta entrega.

## Despliegue e instrucciones para primera importación

**Todavía no importar el historial real durante el desarrollo.** Las migraciones locales no están aplicadas por esta tarea en Supabase y el código local no aparece automáticamente en Vercel/APK.

Preparación técnica:

1. Probar en una base no productiva compatible con migraciones 001–012.
2. Aplicar `supabase/migrations/013_historial_pos.sql` y luego `014_analitica_historial.sql`, una vez cada una. Son aditivas; no borrar ni recrear tablas existentes. Gestionarlas con el historial de migraciones, no pegarlas reiteradamente.
3. Ejecutar `npm run test:historial`, `npm run test:historial-ui`, `npm run test:captura`, `npm run type-check`, `npm run lint`, `npm run build`.
4. Publicar el backend web y las Edge Functions actualizadas después del esquema, y verificar con un restaurante de pruebas. La APK apunta a un backend remoto: compilar una APK no publica ese backend. No se necesitan nuevos permisos nativos para este importador.

Cuando la versión esté desplegada y verificada, el usuario podrá:

1. Iniciar sesión en el restaurante correcto como Dueño, Administración o Chef Ejecutivo.
2. Ir a Configuración → Datos: importar historial POS (`/ventas/importar`).
3. Elegir Soft Restaurant 8.1 y la codificación correcta; adjuntar los cuatro CSV del mismo período.
4. Pulsar **Validar y ver vista previa**. Esperar los conteos por archivo.
5. Revisar fechas, cantidades, duplicados, productos pendientes y advertencias. Con errores no se puede confirmar. No modificar valores para forzar la validación: revisar el archivo de origen.
6. Pulsar **Confirmar importación histórica** una sola vez. Si se pierde la respuesta, reintentar es seguro con la misma importación.
7. Abrir **Revisar equivalencias de productos POS**. Confirmar el destino correcto, dejar pendiente o ignorar para recomendaciones.
8. Abrir **Consultar memoria de ventas**, seleccionar fechas y comparar contra las cabeceras del reporte original.
9. Volver a Inicio y actualizar Briefing. Si el historial no cubre fechas recientes, aparecerá una advertencia, no una previsión inventada.

## Límites pendientes de validación

- No se importó ningún dato real, ni se verificó producción o Android con estos cambios.
- Límite explícito de 100 MB por archivo. Lectura por bloques y hasta 250 registros por petición; el mapa de multiplicidad de pagos mantiene claves en memoria.
- Máximo de 1100 días por consulta analítica y 1000 productos en el ranking de esa consulta. No es un paginado de todas las ventas.
- El commit final recalcula los resúmenes del restaurante. Medir en Supabase con volúmenes representativos antes de prometer cientos de miles de registros dentro del tiempo de Vercel; un timeout requiere consultar/reintentar, no asumir fallo ni éxito.
- Falta UI de corrección de conflictos históricos y conciliación de devoluciones/anulaciones; se bloquean, no se silencian.
- El catálogo conserva la primera identidad/nombre importados; cada línea preserva su nombre histórico. No sobrescribir automáticamente catálogo ni mapeos al reimportar.
- El calendario de días abiertos y cobertura real no se conoce: ausencia de ventas no equivale a cero demanda.
- El código de otras Edge Functions sigue necesitando pruebas de despliegue Deno; el build Next no las certifica.
- No se almacenan archivos reales/secretos en el repositorio. Los CSV de prueba están embebidos como strings sintéticos en `scripts/test-historial.cjs`.

## Inventario de cambios

Creados:

- `src/lib/ventas/softRestaurant.ts`: contrato, validaciones, normalizador y lectura incremental.
- `src/lib/ventas/contextoBriefing.ts`: observaciones históricas, cobertura y tendencias explicables.
- `src/app/api/ventas/historial/route.ts`: preparación/validación/confirmación/mapeos.
- `src/app/api/ventas/analitica/route.ts`: períodos y comparación.
- `src/components/ventas/HistorialPOSCliente.tsx`: cuatro archivos, progreso, muestras, advertencias y confirmación.
- `src/app/(autenticado)/ventas/mapeos/page.tsx` y `ventas/analitica/page.tsx`: revisión y consulta.
- `supabase/migrations/013_historial_pos.sql` y `014_analitica_historial.sql`.
- `scripts/test-historial.cjs` y este documento.
- `scripts/test-historial-ui.cjs`: contratos HTTP y estructura SSR sin red.

Modificados:

- `src/app/(autenticado)/ventas/importar/page.tsx`, `configuracion/page.tsx` y `src/middleware.ts`: acceso al flujo y permiso Chef Ejecutivo limitado a las nuevas pantallas.
- `src/components/ventas/VentasCliente.tsx`, `src/app/(autenticado)/ventas/[id]/page.tsx`, las rutas de detalle/confirmación de importaciones y edición de items: separan historial de la revisión operativa; bloquean descuento y edición por línea histórica desde el flujo antiguo.
- `src/app/api/ia/briefing/route.ts`, `src/components/dashboard/BriefingCard.tsx`, `src/types/index.ts`: contexto agregado y observaciones con confianza no calibrada.
- `src/lib/queries/index.ts`, `src/app/api/ia/chat/route.ts`: totales oficiales y delimitación del restaurante activo.
- `supabase/functions/generar-briefing/index.ts`, `cierre-diario/index.ts`: consumo agregado, sin historial bruto de ventas en contexto IA.
- `package.json`, `package-lock.json`: comandos de prueba y PGlite solo de desarrollo.
- `GITHUB_HANDOFF.md`: estado local y requisitos de despliegue.

El archivo `AUDITORIA_NORTE_2026-09-17.md` ya existía antes de esta implementación y se conserva.

## Evidencia local

- Parser: los cuatro CSV sintéticos, identidad H/A con folio coincidente, fecha bisiesta, negativos, descuentos fuera de rango, cortesía gratuita, producto no vigente, UTF-8 inválido, Windows-1252 y 5.000 registros multilínea atravesando bloques.
- PostgreSQL/PGlite: esquema base real (sin extensiones de búsqueda), helpers de autorización reales y migraciones 013/014 completas. Verificados pagos múltiples, reintentos, reimportación sin duplicados, conflictos bloqueados, archivos parciales, equivalencias y rechazo de receta ajena, aislamiento RLS/RPC, acceso anónimo rechazado, protección de historial frente a descuento y cero movimientos de inventario.
- Volumen: **50.000 líneas, 5.000 tickets y 5.000 pagos sintéticos**. Preparación, validación y confirmación: **20,6 s**; validación **1,115 s**; confirmación **6,222 s** en esta máquina con PGlite. No es una medición de Supabase/Vercel ni garantiza latencias de producción.
- La primera prueba reveló planes de consulta deficientes sin estadísticas del primer paquete. La validación actual actualiza estadísticas de preparación antes de evaluar relaciones; la prueba de 10.000 líneas pasó de 20,7 s a 4,0 s en este entorno.
- Verificación final local: `test:historial`, `test:historial-ui`, `test:captura` (17 casos), type-check y build Next completados correctamente; lint sin errores, con una advertencia preexistente de dependencia `guardarAvance` en onboarding. Build genera 54 páginas y advierte sobre Supabase en Edge Runtime y caché de webpack. Diff revisado; `git diff --check` sin errores. Volver a ejecutar los comandos al desplegar.
- Probado rollback real al fallar una línea después de insertar su cabecera: no persiste el ticket. Probado rechazo de cambios/borrado REST sobre historia incluso simulando una política heredada permisiva; los RPC de importación siguen funcionando.
- No se ejecutó una prueba con sesión real en Android ni se validó el despliegue Deno. No afirmar una entrega productiva completa con estas evidencias locales.
- `npm run test:historial-ui`: validación de cuatro archivos, ausencia de confirmación antes de validar, campos que reutilizan contraste/tamaño del sistema de diseño, rechazo HTTP sin sesión y normalización sin aceptar tenant del cliente. Es una prueba estructural SSR, no una captura visual ni un test Android.

La guía de CSV/Spreadsheets se utilizó para distinguir vacíos de ceros, preservar granularidad/identidades y verificar totales con fuentes independientes. No se creó ni modificó un libro de cálculo del restaurante.
