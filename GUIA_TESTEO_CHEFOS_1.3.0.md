# ChefOS 1.3.0 — guía de testeo de la capacidad actual

Fecha: 22-09-2026. Una guía de cobertura no certifica que todas las pruebas ya pasaron en tu teléfono. Anota cada resultado: OK, FALLÓ, BLOQUEADO o NO APLICA. No marcar “100% probado” si quedan casos sin ejecutar.

**Actualización 23-09:** historial POS habilitado en producción; 013/014 aplicadas y verificadas. Ya puedes probar la importación manual. Las tareas automáticas tienen autenticación privada y diagnóstico remoto aprobado; su próximo ciclo completo aún debe comprobarse. No necesitas borrar tu cuenta ni instalar otra APK si ya tienes 1.3.0.

## Uso diario recomendado

1. Antes del servicio: abre Inicio, pulsa **Actualizar briefing**, revisa fecha y atiende las pocas acciones prioritarias. Contrasta cantidades con existencias; las estimaciones no son órdenes automáticas.
2. Mantén Inventario como materias primas/insumos y Stock disponible como preparaciones listas. Registra conteos reales y cambios de estado sin confundir reclasificar un producto con trasladar una cantidad parcial.
3. Mantén fichas de Recetas y Carta completas; registra solo la producción y las mermas que realmente ocurren. Recibir compras y confirmar producción/merma sí cambia existencias.
4. Importa ventas al recibir una exportación del POS. El historial alimenta memoria y análisis, **no descuenta stock actual**. No mezcles el mismo período con el importador operativo/OCR.
5. Después del servicio: revisa movimientos, alertas y pendientes. Refresca el Briefing para planificar; ChefOS todavía no calcula un plan fiable de descongelación ni ejecuta todas las funciones por voz.

## 1. ¿Debo borrar mi cuenta o empezar de cero?

**No. Conserva tu cuenta, restaurante, inventario, recetas y movimientos.** Esta actualización es aditiva; importar historial no debe modificar las existencias actuales. No se ha solicitado una limpieza general ni es necesaria.

- Instala la APK como actualización, sin desinstalar la anterior. Si Android indica firma incompatible, detente y envía captura: no borres datos ni desinstales para forzarla.
- Los datos del restaurante están en Supabase. Puede haber borradores/acciones pendientes solo en el teléfono: no borres almacenamiento ni caché mientras existan operaciones sin sincronizar.
- Una importación de inventario es una entrada de datos, **no una restauración ni reemplazo automático**. Si ya tienes esos productos, elige “Omitir duplicados” para no sumar el mismo conteo dos veces. Esto conserva el stock existente, no lo actualiza al nuevo conteo.
- Usa “Sumar cantidades” solo para existencias adicionales reales y con unidades compatibles. “Mantener todos” deja duplicados deliberadamente.
- Para corregir el stock actual de un producto existente, utiliza su edición/ajuste y comprueba el valor final. No reimportes repetidamente hasta “que cuadre”.

### Pruebas sin contaminar la cocina real

Leer, buscar, filtrar y abrir formularios es seguro. Confirmar una producción, merma, compra o venta operativa **sí cambia datos**.

Para ensayar estas operaciones sin consecuencias, utiliza un restaurante exclusivo de pruebas, creado mediante otra cuenta/correo y “Crear restaurante”; no mediante “Unirme”, que te conecta a la cocina real. El panel “Mis restaurantes” actual es de consulta, no ofrece crear/cambiar libremente de restaurante. Esto es opcional: no necesitas abandonar tu cuenta habitual para usar la actualización.

Si pruebas sobre el restaurante real, confirma únicamente operaciones que efectivamente ocurrieron. No inventes mermas ni producción para ver qué pasa. Los ensayos de errores, importaciones corruptas y duplicados deliberados deben hacerse con datos sintéticos en el restaurante de pruebas.

## 2. Comprobación de versión y activación

1. Descarga `artifacts/ChefOS-1.3.0-test.apk` desde la entrega/GitHub. Es una APK debug de pruebas, no una publicación de Play Store.
2. Ábrela desde Archivos/Descargas e instala sobre ChefOS. Permite la instalación desde esa aplicación solo si Android lo solicita y reconoces el archivo.
3. En Ajustes de Android → Aplicaciones → ChefOS, comprueba versión **1.3.0**. Ábrela con internet.
4. Entra con tu misma cuenta. Comprueba restaurante y rol antes de hacer cambios.
5. Abre Configuración → Estado del sistema. La versión del backend debe ser **1.3.0**, además de la versión Android. Son dos piezas diferentes.
6. Comprueba Supabase, sesión y Storage. “Chef IA básico” es correcto: no necesita Anthropic.
7. En Configuración → Datos: importar historial POS, debe estar habilitada la validación: 013/014 ya están aplicadas. Si todavía aparece “pendiente de activar en Supabase”, cierra y vuelve a abrir ChefOS con conexión; si persiste, reporta el mensaje y no fuerces la importación.

Instalar una APK nueva no aplica migraciones ni publica Vercel. Un backend actualizado tampoco demuestra que funcionen permisos, micrófono o teclado de tu dispositivo.

## 3. Registro, sesión, tutoriales y configuración

- [ ] **A01:** Con tu cuenta existente, cerrar y abrir la app conserva datos y permite iniciar sesión; contraseña incorrecta produce un mensaje, no silencio.
- [ ] **A02:** En un correo de pruebas, “Crear restaurante” solicita identidad y cuenta; verificar correo vuelve al dominio público, nunca localhost. No envíes contraseñas ni enlaces privados en el informe.
- [ ] **A03:** Inicio muestra nombre, restaurante, rol y fecha local correctos.
- [ ] **A04:** Configuración inicial: nombre, zona horaria y cargo se conservan al avanzar, salir a Inventario y volver.
- [ ] **A05:** La configuración señala Inventario/Stock faltantes. Terminar incompleta no debe fingir que ya existen datos.
- [ ] **A06:** En una primera visita aparece ayuda cuando corresponde; saltarla permite continuar. Configuración → Tutoriales permite consultarla nuevamente aunque seas usuario antiguo.
- [ ] **A07:** Mi perfil muestra la identidad correcta. Mis restaurantes muestra solo locales autorizados; no debe exponer otros restaurantes.

## 4. Preparar e importar Inventario y Stock disponible

Hazlo en este orden: **Inventario → Stock disponible → Recetas/Carta → historial → equivalencias POS → Briefing**. Los productos POS aparecen para mapear después de la primera importación.

1. Configuración → Configuración inicial → paso Inventario.
2. Descarga la plantilla CSV. Conserva la fila de encabezados.
3. El formato actual de inventario usa coma como separador; guarda CSV UTF-8. No cambies únicamente la extensión de un Excel. Si tu Excel exporta con punto y coma, convierte la separación antes de importarlo; el importador histórico sí acepta ambos separadores, el de inventario actual no.
4. Encabezados de la plantilla: `nombre,unidad,costo,stock,stock_minimo,peso_unitario,tipo_operativo`.
5. Usa punto decimal y cantidades sin separadores de miles. Para evitar ambigüedades, usa `kg`, `g`, `ml`, `lt`, `unidad`, `docena`, `caja`, `bandeja` o `porcion` en archivos.
6. `stock` y `stock_minimo` se expresan en la unidad de la fila. `costo` es por esa unidad. `peso_unitario`, si procede, es gramos por porción/unidad, no el peso total del stock. Si una conversión no es posible, no inventes un peso para forzarla.
7. Selecciona el archivo y pulsa importar. Revisa cualquier aviso y el conteo.
8. Si contiene los productos que ya importaste, elige **Omitir duplicados**. Verifica que el stock no se duplicó.
9. En el paso **Stock disponible**, selecciona su CSV y pulsa **Importar Stock disponible**. Ese destino identifica los productos como elaborados.
10. Comprueba tres filas contra el archivo: nombre, cantidad, unidad y costo. Las categorías se pueden completar en la edición; no asumir que cualquier columna extra del CSV será importada.

Mantén nombres distintos para estados distintos: “Corvina congelada” y “Corvina lista para servicio”. Actualmente **Mover a Stock disponible reclasifica todo el producto seleccionado**; no transfiere una cantidad parcial ni representa un proceso de descongelación.

### Casos de inventario/stock

- [ ] **I01:** Ambos listados cargan productos anteriores; búsqueda, filtro crítico y categorías responden.
- [ ] **I02:** Nuevo producto: nombre, categoría, unidad, stock, mínimo y costo se ven y guardan. Modales y Guardar permanecen accesibles con teclado abierto; se puede cerrar sin guardar.
- [ ] **I03:** Editar producto conserva el texto visible, modifica solo lo solicitado y registra actividad reciente.
- [ ] **I04:** Unidad/docena no exigen peso de porción; caja/bandeja permiten cantidad por envase opcional; porción permite peso opcional. Verifica que una operación posterior que requiera conversión no invente equivalencias.
- [ ] **I05:** Categorías incluyen Granos y Caldos y Bases; filtrar no borra productos de otras categorías.
- [ ] **I06:** Importar una copia detecta duplicados. Omitir conserva cantidades. Ensayar sumar/mantener únicamente con productos de prueba y misma unidad.
- [ ] **I07:** Un duplicado ya existente ofrece “Sumar y unificar” o “Eliminar copias”. Anota cantidad antes/después; no pruebes sobre productos con unidades incompatibles.
- [ ] **I08:** Seleccionar uno o varios y mover cambia su listado, no multiplica ni consume existencias. Comprueba total antes/después. No usar esto para descongelar 5 de 20 porciones.
- [ ] **I09:** Archivar un producto de prueba lo retira de activos; no debe eliminar referencias históricas. Una receta que lo usaba requiere revisión, no reemplazo silencioso.
- [ ] **I10:** Ajuste con un conteo real modifica stock y muestra el movimiento. Reabrir la pantalla confirma persistencia.

## 5. Recetas y Carta

Para un ensayo reproducible, solo en restaurante de pruebas: crea “QA Ingrediente” con **10 kg** y una receta “QA Base” que rinde **2 porciones**, utiliza **1 kg** del ingrediente, tiene un paso y está marcada **Es producción**. No uses este ensayo ficticio en la cocina real.

- [ ] **R01:** Recetas abre “Recetas del restaurante” y la lista, no un formulario vacío por defecto.
- [ ] **R02:** Añadir receta abre el formulario; búsqueda de ingredientes encuentra inventario/stock correcto. No selecciona automáticamente otro producto de nombre parecido.
- [ ] **R03:** Completar nombre, rendimiento, unidad, ingredientes/cantidades y pasos necesarios permite guardar; los campos faltantes deben señalarse.
- [ ] **R04:** La receta creada reaparece al salir y volver. Abrirla muestra ingredientes, elaboración y datos guardados.
- [ ] **R05:** Editar una receta modifica nombre/ingredientes/pasos y persiste; verifica que no cree una segunda receta.
- [ ] **R06:** Probar escalado/costo cuando el detalle ofrezca esos controles. Doblar rendimiento debe doblar ingredientes compatibles; anota cualquier conversión pendiente. Cambiar el costo de un ingrediente debe reflejar actualización/revisión del costo, no un precio inventado.
- [ ] **R07:** Crear un plato en Carta, con ingredientes de materia prima y de una producción disponible. No marcar “Es producción” si solo se monta al pedido.
- [ ] **R08:** Abrir el plato lleva a su ficha; editar y guardar persiste. Quitar “En carta” retira el plato del menú sin exigir borrar la receta/historial.
- [ ] **R09:** Separar Carta de producción: un plato de montaje no debe producir automáticamente stock solo por estar a la venta. Caldos y Bases debe poder utilizarse como categoría.

Importar nombres de recetas por CSV, donde se ofrezca, no equivale a importar ingredientes, pasos y rendimientos completos. Completa las fichas antes de usar cálculos de producción.

## 6. Producción y consumo

- [ ] **P01:** Recetas marcadas Es producción aparecen pendientes cuando no se han registrado hoy. Filtrar turno/categoría/estado funciona.
- [ ] **P02:** Añadir producción abre/selecciona el lote y permite elegir receta, cantidad y unidad; no confirma solo por abrir.
- [ ] **P03:** Con la receta QA, producir 2 porciones consume exactamente **1 kg**: QA Ingrediente pasa de 10 a **9 kg**. El producto de salida recibe las 2 porciones según su configuración.
- [ ] **P04:** Registrar media tanda debe consumir 0,5 kg cuando la receta y sus unidades lo permitan. Comprueba inventario y stock de salida, no solo el mensaje de éxito.
- [ ] **P05:** Detalle de lote muestra registros, responsable y costo cuando existen datos; cerrar lote cambia su estado. No afirmar que cerrar revierta producción.
- [ ] **P06:** Tras producir, regresar a Inicio y refrescar actualiza producción y pendientes. Una cantidad inválida no debe descontar nada.

No repetir Confirmar por impaciencia. Si la red falla, revisa primero el lote/movimientos antes de repetir una operación: no todos los módulos operativos tienen la misma idempotencia que el historial POS.

## 7. Mermas, voz y fotografía

- [ ] **M01:** Registrar merma manual seleccionando producto, cantidad, unidad y motivo. Confirmar una sola vez; comprobar movimiento, costo cuando existe y reducción exacta de stock.
- [ ] **M02:** Configuración → Registrar por voz o fotografía → Dictar comando. Concede micrófono si quieres probarlo. Di: “ChefOS registra 2 porciones de QA Pescado como merma”.
- [ ] **M03:** Revisar comando muestra una propuesta. Comprueba cantidad/unidad y **selecciona el producto correcto**. Cancelar no descuenta; Confirmar merma sí.
- [ ] **M04:** Dictar una variante como “registro dos porciones de merma de QA Pescado”. Si no entiende, debe pedir revisión, no ejecutar otra cosa. Se puede corregir el texto manualmente.
- [ ] **M05:** Fotografiar una comanda de prueba sin datos personales. La primera lectura puede descargar el idioma; revisar/corregir OCR antes de preparar líneas.
- [ ] **M06:** Preparar borrador CSV desde OCR no modifica stock. Importarlo crea ventas operativas; revisar correspondencias y confirmar consumo es otra acción distinta.
- [ ] **M07:** Una factura leída produce texto revisable: no genera automáticamente una compra completa. Accede a Compras y verifica proveedor, productos y cantidades.

Voz actual: **mermas**, no todas las funciones. OCR es lectura de texto, no un detector fiable de anulaciones o facturas duplicadas. No utilizar comandas ya contabilizadas por otra vía.

## 8. Compras y alertas

- [ ] **C01:** Configuración → Compras → Nueva: seleccionar proveedor/productos, cantidades, costos y fecha cuando corresponda. Guardar muestra detalle y estado.
- [ ] **C02:** Confirmar/recibir una compra de prueba según los botones disponibles; recibir aumenta existencias exactamente una vez. Revisar lista y movimientos después.
- [ ] **C03:** Cambio real de costo en compra/edición se refleja en producto y costos de recetas relacionadas, o indica que necesitan recalcularse.
- [ ] **L01:** Un producto bajo mínimo aparece en críticos y alertas. Cambiar filtros o marcar leída no cambia stock.
- [ ] **L02:** Marcar una alerta leída actualiza contador y persiste al volver. “Leída” no significa “faltante resuelto”.

## 9. Historial Soft Restaurant — activado el 23-09-2026

1. Guarda una copia intacta de los cuatro archivos originales fuera del repositorio público. No adjuntes datos de clientes/empleados a incidencias públicas.
2. Confirma restaurante activo y rol Dueño, Administración o Chef Ejecutivo.
3. Configuración → Datos: importar historial POS. Selecciona `productos.csv`, `tickets.csv`, `ventas_detalle.csv` y `pagos.csv` del mismo período/restaurante.
4. Escoge UTF-8 o Windows-1252 según exportación. Fechas admitidas: AAAA-MM-DD o DD/MM/AAAA, **no MM/DD/AAAA**. Máximo actual 100 MB por archivo.
5. Pulsa **Validar y ver vista previa**. Mantén app abierta y conexión estable. La preparación no publica ventas ni modifica stock.
6. Compara conteos y fechas contra tu exportación; examina muestras, duplicados, errores, tickets sin detalle, productos no mapeados y diferencias de pagos.
7. Si hay errores, no fuerces campos ni descartes productos históricos. Guarda el mensaje para corregir el origen. “Preparar otro paquete” permite elegir archivos corregidos.
8. Con vista previa correcta, pulsa **Confirmar importación histórica**. Si se pierde su respuesta, reintentar esa confirmación es seguro. Cerrar/reabrir la app pierde el ID en esta versión: una nueva preparación no debe duplicar ventas confirmadas.
9. Abre **Revisar equivalencias de productos POS**: busca receta/plato/producto y confirma; usa Pendiente si no sabes e Ignorado para elementos que no deben generar recomendaciones. Un nombre parecido no basta.
10. Abre **Consultar memoria de ventas** y selecciona el período completo. Contrasta tickets y facturación con `tickets.csv`, no con la suma de líneas estimadas.
11. Vuelve a Inicio, actualiza Briefing y revisa período, promedios y limitaciones. Historial antiguo puede provocar “Actualiza las ventas”, no una previsión inventada para hoy.

### Casos históricos

- [ ] **H01:** Los cuatro archivos correctos llegan a vista previa antes de publicar. Archivo faltante/fecha imposible muestra error.
- [ ] **H02:** Tras confirmar aparecen tickets, unidades y productos; siguen existiendo productos “NO VIGENTE”.
- [ ] **H03:** Reimportar exactamente el mismo paquete muestra existentes y **cero líneas nuevas**; no duplica facturación ni cambia inventario.
- [ ] **H04:** Pagos múltiples no duplican total de ticket. H-1 y A-1 se conservan aunque compartan folio.
- [ ] **H05:** Un producto no mapeado puede vincularse manualmente; la elección persiste. “Ignorado” lo excluye de recomendaciones, no borra su venta.
- [ ] **H06:** Comparar período actual/anterior y ranking; respetar que importes por producto son estimados y facturación de tickets es oficial.
- [ ] **H07:** Comparar tres existencias antes/después de importación histórica: deben ser idénticas.
- [ ] **H08:** En entorno sintético, mismo identificador con contenido distinto debe bloquear la importación, no sobrescribir. No ensayar modificando tus archivos reales.

No mezclar el mismo período mediante importación histórica, CSV operativo y OCR. La deduplicación histórica no puede reconocer automáticamente registros operativos antiguos sin ID externo. Tampoco puede unir por folio tickets A que luego cambian a H: exporta períodos cerrados no solapados o revisa la transición.

## 10. Ventas operativas, analítica y snapshots

- [ ] **V01:** Solo en ensayo controlado: abrir “Importación operativa CSV simple”, archivo `nombre,cantidad,precio`, seleccionar fecha y subir. Revisar cada correspondencia antes de descontar.
- [ ] **V02:** Confirmar consumo operativo modifica ingredientes según recetas, no por el precio. Volver a confirmar no debería duplicar el descuento: comprobar movimientos.
- [ ] **V03:** Una importación histórica nunca muestra el botón operativo de descontar inventario.
- [ ] **N01:** Analítica y snapshots → Guardar snapshot guarda el conteo actual sin cambiarlo. Seleccionar fechas y Calcular análisis muestra resultados o explica permisos/falta de datos.
- [ ] **N02:** Consumo teórico frente a real es una función operativa existente; no asumir que ya utiliza todas las equivalencias del nuevo historial POS. Registrar cualquier diferencia para la próxima iteración.
- [ ] **N03:** Mis restaurantes y Dashboard muestran solo locales autorizados. La facturación histórica oficial se verifica primero en Memoria de ventas; los paneles antiguos pueden requerir adaptación adicional.

## 11. Briefing y Chef IA básico

- [ ] **B01:** Inicio siempre ofrece información operativa o una acción para completar/verificar datos; no se queda en “Sin briefing para hoy” indefinidamente.
- [ ] **B02:** Stock bajo real produce compras/faltantes relevantes. Comprueba producto, cantidad, unidad y razón contra inventario.
- [ ] **B03:** Producción pendiente se refiere a recetas de producción; un plato de Carta no debe confundirse con un lote fabricado.
- [ ] **B04:** Después de corregir stock/registrar producción, refrescar Briefing refleja el cambio y no sigue usando solo el mensaje anterior.
- [ ] **B05:** Memoria de ventas explica período y promedio por día comparable. Con menos de cuatro días comparables, datos antiguos o ausencia de ventas, informa insuficiencia en vez de inventar demanda.
- [ ] **B06:** Si no detecta faltantes, lo expresa condicionado a datos disponibles; no garantiza que el servicio estará cubierto.
- [ ] **B07:** Abrir Chef IA, consultar stock/mermas/ventas. El modo básico responde dentro de sus reglas, sin requerir una clave pagada. No equivale a conversación libre de Claude.
- [ ] **B08:** Cron matutino/cierre requieren revisión al día siguiente: anotar fecha/turno. Siguen programados a 06:00 y 23:00 GMT, no hora local; falta acordar el horario operacional. Una actualización manual correcta o el diagnóstico de lectura no demuestra que se guardó un briefing/cierre programado. Si sus cantidades difieren del manual, reporta la diferencia: el motor operativo todavía requiere unificación.

El forecast calibrado, recomendaciones precisas de descongelación, sobreproducción, afinidad entre platos y aprendizaje de decisiones siguen siendo evolución pendiente; no calificarlos como fallos de funciones prometidas en esta entrega ni como ya probados.

## 12. Equipo, permisos y sincronización

- [ ] **E01:** Configuración → Equipo → elegir rol y Crear clave. Compartir solo con una persona autorizada. En otra cuenta, elegir “Unirme a un restaurante”.
- [ ] **E02:** El nuevo integrante entra al mismo restaurante con su rol; una clave usada/incorrecta no debe permitir unirse nuevamente. No publicar la clave en GitHub.
- [ ] **E03:** Una cuenta Cocinero no debería poder gestionar importaciones históricas/equipo ni acceder a datos de otro local. Si puede, detener el test y reportarlo como seguridad.
- [ ] **E04:** Con dos dispositivos autorizados abiertos, un cambio real o de QA se refleja en el otro; si necesita refrescar, anota qué módulo no actualizó solo.

## 13. Android, accesibilidad y conexión

- [ ] **D01:** Inicio/Recetas/Carta/Producción/Inventario/Alertas navegan sin bloqueo. Stock está accesible desde configuración/enlaces existentes.
- [ ] **D02:** Atrás de Android retrocede/cierra un modal cuando corresponde antes de salir. La sesión y borradores no desaparecen inesperadamente.
- [ ] **D03:** Modo oscuro: etiquetas, texto escrito, selectores, avisos y deshabilitados son legibles; teclado no tapa Guardar; listas y modales permiten desplazamiento.
- [ ] **D04:** Volver desde segundo plano y cambiar entre Wi-Fi/datos no duplica acciones ni muestra falsos éxitos. Antes de reintentar, comprobar el registro.
- [ ] **D05:** En restaurante QA, abrir previamente una receta, activar modo avión y observar qué sigue disponible. No se promete uso completo sin internet ni primera apertura offline.
- [ ] **D06:** Si una merma/producción/ajuste indica “pendiente”, reconectar y verificar que se aplicó una sola vez. Si no ofrece cola o rechaza la operación, registrarlo; no asumir que se guardó. No probar desconexión en medio de una operación real.
- [ ] **D07:** Voz puede requerir red/servicio de reconocimiento del teléfono. OCR necesita descarga inicial. Historial CSV requiere internet de principio a fin.

## 14. Cómo informar resultados

Completa cada casilla con OK/FALLÓ/BLOQUEADO/NO APLICA. Para cada fallo envía:

1. Código (por ejemplo H03), versión APK y backend, modelo del teléfono.
2. Pantalla, pasos exactos, fecha/hora y tipo de conexión.
3. Resultado esperado frente al obtenido; cantidad/unidad antes y después si afecta stock.
4. Captura sin contraseñas, claves, datos personales ni CSV completo del negocio.
5. Si ocurrió una operación real: **no repetir** hasta verificar si se guardó.

Orden recomendado de sesiones: A+D → I → R → P+M+C+L → H+V+N → B+E → offline controlado. El resultado final será el porcentaje de casos realmente ejecutados y aprobados; no un “100%” basado solo en que la APK compila.
