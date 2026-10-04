begin;
-- Restricted operation, not general INSERT access: derive tenant, actor, date
-- and quantities from trusted rows. A caller cannot forge past/foreign stock.
create or replace function public.guardar_copia_existencias() returns jsonb
language plpgsql security definer set search_path=public as $$
declare r uuid; zona text; fecha_copia date; n integer;
begin
  select restaurante_id into r from public.usuarios where id=auth.uid() and activo;
  if r is null or not public.chefos_tiene_rol(r,array['dueño','administrador','chef_ejecutivo']) then
    raise exception 'Solo Dueño, Administración o Chef Ejecutivo pueden guardar copias';
  end if;
  select zona_horaria into zona from public.restaurantes where id=r;
  fecha_copia:=(now() at time zone coalesce(zona,'America/Santiago'))::date;
  perform pg_advisory_xact_lock(hashtextextended('snapshot:'||r::text,0));
  insert into public.inventario_snapshots(restaurante_id,producto_id,fecha,tipo_snapshot,cantidad_gramos,registrado_por)
  select r,id,fecha_copia,'manual',cantidad_gramos,auth.uid() from public.productos where restaurante_id=r and activo
  on conflict(restaurante_id,producto_id,fecha,tipo_snapshot) do update
    set cantidad_gramos=excluded.cantidad_gramos,registrado_por=excluded.registrado_por,creado_en=now();
  get diagnostics n=row_count;
  return jsonb_build_object('productos',n,'fecha',fecha_copia,'sin_movimientos_inventario',true);
end $$;
revoke all on function public.guardar_copia_existencias() from public,anon;
grant execute on function public.guardar_copia_existencias() to authenticated;

create or replace function public.generar_alerta_stock_critico() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  -- Minimum zero is configuration, not a purchase quantity. Alert events are
  -- immutable history; the Briefing calculates current shortages separately.
  if new.activo and new.stock_minimo>0 and new.stock_actual<new.stock_minimo and
     (tg_op='INSERT' or not old.activo or old.stock_actual>=old.stock_minimo
      or old.stock_minimo is distinct from new.stock_minimo) then
    insert into public.alertas_sistema(restaurante_id,tipo,severidad,mensaje,datos,referencia_id,referencia_tipo)
    values(new.restaurante_id,'stock_critico',case when new.stock_actual<=0 then 'critica' else 'alta' end,
      format('Stock crítico: %s (%s %s disponibles al detectar la alerta)',new.nombre,round(new.stock_actual,3),new.unidad_medida),
      jsonb_build_object('producto_id',new.id,'stock_actual',new.stock_actual,'stock_minimo',new.stock_minimo,'unidad',new.unidad_medida),new.id,'producto');
  end if;
  return new;
end $$;
revoke all on function public.generar_alerta_stock_critico() from public,anon,authenticated;
drop trigger if exists trigger_alerta_stock_critico on public.productos;
create trigger trigger_alerta_stock_critico after insert or update of stock_actual,stock_minimo,cantidad_gramos,stock_minimo_gramos,activo
on public.productos for each row execute function public.generar_alerta_stock_critico();
notify pgrst,'reload schema';
commit;
