-- ChefOS: conversiones, semillas y consistencia operativa.

create or replace function public.factor_gramos_por_unidad(
  p_unidad text,
  p_densidad numeric default null,
  p_peso_unitario numeric default null
) returns numeric
language plpgsql immutable
as $$
declare u text := lower(trim(p_unidad));
begin
  if u = 'g' then return 1; end if;
  if u = 'kg' then return 1000; end if;
  if u = 'mg' then return 0.001; end if;
  if u = 'oz' then return 28.3495; end if;
  if u = 'lb' then return 453.592; end if;
  if u in ('lt','l','litro') then return 1000 * coalesce(p_densidad, 1); end if;
  if u in ('ml','mililitro') then return coalesce(p_densidad, 1); end if;
  if u in ('cl','centilitro') then return 10 * coalesce(p_densidad, 1); end if;
  if u in ('unidad','und','u') then return p_peso_unitario; end if;
  if u = 'docena' then return 12 * p_peso_unitario; end if;
  if u in ('caja','bandeja','porcion') then return p_peso_unitario; end if;
  return null;
end $$;

create or replace function public.convertir_a_gramos(
  p_cantidad numeric,
  p_unidad text,
  p_densidad numeric default null,
  p_peso_unitario numeric default null
) returns numeric
language sql immutable
as $$ select p_cantidad * public.factor_gramos_por_unidad(p_unidad, p_densidad, p_peso_unitario) $$;

create or replace function public.inicializar_restaurante(p_restaurante_id uuid)
returns void language plpgsql security definer set search_path = public
as $$
begin
  insert into public.categorias_producto(restaurante_id, nombre, tipo)
  select p_restaurante_id, x.nombre, x.tipo from (values
    ('Pescados','proteina'),('Mariscos','proteina'),('Carnes','proteina'),('Aves','proteina'),
    ('Verduras','verdura'),('Frutas','verdura'),('Lácteos','lacteo'),('Condimentos','condimento'),
    ('Aceites','insumo'),('Harinas','insumo'),('Pastas','insumo'),('Legumbres','insumo'),
    ('Bebidas','bebida'),('Limpieza','limpieza'),('Otros','otro')
  ) x(nombre, tipo) where not exists (
    select 1 from public.categorias_producto c where c.restaurante_id = p_restaurante_id and c.nombre = x.nombre
  );
  insert into public.categorias_receta(restaurante_id, nombre, orden)
  select p_restaurante_id, x.nombre, x.orden from (values
    ('Fondos y Bases',1),('Salsas',2),('Mise en Place',3),('Entradas',4),('Sopas',5),
    ('Platos de Fondo',6),('Guarniciones',7),('Postres',8),('Bebidas',9)
  ) x(nombre, orden) where not exists (
    select 1 from public.categorias_receta c where c.restaurante_id = p_restaurante_id and c.nombre = x.nombre
  );
end $$;

create or replace function public.recalcular_costo_receta(p_receta_id uuid)
returns table(costo_total numeric, costo_porcion numeric, costo_por_gramo numeric)
language plpgsql security definer set search_path = public
as $$
declare v_total numeric; v_porciones integer; v_gramos numeric;
begin
  select coalesce(sum(i.cantidad_gramos * p.costo_por_gramo), 0), r.rendimiento_porciones,
         coalesce(sum(i.cantidad_gramos), 0)
    into v_total, v_porciones, v_gramos
    from public.recetas r left join public.recetas_ingredientes i on i.receta_id = r.id
    left join public.productos p on p.id = i.producto_id
   where r.id = p_receta_id group by r.rendimiento_porciones;
  update public.recetas set costo_total = v_total, costo_porcion = v_total / greatest(v_porciones,1),
    costo_por_gramo = case when v_gramos > 0 then v_total / v_gramos else null end,
    costo_desactualizado = false, costo_actualizado_en = now(), actualizado_en = now()
   where id = p_receta_id;
  return query select v_total, v_total / greatest(v_porciones,1), case when v_gramos > 0 then v_total / v_gramos else null end;
end $$;

create or replace function public.marcar_recetas_desactualizadas()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.costo_unitario_actual is distinct from old.costo_unitario_actual or new.costo_por_gramo is distinct from old.costo_por_gramo then
    update public.recetas r set costo_desactualizado = true, actualizado_en = now()
      where r.id in (select receta_id from public.recetas_ingredientes where producto_id = new.id);
  end if;
  return new;
end $$;

create or replace function public.actualizar_costo_producto()
returns trigger language plpgsql
as $$
begin
  new.costo_por_gramo := public.factor_gramos_por_unidad(new.unidad_medida, new.densidad_g_por_ml, new.peso_unitario_gramos);
  new.actualizado_en := now();
  return new;
end $$;

create or replace function public.calcular_costo_merma()
returns trigger language plpgsql security definer set search_path = public
as $$
declare v_costo_gramo numeric; v_costo_unitario numeric;
begin
  select costo_por_gramo, costo_unitario_actual into v_costo_gramo, v_costo_unitario
    from public.productos where id = new.producto_id;
  if v_costo_gramo is not null and new.cantidad_gramos is not null then new.costo_merma := new.cantidad_gramos * v_costo_gramo;
  else new.costo_merma := coalesce(new.cantidad,0) * coalesce(v_costo_unitario,0); end if;
  return new;
end $$;

create or replace function public.preparar_movimiento_inventario()
returns trigger language plpgsql security definer set search_path = public
as $$
declare v_stock numeric; v_factor numeric; v_delta numeric;
begin
  select cantidad_gramos, public.factor_gramos_por_unidad(unidad_medida, densidad_g_por_ml, peso_unitario_gramos)
    into v_stock, v_factor from public.productos where id = new.producto_id for update;
  if new.tipo = 'ajuste' then v_delta := new.cantidad_gramos - coalesce(v_stock,0);
  elsif new.tipo in ('salida','merma','produccion') then v_delta := -abs(new.cantidad_gramos);
  else v_delta := abs(new.cantidad_gramos); end if;
  new.cantidad_antes_gramos := coalesce(v_stock,0);
  new.cantidad_gramos := v_delta;
  new.cantidad_despues_gramos := coalesce(v_stock,0) + v_delta;
  new.cantidad_antes := coalesce(v_stock,0) / nullif(v_factor,0);
  new.cantidad_despues := new.cantidad_despues_gramos / nullif(v_factor,0);
  return new;
end $$;

create or replace function public.aplicar_movimiento_inventario()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  update public.productos set cantidad_gramos = new.cantidad_despues_gramos,
    stock_actual = coalesce(new.cantidad_despues, stock_actual), actualizado_en = now()
   where id = new.producto_id;
  return new;
end $$;

drop trigger if exists trigger_costo_producto on public.productos;
create trigger trigger_costo_producto before insert or update of unidad_medida, densidad_g_por_ml, peso_unitario_gramos, costo_unitario_actual on public.productos
for each row execute function public.actualizar_costo_producto();
drop trigger if exists trigger_recetas_desactualizadas on public.productos;
create trigger trigger_recetas_desactualizadas after update of costo_unitario_actual, costo_por_gramo on public.productos
for each row execute function public.marcar_recetas_desactualizadas();
drop trigger if exists trigger_costo_merma on public.mermas;
create trigger trigger_costo_merma before insert on public.mermas for each row execute function public.calcular_costo_merma();
drop trigger if exists trigger_preparar_movimiento on public.inventario_movimientos;
create trigger trigger_preparar_movimiento before insert on public.inventario_movimientos for each row execute function public.preparar_movimiento_inventario();
drop trigger if exists trigger_aplicar_movimiento on public.inventario_movimientos;
create trigger trigger_aplicar_movimiento after insert on public.inventario_movimientos for each row execute function public.aplicar_movimiento_inventario();

create or replace function public.escalar_receta(p_receta_id uuid, p_porciones_objetivo integer)
returns table(producto_id uuid, nombre text, cantidad numeric, unidad_medida text, cantidad_gramos numeric)
language sql stable security definer set search_path = public
as $$
  select i.producto_id, p.nombre, i.cantidad * p_porciones_objetivo::numeric / r.rendimiento_porciones,
         i.unidad_medida, i.cantidad_gramos * p_porciones_objetivo::numeric / r.rendimiento_porciones
    from public.recetas_ingredientes i join public.recetas r on r.id = i.receta_id
    join public.productos p on p.id = i.producto_id
   where i.receta_id = p_receta_id and p_porciones_objetivo > 0;
$$;

create or replace function public.registrar_produccion_completa(
  p_restaurante_id uuid, p_receta_id uuid, p_porciones numeric, p_responsable_id uuid,
  p_lote_id uuid default null, p_turno text default 'mañana', p_notas text default null
) returns public.produccion_registros
language plpgsql security definer set search_path = public
as $$
declare v_registro public.produccion_registros; v_lote uuid := p_lote_id; v_ingrediente record;
begin
  if v_lote is null then
    insert into public.produccion_lotes(restaurante_id, fecha, turno, responsable_id)
      values (p_restaurante_id, current_date, p_turno, p_responsable_id)
      on conflict (restaurante_id, fecha, turno) do update set responsable_id = excluded.responsable_id
      returning id into v_lote;
  end if;
  insert into public.produccion_registros(restaurante_id, receta_id, lote_id, cantidad_producida, unidad, fecha_produccion, turno, responsable_id, notas)
    values (p_restaurante_id, p_receta_id, v_lote, p_porciones, 'porciones', current_date, p_turno, p_responsable_id, p_notas)
    returning * into v_registro;
  for v_ingrediente in select i.producto_id, i.cantidad_gramos * p_porciones / greatest(r.rendimiento_porciones,1) gramos
    from public.recetas_ingredientes i join public.recetas r on r.id = i.receta_id where i.receta_id = p_receta_id loop
    insert into public.inventario_movimientos(restaurante_id, producto_id, tipo, cantidad_gramos, referencia_id, referencia_tipo, registrado_por)
      values (p_restaurante_id, v_ingrediente.producto_id, 'produccion', v_ingrediente.gramos, v_registro.id, 'produccion', p_responsable_id);
  end loop;
  update public.produccion_registros set inventario_descontado = true where id = v_registro.id returning * into v_registro;
  update public.produccion_lotes set items_producidos = items_producidos + 1 where id = v_lote;
  return v_registro;
end $$;

create or replace function public.descontar_inventario_por_ventas(p_importacion_id uuid, p_usuario_id uuid)
returns integer language plpgsql security definer set search_path = public
as $$
declare v_item record; v_ing record; v_count integer := 0;
begin
  for v_item in select vi.*, r.rendimiento_porciones from public.ventas_items vi join public.recetas r on r.id = vi.receta_id where vi.importacion_id = p_importacion_id and not vi.inventario_descontado and vi.receta_id is not null loop
    for v_ing in select producto_id, cantidad_gramos * v_item.cantidad_vendida / greatest(v_item.rendimiento_porciones, 1) gramos from public.recetas_ingredientes where receta_id = v_item.receta_id loop
      insert into public.inventario_movimientos(restaurante_id, producto_id, tipo, cantidad_gramos, referencia_id, referencia_tipo, registrado_por)
        values (v_item.restaurante_id, v_ing.producto_id, 'salida', v_ing.gramos, v_item.id, 'venta', p_usuario_id);
    end loop;
    update public.ventas_items set inventario_descontado = true where id = v_item.id;
    v_count := v_count + 1;
  end loop;
  update public.ventas_importaciones set descuento_inventario_aplicado = true, descuento_aplicado_en = now(), descuento_aplicado_por = p_usuario_id where id = p_importacion_id;
  return v_count;
end $$;
