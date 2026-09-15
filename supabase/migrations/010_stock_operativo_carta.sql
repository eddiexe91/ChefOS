-- ChefOS Iteración 10
-- Separa materias primas/insumos de productos elaborados sin duplicar filas:
-- la clasificación vive en public.productos.tipo_operativo.
-- La migración es idempotente; la reversión manual puede ignorar o eliminar
-- las columnas nuevas porque el dato original se conserva en metadata.

begin;

alter table public.productos
  add column if not exists tipo_operativo text;

update public.productos
   set tipo_operativo = case
     when coalesce(metadata->>'tipo_operativo', '') in ('materia_prima', 'insumo', 'elaborado')
       then metadata->>'tipo_operativo'
     when coalesce(metadata->>'es_elaborado', '') = 'true'
       then 'elaborado'
     else 'materia_prima'
   end
 where tipo_operativo is null;

alter table public.productos
  alter column tipo_operativo set default 'materia_prima';

update public.productos
   set tipo_operativo = coalesce(tipo_operativo, 'materia_prima'),
       metadata = metadata || jsonb_build_object('tipo_operativo', coalesce(tipo_operativo, 'materia_prima'));

alter table public.productos
  alter column tipo_operativo set not null;

alter table public.productos
  drop constraint if exists productos_tipo_operativo_check;

alter table public.productos
  add constraint productos_tipo_operativo_check
  check (tipo_operativo in ('materia_prima', 'insumo', 'elaborado'));

create index if not exists idx_productos_tipo_operativo
  on public.productos(restaurante_id, tipo_operativo, activo);

alter table public.recetas
  add column if not exists producto_salida_id uuid references public.productos(id) on delete set null;

alter table public.recetas
  add column if not exists cantidad_salida numeric(12,3);

alter table public.recetas
  add column if not exists unidad_salida text;

alter table public.recetas
  add column if not exists cantidad_salida_gramos numeric(14,3);

create index if not exists idx_recetas_producto_salida
  on public.recetas(producto_salida_id)
  where producto_salida_id is not null;

create or replace function public.validar_salida_receta()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_producto public.productos;
  v_gramos numeric;
  v_unidad text;
begin
  if new.producto_salida_id is null and new.cantidad_salida is null and new.unidad_salida is null then
    new.cantidad_salida_gramos := null;
    return new;
  end if;

  if new.es_produccion is distinct from true then
    raise exception 'Solo las recetas de producción pueden configurar producto de salida';
  end if;

  if new.producto_salida_id is null or new.cantidad_salida is null or coalesce(trim(new.unidad_salida), '') = '' then
    raise exception 'La salida de producción requiere producto, cantidad y unidad';
  end if;

  select * into v_producto
    from public.productos
   where id = new.producto_salida_id
   for update;

  if v_producto.id is null or v_producto.restaurante_id <> new.restaurante_id then
    raise exception 'Producto de salida inválido';
  end if;

  if v_producto.tipo_operativo <> 'elaborado' then
    raise exception 'El producto de salida debe pertenecer a Stock disponible';
  end if;

  v_unidad := lower(trim(new.unidad_salida));
  v_gramos := public.convertir_a_gramos(
    new.cantidad_salida,
    v_unidad,
    v_producto.densidad_g_por_ml,
    v_producto.peso_unitario_gramos
  );

  if v_gramos is null or v_gramos <= 0 then
    raise exception 'No fue posible convertir la salida configurada a gramos';
  end if;

  new.unidad_salida := v_unidad;
  new.cantidad_salida_gramos := v_gramos;
  return new;
end $$;

drop trigger if exists trigger_validar_salida_receta on public.recetas;
create trigger trigger_validar_salida_receta
before insert or update of restaurante_id, es_produccion, producto_salida_id, cantidad_salida, unidad_salida
on public.recetas
for each row execute function public.validar_salida_receta();

alter table public.actividad_operativa
  drop constraint if exists actividad_operativa_accion_check;

alter table public.actividad_operativa
  add constraint actividad_operativa_accion_check
  check (accion in (
    'crear_producto','editar_producto','eliminar_producto','archivar_producto','ajustar_stock',
    'crear_receta','editar_receta','archivar_receta',
    'crear_carta','editar_carta','archivar_carta',
    'registrar_produccion'
  ));

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
  if jsonb_array_length(coalesce(p_datos->'ingredientes', '[]'::jsonb)) = 0 then
    raise exception 'La receta requiere ingredientes';
  end if;

  if p_datos->>'categoria_id' is not null and not exists (
    select 1 from public.categorias_receta c
     where c.id = (p_datos->>'categoria_id')::uuid
       and c.restaurante_id = p_restaurante_id
       and c.activa
  ) then
    raise exception 'Categoría no válida';
  end if;

  insert into public.recetas(
    restaurante_id, nombre, descripcion, categoria_id, rendimiento_porciones,
    unidad_rendimiento, precio_venta, tiempo_preparacion, dificultad,
    en_carta, es_produccion, producto_salida_id, cantidad_salida, unidad_salida, creado_por
  ) values (
    p_restaurante_id,
    trim(p_datos->>'nombre'),
    nullif(trim(p_datos->>'descripcion'), ''),
    nullif(p_datos->>'categoria_id', '')::uuid,
    greatest((p_datos->>'rendimiento_porciones')::integer, 1),
    coalesce(nullif(trim(p_datos->>'unidad_rendimiento'), ''), 'porcion'),
    nullif(p_datos->>'precio_venta', '')::numeric,
    nullif(p_datos->>'tiempo_preparacion', '')::integer,
    nullif(p_datos->>'dificultad', ''),
    coalesce((p_datos->>'en_carta')::boolean, false),
    coalesce((p_datos->>'es_produccion')::boolean, false),
    nullif(p_datos->>'producto_salida_id', '')::uuid,
    nullif(p_datos->>'cantidad_salida', '')::numeric,
    nullif(p_datos->>'unidad_salida', ''),
    p_creado_por
  ) returning * into v_receta;

  for v_item in select value from jsonb_array_elements(p_datos->'ingredientes') loop
    select * into v_producto from public.productos p
     where p.id = (v_item->>'producto_id')::uuid
       and p.restaurante_id = p_restaurante_id
       and p.activo;
    if v_producto.id is null then
      raise exception 'Producto de ingrediente no válido';
    end if;
    v_gramos := public.convertir_a_gramos(
      (v_item->>'cantidad')::numeric,
      v_item->>'unidad_medida',
      v_producto.densidad_g_por_ml,
      v_producto.peso_unitario_gramos
    );
    if v_gramos is null then
      raise exception 'No fue posible convertir un ingrediente a gramos';
    end if;
    insert into public.recetas_ingredientes(
      receta_id, producto_id, cantidad, unidad_medida, cantidad_gramos,
      es_opcional, orden, notas
    ) values (
      v_receta.id,
      v_producto.id,
      (v_item->>'cantidad')::numeric,
      v_item->>'unidad_medida',
      v_gramos,
      coalesce((v_item->>'es_opcional')::boolean, false),
      coalesce((v_item->>'orden')::integer, 0),
      nullif(v_item->>'notas', '')
    );
  end loop;

  for v_paso in select value from jsonb_array_elements(coalesce(p_datos->'pasos', '[]'::jsonb)) loop
    insert into public.recetas_pasos(
      receta_id, restaurante_id, numero, titulo, descripcion, duracion_min,
      temperatura_c, tecnica, punto_critico, foto_url
    ) values (
      v_receta.id,
      p_restaurante_id,
      (v_paso->>'numero')::integer,
      trim(v_paso->>'titulo'),
      trim(v_paso->>'descripcion'),
      nullif(v_paso->>'duracion_min', '')::integer,
      nullif(v_paso->>'temperatura_c', '')::numeric,
      nullif(trim(v_paso->>'tecnica'), ''),
      coalesce((v_paso->>'punto_critico')::boolean, false),
      nullif(trim(v_paso->>'foto_url'), '')
    );
  end loop;

  insert into public.recetas_productos_afectados(receta_id, producto_id, restaurante_id, cantidad_gramos)
  select v_receta.id, i.producto_id, p_restaurante_id, sum(i.cantidad_gramos)
    from public.recetas_ingredientes i
   where i.receta_id = v_receta.id
   group by i.producto_id
  on conflict (receta_id, producto_id) do update
    set cantidad_gramos = excluded.cantidad_gramos;

  perform public.recalcular_costo_receta(v_receta.id);
  insert into public.recetas_versiones(
    receta_id, restaurante_id, version_numero, procedimiento,
    ingredientes_snap, costo_total_snap, cambios_descripcion, modificado_por
  )
  values (
    v_receta.id,
    p_restaurante_id,
    1,
    '',
    coalesce((select jsonb_agg(to_jsonb(i) order by i.orden, i.id)
      from public.recetas_ingredientes i where i.receta_id = v_receta.id), '[]'::jsonb),
    (select r.costo_total from public.recetas r where r.id = v_receta.id),
    'Versión inicial',
    p_creado_por
  )
  on conflict (receta_id, version_numero) do nothing;

  select * into v_receta from public.recetas where id = v_receta.id;
  return v_receta;
end $$;

create or replace function public.registrar_produccion_completa(
  p_restaurante_id uuid, p_receta_id uuid, p_porciones numeric, p_responsable_id uuid,
  p_lote_id uuid default null, p_turno text default 'mañana', p_notas text default null
) returns public.produccion_registros
language plpgsql security definer set search_path = public
as $$
declare
  v_registro public.produccion_registros;
  v_lote uuid := p_lote_id;
  v_receta public.recetas;
  v_item record;
  v_total_gramos numeric := 0;
  v_costo numeric := 0;
  v_consumidos jsonb;
  v_salida_producto public.productos;
  v_salida_cantidad_real numeric := 0;
  v_salida_gramos_real numeric := 0;
  v_factor_salida numeric := null;
  v_costo_unitario_salida numeric := null;
  v_usuario_nombre text := null;
begin
  if not public.chefos_tiene_rol(p_restaurante_id, array['dueño','administrador','chef_ejecutivo','chef_cocina','cocinero']) then
    raise exception 'No autorizado para registrar producción';
  end if;
  if auth.role() <> 'service_role' and p_responsable_id is distinct from auth.uid() then
    raise exception 'El responsable no coincide con la sesión';
  end if;
  if p_porciones <= 0 then
    raise exception 'La cantidad producida debe ser positiva';
  end if;

  select * into v_receta
    from public.recetas r
   where r.id = p_receta_id
     and r.restaurante_id = p_restaurante_id
     and r.activa
     and r.es_produccion = true
   for update;
  if v_receta.id is null then
    raise exception 'Receta de producción no encontrada';
  end if;

  select nombre into v_usuario_nombre from public.usuarios where id = p_responsable_id;

  if v_lote is null then
    insert into public.produccion_lotes(restaurante_id, fecha, turno, responsable_id)
      values (p_restaurante_id, current_date, p_turno, p_responsable_id)
      on conflict (restaurante_id, fecha, turno)
      do update set responsable_id = excluded.responsable_id
      returning id into v_lote;
  elsif not exists (
    select 1 from public.produccion_lotes l
     where l.id = v_lote and l.restaurante_id = p_restaurante_id and l.estado = 'en_progreso'
  ) then
    raise exception 'Lote no encontrado o cerrado';
  end if;

  select
    coalesce(sum(i.cantidad_gramos * p_porciones / greatest(v_receta.rendimiento_porciones, 1)), 0),
    coalesce(sum(i.cantidad_gramos * p_porciones / greatest(v_receta.rendimiento_porciones, 1) * coalesce(p.costo_por_gramo, 0)), 0),
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'producto_id', i.producto_id,
          'nombre', p.nombre,
          'cantidad_gramos', i.cantidad_gramos * p_porciones / greatest(v_receta.rendimiento_porciones, 1),
          'costo_linea', i.cantidad_gramos * p_porciones / greatest(v_receta.rendimiento_porciones, 1) * coalesce(p.costo_por_gramo, 0)
        )
      ),
      '[]'::jsonb
    )
  into v_total_gramos, v_costo, v_consumidos
    from public.recetas_ingredientes i
    join public.productos p on p.id = i.producto_id
   where i.receta_id = p_receta_id;

  if exists (
    select 1
      from public.recetas_ingredientes i
      join public.productos p on p.id = i.producto_id
     where i.receta_id = p_receta_id
       and p.cantidad_gramos < i.cantidad_gramos * p_porciones / greatest(v_receta.rendimiento_porciones, 1)
  ) then
    raise exception 'Stock insuficiente para producir la receta';
  end if;

  v_salida_cantidad_real := coalesce(v_receta.cantidad_salida, 0) * p_porciones / greatest(v_receta.rendimiento_porciones, 1);
  v_salida_gramos_real := coalesce(v_receta.cantidad_salida_gramos, 0) * p_porciones / greatest(v_receta.rendimiento_porciones, 1);

  insert into public.produccion_registros(
    restaurante_id, receta_id, producto_id, lote_id, cantidad_producida,
    unidad, cantidad_gramos, fecha_produccion, turno, responsable_id, porciones_reales,
    costo_produccion, costo_real, ingredientes_consumidos, notas
  )
  values (
    p_restaurante_id,
    p_receta_id,
    v_receta.producto_salida_id,
    v_lote,
    p_porciones,
    coalesce(v_receta.unidad_salida, v_receta.unidad_rendimiento, 'porciones'),
    case when v_salida_gramos_real > 0 then v_salida_gramos_real else v_total_gramos end,
    current_date,
    p_turno,
    p_responsable_id,
    round(p_porciones),
    v_costo,
    v_costo,
    v_consumidos,
    p_notas
  ) returning * into v_registro;

  for v_item in
    select i.producto_id,
           i.cantidad_gramos * p_porciones / greatest(v_receta.rendimiento_porciones, 1) gramos,
           p.costo_unitario_actual,
           p.costo_por_gramo
      from public.recetas_ingredientes i
      join public.productos p on p.id = i.producto_id
     where i.receta_id = p_receta_id
  loop
    insert into public.inventario_movimientos(
      restaurante_id, producto_id, tipo, cantidad_gramos,
      costo_unitario, costo_por_gramo, referencia_id, referencia_tipo, registrado_por
    )
    values (
      p_restaurante_id,
      v_item.producto_id,
      'produccion',
      v_item.gramos,
      v_item.costo_unitario_actual,
      v_item.costo_por_gramo,
      v_registro.id,
      'produccion',
      p_responsable_id
    );
  end loop;

  if v_receta.producto_salida_id is not null and v_salida_cantidad_real > 0 and v_salida_gramos_real > 0 then
    select * into v_salida_producto
      from public.productos
     where id = v_receta.producto_salida_id
       and restaurante_id = p_restaurante_id
       and activo
     for update;

    if v_salida_producto.id is null then
      raise exception 'Producto de salida no disponible';
    end if;

    insert into public.inventario_movimientos(
      restaurante_id, producto_id, tipo, cantidad, cantidad_gramos,
      costo_unitario, costo_por_gramo, referencia_id, referencia_tipo, registrado_por, motivo
    )
    values (
      p_restaurante_id,
      v_salida_producto.id,
      'produccion_salida',
      v_salida_cantidad_real,
      v_salida_gramos_real,
      v_salida_producto.costo_unitario_actual,
      v_salida_producto.costo_por_gramo,
      v_registro.id,
      'produccion_salida',
      p_responsable_id,
      'Salida generada por producción'
    );

    v_factor_salida := public.factor_gramos_por_unidad(
      v_salida_producto.unidad_medida,
      v_salida_producto.densidad_g_por_ml,
      v_salida_producto.peso_unitario_gramos
    );

    if v_factor_salida is not null and v_factor_salida > 0 then
      v_costo_unitario_salida := v_costo / nullif(v_salida_gramos_real / v_factor_salida, 0);
      update public.productos
         set costo_unitario_actual = coalesce(v_costo_unitario_salida, costo_unitario_actual),
             metadata = metadata || jsonb_build_object('ultimo_costo_produccion', v_costo, 'ultima_produccion_en', now()),
             actualizado_en = now()
       where id = v_salida_producto.id;
    end if;

    update public.produccion_registros
       set producto_id = v_salida_producto.id,
           unidad = coalesce(v_receta.unidad_salida, v_receta.unidad_rendimiento, 'porciones'),
           cantidad_gramos = v_salida_gramos_real
     where id = v_registro.id
     returning * into v_registro;
  end if;

  update public.produccion_registros
     set inventario_descontado = true
   where id = v_registro.id
   returning * into v_registro;

  update public.produccion_lotes
     set items_producidos = items_producidos + 1,
         costo_total_lote = costo_total_lote + v_costo
   where id = v_lote;

  insert into public.actividad_operativa(
    restaurante_id, usuario_id, accion, entidad_tipo, entidad_id, descripcion, datos
  )
  values (
    p_restaurante_id,
    p_responsable_id,
    'registrar_produccion',
    'produccion',
    v_registro.id,
    format(
      '%s registró producción de %s (%s %s)',
      coalesce(v_usuario_nombre, 'Usuario'),
      v_receta.nombre,
      p_porciones,
      coalesce(v_receta.unidad_salida, v_receta.unidad_rendimiento, 'porciones')
    ),
    jsonb_build_object(
      'receta_id', v_receta.id,
      'receta_nombre', v_receta.nombre,
      'producto_salida_id', v_receta.producto_salida_id,
      'cantidad_salida', v_salida_cantidad_real,
      'cantidad_salida_gramos', v_salida_gramos_real,
      'registro_id', v_registro.id
    )
  );

  return v_registro;
end $$;

revoke all on function public.crear_receta_completa(uuid, uuid, jsonb) from public;
grant execute on function public.crear_receta_completa(uuid, uuid, jsonb) to authenticated, service_role;
revoke all on function public.registrar_produccion_completa(uuid, uuid, numeric, uuid, uuid, text, text) from public;
grant execute on function public.registrar_produccion_completa(uuid, uuid, numeric, uuid, uuid, text, text) to authenticated, service_role;

commit;
