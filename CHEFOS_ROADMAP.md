# CHEFOS — ROADMAP MAESTRO
**Versión:** 1.0 — Sprint 3 completado  
**Estado:** Fuente de verdad permanente  
**Última actualización:** Mayo 2025

---

## ESTADO ACTUAL DEL PROYECTO

### Sprint 0 — Arquitectura ✅ COMPLETADO
### Sprint 1 — Fundación Backend ✅ COMPLETADO  
### Sprint 2 — Motor Gastronómico ✅ COMPLETADO  
### Sprint 3 — Frontend Operacional ✅ COMPLETADO (con auditoría)  
### Sprint 4 — Briefing IA → PENDIENTE  
### Sprint 5 — Ventas e Importación → PENDIENTE  
### Sprint 6 — Multi-restaurante → PENDIENTE  

---

## SPRINT 0 — ARQUITECTURA ✅

### Entregables completados
- Arquitectura completa del sistema documentada
- Modelo Entidad-Relación (ERD) completo
- Diseño de base de datos (20 tablas)
- Wireframes móviles de los 9 módulos principales
- Estructura de navegación completa
- Flujos de usuario documentados
- Arquitectura de IA (3 especialistas)
- APIs necesarias definidas
- Roadmap de desarrollo
- Análisis de riesgos técnicos
- Estrategia de escalabilidad
- Estrategia multi-restaurante

### Decisiones tomadas en Sprint 0
- **Stack:** Next.js 14 + Supabase + Claude API
- **Patrón multi-tenant:** Shared schema + RLS (no bases de datos separadas)
- **PWA:** Instalable en Android, no App Store
- **Usuario principal:** Chef Ejecutivo en Android
- **Metáfora:** "Sous Chef Administrativo Digital"

---

## SPRINT 1 — FUNDACIÓN BACKEND ✅

### Entregables completados

**Configuración del proyecto:**
- `package.json` con dependencias limpias
- `tsconfig.json` con paths aliases
- `next.config.js` con PWA y optimizaciones
- `tailwind.config.ts` con sistema de diseño completo
- `postcss.config.js`
- `.eslintrc.json`
- `.gitignore`
- `.env.example`
- `public/manifest.json`

**Sistema de tipos TypeScript:**
- `src/types/index.ts` — todas las entidades del dominio
- `src/types/database.types.ts` — placeholder (reemplazar con `supabase gen types`)

**Infraestructura Supabase:**
- `src/lib/supabase/servidor.ts` — cliente SSR para Server Components
- `src/lib/supabase/navegador.ts` — cliente para Client Components

**Autenticación:**
- `src/middleware.ts` — protección de rutas + refresh de token
- `src/app/auth/login/page.tsx` — login con email/password y magic link
- `src/app/auth/callback/route.ts` — callback OAuth y magic link
- `src/hooks/useAuth.ts` — hook de autenticación (dead code — funcionalidad en AppProvider)

**Base de datos:**
- `supabase/migrations/001_schema_base.sql` — 20 tablas + triggers + RLS + índices
- `supabase/migrations/002_funciones_negocio.sql` — onboarding, alertas de stock, seed

### Decisiones tomadas en Sprint 1
- **Auth:** Supabase Auth con JWT + RLS — no se implementa auth propio
- **Middleware:** Verifica sesión en CADA request — refresca token automáticamente
- **Tipos:** Dominio en `types/index.ts`, BD en `database.types.ts` separados
- **Dark mode:** Forzado por defecto (`class="dark"` en html root) — no toggle
- **Colores:** Paleta propia (naranja fuego, negro profundo) — no preset de Tailwind

---

## SPRINT 2 — MOTOR GASTRONÓMICO ✅

### Entregables completados

**Decisiones arquitectónicas fundamentales:**
- **Decisión 1:** Descuento automático de inventario al confirmar ventas
- **Decisión 2:** Sistema universal de gramos — todo el motor interno en gramos
- **Decisión 3:** Sistema de `costo_desactualizado` — recálculo lazy

**Nueva funcionalidad:**
- Análisis de consumo teórico vs real
- Motor de detección de desviaciones

**Base de datos:**
- `supabase/migrations/003_arquitectura_decisiones.sql` — gramos, costos, consumo teórico
- `supabase/migrations/004_biblioteca_culinaria.sql` — pasos, fotos, producción por lotes, escalado

**Funciones SQL críticas:**
- `convertir_a_gramos()` — conversión universal
- `factor_gramos_por_unidad()` — factor por tipo de unidad
- `recalcular_costo_receta()` — costeo con precios actuales
- `escalar_receta()` — escalado a N porciones
- `registrar_produccion_completa()` — atómica: producción + descuento inventario
- `descontar_inventario_por_ventas()` — descuento batch por importación
- `calcular_analisis_consumo()` — teórico vs real

### Decisiones tomadas en Sprint 2
- **Unidad base:** GRAMOS — sin excepciones, el motor nunca ve kg, lt ni unidades
- **Costo por gramo:** `costo_unitario / factor_unidad` (NO stock — bug corregido en migración 005)
- **Producción:** Atómica en SQL — todo o nada, si falla hace rollback completo
- **Stock negativo:** Permitido como advertencia — no bloquea la operación
- **Normalización POS:** Umbral de confianza 0.85 — por debajo requiere revisión manual

---

## SPRINT 3 — FRONTEND OPERACIONAL ✅

### Entregables completados

**Estado global y sincronización:**
- `src/providers/AppProvider.tsx` — QueryClient + contexto + Realtime + sincronizador offline
- `src/lib/offline/cola.ts` — cola IndexedDB para acciones sin conexión
- `src/hooks/useDominio.ts` — todos los hooks de React Query del dominio

**Queries y caché:**
- `src/lib/queries/index.ts` — query keys + fetch functions para todos los dominios

**Layout y navegación:**
- `src/app/(autenticado)/layout.tsx` — layout Server Component con SSR
- `src/components/layout/LayoutApp.tsx` — bottom nav + banner offline
- `src/components/layout/HeaderApp.tsx` — header con badge dinámico de alertas

**Dashboard:**
- `src/app/(autenticado)/dashboard/page.tsx` — Server Component
- `src/components/dashboard/DashboardCliente.tsx` — KPIs, alertas, stock crítico, acciones rápidas

**Biblioteca Culinaria:**
- `src/app/(autenticado)/biblioteca/page.tsx`
- `src/app/(autenticado)/biblioteca/nueva/page.tsx`
- `src/app/(autenticado)/biblioteca/[id]/page.tsx`
- `src/app/(autenticado)/biblioteca/[id]/editar/page.tsx`
- `src/components/biblioteca/BibliotecaCliente.tsx` — lista con filtros y búsqueda
- `src/components/biblioteca/RecetaDetalleCliente.tsx` — detalle completo
- `src/components/biblioteca/RecetaForm.tsx` — crear/editar con ingredientes y pasos
- `src/components/biblioteca/EscaladoModal.tsx` — escalado a N porciones

**Producción:**
- `src/app/(autenticado)/produccion/page.tsx`
- `src/components/produccion/ProduccionCliente.tsx` — wizard: abrir lote → seleccionar → configurar → confirmar

**Inventario:**
- `src/app/(autenticado)/inventario/page.tsx`
- `src/app/(autenticado)/inventario/[id]/page.tsx`
- `src/components/inventario/InventarioCliente.tsx` — lista con filtros y stock crítico
- `src/components/inventario/ProductoDetalleCliente.tsx` — detalle + historial + ajuste

**Mermas:**
- `src/app/(autenticado)/mermas/nueva/page.tsx`
- `src/components/mermas/MermaFormCliente.tsx` — 3 pasos: producto → cantidad → motivo

**Alertas:**
- `src/app/(autenticado)/alertas/page.tsx`
- `src/components/alertas/AlertasCliente.tsx` — lista con filtros y acciones

**Configuración:**
- `src/app/(autenticado)/configuracion/page.tsx` — hub de configuración
- `src/app/(autenticado)/configuracion/perfil/page.tsx`
- `src/components/configuracion/PerfilCliente.tsx`

**UI Components:**
- `src/components/ui/index.tsx` — GramInput, StockBadge, BarraStock, MarginBadge, KPICard, SkeletonCard, SkeletonLista, EmptyState, ErrorInline, PullToRefresh

**API Routes:**
- `src/app/api/produccion/route.ts`
- `src/app/api/produccion/lotes/route.ts`
- `src/app/api/produccion/lotes/[id]/cerrar/route.ts`
- `src/app/api/mermas/route.ts`
- `src/app/api/inventario/movimientos/route.ts`
- `src/app/api/biblioteca/recetas/route.ts`
- `src/app/api/biblioteca/recetas/[id]/costo/route.ts`
- `src/app/api/biblioteca/recetas/[id]/escalar/route.ts`

**Estilos:**
- `src/styles/globals.css` — variables CSS, componentes base, utilidades

**Sistema:**
- `src/app/layout.tsx` — root layout con fuentes, Toaster, PWA
- `src/app/not-found.tsx`
- `src/app/(autenticado)/page.tsx` — redirect a /dashboard
- `src/middleware.ts` — protección de rutas, roles, redirects

**Migración correctiva:**
- `supabase/migrations/005_correccion_costo_por_gramo.sql`

### Correcciones aplicadas en auditoría Sprint 3
Ver sección completa en `CHEFOS_MASTER_ARCHITECTURE.md` §18

### Decisiones tomadas en Sprint 3
- **Helper `useRid()`:** Todos los hooks usan `usuario?.restaurante_id ?? ''` — nunca `usuario!`
- **Patrón SSR + placeholder:** Server Components pre-cargan datos, React Query los usa como `initialData`
- **Sin Radix UI:** Los componentes se construyen con Tailwind + clsx — sin librería de primitivos
- **Sin zod:** Validaciones manuales en formularios — suficiente para el MVP
- **Sincronizador offline integrado en AppProvider** — no como hook separado
- **Dependencias eliminadas:** next-pwa, @radix-ui/*, zod, react-hook-form, tailwind-merge, date-fns-tz
- **`@ducanh2912/next-pwa`** reemplaza `next-pwa` 5.x (incompatible con Next 14)

---

## FLUJO PRINCIPAL — ESTADO COMPLETO

```
crear receta      → RecetaForm → Supabase → recalcular_costo_receta()      ✅
escalar receta    → EscaladoModal → /api/escalar → escalar_receta() SQL    ✅
registrar prod.   → ProduccionCliente → /api/produccion → SQL atómica      ✅
descontar stock   → registrar_produccion_completa() → inventario_movimientos ✅
ver inventario    → InventarioCliente → useInventario() → Realtime          ✅
registrar merma   → MermaFormCliente → /api/mermas → movimiento + alerta    ✅
ver alertas       → AlertasCliente → AppProvider Realtime → badge            ✅
```

---

## SPRINT 4 — BRIEFING IA (PENDIENTE)

### Objetivo
Cuando el chef abra ChefOS a las 08:00 AM, en menos de 30 segundos debe saber: qué producir, qué comprar, qué riesgos existen, qué problemas resolver hoy.

### Entregables planificados

**Edge Functions Supabase (Deno):**
- `supabase/functions/generar-briefing/index.ts`
  - Recopila contexto: ventas 4 semanas, stock, mermas 7 días, producción ayer
  - Llama Claude API con prompt estructurado
  - Guarda en tabla `briefings` (caché del día)
  - Retorna JSON estructurado

- `supabase/functions/chat-ia/index.ts`
  - Tres especialistas: técnico, ejecutivo, instructor
  - Inyecta contexto real del restaurante en cada llamada
  - Persiste en `conversaciones_ia`
  - Verifica límites de uso por plan

- `supabase/functions/cierre-diario/index.ts`
  - Agrega ventas, mermas, producción del día
  - Llama Claude API para análisis y recomendaciones
  - Guarda en briefings como turno 'noche'

**Cron Jobs:**
- 06:00 AM → generar-briefing para todos los restaurantes activos
- 23:00 PM → trigger de cierre inteligente

**Frontend:**
- Módulo Chef IA con 3 tabs (técnico / ejecutivo / instructor)
- Cierre Inteligente — resumen del día
- Mejorar dashboard con datos reales del briefing

**System prompts:**
- Chef Técnico: cocina chilena, mariscos, química gastronómica
- Chef Ejecutivo: costos, rentabilidad, decisiones operativas
- Chef Instructor: capacitación, evaluación, procedimientos

### Prioridad de implementación Sprint 4
1. Edge Function `generar-briefing` con Claude API
2. Página `/briefing` mejorada (actualmente `/dashboard`)
3. Edge Function `chat-ia`
4. UI del chat con 3 especialistas
5. Cierre inteligente
6. Cron jobs

---

## SPRINT 5 — VENTAS E IMPORTACIÓN (PENDIENTE)

### Objetivo
Importar reportes del POS (Fudo, Soft Restaurant), normalizar nombres de platos con IA, confirmar y descontar inventario automáticamente.

### Entregables planificados

**Edge Functions:**
- `supabase/functions/normalizar-ventas/index.ts`
  - Motor de normalización con pg_trgm + Claude API como árbitro
  - Umbral de confianza 0.85
  - Procesa en batch — no una llamada por ítem

- `supabase/functions/importar-ventas/index.ts`
  - Parsers para CSV, Excel, PDF (Claude API para no estructurados)
  - Detección automática del formato
  - Estado: pendiente → procesando → revision → completado

**Frontend:**
- `src/app/(autenticado)/ventas/page.tsx` — historial de importaciones
- `src/app/(autenticado)/ventas/importar/page.tsx` — upload de archivo
- `src/app/(autenticado)/ventas/[id]/page.tsx` — revisión de normalización
  - Lista de items con confianza < 0.85
  - Interfaz de confirmación/corrección 1 toque
  - Botón "Confirmar y descontar inventario"

**Flujo completo:**
```
Upload archivo → Edge Function parsea → normalización IA →
revisión manual (items dudosos) → confirmación →
descontar_inventario_por_ventas() → stock actualizado →
briefing recalculado
```

### Decisiones pendientes Sprint 5
- ¿Soportar Google Sheets en MVP o fase 3?
- ¿Límite de registros por importación por plan?
- ¿Qué hacer con ventas sin match (confianza < 0.5)?

---

## SPRINT 6 — COMPRAS INTELIGENTES (PENDIENTE)

### Objetivo
Módulo completo de compras con historial de precios, tendencias y detección de variaciones anómalas.

### Entregables planificados

**Frontend:**
- `src/app/(autenticado)/compras/page.tsx` — lista de compras
- `src/app/(autenticado)/compras/nueva/page.tsx` — formulario de nueva compra
- `src/app/(autenticado)/compras/[id]/page.tsx` — detalle con items
- `src/app/(autenticado)/compras/proveedores/page.tsx` — directorio de proveedores

**Funcionalidades:**
- Historial de precios por producto con gráfico de tendencia
- Alerta de variación de precio > 10% vs última compra
- Cámara para foto de factura (Camera API)
- Al confirmar compra en estado 'recibida': UPDATE `costo_unitario_actual` + INSERT `inventario_movimientos` tipo 'entrada'

**API Routes:**
- `POST /api/compras` — crear compra
- `POST /api/compras/[id]/confirmar` — cambiar estado a 'recibida' + actualizar inventario

---

## SPRINT 7 — MULTI-RESTAURANTE / EMPRESA (PENDIENTE)

### Objetivo
Panel de grupo para dueños de múltiples locales.

### Entregables planificados
- Tabla `grupos_restaurantes`
- Campo `grupo_id` en `restaurantes`
- Panel consolidado con KPIs por local
- Compras consolidadas (poder de negociación)
- Recetas compartidas entre locales (opt-in)
- Comparativa de mermas y desviaciones por local

---

## DEUDA TÉCNICA CONOCIDA

### Alta prioridad (resolver antes de producción)

**1. `database.types.ts` es placeholder**  
Reemplazar con tipos generados reales:
```bash
npx supabase gen types typescript --project-id TU_PROJECT_ID > src/types/database.types.ts
```

**2. Módulo de compras sin frontend**  
Los hooks `useCompras()` y `useProveedores()` existen pero las páginas de compras no están implementadas en Sprint 3. El inventario no se actualiza al recibir una compra hasta que se construya el módulo.

**3. Supabase Cron Jobs no configurados**  
Los briefings matutinos (06:00) y cierres nocturnos (23:00) no tienen cron configurado. Requiere plan Pro de Supabase o implementación manual con pg_cron.

**4. Storage buckets no creados**  
Crear en Supabase Dashboard:
- `recetas-imagenes` (público)
- `recetas-videos` (público)
- `facturas` (privado)
- `importaciones` (privado)

**5. Push Notifications no implementadas**  
El Service Worker y el manifest.json están configurados pero las notificaciones push para alertas críticas no están implementadas.

### Media prioridad

**6. Onboarding no implementado**  
El flujo de 5 pasos para nuevos restaurantes (importar recetas/inventario con IA) no está construido.

**7. `useAuth.ts` y `sincronizador.ts` son dead code**  
Archivos creados pero nunca importados. No rompen el build pero son confusos. Eliminar en Sprint 4.

**8. `compras_items.cantidad_gramos` nunca se popula**  
La API de compras no está implementada, así que este campo siempre es NULL.

**9. Tema claro no implementado**  
El sistema de diseño tiene tokens preparados para dark mode únicamente. El campo `preferencias.tema` en usuarios existe pero no hay toggle en UI.

### Baja prioridad

**10. `analisis_consumo` no tiene UI**  
La función SQL `calcular_analisis_consumo()` existe y funciona pero no hay pantalla para visualizarlo. Solo se ven las alertas generadas.

**11. `inventario_snapshots` no tiene UI**  
La tabla existe para el cálculo de consumo real pero no hay flujo para que el chef registre conteos físicos.

**12. Historial de versiones de receta sin UI**  
`recetas_versiones` se popula correctamente por el trigger pero no hay componente para visualizar el historial completo.

---

## PARA EJECUTAR EL PRIMER `npm run dev`

### Requisitos previos

**1. Proyecto Supabase creado**
```bash
# En supabase.com/dashboard → New project
# Guardar: project URL, anon key, service_role key
```

**2. Variables de entorno**
```bash
cp .env.example .env.local
# Rellenar con valores reales de Supabase y Anthropic
```

**3. Ejecutar migraciones en orden**
```bash
# En Supabase Dashboard → SQL Editor, ejecutar en orden:
# 1. supabase/migrations/001_schema_base.sql
# 2. supabase/migrations/002_funciones_negocio.sql
# 3. supabase/migrations/003_arquitectura_decisiones.sql
# 4. supabase/migrations/004_biblioteca_culinaria.sql
# 5. supabase/migrations/005_correccion_costo_por_gramo.sql
```

**4. Crear usuario inicial**
```bash
# En Supabase Dashboard → Authentication → Users → Add user
# Email: chef@turestaurante.com
# Password: (crear una segura)
```

**5. Crear restaurante y perfil de usuario**
```sql
-- En Supabase Dashboard → SQL Editor:
INSERT INTO restaurantes (nombre, slug, plan)
VALUES ('Mi Restaurante', 'mi-restaurante', 'profesional')
RETURNING id;

-- Usar el id retornado:
INSERT INTO usuarios (id, restaurante_id, nombre, email, rol)
VALUES (
  'UUID_DEL_AUTH_USER',    -- de Authentication → Users
  'UUID_DEL_RESTAURANTE',  -- del INSERT anterior
  'Marco Chef',
  'chef@turestaurante.com',
  'chef_ejecutivo'
);

-- Inicializar categorías del restaurante:
SELECT inicializar_restaurante('UUID_DEL_RESTAURANTE');
```

**6. Crear Storage buckets**
```bash
# Supabase Dashboard → Storage → New bucket:
# - recetas-imagenes (public: true)
# - recetas-videos (public: true)
# - facturas (public: false)
# - importaciones (public: false)
```

**7. Instalar dependencias y ejecutar**
```bash
npm install
npm run dev
# Abrir http://localhost:3000
```

---

## PARA EL PRIMER `npm run build`

Además de los pasos anteriores:

1. **Generar tipos reales de Supabase:**
```bash
npx supabase gen types typescript --project-id TU_PROJECT_ID > src/types/database.types.ts
```

2. **Configurar dominio en Supabase Auth:**  
Supabase Dashboard → Authentication → URL Configuration → Site URL = `https://tu-dominio.com`

3. **Variables de entorno en producción:**  
Agregar en Vercel (o tu plataforma) las mismas variables de `.env.example`

4. **Habilitar Realtime en Supabase:**  
Dashboard → Database → Replication → habilitar para tablas: `alertas_sistema`, `productos`, `produccion_registros`

---

## MÉTRICAS DE ÉXITO DEL MVP

| Métrica | Objetivo |
|---|---|
| Tiempo para ver el briefing | < 30 segundos al abrir la app |
| Registro de merma | ≤ 3 toques desde cualquier pantalla |
| Registro de producción | ≤ 5 toques incluyendo escalado |
| Primer Contentful Paint (4G) | < 1.5 segundos |
| Lighthouse score | > 90 en todas las categorías |
| Funciona offline | Recetas, mermas, producción |
| Tiempo de onboarding | < 30 minutos |

---

## PRINCIPIOS QUE NO SE NEGOCIAN

1. **RLS en todas las tablas** — nunca saltarse por performance
2. **API keys solo en servidor** — nunca en el cliente
3. **Sistema en gramos** — el motor nunca recibe kg, lt ni unidades directamente
4. **Optimistic updates** en mermas y producción — feedback < 100ms en cocina
5. **Mobile-first absoluto** — si no funciona en celular con una mano, no sirve
6. **Un lote por turno por día** — constraint UNIQUE en BD, no solo en UI
7. **Idempotencia en descuentos** — `descuento_inventario_aplicado` previene duplicados
8. **Datos del restaurante aislados** — TypeScript es estructural pero RLS es definitivo
