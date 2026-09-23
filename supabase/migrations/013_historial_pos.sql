-- Historial canónico: aditivo, sin movimientos de inventario. Aplicar después de 012.
begin;
alter table public.ventas_importaciones add column if not exists modo text not null default 'operativo';
alter table public.ventas_importaciones add column if not exists zona_horaria text;
alter table public.ventas_importaciones add column if not exists manifiesto jsonb;
alter table public.ventas_importaciones add column if not exists resultado jsonb;
alter table public.ventas_importaciones add column if not exists creado_en timestamptz not null default now();

create table public.ventas_preparacion (
  importacion_id uuid not null references public.ventas_importaciones(id),
  restaurante_id uuid not null references public.restaurantes(id),
  tipo text not null check(tipo in ('tickets','productos','ventas_detalle','pagos')),
  secuencia integer not null check(secuencia >= 0),
  registro jsonb not null check(jsonb_typeof(registro)='object'),
  primary key(importacion_id,tipo,secuencia)
);
create index on public.ventas_preparacion(importacion_id,tipo,(registro->>'clave'));
create index on public.ventas_preparacion(importacion_id,tipo,(registro->>'ticket'));
create index on public.ventas_preparacion(importacion_id,tipo,(registro->>'producto'));
create table public.productos_pos (
  id uuid primary key default gen_random_uuid(), restaurante_id uuid not null references public.restaurantes(id),
  fuente text not null, id_externo text not null, nombre text not null, categoria text,
  datos jsonb not null default '{}',
  unique(restaurante_id,fuente,id_externo), unique(restaurante_id,id)
);
create table public.productos_pos_mapeos (
  restaurante_id uuid not null references public.restaurantes(id), pos_id uuid primary key,
  receta_id uuid references public.recetas(id), producto_id uuid references public.productos(id),
  estado text not null check(estado in ('confirmado','ignorado','pendiente')),
  actualizado_por uuid references public.usuarios(id), actualizado_en timestamptz not null default now(),
  foreign key(restaurante_id,pos_id) references public.productos_pos(restaurante_id,id),
  check ((estado='confirmado' and num_nonnulls(receta_id,producto_id)=1) or (estado<>'confirmado' and num_nonnulls(receta_id,producto_id)=0))
);
create table public.ventas_tickets (
  id uuid primary key default gen_random_uuid(), restaurante_id uuid not null references public.restaurantes(id),
  importacion_id uuid not null references public.ventas_importaciones(id), fuente text not null,
  id_externo text not null, fecha date not null, hora time, franja text,
  total_oficial numeric(14,2) not null check(total_oficial>=0), datos jsonb not null,
  huella text not null, unique(restaurante_id,fuente,id_externo), unique(restaurante_id,id)
);
create index on public.ventas_tickets(restaurante_id,fecha);
alter table public.ventas_items add column if not exists ticket_id uuid;
alter table public.ventas_items add column if not exists pos_id uuid;
alter table public.ventas_items add column if not exists id_externo text;
alter table public.ventas_items add column if not exists fuente text;
alter table public.ventas_items add column if not exists franja text;
alter table public.ventas_items add column if not exists datos_origen jsonb;
alter table public.ventas_items add column if not exists huella text;
alter table public.ventas_items add constraint ventas_ticket_tenant_fk foreign key(restaurante_id,ticket_id) references public.ventas_tickets(restaurante_id,id);
alter table public.ventas_items add constraint ventas_pos_tenant_fk foreign key(restaurante_id,pos_id) references public.productos_pos(restaurante_id,id);
create unique index ventas_item_identidad on public.ventas_items(restaurante_id,fuente,id_externo) where id_externo is not null;
create index on public.ventas_items(restaurante_id,fecha_venta,pos_id);
create table public.ventas_pagos (
  id uuid primary key default gen_random_uuid(), restaurante_id uuid not null references public.restaurantes(id),
  ticket_id uuid not null, fuente text not null, id_externo text not null,
  importe numeric(14,2) not null check(importe>=0), datos jsonb not null, huella text not null,
  foreign key(restaurante_id,ticket_id) references public.ventas_tickets(restaurante_id,id),
  unique(restaurante_id,fuente,id_externo)
);
create index on public.ventas_pagos(restaurante_id,ticket_id);

-- Tablas nuevas no admiten escritura directa. Los RPC comprueban tenant y rol.
do $$ declare t text; begin
  foreach t in array array['ventas_preparacion','productos_pos','productos_pos_mapeos','ventas_tickets','ventas_pagos'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from public,anon,authenticated',t);
    execute format('grant select on public.%I to authenticated',t);
    execute format('create policy leer_mi_restaurante on public.%I for select to authenticated using (public.chefos_es_miembro(restaurante_id))',t);
  end loop;
end $$;

create function public.historial_importacion_autorizada(p_id uuid)
returns public.ventas_importaciones language plpgsql security definer set search_path=public as $$
declare i public.ventas_importaciones;
begin
  select * into i from public.ventas_importaciones where id=p_id for update;
  if i.id is null or i.modo<>'historico' or not public.chefos_tiene_rol(i.restaurante_id,array['dueño','administrador','chef_ejecutivo']) then
    raise exception 'Importación no autorizada';
  end if;
  return i;
end $$;
revoke all on function public.historial_importacion_autorizada(uuid) from public,anon,authenticated;

create function public.iniciar_historial_pos(p_fuente text,p_zona text) returns uuid
language plpgsql security definer set search_path=public as $$
declare r uuid; i uuid;
begin
  select restaurante_id into r from public.usuarios where id=auth.uid() and activo;
  if r is null or not public.chefos_tiene_rol(r,array['dueño','administrador','chef_ejecutivo']) then raise exception 'No autorizado'; end if;
  if p_fuente !~ '^[a-z0-9_-]{1,50}$' or not exists(select 1 from pg_timezone_names where name=p_zona) then raise exception 'Fuente o zona inválida'; end if;
  insert into public.ventas_importaciones(restaurante_id,fecha_inicio,fecha_fin,origen_sistema,modo,zona_horaria,estado_procesamiento,procesado_por)
    values(r,current_date,current_date,p_fuente,'historico',p_zona,'preparando',auth.uid()) returning id into i;
  return i;
end $$;

create function public.preparar_historial_bloque(p_id uuid,p_tipo text,p_inicio integer,p_filas jsonb) returns integer
language plpgsql security definer set search_path=public as $$
  declare i public.ventas_importaciones; n integer;
begin
  i:=public.historial_importacion_autorizada(p_id);
  if i.estado_procesamiento<>'preparando' or jsonb_typeof(p_filas)<>'array' or jsonb_array_length(p_filas)>250 then raise exception 'Estado o bloque inválido'; end if;
  if exists(select 1 from jsonb_array_elements(p_filas) x(v) where
    coalesce(length(v->>'clave'),0)=0 or jsonb_typeof(v->'datos') is distinct from 'object'
    or (p_tipo in ('tickets','ventas_detalle','pagos') and (coalesce(length(v->>'ticket'),0)=0 or jsonb_typeof(v->'total') is distinct from 'number' or (v->>'total')::numeric<0))
    or (p_tipo in ('productos','ventas_detalle') and (coalesce(length(v->>'producto'),0)=0 or coalesce(length(v->>'nombre'),0)=0))
    or (p_tipo in ('tickets','ventas_detalle') and (coalesce(v->>'fecha','') !~ '^\d{4}-\d{2}-\d{2}$'))
    or (p_tipo='ventas_detalle' and (jsonb_typeof(v->'cantidad') is distinct from 'number' or (v->>'cantidad')::numeric<=0 or jsonb_typeof(v->'precio') is distinct from 'number' or (v->>'precio')::numeric<0))) then raise exception 'Registro canónico inválido'; end if;
  if exists(select 1 from jsonb_array_elements(p_filas) with ordinality x(v,n)
      join public.ventas_preparacion s on s.importacion_id=p_id and s.tipo=p_tipo and s.secuencia=p_inicio+x.n-1 where s.registro<>x.v) then raise exception 'Reintento con contenido diferente'; end if;
  insert into public.ventas_preparacion(importacion_id,restaurante_id,tipo,secuencia,registro)
    select p_id,i.restaurante_id,p_tipo,p_inicio+x.n-1,x.v from jsonb_array_elements(p_filas) with ordinality x(v,n)
    on conflict do nothing;
  get diagnostics n=row_count;
  return n;
end $$;

create function public.validar_historial_pos(p_id uuid,p_manifiesto jsonb) returns jsonb
language plpgsql security definer set search_path=public as $$
declare i public.ventas_importaciones; k text; n integer; errores integer:=0; duplicados integer:=0; existentes integer:=0; sin_detalle integer; sin_catalogo integer; res jsonb;
begin
  i:=public.historial_importacion_autorizada(p_id);
  if i.estado_procesamiento not in ('preparando','validado') then raise exception 'Estado inválido'; end if;
  -- Primer paquete: no depender de que autovacuum ya haya actualizado estadísticas.
  -- Sin ellas, PostgreSQL puede elegir búsquedas anidadas cuadráticas para los anti-joins.
  analyze public.ventas_preparacion;
  foreach k in array array['productos','tickets','ventas_detalle','pagos'] loop
    select count(*) into n from public.ventas_preparacion where importacion_id=p_id and tipo=k;
    if not (p_manifiesto ? k) or n<>(p_manifiesto->>k)::integer or n=0 then raise exception 'Archivo % incompleto o vacío',k; end if;
    if exists(select 1 from public.ventas_preparacion where importacion_id=p_id and tipo=k having min(secuencia)<>0 or max(secuencia)<>count(*)-1) then raise exception 'Bloques incompletos'; end if;
  end loop;
  select count(*) into errores from (
    select tipo,registro->>'clave' from public.ventas_preparacion where importacion_id=p_id
    group by tipo,registro->>'clave' having count(distinct registro)>1 or min(registro->>'clave') is null
  ) q;
  select count(*)-count(distinct (tipo,registro->>'clave')) into duplicados from public.ventas_preparacion where importacion_id=p_id;
  errores:=errores+(select count(*) from public.ventas_preparacion s where s.importacion_id=p_id and s.tipo in ('ventas_detalle','pagos') and not exists(
    select 1 from public.ventas_preparacion t where t.importacion_id=p_id and t.tipo='tickets' and t.registro->>'clave'=s.registro->>'ticket'));
  select count(*) into sin_detalle from public.ventas_preparacion t where t.importacion_id=p_id and t.tipo='tickets' and not exists(
    select 1 from public.ventas_preparacion s where s.importacion_id=p_id and s.tipo='ventas_detalle' and s.registro->>'ticket'=t.registro->>'clave');
  select count(distinct s.registro->>'producto') into sin_catalogo from public.ventas_preparacion s where s.importacion_id=p_id and s.tipo='ventas_detalle' and not exists(
    select 1 from public.ventas_preparacion p where p.importacion_id=p_id and p.tipo='productos' and p.registro->>'clave'=s.registro->>'producto');
  -- Misma identidad y distinto contenido: bloquear, nunca sobrescribir silenciosamente.
  select count(*) into existentes from public.ventas_preparacion s join public.ventas_tickets t on t.restaurante_id=i.restaurante_id and t.fuente=i.origen_sistema and t.id_externo=s.registro->>'clave' where s.importacion_id=p_id and s.tipo='tickets';
  errores:=errores+(select count(*) from public.ventas_preparacion s join public.ventas_tickets t on t.restaurante_id=i.restaurante_id and t.fuente=i.origen_sistema and t.id_externo=s.registro->>'clave' where s.importacion_id=p_id and s.tipo='tickets' and t.huella<>md5(s.registro::text));
  errores:=errores+(select count(*) from public.ventas_preparacion s join public.ventas_items t on t.restaurante_id=i.restaurante_id and t.fuente=i.origen_sistema and t.id_externo=s.registro->>'clave' where s.importacion_id=p_id and s.tipo='ventas_detalle' and t.huella<>md5(s.registro::text));
  errores:=errores+(select count(*) from public.ventas_preparacion s join public.ventas_pagos t on t.restaurante_id=i.restaurante_id and t.fuente=i.origen_sistema and t.id_externo=s.registro->>'clave' where s.importacion_id=p_id and s.tipo='pagos' and t.huella<>md5(s.registro::text));
  res:=jsonb_build_object('registros',p_manifiesto,'errores',errores,'duplicados_archivo',duplicados,'tickets_existentes',existentes,'tickets_sin_detalle',sin_detalle,'productos_sin_catalogo',sin_catalogo,
    'desde',(select min(registro->>'fecha') from public.ventas_preparacion where importacion_id=p_id and tipo='tickets'),
    'hasta',(select max(registro->>'fecha') from public.ventas_preparacion where importacion_id=p_id and tipo='tickets'),
    'productos_sin_mapear',(select count(distinct s.registro->>'producto') from public.ventas_preparacion s where s.importacion_id=p_id and s.tipo='ventas_detalle' and not exists(select 1 from public.productos_pos p join public.productos_pos_mapeos m on m.pos_id=p.id where p.restaurante_id=i.restaurante_id and p.fuente=i.origen_sistema and p.id_externo=s.registro->>'producto' and m.estado in ('confirmado','ignorado'))),
    'lineas_existentes',(select count(distinct s.registro->>'clave') from public.ventas_preparacion s join public.ventas_items v on v.restaurante_id=i.restaurante_id and v.fuente=i.origen_sistema and v.id_externo=s.registro->>'clave' where s.importacion_id=p_id and s.tipo='ventas_detalle'),
    'pagos_existentes',(select count(distinct s.registro->>'clave') from public.ventas_preparacion s join public.ventas_pagos v on v.restaurante_id=i.restaurante_id and v.fuente=i.origen_sistema and v.id_externo=s.registro->>'clave' where s.importacion_id=p_id and s.tipo='pagos'));
  res:=res||jsonb_build_object(
    'muestra_tickets',(select coalesce(jsonb_agg(q),'[]') from(select registro->>'clave' ticket,registro->>'fecha' fecha,(registro->>'total')::numeric total_oficial from public.ventas_preparacion where importacion_id=p_id and tipo='tickets' order by secuencia limit 5)q),
    'muestra_lineas',(select coalesce(jsonb_agg(q),'[]') from(select registro->>'ticket' ticket,registro->>'nombre' producto,(registro->>'cantidad')::numeric cantidad,registro->>'fecha' fecha,(registro->>'total')::numeric importe_estimado from public.ventas_preparacion where importacion_id=p_id and tipo='ventas_detalle' order by secuencia limit 5)q),
    'tickets_con_diferencia_pagos',(select count(*) from
      (select registro->>'clave' ticket,max((registro->>'total')::numeric) total from public.ventas_preparacion where importacion_id=p_id and tipo='tickets' group by 1)t
      left join (select registro->>'ticket' ticket,sum((registro->>'total')::numeric) importe from public.ventas_preparacion where importacion_id=p_id and tipo='pagos' group by 1)p using(ticket)
      where abs(t.total-coalesce(p.importe,0))>0.01));
  update public.ventas_importaciones set manifiesto=p_manifiesto,resultado=res,estado_procesamiento=case when errores=0 then 'validado' else 'preparando' end where id=p_id;
  return res;
end $$;

create function public.confirmar_historial_pos(p_id uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare i public.ventas_importaciones; res jsonb; nt integer; ni integer; np integer;
begin
  i:=public.historial_importacion_autorizada(p_id);
  if i.estado_procesamiento='completado' then return i.resultado; end if;
  if i.estado_procesamiento<>'validado' then raise exception 'Validar antes de confirmar'; end if;
  perform pg_advisory_xact_lock(hashtextextended(i.restaurante_id::text,0));
  res:=public.validar_historial_pos(p_id,i.manifiesto);
  if (res->>'errores')::integer>0 then raise exception 'Conflictos: vuelva a validar'; end if;
  insert into public.productos_pos(restaurante_id,fuente,id_externo,nombre,categoria,datos)
    select distinct on(registro->>'producto') i.restaurante_id,i.origen_sistema,registro->>'producto',registro->>'nombre',registro->>'categoria',registro->'datos'
    from public.ventas_preparacion where importacion_id=p_id and tipo in ('productos','ventas_detalle')
    order by registro->>'producto',case when tipo='productos' then 0 else 1 end,secuencia
    on conflict(restaurante_id,fuente,id_externo) do nothing;
  insert into public.ventas_tickets(restaurante_id,importacion_id,fuente,id_externo,fecha,hora,franja,total_oficial,datos,huella)
    select distinct i.restaurante_id,p_id,i.origen_sistema,registro->>'clave',(registro->>'fecha')::date,(registro->>'hora')::time,registro->>'franja',(registro->>'total')::numeric,registro->'datos',md5(registro::text)
    from public.ventas_preparacion where importacion_id=p_id and tipo='tickets' on conflict do nothing;
  get diagnostics nt=row_count;
  insert into public.ventas_items(restaurante_id,importacion_id,ticket_id,pos_id,fuente,id_externo,nombre_original,cantidad_vendida,precio_unitario,total,fecha_venta,hora_venta,franja,datos_origen,huella,requiere_revision)
    select distinct i.restaurante_id,p_id,t.id,p.id,i.origen_sistema,s.registro->>'clave',s.registro->>'nombre',(s.registro->>'cantidad')::numeric,(s.registro->>'precio')::numeric,(s.registro->>'total')::numeric,(s.registro->>'fecha')::date,(s.registro->>'hora')::time,s.registro->>'franja',s.registro->'datos',md5(s.registro::text),true
    from public.ventas_preparacion s join public.ventas_tickets t on t.restaurante_id=i.restaurante_id and t.fuente=i.origen_sistema and t.id_externo=s.registro->>'ticket'
    join public.productos_pos p on p.restaurante_id=i.restaurante_id and p.fuente=i.origen_sistema and p.id_externo=s.registro->>'producto'
    where s.importacion_id=p_id and s.tipo='ventas_detalle' on conflict do nothing;
  get diagnostics ni=row_count;
  insert into public.ventas_pagos(restaurante_id,ticket_id,fuente,id_externo,importe,datos,huella)
    select distinct i.restaurante_id,t.id,i.origen_sistema,s.registro->>'clave',(s.registro->>'total')::numeric,s.registro->'datos',md5(s.registro::text)
    from public.ventas_preparacion s join public.ventas_tickets t on t.restaurante_id=i.restaurante_id and t.fuente=i.origen_sistema and t.id_externo=s.registro->>'ticket'
    where s.importacion_id=p_id and s.tipo='pagos' on conflict do nothing;
  get diagnostics np=row_count;
  res:=res||jsonb_build_object('tickets_nuevos',nt,'lineas_nuevas',ni,'pagos_nuevos',np,'sin_movimientos_inventario',true);
  update public.ventas_importaciones set estado_procesamiento='completado',resultado=res,total_registros=(i.manifiesto->>'ventas_detalle')::integer,fecha_inicio=(res->>'desde')::date,fecha_fin=(res->>'hasta')::date where id=p_id;
  return res;
end $$;

-- Defensa también para invocaciones directas del antiguo RPC de descuento.
create function public.proteger_historial_inventario() returns trigger language plpgsql as $$
begin
  if old.modo='historico' and (new.modo<>old.modo or new.restaurante_id<>old.restaurante_id or new.origen_sistema is distinct from old.origen_sistema) then raise exception 'Identidad histórica inmutable'; end if;
  if new.descuento_inventario_aplicado and new.modo='historico' then raise exception 'El historial no modifica inventario'; end if;
  return new;
end $$;
create trigger proteger_historial before update on public.ventas_importaciones for each row execute function public.proteger_historial_inventario();

-- Las políticas antiguas permiten editar ventas operativas. No deben permitir
-- alterar el historial por REST y dejar huellas/resúmenes desincronizados.
-- SECURITY INVOKER intencional: los RPC autorizados se ejecutan como su dueño,
-- mientras una escritura REST conserva current_user=authenticated.
create function public.proteger_escritura_historial() returns trigger
language plpgsql set search_path=public as $$
declare historico boolean:=false;
begin
  if current_user in ('authenticated','anon') then
    if tg_table_name='ventas_importaciones' then
      if tg_op<>'INSERT' then historico:=old.modo='historico'; end if;
      if tg_op<>'DELETE' then historico:=historico or new.modo='historico'; end if;
    else
      if tg_op<>'INSERT' then
        historico:=old.ticket_id is not null or old.pos_id is not null or old.id_externo is not null
          or exists(select 1 from public.ventas_importaciones where id=old.importacion_id and modo='historico');
      end if;
      if tg_op<>'DELETE' then
        historico:=historico or new.ticket_id is not null or new.pos_id is not null or new.id_externo is not null
          or exists(select 1 from public.ventas_importaciones where id=new.importacion_id and modo='historico');
      end if;
    end if;
    if historico then raise exception 'El historial solo admite escritura mediante los RPC autorizados'; end if;
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end $$;
create trigger escritura_historial_importacion before insert or update or delete on public.ventas_importaciones for each row execute function public.proteger_escritura_historial();
create trigger escritura_historial_item before insert or update or delete on public.ventas_items for each row execute function public.proteger_escritura_historial();

create function public.mapear_producto_pos(p_pos uuid,p_estado text,p_receta uuid default null,p_producto uuid default null) returns void
language plpgsql security definer set search_path=public as $$
declare r uuid;
begin
  select restaurante_id into r from public.productos_pos where id=p_pos;
  if r is null or not public.chefos_tiene_rol(r,array['dueño','administrador','chef_ejecutivo']) then raise exception 'No autorizado'; end if;
  if p_receta is not null and not exists(select 1 from public.recetas where id=p_receta and restaurante_id=r and activa) then raise exception 'Receta inválida'; end if;
  if p_producto is not null and not exists(select 1 from public.productos where id=p_producto and restaurante_id=r and activo) then raise exception 'Producto inválido'; end if;
  insert into public.productos_pos_mapeos(restaurante_id,pos_id,receta_id,producto_id,estado,actualizado_por)
    values(r,p_pos,p_receta,p_producto,p_estado,auth.uid()) on conflict(pos_id) do update set receta_id=p_receta,producto_id=p_producto,estado=p_estado,actualizado_por=auth.uid(),actualizado_en=now();
end $$;

do $$ declare f text; begin
  foreach f in array array['iniciar_historial_pos(text,text)','preparar_historial_bloque(uuid,text,integer,jsonb)','validar_historial_pos(uuid,jsonb)','confirmar_historial_pos(uuid)','mapear_producto_pos(uuid,text,uuid,uuid)'] loop
    execute 'revoke all on function public.'||f||' from public,anon';
    execute 'grant execute on function public.'||f||' to authenticated';
  end loop;
end $$;
commit;
