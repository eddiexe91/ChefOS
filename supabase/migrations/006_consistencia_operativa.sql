-- ChefOS: operaciones atómicas y conversiones completas.
-- Ejecutar después de 005_registro_inicial.sql.

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
  if u in ('unidad','und','u','caja','bandeja','porcion') then return p_peso_unitario; end if;
  if u = 'docena' then return 12 * p_peso_unitario; end if;
  return null;
end $$;

create or replace function public.registrar_merma_completa(
  p_restaurante_id uuid,
  p_producto_id uuid,
  p_cantidad numeric,
  p_unidad_medida text,
  p_motivo text,
  p_responsable_id uuid,
  p_notas text default null
) returns public.mermas
language plpgsql security definer set search_path = public
as $$
declare v_merma public.mermas; v_gramos numeric;
begin
  if not exists (select 1 from public.usuarios where id = auth.uid() and restaurante_id = p_restaurante_id and activo) then
    raise exception 'No autorizado para registrar esta merma';
  end if;
  select public.convertir_a_gramos(p_cantidad, p_unidad_medida, densidad_g_por_ml, peso_unitario_gramos)
    into v_gramos from public.productos where id = p_producto_id and restaurante_id = p_restaurante_id and activo;
  if v_gramos is null then raise exception 'No fue posible convertir la cantidad a gramos'; end if;
  insert into public.mermas(restaurante_id, producto_id, cantidad, unidad_medida, cantidad_gramos, motivo, responsable_id, notas)
    values (p_restaurante_id, p_producto_id, p_cantidad, p_unidad_medida, v_gramos, p_motivo, coalesce(p_responsable_id, auth.uid()), p_notas)
    returning * into v_merma;
  insert into public.inventario_movimientos(restaurante_id, producto_id, tipo, cantidad_gramos, costo_unitario, costo_por_gramo, motivo, referencia_id, referencia_tipo, registrado_por)
    select p_restaurante_id, p_producto_id, 'merma', v_gramos, costo_unitario_actual, costo_por_gramo, p_motivo, v_merma.id, 'merma', coalesce(p_responsable_id, auth.uid())
    from public.productos where id = p_producto_id;
  return v_merma;
end $$;

create or replace function public.recibir_compra_completa(p_compra_id uuid, p_usuario_id uuid)
returns public.compras
language plpgsql security definer set search_path = public
as $$
declare v_compra public.compras; v_item record;
begin
  select c.* into v_compra
    from public.compras c join public.usuarios u on u.restaurante_id = c.restaurante_id
   where c.id = p_compra_id and u.id = auth.uid() and u.activo and u.rol in ('dueño','administrador','chef_ejecutivo')
   for update;
  if v_compra.id is null then raise exception 'Compra no encontrada o sin permisos'; end if;
  if v_compra.estado = 'recibida' then return v_compra; end if;
  for v_item in select * from public.compras_items where compra_id = p_compra_id loop
    insert into public.inventario_movimientos(restaurante_id, producto_id, tipo, cantidad_gramos, costo_unitario, referencia_id, referencia_tipo, registrado_por)
      values (v_compra.restaurante_id, v_item.producto_id, 'entrada', coalesce(v_item.cantidad_gramos, 0), v_item.precio_unitario, p_compra_id, 'compra', p_usuario_id);
  end loop;
  update public.compras set estado = 'recibida' where id = p_compra_id returning * into v_compra;
  return v_compra;
end $$;
