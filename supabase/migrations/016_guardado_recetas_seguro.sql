-- Additive repair. Does not deduplicate, rescale or delete any existing records.
-- Unweighted counted products retain the legacy internal count scale; it is NOT mass.
begin;

create or replace function public.factor_gramos_por_unidad(p_unidad text, p_densidad numeric default null, p_peso_unitario numeric default null)
returns numeric language plpgsql immutable set search_path=public as $$
declare u text := lower(trim(p_unidad));
begin
  u:=case u when 'l' then 'lt' when 'litro' then 'lt' when 'mililitro' then 'ml' when 'und' then 'unidad' when 'u' then 'unidad' when 'porción' then 'porcion' else u end;
  return case u when 'g' then 1 when 'kg' then 1000 when 'mg' then .001 when 'oz' then 28.3495 when 'lb' then 453.592
    when 'lt' then 1000*coalesce(p_densidad,1) when 'ml' then coalesce(p_densidad,1) when 'cl' then 10*coalesce(p_densidad,1)
    when 'unidad' then coalesce(p_peso_unitario,1) when 'docena' then 12*coalesce(p_peso_unitario,1)
    when 'porcion' then coalesce(p_peso_unitario,1) when 'caja' then coalesce(p_peso_unitario,1) when 'bandeja' then coalesce(p_peso_unitario,1)
    else null end;
end $$;

create or replace function public.actualizar_costo_producto() returns trigger language plpgsql set search_path=public as $$
begin
  new.costo_por_gramo:=new.costo_unitario_actual/nullif(public.factor_gramos_por_unidad(new.unidad_medida,new.densidad_g_por_ml,new.peso_unitario_gramos),0);
  new.actualizado_en:=now();
  return new;
end $$;

-- Conversion tied to a product: NEVER treat an unweighted portion as a gram.
create or replace function public.cantidad_operativa_producto(p_producto public.productos, p_cantidad numeric, p_unidad text)
returns numeric language plpgsql stable set search_path=public as $$
declare u text := lower(trim(p_unidad)); base text := lower(trim(p_producto.unidad_medida));
begin
  u:=case u when 'l' then 'lt' when 'litro' then 'lt' when 'mililitro' then 'ml' when 'und' then 'unidad' when 'u' then 'unidad' when 'porción' then 'porcion' else u end;
  base:=case base when 'l' then 'lt' when 'litro' then 'lt' when 'mililitro' then 'ml' when 'und' then 'unidad' when 'u' then 'unidad' when 'porción' then 'porcion' else base end;
  if p_cantidad is null or p_cantidad < 0 or p_cantidad::text in ('NaN','Infinity','-Infinity') then raise exception 'Cantidad inválida'; end if;
  if coalesce(p_producto.peso_unitario_gramos,0)<=0 and
     (u in ('unidad','docena','porcion','caja','bandeja') or base in ('unidad','docena','porcion','caja','bandeja')) and
     not (u=base or (u in ('unidad','docena') and base in ('unidad','docena'))) then
    raise exception 'El producto % usa %. No se puede convertir % sin equivalencia de peso. Usa su unidad real.', p_producto.nombre,base,u;
  end if;
  if public.factor_gramos_por_unidad(u,p_producto.densidad_g_por_ml,p_producto.peso_unitario_gramos) is null then raise exception 'Unidad inválida: %',u; end if;
  return round(p_cantidad*public.factor_gramos_por_unidad(u,p_producto.densidad_g_por_ml,p_producto.peso_unitario_gramos),3);
end $$;

create or replace function public.validar_salida_receta() returns trigger
language plpgsql security definer set search_path=public as $$
declare p public.productos;
begin
  if new.producto_salida_id is null and new.cantidad_salida is null and new.unidad_salida is null then new.cantidad_salida_gramos:=null; return new; end if;
  if not new.es_produccion or new.producto_salida_id is null or coalesce(new.cantidad_salida,0)<=0 or new.unidad_salida is null then raise exception 'Completa el producto, cantidad y unidad de salida de producción'; end if;
  select * into p from public.productos where id=new.producto_salida_id and restaurante_id=new.restaurante_id and activo and tipo_operativo='elaborado';
  if p.id is null then raise exception 'El producto de salida no está disponible en Stock disponible'; end if;
  new.cantidad_salida_gramos:=public.cantidad_operativa_producto(p,new.cantidad_salida,new.unidad_salida);
  return new;
end $$;

alter table public.recetas add column if not exists ultima_solicitud uuid;
create unique index if not exists recetas_solicitud_unica on public.recetas(restaurante_id,ultima_solicitud) where ultima_solicitud is not null;

-- Keep every receipt, not only the last edit, so a delayed create retry cannot duplicate a recipe.
create table public.recetas_guardados (
 restaurante_id uuid not null references public.restaurantes(id), solicitud_id uuid not null,
 receta_id uuid not null references public.recetas(id), usuario_id uuid not null references public.usuarios(id),
 firma text not null, creado_en timestamptz not null default now(), primary key(restaurante_id,solicitud_id)
);
alter table public.recetas_guardados enable row level security;
revoke all on public.recetas_guardados from public,anon,authenticated;
create index recetas_guardados_receta_idx on public.recetas_guardados(receta_id);
create index recetas_guardados_usuario_idx on public.recetas_guardados(usuario_id);

create or replace function public.guardar_receta_atomica(p_restaurante_id uuid,p_usuario_id uuid,p_receta_id uuid,p_datos jsonb)
returns public.recetas language plpgsql security definer set search_path=public as $$
declare r public.recetas; p public.productos; item jsonb; paso jsonb; salida uuid;
  solicitud uuid := (p_datos->>'solicitud_id')::uuid; nueva boolean:=p_receta_id is null;
  rid uuid; gramos numeric; i integer:=0; nombre_salida text; recibo public.recetas_guardados;
begin
  if not public.chefos_tiene_rol(p_restaurante_id,array['dueño','chef_ejecutivo','chef_cocina']) or
     (auth.role()<>'service_role' and p_usuario_id is distinct from auth.uid()) then raise exception 'Sin permisos para guardar recetas'; end if;
  if solicitud is null then raise exception 'Falta identificador de guardado'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_restaurante_id::text||solicitud::text,0));
  select * into recibo from public.recetas_guardados where restaurante_id=p_restaurante_id and solicitud_id=solicitud;
  if recibo.receta_id is not null then
    if recibo.firma<>md5(p_datos::text) or recibo.usuario_id<>p_usuario_id or (p_receta_id is not null and recibo.receta_id<>p_receta_id) then raise exception 'Identificador de guardado ya utilizado con otros datos'; end if;
    select * into r from public.recetas where id=recibo.receta_id;
    return r;
  end if;
  if nullif(trim(p_datos->>'nombre'),'') is null or coalesce((p_datos->>'rendimiento_porciones')::integer,0)<=0 or
     jsonb_typeof(p_datos->'ingredientes') is distinct from 'array' or jsonb_array_length(p_datos->'ingredientes')=0 or
     jsonb_typeof(p_datos->'pasos') is distinct from 'array' or jsonb_array_length(p_datos->'pasos')=0 then raise exception 'Completa nombre, rendimiento, ingredientes y pasos'; end if;
  if not nueva then
    select * into r from public.recetas where id=p_receta_id and restaurante_id=p_restaurante_id and activa for update;
    if r.id is null then raise exception 'Receta no encontrada'; end if;
    if (p_datos->>'version_esperada')::integer is distinct from r.version_actual then raise exception 'La receta cambió desde que la abriste. Guarda una copia de tu texto y vuelve a abrirla antes de editar'; end if;
  end if;
  if nullif(p_datos->>'categoria_id','') is not null and not exists(select 1 from public.categorias_receta where id=(p_datos->>'categoria_id')::uuid and restaurante_id=p_restaurante_id and activa) then raise exception 'Categoría no válida'; end if;
  salida:=nullif(p_datos->>'producto_salida_id','')::uuid;
  if coalesce((p_datos->>'es_produccion')::boolean,false) then
    if salida is null and coalesce((p_datos->>'crear_salida')::boolean,false) then
      nombre_salida:=coalesce(nullif(trim(p_datos->>'nombre_salida'),''),trim(p_datos->>'nombre'));
      if exists(select 1 from public.productos where restaurante_id=p_restaurante_id and activo and tipo_operativo='elaborado' and lower(trim(nombre))=lower(nombre_salida)) then raise exception 'Ya existe ese producto elaborado. Selecciónalo en Salida al Stock disponible'; end if;
      insert into public.productos(restaurante_id,nombre,nombre_normalizado,tipo_operativo,unidad_medida,unidad_display,unidad_compra,stock_actual,cantidad_gramos,metadata)
      values(p_restaurante_id,nombre_salida,lower(nombre_salida),'elaborado',p_datos->>'unidad_salida',p_datos->>'unidad_salida',p_datos->>'unidad_salida',0,0,'{"tipo_operativo":"elaborado"}') returning id into salida;
    end if;
    if salida is null then raise exception 'Selecciona o crea aquí el producto elaborado de salida'; end if;
  else salida:=null; end if;
  if nueva then
    insert into public.recetas(restaurante_id,nombre,creado_por) values(p_restaurante_id,trim(p_datos->>'nombre'),p_usuario_id) returning * into r;
  end if;
  rid:=r.id;
  -- Version trigger preserves the OLD ingredient/procedure snapshot before replacement.
  update public.recetas set nombre=trim(p_datos->>'nombre'),descripcion=nullif(p_datos->>'descripcion',''),
    categoria_id=nullif(p_datos->>'categoria_id','')::uuid,rendimiento_porciones=(p_datos->>'rendimiento_porciones')::integer,
    unidad_rendimiento=coalesce(nullif(p_datos->>'unidad_rendimiento',''),'porcion'),
    precio_venta=nullif(p_datos->>'precio_venta','')::numeric,tiempo_preparacion=nullif(p_datos->>'tiempo_preparacion','')::integer,
    dificultad=nullif(p_datos->>'dificultad',''),en_carta=coalesce((p_datos->>'en_carta')::boolean,false),es_produccion=coalesce((p_datos->>'es_produccion')::boolean,false),
    producto_salida_id=salida,cantidad_salida=case when salida is not null then (p_datos->>'cantidad_salida')::numeric end,
    unidad_salida=case when salida is not null then p_datos->>'unidad_salida' end,
    version_actual=case when nueva then 1 else version_actual+1 end,ultima_solicitud=solicitud,actualizado_en=now()
    where id=rid;
  delete from public.recetas_ingredientes where receta_id=rid;
  delete from public.recetas_pasos where receta_id=rid;
  delete from public.recetas_productos_afectados where receta_id=rid;
  perform 1 from public.productos where id in(select (value->>'producto_id')::uuid from jsonb_array_elements(p_datos->'ingredientes')) and restaurante_id=p_restaurante_id order by id for update;
  for item in select value from jsonb_array_elements(p_datos->'ingredientes') loop
    select * into p from public.productos where id=(item->>'producto_id')::uuid and restaurante_id=p_restaurante_id and activo;
    if p.id is null or p.id=salida then raise exception 'Ingrediente inválido o igual al producto de salida'; end if;
    update public.productos set costo_unitario_actual=costo_unitario_actual where id=p.id;
    gramos:=public.cantidad_operativa_producto(p,(item->>'cantidad')::numeric,item->>'unidad_medida');
    if gramos<=0 then raise exception 'La cantidad del ingrediente debe ser positiva'; end if;
    insert into public.recetas_ingredientes(receta_id,producto_id,cantidad,unidad_medida,cantidad_gramos,es_opcional,orden,notas)
    values(rid,p.id,(item->>'cantidad')::numeric,item->>'unidad_medida',gramos,coalesce((item->>'es_opcional')::boolean,false),i,item->>'notas');
    i:=i+1;
  end loop;
  i:=0;
  for paso in select value from jsonb_array_elements(p_datos->'pasos') loop
    if nullif(trim(paso->>'titulo'),'') is null or nullif(trim(paso->>'descripcion'),'') is null then raise exception 'Completa cada paso de elaboración'; end if;
    i:=i+1;
    insert into public.recetas_pasos(receta_id,restaurante_id,numero,titulo,descripcion,duracion_min,temperatura_c,tecnica,punto_critico,foto_url)
    values(rid,p_restaurante_id,i,trim(paso->>'titulo'),trim(paso->>'descripcion'),nullif(paso->>'duracion_min','')::integer,nullif(paso->>'temperatura_c','')::numeric,paso->>'tecnica',coalesce((paso->>'punto_critico')::boolean,false),paso->>'foto_url');
  end loop;
  insert into public.recetas_productos_afectados(receta_id,producto_id,restaurante_id,cantidad_gramos)
    select rid,producto_id,p_restaurante_id,sum(cantidad_gramos) from public.recetas_ingredientes where receta_id=rid group by producto_id;
  perform public.recalcular_costo_receta(rid);
  insert into public.actividad_operativa(restaurante_id,usuario_id,accion,entidad_tipo,entidad_id,descripcion,datos)
    values(p_restaurante_id,p_usuario_id,case when nueva then 'crear_receta' else 'editar_receta' end,'receta',rid,
    (select nombre from public.usuarios where id=p_usuario_id)||case when nueva then ' creó ' else ' editó ' end||(p_datos->>'nombre'),
    jsonb_build_object('solicitud_id',solicitud,'producto_salida_id',salida));
  insert into public.recetas_guardados(restaurante_id,solicitud_id,receta_id,usuario_id,firma) values(p_restaurante_id,solicitud,rid,p_usuario_id,md5(p_datos::text));
  select * into r from public.recetas where id=rid;
  return r;
end $$;
revoke all on function public.guardar_receta_atomica(uuid,uuid,uuid,jsonb) from public;
grant execute on function public.guardar_receta_atomica(uuid,uuid,uuid,jsonb) to authenticated,service_role;

-- Audit is part of the merma transaction, whether entered manually or by voice.
alter table public.actividad_operativa drop constraint if exists actividad_operativa_accion_check;
alter table public.actividad_operativa add constraint actividad_operativa_accion_check check(accion in (
 'crear_producto','editar_producto','eliminar_producto','archivar_producto','ajustar_stock','crear_receta','editar_receta','archivar_receta',
 'crear_carta','editar_carta','archivar_carta','registrar_produccion','registrar_merma','corregir_produccion','anular_produccion'));
create or replace function public.auditar_merma() returns trigger language plpgsql security definer set search_path=public as $$
begin
  -- Counted units without a known mass cannot be treated as grams by legacy callers.
  perform public.cantidad_operativa_producto(pr,new.cantidad,new.unidad_medida) from public.productos pr where pr.id=new.producto_id;
  insert into public.actividad_operativa(restaurante_id,usuario_id,accion,entidad_tipo,entidad_id,descripcion,datos)
  select new.restaurante_id,new.responsable_id,'registrar_merma','merma',new.id,
    coalesce(u.nombre,'Usuario')||' registró merma de '||new.cantidad||' '||new.unidad_medida||' de '||p.nombre,
    jsonb_build_object('producto_id',p.id,'cantidad',new.cantidad,'unidad',new.unidad_medida,'motivo',new.motivo)
  from public.productos p left join public.usuarios u on u.id=new.responsable_id where p.id=new.producto_id;
  return new;
end $$;
create trigger trigger_auditar_merma after insert on public.mermas for each row execute function public.auditar_merma();
revoke all on function public.auditar_merma() from public,anon,authenticated;
revoke all on function public.validar_salida_receta() from public,anon,authenticated;

-- Idempotent registration of FINISHED production. Old rows are not reinterpreted.
alter table public.produccion_registros add column if not exists solicitud_id uuid;
alter table public.produccion_registros add column if not exists tandas numeric;
alter table public.produccion_registros add column if not exists salida_real numeric;
alter table public.produccion_registros add column if not exists anulado boolean not null default false;
alter table public.produccion_registros add column if not exists conversiones_registradas jsonb;
alter table public.produccion_registros add column if not exists solicitud_datos jsonb;
create unique index if not exists produccion_solicitud_unica on public.produccion_registros(restaurante_id,solicitud_id) where solicitud_id is not null;

create or replace function public.registrar_produccion_segura(p_receta_id uuid,p_lote_id uuid,p_tandas numeric,p_salida_real numeric,p_solicitud uuid,p_notas text default null)
returns public.produccion_registros language plpgsql security definer set search_path=public as $$
declare u public.usuarios; r public.recetas; registro public.produccion_registros; l public.produccion_lotes; item record; p public.productos; salida_calculada numeric; delta numeric;
begin
  select * into u from public.usuarios where id=auth.uid() and activo;
  if u.id is null then raise exception 'Sesión no válida'; end if;
  if p_solicitud is null or p_tandas is null or p_tandas<=0 or p_tandas::text in ('NaN','Infinity','-Infinity') then raise exception 'Indica una cantidad válida de recetas producidas'; end if;
  perform pg_advisory_xact_lock(hashtextextended(u.restaurante_id::text||p_solicitud::text,0));
  select * into registro from public.produccion_registros where restaurante_id=u.restaurante_id and solicitud_id=p_solicitud;
  if registro.id is not null then
    if registro.solicitud_datos is distinct from jsonb_build_object('receta_id',p_receta_id,'lote_id',p_lote_id,'tandas',p_tandas,'salida_real',p_salida_real,'notas',p_notas,'usuario_id',u.id) then raise exception 'Identificador de producción ya utilizado con otros datos'; end if;
    return registro;
  end if;
  select * into r from public.recetas where id=p_receta_id and restaurante_id=u.restaurante_id and activa and es_produccion for update;
  if r.id is null or r.producto_salida_id is null then raise exception 'Edita la receta y configura su producto de salida antes de producir'; end if;
  if exists(select 1 from public.recetas_ingredientes where receta_id=r.id and producto_id=r.producto_salida_id) then raise exception 'La salida no puede ser ingrediente de sí misma'; end if;
  select * into l from public.produccion_lotes where id=p_lote_id and restaurante_id=u.restaurante_id for update;
  if l.id is null then raise exception 'Lote no disponible'; end if;
  -- Lock every product in a deterministic order; repeated ingredients count together.
  perform 1 from public.productos where id=r.producto_salida_id or id in(select producto_id from public.recetas_ingredientes where receta_id=r.id) order by id for update;
  select * into p from public.productos where id=r.producto_salida_id and restaurante_id=u.restaurante_id and activo and tipo_operativo='elaborado';
  if p.id is null then raise exception 'El producto de salida no está disponible'; end if;
  if r.cantidad_salida_gramos is distinct from public.cantidad_operativa_producto(p,r.cantidad_salida,r.unidad_salida) then raise exception 'Cambió la unidad o equivalencia de la salida. Revisa y guarda la receta antes de producir'; end if;
  if exists(select 1 from public.recetas_ingredientes i join public.productos pr on pr.id=i.producto_id
    where i.receta_id=r.id and i.cantidad_gramos is distinct from public.cantidad_operativa_producto(pr,i.cantidad,i.unidad_medida)) then
    raise exception 'Cambió la unidad o equivalencia de un ingrediente. Revisa y guarda la receta antes de producir';
  end if;
  for item in select producto_id,sum(cantidad_gramos)*p_tandas consumo from public.recetas_ingredientes where receta_id=r.id group by producto_id loop
    select * into p from public.productos where id=item.producto_id and restaurante_id=u.restaurante_id and activo;
    if p.id is null or p.cantidad_gramos<item.consumo then raise exception 'Stock insuficiente o producto no disponible: %',coalesce(p.nombre,item.producto_id::text); end if;
    update public.productos set costo_unitario_actual=costo_unitario_actual where id=p.id;
  end loop;
  salida_calculada:=r.cantidad_salida*p_tandas;
  if coalesce(p_salida_real,salida_calculada)<=0 or coalesce(p_salida_real,salida_calculada)::text in ('NaN','Infinity','-Infinity') then raise exception 'La salida obtenida debe ser positiva'; end if;
  update public.produccion_lotes set estado='en_progreso' where id=l.id;
  registro:=public.registrar_produccion_completa(u.restaurante_id,r.id,p_tandas*r.rendimiento_porciones,u.id,l.id,l.turno,p_notas);
  select * into p from public.productos where id=r.producto_salida_id;
  delta:=public.cantidad_operativa_producto(p,coalesce(p_salida_real,salida_calculada),r.unidad_salida)-public.cantidad_operativa_producto(p,salida_calculada,r.unidad_salida);
  if delta<>0 then
    insert into public.inventario_movimientos(restaurante_id,producto_id,tipo,cantidad_gramos,referencia_id,referencia_tipo,registrado_por,motivo)
      values(u.restaurante_id,p.id,case when delta<0 then 'salida' else 'entrada' end,abs(delta),registro.id,'rendimiento_real',u.id,'Diferencia entre rendimiento previsto y obtenido');
  end if;
  update public.produccion_registros set solicitud_id=p_solicitud,tandas=p_tandas,salida_real=coalesce(p_salida_real,salida_calculada),
    solicitud_datos=jsonb_build_object('receta_id',p_receta_id,'lote_id',p_lote_id,'tandas',p_tandas,'salida_real',p_salida_real,'notas',p_notas,'usuario_id',u.id),
    cantidad_producida=coalesce(p_salida_real,salida_calculada),unidad=r.unidad_salida,
    cantidad_gramos=public.cantidad_operativa_producto(p,coalesce(p_salida_real,salida_calculada),r.unidad_salida),
    porciones_reales=case when r.unidad_salida='porcion' then round(coalesce(p_salida_real,salida_calculada)) end,
    conversiones_registradas=(select jsonb_object_agg(pr.id::text,jsonb_build_object('unidad',pr.unidad_medida,'peso',pr.peso_unitario_gramos,'densidad',pr.densidad_g_por_ml))
      from public.productos pr where pr.id=r.producto_salida_id or pr.id in(select producto_id from public.recetas_ingredientes where receta_id=r.id))
    where id=registro.id returning * into registro;
  update public.productos set costo_unitario_actual=registro.costo_real/nullif(registro.cantidad_gramos/public.factor_gramos_por_unidad(p.unidad_medida,p.densidad_g_por_ml,p.peso_unitario_gramos),0) where id=p.id;
  update public.produccion_lotes set estado='completado' where id=l.id;
  update public.actividad_operativa set descripcion=u.nombre||' registró '||p_tandas||' recetas de '||r.nombre||': '||registro.salida_real||' '||r.unidad_salida,
    datos=datos||jsonb_build_object('tandas',p_tandas,'salida_real',registro.salida_real) where entidad_id=registro.id and accion='registrar_produccion';
  return registro;
end $$;
revoke all on function public.registrar_produccion_segura(uuid,uuid,numeric,numeric,uuid,text) from public;
grant execute on function public.registrar_produccion_segura(uuid,uuid,numeric,numeric,uuid,text) to authenticated;

-- Corrections preserve every original movement and compensate stock transactionally.
create table public.produccion_correcciones (
 id uuid primary key, restaurante_id uuid not null references public.restaurantes(id), registro_id uuid not null references public.produccion_registros(id),
 usuario_id uuid not null references public.usuarios(id), motivo text not null, antes jsonb not null, despues jsonb not null, creado_en timestamptz not null default now()
);
alter table public.produccion_correcciones enable row level security;
create index produccion_correcciones_restaurante_idx on public.produccion_correcciones(restaurante_id);
create index produccion_correcciones_registro_idx on public.produccion_correcciones(registro_id);
create index produccion_correcciones_usuario_idx on public.produccion_correcciones(usuario_id);
create policy correcciones_lectura on public.produccion_correcciones for select to authenticated using(public.chefos_es_miembro(restaurante_id));
revoke all on public.produccion_correcciones from public,anon,authenticated;
grant select on public.produccion_correcciones to authenticated;
revoke insert,update,delete on public.produccion_correcciones from authenticated,anon;
create or replace function public.corregir_produccion_segura(p_registro uuid,p_tandas numeric,p_salida numeric,p_motivo text,p_solicitud uuid)
returns public.produccion_registros language plpgsql security definer set search_path=public as $$
declare r public.produccion_registros; u public.usuarios; p public.productos; mov record; nuevo numeric; delta numeric; antes jsonb; factor numeric; recibo public.produccion_correcciones;
begin
  select * into u from public.usuarios where id=auth.uid() and activo;
  if u.id is null or not public.chefos_tiene_rol(u.restaurante_id,array['dueño','administrador','chef_ejecutivo','chef_cocina']) then raise exception 'Sin permisos para corregir producción'; end if;
  select * into r from public.produccion_registros where id=p_registro and restaurante_id=u.restaurante_id for update;
  if r.id is null then raise exception 'Producción no encontrada'; end if;
  select * into recibo from public.produccion_correcciones where id=p_solicitud and restaurante_id=u.restaurante_id;
  if recibo.id is not null then
    if recibo.registro_id<>r.id or recibo.usuario_id<>u.id or recibo.motivo is distinct from p_motivo or (recibo.despues->>'tandas')::numeric is distinct from p_tandas or (recibo.despues->>'salida_real')::numeric is distinct from p_salida then raise exception 'Identificador de corrección ya utilizado con otros datos'; end if;
    return r;
  end if;
  if r.anulado or r.tandas is null or r.salida_real is null or r.conversiones_registradas is null then raise exception 'Este registro antiguo o anulado requiere revisión de sus movimientos; no se recalculará por suposición'; end if;
  if nullif(trim(p_motivo),'') is null or p_solicitud is null or p_tandas is null or p_salida is null or p_tandas<0 or p_salida<0 or (p_tandas=0)<>(p_salida=0) or p_tandas::text in ('NaN','Infinity','-Infinity') or p_salida::text in ('NaN','Infinity','-Infinity') then raise exception 'Indica cantidades válidas y el motivo; cero en ambas anula el registro'; end if;
  antes:=to_jsonb(r); factor:=p_tandas/r.tandas;
  perform 1 from public.produccion_lotes where id=r.lote_id for update;
  perform 1 from public.productos where id in(select producto_id from public.inventario_movimientos where referencia_id=r.id) order by id for update;
  for mov in select producto_id,sum(cantidad_gramos) neto from public.inventario_movimientos where referencia_id=r.id group by producto_id order by producto_id loop
    select * into p from public.productos where id=mov.producto_id;
    if (r.conversiones_registradas->p.id::text) is distinct from jsonb_build_object('unidad',p.unidad_medida,'peso',p.peso_unitario_gramos,'densidad',p.densidad_g_por_ml) then
      raise exception 'Cambió la unidad o equivalencia de %. Revisa sus movimientos antes de corregir esta producción',p.nombre;
    end if;
    nuevo:=case when mov.producto_id=r.producto_id then public.cantidad_operativa_producto(p,p_salida,r.unidad) else mov.neto*factor end;
    delta:=nuevo-mov.neto;
    if p.cantidad_gramos+delta<0 then raise exception 'No se puede corregir: ya se utilizó stock de % o faltan ingredientes',p.nombre; end if;
    if delta<>0 then insert into public.inventario_movimientos(restaurante_id,producto_id,tipo,cantidad_gramos,referencia_id,referencia_tipo,registrado_por,motivo)
      values(u.restaurante_id,p.id,case when delta<0 then 'salida' else 'entrada' end,abs(delta),r.id,'correccion_produccion',u.id,p_motivo); end if;
  end loop;
  update public.produccion_registros set tandas=p_tandas,salida_real=p_salida,cantidad_producida=p_salida,anulado=p_tandas=0,
    costo_real=costo_real*factor,costo_produccion=costo_produccion*factor,cantidad_gramos=cantidad_gramos*case when r.salida_real>0 then p_salida/r.salida_real else 0 end,
    porciones_reales=case when unidad='porcion' then round(p_salida) end,
    ingredientes_consumidos=(select coalesce(jsonb_agg(e||jsonb_build_object('cantidad_gramos',(e->>'cantidad_gramos')::numeric*factor,'costo_linea',(e->>'costo_linea')::numeric*factor)),'[]'::jsonb) from jsonb_array_elements(coalesce(r.ingredientes_consumidos,'[]'::jsonb)) e)
    where id=r.id returning * into r;
  update public.produccion_lotes set items_producidos=(select count(*) from public.produccion_registros where lote_id=r.lote_id and not anulado),
    costo_total_lote=(select coalesce(sum(costo_real),0) from public.produccion_registros where lote_id=r.lote_id and not anulado) where id=r.lote_id;
  if not r.anulado then
    update public.productos pr set costo_unitario_actual=r.costo_real/nullif(r.cantidad_gramos/public.factor_gramos_por_unidad(pr.unidad_medida,pr.densidad_g_por_ml,pr.peso_unitario_gramos),0) where pr.id=r.producto_id;
  end if;
  insert into public.produccion_correcciones values(p_solicitud,u.restaurante_id,r.id,u.id,p_motivo,antes,to_jsonb(r),now());
  insert into public.actividad_operativa(restaurante_id,usuario_id,accion,entidad_tipo,entidad_id,descripcion,datos) values
    (u.restaurante_id,u.id,case when r.anulado then 'anular_produccion' else 'corregir_produccion' end,'produccion',r.id,u.nombre||' corrigió una producción: '||p_motivo,jsonb_build_object('correccion_id',p_solicitud));
  return r;
end $$;
revoke all on function public.corregir_produccion_segura(uuid,numeric,numeric,text,uuid) from public;
grant execute on function public.corregir_produccion_segura(uuid,numeric,numeric,text,uuid) to authenticated;
commit;
