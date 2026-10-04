begin;
alter table public.ventas_importaciones add column if not exists publicacion_parcial jsonb;
alter table public.ventas_pagos add column if not exists importacion_id uuid references public.ventas_importaciones(id);
grant select on public.ventas_importaciones to authenticated;
create policy historial_importaciones_chef_select on public.ventas_importaciones for select to authenticated
using(modo='historico' and public.chefos_tiene_rol(restaurante_id,array['dueño','administrador','chef_ejecutivo']));
-- Publication lookup must not inherit the financial import-list permissions.
-- It returns only a boolean and checks the tenant; it grants no new row access.
create or replace function public.historial_esta_publicado(p_importacion uuid) returns boolean
language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.ventas_importaciones i where i.id=p_importacion
    and i.estado_procesamiento='completado' and public.chefos_es_miembro(i.restaurante_id));
$$;
revoke all on function public.historial_esta_publicado(uuid) from public,anon;
grant execute on function public.historial_esta_publicado(uuid) to authenticated;
-- Pending canonical rows are kept for recovery but never shown as sales.
-- Restrictive policies compose with all existing tenant SELECT policies.
create policy historial_publicado_items on public.ventas_items as restrictive for select to authenticated
using(ticket_id is null or public.historial_esta_publicado(ventas_items.importacion_id));
create policy historial_publicado_tickets on public.ventas_tickets as restrictive for select to authenticated
using(public.historial_esta_publicado(ventas_tickets.importacion_id));
create policy historial_publicado_pagos on public.ventas_pagos as restrictive for select to authenticated
using(exists(select 1 from public.ventas_tickets t
  where t.id=ventas_pagos.ticket_id and public.historial_esta_publicado(coalesce(ventas_pagos.importacion_id,t.importacion_id))));

create or replace function public.proteger_publicacion_en_curso() returns trigger
language plpgsql set search_path=public as $$
begin
  if old.publicacion_parcial is not null and old.estado_procesamiento<>'completado' and
     (new.manifiesto is distinct from old.manifiesto or new.validacion_parcial is distinct from old.validacion_parcial
       or new.estado_procesamiento not in ('validado','completado')) then
    raise exception 'La incorporación está en curso. Continúa el mismo paquete; no cambies los archivos ni vuelvas a validar';
  end if;
  return new;
end $$;
create trigger proteger_publicacion_en_curso before update on public.ventas_importaciones
for each row execute function public.proteger_publicacion_en_curso();
revoke all on function public.proteger_publicacion_en_curso() from public,anon,authenticated;

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
      if exists(select 1 from public.ventas_preparacion s join public.ventas_tickets t
        on t.restaurante_id=i.restaurante_id and t.fuente=i.origen_sistema and t.id_externo=s.registro->>'clave'
        where s.importacion_id=p_id and s.tipo=tipo_archivo and s.secuencia>=inicio and s.secuencia<inicio+limite and t.huella<>md5(s.registro::text)) then raise exception 'Ticket existente con contenido diferente. No se publicó el paquete'; end if;
      insert into public.ventas_tickets(restaurante_id,importacion_id,fuente,id_externo,fecha,hora,franja,total_oficial,datos,huella)
      select i.restaurante_id,p_id,i.origen_sistema,registro->>'clave',(registro->>'fecha')::date,(registro->>'hora')::time,registro->>'franja',(registro->>'total')::numeric,registro->'datos',md5(registro::text)
      from public.ventas_preparacion where importacion_id=p_id and tipo=tipo_archivo and secuencia>=inicio and secuencia<inicio+limite on conflict do nothing;
      get diagnostics nt=row_count;
    elsif fase=2 then
      if exists(select 1 from public.ventas_preparacion s join public.ventas_items v
        on v.restaurante_id=i.restaurante_id and v.fuente=i.origen_sistema and v.id_externo=s.registro->>'clave'
        where s.importacion_id=p_id and s.tipo=tipo_archivo and s.secuencia>=inicio and s.secuencia<inicio+limite and v.huella<>md5(s.registro::text)) then raise exception 'Venta existente con contenido diferente. No se publicó el paquete'; end if;
      insert into public.ventas_items(restaurante_id,importacion_id,ticket_id,pos_id,fuente,id_externo,nombre_original,cantidad_vendida,precio_unitario,total,fecha_venta,hora_venta,franja,datos_origen,huella,requiere_revision)
      select i.restaurante_id,p_id,t.id,p.id,i.origen_sistema,s.registro->>'clave',s.registro->>'nombre',(s.registro->>'cantidad')::numeric,(s.registro->>'precio')::numeric,(s.registro->>'total')::numeric,(s.registro->>'fecha')::date,(s.registro->>'hora')::time,s.registro->>'franja',s.registro->'datos',md5(s.registro::text),true
      from public.ventas_preparacion s join public.ventas_tickets t on t.restaurante_id=i.restaurante_id and t.fuente=i.origen_sistema and t.id_externo=s.registro->>'ticket'
      join public.productos_pos p on p.restaurante_id=i.restaurante_id and p.fuente=i.origen_sistema and p.id_externo=s.registro->>'producto'
      where s.importacion_id=p_id and s.tipo=tipo_archivo and s.secuencia>=inicio and s.secuencia<inicio+limite on conflict do nothing;
      get diagnostics ni=row_count;
    else
      if exists(select 1 from public.ventas_preparacion s join public.ventas_pagos v
        on v.restaurante_id=i.restaurante_id and v.fuente=i.origen_sistema and v.id_externo=s.registro->>'clave'
        where s.importacion_id=p_id and s.tipo=tipo_archivo and s.secuencia>=inicio and s.secuencia<inicio+limite and v.huella<>md5(s.registro::text)) then raise exception 'Pago existente con contenido diferente. No se publicó el paquete'; end if;
      insert into public.ventas_pagos(restaurante_id,importacion_id,ticket_id,fuente,id_externo,importe,datos,huella)
      select i.restaurante_id,p_id,t.id,i.origen_sistema,s.registro->>'clave',(s.registro->>'total')::numeric,s.registro->'datos',md5(s.registro::text)
      from public.ventas_preparacion s join public.ventas_tickets t on t.restaurante_id=i.restaurante_id and t.fuente=i.origen_sistema and t.id_externo=s.registro->>'ticket'
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

-- Legacy contract retained. The current UI calls one short step per request.
create or replace function public.confirmar_historial_pos(p_id uuid) returns jsonb
language plpgsql security definer set search_path=public set statement_timeout='55s' as $$
declare r jsonb;
begin
  loop
    r:=public.confirmar_historial_paso(p_id);
    if (r->>'completado')::boolean then return r->'resultado'; end if;
  end loop;
end $$;
revoke all on function public.confirmar_historial_pos(uuid) from public,anon;
grant execute on function public.confirmar_historial_pos(uuid) to authenticated;
create or replace function public.metricas_historial(p_restaurante uuid,p_desde date,p_hasta date) returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare res jsonb;
begin
 if not public.chefos_es_miembro(p_restaurante) then raise exception 'No autorizado'; end if;
 if p_desde>p_hasta or p_hasta-p_desde>1100 then raise exception 'Rango inválido (máximo 1100 días)'; end if;
 select jsonb_build_object('desde',p_desde,'hasta',p_hasta,'tickets',coalesce(sum(tickets),0),'facturacion',sum(total_oficial),
 'ticket_promedio',sum(total_oficial)/nullif(sum(tickets),0),'cubiertos',sum(personas),
 'venta_por_persona',sum(venta_con_personas)/nullif(sum(personas),0),'tickets_con_personas',sum(tickets_con_personas),
 'duracion_promedio_min',sum(duracion_total)/nullif(sum(duraciones),0),'descuentos',sum(descuentos),'cortesias',sum(cortesias)) into res
 from public.ventas_resumen_servicios where restaurante_id=p_restaurante and fecha between p_desde and p_hasta;
 return res || jsonb_build_object(
 'diario',(select coalesce(jsonb_agg(q order by fecha),'[]') from(select fecha,sum(total_oficial) facturacion,sum(tickets) tickets,sum(personas) cubiertos from public.ventas_resumen_servicios where restaurante_id=p_restaurante and fecha between p_desde and p_hasta group by fecha)q),
 'horas',(select coalesce(jsonb_agg(q order by hora),'[]') from(select hora,sum(total_oficial) facturacion,sum(tickets) tickets from public.ventas_resumen_servicios where restaurante_id=p_restaurante and fecha between p_desde and p_hasta group by hora)q),
 'franjas',(select coalesce(jsonb_agg(q),'[]') from(select franja,sum(total_oficial) facturacion,sum(tickets) tickets,sum(personas) cubiertos from public.ventas_resumen_servicios where restaurante_id=p_restaurante and fecha between p_desde and p_hasta group by franja)q),
 'dias_semana',(select coalesce(jsonb_agg(q order by dia),'[]') from(select extract(isodow from fecha)::integer dia,sum(total_oficial) facturacion,sum(tickets) tickets from public.ventas_resumen_servicios where restaurante_id=p_restaurante and fecha between p_desde and p_hasta group by 1)q),
 'semanas',(select coalesce(jsonb_agg(q order by semana),'[]') from(select date_trunc('week',fecha)::date semana,sum(total_oficial) facturacion,sum(tickets) tickets from public.ventas_resumen_servicios where restaurante_id=p_restaurante and fecha between p_desde and p_hasta group by 1)q),
 'meses',(select coalesce(jsonb_agg(q order by mes),'[]') from(select date_trunc('month',fecha)::date mes,sum(total_oficial) facturacion,sum(tickets) tickets from public.ventas_resumen_servicios where restaurante_id=p_restaurante and fecha between p_desde and p_hasta group by 1)q),
 'productos',(select coalesce(jsonb_agg(q),'[]') from(select p.id,p.nombre,p.categoria,sum(v.unidades) unidades,sum(v.importe_estimado) importe_estimado from public.ventas_resumen_productos v join public.productos_pos p on p.id=v.pos_id where v.restaurante_id=p_restaurante and v.fecha between p_desde and p_hasta group by p.id order by sum(v.unidades) desc limit 1000)q),
 'categorias',(select coalesce(jsonb_agg(q),'[]') from(select p.categoria,sum(v.unidades) unidades,sum(v.importe_estimado) importe_estimado from public.ventas_resumen_productos v join public.productos_pos p on p.id=v.pos_id where v.restaurante_id=p_restaurante and v.fecha between p_desde and p_hasta group by p.categoria)q),
 'pagos',(select coalesce(jsonb_agg(q),'[]') from(select p.datos->>'metodo_nombre' metodo,sum(p.importe) importe,sum((p.datos->>'propina')::numeric) propina from public.ventas_pagos p join public.ventas_tickets t on t.id=p.ticket_id where p.restaurante_id=p_restaurante and exists(select 1 from public.ventas_importaciones i where i.id=coalesce(p.importacion_id,t.importacion_id) and i.estado_procesamiento='completado') and t.fecha between p_desde and p_hasta group by 1)q));
end $$;
revoke all on function public.metricas_historial(uuid,date,date) from public,anon;
grant execute on function public.metricas_historial(uuid,date,date) to authenticated;
notify pgrst,'reload schema';
commit;
