# ChefOS 1.3.1 — guía completa de testeo

Esta guía comprueba la capacidad actual; no certifica por adelantado que todas las pruebas pasarán en tu teléfono. Marca cada apartado **PASA / FALLA / NO PROBADO**. Si falla, guarda captura, hora, paso exacto y cantidades antes/después. No compartas contraseñas ni claves.

## 0. Preparación y seguridad

**No necesitas borrar tu cuenta, inventario ni historial. Instala como actualización; no desinstales ni borres almacenamiento.**

1. Conserva copias intactas de tus CSV originales.
2. Para lecturas puedes usar tu restaurante real. Para crear compras, mermas, producciones o ensayar descuentos, utiliza un restaurante de pruebas con una cuenta separada. La pantalla Mis restaurantes aún no cambia el restaurante activo entre cuentas.
3. Antes de cualquier escritura, comprueba nombre del restaurante y rol. Usa Dueño o Chef Ejecutivo para este recorrido completo; otros roles tienen restricciones.
4. Si no dispones de un restaurante de pruebas, realiza solo lecturas y vistas previas hasta prepararlo. No uses tus producciones reales para probar anulaciones.
5. Una pantalla que queda cargando no demuestra que falló el guardado. Vuelve a consultar datos y movimientos antes de repetir. No cierres el editor durante una prueba de reintento: su identificador se conserva mientras está abierto.
6. Las cantidades propuestas abajo son ficticias; no son recetas ni recomendaciones alimentarias.

## 1. Versión, sesión y navegación

1. En Ajustes de Android → Aplicaciones → ChefOS, comprueba **1.3.1**.
2. Abre la app con internet. Revisa nombre, restaurante y cargo.
3. En el menú de usuario → Estado del sistema, comprueba backend **1.3.1**, sesión, Storage e historial POS disponibles. Si el backend muestra 1.3.0, no continúes las pruebas nuevas: cierra/reabre y comprueba el despliegue.
4. Abre Inicio, Recetas, Carta, Producción, Inventario, Alertas y, desde Configuración, Stock disponible.
5. Abre un formulario, usa Atrás del teléfono, envía la app a segundo plano y vuelve.
6. Abre el enlace a esta guía desde Estado del sistema.

Esperado: navegación operativa, textos legibles, botones alcanzables y ninguna pantalla negra persistente. El estado del sistema no sustituye las pruebas de guardado siguientes.

## 2. Perfil, configuración y ayudas

1. Revisa Mi perfil y Configuración inicial: nombre, zona horaria y cargo.
2. Avanza un paso, entra a Inventario y vuelve. Comprueba progreso y cargo conservados.
3. Abre Mis restaurantes: debe mostrar información del restaurante, no redirigirte silenciosamente a Inicio. Es una consulta, no un selector de cuentas.
4. Abre Tutoriales y sus accesos.

Límite conocido: las ayudas siguen siendo tarjetas descriptivas; el tutorial práctico con datos simulados todavía está pendiente. No lo marques como resuelto.

## 3. Inventario: alta, edición, unidades y archivo

En el restaurante QA:

1. Crea **QA Harina**, unidad **kg**, stock **10**, mínimo **0**, costo unitario **1000**.
2. Guarda y vuelve a abrir. Modifica únicamente el nombre y vuelve a guardar; verifica que conserve 10 kg.
3. Busca por nombre y prueba categorías, incluidas Granos y Caldos y Bases, y el filtro crítico.
4. Comprueba Unidad/Docena sin peso obligatorio; Caja/Bandeja con cantidad por envase opcional; Porción con peso opcional.
5. Todos los campos y sus etiquetas deben verse. Con teclado abierto, desplaza el formulario hasta Guardar y Archivar.
6. En Inicio → Actividad reciente, comprueba las acciones y responsable.
7. Crea otro producto **QA Archivar**, archívalo y verifica que no aparezca entre activos. No archives QA Harina aún.

Esperado: cambios persisten al cambiar de pantalla. Archivar conserva el historial; no equivale a borrar movimientos anteriores.

## 4. Importación de inventario y duplicados

1. Descarga la plantilla de Inventario desde Configuración inicial.
2. En QA utiliza una copia pequeña de CSV con nombres exclusivos de prueba, encabezados de la plantilla, comas y puntos decimales. No mezcles el ensayo con tus existencias reales.
3. Importa y compara nombre, categoría, unidad, cantidad y costo de tres filas.
4. Repite el mismo archivo y selecciona **Omitir duplicados**: no deben aumentar las cantidades.
5. Para probar Sumar, anota cantidades y usa una sola fila ficticia: una cantidad 2 sobre un producto con 3 debe terminar en 5. No repitas si no sabes si confirmó.
6. Revisa la detección de duplicados ya existentes, pero no fusiones productos reales solo porque tienen nombres parecidos.

Límites: el importador antiguo de inventario aún necesita endurecimiento transaccional ante concurrencia. La lectura de Excel de formatos arbitrarios, detección de encabezados y asistente de mapeo está diseñada, **no implementada**. No debes convertir tu operación a una plantilla específica como solución definitiva.

## 5. Stock disponible

1. Crea **QA Bisque**, unidad **porción**, stock **10**, costo **200**, sin peso por porción.
2. Sal y vuelve; busca y edita su categoría. Debe conservar 10 porciones.
3. Prueba su importación CSV con nombres exclusivos y omisión de duplicados.
4. Mueve un producto ficticio completo desde Inventario; repite con dos seleccionados.

Esperado: cambia su clasificación, no se duplica ni aumenta mágicamente. Mover sigue reclasificando la ficha completa. Transformar 2 piezas en 7 porciones se registra en Producción, con receta y producto de salida.

## 6. Recetas: búsqueda, lista compacta y guardado seguro

1. Recetas debe abrir la lista. Pulsa Añadir receta y escribe **QA Base**.
2. Rendimiento: **2**, unidad **porcion**. Activa **Es producción** y deja En Carta desactivado.
3. Pulsa **+ Agregar ingrediente**. Debe abrir inmediatamente un diálogo visible.
4. Busca `QA Harina`; selecciónala. Debe tomar **kg** por defecto. Cantidad **1** → **Listo**.
5. Añade `QA Bisque`, cantidad **1**. La unidad debe ser **porcion** sin exigir un peso.
6. De vuelta en el editor deben verse dos líneas compactas, no dos formularios largos. Toca una línea para editarla.
7. En Paso a paso agrega un título y una descripción ficticios → Listo.
8. En Salida al Stock disponible, activa **Crear aquí un nuevo producto elaborado**. Nombre **QA Base lista**, cantidad por receta **2**, unidad **porcion**.
9. Guarda. Abre Stock: QA Base lista debe existir con **0**, no con 2. Crear la ficha no produce existencias.
10. Reabre QA Base, agrega un segundo paso y guarda. Sal y vuelve. Debe haber **2 ingredientes y 2 pasos**, no duplicados.
11. Repite una edición pequeña dos veces, abriendo nuevamente la receta entre ediciones. Revisa ingredientes, pasos y costos.
12. Prueba Escalar sin registrar producción: duplicar rendimiento debe duplicar necesidades, sin cambiar stock.

Prueba negativa: intenta usar QA Bisque en gramos sin configurar peso. Debe rechazarlo y conservar el formulario; después de salir/reabrir, la receta guardada anteriormente debe estar intacta. Corrige a porción y guarda.

Si una edición informa que otra persona cambió la receta, vuelve a cargarla antes de continuar. No fuerces una versión obsoleta.

## 7. Carta

1. Carta → Agregar plato. Nombre **QA Plato**, rendimiento **1 plato**.
2. Agrega QA Harina **0.1 kg** y QA Bisque **1 porcion**, mediante el mismo diálogo buscador → Listo.
3. Agrega título y descripción de elaboración. Tiempo y dificultad son opcionales.
4. Activa En Carta y deja **Es producción desactivado**: es un plato de montaje.
5. Guarda, comprueba la lista, abre su ficha, edita un paso y guarda otra vez.
6. Al reabrir, ingredientes y pasos no deben multiplicarse; usar porciones sin peso en porciones debe funcionar.
7. Comprueba que no se haya creado stock ni descontado ingredientes al guardar el plato.
8. Desactiva En Carta en una ficha de prueba o archívala; verifica que deje de aparecer en Carta. Archivar conserva historia.

Un plato de montaje no genera producto elaborado ni existencias automáticamente. Una preparación que sí se produce necesita la salida configurada, como QA Base.

## 8. Producción terminada y salida real

Antes de comenzar confirma: QA Harina **10 kg**, QA Bisque **10 porciones**, QA Base lista **0 porciones**.

1. Producción → Añadir producción → QA Base.
2. **Cantidad de recetas producidas (tandas): 1**. No escribas gramos en este campo.
3. Debe informar una salida prevista de **2 porciones**. En Cantidad realmente obtenida escribe **7** para ensayar un rendimiento distinto.
4. Pulsa Registrar producción terminada, revisa el resumen y confirma una sola vez.
5. Comprueba resultado: Harina **9 kg**, Bisque **9 porciones**, Base lista **7 porciones**.
6. Revisa el registro, responsable, tandas, salida y costo. Con los costos anteriores, ingredientes consumidos cuestan **1200**.
7. Sal y vuelve. La producción no debe quedar presentada como pendiente de finalizar.

La salida real puede variar sin cambiar los ingredientes consumidos: estos se calculan por tandas. Las recetas antiguas sin producto de salida deben editarse y configurarse antes de producir.

## 9. Corregir y anular producción

**Modifica stock. Hazlo solo con el ensayo anterior, antes de consumir su salida.**

1. Abre el lote y **Corregir / anular registro**.
2. Indica totales correctos, no diferencias: **2 tandas**, salida **10**, motivo `Corrección QA`.
3. Confirma. Esperado: Harina **8 kg**, Bisque **8 porciones**, Base lista **10 porciones**; costo **2400**.
4. Vuelve a abrir, indica motivo `Anulación QA` y pulsa **Anular y compensar existencias**.
5. Esperado: Harina **10 kg**, Bisque **10 porciones**, Base lista **0**. El registro permanece marcado como anulado; no se borra su historia.
6. Registra después una tanda normal con salida **2** para continuar con mermas: Harina 9 kg, Bisque 9 porciones, Base lista 2 porciones.

No pruebes la corrección sobre el antiguo registro de 400: no hay base para saber qué significaba. Los registros anteriores sin detalle de conversión se rechazan para corrección automática. Si ya se consumió salida y no alcanza para compensar, debe rechazarse sin alterar ningún ingrediente.

## 10. Mermas manuales y voz

1. Con QA Base lista en **2 porciones**, registra una merma manual de **1 porción**, motivo Otro y nota QA.
2. Esperado: queda **1**, hay movimiento y entrada en Inicio → Actividad reciente.
3. Menú de usuario → **Captura rápida: voz o fotografía** → Dictar comando. Permite micrófono.
4. Di: `ChefOS registra una porción de QA Base lista como merma`.
5. Pulsa Revisar comando. Revisa nombre exacto, cantidad y unidad; corrige el texto o selecciona el producto si el dictado no coincide.
6. Pulsa Cancelar: debe seguir en **1**.
7. Repite, revisa y confirma una vez: debe quedar **0**, con movimiento y actividad.

La voz actual prepara mermas con frases limitadas, no ejecuta cualquier función de ChefOS. Una orden ambigua nunca debe descontar sin revisión.

## 11. Cámara, fotografía y OCR

1. En Captura rápida → Leer comanda o factura, prueba **Tomar foto ahora** y luego **Elegir foto guardada** con una imagen ficticia sin datos personales.
2. Comprueba vista previa. Si está girada, usa Girar 90° hasta verla derecha.
3. Pulsa Leer foto orientada. La primera ejecución puede descargar el idioma español.
4. Usa primero texto impreso nítido: `2 QA Plato`. Compara el resultado con la foto y corrígelo.
5. Prueba después la comanda manuscrita: puede seguir fallando. Debe poder corregirse manualmente y avisar de baja confianza; no se considera resuelto el reconocimiento fiable de escritura a mano.
6. Extraer borrador de líneas con cantidad no registra ventas ni descuenta stock. Verifica cantidades y completa precios, que pueden quedar en cero.
7. Para la prueba óptica puedes detenerte aquí. Importar ventas revisadas y aplicar consumo son acciones separadas que escriben datos; hazlas solo en QA, nunca con la misma comanda ya incluida en otro importador.

## 12. Compras, proveedores y alertas

1. Compras → Nueva → **+ Crear proveedor**. Nombre `QA Proveedor` → Crear y seleccionar proveedor.
2. Busca `QA Harina`; selecciónala, cantidad **1 kg**, precio **1000**.
3. Anota el stock anterior, guarda la compra y comprueba su proveedor/detalle.
4. Recibe la compra una sola vez. Debe aumentar exactamente **1 kg**.
5. Reabre: debe conservar su estado recibido y no permitir un segundo aumento por la misma recepción.
6. En otro producto ficticio, configura mínimo 5 y stock 2. Comprueba alerta, Inventario crítico y briefing actualizado.
7. Marca la alerta como leída, sal y vuelve **sin modificar el producto**: la misma alerta debe continuar leída.
8. Una nueva modificación puede crear una nueva alerta si el problema persiste. Marcar leída no repone stock ni resuelve el faltante.

## 13. Historial Soft Restaurant y equivalencias

Esta importación guarda memoria de ventas; **no descuenta inventario**. Puede hacerse después con tus archivos reales en el restaurante correcto, tras comprobar la vista previa.

1. Configuración → Datos: importar historial POS. Selecciona fuente y codificación correcta.
2. Selecciona, por separado, `productos.csv`, `tickets.csv`, `ventas_detalle.csv` y `pagos.csv` del mismo paquete.
3. Tras cada selección debe verse el nombre del archivo. Si no aparece, prueba una copia local en Descargas en vez del proveedor de Drive y anota modelo Android/proveedor. No lo des por cargado.
4. Pulsa Validar y ver vista previa. Comprueba período, filas, tickets, productos, advertencias y omitidos.
5. Un CSV incorrecto debe mostrar error; no cambies IDs para forzar la carga. Puedes cancelar aquí sin confirmar ventas.
6. Solo si corresponde al restaurante/período: anota tres existencias y confirma la importación histórica una vez. Mantén la app abierta.
7. Revisa el resultado y vuelve a consultar esas existencias: deben estar iguales.
8. La facturación se contrasta con `total_ticket` de tickets.csv, no con la suma estimada de líneas. Conserva productos NO VIGENTE y pagos múltiples.
9. Abre Revisar equivalencias de productos POS. Vincula nombres inequívocos a recetas/productos, deja pendientes los dudosos o márcalos Ignorados deliberadamente. Sal y vuelve.
10. Repite el mismo paquete sin modificar. Esperado: ventas reconocidas, sin aumentar tickets/unidades/facturación.

Los identificadores A- y H- no se deduplican automáticamente entre sí. No mezcles este período con importación operativa ni fotos de comandas.

## 14. Ventas operativas y analítica

**Solo QA:** desde Ventas e importaciones abre la opción de importación operativa CSV simple. No uses el paquete histórico aquí.

1. Utiliza una venta ficticia de QA Plato con columnas `nombre,cantidad,precio`, cantidad 1 y un precio de prueba.
2. Revisa la equivalencia con QA Plato. Antes de confirmar consumo, anota Harina y Bisque.
3. Confirma una vez. Con la receta indicada, debe descontar **0.1 kg** y **1 porción**. Comprueba que no se repita el descuento al reabrir.
4. Si no tienes un archivo operativo de prueba, marca este bloque NO PROBADO; no improvises con el historial real.

En Consultar memoria de ventas, selecciona un período importado, revisa tickets, unidades, ranking y facturación; cambia fechas y compara con Soft Restaurant. Sin importación, es correcto que falten datos.

En Analítica y snapshots, guarda un snapshot: es una copia de las cantidades en una fecha, no una foto con cámara, y **no modifica stock**. Puedes probarlo sin historial POS. El análisis entre períodos necesita datos comparables; si faltan, no debe inventar consumo. Los paneles antiguos no incorporan todos automáticamente el historial transaccional nuevo.

## 15. Briefing: prueba central

1. En QA crea `QA Sin mínimo`, stock **0**, mínimo **0**, unidad **g**. Inicio → Actualizar briefing.
2. Debe pedir revisar conteo/unidad/mínimo, **no inventar una compra de 1 g** para ese producto.
3. Crea `QA Compra`, stock **2 kg**, mínimo **5 kg**, sin usarlo en recetas. Actualiza: debe sugerir **3 kg** para alcanzar el mínimo.
4. Cambia su stock a **5 kg** y actualiza: ya no debe requerir compra por mínimo. Una alerta anterior sin leer puede seguir como riesgo histórico.
5. Configura un mínimo positivo en QA Base lista y déjala bajo ese mínimo. Actualiza: debe señalar producción asociada o revisión de reposición.
6. Registra una producción terminada que alcance ese mínimo; actualiza y comprueba que cambie la recomendación.
7. Revisa faltantes de Carta: cubrir un plato no equivale a predecir las ventas de todo el día. No debe prometer cobertura del servicio sin demanda fiable.
8. Tras importar y mapear historial, revisa observaciones, período y advertencias de datos insuficientes/antiguos. Un año antiguo no equivale a demanda actual garantizada.
9. Abre Chef IA y pregunta por stock o mermas. Comprueba datos contra los módulos. Sigue en modo básico.

Límite importante: estas correcciones corresponden al **briefing manual**. El proceso automático todavía usa lógica anterior; registra lo observado al día siguiente antes de pulsar Actualizar. No certifiques que pasó el ciclo automático solo porque funcionó el botón. Forecast calibrado, planificación de descongelación y aprendizaje de decisiones siguen pendientes.

## 16. Equipo, registro y sincronización

1. Con cuenta autorizada, Equipo → crea clave de un solo uso y rol para otra cuenta QA.
2. En esa cuenta, Unirme a un restaurante. Comprueba restaurante y rol; la clave no debe servir otra vez.
3. En dos dispositivos, cambia un dato ficticio. Comprueba cuándo aparece en el otro; sal/reentra si no se refresca. Registra si exige recargar.
4. Con rol Cocinero intenta gestionar equipo, recetas o importaciones restringidas: debe respetar permisos.
5. No explores otros restaurantes si detectas acceso indebido: detén la prueba y reporta.
6. Prueba registro/correo solo si necesitas una cuenta QA. El enlace no debe llevar a localhost.

Límite conocido: la confirmación entre navegadores/dispositivos puede seguir encontrando el problema PKCE. El mensaje es más comprensible, pero el flujo token_hash/OTP y la plantilla de correo no se han resuelto en esta entrega. Poder entrar después no convierte ese error en una prueba aprobada.

## 17. Desconexión y recuperación Android

Hazlo al final, solo con productos QA.

1. Anota stock y abre su formulario con internet.
2. Activa modo avión; intenta cambiar stock y guardar.
3. Debe informar falta de conexión/error, no guardado exitoso. El formulario puede permanecer abierto, pero no es un borrador garantizado tras cerrar la app.
4. Cambia de pantalla. Si falla cargar el sitio, debe aparecer la recuperación local con opción de reconectar, no quedar indefinidamente negra.
5. Recupera internet y usa Reintentar/volver a ChefOS según la pantalla. Verifica stock, movimientos, actividad y alerta juntos.
6. Ninguna operación antigua debe reenviarse automáticamente. Si aparece un aviso de pendientes antiguos, revísalos antes de repetirlos manualmente.
7. Haz ahora un único cambio con conexión: cantidad, actividad y alerta deben ser coherentes tras cerrar/reabrir.
8. Repite segundo plano y cambio entre Wi-Fi/datos.

Si la conexión se corta **durante** el envío, el servidor podría haber guardado antes del error. Consulta antes de repetir. No se ofrece un modo offline completo ni sincronización segura de todas las acciones.

## 18. Cómo enviar el resultado

Copia este formato por cada fallo:

```text
ChefOS Android / backend: 1.3.1 / ...
Teléfono y versión Android:
Restaurante: QA o real (sin claves)
Apartado y paso:
Qué hice:
Qué esperaba:
Qué ocurrió / mensaje exacto:
Producto y cantidad antes/después:
¿Persistió tras salir y entrar?:
Captura o vídeo corto:
```

Prioridad para aprobar esta entrega: **6 → 7 → 8 → 9 → 10 → 13 → 15 → 17**. Después completa el resto para regresiones. Haber recorrido toda la guía no significa que todas las capacidades de la visión estratégica estén implementadas.
