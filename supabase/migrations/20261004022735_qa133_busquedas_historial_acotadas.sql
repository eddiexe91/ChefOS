-- Bounded unique-key lookups even before auto-analyze updates new table statistics.
-- Avoid repeated scans of the full tenant bucket for each staged row.
begin;
create or replace function public.confirmar_historial_paso(p_id uuid) returns jsonb
language plpgsql security definer set search_path=public set statement_timeout='20s'
set lock_timeout='5s' set plan_cache_mode='force_custom_plan' as $$
declare i public.ventas_importaciones; cursor jsonb; fase integer; inicio integer; limite integer;
  tipo_archivo text; n integer:=0; nt integer:=0; ni integer:=0; np integer:=0; res jsonb;
begin
  i:=public.historial_importacion_autorizada(p_id);
  if i.estado_procesamiento='completado' then return jsonb_build_object('completado',true,'resultado',i.resultado); end if;
  if i.estado_procesamiento<>'validado' or i.validacion_parcial is null
    or (i.validacion_parcial->>'siguiente')::integer<>6 or coalesce((i.resultado->>'errores')::integer,1)<>0 then
    raise exception 'Valida y revisa este paquete antes de confirmar';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(i.restaurante_id::text,0));
  if exists(select 1 from public.ventas_importaciones where restaurante_id=i.restaurante_id
    and id<>p_id and publicacion_parcial is not null and estado_procesamiento<>'completado') then
    raise exception 'Otro paquete de este restaurante está incorporándose. Recupéralo y termínalo antes de confirmar otro';
  end if;
  cursor:=coalesce(i.publicacion_parcial,jsonb_build_object('fase',0,'inicio',0,'tickets_nuevos',0,'lineas_nuevas',0,'pagos_nuevos',0));
  fase:=(cursor->>'fase')::integer; inicio:=(cursor->>'inicio')::integer;
  if fase=0 then
    insert into public.productos_pos(restaurante_id,fuente,id_externo,nombre,categoria,datos)
    select distinct on(registro->>'producto') i.restaurante_id,i.origen_sistema,registro->>'producto',registro->>'nombre',registro->>'categoria',registro->'datos'
    from public.ventas_preparacion where importacion_id=p_id and tipo='productos' on conflict do nothing;
    insert into public.productos_pos(restaurante_id,fuente,id_externo,nombre,categoria,datos)
    select distinct on(s.registro->>'producto') i.restaurante_id,i.origen_sistema,s.registro->>'producto',s.registro->>'nombre',s.registro->>'categoria',s.registro->'datos'
    from public.ventas_preparacion s where s.importacion_id=p_id and s.tipo='ventas_detalle' and not exists(
      select 1 from public.productos_pos p where p.restaurante_id=i.restaurante_id and p.fuente=i.origen_sistema and p.id_externo=s.registro->>'producto') on conflict do nothing;
    fase:=1;
  elsif fase between 1 and 3 then
    tipo_archivo:=case fase when 1 then 'tickets' when 2 then 'ventas_detalle' else 'pagos' end;
    limite:=case fase when 2 then 500 else 250 end;
    if fase=1 then
      if exists(select 1 from public.ventas_preparacion s join lateral(select t.huella from public.ventas_tickets t
        where t.restaurante_id=i.restaurante_id and t.fuente=i.origen_sistema and t.id_externo=s.registro->>'clave' limit 1) t on true
        where s.importacion_id=p_id and s.tipo=tipo_archivo and s.secuencia>=inicio and s.secuencia<inicio+limite and t.huella<>md5(s.registro::text)) then raise exception 'Ticket existente con contenido diferente. No se publicó el paquete'; end if;
      insert into public.ventas_tickets(restaurante_id,importacion_id,fuente,id_externo,fecha,hora,franja,total_oficial,datos,huella)
      select i.restaurante_id,p_id,i.origen_sistema,registro->>'clave',(registro->>'fecha')::date,(registro->>'hora')::time,registro->>'franja',(registro->>'total')::numeric,registro->'datos',md5(registro::text)
      from public.ventas_preparacion where importacion_id=p_id and tipo=tipo_archivo and secuencia>=inicio and secuencia<inicio+limite on conflict do nothing;
      get diagnostics nt=row_count;
    elsif fase=2 then
      if exists(select 1 from public.ventas_preparacion s join lateral(select v.huella from public.ventas_items v
        where v.restaurante_id=i.restaurante_id and v.fuente=i.origen_sistema and v.id_externo=s.registro->>'clave' limit 1) v on true
        where s.importacion_id=p_id and s.tipo=tipo_archivo and s.secuencia>=inicio and s.secuencia<inicio+limite and v.huella<>md5(s.registro::text)) then raise exception 'Venta existente con contenido diferente. No se publicó el paquete'; end if;
      insert into public.ventas_items(restaurante_id,importacion_id,ticket_id,pos_id,fuente,id_externo,nombre_original,cantidad_vendida,precio_unitario,total,fecha_venta,hora_venta,franja,datos_origen,huella,requiere_revision)
      select i.restaurante_id,p_id,t.id,p.id,i.origen_sistema,s.registro->>'clave',s.registro->>'nombre',(s.registro->>'cantidad')::numeric,(s.registro->>'precio')::numeric,(s.registro->>'total')::numeric,(s.registro->>'fecha')::date,(s.registro->>'hora')::time,s.registro->>'franja',s.registro->'datos',md5(s.registro::text),true
      from public.ventas_preparacion s join lateral(select t.id from public.ventas_tickets t where t.restaurante_id=i.restaurante_id and t.fuente=i.origen_sistema and t.id_externo=s.registro->>'ticket' limit 1) t on true
      join lateral(select p.id from public.productos_pos p where p.restaurante_id=i.restaurante_id and p.fuente=i.origen_sistema and p.id_externo=s.registro->>'producto' limit 1) p on true
      where s.importacion_id=p_id and s.tipo=tipo_archivo and s.secuencia>=inicio and s.secuencia<inicio+limite on conflict do nothing;
      get diagnostics ni=row_count;
    else
      if exists(select 1 from public.ventas_preparacion s join lateral(select v.huella from public.ventas_pagos v
        where v.restaurante_id=i.restaurante_id and v.fuente=i.origen_sistema and v.id_externo=s.registro->>'clave' limit 1) v on true
        where s.importacion_id=p_id and s.tipo=tipo_archivo and s.secuencia>=inicio and s.secuencia<inicio+limite and v.huella<>md5(s.registro::text)) then raise exception 'Pago existente con contenido diferente. No se publicó el paquete'; end if;
      insert into public.ventas_pagos(restaurante_id,importacion_id,ticket_id,fuente,id_externo,importe,datos,huella)
      select i.restaurante_id,p_id,t.id,i.origen_sistema,s.registro->>'clave',(s.registro->>'total')::numeric,s.registro->'datos',md5(s.registro::text)
      from public.ventas_preparacion s join lateral(select t.id from public.ventas_tickets t where t.restaurante_id=i.restaurante_id and t.fuente=i.origen_sistema and t.id_externo=s.registro->>'ticket' limit 1) t on true
      where s.importacion_id=p_id and s.tipo=tipo_archivo and s.secuencia>=inicio and s.secuencia<inicio+limite on conflict do nothing;
      get diagnostics np=row_count;
    end if;
    inicio:=least(inicio+limite,(i.manifiesto->>tipo_archivo)::integer);
    if inicio>=(i.manifiesto->>tipo_archivo)::integer then fase:=fase+1; inicio:=0; end if;
  elsif fase=4 then
    res:=i.resultado||jsonb_build_object('tickets_nuevos',(cursor->>'tickets_nuevos')::integer,'lineas_nuevas',(cursor->>'lineas_nuevas')::integer,'pagos_nuevos',(cursor->>'pagos_nuevos')::integer,'sin_movimientos_inventario',true);
    -- Publication and all aggregates commit together. Pending rows never leak.
    update public.ventas_importaciones set estado_procesamiento='completado',resultado=res,
      total_registros=(i.manifiesto->>'ventas_detalle')::integer,fecha_inicio=(res->>'desde')::date,fecha_fin=(res->>'hasta')::date,
      publicacion_parcial=cursor||jsonb_build_object('fase',5,'completado',true) where id=p_id;
    return jsonb_build_object('completado',true,'resultado',res);
  else raise exception 'Etapa de incorporación inválida'; end if;
  cursor:=cursor||jsonb_build_object('fase',fase,'inicio',inicio,'tickets_nuevos',(cursor->>'tickets_nuevos')::integer+nt,'lineas_nuevas',(cursor->>'lineas_nuevas')::integer+ni,'pagos_nuevos',(cursor->>'pagos_nuevos')::integer+np);
  update public.ventas_importaciones set publicacion_parcial=cursor where id=p_id;
  return jsonb_build_object('completado',false,'avance',cursor,'registros',i.manifiesto);
end $$;
revoke all on function public.confirmar_historial_paso(uuid) from public,anon;
grant execute on function public.confirmar_historial_paso(uuid) to authenticated;
notify pgrst,'reload schema';
commit;
