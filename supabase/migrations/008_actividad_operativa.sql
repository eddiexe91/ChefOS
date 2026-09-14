-- Actividad operativa visible en el historial/briefing del restaurante.
create table if not exists public.actividad_operativa (
  id uuid primary key default gen_random_uuid(),
  restaurante_id uuid not null references public.restaurantes(id) on delete cascade,
  usuario_id uuid references public.usuarios(id) on delete set null,
  accion text not null check (accion in ('crear_producto','editar_producto','eliminar_producto')),
  entidad_tipo text not null default 'producto',
  entidad_id uuid,
  descripcion text not null,
  datos jsonb not null default '{}'::jsonb,
  creado_en timestamptz not null default now()
);
create index if not exists idx_actividad_operativa_restaurante
  on public.actividad_operativa(restaurante_id, creado_en desc);
alter table public.actividad_operativa enable row level security;
drop policy if exists actividad_operativa_select on public.actividad_operativa;
create policy actividad_operativa_select on public.actividad_operativa for select
  using (public.chefos_es_miembro(restaurante_id));
drop policy if exists actividad_operativa_insert on public.actividad_operativa;
create policy actividad_operativa_insert on public.actividad_operativa for insert
  with check (public.chefos_es_miembro(restaurante_id));
