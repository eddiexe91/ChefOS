begin;
create or replace function public.confirmar_historial_pos(p_id uuid) returns jsonb
language plpgsql security definer set search_path=public set statement_timeout='55s' set plan_cache_mode='force_custom_plan' as $$
declare i public.ventas_importaciones; res jsonb; nt integer; ni integer; np integer;
begin
  i:=public.historial_importacion_autorizada(p_id);
  if i.estado_procesamiento='completado' then return i.resultado; end if;
  if i.estado_procesamiento<>'validado' then raise exception 'Validar antes de confirmar'; end if;
  perform pg_advisory_xact_lock(hashtextextended(i.restaurante_id::text,0));
  -- Validated staging is immutable. New rows invalidate its checkpoint.
  if i.validacion_parcial is null or (i.validacion_parcial->>'siguiente')::integer<>6
     or coalesce((i.resultado->>'errores')::integer,1)<>0 then
    raise exception 'Vuelva a validar este paquete antes de confirmar';
  end if;
  res:=i.resultado;
  -- Recheck only mutable canonical data under the restaurant lock.
  if exists(select 1 from public.ventas_preparacion s join public.ventas_tickets t
    on t.restaurante_id=i.restaurante_id and t.fuente=i.origen_sistema and t.id_externo=s.registro->>'clave'
    where s.importacion_id=p_id and s.tipo='tickets' and t.huella<>md5(s.registro::text))
  or exists(select 1 from public.ventas_preparacion s join public.ventas_items t
    on t.restaurante_id=i.restaurante_id and t.fuente=i.origen_sistema and t.id_externo=s.registro->>'clave'
    where s.importacion_id=p_id and s.tipo='ventas_detalle' and t.huella<>md5(s.registro::text))
  or exists(select 1 from public.ventas_preparacion s join public.ventas_pagos t
    on t.restaurante_id=i.restaurante_id and t.fuente=i.origen_sistema and t.id_externo=s.registro->>'clave'
    where s.importacion_id=p_id and s.tipo='pagos' and t.huella<>md5(s.registro::text)) then
    raise exception 'Conflictos: vuelva a validar; hay ventas con la misma identidad y otro contenido';
  end if;
  insert into public.productos_pos(restaurante_id,fuente,id_externo,nombre,categoria,datos)
    select distinct on(registro->>'producto') i.restaurante_id,i.origen_sistema,registro->>'producto',registro->>'nombre',registro->>'categoria',registro->'datos'
    from public.ventas_preparacion where importacion_id=p_id and tipo in ('productos','ventas_detalle')
    order by registro->>'producto',case when tipo='productos' then 0 else 1 end,secuencia
    on conflict(restaurante_id,fuente,id_externo) do nothing;
  insert into public.ventas_tickets(restaurante_id,importacion_id,fuente,id_externo,fecha,hora,franja,total_oficial,datos,huella)
    select distinct on(registro->>'clave') i.restaurante_id,p_id,i.origen_sistema,registro->>'clave',(registro->>'fecha')::date,(registro->>'hora')::time,registro->>'franja',(registro->>'total')::numeric,registro->'datos',md5(registro::text)
    from public.ventas_preparacion where importacion_id=p_id and tipo='tickets' on conflict do nothing;
  get diagnostics nt=row_count;
  insert into public.ventas_items(restaurante_id,importacion_id,ticket_id,pos_id,fuente,id_externo,nombre_original,cantidad_vendida,precio_unitario,total,fecha_venta,hora_venta,franja,datos_origen,huella,requiere_revision)
    select distinct on(s.registro->>'clave') i.restaurante_id,p_id,t.id,p.id,i.origen_sistema,s.registro->>'clave',s.registro->>'nombre',(s.registro->>'cantidad')::numeric,(s.registro->>'precio')::numeric,(s.registro->>'total')::numeric,(s.registro->>'fecha')::date,(s.registro->>'hora')::time,s.registro->>'franja',s.registro->'datos',md5(s.registro::text),true
    from public.ventas_preparacion s join public.ventas_tickets t on t.restaurante_id=i.restaurante_id and t.fuente=i.origen_sistema and t.id_externo=s.registro->>'ticket'
    join public.productos_pos p on p.restaurante_id=i.restaurante_id and p.fuente=i.origen_sistema and p.id_externo=s.registro->>'producto'
    where s.importacion_id=p_id and s.tipo='ventas_detalle' on conflict do nothing;
  get diagnostics ni=row_count;
  insert into public.ventas_pagos(restaurante_id,ticket_id,fuente,id_externo,importe,datos,huella)
    select distinct on(s.registro->>'clave') i.restaurante_id,t.id,i.origen_sistema,s.registro->>'clave',(s.registro->>'total')::numeric,s.registro->'datos',md5(s.registro::text)
    from public.ventas_preparacion s join public.ventas_tickets t on t.restaurante_id=i.restaurante_id and t.fuente=i.origen_sistema and t.id_externo=s.registro->>'ticket'
    where s.importacion_id=p_id and s.tipo='pagos' on conflict do nothing;
  get diagnostics np=row_count;
  res:=res||jsonb_build_object('tickets_nuevos',nt,'lineas_nuevas',ni,'pagos_nuevos',np,'sin_movimientos_inventario',true);
  update public.ventas_importaciones set estado_procesamiento='completado',resultado=res,total_registros=(i.manifiesto->>'ventas_detalle')::integer,fecha_inicio=(res->>'desde')::date,fecha_fin=(res->>'hasta')::date where id=p_id;
  return res;
end $$;

create or replace function public.actualizar_resumen_historial() returns trigger
language plpgsql security definer set search_path=public as $$
begin
 if new.modo<>'historico' or new.estado_procesamiento<>'completado' or old.estado_procesamiento='completado' then return new; end if;
 -- Add only new rows of this import, atomically with the first completion.
 insert into public.ventas_resumen_productos as a
 select v.restaurante_id,v.fecha_venta,v.pos_id,coalesce(extract(hour from v.hora_venta)::integer,-1),coalesce(v.franja,'Sin franja'),sum(v.cantidad_vendida),sum(v.total)
 from public.ventas_items v where v.restaurante_id=new.restaurante_id and v.importacion_id=new.id and v.ticket_id is not null
 group by 1,2,3,4,5
 on conflict(restaurante_id,fecha,pos_id,hora,franja) do update set unidades=a.unidades+excluded.unidades,importe_estimado=a.importe_estimado+excluded.importe_estimado;
 insert into public.ventas_resumen_servicios as a
 select t.restaurante_id,t.fecha,coalesce(extract(hour from t.hora)::integer,-1),coalesce(t.franja,'Sin franja'),count(*),sum(t.total_oficial),
 sum((t.datos->>'personas')::numeric) filter(where (t.datos->>'personas')::numeric>0),
 count(*) filter(where (t.datos->>'personas')::numeric>0),
 coalesce(sum(t.total_oficial) filter(where (t.datos->>'personas')::numeric>0),0),
 sum((t.datos->>'duracion_min')::numeric),count(t.datos->>'duracion_min'),sum((t.datos->>'descuentos')::numeric),sum((t.datos->>'cortesias')::numeric)
 from public.ventas_tickets t where t.restaurante_id=new.restaurante_id and t.importacion_id=new.id group by 1,2,3,4
 on conflict(restaurante_id,fecha,hora,franja) do update set
 tickets=a.tickets+excluded.tickets,
 total_oficial=a.total_oficial+excluded.total_oficial,
 tickets_con_personas=a.tickets_con_personas+excluded.tickets_con_personas,
 venta_con_personas=a.venta_con_personas+excluded.venta_con_personas,
 duraciones=a.duraciones+excluded.duraciones,
 personas=case when a.personas is null and excluded.personas is null then null else coalesce(a.personas,0)+coalesce(excluded.personas,0) end,
 duracion_total=case when a.duracion_total is null and excluded.duracion_total is null then null else coalesce(a.duracion_total,0)+coalesce(excluded.duracion_total,0) end,
 descuentos=case when a.descuentos is null and excluded.descuentos is null then null else coalesce(a.descuentos,0)+coalesce(excluded.descuentos,0) end,
 cortesias=case when a.cortesias is null and excluded.cortesias is null then null else coalesce(a.cortesias,0)+coalesce(excluded.cortesias,0) end;
 return new;
end $$;
revoke all on function public.actualizar_resumen_historial() from public,anon,authenticated;
create index if not exists ventas_tickets_importacion_idx on public.ventas_tickets(restaurante_id,importacion_id);
notify pgrst,'reload schema';
commit;
