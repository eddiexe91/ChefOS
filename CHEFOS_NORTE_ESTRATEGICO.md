# CHEFOS — NORTE ESTRATÉGICO DEL PRODUCTO

Directriz permanente del usuario incorporada el 16-09-2026. Igual jerarquía que CHEFOS_MASTER_ARCHITECTURE; prevalece en conflictos de misión, UX y priorización. Este documento define el objetivo, no certifica funciones implementadas.

A partir de este momento, toda decisión de arquitectura, UX, desarrollo, priorización y nuevas funcionalidades de ChefOS debe evaluarse según el siguiente principio.

## MISIÓN CENTRAL

ChefOS debe ayudar al chef a tomar mejores decisiones operativas utilizando los datos reales de su restaurante.

ChefOS NO tiene como objetivo convertirse simplemente en otro software de gestión gastronómica, POS, sistema de inventario, recetario digital o dashboard administrativo.

Su producto central es el: **BRIEFING DEL CHEF**.

El objetivo es que un chef pueda abrir ChefOS antes de comenzar su jornada y, idealmente en menos de 30 segundos, comprender:

- qué necesita producir;
- cuánto necesita producir;
- qué necesita comprar;
- qué productos presentan riesgo de quiebre de stock;
- dónde existe sobreproducción;
- dónde están aumentando las mermas;
- qué costos presentan variaciones importantes;
- qué comportamientos anormales está detectando ChefOS;
- y cuáles son las pocas acciones que realmente requieren su atención ese día.

ChefOS debe evolucionar desde un sistema que muestra información hacia un sistema que convierte información en decisiones operativas concretas.

## PRINCIPIO ARQUITECTÓNICO

El Briefing no debe depender exclusivamente de una IA generativa.

ChefOS debe poseer su propio motor de decisión operacional, construido sobre datos, reglas, estadísticas y modelos de predicción verificables.

Flujo conceptual:

DATOS DEL RESTAURANTE → NORMALIZACIÓN → MOTOR DE DECISIÓN CHEFOS → DETECCIÓN DE RIESGOS, NECESIDADES Y OPORTUNIDADES → PRIORIZACIÓN → BRIEFING DEL CHEF → DECISIÓN DEL CHEF → RESULTADO REAL → HISTORIAL Y APRENDIZAJE.

La IA puede utilizarse posteriormente como capa de análisis, interpretación, detección de relaciones complejas y comunicación natural.

La IA no debe sustituir los cálculos deterministas que ChefOS pueda realizar de manera fiable.

## LOS MÓDULOS EXISTEN PARA ALIMENTAR EL BRIEFING

Inventario, recetas, producción, ventas, compras, costos, proveedores, mermas, analítica y cualquier módulo futuro no deben concebirse como productos aislados.

Cada uno debe responder: «¿Qué información aporta este módulo para que ChefOS pueda tomar mejores decisiones?»

Ejemplos:

- VENTAS → permiten estimar demanda.
- RECETAS → permiten convertir demanda de platos en necesidades de ingredientes.
- INVENTARIO → permite determinar qué existe realmente.
- PRODUCCIÓN → permite conocer qué ya está preparado.
- COMPRAS → permiten conocer precios, disponibilidad y comportamiento de proveedores.
- MERMAS → permiten detectar pérdidas, desviaciones y rendimientos anormales.
- HISTORIAL DE COSTOS → permite detectar aumentos y anomalías.

Todo converge en el Briefing.

## PRINCIPIO FUNDAMENTAL: AUTOMATIZAR LA CAPTURA DE DATOS

El mayor enemigo de ChefOS es depender de información manual incorrecta o incompleta.

Por lo tanto, siempre que sea razonablemente posible: **AUTOMATIZAR > IMPORTAR > REGISTRAR MANUALMENTE**.

Ejemplo:

1. Integración automática con POS/API.
2. Importación CSV/XLS/XLSX.
3. Introducción manual como alternativa.

ChefOS debe poder recibir históricos provenientes de Fudo, Soft Restaurant, Toteat y otros POS, normalizarlos a su modelo interno y utilizarlos independientemente de su origen.

A futuro, cuando exista API disponible, la sincronización debería realizarse automáticamente.

El chef no debería convertirse en digitador para que ChefOS pueda funcionar.

## PRINCIPIO DE CONFIANZA

ChefOS nunca debe presentar una predicción como certeza.

Las recomendaciones importantes deberían poder explicar:

- QUÉ recomienda.
- CUÁNTO recomienda.
- POR QUÉ lo recomienda.
- QUÉ datos utilizó.
- CUÁNTA confianza tiene en la estimación.

Ejemplo conceptual:

> PRODUCIR 24 PORCIONES DE REINETA
>
> Demanda estimada: 38–43. Producción disponible: 17. Producción sugerida: +24.
>
> Basado en: ventas de miércoles anteriores, tendencia de últimas semanas, producción disponible y stock actual.
>
> Confianza: alta.

El chef mantiene siempre la decisión final.

## PRINCIPIO DE PRIORIZACIÓN

El Briefing NO debe convertirse en una colección de gráficos, estadísticas, párrafos generados por IA y decenas de alertas.

Debe responder primero: «¿Qué necesita hacer el chef hoy?»

Si existen veinte observaciones pero solo tres requieren acción, ChefOS debe mostrar primero esas tres.

La información secundaria debe permanecer disponible para profundizar.

ChefOS debe reducir carga mental, no aumentarla.

## APRENDER DE LAS DECISIONES DEL CHEF

Cuando ChefOS recomienda algo y el chef decide hacer otra cosa, esa diferencia es información valiosa.

Ejemplo: ChefOS recomienda «producir 24 porciones». Chef decide «producir 18».

ChefOS debe poder registrar eventualmente: RECOMENDACIÓN → DECISIÓN DEL CHEF → RESULTADO REAL.

Esto permitirá medir precisión y mejorar progresivamente los modelos de recomendación.

El objetivo no es reemplazar la experiencia del chef. El objetivo es combinar: experiencia humana + memoria histórica del restaurante + análisis computacional.

## MEMORIA OPERACIONAL DEL RESTAURANTE

ChefOS debe construir progresivamente una memoria operacional propia de cada restaurante.

Con suficiente historial debería comprender patrones relacionados con:

- día de la semana;
- temporada;
- comportamiento de platos;
- producción;
- demanda;
- costos;
- compras;
- proveedores;
- mermas;
- rendimientos;
- quiebres de stock;
- desviaciones;
- decisiones anteriores del chef.

ChefOS debe volverse progresivamente más útil mientras más tiempo utiliza los datos del restaurante.

## MÉTRICA REAL DE ÉXITO

El éxito de ChefOS NO se mide por cantidad de módulos, pantallas o funciones.

Debe medirse mediante resultados operacionales. Entre las métricas relevantes:

- precisión de las recomendaciones de producción;
- reducción de sobreproducción;
- reducción de quiebres de stock;
- reducción de compras de emergencia;
- reducción de mermas;
- mejora del food cost;
- detección temprana de aumentos de costos;
- tiempo ahorrado en planificación;
- porcentaje de recomendaciones aceptadas por el chef;
- diferencia entre recomendación, decisión humana y resultado real.

Una nueva funcionalidad que no mejora directa o indirectamente estas métricas debe considerarse secundaria.

## RELACIÓN CON LOS POS

ChefOS no necesita reemplazar Fudo, Toteat, Soft Restaurant u otros POS.

Idealmente debe poder trabajar JUNTO a ellos.

El POS registra la operación. ChefOS utiliza esos datos para generar inteligencia operacional.

Conceptualmente: POS + INVENTARIO + RECETAS + PRODUCCIÓN + COMPRAS + MERMAS → CHEFOS → BRIEFING → DECISIONES.

Esto permite que ChefOS pueda convertirse en una capa de inteligencia para cocina independientemente del sistema de venta utilizado por el restaurante.

## REGLA PARA TODA DECISIÓN FUTURA

Antes de implementar cualquier funcionalidad importante en ChefOS, Work, Copilot o cualquier agente que participe en el proyecto debe preguntarse:

«¿Esta decisión mejora la capacidad de ChefOS para obtener datos fiables, comprender la operación del restaurante o entregar mejores decisiones al chef mediante el Briefing?»

Si SÍ: evaluar y priorizar.

Si NO: considerarla secundaria y justificar claramente por qué merece tiempo de desarrollo.

No agregar funciones simplemente porque otros sistemas gastronómicos las poseen. No convertir ChefOS en un clon de un POS. No perseguir cantidad de características.

## VISIÓN FINAL

ChefOS debe aspirar a que un chef abra su teléfono antes del servicio y encuentre algo equivalente a:

> BRIEFING DEL CHEF
>
> Hoy existen 3 acciones prioritarias.
>
> 1. Produce X.
> 2. Compra Y.
> 3. Revisa Z.
>
> Estas recomendaciones se basan en la operación real y el historial de tu restaurante.

Y que, después del servicio, ChefOS pueda comprobar si esas recomendaciones fueron correctas.

La propuesta fundamental de ChefOS debe poder resumirse así:

**«ChefOS transforma los datos diarios de una cocina en decisiones operativas concretas para el chef.»**

Ese es el norte permanente del proyecto.

Toda arquitectura, función, integración e interfaz futura debe proteger y fortalecer ese objetivo.
