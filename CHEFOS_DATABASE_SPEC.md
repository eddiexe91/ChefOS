# CHEFOS — ESPECIFICACIÓN DE BASE DE DATOS
**Versión:** 1.0 — Sprint 3 completado  
**Motor:** PostgreSQL 15+ (Supabase)  
**Estado:** Fuente de verdad permanente

## Estado remoto verificado — 10-09-2026

Las migraciones y los buckets de Storage del proyecto `nipovuqpxvsgeqdrszuq` están aplicados. Las Edge Functions `chat-ia`, `generar-briefing` y `cierre-diario` responden HTTP 200, y los cron jobs de briefing/cierre están activos. La validación E2E de login continúa pendiente porque el puente de cookies SSR falla en el backend Next.js; no hay evidencia de que sea un problema de esquema o RLS.

---

## ESTADO REAL DEL DESPLIEGUE — 09-09-2026

- Proyecto: `nipovuqpxvsgeqdrszuq` — `https://nipovuqpxvsgeqdrszuq.supabase.co`.
- Migraciones remotas aplicadas: `001`, `002`, `003`, `004` y `005_registro_inicial.sql`.
- Verificación: tablas principales consultables y buckets `facturas`, `importaciones`, `recetas-imagenes` y `recetas-videos` creados.
- Datos: cero usuarios registrados al momento de la verificación; todavía no existe un restaurante inicial.
- Chef IA básico funciona sin secreto; `ANTHROPIC_API_KEY` solo es necesario para modo avanzado. Pendientes externos: despliegue de Edge Functions, activación de cron y prueba E2E con usuario real.
- Las credenciales no forman parte de esta especificación ni deben subirse a GitHub.

## ESTADO DE EVIDENCIA (POST-AUDITORÍA HISTÓRICA)

La sección de despliegue real anterior es la fuente vigente para el proyecto conectado. Las advertencias “NO DETERMINABLE” que aparecen más abajo pertenecen a la auditoría histórica previa a la creación de `supabase/migrations` y no invalidan la verificación remota del 09-09-2026.

Este documento describe el **contrato arquitectónico esperado** de base de datos.

- **Implementado y verificable en código del repo:** validaciones de pertenencia por `restaurante_id` en API `POST /api/biblioteca/recetas` y uso de sesión autenticada Supabase.
- **No determinable con la evidencia actual:** estado real de migraciones SQL y políticas RLS desplegadas, porque el repositorio auditado **no contiene** carpeta `supabase/migrations`.

Cuando se requiera afirmación de RLS efectivo en entorno real, usar la frase:
**"NO DETERMINABLE CON LA EVIDENCIA ACTUAL"** hasta contar con evidencia ejecutable.

---

## EXTENSIONES REQUERIDAS

```sql
pg_trgm    -- Similitud textual para normalización de nombres
unaccent   -- Búsqueda sin tildes
pgcrypto   -- gen_random_uuid() (incluido en Supabase)
```

---

## MIGRACIONES EN ORDEN DE EJECUCIÓN

| # | Archivo | Descripción |
|---|---|---|
| 001 | `001_schema_base.sql` | Esquema base, triggers, RLS, índices |
| 002 | `002_funciones_negocio.sql` | Onboarding, alertas de stock, seed |
| 003 | `003_arquitectura_decisiones.sql` | Sistema de gramos, costos desactualizados, consumo teórico vs real |
| 004 | `004_biblioteca_culinaria.sql` | Módulo recetas, producción por lotes, escalado |
| 005 | `005_correccion_costo_por_gramo.sql` | Fix crítico: costo_por_gramo usa factor de unidad, no stock |

**Verificación en este repositorio:** **NO DETERMINABLE CON LA EVIDENCIA ACTUAL** (archivos de migración no presentes en el árbol auditado).

---

## TABLAS — CATÁLOGO COMPLETO

### TABLAS DE CONFIGURACIÓN GLOBAL

#### `unidades_medida`
Catálogo global de unidades. No tiene `restaurante_id` — es compartido.

| Columna | Tipo | Descripción |
|---|---|---|
| id | UUID PK | |
| codigo | TEXT UNIQUE | 'kg', 'g', 'lt', 'ml', 'unidad', etc. |
| nombre | TEXT | 'Kilogramo', 'Gramo', etc. |
| tipo | TEXT | 'masa' / 'volumen' / 'unidad' |
| factor_a_gramos | NUMERIC(18,8) | NULL para volumen y unidad contable |
| es_base | BOOLEAN | true solo para 'g' |
| activa | BOOLEAN | |

**Registros precargados (12):** g, kg, mg, oz, lb, lt, ml, unidad, docena, caja, bandeja, porcion

#### `densidades_producto`
Factores de conversión para líquidos y productos por unidad.

| Columna | Tipo | Descripción |
|---|---|---|
| id | UUID PK | |
| restaurante_id | UUID NULL | NULL = estándar global |
| nombre_referencia | TEXT | 'crema de leche', 'aceite de oliva', etc. |
| densidad_g_por_ml | NUMERIC(8,4) | Para líquidos: g/ml |
| peso_unitario_gramos | NUMERIC(10,3) | Para contables: g/unidad |
| fuente | TEXT | 'estandar_culinario' / 'medicion_propia' / 'proveedor' |
| activa | BOOLEAN | |

**Registros precargados (22):** agua(1.0), leche(1.029), crema(1.003), aceite oliva(0.916), vino blanco(0.994), pisco(0.953), caldo pescado(1.01), limón(80g), cebolla(150g), ajo diente(5g), huevo grande(65g), etc.

---

### TABLAS DE TENANT (todas tienen restaurante_id)

#### `restaurantes`
| Columna | Tipo | Descripción |
|---|---|---|
| id | UUID PK | |
| nombre | TEXT NOT NULL | |
| slug | TEXT UNIQUE | Solo letras, números, guiones |
| plan | TEXT | 'basico' / 'profesional' / 'enterprise' |
| config | JSONB | timezone, moneda, logo_url, limites |
| activo | BOOLEAN | |
| creado_en | TIMESTAMPTZ | |

**config incluye:** `timezone`, `moneda`, `logo_url`, `color_marca`, `limite_usuarios`, `limite_ia_diario`

#### `usuarios`
| Columna | Tipo | Descripción |
|---|---|---|
| id | UUID PK → auth.users | |
| restaurante_id | UUID FK | |
| nombre | TEXT | |
| email | TEXT | |
| rol | TEXT | 'dueño' / 'administrador' / 'chef_ejecutivo' / 'chef_cocina' / 'cocinero' |
| activo | BOOLEAN | |
| avatar_url | TEXT NULL | |
| preferencias | JSONB | tema, notificaciones, turno_defecto |
| ultimo_acceso | TIMESTAMPTZ NULL | |

#### `usuarios_restaurantes`
Tabla puente para soporte multi-restaurante (Fase 3).

| Columna | Tipo |
|---|---|
| usuario_id | UUID FK → usuarios |
| restaurante_id | UUID FK → restaurantes |
| rol | TEXT |
| activo | BOOLEAN |
| PRIMARY KEY | (usuario_id, restaurante_id) |

#### `categorias_producto`
| Columna | Tipo | Descripción |
|---|---|---|
| id | UUID PK | |
| restaurante_id | UUID FK | |
| nombre | TEXT | |
| tipo | TEXT | 'proteina' / 'verdura' / 'lacteo' / 'condimento' / 'bebida' / 'limpieza' / 'insumo' / 'otro' |
| activa | BOOLEAN | |

**Seed al crear restaurante (15 categorías):** Pescados, Mariscos, Carnes, Aves, Verduras, Frutas, Lácteos, Condimentos, Aceites, Harinas, Pastas, Legumbres, Bebidas, Limpieza, Otros

#### `categorias_receta`
| Columna | Tipo | Descripción |
|---|---|---|
| id | UUID PK | |
| restaurante_id | UUID FK | |
| nombre | TEXT | |
| orden | INTEGER | Para ordenar en UI |
| activa | BOOLEAN | |

**Seed al crear restaurante (9 categorías):** Fondos y Bases(1), Salsas(2), Mise en Place(3), Entradas(4), Sopas(5), Platos de Fondo(6), Guarniciones(7), Postres(8), Bebidas(9)

#### `proveedores`
| Columna | Tipo |
|---|---|
| id | UUID PK |
| restaurante_id | UUID FK |
| nombre | TEXT |
| contacto | TEXT NULL |
| telefono | TEXT NULL |
| email | TEXT NULL |
| ruc_nit | TEXT NULL |
| condiciones_pago | TEXT NULL |
| dias_entrega | INTEGER NULL |
| activo | BOOLEAN |
| notas | TEXT NULL |

---

### `productos` — TABLA CENTRAL DEL INVENTARIO

| Columna | Tipo | Descripción |
|---|---|---|
| id | UUID PK | |
| restaurante_id | UUID FK | |
| nombre | TEXT | |
| nombre_normalizado | TEXT NULL | Generado por IA para matching |
| codigo_interno | TEXT NULL | |
| categoria_id | UUID FK NULL | → categorias_producto |
| unidad_medida | TEXT | Unidad de compra habitual ('kg', 'lt') |
| costo_unitario_actual | NUMERIC(12,4) | Precio por unidad_medida |
| **costo_por_gramo** | NUMERIC(18,8) | `costo_unitario / factor_unidad_a_gramos` ← trigger |
| stock_actual | NUMERIC(12,3) | En unidad_medida (para display) |
| stock_minimo | NUMERIC(12,3) | En unidad_medida (para display) |
| **cantidad_gramos** | NUMERIC(14,3) | Stock en gramos ← motor interno |
| **stock_minimo_gramos** | NUMERIC(14,3) | Mínimo en gramos ← motor interno |
| densidad_g_por_ml | NUMERIC(8,4) NULL | Para líquidos propios |
| peso_unitario_gramos | NUMERIC(10,3) NULL | Para contables propios |
| unidad_compra | TEXT NULL | Unidad explícita de compra |
| unidad_display | TEXT NULL | Unidad preferida para mostrar en UI |
| vida_util_dias | INTEGER NULL | NULL = no perecible |
| proveedor_principal_id | UUID FK NULL | → proveedores |
| activo | BOOLEAN | |
| metadata | JSONB | Información adicional flexible |

**Triggers sobre `productos`:**
- `trigger_historial_precios` → INSERT en `historial_precios_producto` cuando cambia `costo_unitario_actual`
- `trigger_costo_por_gramo` → recalcula `costo_por_gramo` cuando cambia precio o cantidad_gramos
- `trigger_marcar_costos_desactualizados` → marca recetas como `costo_desactualizado=true`
- `trigger_alerta_stock` → INSERT en `alertas_sistema` cuando `cantidad_gramos < stock_minimo_gramos`
- `trigger_sincronizar_stock` → actualiza `cantidad_gramos` desde `inventario_movimientos`

#### `historial_precios_producto`
| Columna | Tipo |
|---|---|
| id | UUID PK |
| producto_id | UUID FK |
| restaurante_id | UUID FK |
| precio_anterior | NUMERIC(12,4) NULL |
| precio_nuevo | NUMERIC(12,4) |
| variacion_pct | NUMERIC(6,2) |
| registrado_por | UUID FK NULL → usuarios |
| creado_en | TIMESTAMPTZ |

---

### TABLAS DE BIBLIOTECA CULINARIA

#### `recetas`
| Columna | Tipo | Descripción |
|---|---|---|
| id | UUID PK | |
| restaurante_id | UUID FK | |
| nombre | TEXT | |
| descripcion | TEXT NULL | |
| categoria_id | UUID FK NULL | → categorias_receta |
| imagen_url | TEXT NULL | Supabase Storage |
| video_url | TEXT NULL | |
| rendimiento_porciones | INTEGER | Porciones que produce la receta base |
| unidad_rendimiento | TEXT | 'porción', 'kg', 'lt', etc. |
| costo_total | NUMERIC(12,4) NULL | Calculado por `recalcular_costo_receta()` |
| costo_porcion | NUMERIC(12,4) NULL | `costo_total / rendimiento_porciones` |
| **costo_por_gramo** | NUMERIC(18,8) NULL | Para costeo de cualquier gramaje |
| precio_venta | NUMERIC(12,2) NULL | |
| margen_porcentaje | NUMERIC(5,2) NULL | `(precio_venta - costo_porcion) / precio_venta × 100` ← trigger |
| tiempo_preparacion | INTEGER NULL | Minutos |
| dificultad | TEXT NULL | 'basica' / 'intermedia' / 'avanzada' |
| version_actual | INTEGER | Empieza en 1 |
| activa | BOOLEAN | |
| en_carta | BOOLEAN | false = solo mise en place |
| es_produccion | BOOLEAN | true = mise en place, no va en carta |
| **costo_desactualizado** | BOOLEAN DEFAULT false | Flag cuando ingrediente cambia de precio |
| costo_actualizado_en | TIMESTAMPTZ NULL | Última vez que se recalculó |
| **cambios_descripcion_temp** | TEXT NULL | Campo temporal para trigger de versionado — se limpia inmediatamente |
| creado_por | UUID FK NULL → usuarios | |

**Trigger:** `trigger_versionar_receta` → cuando `version_actual` sube, guarda snapshot en `recetas_versiones`  
**Trigger:** `trigger_margen_receta` → recalcula `margen_porcentaje` en INSERT/UPDATE

#### `recetas_ingredientes`
| Columna | Tipo | Descripción |
|---|---|---|
| id | UUID PK | |
| receta_id | UUID FK → recetas CASCADE | |
| producto_id | UUID FK → productos | |
| cantidad | NUMERIC(12,4) | En unidad_medida del ingrediente (para display) |
| unidad_medida | TEXT | Unidad como la ingresó el chef |
| **cantidad_gramos** | NUMERIC(14,4) | **Canónico del motor** — siempre en gramos |
| es_opcional | BOOLEAN | |
| orden | INTEGER | |
| notas | TEXT NULL | 'brunoise fino', 'temperatura ambiente' |

#### `recetas_versiones`
| Columna | Tipo | Descripción |
|---|---|---|
| id | UUID PK | |
| receta_id | UUID FK → recetas CASCADE | |
| restaurante_id | UUID FK | |
| version_numero | INTEGER | UNIQUE con receta_id |
| procedimiento | TEXT | Texto completo de pasos concatenados |
| ingredientes_snap | JSONB | Snapshot completo de ingredientes en ese momento |
| costo_total_snap | NUMERIC(12,4) NULL | |
| cambios_descripcion | TEXT NULL | Qué cambió en esta versión |
| modificado_por | UUID FK NULL → usuarios | |
| creado_en | TIMESTAMPTZ | |

#### `recetas_pasos`
| Columna | Tipo | Descripción |
|---|---|---|
| id | UUID PK | |
| receta_id | UUID FK → recetas CASCADE | |
| restaurante_id | UUID FK | |
| numero | INTEGER | Orden del paso — UNIQUE con receta_id |
| titulo | TEXT | 'Sofrito base', 'Cocción del pescado' |
| descripcion | TEXT | Instrucción detallada |
| duracion_min | INTEGER NULL | |
| temperatura_c | INTEGER NULL | |
| tecnica | TEXT NULL | 'brunoise', 'blanquear', 'sellar' |
| punto_critico | BOOLEAN DEFAULT false | Muestra alerta visual en UI |
| foto_url | TEXT NULL | |
| activo | BOOLEAN | |

#### `recetas_fotos`
| Columna | Tipo | Descripción |
|---|---|---|
| id | UUID PK | |
| receta_id | UUID FK → recetas CASCADE | |
| restaurante_id | UUID FK | |
| url | TEXT | Supabase Storage |
| tipo | TEXT | 'referencia' / 'proceso' / 'emplatado' / 'ingredientes' / 'presentacion' |
| descripcion | TEXT NULL | |
| es_principal | BOOLEAN | UNIQUE INDEX por receta — solo una principal |
| orden | INTEGER | |
| subida_por | UUID FK NULL → usuarios | |

#### `recetas_productos_afectados`
Mapa precalculado para el trigger de costos desactualizados.

| Columna | Tipo |
|---|---|
| receta_id | UUID FK → recetas CASCADE |
| producto_id | UUID FK → productos CASCADE |
| restaurante_id | UUID FK |
| cantidad_gramos | NUMERIC(14,4) |
| PRIMARY KEY | (receta_id, producto_id) |

---

### TABLAS OPERATIVAS

#### `inventario_movimientos`
| Columna | Tipo | Descripción |
|---|---|---|
| id | UUID PK | |
| restaurante_id | UUID FK | |
| producto_id | UUID FK | |
| tipo | TEXT | 'entrada' / 'salida' / 'ajuste' / 'merma' / 'produccion' / 'transferencia' |
| cantidad | NUMERIC(12,3) | En unidad_medida del producto (display) |
| cantidad_antes | NUMERIC(12,3) | |
| cantidad_despues | NUMERIC(12,3) | |
| cantidad_gramos | NUMERIC(14,3) | Motor interno |
| cantidad_antes_gramos | NUMERIC(14,3) | |
| cantidad_despues_gramos | NUMERIC(14,3) | |
| costo_unitario | NUMERIC(12,4) NULL | |
| costo_por_gramo | NUMERIC(18,8) NULL | |
| motivo | TEXT NULL | |
| referencia_id | UUID NULL | ID del origen (merma, venta, compra, producción) |
| referencia_tipo | TEXT NULL | 'merma' / 'venta' / 'compra' / 'produccion' / 'ajuste_manual' |
| registrado_por | UUID FK NULL → usuarios | |

**Contrato y responsabilidad de cálculo**

> ⚠️ Decisión de diseño definida en interacción de arquitectura previa a Fase 3.7.
> No condiciona el mecanismo interno de implementación en la base de datos.

Columnas que la API está obligada a enviar al registrar un movimiento:
`restaurante_id`, `producto_id`, `tipo`, `cantidad_gramos`. Opcionalmente:
`costo_unitario`, `costo_por_gramo`, `motivo`, `referencia_id`, `referencia_tipo`,
`registrado_por`.

Columnas que la API **no** envía, porque son responsabilidad exclusiva de la base
de datos: `cantidad`, `cantidad_antes`, `cantidad_despues`, `cantidad_antes_gramos`,
`cantidad_despues_gramos`.

La API realiza una única transformación de dominio antes de enviar el movimiento:
convertir la cantidad ingresada por el usuario a gramos mediante `convertirAGramos()`.
A partir de ese punto, toda la lógica de inventario pertenece a la base de datos.

Comportamiento esperado de la base de datos, sin especificar mecanismo interno:
- La base de datos calcula automáticamente la cantidad antes y la cantidad después
  del movimiento, tanto en gramos (motor interno) como en la unidad de visualización
  del producto.
- La base de datos actualiza el stock del producto (`productos.cantidad_gramos`)
  dentro de la misma operación, de forma consistente con el movimiento registrado.
- Este cálculo y esta actualización ocurren de forma automática ante cada inserción
  en `inventario_movimientos`; la API no dispara ni orquesta pasos adicionales para
  que esto ocurra.
- Alcance de tipos de movimiento cubiertos por este comportamiento en la fase actual:
  `entrada`, `salida`, `merma`, `produccion`, `ajuste`. El tipo `transferencia`
  queda fuera de alcance hasta que exista la fase que lo requiera.

**Comportamiento específico para `tipo = 'ajuste'`**

> ⚠️ DECISIÓN DE DISEÑO (definida en interacción de arquitectura previa a Fase 3.8).
> Extiende el comportamiento ya aprobado de `sincronizar_stock()`, sin introducir
> triggers nuevos ni tablas nuevas. No condiciona el mecanismo interno de
> implementación en la base de datos.

El formulario de ajuste captura un **conteo físico absoluto** (el usuario reporta
cuánto hay realmente, no cuánto cambió). La API convierte ese conteo a gramos
mediante `convertirAGramos()` — su única transformación de dominio, igual que
para cualquier otro tipo de movimiento — y lo envía como `cantidad_gramos` en
el `INSERT`.

Sin embargo, ese valor recibido es **únicamente un dato de entrada para el
trigger, no el valor que se persiste**:

- La base de datos toma el valor recibido en `cantidad_gramos` e interpreta
  ese número como el conteo físico absoluto reportado.
- La base de datos calcula el delta real comparando ese conteo contra el stock
  vigente del producto en el momento de la operación (`cantidad_antes_gramos`).
- La base de datos **sobrescribe** `cantidad_gramos` con ese delta calculado
  antes del `INSERT` definitivo. El valor absoluto originalmente recibido
  **nunca se persiste** en la fila.
- `cantidad_despues_gramos` sí conserva el resultado absoluto (coincide con el
  conteo físico reportado), preservando la trazabilidad completa del ajuste.

De esta forma, `cantidad_gramos` **persiste siempre con la misma semántica
uniforme para los cinco tipos de movimiento en alcance** (`entrada`, `salida`,
`merma`, `produccion`, `ajuste`): representa la magnitud del movimiento
realizado, nunca un nivel absoluto de stock. Para `ajuste`, esa magnitud puede
tener signo negativo (a diferencia de los demás tipos, cuyo signo está
implícito y fijo según `tipo`); esa es la única variación respecto al resto —
una convención de signo, no un cambio de naturaleza del dato.

`referencia_id` es `NULL` para `tipo = 'ajuste'`, ya que no existe una tabla de
dominio propia para ajustes (a diferencia de `merma`, que referencia una fila
de `mermas`). `referencia_tipo = 'ajuste_manual'` identifica el origen sin
apuntar a una fila específica.

**Trigger:** `trigger_sincronizar_stock` → AFTER INSERT en `inventario_movimientos`.
Responsable único de todo el comportamiento descrito arriba: calcular las cantidades
antes/después (gramos y unidad de visualización) y actualizar `productos`. No se
introducen triggers adicionales para este comportamiento.

#### `compras`
| Columna | Tipo | Descripción |
|---|---|---|
| id | UUID PK | |
| restaurante_id | UUID FK | |
| proveedor_id | UUID FK NULL → proveedores | |
| fecha_compra | DATE | |
| numero_factura | TEXT NULL | |
| total_compra | NUMERIC(12,2) | |
| estado | TEXT | 'borrador' / 'confirmada' / 'recibida' / 'anulada' |
| imagen_factura_url | TEXT NULL | Foto tomada con celular |
| registrado_por | UUID FK NULL → usuarios | |
| notas | TEXT NULL | |

#### `compras_items`
| Columna | Tipo |
|---|---|
| id | UUID PK |
| compra_id | UUID FK → compras CASCADE |
| producto_id | UUID FK → productos |
| cantidad | NUMERIC(12,3) |
| unidad_medida | TEXT |
| cantidad_gramos | NUMERIC(14,3) NULL |
| precio_unitario | NUMERIC(12,4) |
| precio_total | NUMERIC(12,2) |
| notas | TEXT NULL |

#### `mermas`
| Columna | Tipo | Descripción |
|---|---|---|
| id | UUID PK | |
| restaurante_id | UUID FK | |
| producto_id | UUID FK → productos | |
| cantidad | NUMERIC(12,3) | En unidad_medida del producto |
| unidad_medida | TEXT | |
| cantidad_gramos | NUMERIC(14,3) NULL | Motor interno |
| motivo | TEXT | 'sobreproduccion' / 'error_coccion' / 'vencimiento' / 'manipulacion' / 'accidente' / 'otro' |
| responsable_id | UUID FK NULL → usuarios | |
| costo_merma | NUMERIC(12,2) NULL | Calculado por trigger |
| notas | TEXT NULL | |

**Trigger:** `trigger_costo_merma` → BEFORE INSERT, calcula costo usando `cantidad_gramos × costo_por_gramo` si disponible, sino `cantidad × costo_unitario_actual`

---

### TABLAS DE PRODUCCIÓN

#### `produccion_lotes`
| Columna | Tipo | Descripción |
|---|---|---|
| id | UUID PK | |
| restaurante_id | UUID FK | |
| fecha | DATE DEFAULT CURRENT_DATE | |
| turno | TEXT | 'mañana' / 'tarde' / 'noche' |
| estado | TEXT | 'en_progreso' / 'completado' / 'cancelado' |
| responsable_id | UUID FK NULL → usuarios | |
| costo_total_lote | NUMERIC(12,2) NULL | Acumulado por producción |
| items_producidos | INTEGER DEFAULT 0 | |
| notas | TEXT NULL | |
| completado_en | TIMESTAMPTZ NULL | |
| UNIQUE | (restaurante_id, fecha, turno) | Un lote por turno por día |

#### `produccion_registros`
| Columna | Tipo | Descripción |
|---|---|---|
| id | UUID PK | |
| restaurante_id | UUID FK | |
| receta_id | UUID FK NULL → recetas | |
| producto_id | UUID FK NULL → productos | Para mise en place sin receta |
| lote_id | UUID FK NULL → produccion_lotes | |
| cantidad_producida | NUMERIC(12,3) | Porciones declaradas |
| unidad | TEXT | |
| cantidad_gramos | NUMERIC(14,3) NULL | |
| fecha_produccion | DATE | |
| turno | TEXT | |
| responsable_id | UUID FK NULL → usuarios | |
| porciones_reales | INTEGER NULL | Lo que realmente resultó |
| costo_produccion | NUMERIC(12,2) NULL | |
| costo_real | NUMERIC(12,2) NULL | Calculado por `registrar_produccion_completa()` |
| inventario_descontado | BOOLEAN DEFAULT false | |
| ingredientes_consumidos | JSONB NULL | Snapshot de lo descontado |
| notas | TEXT NULL | |

---

### TABLAS DE VENTAS

#### `ventas_importaciones`
| Columna | Tipo | Descripción |
|---|---|---|
| id | UUID PK | |
| restaurante_id | UUID FK | |
| fecha_inicio | DATE | Período cubierto |
| fecha_fin | DATE | |
| origen_sistema | TEXT NULL | 'fudo' / 'soft_restaurant' / 'otro' |
| archivo_url | TEXT NULL | Supabase Storage |
| estado_procesamiento | TEXT | 'pendiente' / 'procesando' / 'revision' / 'completado' / 'error' |
| total_registros | INTEGER DEFAULT 0 | |
| registros_normalizados | INTEGER DEFAULT 0 | |
| registros_pendientes | INTEGER DEFAULT 0 | |
| descuento_inventario_aplicado | BOOLEAN DEFAULT false | Idempotencia |
| descuento_aplicado_en | TIMESTAMPTZ NULL | |
| descuento_aplicado_por | UUID FK NULL → usuarios | |
| procesado_por | UUID FK NULL → usuarios | |

#### `ventas_items`
| Columna | Tipo | Descripción |
|---|---|---|
| id | UUID PK | |
| restaurante_id | UUID FK | |
| importacion_id | UUID FK NULL → ventas_importaciones | |
| nombre_original | TEXT | Exactamente como vino del POS: "Machas Parm" |
| nombre_normalizado | TEXT NULL | Resultado de IA: "Machas a la Parmesana" |
| confianza_match | NUMERIC(3,2) NULL | 0.00 a 1.00 |
| requiere_revision | BOOLEAN DEFAULT false | true si confianza < 0.85 |
| producto_id | UUID FK NULL → productos | |
| receta_id | UUID FK NULL → recetas | |
| cantidad_vendida | NUMERIC(12,3) | |
| precio_unitario | NUMERIC(12,2) | |
| total | NUMERIC(12,2) | |
| fecha_venta | DATE | |
| dia_semana | INTEGER NULL | 0=domingo … 6=sábado |
| hora_venta | TIME NULL | |
| comensales | INTEGER NULL | |
| inventario_descontado | BOOLEAN DEFAULT false | |

---

### TABLAS DE ANÁLISIS

#### `analisis_consumo`
| Columna | Tipo | Descripción |
|---|---|---|
| id | UUID PK | |
| restaurante_id | UUID FK | |
| producto_id | UUID FK → productos | |
| fecha_inicio | DATE | |
| fecha_fin | DATE | |
| periodo | TEXT | 'dia' / 'semana' / 'mes' |
| consumo_teorico_g | NUMERIC(14,3) | ventas × gramos de receta |
| consumo_real_g | NUMERIC(14,3) | movimientos de inventario |
| desviacion_g | NUMERIC(14,3) | real - teórico |
| desviacion_pct | NUMERIC(6,2) NULL | |
| costo_desviacion | NUMERIC(12,2) NULL | desviacion_g × costo_por_gramo |
| clasificacion | TEXT | 'normal' / 'leve' / 'moderada' / 'critica' / 'sin_datos' |
| causa_probable | TEXT NULL | Generado por IA |
| revisado | BOOLEAN DEFAULT false | |

**Trigger:** `trigger_alerta_desviacion` → cuando clasificacion IN ('moderada', 'critica'), INSERT en alertas_sistema

#### `inventario_snapshots`
| Columna | Tipo | Descripción |
|---|---|---|
| id | UUID PK | |
| restaurante_id | UUID FK | |
| producto_id | UUID FK | |
| fecha | DATE | |
| tipo_snapshot | TEXT | 'apertura' / 'cierre' / 'manual' |
| cantidad_gramos | NUMERIC(14,3) | |
| registrado_por | UUID FK NULL → usuarios | |
| UNIQUE | (restaurante_id, producto_id, fecha, tipo_snapshot) | |

---

### TABLAS DE SISTEMA

#### `alertas_sistema`
| Columna | Tipo | Descripción |
|---|---|---|
| id | UUID PK | |
| restaurante_id | UUID FK | |
| tipo | TEXT | 'stock_critico' / 'proximo_vencimiento' / 'variacion_precio' / 'produccion_sugerida' / 'compra_urgente' / 'merma_excesiva' / 'otro' |
| severidad | TEXT | 'critica' / 'alta' / 'media' / 'baja' |
| mensaje | TEXT | |
| datos | JSONB | Datos estructurados del contexto |
| leida | BOOLEAN DEFAULT false | |
| leida_por | UUID FK NULL → usuarios | |
| leida_en | TIMESTAMPTZ NULL | |
| referencia_id | UUID NULL | ID del objeto relacionado |
| referencia_tipo | TEXT NULL | 'producto' / 'receta' / 'analisis_consumo' |

#### `briefings`
| Columna | Tipo | Descripción |
|---|---|---|
| id | UUID PK | |
| restaurante_id | UUID FK | |
| fecha | DATE | |
| turno | TEXT | 'mañana' / 'tarde' / 'noche' |
| comensales_esperados | INTEGER NULL | |
| confianza_estimacion | TEXT NULL | 'alta' / 'media' / 'baja' |
| produccion_sugerida | JSONB DEFAULT '[]' | `[{nombre, cantidad, unidad, prioridad, razon}]` |
| compras_sugeridas | JSONB DEFAULT '[]' | `[{producto, cantidad_sugerida, unidad, urgencia, razon}]` |
| riesgos | JSONB DEFAULT '[]' | `[{tipo, descripcion, severidad, accion_sugerida}]` |
| alertas | JSONB DEFAULT '[]' | `[{tipo, mensaje}]` |
| actividad_reciente | JSONB DEFAULT '[]' | |
| contexto_usado | JSONB DEFAULT '{}' | Metadata del contexto IA |
| UNIQUE | (restaurante_id, fecha, turno) | Un briefing por turno por día |

#### `conversaciones_ia`
| Columna | Tipo | Descripción |
|---|---|---|
| id | UUID PK | |
| restaurante_id | UUID FK | |
| usuario_id | UUID FK → usuarios | |
| especialista | TEXT | 'tecnico' / 'ejecutivo' / 'instructor' |
| mensajes | JSONB DEFAULT '[]' | `[{rol, contenido, creado_en}]` |
| tokens_usados | INTEGER DEFAULT 0 | |
| activa | BOOLEAN DEFAULT true | |

---

## FUNCIONES SQL PÚBLICAS

### `mi_restaurante_id()` → UUID
Función auxiliar de RLS. Obtiene el `restaurante_id` del usuario autenticado.

### `convertir_a_gramos(cantidad, unidad, densidad?, peso_unitario?)` → NUMERIC
Convierte cualquier cantidad a gramos. `IMMUTABLE` — cacheable por PostgreSQL.

### `factor_gramos_por_unidad(unidad, densidad?, peso_unitario?)` → NUMERIC
Retorna el factor de conversión de una unidad a gramos (ej: 'kg' → 1000).

### `inicializar_restaurante(restaurante_id)` → VOID
Crea categorías y proveedor genérico al registrar un nuevo restaurante.

### `recalcular_costo_receta(receta_id)` → TABLE
Recalcula costo total, por porción y margen usando precios actuales. Marca `costo_desactualizado=false`.

### `escalar_receta(receta_id, porciones_objetivo)` → TABLE
Devuelve ingredientes escalados con cantidad en gramos, unidad display, cantidad display y costo por línea.

### `registrar_produccion_completa(restaurante_id, receta_id, porciones, responsable_id, lote_id?, turno?, notas?)` → TABLE
Función atómica: crea `produccion_registros` + genera `inventario_movimientos` por cada ingrediente + actualiza lote. Retorna `{produccion_id, costo_produccion, ingredientes_snap, stock_insuficiente}`.

### `descontar_inventario_por_ventas(importacion_id, usuario_id)` → TABLE
Descuenta inventario por todas las ventas confirmadas de una importación. Idempotente — verifica `descuento_inventario_aplicado`.

### `calcular_analisis_consumo(restaurante_id, fecha_inicio, fecha_fin, periodo)` → TABLE
Calcula consumo teórico vs real para todos los productos. Inserta en `analisis_consumo`.

---

## TRIGGERS — RESUMEN

| Trigger | Tabla | Evento | Función |
|---|---|---|---|
| `trigger_sincronizar_stock` | inventario_movimientos | AFTER INSERT | `sincronizar_stock()` → calcula cantidad/cantidad_antes/cantidad_despues (gramos y unidad de visualización) y actualiza productos.cantidad_gramos. Para tipo='ajuste', calcula el delta a partir del conteo físico absoluto recibido antes de persistir cantidad_gramos |
| `trigger_costo_merma` | mermas | BEFORE INSERT | `calcular_costo_merma()` → calcula costo_merma en gramos |
| `trigger_historial_precios` | productos | BEFORE UPDATE | `registrar_cambio_precio()` → INSERT historial_precios_producto |
| `trigger_costo_por_gramo` | productos | BEFORE INSERT/UPDATE | `actualizar_costo_por_gramo()` → calcula costo/gramo por factor de unidad |
| `trigger_marcar_costos_desactualizados` | productos | AFTER UPDATE (precio) | `marcar_recetas_desactualizadas()` → marca recetas afectadas |
| `trigger_margen_receta` | recetas | BEFORE INSERT/UPDATE | `calcular_margen_receta()` → calcula margen y costo_porcion |
| `trigger_versionar_receta` | recetas | BEFORE UPDATE (version_actual) | `guardar_version_receta()` → snapshot en recetas_versiones |
| `trigger_alerta_stock` | productos | AFTER UPDATE (stock_actual) | `generar_alerta_stock_critico()` → INSERT alertas_sistema |
| `trigger_alerta_desviacion` | analisis_consumo | AFTER INSERT/UPDATE | `alertar_desviacion_critica()` → INSERT alertas_sistema si moderada/critica |
| `trigger_timestamp_compras` | compras | BEFORE UPDATE | `actualizar_timestamp()` → actualizado_en = now() |
| `trigger_timestamp_proveedores` | proveedores | BEFORE UPDATE | `actualizar_timestamp()` → actualizado_en = now() |

---

## RLS — POLÍTICAS POR TABLA

**Principio arquitectónico documentado:** toda tabla debe operar con RLS y usar `mi_restaurante_id()` para aislamiento por tenant.

**Estado de verificación en este repositorio:** **NO DETERMINABLE CON LA EVIDENCIA ACTUAL**.

Distinción explícita:
- **Aislamiento implementado en código:** validaciones por `restaurante_id` en rutas API y contexto de sesión autenticada.
- **Aislamiento esperado por RLS:** definido en esta especificación.
- **Aislamiento realmente verificable en despliegue:** no demostrable desde este repositorio sin migraciones/policies ejecutables.

| Tabla | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| restaurantes | propio | ✗ | solo dueño | ✗ |
| usuarios | mismo restaurante | admins | propio perfil | admins |
| productos | mismo restaurante | chefs+ | chefs+ | chefs+ |
| recetas | activas mismo restaurante | chefs | chefs | chefs |
| recetas_ingredientes | via receta | chefs | chefs | chefs |
| recetas_pasos | mismo restaurante | chefs | chefs | chefs |
| mermas | chefs+ | todos | ✗ | ✗ |
| produccion_registros | todos | todos | ✗ | ✗ |
| compras | chefs+ | chefs+ | chefs+ | ✗ |
| ventas_items | dueño+admin+chef_ejec | service_role | service_role | ✗ |
| briefings | todos | service_role | service_role | ✗ |
| alertas_sistema | mismo restaurante | service_role/trigger | solo marcar leída | ✗ |
| conversaciones_ia | propio usuario | propio usuario | propio usuario | ✗ |

---

## ÍNDICES CRÍTICOS

```sql
-- Comparación de stock vs mínimo (filtro cliente-side)
idx_productos_stock ON productos(restaurante_id, cantidad_gramos, stock_minimo_gramos) WHERE activo=true

-- Normalización de nombres (trigrama)
idx_productos_nombre_trgm ON productos USING gin(nombre gin_trgm_ops) WHERE activo=true
idx_recetas_nombre_trgm   ON recetas USING gin(nombre gin_trgm_ops) WHERE activa=true

-- Ventas por fecha y día de semana
idx_ventas_restaurante_fecha ON ventas_items(restaurante_id, fecha_venta DESC)
idx_ventas_dia_semana         ON ventas_items(restaurante_id, dia_semana, fecha_venta DESC)

-- Briefing (query más crítica del sistema)
idx_briefings_fecha ON briefings(restaurante_id, fecha DESC, turno)

-- Alertas no leídas (partial index)
idx_alertas_no_leidas ON alertas_sistema(restaurante_id, leida, severidad, creado_en DESC) WHERE leida=false

-- Recetas con costo desactualizado (partial index)
idx_recetas_costo_desactualizado ON recetas(restaurante_id, costo_desactualizado) WHERE costo_desactualizado=true

-- Producción pendiente de descuento (partial index)
idx_produccion_pendiente_descuento ON produccion_registros(restaurante_id, inventario_descontado) WHERE inventario_descontado=false

-- Movimientos por producto
idx_movimientos_producto ON inventario_movimientos(restaurante_id, producto_id, creado_en DESC)

-- Compras por fecha
idx_compras_fecha    ON compras(restaurante_id, fecha_compra DESC)
idx_compras_proveedor ON compras(restaurante_id, proveedor_id, fecha_compra DESC)

-- Mapa de ingredientes afectados
idx_recetas_productos_afectados_producto ON recetas_productos_afectados(producto_id, restaurante_id)
```
