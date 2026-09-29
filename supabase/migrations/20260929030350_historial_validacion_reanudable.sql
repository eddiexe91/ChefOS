-- Historial: validación por etapas reanudables, sin publicar ventas. Aplicada 2026-09-29.
begin;
alter table public.ventas_importaciones add column if not exists validacion_parcial jsonb;

-- Only called while the import row is locked by historial_importacion_autorizada.
create or replace function public.validar_historial_paso(p_id uuid,p_manifiesto jsonb,p_paso integer) returns jsonb
language plpgsql security definer set search_path=public set statement_timeout='25s'
set plan_cache_mode='force_custom_plan' as $$
declare i public.ventas_importaciones; res jsonb; k text; n integer; errores integer; duplicados integer;
begin
  i:=public.historial_importacion_autorizada(p_id);
  if i.estado_procesamiento not in ('preparando','validado') or p_paso not between 0 and 5 then raise exception 'Estado o etapa inválida'; end if;
  if p_paso=0 then
    res:=jsonb_build_object('errores',0,'registros',p_manifiesto);
  else
    if i.validacion_parcial is null or i.manifiesto is distinct from p_manifiesto then raise exception 'Inicia la validación desde la etapa 1'; end if;
    if (i.validacion_parcial->>'siguiente')::integer>p_paso then return i.validacion_parcial; end if;
    if (i.validacion_parcial->>'siguiente')::integer<>p_paso then raise exception 'Etapa fuera de orden'; end if;
    res:=i.validacion_parcial->'resumen';
  end if;
  errores:=coalesce((res->>'errores')::integer,0);
  -- No ANALYZE of the shared 500+ MB staging table on every validation.
  -- Each request reads only this package, and PostgreSQL chooses a custom plan.
  case p_paso
  when 0 then
    if jsonb_typeof(p_manifiesto) is distinct from 'object' then raise exception 'Manifiesto inválido'; end if;
    foreach k in array array['productos','tickets','ventas_detalle','pagos'] loop
      select count(*) into n from public.ventas_preparacion where importacion_id=p_id and tipo=k;
      if jsonb_typeof(p_manifiesto->k) is distinct from 'number' or n<>(p_manifiesto->>k)::integer or n=0 then raise exception 'Archivo % incompleto o vacío',k; end if;
      if exists(select 1 from public.ventas_preparacion where importacion_id=p_id and tipo=k having min(secuencia)<>0 or max(secuencia)<>count(*)-1) then raise exception 'Bloques incompletos'; end if;
    end loop;
  when 1 then
    select coalesce(sum(c-1),0)::integer,count(*) filter(where versiones>1 or clave is null)::integer
      into duplicados,errores from (
        select tipo,registro->>'clave' clave,count(*) c,count(distinct md5(registro::text)) versiones
        from public.ventas_preparacion where importacion_id=p_id group by tipo,registro->>'clave'
      )q;
    res:=res||jsonb_build_object('duplicados_archivo',duplicados);
  when 2 then
    errores:=errores+(select count(*) from public.ventas_preparacion s where s.importacion_id=p_id and s.tipo in ('ventas_detalle','pagos') and not exists(
      select 1 from public.ventas_preparacion t where t.importacion_id=p_id and t.tipo='tickets' and t.registro->>'clave'=s.registro->>'ticket'));
    res:=res||jsonb_build_object('tickets_sin_detalle',(select count(*) from public.ventas_preparacion t where t.importacion_id=p_id and t.tipo='tickets' and not exists(
      select 1 from public.ventas_preparacion s where s.importacion_id=p_id and s.tipo='ventas_detalle' and s.registro->>'ticket'=t.registro->>'clave')));
  when 3 then
    res:=res||jsonb_build_object(
      'productos_sin_catalogo',(select count(distinct s.registro->>'producto') from public.ventas_preparacion s where s.importacion_id=p_id and s.tipo='ventas_detalle' and not exists(
        select 1 from public.ventas_preparacion p where p.importacion_id=p_id and p.tipo='productos' and p.registro->>'clave'=s.registro->>'producto')),
      'productos_sin_mapear',(select count(distinct s.registro->>'producto') from public.ventas_preparacion s where s.importacion_id=p_id and s.tipo='ventas_detalle' and not exists(
        select 1 from public.productos_pos p join public.productos_pos_mapeos m on m.pos_id=p.id where p.restaurante_id=i.restaurante_id and p.fuente=i.origen_sistema and p.id_externo=s.registro->>'producto' and m.estado in ('confirmado','ignorado'))));
  when 4 then
    errores:=errores+(select count(*) from public.ventas_preparacion s join public.ventas_tickets t on t.restaurante_id=i.restaurante_id and t.fuente=i.origen_sistema and t.id_externo=s.registro->>'clave' where s.importacion_id=p_id and s.tipo='tickets' and t.huella<>md5(s.registro::text));
    errores:=errores+(select count(*) from public.ventas_preparacion s join public.ventas_items t on t.restaurante_id=i.restaurante_id and t.fuente=i.origen_sistema and t.id_externo=s.registro->>'clave' where s.importacion_id=p_id and s.tipo='ventas_detalle' and t.huella<>md5(s.registro::text));
    errores:=errores+(select count(*) from public.ventas_preparacion s join public.ventas_pagos t on t.restaurante_id=i.restaurante_id and t.fuente=i.origen_sistema and t.id_externo=s.registro->>'clave' where s.importacion_id=p_id and s.tipo='pagos' and t.huella<>md5(s.registro::text));
    res:=res||jsonb_build_object(
      'tickets_existentes',(select count(distinct s.registro->>'clave') from public.ventas_preparacion s join public.ventas_tickets t on t.restaurante_id=i.restaurante_id and t.fuente=i.origen_sistema and t.id_externo=s.registro->>'clave' where s.importacion_id=p_id and s.tipo='tickets'),
      'lineas_existentes',(select count(distinct s.registro->>'clave') from public.ventas_preparacion s join public.ventas_items t on t.restaurante_id=i.restaurante_id and t.fuente=i.origen_sistema and t.id_externo=s.registro->>'clave' where s.importacion_id=p_id and s.tipo='ventas_detalle'),
      'pagos_existentes',(select count(distinct s.registro->>'clave') from public.ventas_preparacion s join public.ventas_pagos t on t.restaurante_id=i.restaurante_id and t.fuente=i.origen_sistema and t.id_externo=s.registro->>'clave' where s.importacion_id=p_id and s.tipo='pagos'));
  when 5 then
    res:=res||jsonb_build_object(
      'desde',(select min(registro->>'fecha') from public.ventas_preparacion where importacion_id=p_id and tipo='tickets'),
      'hasta',(select max(registro->>'fecha') from public.ventas_preparacion where importacion_id=p_id and tipo='tickets'),
      'muestra_tickets',(select coalesce(jsonb_agg(q),'[]') from(select registro->>'clave' ticket,registro->>'fecha' fecha,(registro->>'total')::numeric total_oficial from public.ventas_preparacion where importacion_id=p_id and tipo='tickets' order by secuencia limit 5)q),
      'muestra_lineas',(select coalesce(jsonb_agg(q),'[]') from(select registro->>'ticket' ticket,registro->>'nombre' producto,(registro->>'cantidad')::numeric cantidad,registro->>'fecha' fecha,(registro->>'total')::numeric importe_estimado from public.ventas_preparacion where importacion_id=p_id and tipo='ventas_detalle' order by secuencia limit 5)q),
      'tickets_con_diferencia_pagos',(select count(*) from
        (select registro->>'clave' ticket,max((registro->>'total')::numeric) total from public.ventas_preparacion where importacion_id=p_id and tipo='tickets' group by 1)t
        left join (select ticket,sum(importe) importe from (
          select distinct registro->>'clave' clave,registro->>'ticket' ticket,(registro->>'total')::numeric importe from public.ventas_preparacion where importacion_id=p_id and tipo='pagos'
        )pagos group by ticket)p using(ticket) where abs(t.total-coalesce(p.importe,0))>0.01));
  end case;
  res:=res||jsonb_build_object('errores',errores);
  update public.ventas_importaciones set manifiesto=p_manifiesto,
    validacion_parcial=jsonb_build_object('siguiente',p_paso+1,'resumen',res),
    resultado=case when p_paso=5 then res else resultado end,
    estado_procesamiento=case when p_paso=5 and errores=0 then 'validado' else 'preparando' end
    where id=p_id;
  return jsonb_build_object('siguiente',p_paso+1,'resumen',res);
end $$;

-- Backwards-compatible contract, including atomic revalidation on confirmation.
create or replace function public.validar_historial_pos(p_id uuid,p_manifiesto jsonb) returns jsonb
language plpgsql security definer set search_path=public set statement_timeout='55s' as $$
declare v jsonb; n integer;
begin
  for n in 0..5 loop v:=public.validar_historial_paso(p_id,p_manifiesto,n); end loop;
  return v->'resumen';
end $$;
alter function public.confirmar_historial_pos(uuid) set statement_timeout='55s';
alter function public.confirmar_historial_pos(uuid) set plan_cache_mode='force_custom_plan';

-- New rows invalidate a partial validation. Replayed identical rows do not.
create or replace function public.invalidar_validacion_historial() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  update public.ventas_importaciones set validacion_parcial=null
    where id in (select distinct importacion_id from filas_nuevas) and validacion_parcial is not null;
  return null;
end $$;
create trigger invalidar_validacion_historial after insert on public.ventas_preparacion
referencing new table as filas_nuevas for each statement execute function public.invalidar_validacion_historial();
revoke all on function public.invalidar_validacion_historial() from public,anon,authenticated;
revoke all on function public.validar_historial_paso(uuid,jsonb,integer) from public,anon;
grant execute on function public.validar_historial_paso(uuid,jsonb,integer) to authenticated;
notify pgrst,'reload schema';
commit;
