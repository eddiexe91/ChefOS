# ChefOS — especificación para la siguiente iteración de Copilot

> Actualización 16-09-2026: consultar [RELEASE_1.2.0.md](RELEASE_1.2.0.md) antes de actuar. Las instrucciones siguientes conservan contexto histórico; varios puntos ya están implementados. Prioridad pendiente: funciones 010 de salida de producción, prueba autenticada de Recetas/Carta y validación física de voz/OCR. Migración 012 aplicada. No volver a crear pantallas existentes ni afirmar que todo está validado en teléfono.

Fecha de corte: 15-09-2026  
Repositorio y fuente de verdad: `main` de `https://github.com/eddiexe91/ChefOS`  
Backend publicado: `https://chefos-pied.vercel.app`  
Supabase: proyecto `nipovuqpxvsgeqdrszuq`, URL `https://nipovuqpxvsgeqdrszuq.supabase.co`

## Contexto validado

La creación de recetas funciona. Producción también funciona: se puede crear un lote, una receta marcada como producción aparece como pendiente, al registrarla se descuentan correctamente sus ingredientes del inventario y se muestran las cajas de producciones pendientes y lotes activos.

La aplicación distingue actualmente dos propiedades de una ficha:

- `en_carta`: muestra el plato en la Carta.
- `es_produccion`: permite seleccionarlo en Producción y descontar ingredientes al registrar un lote.

Una ficha puede tener ambas propiedades. Leche asada puede aparecer en Recetas, Producción y Carta; Cancato de corvina puede aparecer solo en Carta.

La migración `supabase/migrations/009_categoria_postres.sql` agrega la categoría `Postres` a restaurantes existentes y al inicializador. Ya fue aplicada en el proyecto Supabase real.

## Objetivo

Convertir el inventario actual en un modelo operativo claro para restaurantes: materias primas e insumos por un lado, productos elaborados disponibles para vender o usar en platos por otro; además, separar correctamente la experiencia de Carta de la experiencia de Recetas y hacer que el briefing analice Carta, recetas, producción y stock.

## Trabajo requerido

### 1. Separar Inventario y Stock disponible

Mantener `Inventario` para materias primas e insumos sin elaborar: leche, azúcar, huevos, carne cruda, pescados crudos, verduras, abarrotes, licores, etc.

Crear una pantalla principal `Stock disponible` para productos elaborados, porcionados o listos para vender/usar: corvina porcionada, pesto, aceite de ajo, postres porcionados, empanadas y producciones terminadas.

Implementar la solución con una migración explícita y reversible. Se puede ampliar `productos` con un campo tipo/estado operativo o crear una tabla relacionada, pero no duplicar silenciosamente los productos existentes. Documentar la decisión en la migración y en los tipos TypeScript.

La pantalla de Stock disponible debe incluir búsqueda, filtro por categoría, alta, edición, ajuste de cantidad y archivado suave. Los productos elaborados deben poder seleccionarse como ingredientes de una elaboración de Carta.

Al registrar una producción, descontar las materias primas y aumentar el Stock disponible cuando la receta tenga un producto de salida configurado. Conservar trazabilidad en movimientos y actividad reciente.

### 2. Mejorar el modal de Inventario

Los formularios deben mostrar siempre etiquetas visibles y valores legibles en modo oscuro: nombre del producto, categoría, unidad de medida, stock actual, stock mínimo, costo unitario y peso por unidad cuando corresponda. No depender solo de placeholders.

El botón `Nuevo producto` y los botones de acciones deben permanecer accesibles por encima de la navegación inferior y funcionar en pantallas Android pequeñas.

### 3. Carta: editar, archivar y elaborar

Cada plato de Carta debe tener acciones visibles `Editar plato` y `Archivar`/`Eliminar`. Usar archivado suave (`activa=false`) para preservar recetas, movimientos, actividad e historial; no borrar físicamente registros referenciados.

Al pulsar un plato de Carta abrir un editor contextual de **Receta de elaboración de platos**, no el editor de receta de producción de forma ambigua.

Una elaboración de Carta debe permitir nombre del plato; ingredientes en porciones, gramos, mililitros o unidades; ingredientes de Inventario y Stock disponible; descripción y pasos; tiempo; rendimiento; dificultad; y unidad de salida `plato`.

Ejemplo: Cancato de corvina usa una porción de corvina, media porción de longaniza, 40 g de tomate, 60 g de mozzarella, 400 g de papa cocida, 40 g de pesto y 10 g de vino blanco. Pesto y aceite de ajo pueden ser productos elaborados del Stock disponible.

`es_produccion` no es obligatorio para un plato de Carta. Solo las fichas con `es_produccion=true` aparecen en Producción y descuentan ingredientes mediante lotes. Para Carta usar `Guardar elaboración`, no `Crear receta`.

### 4. Recetas

La pantalla debe abrir mostrando `Recetas del restaurante`, con la lista de recetas existentes y el botón `Añadir receta`. El formulario se abre solo después de pulsar ese botón, igual que Carta.

La lista debe mostrar fichas técnicas de producción (`es_produccion=true`). No ocultar una receta de producción que también esté en Carta. Mantener separado el editor de elaboración de Carta.

### 5. Briefing y actividad

Al agregar o modificar un plato de Carta, recalcular o invalidar el briefing. El briefing debe cruzar platos de Carta, ingredientes, materias primas y Stock disponible. Para Cancato puede sugerir porcionar corvina o advertir si falta corvina, longaniza, tomate, queso, papa, pesto o aceite de ajo.

Mantener actividad para crear, editar, archivar y producir, identificando usuario, restaurante, acción, elemento afectado y fecha. Las acciones de Inventario ya generan actividad correctamente; no romperlas.

### 6. Onboarding

Después del registro, el primer paso guiado debe ser completar materias primas e insumos de Inventario. El segundo debe explicar y permitir completar Stock disponible. Luego aparecen Recetas, Carta y Producción.

Guardar el avance automáticamente. Si el usuario omite un paso, mostrar advertencia y mantener alerta persistente en Inicio. No marcar completo si faltan Inventario o Stock disponible, salvo confirmación explícita.

### 7. Fuera de alcance

El modo sin conexión completo no forma parte de esta iteración. No afirmar que está implementado. Dejarlo como trabajo futuro: almacenamiento offline-first, cola de mutaciones, resolución de conflictos y sincronización segura.

## Criterios de aceptación

1. Materias primas aparecen en Inventario; pesto y corvina porcionada aparecen en Stock disponible.
2. Cancato se crea, edita y archiva en Carta sin perder historial.
3. Cancato aparece en Carta, pero no en Producción si `es_produccion=false`.
4. Leche asada marcada como producción aparece en Recetas/Producción, descuenta ingredientes y aumenta su salida elaborada cuando esté configurada.
5. Filtros de Inventario y Stock disponible funcionan por categoría y búsqueda.
6. Labels, valores, selectores y botones se leen en Android con tema oscuro.
7. La navegación inferior no tapa acciones ni modales; Atrás de Android vuelve a la pantalla anterior.
8. El onboarding empieza por Inventario y conserva el avance.
9. El briefing muestra recomendaciones relacionadas con Carta y disponibilidad.
10. Type-check, lint, build Next.js y APK terminan correctamente.

## Comandos de validación y APK

```powershell
node .tools/package/bin/npm-cli.js run type-check
node .tools/package/bin/npm-cli.js run lint
node .tools/package/bin/npm-cli.js run build
powershell -ExecutionPolicy Bypass -File scripts/build-android.ps1 -BackendUrl https://chefos-pied.vercel.app -SkipCapacitorSync
```

La APK se genera en `artifacts/ChefOS-debug.apk` o `artifacts/ChefOS-debug-latest.apk` si la anterior está abierta. Probarla en un teléfono Android físico con internet y sesión real.

Nunca subir `.env.local`, `SUPABASE_SERVICE_ROLE_KEY`, claves `sb_secret_...`, contraseñas ni `ANTHROPIC_API_KEY`. Chef IA debe seguir funcionando en modo básico sin Anthropic.
