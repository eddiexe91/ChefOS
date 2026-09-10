-- ChefOS: operación avanzada, IA, grupos, snapshots, Storage y cron.
-- Ejecutar después de 002_funciones_negocio.sql en el proyecto Supabase.

create table if not exists public.grupos_restaurantes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  propietario_id uuid references auth.users(id) on delete set null,
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

alter table public.restaurantes add column if not exists grupo_id uuid references public.grupos_restaurantes(id) on delete set null;
alter table public.restaurantes add column if not exists zona_horaria text not null default 'America/Santiago';
alter table public.restaurantes add column if not exists onboarding_completado boolean not null default false;

create table if not exists public.cierres_diarios (
  id uuid primary key default gen_random_uuid(), restaurante_id uuid not null references public.restaurantes(id) on delete cascade,
  fecha date not null, total_ventas numeric(14,2) not null default 0, total_mermas numeric(14,2) not null default 0,
  costo_mermas numeric(14,2) not null default 0, items_producidos integer not null default 0,
  costo_produccion numeric(14,2) not null default 0, briefing_id uuid references public.briefings(id) on delete set null,
  recomendaciones jsonb not null default '[]'::jsonb, creado_en timestamptz not null default now(),
  unique (restaurante_id, fecha)
);

create table if not exists public.tareas_programadas (
  id uuid primary key default gen_random_uuid(), nombre text not null unique, expresion_cron text not null,
  ultima_ejecucion timestamptz, proxima_ejecucion timestamptz, activo boolean not null default true,
  creado_en timestamptz not null default now()
);

insert into public.tareas_programadas (nombre, expresion_cron)
values ('briefing_matutino', '0 6 * * *'), ('cierre_diario', '0 23 * * *')
on conflict (nombre) do update set expresion_cron = excluded.expresion_cron;

create index if not exists idx_restaurantes_grupo on public.restaurantes(grupo_id) where grupo_id is not null;
create index if not exists idx_cierres_fecha on public.cierres_diarios(restaurante_id, fecha desc);

alter table public.grupos_restaurantes enable row level security;
alter table public.cierres_diarios enable row level security;
alter table public.tareas_programadas enable row level security;

drop policy if exists grupos_mismo_usuario on public.grupos_restaurantes;
create policy grupos_mismo_usuario on public.grupos_restaurantes for select using (
  propietario_id = auth.uid() or exists (
    select 1 from public.restaurantes r join public.usuarios u on u.restaurante_id = r.id
    where r.grupo_id = grupos_restaurantes.id and u.id = auth.uid()
  )
);

drop policy if exists cierres_mismo_restaurante on public.cierres_diarios;
create policy cierres_mismo_restaurante on public.cierres_diarios for select using (restaurante_id = public.mi_restaurante_id());

drop policy if exists tareas_admin on public.tareas_programadas;
create policy tareas_admin on public.tareas_programadas for select using (exists (select 1 from public.usuarios where id = auth.uid() and rol in ('dueño','administrador')));

create or replace function public.calcular_analisis_consumo(p_restaurante_id uuid, p_inicio date, p_fin date, p_periodo text)
returns setof public.analisis_consumo language plpgsql security definer set search_path = public as $$
declare p record; out_row public.analisis_consumo%rowtype; teorico numeric; real_g numeric; des numeric; pct numeric; clas text;
begin
  delete from public.analisis_consumo where restaurante_id=p_restaurante_id and fecha_inicio=p_inicio and fecha_fin=p_fin and periodo=p_periodo;
  for p in select id, costo_por_gramo from public.productos where restaurante_id=p_restaurante_id and activo loop
    select coalesce(sum(vi.cantidad_vendida * ri.cantidad_gramos / nullif(rec.rendimiento_porciones,0)),0)
      into teorico from public.ventas_items vi join public.recetas rec on rec.id=vi.receta_id
      join public.recetas_ingredientes ri on ri.receta_id=rec.id and ri.producto_id=p.id
      where vi.restaurante_id=p_restaurante_id and vi.fecha_venta between p_inicio and p_fin;
    select coalesce(sum(case when tipo in ('salida','merma','produccion') then abs(cantidad_gramos) else 0 end),0)
      into real_g from public.inventario_movimientos where restaurante_id=p_restaurante_id and producto_id=p.id and creado_en::date between p_inicio and p_fin;
    des := real_g - teorico; pct := case when teorico > 0 then round((des/teorico)*100,2) else null end;
    clas := case when teorico=0 and real_g=0 then 'sin_datos' when abs(coalesce(pct,0)) < 5 then 'normal' when abs(pct) < 10 then 'leve' when abs(pct) < 20 then 'moderada' else 'critica' end;
    insert into public.analisis_consumo(restaurante_id,producto_id,fecha_inicio,fecha_fin,periodo,consumo_teorico_g,consumo_real_g,desviacion_g,desviacion_pct,costo_desviacion,clasificacion)
      values(p_restaurante_id,p.id,p_inicio,p_fin,p_periodo,teorico,real_g,des,pct,des*p.costo_por_gramo,clas) returning * into out_row;
    return next out_row;
  end loop;
end; $$;

-- Buckets recomendados; las políticas de objetos deben restringir acceso por restaurante_id.
insert into storage.buckets (id, name, public) values
  ('recetas-imagenes','recetas-imagenes',true), ('recetas-videos','recetas-videos',true),
  ('facturas','facturas',false), ('importaciones','importaciones',false)
on conflict (id) do nothing;

drop policy if exists chefos_storage_read_public on storage.objects;
create policy chefos_storage_read_public on storage.objects for select using (
  bucket_id in ('recetas-imagenes','recetas-videos')
  or ((storage.foldername(name))[1] = public.mi_restaurante_id()::text)
);
drop policy if exists chefos_storage_write_authenticated on storage.objects;
create policy chefos_storage_write_authenticated on storage.objects for insert to authenticated with check (
  bucket_id in ('recetas-imagenes','recetas-videos','facturas','importaciones')
  and (storage.foldername(name))[1] = public.mi_restaurante_id()::text
);
drop policy if exists chefos_storage_update_authenticated on storage.objects;
create policy chefos_storage_update_authenticated on storage.objects for update to authenticated using (
  bucket_id in ('recetas-imagenes','recetas-videos','facturas','importaciones')
  and (storage.foldername(name))[1] = public.mi_restaurante_id()::text
);

-- En Supabase Pro se pueden activar con pg_cron/pg_net llamando a Edge Functions:
-- select cron.schedule('chefos-briefing-0600','0 6 * * *', $$select net.http_post(...);$$);
-- select cron.schedule('chefos-cierre-2300','0 23 * * *', $$select net.http_post(...);$$);
