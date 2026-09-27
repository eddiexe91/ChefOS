# Importación flexible de inventario y stock

## Decisión del usuario, 26-09-2026

ChefOS debe recibir planillas de distintos restaurantes, no exigir la estructura de Cocina Puerto ni una plantilla única. La muestra de un restaurante es un caso de prueba, no un requisito para definir esta capacidad. Este documento es un diseño pendiente; no certifica un importador Excel implementado.

Contribución al Norte: reducir digitación y obtener existencias fiables para el Briefing. No hace falta IA generativa para leer tablas, validar unidades y proponer columnas por sus encabezados.

## Flujo requerido

1. Seleccionar Excel (.xlsx; evaluar .xls con lector mantenido) o CSV. Leer en un worker con límites de archivo, hojas, filas, tiempo y tamaño descomprimido. Nunca ejecutar macros, enlaces externos ni fórmulas.
2. Elegir hoja, tabla/rango y fila de encabezados; previsualizar datos originales. Reconocer encabezados repetidos, notas, subtotales y celdas combinadas, sin descartar filas silenciosamente.
3. Proponer equivalencias: código externo, producto, categoría, cantidad, unidad, costo unitario y mínimo. Permitir cambiarlas. Conservar la columna y fila de origen de cada valor.
4. Mostrar advertencias por decimales ambiguos, moneda, fechas, ausencia de unidad, fórmula sin valor calculado, cantidad negativa, nombres vacíos, productos desconocidos y equivalencias caja/porción faltantes. No suponer que 1,234 equivale a 1234 ni que 1 caja tiene 12 unidades.
5. Elegir destino Inventario o Stock disponible; por hoja o filas si están mezclados. No transformar materias primas en elaborados sin producción confirmada.
6. Mostrar correspondencias con productos existentes, nuevos y duplicados. Coincidencias de código externo persistido son preferibles; nombres exactos solo si son únicos y compatibles. Coincidencias dudosas requieren revisión, nunca fusión difusa automática.
7. Elegir explícitamente operación: **actualizar conteo absoluto** (existencia resultante de la planilla), **sumar entrada** o **solo crear nuevos**. Actualizar no suma; una fila ausente no archiva ni pone a cero un producto.
8. Vista previa por producto: valor anterior, valor nuevo, unidad, diferencia, procedencia y advertencias. Confirmación explícita del restaurante y operación antes de escribir.
9. Aplicación transaccional/idempotente con movimientos y actividad en la misma transacción. Revalidar stock/versiones al confirmar para no pisar una compra o producción concurrente. Interrumpir conflictos y permitir revisión. Resumen de aplicados, omitidos y errores sin éxito ficticio.
10. Guardar perfil de columnas por restaurante y origen para siguientes cargas; volver a validar cuando cambie la estructura. El historial POS sigue siendo otro flujo: nunca descuenta existencias históricas.

## Integración, no segundo inventario

Extender la importación existente (`/api/onboarding/importar`, importadores de stock) y el modelo `productos`/`inventario_movimientos`. Auditar primero su atomicidad y tratamiento actual de duplicados. El archivo normalizado debe llegar al mismo servicio de existencias. No enviar archivos completos a IA ni publicar documentos reales en GitHub.

## Límites honestos

No prometer interpretar automáticamente cualquier documento arbitrario. Planillas con imágenes en lugar de tablas, protegidas con contraseña, formatos no tabulares o unidades mezcladas sin equivalencia requieren ayuda del usuario. Ofrecer instrucciones concretas; nunca un resultado silenciosamente incompleto. No inferir consumo ni ventas a partir de una diferencia de conteo.

## Pruebas de aceptación pendientes

- Al menos tres estructuras sintéticas diferentes, varias hojas, encabezado desplazado y columnas en distinto orden.
- UTF-8 y CSV con separadores distintos; números locales; fórmulas con/sin valor; hojas vacías, totales y encabezados repetidos.
- Reimportación no duplica ni suma en modo conteo; archivo malicioso/excesivo rechazado; interrupción no deja medias escrituras.
- Unidades incompatibles, nombres ambiguos, ausencia de filas y movimiento concurrente no alteran datos silenciosamente.
- Aislamiento entre restaurantes y perfil de mapeo; prueba real Android del selector de archivos.

## Orden de trabajo

Cerrar primero las correcciones de integridad de recetas, producción y stock de la migración 016. Después implementar este asistente y probar los formatos sintéticos. Una muestra real opcional sirve para ampliar cobertura, no para acoplar ChefOS a un restaurante.
