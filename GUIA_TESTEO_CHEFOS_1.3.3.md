# ChefOS 1.3.3 — guía de pruebas

QA significa **pruebas de calidad**. Los nombres QA identifican productos ficticios, no un requisito de tu cocina. Marca cada bloque PASA / FALLA / NO PROBADO; si falla, anota pantalla, hora, mensaje, cantidad anterior y cantidad posterior. Una compilación no certifica tu teléfono.

## 0. Preparación sin borrar nada

1. Instala la APK como actualización. No desinstales, borres almacenamiento ni elimines la cuenta.
2. Comprueba Android → Aplicaciones → ChefOS: **1.3.3**. Menú de usuario → Estado del sistema: backend **1.3.3**. Abre la guía nueva desde allí.
3. Confirma nombre del restaurante y cargo antes de escribir. Haz producciones, compras, ventas operativas, mermas y ajustes ficticios **solo en QA Restaurante**. En Cocina Puerto puedes consultar y revisar vistas previas; incorporar historial real es tu decisión.
4. Conserva copias originales de tus archivos. Si una operación queda cargando o pierde conexión, consulta existencias y movimientos antes de repetirla.
5. Se reutilizan los ocho archivos ficticios de 1.3.2, con nombres **QA 132**. Configuración → Archivos ficticios y guía de pruebas → Guardar. Si ya los importaste, usa **Omitir duplicados**, nunca Sumar para restaurar una prueba.

No necesitas comenzar de cero. Los apartados nuevos de abajo usan productos **QA 133** independientes para no confundir las producciones del test anterior.

## 1. Navegación, perfil y conservación del paso

1. Recorre Inicio, Recetas, Carta, Producción, Inventario, Alertas y Stock disponible.
2. Abre un formulario, usa Atrás del teléfono; prueba segundo plano y regreso.
3. Mi perfil → cambia solo nombre → Guarda → sal/reabre. Nombre y cabecera deben persistir.
4. Configuración inicial → avanza a **Recetas y Carta** → abre Inventario desde ese paso → vuelve inmediatamente con Atrás.
5. Debe volver a **Recetas y Carta**, no al primer paso. Repite desde Producción y desde el menú del usuario. La memoria local del paso está separada por cuenta y restaurante; el guardado servidor requiere internet.
6. Finaliza. Si faltan materias primas o stock, debe pedir confirmación de configuración incompleta. El rol no se puede autoasignar aquí.
7. Mis restaurantes muestra información; no cambia la cuenta activa. Tutoriales conserva sus accesos, pero **todavía no es un entrenamiento interactivo**.

Pendiente para una versión futura: bienvenida después de confirmar correo, Crear restaurante / Unirme y definición explícita de propietario/administrador. No se cambió el registro en este parche.

## 2. Descargas e importación duplicada visible

1. Descarga una plantilla CSV y los archivos ficticios. Debe abrirse el guardado Android; cancelar no escribe datos.
2. En QA, si no habías importado los archivos QA 132, importa una vez `inventario.csv` y `stock.csv`. Comprueba los valores del archivo.
3. Selecciona otra vez `inventario.csv` e importa. La elección de duplicados debe abrirse en una **ventana visible**, sin buscar al final de la página.
4. Pulsa **Omitir duplicados**: cantidades intactas. Cancelar deja intactos los datos de esa nueva tentativa.
5. Prueba Sumar solamente con una fila ficticia de existencia conocida y una sola vez. `inventario-sumar.csv` agrega 2 kg de QA 132 Azucar; anota antes y después.

El importador de Inventario sigue requiriendo columnas compatibles con su plantilla; Excel de formatos arbitrarios aún no está implementado. No se fusionan automáticamente nombres parecidos.

## 3. Inventario y Stock disponible: regresión

En QA crea:

| Producto | Pantalla | Unidad | Cantidad | Mínimo | Costo por unidad |
|---|---|---|---:|---:|---:|
| QA 133 Harina | Inventario | kg | 10 | 0 | 1000 |
| QA 133 Bisque | Stock disponible | porcion | 10 | 0 | 200 |

1. Busca por nombre, filtra categoría y crítico. Comprueba Granos y Caldos y Bases.
2. Edita solo categoría/nombre, guarda y reabre: la cantidad no cambia. Conserva estos nombres para continuar.
3. En una ficha ficticia separada prueba Unidad/Docena sin peso, Caja/Bandeja con contenido opcional y Porción con peso opcional.
4. Crea QA 133 Archivar y archívalo. Debe desaparecer de activos y conservar su actividad histórica.
5. Con otras fichas ficticias prueba mover una y varias a Stock disponible. Esto **reclasifica la ficha completa**; no convierte piezas en porciones. Esa transformación corresponde a Producción.

## 4. Receta compacta y escalar la receta

1. Recetas → Añadir → **QA 133 Base**, rendimiento 2 porciones, Es producción sí, En Carta no.
2. Agregar ingrediente → busca Harina → 1 kg → Listo. Agrega Bisque → 1 porción → Listo. Unidades por defecto de sus fichas; porciones sin peso son válidas al usarlas como porciones.
3. Deben quedar dos líneas compactas. Agrega un paso y su descripción ficticia.
4. Salida al Stock disponible → Crear aquí → **QA 133 Base lista**, 2 porciones por receta. Guarda: su ficha debe existir con **0**, no con 2.
5. Reabre, agrega un segundo paso, guarda dos ediciones sucesivas. Deben seguir 2 ingredientes y 2 pasos, no duplicados.
6. **Escalar receta → x2**: ingredientes 2 kg Harina y 2 porciones Bisque; rendimiento resultante 4 porciones. x0,5: 0,5 kg, 0,5 porción, rendimiento 1. Es una consulta: no modifica receta original ni existencias.
7. Prueba negativa: cambia Bisque a gramos sin equivalencia de peso. Debe rechazar el guardado, conservar el formulario y dejar íntegra la versión guardada. Corrige a porción.

## 5. Carta

1. Agrega **QA 133 Plato**, rendimiento 1 plato, Harina 0,1 kg y Bisque 1 porción. Incluye paso y descripción; tiempo/dificultad opcionales.
2. En Carta sí, Es producción no. Guarda, edita un paso y reabre: sin duplicados ni descuentos.
3. En otra ficha de prueba desactiva En Carta o archiva. Archivar conserva historia; no borra transacciones antiguas.

Un plato montado al recibir el pedido no crea existencias al guardar su receta. Una preparación producida requiere un producto de salida.

## 6. Producción, costos y compensación

**Estas acciones cambian stock.** Antes: Harina 10 kg, Bisque 10 porciones, Base lista 0.

1. Producción → Añadir → QA 133 Base → **1 tanda**. Salida prevista 2; cantidad realmente obtenida **7**. Confirma una vez.
2. Esperado: Harina 9, Bisque 9, Base lista 7. **Costo total del registro: 1200. Costo por porción: 1200 ÷ 7 = 171,43.** Son dos valores distintos y correctos.
3. Abre lote: debe mostrar costo total, responsable, tanda y salida. No queda esperando finalización.
4. Corregir → **2 tandas y salida total 10**, motivo QA. Esperado: Harina 8, Bisque 8, Base lista 10; **total 2400, por porción 240**.
5. Anular y compensar, motivo QA: Harina 10, Bisque 10, Base lista 0; registro histórico anulado, no eliminado.
6. Registra 1 tanda con salida 2: Harina 9, Bisque 9, Base lista 2; **total 1200, por porción 600**.

No anules producciones reales ni registros antiguos ambiguos. Si ya consumiste la salida y no alcanza para compensar, debe rechazarse sin tocar ingredientes. Con salida previa existente, el costo de su ficha puede ser promedio ponderado, no necesariamente el costo del último lote.

## 7. Mermas: formulario directo y voz

1. Captura rápida: voz o fotografía. Sin pulsar Revisar comando deben verse producto, cantidad, unidad, motivo y notas.
2. Selecciona Base lista, 1 porción, Otro, nota QA. Confirma una vez: queda 1; movimiento y Actividad reciente.
3. Dicta o escribe **“registra una porción de QA 133 Base lista como merma”**, sin necesidad de decir ChefOS. Revisa el comando y comprueba nombre, cantidad, unidad, motivo y notas.
4. Cancela: queda 1. Repite/revisa/confirma: queda 0 con actividad.

La voz prepara propuestas de merma, no controla todavía todas las funciones. Una transcripción dudosa requiere corrección/selección, nunca confirmación ciega.

## 8. Compras y alertas con historial

1. Compras → Nueva → Crear proveedor QA 133 Proveedor. Busca Harina, 1 kg a 1000 → Guarda y recibe una vez. Pasa de 9 a 10 kg.
2. Reabre: recibido, sin segundo aumento.
3. Crea QA 133 Compra, 2 kg, mínimo 5. Inicio → Actualizar briefing: propone **3 kg**. Abre Alertas y pulsa Actualizar; sin hacerlo, permite hasta 15 segundos de refresco.
4. Marca la alerta → desaparece de **Sin leer**, pero debe estar en **Leídas** y **Todas**, con fecha/mensaje histórico. Sal y vuelve.
5. Sube existencia a 5. Briefing actualizado ya no propone compra. La alerta leída conserva lo que ocurrió antes; no dice que siga faltando ahora.
6. Baja nuevamente a 2: debe generarse un **nuevo evento** sin borrar el anterior. Un cambio mientras continúa bajo mínimo no necesariamente genera otro evento idéntico.

## 9. Briefing: mínimos y riesgos actuales

1. Crea QA 133 Sin mínimo, 0 g, mínimo 0 → Actualizar: pide revisar conteo/unidad/mínimo; no inventa compra de 1 g.
2. En **la ficha de QA 133 Base lista**, guarda mínimo **2 porciones**. Reabre y comprueba que de verdad quedó 2; ahora está en 0.
3. Actualiza: debe sugerir **1 tanda** de QA 133 Base y explicar faltante de 2 y salida por receta. No es una previsión de demanda.
4. Produce 1 tanda, salida real 2 → Actualizar: deben desaparecer el faltante y el riesgo de stock actual de Base lista, **sin tener que marcar su alerta antigua como leída**.
5. La antigua alerta con stock 0 sigue en Alertas como historia. No debe reaparecer como existencia actual en Riesgos del turno.
6. Para un faltante de Carta, en una ficha QA deja un ingrediente insuficiente para 1 plato. Inicio debe identificar plato e ingrediente. Reponlo y actualiza: el aviso cambia.
7. “Acción recomendada” es texto explicativo, no un botón. Las sugerencias no garantizan cobertura de todo el servicio.
8. Un fallo de memoria histórica debe advertirse sin impedir el análisis operativo disponible. Chef IA sigue básico; compara sus datos contra módulos.
9. En otra jornada, observa Briefing **antes** de actualizarlo para evaluar el cron automático. Ahora comparte reglas con el manual; los horarios existentes siguen en GMT y una prueba manual no demuestra que ejecutó el ciclo real.

## 10. Ventas del servicio: acceso y no repetición

**Solo QA: confirmar consumo descuenta ingredientes.**

1. Menú → Ventas e importaciones. El CSV simple debe estar **en esa pantalla**, separado del acceso a historial.
2. Para `ventas-operativas.csv` se necesita la ficha **QA 132 Plato** usada en la guía anterior. Si ya existe, úsala; si no, créala con QA 132 Harina 0,1 kg y QA 132 Bisque 1 porción. No reemplaces sus ingredientes por los QA 133.
3. Anota existencias, procesa el archivo y abre el botón directo Revisar esta venta. Confirma equivalencia exacta y consumo una sola vez.
4. Debe restar 0,1 kg de QA 132 Harina y 1 porción de QA 132 Bisque, independientemente de sus cantidades actuales.
5. Reabre: muestra consumo confirmado, no un botón activo que anuncia un nuevo descuento. No cambia stock otra vez ni permite modificar la equivalencia de una línea ya consumida.

Este CSV es otra venta ficticia del servicio. No lo uses para importar las ventas históricas ni dupliques una comanda real entre OCR y este flujo.

## 11. Historial ficticio y equivalencias sin revisar cientos de filas

El historial es **memoria**, no una comanda de hoy. Sirve para observar demanda por plato/fecha; las equivalencias conectan esas ventas con recetas/stock actuales. No necesitas mapear bebidas, productos antiguos ni todo el catálogo para comenzar.

1. Datos: importar historial POS → selecciona los cuatro CSV ficticios de `historial`, UTF-8. Cada nombre debe verse. Valida; revisa período 2026-09-01 a 2026-09-02, 2 tickets, 2 líneas, 3 pagos, 1 producto del catálogo y 1 histórico sin catálogo.
2. Si ya importaste ese paquete, reimportarlo debe dar **0 líneas/tickets/pagos nuevos**; no borres lo anterior. Si es primera vez, confirma una sola vez y espera avance por catálogo, tickets, líneas, pagos y resúmenes.
3. Durante incorporación las nuevas ventas no aparecen parcialmente en consultas. Si se interrumpe, **Paquetes ya preparados → Incorporación pendiente → Continuar incorporación**. No vuelve a necesitar archivos.
4. Memoria de ventas → fechas indicadas: en un QA que solo tenga este histórico, total oficial **12000**, 2 tickets, 3 unidades, 3 cubiertos, promedio6000. Si tienes otros paquetes en esas fechas, contrasta el total acumulado; no esperes que ChefOS los borre.
5. Inventario y Stock mantienen las tres cantidades que anotaste. El total de líneas estimado13000 no reemplaza el oficial12000.
6. Equivalencias POS → **Pendientes** → busca QA132Plato → Seleccionar equivalencia. Busca por nombre y usa grupo Carta; confirma solo la ficha correcta.
7. Confirmado sale de Pendientes y sigue en Confirmados/Todos. Ignora el histórico ficticio desconocido: sale de Pendientes y queda en Ignorados. Dejar pendiente lo devuelve; cada operación informa resultado.
8. Una coincidencia exacta puede proponerse, pero requiere tu confirmación. No se aceptan automáticamente nombres parecidos. Empieza por 5–10 platos actuales útiles, no por cientos de productos del histórico.

Con dos tickets no hay base para pronosticar. “Última venta antigua; no usar como previsión actual” es una advertencia correcta. Ventas hoy muestra ventas operativas de hoy; no traslada ventas antiguas al día actual.

## 12. Recuperar el paquete real grande — cuando tú decidas

1. Cambia a tu cuenta/restaurante real y comprueba su nombre. No importes archivos QA aquí.
2. Historial POS → Paquetes ya preparados. Recupera el paquete grande pendiente. Un paquete **Ya importado** solo muestra resultado; no necesita confirmarse otra vez.
3. Si ya está validado, revisa resumen. Si no, continúa la validación guardada. Sin manifiesto, pide los **mismos** cuatro archivos/codificación para comprobar bloques previamente cargados.
4. Si eliges incorporarlo, pulsa Confirmar una vez. Mantén la app abierta, con internet y batería; ahora hay peticiones cortas y progreso persistente. Pueden tardar varios minutos en conjunto.
5. Tras una interrupción, recupera y **Continúa incorporación**; las consultas solo incluirán sus ventas nuevas al finalizar. No acumules paquetes nuevos para reintentar.
6. Si vuelve a fallar, guarda mensaje, fase e ID y repórtalo. Un conflicto de identidad/contenido requiere revisión; no cambies identificadores ni borres paquetes para forzar el ingreso.
7. Al finalizar, contrasta totales oficiales, período y tres existencias intactas. Relaciona primero platos vigentes. IDs A- y H- no se unifican automáticamente entre sí.

La prueba local de volumen no certifica tiempos del servidor ni tu paquete real. El histórico antiguo sigue siendo útil para patrones/estacionalidad, pero no es demanda actual garantizada. No se han calibrado descongelación, sobreproducción o aprendizaje de decisiones.

## 13. Copia de existencias — explicación y prueba

**Snapshot** significa guardar en la base una copia de lo que ChefOS tiene **ahora** en Inventario y Stock. No lee un archivo, no usa cámara y no cuenta físicamente tu bodega.

1. Anota Harina, Bisque y Base lista. Analítica y snapshots → **Guardar copia de hoy**, con rol autorizado.
2. Esperado: mensaje de copia guardada sin error RLS; fecha local del restaurante y productos visibles en Copias recientes. Existencias originales intactas.
3. Con Harina10kg, su cantidad base guardada es10000; con Bisque9porciones sin peso, su base es9. La palabra base no siempre significa gramos.
4. Ajusta un producto QA, guarda otra copia hoy: reemplaza la copia manual de hoy por el nuevo conteo. No suma cantidades ni modifica stock por sí misma.
5. Desde/Hasta se usa para **análisis de consumo**, no para elegir la fecha de la copia. Una sola copia no permite saber cuánto consumiste físicamente entre dos fechas. Los análisis antiguos no equivalen a un pronóstico POS; no des por certificadas sus desviaciones sin datos comparables.

## 14. Foto, cámara y OCR

1. Captura rápida → Leer comanda o factura → Tomar foto ahora; prueba también elegir una guardada.
2. Usa texto **impreso** nítido ficticio, gira si hace falta y pulsa Leer foto orientada. Compara y corrige texto.
3. Extraer borrador no registra ventas. Revisa cantidades/precios; no confirmes una venta ya probada por CSV.
4. Manuscrito es una evaluación, no reconocimiento garantizado. OCR significa convertir una imagen en texto editable. No debe descontar stock sin revisión/confirmación.

## 15. Equipo, correo y conexión

1. Cuando tengas otra cuenta/dispositivo, prueba clave de equipo de un uso, rol asignado, permiso de Cocinero y sincronización de un dato QA. No explores otros restaurantes si detectas una fuga.
2. Registro/correo no debe redirigir a localhost. La solución completa de confirmación PKCE entre dispositivos sigue pendiente; poder entrar después no demuestra que esa confirmación esté corregida.
3. Al final, con un producto QA, activa modo avión e intenta guardar: no debe prometer éxito sin servidor. Cambia de pantalla, recupera internet y prueba reconectar.
4. Antes de repetir un envío incierto consulta stock, movimiento, actividad y alerta. Ningún pendiente antiguo se debe reenviar automáticamente. Modo offline completo sigue pendiente.

## Resultado que debes enviarme

Versión Android/backend, bloques PASA/FALLA/NO PROBADO y capturas de fallos con hora/ID/fase. Prioridad: conservar paso, modal de duplicados, costos diferenciados, alertas leídas, riesgo de stock actualizado, snapshot, importación grande reanudable y equivalencias buscables. No declarar 100% por un solo recorrido feliz.
