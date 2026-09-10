-- ChefOS: esquema base documentado.
-- Ejecutar en un proyecto Supabase nuevo antes de las migraciones siguientes.

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;
create extension if not exists unaccent;

create table if not exists public.restaurantes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  plan text not null default 'basico' check (plan in ('basico','profesional','enterprise')),
  config jsonb not null default '{}'::jsonb,
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

create table if not exists public.usuarios (
  id uuid primary key references auth.users(id) on delete cascade,
  restaurante_id uuid not null references public.restaurantes(id) on delete cascade,
  nombre text not null,
  email text not null,
  rol text not null default 'cocinero' check (rol in ('dueño','administrador','chef_ejecutivo','chef_cocina','cocinero')),
  activo boolean not null default true,
  avatar_url text,
  preferencias jsonb not null default '{}'::jsonb,
  ultimo_acceso timestamptz
);

create table if not exists public.usuarios_restaurantes (
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  restaurante_id uuid not null references public.restaurantes(id) on delete cascade,
  rol text not null default 'cocinero',
  activo boolean not null default true,
  primary key (usuario_id, restaurante_id)
);

create table if not exists public.unidades_medida (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nombre text not null,
  tipo text not null check (tipo in ('masa','volumen','unidad')),
  factor_a_gramos numeric(18,8),
  es_base boolean not null default false,
  activa boolean not null default true
);

create table if not exists public.densidades_producto (
  id uuid primary key default gen_random_uuid(),
  restaurante_id uuid references public.restaurantes(id) on delete cascade,
  nombre_referencia text not null,
  densidad_g_por_ml numeric(8,4),
  peso_unitario_gramos numeric(10,3),
  fuente text not null default 'estandar_culinario',
  activa boolean not null default true,
  creado_en timestamptz not null default now()
);

create table if not exists public.categorias_producto (
  id uuid primary key default gen_random_uuid(),
  restaurante_id uuid not null references public.restaurantes(id) on delete cascade,
  nombre text not null,
  tipo text not null default 'otro',
  activa boolean not null default true
);

create table if not exists public.categorias_receta (
  id uuid primary key default gen_random_uuid(),
  restaurante_id uuid not null references public.restaurantes(id) on delete cascade,
  nombre text not null,
  orden integer not null default 0,
  activa boolean not null default true
);

create table if not exists public.proveedores (
  id uuid primary key default gen_random_uuid(),
  restaurante_id uuid not null references public.restaurantes(id) on delete cascade,
  nombre text not null,
  contacto text,
  telefono text,
  email text,
  ruc_nit text,
  condiciones_pago text,
  dias_entrega integer,
  activo boolean not null default true,
  notas text
);

create table if not exists public.productos (
  id uuid primary key default gen_random_uuid(),
  restaurante_id uuid not null references public.restaurantes(id) on delete cascade,
  nombre text not null,
  nombre_normalizado text,
  codigo_interno text,
  categoria_id uuid references public.categorias_producto(id) on delete set null,
  unidad_medida text not null default 'unidad',
  unidad_compra text,
  unidad_display text,
  costo_unitario_actual numeric(12,4) not null default 0,
  costo_por_gramo numeric(18,8),
  stock_actual numeric(12,3) not null default 0,
  stock_minimo numeric(12,3) not null default 0,
  cantidad_gramos numeric(14,3) not null default 0,
  stock_minimo_gramos numeric(14,3) not null default 0,
  densidad_g_por_ml numeric(8,4),
  peso_unitario_gramos numeric(10,3),
  vida_util_dias integer,
  proveedor_principal_id uuid references public.proveedores(id) on delete set null,
  activo boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create table if not exists public.recetas (
  id uuid primary key default gen_random_uuid(),
  restaurante_id uuid not null references public.restaurantes(id) on delete cascade,
  nombre text not null,
  descripcion text,
  categoria_id uuid references public.categorias_receta(id) on delete set null,
  imagen_url text,
  video_url text,
  rendimiento_porciones integer not null default 1 check (rendimiento_porciones > 0),
  unidad_rendimiento text not null default 'porción',
  costo_total numeric(12,4),
  costo_porcion numeric(12,4),
  costo_por_gramo numeric(18,8),
  precio_venta numeric(12,2),
  margen_porcentaje numeric(5,2),
  tiempo_preparacion integer,
  dificultad text,
  version_actual integer not null default 1,
  activa boolean not null default true,
  en_carta boolean not null default false,
  es_produccion boolean not null default false,
  costo_desactualizado boolean not null default false,
  costo_actualizado_en timestamptz,
  cambios_descripcion_temp text,
  creado_por uuid references public.usuarios(id) on delete set null,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create table if not exists public.recetas_ingredientes (
  id uuid primary key default gen_random_uuid(),
  receta_id uuid not null references public.recetas(id) on delete cascade,
  producto_id uuid not null references public.productos(id) on delete restrict,
  cantidad numeric(12,4) not null,
  unidad_medida text not null,
  cantidad_gramos numeric(14,4) not null,
  es_opcional boolean not null default false,
  orden integer not null default 0,
  notas text
);

create table if not exists public.recetas_versiones (
  id uuid primary key default gen_random_uuid(),
  receta_id uuid not null references public.recetas(id) on delete cascade,
  restaurante_id uuid not null references public.restaurantes(id) on delete cascade,
  version_numero integer not null,
  procedimiento text not null default '',
  ingredientes_snap jsonb not null default '[]'::jsonb,
  costo_total_snap numeric(12,4),
  cambios_descripcion text,
  modificado_por uuid references public.usuarios(id) on delete set null,
  creado_en timestamptz not null default now(),
  unique (receta_id, version_numero)
);

create table if not exists public.recetas_pasos (
  id uuid primary key default gen_random_uuid(),
  receta_id uuid not null references public.recetas(id) on delete cascade,
  restaurante_id uuid not null references public.restaurantes(id) on delete cascade,
  numero integer not null,
  titulo text not null,
  descripcion text not null,
  duracion_min integer,
  temperatura_c numeric(6,2),
  tecnica text,
  punto_critico boolean not null default false,
  foto_url text,
  activo boolean not null default true
);

create table if not exists public.recetas_fotos (
  id uuid primary key default gen_random_uuid(),
  receta_id uuid not null references public.recetas(id) on delete cascade,
  restaurante_id uuid not null references public.restaurantes(id) on delete cascade,
  url text not null,
  tipo text not null default 'referencia',
  descripcion text,
  es_principal boolean not null default false,
  orden integer not null default 0,
  subida_por uuid references public.usuarios(id) on delete set null,
  creado_en timestamptz not null default now()
);

create table if not exists public.recetas_productos_afectados (
  receta_id uuid not null references public.recetas(id) on delete cascade,
  producto_id uuid not null references public.productos(id) on delete cascade,
  restaurante_id uuid not null references public.restaurantes(id) on delete cascade,
  cantidad_gramos numeric(14,4) not null,
  primary key (receta_id, producto_id)
);

create table if not exists public.inventario_movimientos (
  id uuid primary key default gen_random_uuid(),
  restaurante_id uuid not null references public.restaurantes(id) on delete cascade,
  producto_id uuid not null references public.productos(id) on delete restrict,
  tipo text not null,
  cantidad numeric(12,3),
  cantidad_antes numeric(12,3),
  cantidad_despues numeric(12,3),
  cantidad_gramos numeric(14,3) not null,
  cantidad_antes_gramos numeric(14,3),
  cantidad_despues_gramos numeric(14,3),
  costo_unitario numeric(12,4),
  costo_por_gramo numeric(18,8),
  motivo text,
  referencia_id uuid,
  referencia_tipo text,
  registrado_por uuid references public.usuarios(id) on delete set null,
  creado_en timestamptz not null default now()
);

create table if not exists public.compras (
  id uuid primary key default gen_random_uuid(),
  restaurante_id uuid not null references public.restaurantes(id) on delete cascade,
  proveedor_id uuid references public.proveedores(id) on delete set null,
  fecha_compra date not null default current_date,
  numero_factura text,
  total_compra numeric(12,2) not null default 0,
  estado text not null default 'borrador',
  imagen_factura_url text,
  registrado_por uuid references public.usuarios(id) on delete set null,
  notas text
);

create table if not exists public.compras_items (
  id uuid primary key default gen_random_uuid(),
  compra_id uuid not null references public.compras(id) on delete cascade,
  producto_id uuid not null references public.productos(id) on delete restrict,
  cantidad numeric(12,3) not null,
  unidad_medida text not null,
  cantidad_gramos numeric(14,3),
  precio_unitario numeric(12,4) not null default 0,
  precio_total numeric(12,2) not null default 0,
  notas text
);

create table if not exists public.mermas (
  id uuid primary key default gen_random_uuid(),
  restaurante_id uuid not null references public.restaurantes(id) on delete cascade,
  producto_id uuid not null references public.productos(id) on delete restrict,
  cantidad numeric(12,3) not null,
  unidad_medida text not null,
  cantidad_gramos numeric(14,3),
  motivo text not null,
  responsable_id uuid references public.usuarios(id) on delete set null,
  costo_merma numeric(12,2),
  notas text,
  creado_en timestamptz not null default now()
);

create table if not exists public.produccion_lotes (
  id uuid primary key default gen_random_uuid(),
  restaurante_id uuid not null references public.restaurantes(id) on delete cascade,
  fecha date not null default current_date,
  turno text not null,
  estado text not null default 'en_progreso',
  responsable_id uuid references public.usuarios(id) on delete set null,
  costo_total_lote numeric(12,2) not null default 0,
  items_producidos integer not null default 0,
  notas text,
  completado_en timestamptz,
  creado_en timestamptz not null default now(),
  unique (restaurante_id, fecha, turno)
);

create table if not exists public.produccion_registros (
  id uuid primary key default gen_random_uuid(),
  restaurante_id uuid not null references public.restaurantes(id) on delete cascade,
  receta_id uuid references public.recetas(id) on delete set null,
  producto_id uuid references public.productos(id) on delete set null,
  lote_id uuid references public.produccion_lotes(id) on delete set null,
  cantidad_producida numeric(12,3) not null,
  unidad text not null,
  cantidad_gramos numeric(14,3),
  fecha_produccion date not null default current_date,
  turno text not null,
  responsable_id uuid references public.usuarios(id) on delete set null,
  porciones_reales integer,
  costo_produccion numeric(12,2),
  costo_real numeric(12,2),
  inventario_descontado boolean not null default false,
  ingredientes_consumidos jsonb,
  notas text,
  creado_en timestamptz not null default now()
);

create table if not exists public.ventas_importaciones (
  id uuid primary key default gen_random_uuid(), restaurante_id uuid not null references public.restaurantes(id) on delete cascade,
  fecha_inicio date not null, fecha_fin date not null, origen_sistema text, archivo_url text,
  estado_procesamiento text not null default 'pendiente', total_registros integer not null default 0,
  registros_normalizados integer not null default 0, registros_pendientes integer not null default 0,
  descuento_inventario_aplicado boolean not null default false, descuento_aplicado_en timestamptz,
  descuento_aplicado_por uuid references public.usuarios(id) on delete set null, procesado_por uuid references public.usuarios(id) on delete set null
);

create table if not exists public.ventas_items (
  id uuid primary key default gen_random_uuid(), restaurante_id uuid not null references public.restaurantes(id) on delete cascade,
  importacion_id uuid references public.ventas_importaciones(id) on delete cascade, nombre_original text not null,
  nombre_normalizado text, confianza_match numeric(3,2), requiere_revision boolean not null default false,
  producto_id uuid references public.productos(id) on delete set null, receta_id uuid references public.recetas(id) on delete set null,
  cantidad_vendida numeric(12,3) not null, precio_unitario numeric(12,2) not null default 0, total numeric(12,2) not null default 0,
  fecha_venta date not null, dia_semana integer, hora_venta time, comensales integer, inventario_descontado boolean not null default false
);

create table if not exists public.analisis_consumo (
  id uuid primary key default gen_random_uuid(), restaurante_id uuid not null references public.restaurantes(id) on delete cascade,
  producto_id uuid not null references public.productos(id) on delete cascade, fecha_inicio date not null, fecha_fin date not null,
  periodo text not null, consumo_teorico_g numeric(14,3) not null default 0, consumo_real_g numeric(14,3) not null default 0,
  desviacion_g numeric(14,3) not null default 0, desviacion_pct numeric(6,2), costo_desviacion numeric(12,2),
  clasificacion text not null default 'sin_datos', causa_probable text, revisado boolean not null default false
);

create table if not exists public.inventario_snapshots (
  id uuid primary key default gen_random_uuid(), restaurante_id uuid not null references public.restaurantes(id) on delete cascade,
  producto_id uuid not null references public.productos(id) on delete cascade, fecha date not null, tipo_snapshot text not null,
  cantidad_gramos numeric(14,3) not null, registrado_por uuid references public.usuarios(id) on delete set null,
  unique (restaurante_id, producto_id, fecha, tipo_snapshot)
);

create table if not exists public.alertas_sistema (
  id uuid primary key default gen_random_uuid(), restaurante_id uuid not null references public.restaurantes(id) on delete cascade,
  tipo text not null, severidad text not null default 'media', mensaje text not null, datos jsonb not null default '{}'::jsonb,
  leida boolean not null default false, leida_por uuid references public.usuarios(id) on delete set null, leida_en timestamptz,
  referencia_id uuid, referencia_tipo text, creado_en timestamptz not null default now()
);

create table if not exists public.briefings (
  id uuid primary key default gen_random_uuid(), restaurante_id uuid not null references public.restaurantes(id) on delete cascade,
  fecha date not null, turno text not null, comensales_esperados integer, confianza_estimacion text,
  produccion_sugerida jsonb not null default '[]'::jsonb, compras_sugeridas jsonb not null default '[]'::jsonb,
  riesgos jsonb not null default '[]'::jsonb, alertas jsonb not null default '[]'::jsonb,
  actividad_reciente jsonb not null default '[]'::jsonb, contexto_usado jsonb not null default '{}'::jsonb,
  creado_en timestamptz not null default now(), unique (restaurante_id, fecha, turno)
);

create table if not exists public.conversaciones_ia (
  id uuid primary key default gen_random_uuid(), restaurante_id uuid not null references public.restaurantes(id) on delete cascade,
  usuario_id uuid not null references public.usuarios(id) on delete cascade, especialista text not null,
  mensajes jsonb not null default '[]'::jsonb, tokens_usados integer not null default 0, activa boolean not null default true,
  creado_en timestamptz not null default now()
);

create or replace function public.mi_restaurante_id() returns uuid
language sql stable security definer set search_path = public
as $$ select restaurante_id from public.usuarios where id = auth.uid() and activo = true limit 1 $$;

create index if not exists idx_productos_restaurante on public.productos(restaurante_id, activo);
create index if not exists idx_productos_nombre on public.productos using gin (nombre gin_trgm_ops);
create index if not exists idx_recetas_restaurante on public.recetas(restaurante_id, activa);
create index if not exists idx_recetas_nombre on public.recetas using gin (nombre gin_trgm_ops);
create index if not exists idx_movimientos_producto on public.inventario_movimientos(producto_id, creado_en desc);
create index if not exists idx_alertas_no_leidas on public.alertas_sistema(restaurante_id, creado_en desc) where leida = false;
create index if not exists idx_briefings_fecha on public.briefings(restaurante_id, fecha desc, turno);

alter table public.restaurantes enable row level security;
alter table public.usuarios enable row level security;
alter table public.usuarios_restaurantes enable row level security;
alter table public.densidades_producto enable row level security;
alter table public.categorias_producto enable row level security;
alter table public.categorias_receta enable row level security;
alter table public.proveedores enable row level security;
alter table public.productos enable row level security;
alter table public.recetas enable row level security;
alter table public.recetas_ingredientes enable row level security;
alter table public.recetas_versiones enable row level security;
alter table public.recetas_pasos enable row level security;
alter table public.recetas_fotos enable row level security;
alter table public.recetas_productos_afectados enable row level security;
alter table public.inventario_movimientos enable row level security;
alter table public.compras enable row level security;
alter table public.compras_items enable row level security;
alter table public.mermas enable row level security;
alter table public.produccion_lotes enable row level security;
alter table public.produccion_registros enable row level security;
alter table public.ventas_importaciones enable row level security;
alter table public.ventas_items enable row level security;
alter table public.analisis_consumo enable row level security;
alter table public.inventario_snapshots enable row level security;
alter table public.alertas_sistema enable row level security;
alter table public.briefings enable row level security;
alter table public.conversaciones_ia enable row level security;

do $$
declare t text;
begin
  foreach t in array array['usuarios','usuarios_restaurantes','densidades_producto','categorias_producto','categorias_receta','proveedores','productos','recetas','recetas_ingredientes','recetas_versiones','recetas_pasos','recetas_fotos','recetas_productos_afectados','inventario_movimientos','compras','compras_items','mermas','produccion_lotes','produccion_registros','ventas_importaciones','ventas_items','analisis_consumo','inventario_snapshots','alertas_sistema','briefings','conversaciones_ia'] loop
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = t and column_name = 'restaurante_id') then
      execute format('drop policy if exists tenant_access on public.%I', t);
      execute format('create policy tenant_access on public.%I for all using (restaurante_id = public.mi_restaurante_id()) with check (restaurante_id = public.mi_restaurante_id())', t);
    end if;
  end loop;
  execute 'drop policy if exists own_restaurant on public.restaurantes';
  execute 'create policy own_restaurant on public.restaurantes for select using (id = public.mi_restaurante_id())';
end $$;

insert into public.unidades_medida (codigo, nombre, tipo, factor_a_gramos, es_base)
values
 ('g','Gramo','masa',1,true), ('kg','Kilogramo','masa',1000,false), ('mg','Miligramo','masa',0.001,false),
 ('oz','Onza','masa',28.3495,false), ('lb','Libra','masa',453.592,false), ('lt','Litro','volumen',null,false),
 ('ml','Mililitro','volumen',null,false), ('cl','Centilitro','volumen',null,false), ('unidad','Unidad','unidad',null,false),
 ('docena','Docena','unidad',null,false), ('caja','Caja','unidad',null,false), ('bandeja','Bandeja','unidad',null,false), ('porcion','Porción','unidad',null,false)
on conflict (codigo) do nothing;
