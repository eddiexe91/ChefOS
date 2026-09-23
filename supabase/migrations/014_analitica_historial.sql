begin;
-- Agregados por hora/producto y por ticket: no multiplicar cabeceras por líneas/pagos.
create table public.ventas_resumen_productos (
  restaurante_id uuid not null references public.restaurantes(id), fecha date not null, pos_id uuid not null references public.productos_pos(id),
  hora integer not null, franja text not null, unidades numeric not null, importe_estimado numeric not null,
  primary key(restaurante_id,fecha,pos_id,hora,franja)
);
create table public.ventas_resumen_servicios (
  restaurante_id uuid not null references public.restaurantes(id), fecha date not null, hora integer not null, franja text not null,
  tickets integer not null,total_oficial numeric not null,personas numeric, tickets_con_personas integer not null,
  venta_con_personas numeric not null,duracion_total numeric,duraciones integer not null,descuentos numeric,cortesias numeric,
  primary key(restaurante_id,fecha,hora,franja)
);
do $$ declare t text; begin
 foreach t in array array['ventas_resumen_productos','ventas_resumen_servicios'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated',t);
  execute format('grant select on public.%I to authenticated',t);
  execute format('create policy leer_resumen on public.%I for select to authenticated using(public.chefos_es_miembro(restaurante_id))',t);
 end loop;
end $$;
create function public.actualizar_resumen_historial() returns trigger
language plpgsql security definer set search_path=public as $$
begin
 if new.modo<>'historico' or new.estado_procesamiento<>'completado' or old.estado_procesamiento='completado' then return new; end if;
 -- Se ejecuta dentro de la misma transacción que publica ventas: fallo => rollback completo.
 delete from public.ventas_resumen_productos where restaurante_id=new.restaurante_id;
 insert into public.ventas_resumen_productos
 select v.restaurante_id,v.fecha_venta,v.pos_id,coalesce(extract(hour from v.hora_venta)::integer,-1),coalesce(v.franja,'Sin franja'),sum(v.cantidad_vendida),sum(v.total)
 from public.ventas_items v where v.restaurante_id=new.restaurante_id and v.ticket_id is not null
 group by 1,2,3,4,5;
 delete from public.ventas_resumen_servicios where restaurante_id=new.restaurante_id;
 insert into public.ventas_resumen_servicios
 select t.restaurante_id,t.fecha,coalesce(extract(hour from t.hora)::integer,-1),coalesce(t.franja,'Sin franja'),count(*),sum(t.total_oficial),
 sum((t.datos->>'personas')::numeric) filter(where (t.datos->>'personas')::numeric>0),
 count(*) filter(where (t.datos->>'personas')::numeric>0),
 coalesce(sum(t.total_oficial) filter(where (t.datos->>'personas')::numeric>0),0),
 sum((t.datos->>'duracion_min')::numeric),count(t.datos->>'duracion_min'),sum((t.datos->>'descuentos')::numeric),sum((t.datos->>'cortesias')::numeric)
 from public.ventas_tickets t where t.restaurante_id=new.restaurante_id group by 1,2,3,4;
 return new;
end $$;
create trigger resumen_historial after update on public.ventas_importaciones for each row execute function public.actualizar_resumen_historial();

create function public.metricas_historial(p_restaurante uuid,p_desde date,p_hasta date) returns jsonb
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
 'pagos',(select coalesce(jsonb_agg(q),'[]') from(select p.datos->>'metodo_nombre' metodo,sum(p.importe) importe,sum((p.datos->>'propina')::numeric) propina from public.ventas_pagos p join public.ventas_tickets t on t.id=p.ticket_id where p.restaurante_id=p_restaurante and t.fecha between p_desde and p_hasta group by 1)q));
end $$;

-- Contexto pequeño, determinista y común al generador manual y al programado.
create function public.contexto_ventas_briefing(p_restaurante uuid,p_fecha date) returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare ultima date; n integer; lista jsonb;
begin
 if not public.chefos_es_miembro(p_restaurante) and coalesce(auth.role(),'')<>'service_role' then raise exception 'No autorizado'; end if;
 select max(fecha) into ultima from public.ventas_resumen_servicios where restaurante_id=p_restaurante and fecha<p_fecha;
 select count(distinct fecha) into n from public.ventas_resumen_servicios where restaurante_id=p_restaurante and fecha>=p_fecha-56 and fecha<p_fecha and extract(isodow from fecha)=extract(isodow from p_fecha);
 select coalesce(jsonb_agg(q),'[]') into lista from (
  select p.id pos_id,p.nombre,m.receta_id,m.producto_id,m.estado mapeo,
   round(sum(v.unidades) filter(where extract(isodow from v.fecha)=extract(isodow from p_fecha))/nullif(n,0),1) unidades_promedio,
   coalesce(sum(v.unidades) filter(where v.fecha>=p_fecha-28),0) unidades_4_semanas,
   coalesce(sum(v.unidades) filter(where v.fecha<p_fecha-28),0) unidades_4_semanas_previas
  from public.ventas_resumen_productos v join public.productos_pos p on p.id=v.pos_id left join public.productos_pos_mapeos m on m.pos_id=p.id
  where v.restaurante_id=p_restaurante and v.fecha>=p_fecha-56 and v.fecha<p_fecha and coalesce(m.estado,'pendiente')<>'ignorado'
  group by p.id,m.receta_id,m.producto_id,m.estado
  order by sum(v.unidades) filter(where extract(isodow from v.fecha)=extract(isodow from p_fecha)) desc nulls last limit 8
 )q;
 return jsonb_build_object('version','historico-v1','desde',p_fecha-56,'hasta',p_fecha-1,'fecha_objetivo',p_fecha,'ultima_venta',ultima,'dias_comparables',n,'productos',lista,
 'dias_4_semanas',(select count(distinct fecha) from public.ventas_resumen_servicios where restaurante_id=p_restaurante and fecha>=p_fecha-28 and fecha<p_fecha),
 'dias_4_semanas_previas',(select count(distinct fecha) from public.ventas_resumen_servicios where restaurante_id=p_restaurante and fecha>=p_fecha-56 and fecha<p_fecha-28),
 'confianza','no_calibrada','limitaciones',jsonb_build_array('Promedio observado en días con tickets importados; no prueba cobertura completa ni predice certeza.','No descuenta stock ni determina descongelación: falta disponibilidad por estado y validación del chef.'));
end $$;
revoke all on function public.metricas_historial(uuid,date,date) from public,anon;
revoke all on function public.contexto_ventas_briefing(uuid,date) from public,anon;
grant execute on function public.metricas_historial(uuid,date,date) to authenticated;
grant execute on function public.contexto_ventas_briefing(uuid,date) to authenticated,service_role;
-- Total para consumidores existentes: cabeceras oficiales + líneas operativas sin ticket.
create function public.total_ventas_periodo(p_restaurante uuid,p_desde date,p_hasta date) returns numeric
language plpgsql stable security definer set search_path=public as $$
begin
 if not public.chefos_es_miembro(p_restaurante) then raise exception 'No autorizado'; end if;
 if p_desde>p_hasta or p_hasta-p_desde>1100 then raise exception 'Rango inválido'; end if;
 return coalesce((select sum(total_oficial) from public.ventas_resumen_servicios where restaurante_id=p_restaurante and fecha between p_desde and p_hasta),0)
   +coalesce((select sum(total) from public.ventas_items where restaurante_id=p_restaurante and ticket_id is null and fecha_venta between p_desde and p_hasta),0);
end $$;
revoke all on function public.total_ventas_periodo(uuid,date,date) from public,anon;
grant execute on function public.total_ventas_periodo(uuid,date,date) to authenticated,service_role;
commit;
