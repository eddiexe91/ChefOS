# ChefOS 1.3.2 — guía de testeo paso a paso

Esta guía permite comprobar las funciones actuales; no declara que todas hayan pasado en tu teléfono. Anota **PASA / FALLA / NO PROBADO**, hora, mensaje y cantidades antes/después. Si falla un guardado, consulta el resultado antes de repetir: un error de conexión no demuestra que el servidor no guardó.

**QA significa pruebas de calidad.** Los nombres `QA 132 …` identifican datos ficticios exclusivos de esta guía. Una **tanda** es una ejecución completa de la receta. Una **vista previa** permite revisar datos; no equivale a una importación confirmada. El **backend** es la parte de ChefOS que funciona en el servidor.

## 0. Preparar sin borrar datos

1. Instala la APK como actualización. No desinstales, borres almacenamiento ni elimines tu cuenta o inventario.
2. Con internet, comprueba Android → Aplicaciones → ChefOS: **1.3.2**. Dentro de ChefOS, menú del usuario → Estado del sistema: backend **1.3.2**.
3. Para cualquier alta, importación ficticia, producción, compra, merma o anulación, usa un **restaurante de pruebas** y comprueba su nombre en la cabecera. Para revisar información puedes usar el real. Mis restaurantes sigue siendo una consulta, no un selector para cambiar de cuenta.
   Para el recorrido completo usa Dueño o Administración en QA: el importador operativo simple aún está restringido a esos roles. Chef Ejecutivo sí puede configurar e importar historial POS; comprueba ese permiso por separado. No cambies tu cargo real para hacer pruebas.
4. Conserva originales de tus archivos reales. Si no tienes restaurante de pruebas, limita el recorrido a lecturas/descargas/vistas previas hasta prepararlo con una cuenta separada.
5. Prueba Inicio, Recetas, Carta, Producción, Inventario, Alertas; entra también a Stock disponible desde el menú. Abre un formulario, pulsa Atrás del teléfono y prueba segundo plano.

Esperado: sesión correcta, navegación estable, texto legible y botones alcanzables. La disponibilidad en Estado del sistema no demuestra que todos los guardados funcionen.

## 1. Perfil y configuración — corrección prioritaria

1. Mi perfil → cambia únicamente tu nombre → Guardar cambios.
2. Sal, vuelve a abrir Perfil y después cierra/reabre la app. Debe conservarlo; la cabecera debe actualizarse.
3. Con rol Dueño, Administración o Chef Ejecutivo, entra a Configuración inicial. Avanza, visita Inventario y regresa; debe conservar el avance.
4. Finaliza. Si falta Inventario o Stock, debe pedir confirmación de datos incompletos, no fingir que ya existen.
5. El cargo ahora es informativo: **no se cambia desde esta pantalla**. Un Cocinero puede consultar, pero no guardar la configuración. No existe una contraseña compartida para autoasignarse Dueño.
6. Mis restaurantes debe mostrar información. Tutoriales debe abrir sus ayudas.

Pendiente: tutoriales interactivos con operaciones ficticias guiadas. Las tarjetas actuales no equivalen a ese entrenamiento.

## 2. Descargar los archivos incluidos

1. Menú del usuario → Configuración → **Archivos ficticios y guía de pruebas 1.3.2**.
2. Pulsa Guardar en cada archivo. Android debe abrir el selector para elegir destino; elige Descargas y confirma. Cancelar debe informar cancelación, sin tocar datos.
3. Guarda los cuatro históricos en una carpeta distinta para reconocerlos. No los mezcles con archivos reales.
4. En Configuración inicial prueba también **Descargar plantilla CSV**. Debe ser un botón y abrir el mismo guardado.

Archivos ficticios incluidos:

| Archivo | Uso | Efecto al importarlo |
|---|---|---|
| inventario.csv | Harina 10 kg y Azúcar 3 kg | Agrega existencias ficticias |
| inventario-sumar.csv | Azúcar +2 kg | Suma solo si eliges Sumar |
| stock.csv | Bisque 10 porciones | Agrega stock elaborado ficticio |
| ventas-operativas.csv | Una venta de QA 132 Plato | Descuenta ingredientes al confirmar consumo |
| historial/productos.csv | Catálogo POS ficticio | Memoria histórica, sin consumo |
| historial/tickets.csv | Dos cuentas ficticias | Memoria histórica, sin consumo |
| historial/ventas_detalle.csv | Dos líneas ficticias | Memoria histórica, sin consumo |
| historial/pagos.csv | Tres pagos ficticios | Memoria histórica, sin consumo |

POS significa sistema de punto de venta, como Soft Restaurant o Fudo. Los archivos se encuentran también en [public/qa/1.3.2](public/qa/1.3.2). No necesitas confeccionarlos ni convertir tu Excel para estas pruebas.

## 3. Importación de inventario y duplicados

Solo en el restaurante de pruebas y sin datos `QA 132` anteriores:

1. Configuración inicial → Inventario → selecciona `inventario.csv` e importa.
2. Comprueba **QA 132 Harina: 10 kg, mínimo 0, costo 1000** y **QA 132 Azucar: 3 kg, mínimo 0, costo 800**.
3. Repite el mismo archivo y elige **Omitir** duplicados: deben seguir 10 y 3 kg.
4. Importa `inventario-sumar.csv` y elige **Sumar**: Azúcar debe terminar en 5 kg. Hazlo una sola vez.
5. Abre cada ficha, cambia solo categoría o nombre y guarda; no debe cambiar la cantidad. Deja los nombres originales de Harina y Bisque para los siguientes pasos.
6. Busca, filtra por categoría y verifica Granos/Caldos y Bases.
7. En una ficha separada comprueba: Unidad/Docena sin peso; Caja/Bandeja con contenido opcional; Porción con peso opcional. No cambies unidades de los ingredientes del ensayo principal.
8. Crea y archiva `QA 132 Archivar`; comprueba actividad y desaparición de activos. Archivar conserva historia; no borra movimientos.

Límite: la importación de inventario es el flujo antiguo; sigue pendiente el endurecimiento transaccional ante concurrencia. Excel multiformato con detección y mapeo de columnas aún no está implementado.

## 4. Stock disponible

1. Configuración inicial → Stock disponible → importa `stock.csv`.
2. Comprueba **QA 132 Bisque: 10 porciones, costo 200, sin peso por porción**. Omitir al repetir debe conservar 10.
3. Busca, filtra y edita una categoría. Sal/reentra y verifica persistencia.
4. Con otros productos ficticios independientes, prueba mover uno y luego varios desde Inventario.

Mover reclasifica toda la ficha, no transforma cantidades. Transformar 2 piezas en 7 porciones se registra mediante Producción con receta y salida, no con Mover.

## 5. Recetas: regresión del guardado y las unidades

1. Recetas debe abrir una lista. Añadir receta → **QA 132 Base**.
2. Rendimiento 2, unidad porcion. Activa Es producción; deja En Carta desactivado.
3. Agregar ingrediente → busca **QA 132 Harina**. Debe seleccionar kg por defecto. Cantidad 1 → Listo.
4. Agrega **QA 132 Bisque**, cantidad 1 porcion. No debe exigir peso si se usa en porciones.
5. Deben verse dos líneas compactas. Toca una para editar. Agrega un paso ficticio con título y descripción.
6. Salida a Stock disponible → Crear aquí un nuevo producto elaborado → **QA 132 Base lista**, cantidad por receta 2, unidad porcion.
7. Guarda. Stock debe mostrar Base lista con **0**, no con 2: crear una ficha no fabrica existencias.
8. Reabre, agrega un segundo paso y guarda. Repite otra edición pequeña. Deben seguir exactamente dos ingredientes y dos pasos, sin multiplicarse.
9. Escala a doble rendimiento sin registrar producción: necesidades dobles, existencias intactas.
10. Prueba negativa: intenta usar Bisque en gramos sin equivalencia. Debe rechazar y conservar el formulario; corrige a porcion. Al reabrir, la receta anterior debe permanecer íntegra.

## 6. Carta

1. Carta → Agregar plato → **QA 132 Plato**, rendimiento 1 plato.
2. Agrega Harina 0.1 kg y Bisque 1 porcion. Añade título y descripción de elaboración.
3. En Carta activado; Es producción desactivado. Guarda y comprueba su lista/ficha.
4. Edita un paso, guarda y vuelve: sin duplicados ni cambios de existencias.
5. Prueba desactivar En Carta/archivar en otra ficha ficticia, no en QA 132 Plato que se usará después.

El plato de montaje no produce stock automáticamente. El rendimiento, tiempo y dificultad de su ficha describen elaboración; una receta de producción necesita además producto de salida.

## 7. Producción terminada

Antes: Harina 10 kg, Bisque 10 porciones, Base lista 0.

1. Producción → Añadir → QA 132 Base.
2. **Cantidad de recetas producidas (tandas): 1**. No escribas gramos en ese campo.
3. La salida prevista debe ser 2 porciones. Escribe **7** en cantidad realmente obtenida para probar un rendimiento diferente.
4. Registra producción terminada y confirma una vez.
5. Esperado: Harina **9 kg**, Bisque **9 porciones**, Base lista **7 porciones**, costo **1200**.
6. Reabre el registro: responsable, tanda, salida real y costo correctos; no debe quedar pendiente de finalizar.

## 8. Corregir y anular — cambia stock

Solo con el ensayo anterior y antes de consumir su salida:

1. Abre el lote → Corregir/anular registro.
2. Totales correctos: **2 tandas y salida 10**, motivo Corrección QA. Son totales, no incrementos.
3. Esperado: Harina 8, Bisque 8, Base lista 10, costo 2400.
4. Anula con motivo Anulación QA. Esperado: Harina 10, Bisque 10, Base lista 0; el registro permanece anulado.
5. Registra ahora una tanda normal con salida 2 para continuar: Harina 9, Bisque 9, Base lista 2.

No uses producciones antiguas ambiguas para probar compensaciones. Si falta salida para revertir, debe rechazarse sin cambiar ingredientes.

## 9. Mermas escritas y dictadas

1. Captura rápida: voz o fotografía → escribe `ChefOS registra una porción de QA 132 Base lista como merma`.
2. Revisar comando → comprueba producto/cantidad/unidad. Ahora deben aparecer **Motivo** y **Notas**. Elige Otro y escribe Prueba escrita QA.
3. Confirma una vez: Base lista queda en 1; debe haber movimiento y Actividad reciente.
4. Dicta la misma frase, revisa y cancela: debe seguir en 1.
5. Repite, comprueba la coincidencia exacta, elige motivo/notas y confirma: Base lista queda en 0, con actividad.

La voz prepara mermas con frases limitadas; no controla aún todas las funciones. Si el número 132 se transcribe distinto, corrige el texto o selecciona el producto. Nunca confirmes una coincidencia dudosa.

## 10. Compras y alertas antiguas

1. Compras → Nueva → Crear proveedor → **QA 132 Proveedor**.
2. Busca Harina, cantidad 1 kg, precio 1000. Guarda y recibe una vez: Harina pasa de 9 a 10 kg.
3. Reabre: recibido, sin permitir un segundo aumento.
4. En Alertas marca una alerta antigua sin leer; sal/reentra. Debe conservar la lectura, también si es anterior a esta versión. Marcar leída no cambia stock.
5. Crea otro producto ficticio con mínimo 5 kg y existencia 2 kg. Actualiza Briefing: debe proponer reponer 3 kg.
6. Marca su alerta, sal/reentra. La misma alerta debe permanecer leída. Una nueva modificación puede crear otra si continúa el faltante.
7. Sube la existencia a 5 kg y actualiza: deja de sugerir la compra por mínimo.

## 11. Fotos y OCR

OCR significa convertir texto de una imagen en texto editable. No es una lectura infalible ni una importación automática.

1. Captura rápida → Leer comanda o factura → Tomar foto ahora. Prueba también Elegir foto guardada.
2. Usa texto impreso nítido: `2 QA 132 Plato`. Orienta con Girar 90° y pulsa Leer foto orientada.
3. Compara foto y texto, corrige errores y extrae borrador de líneas. Revisa cantidades y precios (pueden quedar en cero).
4. No confirmes esta venta para el ensayo principal: el apartado siguiente usa otra venta controlada.
5. Prueba manuscrito solo como evaluación; sigue sin garantizarse su reconocimiento fiable.

## 12. Venta operativa — utiliza el archivo incluido

Solo en QA. Este es el importador CSV simple, **no** Historial POS.

1. Anota Harina 10 kg y Bisque 9 porciones tras los apartados anteriores.
2. Ventas e importaciones → importación operativa CSV simple → `ventas-operativas.csv`.
3. Debe mostrar una unidad de QA 132 Plato a precio 5000. Vincúlala con la ficha exacta QA 132 Plato.
4. Revisa y confirma consumo una sola vez.
5. Esperado: Harina **9.9 kg** y Bisque **8 porciones**. Reabrir no debe volver a consumir.

El paquete histórico ficticio es de otras fechas (1 y 2 de septiembre de 2026); no representa esta venta operativa. En uso real nunca dupliques la misma venta entre OCR, importador operativo e historial.

## 13. Historial POS ficticio: validar, confirmar y repetir

1. Configuración → Datos: importar historial POS. Fuente Soft Restaurant 8.1, codificación UTF-8.
2. Selecciona los cuatro CSV de la carpeta **historial**. Comprueba nombre de cada archivo.
3. Validar y ver vista previa: debe mostrar avance de carga y después **seis etapas** de validación.
4. Esperado: 1 producto de catálogo, 2 tickets, 2 líneas, 3 pagos, período 2026-09-01 a 2026-09-02, cero errores críticos y 1 producto vendido sin catálogo. El histórico no vigente es intencional, no un error para descartarlo.
5. Anota tres existencias. Confirma la importación histórica una vez, solo en QA.
6. Consulta memoria de ventas para esas fechas: total oficial **12000**, 2 tickets, 3 unidades, 3 cubiertos; ticket promedio **6000**. La suma estimada de líneas es **13000**, no el total oficial. El primer ticket tiene dos pagos que suman 9000.
7. Comprueba existencias intactas. Revisa equivalencias: vincula QA 132 Plato a su ficha; deja el histórico desconocido pendiente o Ignorado deliberadamente. Sal/reentra y comprueba persistencia.
8. Reimporta el mismo paquete una vez como prueba de idempotencia: debe reconocer lo existente, sin aumentar ventas, tickets o pagos. Recuperar un paquete completado solo consulta su resultado; no sustituye esta prueba de reimportación.

## 14. Recuperar tus paquetes reales ya subidos

No hace falta borrar la cuenta ni volver a subir todo para comenzar. Esta parte puede ser solo lectura/vista previa en el restaurante real.

1. Comprueba restaurante y abre Historial POS → **Paquetes ya preparados**.
2. Recupera primero el paquete de un año que ya había llegado a **validado**. Debe mostrar su resumen sin subir los CSV de nuevo. Recuperar no confirma ventas.
3. Para uno en **preparando**, pulsa Recuperar. Si tiene manifiesto guardado, continúa la validación desde su etapa pendiente. Si pide archivos, elige exactamente los mismos cuatro y codificación: compara/reutiliza bloques ya cargados.
4. No cambies archivos dentro de un paquete. No pulses Preparar otro paquete distinto para reintentar el mismo fallo.
5. Si agota tiempo, guarda mensaje, etapa e identificador; recupera el mismo paquete. Si vuelve a fallar, detente y repórtalo en vez de acumular copias.
6. Revisa período, cantidades, advertencias y muestras. Solo cuando decidas incorporar ese historial, pulsa Confirmar importación histórica una vez. Esto publica memoria de ventas, **no consume inventario**.
7. Comprueba resultado, existencias intactas y total oficial contra Soft Restaurant. No compares facturación con suma de líneas estimadas.

Los límites de tiempo no desaparecen: un paquete grande aún puede superar la confirmación atómica. La prueba sintética local no certifica tu archivo ni la capacidad del servidor. A-/H- no se deduplican entre sí automáticamente. Las preparaciones antiguas siguen guardadas; no se limpiaron sin autorización.

## 15. Analítica y snapshots, explicado desde cero

Un **snapshot es una copia de las cantidades que ChefOS muestra ahora en sus fichas de Inventario y Stock disponible**. No copia un archivo Excel, no pide un documento y no usa la cámara. Si ChefOS tiene 10 kg de harina, guarda ese número con la fecha de hoy para compararlo después. No cuenta físicamente tu bodega ni garantiza que tus datos estén actualizados.

1. Anota las cantidades actuales de Harina, Bisque y Base lista en QA.
2. Abre Analítica y snapshots → **Guardar copia de hoy**. No necesitas importar ventas históricas.
3. En Copias de existencias recientes busca los nombres y la fecha de hoy. Las cantidades de Inventario/Stock deben seguir intactas.
4. El almacenamiento antiguo usa cantidad base: 9.9 kg se muestra como **9900 base**; 8 porciones sin peso como **8 base**, no 8 gramos. La pantalla explica esta diferencia.
5. Otra copia manual del mismo día reemplaza la anterior de ese día. No es un historial de todas las modificaciones.
6. Desde/Hasta solo controla el análisis de consumo; no sirve para atribuir el stock actual a una fecha pasada.
7. Para evaluar consumo real necesitas conteos comparables y movimientos del período. Si solo creaste una copia, marca esa comparación NO PROBADO. Este panel antiguo no convierte por sí solo todo el historial POS nuevo en consumo físico.

## 16. Briefing — prueba central

1. Inicio → Actualizar briefing. Comprueba hora de comprobación y que termina de actualizar. Si falla, debe advertirlo; un resultado anterior no debe presentarse como recién comprobado.
2. Crea `QA 132 Sin minimo`, 0 g, mínimo 0. Actualiza: debe pedir revisar conteo/unidad/mínimo, no comprar 1 g inventado.
3. Crea `QA 132 Compra`, 2 kg, mínimo 5 kg, sin usarlo en recetas. Debe sugerir 3 kg. Súbelo a 5: la sugerencia por mínimo desaparece.
4. Pon mínimo 2 porciones a Base lista (actualmente 0). Debe señalar reposición/producción vinculada. Registra una tanda normal con salida 2 y actualiza: debe reflejar el nuevo stock.
5. Cuando hablamos de **faltantes de Carta** no es otra pantalla: son avisos del Briefing si falta un ingrediente para elaborar un plato en Carta. Revisa una ficha ficticia con ingrediente insuficiente y busca ese aviso en Inicio. Cubrir una receta no significa cubrir la demanda del servicio.
6. Si el contexto histórico tarda/falla, la parte operativa debe seguir pudiendo informar stock/producción, indicando datos históricos no disponibles. Sin historial fiable no debe inventar demanda.
7. Con historial confirmado y mapeado, consulta períodos y observaciones. Dos tickets ficticios no son suficientes para certificar un pronóstico; un historial antiguo no garantiza ventas actuales.
8. Chef IA sigue siendo básico: contrasta sus respuestas con los módulos. El Briefing manual no demuestra que el proceso automático de la mañana ya use idéntica lógica.

Pendiente: unificar motor automático/manual, verificar ciclos automáticos reales, pronóstico calibrado, descongelación y aprendizaje de decisiones. No se consideran implementados por esta actualización.

## 17. Equipo, permisos y conectividad

1. En QA, una cuenta autorizada crea clave de equipo de un solo uso para otra cuenta. Comprueba restaurante/rol y que no pueda reutilizarse.
2. Con Cocinero, intenta guardar configuración e importar historial: debe impedirlo. Editar el nombre propio sí está permitido. No explores información ajena si detectas acceso indebido; detén y reporta.
3. En dos dispositivos, cambia una categoría ficticia; anota si refresca solo o exige volver a entrar.
4. Confirma correo solo con una cuenta de prueba. El problema PKCE entre navegadores/dispositivos sigue pendiente; poder entrar después no certifica la confirmación.
5. Al final, en QA: abre una ficha, activa modo avión e intenta guardar. Debe informar falta de conexión, no éxito ficticio.
6. Navega; si falla el sitio debe aparecer recuperación local, no negro indefinido. Recupera internet y reintenta abrir.
7. Comprueba cantidad, movimiento, actividad y alerta antes de repetir el cambio. No debe reenviar automáticamente escrituras antiguas. Prueba segundo plano y Wi-Fi/datos.

No se ofrece todavía modo offline completo. Si una conexión se pierde durante el envío, el servidor pudo guardar antes del error.

## Qué enviar al terminar

Versión Android y backend; sección/paso; PASA/FALLA/NO PROBADO; captura sin claves; hora; restaurante de prueba o real; cantidades antes/después. Para historial: etapa e identificador del paquete, período/tamaño de archivos y si solo validaste o también confirmaste. Para Briefing: estado de los productos, mínimos y hora de actualización.

No borres datos reales para reiniciar la prueba. Las correcciones se consideran verificadas en tu teléfono cuando pasan los pasos correspondientes, no solo cuando compila la APK.
