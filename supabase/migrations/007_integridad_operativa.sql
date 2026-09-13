-- ChefOS: integridad operativa, auditoría de costos y permisos por rol.
-- Ejecutar después de 006_consistencia_operativa.sql.
-- Esta migración es idempotente y puede volver a ejecutarse sin duplicar datos.

-- -----------------------------------------------------------------------------
-- Campos de auditoría que el modelo de dominio ya utiliza.
-- -----------------------------------------------------------------------------

alter table public.proveedores add column if not exists actualizado_en timestamptz not null default now();
alter table public.compras add column if not exists creado_en timestamptz not null default now();
alter table public.compras add column if not exists actualizado_en timestamptz not null default now();
alter table public.ventas_importaciones add column if not exists creado_en timestamptz not null default now();
alter table public.ventas_importaciones add column if not exists notas text;
alter table public.ventas_items add column if not exists creado_en timestamptz not null default now();
alter table public.analisis_consumo add column if not exists calculado_en timestamptz not null default now();
alter table public.analisis_consumo add column if not exists revisado_por uuid references public.usuarios(id) on delete set null;
alter table public.analisis_consumo add column if not exists notas text;
alter table public.inventario_snapshots add column if not exists creado_en timestamptz not null default now();
alter table public.inventario_snapshots add column if not exists notas text;

create table if not exists public.historial_precios_producto (
  id uuid primary key default gen_random_uuid(),
  restaurante_id uuid not null references public.restaurantes(id) on delete cascade,
  producto_id uuid not null references public.productos(id) on delete cascade,
  precio_anterior numeric(12,4),
  precio_nuevo numeric(12,4) not null,
  variacion_pct numeric(8,3),
  registrado_por uuid references public.usuarios(id) on delete set null,
  creado_en timestamptz not null default now()
);

create index if not exists idx_historial_precios_producto
  on public.historial_precios_producto(restaurante_id, producto_id, creado_en desc);
create index if not exists idx_productos_stock_critico
  on public.productos(restaurante_id, cantidad_gramos, stock_minimo_gramos)
  where activo = true;
create index if not exists idx_ventas_items_importacion
  on public.ventas_items(restaurante_id, importacion_id, inventario_descontado);
create index if not exists idx_analisis_consumo_restaurante
  on public.analisis_consumo(restaurante_id, fecha_fin desc);

alter table public.historial_precios_producto enable row level security;

-- -----------------------------------------------------------------------------
-- Helpers de autorización. SECURITY DEFINER evita recursión de RLS.
-- -----------------------------------------------------------------------------

create or replace function public.chefos_es_miembro(p_restaurante_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select auth.role() = 'service_role'
      or exists (
        select 1 from public.usuarios u
        where u.id = auth.uid()
          and u.restaurante_id = p_restaurante_id
          and u.activo = true
      )
      or exists (
        select 1 from public.usuarios_restaurantes ur
        where ur.usuario_id = auth.uid()
          and ur.restaurante_id = p_restaurante_id
          and ur.activo = true
      )
$$;

create or replace function public.chefos_tiene_rol(p_restaurante_id uuid, p_roles text[])
returns boolean
language sql stable security definer set search_path = public
as $$
  select auth.role() = 'service_role'
      or exists (
        select 1 from public.usuarios u
        where u.id = auth.uid()
          and u.restaurante_id = p_restaurante_id
          and u.activo = true
          and u.rol = any(p_roles)
      )
      or exists (
        select 1 from public.usuarios_restaurantes ur
        where ur.usuario_id = auth.uid()
          and ur.restaurante_id = p_restaurante_id
          and ur.activo = true
          and ur.rol = any(p_roles)
      )
$$;

revoke all on function public.chefos_es_miembro(uuid) from public;
revoke all on function public.chefos_tiene_rol(uuid, text[]) from public;
grant execute on function public.chefos_es_miembro(uuid) to authenticated, service_role;
grant execute on function public.chefos_tiene_rol(uuid, text[]) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Costos, versiones, alertas y timestamps.
-- -----------------------------------------------------------------------------

create or replace function public.actualizar_margen_receta()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  new.margen_porcentaje := case
    when coalesce(new.precio_venta, 0) > 0 and new.costo_porcion is not null
      then round(((new.precio_venta - new.costo_porcion) / new.precio_venta * 100)::numeric, 2)
    else null
  end;
  new.actualizado_en := now();
  return new;
end $$;

drop trigger if exists trigger_margen_receta on public.recetas;
create trigger trigger_margen_receta
before insert or update of precio_venta, costo_porcion on public.recetas
for each row execute function public.actualizar_margen_receta();

create or replace function public.registrar_historial_precio()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' or new.costo_unitario_actual is distinct from old.costo_unitario_actual then
    insert into public.historial_precios_producto(
      restaurante_id, producto_id, precio_anterior, precio_nuevo, variacion_pct, registrado_por
    ) values (
      new.restaurante_id,
      new.id,
      case when tg_op = 'INSERT' then null else old.costo_unitario_actual end,
      new.costo_unitario_actual,
      case
        when tg_op <> 'INSERT' and coalesce(old.costo_unitario_actual, 0) <> 0
          then round(((new.costo_unitario_actual - old.costo_unitario_actual) / old.costo_unitario_actual * 100)::numeric, 3)
        else null
      end,
      auth.uid()
    );
  end if;
  return new;
end $$;

drop trigger if exists trigger_historial_precio_producto on public.productos;
create trigger trigger_historial_precio_producto
after insert or update of costo_unitario_actual on public.productos
for each row execute function public.registrar_historial_precio();

create or replace function public.registrar_version_receta()
returns trigger language plpgsql security definer set search_path = public
as $$
declare v_version integer;
begin
  if tg_op = 'UPDATE' and (
    new.nombre is distinct from old.nombre or
    new.descripcion is distinct from old.descripcion or
    new.rendimiento_porciones is distinct from old.rendimiento_porciones or
    new.precio_venta is distinct from old.precio_venta or
    new.cambios_descripcion_temp is distinct from old.cambios_descripcion_temp or
    new.version_actual is distinct from old.version_actual
  ) then
    v_version := greatest(coalesce(old.version_actual, 1), 1);
    insert into public.recetas_versiones(
      receta_id, restaurante_id, version_numero, procedimiento,
      ingredientes_snap, costo_total_snap, cambios_descripcion, modificado_por
    ) values (
      old.id,
      old.restaurante_id,
      v_version,
      coalesce((select string_agg(format('%s. %s: %s', p.numero, p.titulo, p.descripcion), E'\n' order by p.numero)
                from public.recetas_pasos p where p.receta_id = old.id and p.activo), ''),
      coalesce((select jsonb_agg(to_jsonb(i) order by i.orden, i.id)
                from public.recetas_ingredientes i where i.receta_id = old.id), '[]'::jsonb),
      old.costo_total,
      old.cambios_descripcion_temp,
      auth.uid()
    ) on conflict (receta_id, version_numero) do nothing;
  end if;
  return new;
end $$;

drop trigger if exists trigger_version_receta on public.recetas;
create trigger trigger_version_receta
after update on public.recetas
for each row execute function public.registrar_version_receta();

create or replace function public.actualizar_timestamp_operativo()
returns trigger language plpgsql
as $$ begin new.actualizado_en := now(); return new; end $$;

drop trigger if exists trigger_timestamp_proveedores on public.proveedores;
create trigger trigger_timestamp_proveedores before update on public.proveedores
for each row execute function public.actualizar_timestamp_operativo();
drop trigger if exists trigger_timestamp_compras on public.compras;
create trigger trigger_timestamp_compras before update on public.compras
for each row execute function public.actualizar_timestamp_operativo();

create or replace function public.generar_alerta_stock_critico()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.activo and new.cantidad_gramos <= new.stock_minimo_gramos
     and (old.cantidad_gramos > old.stock_minimo_gramos or old.stock_minimo_gramos is distinct from new.stock_minimo_gramos) then
    insert into public.alertas_sistema(
      restaurante_id, tipo, severidad, mensaje, datos, referencia_id, referencia_tipo
    )
    select new.restaurante_id, 'stock_critico',
      case when new.cantidad_gramos <= 0 then 'critica' else 'alta' end,
      format('Stock crítico: %s (%s disponibles)', new.nombre, round(new.cantidad_gramos, 2)),
      jsonb_build_object('producto_id', new.id, 'cantidad_gramos', new.cantidad_gramos,
                         'stock_minimo_gramos', new.stock_minimo_gramos),
      new.id, 'producto'
    where not exists (
      select 1 from public.alertas_sistema a
      where a.restaurante_id = new.restaurante_id
        and a.referencia_id = new.id
        and a.referencia_tipo = 'producto'
        and a.tipo = 'stock_critico'
        and a.leida = false
    );
  end if;
  return new;
end $$;

drop trigger if exists trigger_alerta_stock_critico on public.productos;
create trigger trigger_alerta_stock_critico
after update of cantidad_gramos, stock_minimo_gramos on public.productos
for each row execute function public.generar_alerta_stock_critico();

-- -----------------------------------------------------------------------------
-- Recálculo seguro y creación atómica de recetas.
-- -----------------------------------------------------------------------------

create or replace function public.recalcular_costo_receta(p_receta_id uuid)
returns table(costo_total numeric, costo_porcion numeric, costo_por_gramo numeric)
language plpgsql security definer set search_path = public
as $$
declare v_total numeric; v_porciones integer; v_gramos numeric; v_restaurante uuid; v_precio numeric;
begin
  select r.restaurante_id, r.precio_venta, r.rendimiento_porciones
    into v_restaurante, v_precio, v_porciones
    from public.recetas r where r.id = p_receta_id for update;
  if v_restaurante is null then raise exception 'Receta no encontrada'; end if;
  if not public.chefos_es_miembro(v_restaurante) then raise exception 'No autorizado'; end if;

  select coalesce(sum(i.cantidad_gramos * coalesce(p.costo_por_gramo, 0)), 0),
         coalesce(sum(i.cantidad_gramos), 0)
    into v_total, v_gramos
    from public.recetas_ingredientes i
    left join public.productos p on p.id = i.producto_id
   where i.receta_id = p_receta_id;

  update public.recetas set
    costo_total = v_total,
    costo_porcion = v_total / greatest(v_porciones, 1),
    costo_por_gramo = case when v_gramos > 0 then v_total / v_gramos else null end,
    costo_desactualizado = false,
    costo_actualizado_en = now(),
    actualizado_en = now()
   where id = p_receta_id;

  return query select v_total, v_total / greatest(v_porciones, 1),
    case when v_gramos > 0 then v_total / v_gramos else null end;
end $$;

create or replace function public.crear_receta_completa(
  p_restaurante_id uuid,
  p_creado_por uuid,
  p_datos jsonb
) returns public.recetas
language plpgsql security definer set search_path = public
as $$
declare
  v_receta public.recetas;
  v_item jsonb;
  v_paso jsonb;
  v_producto public.productos;
  v_gramos numeric;
begin
  if not public.chefos_tiene_rol(p_restaurante_id, array['dueño','chef_ejecutivo','chef_cocina']) then
    raise exception 'No autorizado para crear recetas';
  end if;
  if auth.role() <> 'service_role' and p_creado_por is distinct from auth.uid() then
    raise exception 'El creador no coincide con la sesión';
  end if;
  if jsonb_array_length(coalesce(p_datos->'ingredientes', '[]'::jsonb)) = 0
     or jsonb_array_length(coalesce(p_datos->'pasos', '[]'::jsonb)) = 0 then
    raise exception 'La receta requiere ingredientes y pasos';
  end if;

  if p_datos->>'categoria_id' is not null and not exists (
    select 1 from public.categorias_receta c
    where c.id = (p_datos->>'categoria_id')::uuid and c.restaurante_id = p_restaurante_id and c.activa
  ) then raise exception 'Categoría no válida'; end if;

  insert into public.recetas(
    restaurante_id, nombre, descripcion, categoria_id, rendimiento_porciones,
    unidad_rendimiento, precio_venta, tiempo_preparacion, dificultad,
    en_carta, es_produccion, creado_por
  ) values (
    p_restaurante_id, trim(p_datos->>'nombre'), nullif(trim(p_datos->>'descripcion'), ''),
    nullif(p_datos->>'categoria_id', '')::uuid,
    greatest((p_datos->>'rendimiento_porciones')::integer, 1),
    coalesce(nullif(trim(p_datos->>'unidad_rendimiento'), ''), 'porción'),
    nullif(p_datos->>'precio_venta', '')::numeric,
    nullif(p_datos->>'tiempo_preparacion', '')::integer,
    nullif(p_datos->>'dificultad', ''),
    coalesce((p_datos->>'en_carta')::boolean, false),
    coalesce((p_datos->>'es_produccion')::boolean, false),
    p_creado_por
  ) returning * into v_receta;

  for v_item in select value from jsonb_array_elements(p_datos->'ingredientes') loop
    select * into v_producto from public.productos p
    where p.id = (v_item->>'producto_id')::uuid
      and p.restaurante_id = p_restaurante_id and p.activo;
    if v_producto.id is null then raise exception 'Producto de ingrediente no válido'; end if;
    v_gramos := public.convertir_a_gramos(
      (v_item->>'cantidad')::numeric,
      v_item->>'unidad_medida',
      v_producto.densidad_g_por_ml,
      v_producto.peso_unitario_gramos
    );
    if v_gramos is null then raise exception 'No fue posible convertir un ingrediente a gramos'; end if;
    insert into public.recetas_ingredientes(
      receta_id, producto_id, cantidad, unidad_medida, cantidad_gramos,
      es_opcional, orden, notas
    ) values (
      v_receta.id, v_producto.id, (v_item->>'cantidad')::numeric,
      v_item->>'unidad_medida', v_gramos,
      coalesce((v_item->>'es_opcional')::boolean, false),
      coalesce((v_item->>'orden')::integer, 0), nullif(v_item->>'notas', '')
    );
  end loop;

  for v_paso in select value from jsonb_array_elements(p_datos->'pasos') loop
    insert into public.recetas_pasos(
      receta_id, restaurante_id, numero, titulo, descripcion, duracion_min,
      temperatura_c, tecnica, punto_critico, foto_url
    ) values (
      v_receta.id, p_restaurante_id, (v_paso->>'numero')::integer,
      trim(v_paso->>'titulo'), trim(v_paso->>'descripcion'),
      nullif(v_paso->>'duracion_min', '')::integer,
      nullif(v_paso->>'temperatura_c', '')::numeric,
      nullif(trim(v_paso->>'tecnica'), ''),
      coalesce((v_paso->>'punto_critico')::boolean, false),
      nullif(trim(v_paso->>'foto_url'), '')
    );
  end loop;

  insert into public.recetas_productos_afectados(receta_id, producto_id, restaurante_id, cantidad_gramos)
  select v_receta.id, i.producto_id, p_restaurante_id, sum(i.cantidad_gramos)
    from public.recetas_ingredientes i where i.receta_id = v_receta.id
    group by i.producto_id
  on conflict (receta_id, producto_id) do update set cantidad_gramos = excluded.cantidad_gramos;

  perform public.recalcular_costo_receta(v_receta.id);
  insert into public.recetas_versiones(receta_id, restaurante_id, version_numero, procedimiento,
    ingredientes_snap, costo_total_snap, cambios_descripcion, modificado_por)
  values (v_receta.id, p_restaurante_id, 1, '',
    coalesce((select jsonb_agg(to_jsonb(i) order by i.orden, i.id)
              from public.recetas_ingredientes i where i.receta_id = v_receta.id), '[]'::jsonb),
    (select r.costo_total from public.recetas r where r.id = v_receta.id),
    'Versión inicial', p_creado_por)
  on conflict (receta_id, version_numero) do nothing;
  select * into v_receta from public.recetas where id = v_receta.id;
  return v_receta;
end $$;

revoke all on function public.crear_receta_completa(uuid, uuid, jsonb) from public;
grant execute on function public.crear_receta_completa(uuid, uuid, jsonb) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Operaciones atómicas con verificación de sesión, tenant y stock.
-- -----------------------------------------------------------------------------

create or replace function public.registrar_merma_completa(
  p_restaurante_id uuid, p_producto_id uuid, p_cantidad numeric,
  p_unidad_medida text, p_motivo text, p_responsable_id uuid, p_notas text default null
) returns public.mermas
language plpgsql security definer set search_path = public
as $$
declare v_merma public.mermas; v_gramos numeric; v_usuario uuid := auth.uid(); v_producto public.productos;
begin
  if not public.chefos_tiene_rol(p_restaurante_id, array['dueño','administrador','chef_ejecutivo','chef_cocina','cocinero']) then
    raise exception 'No autorizado para registrar esta merma';
  end if;
  if auth.role() <> 'service_role' and p_responsable_id is distinct from v_usuario then
    raise exception 'El responsable no coincide con la sesión';
  end if;
  select * into v_producto from public.productos p
  where p.id = p_producto_id and p.restaurante_id = p_restaurante_id and p.activo for update;
  if v_producto.id is null then raise exception 'Producto no encontrado'; end if;
  v_gramos := public.convertir_a_gramos(p_cantidad, p_unidad_medida,
    v_producto.densidad_g_por_ml, v_producto.peso_unitario_gramos);
  if v_gramos is null or v_gramos <= 0 then raise exception 'Cantidad o unidad inválida'; end if;
  if v_producto.cantidad_gramos < v_gramos then raise exception 'Stock insuficiente'; end if;
  insert into public.mermas(restaurante_id, producto_id, cantidad, unidad_medida, cantidad_gramos,
    motivo, responsable_id, notas)
  values (p_restaurante_id, p_producto_id, p_cantidad, p_unidad_medida, v_gramos,
    p_motivo, coalesce(p_responsable_id, v_usuario), p_notas)
  returning * into v_merma;
  insert into public.inventario_movimientos(restaurante_id, producto_id, tipo, cantidad_gramos,
    costo_unitario, costo_por_gramo, motivo, referencia_id, referencia_tipo, registrado_por)
  values (p_restaurante_id, p_producto_id, 'merma', v_gramos, v_producto.costo_unitario_actual,
    v_producto.costo_por_gramo, p_motivo, v_merma.id, 'merma', coalesce(p_responsable_id, v_usuario));
  return v_merma;
end $$;

create or replace function public.recibir_compra_completa(p_compra_id uuid, p_usuario_id uuid)
returns public.compras
language plpgsql security definer set search_path = public
as $$
declare v_compra public.compras; v_item record;
begin
  if auth.role() <> 'service_role' and p_usuario_id is distinct from auth.uid() then
    raise exception 'El usuario no coincide con la sesión';
  end if;
  select c.* into v_compra from public.compras c
  where c.id = p_compra_id for update;
  if v_compra.id is null or not public.chefos_tiene_rol(v_compra.restaurante_id,
    array['dueño','administrador','chef_ejecutivo']) then
    raise exception 'Compra no encontrada o sin permisos';
  end if;
  if v_compra.estado = 'recibida' then return v_compra; end if;
  if not exists (select 1 from public.compras_items ci where ci.compra_id = p_compra_id) then
    raise exception 'La compra no tiene ítems';
  end if;
  for v_item in select * from public.compras_items where compra_id = p_compra_id loop
    if coalesce(v_item.cantidad_gramos, 0) <= 0 then raise exception 'Ítem sin conversión válida'; end if;
    insert into public.inventario_movimientos(restaurante_id, producto_id, tipo, cantidad_gramos,
      costo_unitario, referencia_id, referencia_tipo, registrado_por)
    values (v_compra.restaurante_id, v_item.producto_id, 'entrada', v_item.cantidad_gramos,
      v_item.precio_unitario, p_compra_id, 'compra', p_usuario_id);
  end loop;
  update public.compras set estado = 'recibida', actualizado_en = now() where id = p_compra_id returning * into v_compra;
  return v_compra;
end $$;

create or replace function public.registrar_produccion_completa(
  p_restaurante_id uuid, p_receta_id uuid, p_porciones numeric, p_responsable_id uuid,
  p_lote_id uuid default null, p_turno text default 'mañana', p_notas text default null
) returns public.produccion_registros
language plpgsql security definer set search_path = public
as $$
declare
  v_registro public.produccion_registros; v_lote uuid := p_lote_id;
  v_receta public.recetas; v_item record; v_total_gramos numeric := 0; v_costo numeric := 0;
  v_consumidos jsonb;
begin
  if not public.chefos_tiene_rol(p_restaurante_id, array['dueño','administrador','chef_ejecutivo','chef_cocina','cocinero']) then
    raise exception 'No autorizado para registrar producción';
  end if;
  if auth.role() <> 'service_role' and p_responsable_id is distinct from auth.uid() then
    raise exception 'El responsable no coincide con la sesión';
  end if;
  if p_porciones <= 0 then raise exception 'La cantidad producida debe ser positiva'; end if;
  select * into v_receta from public.recetas r where r.id = p_receta_id
    and r.restaurante_id = p_restaurante_id and r.activa for update;
  if v_receta.id is null then raise exception 'Receta no encontrada'; end if;
  if v_lote is null then
    insert into public.produccion_lotes(restaurante_id, fecha, turno, responsable_id)
      values (p_restaurante_id, current_date, p_turno, p_responsable_id)
      on conflict (restaurante_id, fecha, turno) do update set responsable_id = excluded.responsable_id
      returning id into v_lote;
  else
    if not exists (select 1 from public.produccion_lotes l where l.id = v_lote
      and l.restaurante_id = p_restaurante_id and l.estado = 'en_progreso') then
      raise exception 'Lote no encontrado o cerrado';
    end if;
  end if;
  select coalesce(sum(i.cantidad_gramos * p_porciones / greatest(v_receta.rendimiento_porciones, 1)), 0),
         coalesce(sum(i.cantidad_gramos * p_porciones / greatest(v_receta.rendimiento_porciones, 1) * coalesce(p.costo_por_gramo, 0)), 0),
         coalesce(jsonb_agg(jsonb_build_object('producto_id', i.producto_id, 'nombre', p.nombre,
           'cantidad_gramos', i.cantidad_gramos * p_porciones / greatest(v_receta.rendimiento_porciones, 1),
           'costo_linea', i.cantidad_gramos * p_porciones / greatest(v_receta.rendimiento_porciones, 1) * coalesce(p.costo_por_gramo, 0))), '[]'::jsonb)
    into v_total_gramos, v_costo, v_consumidos
    from public.recetas_ingredientes i join public.productos p on p.id = i.producto_id
   where i.receta_id = p_receta_id;
  if exists (
    select 1 from public.recetas_ingredientes i join public.productos p on p.id = i.producto_id
    where i.receta_id = p_receta_id
      and p.cantidad_gramos < i.cantidad_gramos * p_porciones / greatest(v_receta.rendimiento_porciones, 1)
  ) then raise exception 'Stock insuficiente para producir la receta'; end if;
  insert into public.produccion_registros(restaurante_id, receta_id, lote_id, cantidad_producida,
    unidad, cantidad_gramos, fecha_produccion, turno, responsable_id, porciones_reales,
    costo_produccion, costo_real, ingredientes_consumidos, notas)
  values (p_restaurante_id, p_receta_id, v_lote, p_porciones, 'porciones', v_total_gramos,
    current_date, p_turno, p_responsable_id, round(p_porciones), v_costo, v_costo,
    v_consumidos, p_notas) returning * into v_registro;
  for v_item in select i.producto_id, i.cantidad_gramos * p_porciones / greatest(v_receta.rendimiento_porciones, 1) gramos,
    p.costo_unitario_actual, p.costo_por_gramo from public.recetas_ingredientes i
    join public.productos p on p.id = i.producto_id where i.receta_id = p_receta_id loop
    insert into public.inventario_movimientos(restaurante_id, producto_id, tipo, cantidad_gramos,
      costo_unitario, costo_por_gramo, referencia_id, referencia_tipo, registrado_por)
    values (p_restaurante_id, v_item.producto_id, 'produccion', v_item.gramos,
      v_item.costo_unitario_actual, v_item.costo_por_gramo, v_registro.id, 'produccion', p_responsable_id);
  end loop;
  update public.produccion_registros set inventario_descontado = true where id = v_registro.id returning * into v_registro;
  update public.produccion_lotes set items_producidos = items_producidos + 1,
    costo_total_lote = costo_total_lote + v_costo where id = v_lote;
  return v_registro;
end $$;

create or replace function public.descontar_inventario_por_ventas(p_importacion_id uuid, p_usuario_id uuid)
returns integer language plpgsql security definer set search_path = public
as $$
declare v_importacion public.ventas_importaciones; v_item record; v_ing record; v_count integer := 0;
begin
  if auth.role() <> 'service_role' and p_usuario_id is distinct from auth.uid() then raise exception 'Usuario inválido'; end if;
  select * into v_importacion from public.ventas_importaciones where id = p_importacion_id for update;
  if v_importacion.id is null or not public.chefos_tiene_rol(v_importacion.restaurante_id, array['dueño','administrador']) then
    raise exception 'Importación no encontrada o sin permisos';
  end if;
  if v_importacion.descuento_inventario_aplicado then return 0; end if;
  for v_item in select vi.*, r.rendimiento_porciones from public.ventas_items vi
    join public.recetas r on r.id = vi.receta_id
   where vi.importacion_id = p_importacion_id and vi.restaurante_id = v_importacion.restaurante_id
     and not vi.inventario_descontado and vi.receta_id is not null for update loop
    for v_ing in select ri.producto_id, ri.cantidad_gramos * v_item.cantidad_vendida / greatest(v_item.rendimiento_porciones, 1) gramos
      from public.recetas_ingredientes ri where ri.receta_id = v_item.receta_id loop
      if exists (select 1 from public.productos p where p.id = v_ing.producto_id and p.cantidad_gramos < v_ing.gramos) then
        raise exception 'Stock insuficiente para descontar la venta';
      end if;
      insert into public.inventario_movimientos(restaurante_id, producto_id, tipo, cantidad_gramos,
        referencia_id, referencia_tipo, registrado_por)
      values (v_importacion.restaurante_id, v_ing.producto_id, 'salida', v_ing.gramos,
        v_item.id, 'venta', p_usuario_id);
    end loop;
    update public.ventas_items set inventario_descontado = true where id = v_item.id;
    v_count := v_count + 1;
  end loop;
  update public.ventas_importaciones set descuento_inventario_aplicado = true,
    descuento_aplicado_en = now(), descuento_aplicado_por = p_usuario_id
    where id = p_importacion_id;
  return v_count;
end $$;

-- -----------------------------------------------------------------------------
-- RLS: se eliminan las políticas tenant genéricas y se definen permisos mínimos.
-- -----------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array[
    'usuarios','usuarios_restaurantes','densidades_producto','categorias_producto','categorias_receta',
    'proveedores','productos','recetas','recetas_ingredientes','recetas_versiones','recetas_pasos',
    'recetas_fotos','recetas_productos_afectados','inventario_movimientos','compras','compras_items',
    'mermas','produccion_lotes','produccion_registros','ventas_importaciones','ventas_items',
    'analisis_consumo','inventario_snapshots','alertas_sistema','briefings','conversaciones_ia',
    'historial_precios_producto'
  ] loop
    execute format('drop policy if exists tenant_access on public.%I', t);
  end loop;
end $$;

drop policy if exists own_restaurant on public.restaurantes;
create policy chefos_restaurante_select on public.restaurantes for select to authenticated
  using (public.chefos_es_miembro(id));
create policy chefos_restaurante_update on public.restaurantes for update to authenticated
  using (public.chefos_tiene_rol(id, array['dueño','administrador']))
  with check (public.chefos_tiene_rol(id, array['dueño','administrador']));

-- Lectura común para entidades del restaurante.
do $$
declare t text;
begin
  foreach t in array array[
    'densidades_producto','categorias_producto','categorias_receta','productos','recetas',
    'recetas_versiones','recetas_pasos','recetas_fotos','recetas_productos_afectados',
    'inventario_movimientos','produccion_lotes','produccion_registros','alertas_sistema','briefings',
    'historial_precios_producto','inventario_snapshots','analisis_consumo'
  ] loop
    execute format('create policy chefos_%I_select on public.%I for select to authenticated using (public.chefos_es_miembro(restaurante_id))', t, t);
  end loop;
end $$;

-- Tablas hijas sin restaurante_id: el tenant se obtiene por la relación padre.
create policy chefos_recetas_ingredientes_select on public.recetas_ingredientes for select to authenticated using (
  exists (select 1 from public.recetas r where r.id = receta_id and public.chefos_es_miembro(r.restaurante_id))
);
create policy chefos_compras_items_select on public.compras_items for select to authenticated using (
  exists (select 1 from public.compras c where c.id = compra_id and public.chefos_es_miembro(c.restaurante_id))
);
create policy chefos_recetas_ingredientes_insert on public.recetas_ingredientes for insert to authenticated with check (
  exists (select 1 from public.recetas r where r.id = receta_id and public.chefos_tiene_rol(r.restaurante_id, array['dueño','chef_ejecutivo','chef_cocina']))
);
create policy chefos_recetas_pasos_insert on public.recetas_pasos for insert to authenticated with check (
  public.chefos_tiene_rol(restaurante_id, array['dueño','chef_ejecutivo','chef_cocina'])
);
create policy chefos_compras_items_insert on public.compras_items for insert to authenticated with check (
  exists (select 1 from public.compras c where c.id = compra_id and public.chefos_tiene_rol(c.restaurante_id, array['dueño','administrador','chef_ejecutivo']))
);

create policy chefos_proveedores_select on public.proveedores for select to authenticated using (public.chefos_es_miembro(restaurante_id));
create policy chefos_proveedores_write on public.proveedores for all to authenticated
  using (public.chefos_tiene_rol(restaurante_id, array['dueño','administrador','chef_ejecutivo']))
  with check (public.chefos_tiene_rol(restaurante_id, array['dueño','administrador','chef_ejecutivo']));
create policy chefos_productos_write on public.productos for all to authenticated
  using (public.chefos_tiene_rol(restaurante_id, array['dueño','administrador','chef_ejecutivo','chef_cocina']))
  with check (public.chefos_tiene_rol(restaurante_id, array['dueño','administrador','chef_ejecutivo','chef_cocina']));
create policy chefos_recetas_write on public.recetas for all to authenticated
  using (public.chefos_tiene_rol(restaurante_id, array['dueño','chef_ejecutivo','chef_cocina']))
  with check (public.chefos_tiene_rol(restaurante_id, array['dueño','chef_ejecutivo','chef_cocina']));
create policy chefos_movimientos_insert on public.inventario_movimientos for insert to authenticated with check (
  public.chefos_tiene_rol(restaurante_id, array['dueño','administrador','chef_ejecutivo','chef_cocina','cocinero'])
);
create policy chefos_mermas_select on public.mermas for select to authenticated using (public.chefos_tiene_rol(restaurante_id, array['dueño','administrador','chef_ejecutivo','chef_cocina']));
create policy chefos_mermas_insert on public.mermas for insert to authenticated with check (public.chefos_tiene_rol(restaurante_id, array['dueño','administrador','chef_ejecutivo','chef_cocina','cocinero']));
create policy chefos_produccion_insert on public.produccion_lotes for insert to authenticated with check (public.chefos_tiene_rol(restaurante_id, array['dueño','administrador','chef_ejecutivo','chef_cocina','cocinero']));
create policy chefos_produccion_update on public.produccion_lotes for update to authenticated using (public.chefos_tiene_rol(restaurante_id, array['dueño','administrador','chef_ejecutivo','chef_cocina']));
create policy chefos_compras_select on public.compras for select to authenticated using (public.chefos_tiene_rol(restaurante_id, array['dueño','administrador','chef_ejecutivo']));
create policy chefos_compras_insert on public.compras for insert to authenticated with check (public.chefos_tiene_rol(restaurante_id, array['dueño','administrador','chef_ejecutivo']));
create policy chefos_ventas_select on public.ventas_importaciones for select to authenticated using (public.chefos_tiene_rol(restaurante_id, array['dueño','administrador']));
create policy chefos_ventas_insert on public.ventas_importaciones for insert to authenticated with check (public.chefos_tiene_rol(restaurante_id, array['dueño','administrador']));
create policy chefos_ventas_items_select on public.ventas_items for select to authenticated using (public.chefos_tiene_rol(restaurante_id, array['dueño','administrador']));
create policy chefos_ventas_items_insert on public.ventas_items for insert to authenticated with check (public.chefos_tiene_rol(restaurante_id, array['dueño','administrador']));
create policy chefos_ventas_items_update on public.ventas_items for update to authenticated using (public.chefos_tiene_rol(restaurante_id, array['dueño','administrador']));

create policy chefos_usuarios_select on public.usuarios for select to authenticated using (public.chefos_es_miembro(restaurante_id));
create policy chefos_usuarios_restaurantes_select on public.usuarios_restaurantes for select to authenticated using (public.chefos_es_miembro(restaurante_id));
create policy chefos_conversaciones_select on public.conversaciones_ia for select to authenticated using (
  public.chefos_es_miembro(restaurante_id) and usuario_id = auth.uid()
);
create policy chefos_conversaciones_insert on public.conversaciones_ia for insert to authenticated with check (
  public.chefos_es_miembro(restaurante_id) and usuario_id = auth.uid()
);

-- Lectura de unidades para cualquier sesión autenticada; no son datos de negocio.
drop policy if exists unidades_medida_select on public.unidades_medida;
create policy unidades_medida_select on public.unidades_medida for select to authenticated using (activa = true);

revoke all on all functions in schema public from anon;
grant usage on schema public to authenticated, service_role;
