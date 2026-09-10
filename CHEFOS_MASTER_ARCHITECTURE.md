# CHEFOS — ARQUITECTURA MAESTRA
**Versión:** 1.0 — Sprint 3 completado  
**Estado:** Fuente de verdad permanente  
**Última actualización:** 09 de septiembre de 2026 (sincronización operativa y APK)

## ACTUALIZACIÓN DE CONTROL — 10-09-2026

- Supabase real: migraciones, Storage, Edge Functions y `pg_cron` activos.
- `chat-ia`, `generar-briefing` y `cierre-diario` publicados y probados con HTTP 200.
- Bloqueo actual: `/api/auth/session` todavía no consigue establecer las cookies SSR que necesita el middleware de Next.js después del login. El flujo Android/WebView queda pendiente.
- La APK entregada anteriormente no contiene todavía el último puente de sesión; debe reconstruirse después de resolver el bloqueo.
- La URL de backend sigue siendo un túnel HTTPS temporal.

## ESTADO ACTUAL DEL REPOSITORIO — 09-09-2026

La auditoría histórica de Sprint 3 que aparece debajo de esta nota ya no describe completamente el árbol actual. Actualmente existen el detalle y escalado de recetas, sus API, Chef IA básico sin coste, integración opcional con Claude, briefing manual, revisión avanzada de ventas, onboarding, snapshots, analítica, panel multi-restaurante, migraciones 001–005 y Edge Functions. La base de datos y Storage fueron desplegados y verificados contra el proyecto Supabase real de ChefOS; el despliegue remoto de Edge Functions y la activación de cron siguen siendo tareas externas.

### Handoff operativo vigente

- Proyecto Supabase: `nipovuqpxvsgeqdrszuq` — `https://nipovuqpxvsgeqdrszuq.supabase.co`.
- Migraciones `001_schema_base.sql` a `005_registro_inicial.sql`: aplicadas remotamente el 08-09-2026.
- Tablas principales y cuatro buckets de Storage verificados; `auth.users` está actualmente vacío.
- `005_registro_inicial.sql` crea restaurante, usuario propietario, relación y datos iniciales al registrarse un usuario nuevo.
- Chef IA básico no requiere `ANTHROPIC_API_KEY`; la clave es opcional para modo avanzado.
- Pendiente externo: desplegar las tres Edge Functions, ejecutar cron, crear el primer usuario y probar un flujo real.
- La APK debug actual está generada y apunta al túnel HTTPS temporal; para producción debe apuntar al backend HTTPS permanente. Ver `GITHUB_HANDOFF.md`.

---

## ESTADO DE VERIFICABILIDAD (POST-AUDITORÍA)

Las categorías históricas de esta sección se conservan para trazabilidad. Para el estado operativo actual prevalece “Handoff operativo vigente” y la verificación remota descrita allí.

- **A) IMPLEMENTADO Y VERIFICADO ESTÁTICAMENTE:** `/biblioteca`, `/biblioteca/nueva`, `BibliotecaCliente`, `RecetaForm`, `useRecetas`, `fetchRecetas`, `useRegistrarReceta`, `POST /api/biblioteca/recetas`.
- **B) IMPLEMENTADO PERO NO VERIFICADO EN RUNTIME:** ejecución real contra Supabase, alta E2E de recetas, comportamiento real de filtros/búsqueda en navegador.
- **C) Implementado en el estado actual:** `/biblioteca/[id]`, `RecetaDetalleCliente.tsx`, `EscaladoModal.tsx` y las APIs de costo/escalado; la edición dedicada y la validación E2E siguen pendientes.
- **D) Verificación externa pendiente:** las migraciones y políticas RLS están en `supabase/migrations` y se aplicaron al proyecto real; falta dejar una prueba E2E de aislamiento multi-tenant.
- **E) PLANIFICADO/FUTURO:** detalle/edición/escalado de recetas y validación runtime integral.

---

## 1. VISIÓN Y DEFINICIÓN

### Qué es ChefOS
Plataforma de **inteligencia operativa para restaurantes**. No es un POS, no es software de facturación, no es contabilidad. Es el "Sous Chef Administrativo Digital" que convierte datos operativos en decisiones accionables.

### Problema que resuelve
Los restaurantes tienen datos pero los chefs no tienen tiempo de analizarlos. Las decisiones se toman por experiencia personal. Cuando el chef se va, el conocimiento desaparece. ChefOS es la **memoria operativa del restaurante**.

### Cliente
El cliente que paga es el **restaurante** (no el chef individual). El conocimiento es institucional, no personal.

### Usuario principal
Chef Ejecutivo en Android. Trabaja en cocina, poco tiempo, gestiona brigadas, revisa análisis desde casa.

### Objetivo MVP en 30 segundos
Al abrir ChefOS a las 08:00 AM el chef debe saber: qué producir, qué comprar, qué riesgos existen, qué problemas resolver hoy.

---

## 2. STACK TECNOLÓGICO — DECISIONES DEFINITIVAS

### Frontend
- **Next.js 14.2.3** con App Router (no Pages Router)
- **TypeScript** modo estricto (`strict: true`)
- **TailwindCSS 3.4** con sistema de tokens personalizado
- **`clsx`** para clases condicionales (no `tailwind-merge` — no se usa)
- **`@tanstack/react-query` v5** para caché y estado de servidor
- **`sonner`** para toasts
- **`lucide-react`** para iconos
- **`date-fns`** para fechas (no `date-fns-tz` — no se usa)
- **`@ducanh2912/next-pwa`** para PWA (no `next-pwa` 5.x — incompatible con Next 14)

### Backend
- **Supabase** (PostgreSQL + Auth + Storage + Realtime + Edge Functions)
- **`@supabase/supabase-js`** v2 + **`@supabase/ssr`** para SSR
- Row Level Security documentado como estrategia objetivo en **todas** las tablas; verificación efectiva en este repositorio: **NO DETERMINABLE CON LA EVIDENCIA ACTUAL**

### IA
- **Claude API** (Anthropic) como proveedor primario
- Abstracción de proveedor preparada para OpenAI como alternativa
- Las llamadas a Claude **solo ocurren en Edge Functions / API Routes** — nunca en el cliente

### PWA
- Instalable en Android como app nativa
- Service Worker con caché agresivo de recetas para offline
- Cola de acciones offline en **IndexedDB** (mermas y producción)

---

## 3. ARQUITECTURA DE CAPAS

```
CAPA 1 — PRESENTACIÓN
  Next.js 14 App Router
  Server Components (SSR de datos iniciales)
  Client Components (interactividad, hooks, estado)
  PWA + Service Worker

CAPA 2 — ESTADO CLIENTE
  React Query (caché, stale-while-revalidate, invalidación)
  AppProvider (contexto global: usuario, alertas, online/offline)
  Cola IndexedDB (acciones pendientes sin conexión)

CAPA 3 — API
  Next.js API Routes (BFF — proxy seguro entre cliente y Supabase)
  Supabase Edge Functions (lógica pesada, IA, crons)

CAPA 4 — DATOS
  PostgreSQL (Supabase)
  Row Level Security (multi-tenant por restaurante_id)
  Triggers y funciones SQL (lógica de negocio en BD)

CAPA 5 — INTELIGENCIA
  Claude API (Chef Técnico, Chef Ejecutivo, Chef Instructor)
  Motor de Normalización (NLP para nombres de ventas)
  Motor de Briefing (recomendaciones matutinas)
```

---

## 4. MULTI-TENANT — DECISIÓN DEFINITIVA

**Patrón:** Shared Database, Shared Schema, Row Level Security.

Cada tabla tiene `restaurante_id UUID NOT NULL`. La función SQL `mi_restaurante_id()` es el único punto de control:

```sql
CREATE OR REPLACE FUNCTION mi_restaurante_id()
RETURNS UUID AS $$
  SELECT restaurante_id FROM usuarios WHERE id = auth.uid() LIMIT 1
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

Todas las políticas RLS están documentadas para usar esta función.  
**Estado de verificación en este repositorio:** **NO DETERMINABLE CON LA EVIDENCIA ACTUAL** (no hay migraciones/policies ejecutables en el árbol auditado).

---

## 5. SISTEMA UNIVERSAL DE GRAMOS — DECISIÓN 2

**Todo el motor interno opera en gramos.** Sin excepciones.

### Regla
- La UI acepta: `g`, `kg`, `lt`, `ml`, `unidad`, `docena`, `caja`, `bandeja`
- El motor almacena: **gramos siempre**
- La UI muestra: la `unidad_display` preferida del producto

### Campos en base de datos
Toda tabla operativa tiene columnas `_gramos`:
- `productos.cantidad_gramos` — stock en gramos
- `productos.stock_minimo_gramos` — mínimo en gramos
- `productos.costo_por_gramo` — precio por gramo (calculado por trigger)
- `recetas_ingredientes.cantidad_gramos` — canónico del motor
- `mermas.cantidad_gramos`
- `compras_items.cantidad_gramos`
- `inventario_movimientos.cantidad_gramos`

### Conversión de líquidos
Tabla `densidades_producto` con 22 densidades estándar precargadas:
- Crema de leche: 1.003 g/ml
- Aceite de oliva: 0.916 g/ml
- Vino blanco: 0.994 g/ml
- Caldo de pescado: 1.01 g/ml
(etc.)

### Corrección crítica (migración 005)
El trigger `costo_por_gramo` fue corregido. La fórmula correcta es:
```
costo_por_gramo = costo_unitario_actual / factor_unidad_a_gramos(unidad_medida)
```
No `costo_unitario_actual / stock_actual` (bug original).

---

## 6. SISTEMA DE COSTOS DESACTUALIZADOS — DECISIÓN 3

Cuando cambia el precio de un producto:
1. Trigger `marcar_recetas_desactualizadas()` se dispara
2. Marca `recetas.costo_desactualizado = true` en todas las recetas que usan ese producto
3. La UI muestra badge naranja "Costo desactualizado"
4. El recálculo es **lazy** (al abrir la receta o via función `recalcular_costo_receta()`)
5. La tabla `recetas_productos_afectados` mantiene el mapa precalculado receta→producto

---

## 7. DESCUENTO AUTOMÁTICO DE INVENTARIO — DECISIÓN 1

Flujo al confirmar importación de ventas:
```
ventas normalizadas y confirmadas
  → función SQL descontar_inventario_por_ventas(importacion_id, usuario_id)
  → para cada venta con receta_id confirmada:
      factor = porciones_vendidas / rendimiento_receta
      para cada ingrediente:
        gramos_a_descontar = cantidad_gramos_ingrediente × factor
        INSERT inventario_movimientos (tipo='salida', referencia_tipo='venta')
        trigger sincronizar_stock → actualiza productos.cantidad_gramos
  → ventas_items.inventario_descontado = true
  → ventas_importaciones.descuento_inventario_aplicado = true (idempotencia)
```

Si el stock queda negativo, se registra en `stock_insuficiente` pero **no se aborta**. El sistema continúa y genera alertas.

---

## 8. CONSUMO TEÓRICO VS REAL — NUEVA FUNCIONALIDAD

Función `calcular_analisis_consumo(restaurante_id, fecha_inicio, fecha_fin, periodo)`:

- **Consumo teórico**: ventas × gramos de receta (lo que debería haberse usado)
- **Consumo real**: suma de `inventario_movimientos` tipo salida/merma/produccion

Clasificación de desviación:
| Rango | Clasificación |
|---|---|
| < 5% | `normal` |
| 5–10% | `leve` |
| 10–20% | `moderada` |
| > 20% | `critica` |

Cuando clasificación es `moderada` o `critica`: trigger genera alerta automáticamente.

---

## 9. NAVEGACIÓN — ESTRUCTURA DEFINITIVA

### Rutas autenticadas (bajo `/(autenticado)/layout.tsx`)
```
/dashboard             → Chef Briefing — pantalla principal
/biblioteca            → Lista de recetas
/biblioteca/nueva      → Crear receta
/produccion            → Lote activo / abrir lote
/produccion/[loteId]   → Detalle del lote
/inventario            → Lista de productos
/inventario/[id]       → Detalle de producto + movimientos + ajuste
/mermas/nueva          → Registrar merma (3 pasos)
/compras               → Lista de compras
/compras/nueva         → Nueva compra
/compras/[id]          → Detalle compra
/alertas               → Centro de alertas
/configuracion         → Hub de configuración
/configuracion/perfil  → Perfil del usuario
/ventas                → Solo admin/dueño
/ventas/importar       → Importar archivo de ventas
```

**No implementado actualmente (C):**
- `/biblioteca/[id]`
- `/biblioteca/[id]/editar`

### Bottom Navigation (5 ítems)
1. **Inicio** (`/dashboard`) — LayoutDashboard
2. **Recetas** (`/biblioteca`) — BookOpen
3. **Producción** (`/produccion`) — FlameKindling — **botón central destacado**
4. **Inventario** (`/inventario`) — Boxes
5. **Alertas** (`/alertas`) — Bell + badge dinámico

### Redirect raíz
`/` → `/dashboard` (middleware)  
`/briefing` → eliminado, redirige via middleware

---

## 10. PERMISOS POR ROL — TABLA DEFINITIVA

| Acción | Dueño | Admin | Chef Ejec. | Chef Cocina | Cocinero |
|---|---|---|---|---|---|
| Ver dashboard | ✓ | ✓ | ✓ | ✓ | ✓ |
| Ver recetas activas | ✓ | ✓ | ✓ | ✓ | ✓ |
| Ver costos/márgenes | ✓ | ✓ | ✓ | ✓ | ✗ |
| Crear/editar recetas | ✓ | ✗ | ✓ | ✓ | ✗ |
| Registrar producción | ✓ | ✓ | ✓ | ✓ | ✓ |
| Registrar merma | ✓ | ✓ | ✓ | ✓ | ✓ |
| Ver historial mermas | ✓ | ✓ | ✓ | ✓ | ✗ |
| Ver/editar inventario | ✓ | ✓ | ✓ | ✓ | ver solo |
| Ajustar stock | ✓ | ✓ | ✓ | ✓ | ✗ |
| Ver compras | ✓ | ✓ | ✓ | ✗ | ✗ |
| Registrar compras | ✓ | ✓ | ✓ | ✗ | ✗ |
| Ver/importar ventas | ✓ | ✓ | ✗ | ✗ | ✗ |
| Usar Chef IA | ✓ | ✓ | ✓ | ✓ | ✓ |
| Configurar restaurante | ✓ | ✗ | ✗ | ✗ | ✗ |
| Gestionar usuarios | ✓ | ✓ | ✗ | ✗ | ✗ |

---

## 11. ESTRATEGIA DE ESTADO CLIENTE

### AppProvider (contexto global)
- Usuario activo y su `restaurante_id`
- `alertasNoLeidas[]` (actualizado via Realtime)
- `totalAlertas` (número de alertas no leídas)
- `estaOnline` (estado de conexión)
- `accionesPendientes` (cola offline)
- Funciones: `marcarAlertaLeida`, `agregarAccionPendiente`, `reducirAccionPendiente`
- Sincronizador offline integrado (se ejecuta 1.5s después de recuperar red)

### React Query
- `staleTime` por dominio:
  - Inventario: 30s (cambia en tiempo real)
  - Producción: 15s (durante el turno)
  - Alertas: 60s
  - Categorías: 15min (cambia poco)
- `refetchOnWindowFocus: false` — cocinas no deben ver re-fetches inesperados
- `refetchOnReconnect: true` — crítico para sincronización offline

### Helper `useRid()`
```typescript
function useRid(): string {
  const { usuario } = useApp()
  return usuario?.restaurante_id ?? ''
}
```
Todos los hooks de dominio usan `useRid()` para evitar `usuario!` (non-null assertion) que causaría crash si el usuario es `null`. Los `queryKey` se evalúan antes del guard `enabled: !!usuario`.

---

## 12. ESTRATEGIA OFFLINE

### Qué funciona offline
- Consulta de recetas (Service Worker caché)
- Registro de mermas (cola IndexedDB)
- Registro de producción (cola IndexedDB)
- Ajuste de inventario (cola IndexedDB)

### Cola offline (`src/lib/offline/cola.ts`)
- Persiste en **IndexedDB** (no localStorage)
- Tipos: `registrar_merma`, `registrar_produccion`, `ajuste_inventario`
- Prioridad de sincronización al reconectar: mermas → producción → ajustes
- Máximo 3 intentos fallidos antes de abandonar una acción
- Guard SSR: `if (typeof window === 'undefined' || !window.indexedDB) return`

### Indicadores visuales
- Punto verde/amarillo en header (conectado/desconectado)
- Banner amarillo cuando offline con contador de pendientes
- Items con `_pendiente: true` muestran estado visual diferente

---

## 13. REALTIME — CANALES SUPABASE

Cuatro canales por restaurante en AppProvider:

| Canal | Evento | Tabla | Qué invalida |
|---|---|---|---|
| `alertas:{rid}` | INSERT | `alertas_sistema` | Badges + lista alertas |
| `alertas:{rid}` | UPDATE | `alertas_sistema` | Eliminar alertas leídas |
| `inventario:{rid}` | UPDATE | `productos` | Query inventario |
| `produccion:{rid}` | INSERT | `produccion_registros` | Query producción + lote activo |

Todos los canales tienen cleanup `supabase.removeChannel(canal)` en el return del useEffect.

---

## 14. PATTERN SERVER / CLIENT COMPONENTS

### Regla general
- **Páginas (`page.tsx`)**: Server Components — cargan datos con `crearClienteServidor()`
- **Componentes interactivos**: Client Components — usan hooks, estado, eventos

### Patrón estándar
```
PaginaX (Server) → pre-carga datos con Supabase SSR
  └── XCliente (Client) → recibe datos como props iniciales
        └── useQuery con placeholder: data = xIniciales
```

Los datos del servidor se pasan como `xIniciales` al cliente. React Query los usa como placeholder mientras carga datos frescos. Resultado: **zero loading state en primera carga**.

### Restricciones
- `crearClienteServidor()` solo en Server Components y API Routes
- `obtenerClienteNavegador()` solo en Client Components
- `'use client'` requerido en todo componente que usa hooks o eventos
- `cookies()` de `next/headers` solo en Server Components

---

## 15. API ROUTES — CONTRATOS

Todas las API Routes verifican autenticación con `crearClienteServidor()` y validan que el `restaurante_id` del JWT coincida con el recurso solicitado.

| Método | Ruta | Función |
|---|---|---|
| POST | `/api/produccion` | Llama `registrar_produccion_completa()` SQL |
| POST | `/api/produccion/lotes` | Crear lote del día |
| POST | `/api/produccion/lotes/[id]/cerrar` | Cambiar estado a 'completado' |
| POST | `/api/mermas` | Registrar merma + movimiento inventario |
| POST | `/api/inventario/movimientos` | Ajuste manual de stock |
| POST | `/api/biblioteca/recetas` | Crear receta completa + ingredientes + pasos + mapa afectados + RPC `recalcular_costo_receta()` |

**Referencias históricas no implementadas en el repo actual (C):**
- `POST /api/biblioteca/recetas/[id]/costo`
- `POST /api/biblioteca/recetas/[id]/escalar`
- `GET /api/biblioteca/recetas` como API Route (la lectura actual de recetas se hace vía `fetchRecetas()` desde cliente).

---

## 16. FLUJO PRINCIPAL — DE PUNTA A PUNTA

```
CREAR RECETA
  RecetaForm → fetch POST /api/biblioteca/recetas
             → INSERT recetas
             → INSERT recetas_ingredientes (con cantidad_gramos)
             → INSERT recetas_pasos
             → INSERT recetas_productos_afectados (mapa agregado por producto_id)
             → rpc('recalcular_costo_receta')
             → SELECT receta actualizada (respuesta 201)

REGISTRAR PRODUCCIÓN
  ProduccionCliente → fetch POST /api/produccion
                    → rpc('registrar_produccion_completa')
                    → INSERT produccion_registros
                    → LOOP ingredientes:
                        v_cantidad_g = ing.cantidad_gramos × factor
                        INSERT inventario_movimientos (tipo='produccion')
                        trigger sincronizar_stock → UPDATE productos.cantidad_gramos
                    → UPDATE produccion_registros (costo_real, inventario_descontado=true)
                    → UPDATE produccion_lotes (costo_total_lote++)

VER INVENTARIO ACTUALIZADO
  InventarioCliente → useInventario() → fetchInventario()
                    → Supabase SELECT productos con cantidad_gramos actualizado
                    → Realtime invalida query si llega UPDATE en productos

REGISTRAR MERMA
  MermaFormCliente → useRegistrarMerma() → fetch POST /api/mermas
                   → convertirAGramos(cantidad, unidad, densidad)
                   → INSERT mermas (trigger calcula costo_merma)
                   → INSERT inventario_movimientos (tipo='merma')
                   → trigger sincronizar_stock → UPDATE productos.cantidad_gramos
                   → trigger alerta_stock → INSERT alertas_sistema si stock < minimo

VER ALERTAS
  AppProvider Realtime → INSERT alertas_sistema detectado
                       → setAlertasNoLeidas([nueva, ...prev])
                       → badge actualizado en HeaderApp y BottomNav
```

**Limitación de validación:** flujo implementado y compilable, **no verificado en runtime end-to-end** en esta auditoría.

---

## 17. SISTEMA DE DISEÑO

### Paleta de colores (tokens Tailwind)
```
fondo-base:    #080808   fondo-card:    #111111
fondo-elevado: #1A1A1A   fondo-borde:   #242424
texto-primario: #F2EFE8  texto-secundario: #8C8880
texto-apagado:  #4A4845
acento:        #E07B39   (naranja fuego)
exito:         #4CAF82   (verde hierbas)
advertencia:   #D4A843   (amarillo)
peligro:       #D44343   (rojo)
info:          #4385D4   (azul acero)
```

### Tipografía
- Display: `Syne` (identidad, títulos)
- Body: `DM Sans` (legibilidad mobile)
- Datos/números: `JetBrains Mono` (tabular)

### Principios UX para cocina
- Touch target mínimo: 48×48px
- Teclado numérico (`inputMode="decimal"`) en todos los campos de cantidad
- Recientes en mermas (localStorage) — reducir búsqueda a 1 toque
- Listas de motivos como grid de botones grandes — no selects
- Skeletons mientras carga, nunca spinners bloqueantes
- Optimistic updates en mermas para feedback instantáneo
- Pull-to-refresh en listas largas

---

## 18. CORRECCIONES CRÍTICAS APLICADAS EN AUDITORÍA

Las siguientes correcciones se aplicaron durante la auditoría del Sprint 3 y deben incluirse en cualquier reconstrucción:

1. **`@tanstack/react-query`** agregado a `package.json` (faltaba completamente)
2. **`database.types.ts`** creado como placeholder — reemplazar con `supabase gen types`
3. **`next-pwa`** reemplazado por `@ducanh2912/next-pwa` (incompatibilidad con Next 14)
4. **`next.config.js`** — `serverComponentsExternalPackages` → `serverExternalPackages`
5. **`useDominio.ts`** — eliminados todos los `usuario!` con helper `useRid()`
6. **`fetchStockCritico`** — eliminado `.raw()` inválido, filtrado en cliente
7. **`crearClienteAdmin`** — eliminado `require()` dinámico, import estático
8. **`RecetaForm`** — interfaz `RecetaForm` renombrada a `FormDatosReceta` (colisión de nombres)
9. **`mermas/route.ts`** — validación de `conversion.gramos === null` con variable tipada `number`
10. **`AppProvider`** — banner offline duplicado eliminado (solo en LayoutApp)
11. **`cola.ts`** — guard SSR `typeof window === 'undefined'` para IndexedDB
12. **`auth/callback/route.ts`** — redirect de `/briefing` a `/dashboard`
13. **`/dashboard`** — redirect raíz corregido en middleware y callback
14. **Dependencias eliminadas**: `@radix-ui/*`, `zod`, `react-hook-form`, `tailwind-merge`, `date-fns-tz`
15. **Migración 005** — corrección del trigger `costo_por_gramo` (usaba stock en lugar de factor de unidad)

16. **`src/components/ui/index.tsx`** — archivo desalineado con el contrato documental anterior de “catálogo UI”; actualmente contiene código de hooks de dominio.
