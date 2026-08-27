INVENTARIO MAESTRO DE RECONSTRUCCIÓN — ChefOS Sprint 3

---

> **Sincronización post-auditoría (commit `9fd9b8544371c9a93322211dc53e686bc23a8f00`):**
> - **A) Implementado y verificado estáticamente:** rutas `/biblioteca` y `/biblioteca/nueva`, `BibliotecaCliente`, `RecetaForm`, `useRecetas`, `fetchRecetas`, `useRegistrarReceta`, `POST /api/biblioteca/recetas`.
> - **B) Implementado pero no verificado en runtime:** funcionamiento real contra Supabase, creación E2E de receta, comportamiento real de filtros/búsqueda en navegador.
> - **C) No implementado:** `/biblioteca/[id]`, `/biblioteca/[id]/editar`, `RecetaDetalleCliente.tsx`, `EscaladoModal.tsx`, APIs `/api/biblioteca/recetas/[id]/costo` y `/api/biblioteca/recetas/[id]/escalar`.
> - **D) No determinable con la evidencia actual:** políticas RLS realmente desplegadas (no existe `supabase/migrations` en este repositorio auditado).
> - **E) Planificado/futuro:** detalle/edición/escalado de recetas y endurecimiento transaccional del alta de recetas.

SECCIÓN 1 — MIGRACIONES SQL

| Archivo | Ubicación | Estado esperado | Dependencias | Prioridad |
|---|---|---|---|---|
| `001_schema_base.sql` | `supabase/migrations/` | 20 tablas base + triggers + RLS + índices | PostgreSQL 15, extensiones pg_trgm/unaccent | **CRÍTICO** |
| `002_funciones_negocio.sql` | `supabase/migrations/` | inicializar_restaurante(), alertas stock, seed categorías | 001 ejecutada | **CRÍTICO** |
| `003_arquitectura_decisiones.sql` | `supabase/migrations/` | tablas gramos, costos desactualizados, consumo teórico/real | 002 ejecutada | **CRÍTICO** |
| `004_biblioteca_culinaria.sql` | `supabase/migrations/` | recetas_pasos, recetas_fotos, produccion_lotes, escalar_receta(), registrar_produccion_completa() | 003 ejecutada | **CRÍTICO** |
| `005_correccion_costo_por_gramo.sql` | `supabase/migrations/` | Fix trigger costo_por_gramo — usa factor_unidad no stock | 003 ejecutada | **CRÍTICO** |

---

SECCIÓN 2 — CONFIGURACIÓN RAÍZ

| Archivo | Ubicación | Estado esperado | Dependencias | Prioridad |
|---|---|---|---|---|
| `package.json` | `/` | next 14.2.3, react 18, @tanstack/react-query v5, @ducanh2912/next-pwa, clsx, lucide-react, date-fns, sonner, @supabase/supabase-js, @supabase/ssr | Node 18+ | **CRÍTICO** |
| `tsconfig.json` | `/` | strict:true, paths aliases @/* @/components/* @/lib/* @/hooks/* @/types/* @/styles/* @/providers/* | — | **CRÍTICO** |
| `next.config.js` | `/` | serverExternalPackages, @ducanh2912/next-pwa, remotePatterns Supabase | package.json | **CRÍTICO** |
| `tailwind.config.ts` | `/` | tokens de color, tipografía Syne/DM_Sans/JetBrains_Mono, animaciones, plugin typography | @tailwindcss/typography en devDeps | **CRÍTICO** |
| `postcss.config.js` | `/` | tailwindcss + autoprefixer | — | **CRÍTICO** |
| `.eslintrc.json` | `/` | next/core-web-vitals, @typescript-eslint/no-explicit-any: off | eslint-config-next | **CRÍTICO** |
| `.gitignore` | `/` | node_modules, .next, .env.local, /public/sw.js | — | **IMPORTANTE** |
| `.env.example` | `/` | Plantilla con NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY | — | **CRÍTICO** |
| `.env.local` | `/` | Valores reales (NO al repositorio) | .env.example | **CRÍTICO** |
| `public/manifest.json` | `/public/` | PWA: nombre, iconos, theme_color, display:standalone | — | **IMPORTANTE** |
---

SECCIÓN 3 — TIPOS TYPESCRIPT

| Archivo | Ubicación | Estado esperado | Dependencias | Prioridad |
|---|---|---|---|---|
| `index.ts` | `src/types/` | Todas las entidades del dominio: RolUsuario, Restaurante, Usuario, Producto, Receta, RecetaIngrediente, Merma, ProduccionRegistro, VentaImportacion, VentaItem, AlertaSistema, AnalisisConsumo, InventarioSnapshot, UnidadMedida, DensidadProducto. Funciones: convertirAGramos(), gramosAUnidadDisplay(). Constantes: PERMISOS_POR_ROL, tienePermiso(). Interfaces de formulario: FormNuevaMerma, FormNuevaReceta | — | **CRÍTICO** |
| `database.types.ts` | `src/types/` | Placeholder: `export type Database = any`. Reemplazar con `supabase gen types` en producción | — | **CRÍTICO** |

---

## SECCIÓN 4 — INFRAESTRUCTURA SUPABASE

| Archivo | Ubicación | Estado esperado | Dependencias | Prioridad |
|---|---|---|---|---|
| `servidor.ts` | `src/lib/supabase/` | crearClienteServidor() con cookies SSR. crearClienteAdmin() con service_role | @supabase/ssr, next/headers | **CRÍTICO** |
| `navegador.ts` | `src/lib/supabase/` | crearClienteNavegador(), obtenerClienteNavegador() singleton | @supabase/supabase-js | **CRÍTICO** |

---

## SECCIÓN 5 — OFFLINE

| Archivo | Ubicación | Estado esperado | Dependencias | Prioridad |
|---|---|---|---|---|
| `cola.ts` | `src/lib/offline/` | IndexedDB queue: encolarAccion, obtenerAccionesPendientes, eliminarAccion, marcarIntento, contarAccionesPendientes | — | **CRÍTICO** |

---

## SECCIÓN 6 — QUERIES Y CACHÉ

| Archivo | Ubicación | Estado esperado | Dependencias | Prioridad |
|---|---|---|---|---|
| `index.ts` | `src/lib/queries/` | Query Keys jerárquicos y fetchers de dominio | @supabase/supabase-js, src/types/index.ts | **CRÍTICO** |

---

## SECCIÓN 7 — PROVIDER GLOBAL

| Archivo | Ubicación | Estado esperado | Dependencias | Prioridad |
|---|---|---|---|---|
| `AppProvider.tsx` | `src/providers/` | QueryClientProvider + ContextoApp + Realtime + sincronización offline | @tanstack/react-query, src/lib/offline/cola.ts | **CRÍTICO** |

---

## SECCIÓN 8 — HOOKS

| Archivo | Ubicación | Estado esperado | Dependencias | Prioridad |
|---|---|---|---|---|
| `useDominio.ts` | `src/hooks/` | Hooks principales del dominio (recetas, inventario, producción, mermas, alertas, compras, proveedores) | AppProvider, queries, offline | **CRÍTICO** |
| `useAuth.ts` | `src/hooks/` | Código muerto, puede omitirse | — | **OPCIONAL** |

---

## SECCIÓN 9 — MIDDLEWARE

| Archivo | Ubicación | Estado esperado | Dependencias | Prioridad |
|---|---|---|---|---|
| `middleware.ts` | `src/` | Protección de rutas, verificación de roles, redirects y rutas restringidas por rol | @supabase/ssr | **CRÍTICO** |

---

## SECCIÓN 10 — ROOT APP

| Archivo | Ubicación | Estado esperado | Dependencias | Prioridad |
|---|---|---|---|---|
| `layout.tsx` | `src/app/` | Server Component. Fuentes Syne, DM Sans y JetBrains Mono. Toaster global. Tema oscuro | sonner | **CRÍTICO** |
| `not-found.tsx` | `src/app/` | Página 404 personalizada | lucide-react | **IMPORTANTE** |
| `globals.css` | `src/styles/` | Variables CSS, layout base, componentes utilitarios y sistema visual | tailwindcss | **CRÍTICO** |

---

## SECCIÓN 11 — AUTH PAGES

| Archivo | Ubicación | Estado esperado | Dependencias | Prioridad |
|---|---|---|---|---|
| `page.tsx` | `src/app/auth/login/` | Login por contraseña y magic link. Redirect a dashboard | @supabase/supabase-js | **CRÍTICO** |
| `route.ts` | `src/app/auth/callback/` | Intercambio de code por sesión y redirect a dashboard | @supabase/ssr | **CRÍTICO** |

---

## SECCIÓN 12 — LAYOUT AUTENTICADO

| Archivo | Ubicación | Estado esperado | Dependencias | Prioridad |
|---|---|---|---|---|
| `layout.tsx` | `src/app/(autenticado)/` | Carga perfil y restaurante. Envuelve AppProvider y LayoutApp | Supabase SSR | **CRÍTICO** |
| `page.tsx` | `src/app/(autenticado)/` | Redirect automático a dashboard | next/navigation | **CRÍTICO** |

---

## SECCIÓN 13 — LAYOUT COMPONENTS

| Archivo | Ubicación | Estado esperado | Dependencias | Prioridad |
|---|---|---|---|---|
| `LayoutApp.tsx` | `src/components/layout/` | Navegación inferior, badge de alertas y banner offline | AppProvider | **CRÍTICO** |
| `HeaderApp.tsx` | `src/components/layout/` | Header con restaurante, alertas, estado online y logout | AppProvider, Supabase | **CRÍTICO** |

---

## SECCIÓN 14 — UI COMPONENTS

| Archivo | Ubicación | Estado esperado | Dependencias | Prioridad |
|---|---|---|---|---|
| `index.tsx` | `src/components/ui/` | **Estado real actual:** archivo desalineado; contiene código de hooks de dominio en lugar de catálogo UI exportable. **B — IMPLEMENTADO PERO NO VALIDADO ARQUITECTÓNICAMENTE** | @tanstack/react-query, src/lib/queries, src/lib/supabase/navegador | **ALTO** |

---

## SECCIÓN 15 — DASHBOARD

| Archivo | Ubicación | Estado esperado | Dependencias | Prioridad |
|---|---|---|---|---|
| `page.tsx` | `src/app/(autenticado)/dashboard/` | Server Component. Precarga alertas, stock crítico, lote activo, recetas desactualizadas y mermas del día | crearClienteServidor, DashboardCliente | **CRÍTICO** |
| `DashboardCliente.tsx` | `src/components/dashboard/` | KPIs, acciones rápidas, alertas, stock crítico y lote activo | AppProvider, useDominio, UI Components | **CRÍTICO** |

---

## SECCIÓN 16 — BIBLIOTECA CULINARIA (PÁGINAS)

| Archivo | Ubicación | Estado esperado | Dependencias | Prioridad |
|---|---|---|---|---|
| `page.tsx` | `src/app/(autenticado)/biblioteca/` | Monta `<BibliotecaCliente />` (wrapper server simple). **A — IMPLEMENTADO Y VERIFICADO ESTÁTICAMENTE** | BibliotecaCliente | **CRÍTICO** |
| `page.tsx` | `src/app/(autenticado)/biblioteca/nueva/` | Monta `<RecetaForm />` (wrapper server simple, sin guard de rol explícito). **A/B** | RecetaForm | **CRÍTICO** |
| `page.tsx` | `src/app/(autenticado)/biblioteca/[id]/` | **C — NO IMPLEMENTADO** (referencia histórica, archivo no existe en el repo actual) | — | **ALTO** |
| `page.tsx` | `src/app/(autenticado)/biblioteca/[id]/editar/` | **C — NO IMPLEMENTADO** (referencia histórica, archivo no existe en el repo actual) | — | **ALTO** |

---

## SECCIÓN 17 — BIBLIOTECA CULINARIA (COMPONENTES)

| Archivo | Ubicación | Estado esperado | Dependencias | Prioridad |
|---|---|---|---|---|
| `BibliotecaCliente.tsx` | `src/components/biblioteca/` | Listado con búsqueda client-side por nombre, filtros (`Todas`, `En carta`, categorías dinámicas), contador y estados pending/error/vacío/sin resultados. **A/B** | useRecetas, React | **CRÍTICO** |
| `RecetaDetalleCliente.tsx` | `src/components/biblioteca/` | **C — NO IMPLEMENTADO** (referencia histórica, archivo no existe) | — | **ALTO** |
| `RecetaForm.tsx` | `src/components/biblioteca/` | Formulario de creación con ingredientes/pasos + `useRegistrarReceta`. Soporte interno para `categoria_id` y `foto_url` sin UI completa actual. **A/B** | useProductos, useRegistrarReceta | **CRÍTICO** |
| `EscaladoModal.tsx` | `src/components/biblioteca/` | **C — NO IMPLEMENTADO** (referencia histórica, archivo no existe) | — | **ALTO** |

---

## SECCIÓN 18 — PRODUCCIÓN

| Archivo | Ubicación | Estado esperado | Dependencias | Prioridad |
|---|---|---|---|---|
| `page.tsx` | `src/app/(autenticado)/produccion/` | Carga lote activo, registros y recetas | crearClienteServidor, ProduccionCliente | **CRÍTICO** |
| `ProduccionCliente.tsx` | `src/components/produccion/` | Gestión de lotes, producción y sincronización offline | AppProvider, cola offline, UI Components | **CRÍTICO** |

---

## SECCIÓN 19 — INVENTARIO

| Archivo | Ubicación | Estado esperado | Dependencias | Prioridad |
|---|---|---|---|---|
| `page.tsx` | `src/app/(autenticado)/inventario/` | Carga productos y categorías | crearClienteServidor, InventarioCliente | **CRÍTICO** |
| `page.tsx` | `src/app/(autenticado)/inventario/[id]/` | Carga producto completo y movimientos recientes | crearClienteServidor, ProductoDetalleCliente | **CRÍTICO** |
| `InventarioCliente.tsx` | `src/components/inventario/` | Filtros, búsqueda y stock crítico | useInventario, UI Components | **CRÍTICO** |
| `ProductoDetalleCliente.tsx` | `src/components/inventario/` | KPI stock, ficha técnica y ajustes | useAjustarInventario, QK | **CRÍTICO** |

---

## SECCIÓN 20 — MERMAS

| Archivo | Ubicación | Estado esperado | Dependencias | Prioridad |
|---|---|---|---|---|
| `page.tsx` | `src/app/(autenticado)/mermas/nueva/` | Carga productos y equipo | crearClienteServidor, MermaFormCliente | **CRÍTICO** |
| `MermaFormCliente.tsx` | `src/components/mermas/` | Wizard de 3 pasos para registrar mermas | useRegistrarMerma, GramInput | **CRÍTICO** |

---

## SECCIÓN 21 — ALERTAS

| Archivo | Ubicación | Estado esperado | Dependencias | Prioridad |
|---|---|---|---|---|
| `page.tsx` | `src/app/(autenticado)/alertas/` | Carga alertas iniciales ordenadas | crearClienteServidor, AlertasCliente | **CRÍTICO** |
| `AlertasCliente.tsx` | `src/components/alertas/` | Filtros y gestión de alertas | AppProvider, useAlertas | **CRÍTICO** |

---

## SECCIÓN 22 — CONFIGURACIÓN

| Archivo | Ubicación | Estado esperado | Dependencias | Prioridad |
|---|---|---|---|---|
| `page.tsx` | `src/app/(autenticado)/configuracion/` | Hub principal de configuración | crearClienteServidor | **IMPORTANTE** |
| `page.tsx` | `src/app/(autenticado)/configuracion/perfil/` | Carga perfil del usuario | crearClienteServidor, PerfilCliente | **IMPORTANTE** |
| `PerfilCliente.tsx` | `src/components/configuracion/` | Edición de perfil | obtenerClienteNavegador | **IMPORTANTE** |

---

## SECCIÓN 23 — API ROUTES

| Archivo | Ubicación | Estado esperado | Dependencias | Prioridad |
|---|---|---|---|---|
| `route.ts` | `src/app/api/produccion/` | Registro completo de producción | crearClienteServidor | **CRÍTICO** |
| `route.ts` | `src/app/api/produccion/lotes/` | Apertura y recuperación de lotes | crearClienteServidor | **CRÍTICO** |
| `route.ts` | `src/app/api/produccion/lotes/[id]/cerrar/` | Cierre de lotes | crearClienteServidor | **CRÍTICO** |
| `route.ts` | `src/app/api/mermas/` | Registro de mermas y movimientos | crearClienteServidor, convertirAGramos | **CRÍTICO** |
| `route.ts` | `src/app/api/inventario/movimientos/` | Ajustes manuales de stock | crearClienteServidor | **CRÍTICO** |
| `route.ts` | `src/app/api/biblioteca/recetas/` | **POST** crear receta completa (receta + ingredientes + pasos + productos afectados + RPC `recalcular_costo_receta`). Validaciones de payload y pertenencia de tenant. Flujo secuencial sin transacción atómica explícita. **A/B** | crearClienteServidor, tipos dominio | **CRÍTICO** |
| `route.ts` | `src/app/api/biblioteca/recetas/[id]/costo/` | **C — NO IMPLEMENTADO** (referencia histórica) | — | **ALTO** |
| `route.ts` | `src/app/api/biblioteca/recetas/[id]/escalar/` | **C — NO IMPLEMENTADO** (referencia histórica) | — | **ALTO** |

---

## SECCIÓN 24 — DEPENDENCIAS npm

### Dependencias críticas

- next
- react
- react-dom
- @supabase/supabase-js
- @supabase/ssr
- @tanstack/react-query
- clsx
- lucide-react
- date-fns
- sonner
- typescript
- tailwindcss
- @tailwindcss/typography
- postcss
- autoprefixer

### Dependencias importantes

- @ducanh2912/next-pwa
- eslint
- eslint-config-next
- supabase CLI

### Paquetes excluidos

- next-pwa
- @radix-ui/*
- zod
- react-hook-form
- @hookform/resolvers
- tailwind-merge
- date-fns-tz

---

## RESUMEN CUANTITATIVO

| Categoría | Crítico | Importante | Opcional | Total |
|---|---|---|---|---|
| Total Inventario Sprint 3 | 74 | 14 | 1 | **89** |
