INVENTARIO MAESTRO DE RECONSTRUCCIÓN — ChefOS Sprint 3

---

SECCIÓN 1 — MIGRACIONES SQL

Archivo| Ubicación| Estado esperado| Dependencias| Prioridad |
"001_schema_base.sql"| "supabase/migrations/"| 20 tablas base + triggers + RLS + índices| PostgreSQL 15, extensiones pg_trgm/unaccent| CRÍTICO
"002_funciones_negocio.sql"| "supabase/migrations/"| inicializar_restaurante(), alertas stock, seed categorías| 001 ejecutada| CRÍTICO
"003_arquitectura_decisiones.sql"| "supabase/migrations/"| tablas gramos, costos desactualizados, consumo teórico/real| 002 ejecutada| CRÍTICO
"004_biblioteca_culinaria.sql"| "supabase/migrations/"| recetas_pasos, recetas_fotos, produccion_lotes, escalar_receta(), registrar_produccion_completa()| 003 ejecutada| CRÍTICO
"005_correccion_costo_por_gramo.sql"| "supabase/migrations/"| Fix trigger costo_por_gramo — usa factor_unidad no stock| 003 ejecutada| CRÍTICO

---

SECCIÓN 2 — CONFIGURACIÓN RAÍZ

Archivo| Ubicación| Estado esperado| Dependencias| Prioridad
"package.json"| "/"| next 14.2.3, react 18, @tanstack/react-query v5, @ducanh2912/next-pwa, clsx, lucide-react, date-fns, sonner, @supabase/supabase-js, @supabase/ssr| Node 18+| CRÍTICO
"tsconfig.json"| "/"| strict:true, paths aliases @/* @/components/* @/lib/* @/hooks/* @/types/* @/styles/* @/providers/*| —| CRÍTICO
"next.config.js"| "/"| serverExternalPackages, @ducanh2912/next-pwa, remotePatterns Supabase| package.json| CRÍTICO
"tailwind.config.ts"| "/"| tokens de color, tipografía Syne/DM_Sans/JetBrains_Mono, animaciones, plugin typography| @tailwindcss/typography en devDeps| CRÍTICO
"postcss.config.js"| "/"| tailwindcss + autoprefixer| —| CRÍTICO
".eslintrc.json"| "/"| next/core-web-vitals, @typescript-eslint/no-explicit-any: off| eslint-config-next| CRÍTICO
".gitignore"| "/"| node_modules, .next, .env.local, /public/sw.js| —| IMPORTANTE
".env.example"| "/"| Plantilla con NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY| —| CRÍTICO
".env.local"| "/"| Valores reales (NO al repositorio)| .env.example| CRÍTICO
"public/manifest.json"| "/public/"| PWA: nombre, iconos, theme_color, display:standalone| —| IMPORTANTE

---

SECCIÓN 3 — TIPOS TYPESCRIPT

Archivo| Ubicación| Estado esperado| Dependencias| Prioridad
"index.ts"| "src/types/"| Todas las entidades del dominio y utilidades centrales| —| CRÍTICO
"database.types.ts"| "src/types/"| Placeholder: export type Database = any| —| CRÍTICO

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
