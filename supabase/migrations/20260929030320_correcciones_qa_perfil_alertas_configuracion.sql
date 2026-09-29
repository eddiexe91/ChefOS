-- Correcciones del testeo 1.3.1: RPC acotadas, sin UPDATE amplio sobre identidades/alertas.
begin;
create or replace function public.actualizar_mi_nombre(p_nombre text) returns text
language plpgsql security definer set search_path=public as $$
declare v_nombre text;
begin
  if auth.uid() is null or length(trim(coalesce(p_nombre,''))) not between 1 and 120 then
    raise exception 'Nombre inválido o sesión no disponible';
  end if;
  update public.usuarios set nombre=trim(p_nombre) where id=auth.uid() and activo returning nombre into v_nombre;
  if not found then raise exception 'Perfil activo no encontrado'; end if;
  return v_nombre;
end $$;

create or replace function public.marcar_alerta_leida(p_alerta uuid) returns uuid
language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'Inicia sesión'; end if;
  update public.alertas_sistema set leida=true,
    leida_por=case when leida then leida_por else auth.uid() end,
    leida_en=case when leida then leida_en else now() end
    where id=p_alerta and public.chefos_es_miembro(restaurante_id) returning id into v_id;
  if not found then raise exception 'Alerta no disponible para tu restaurante'; end if;
  return v_id;
end $$;

create or replace function public.guardar_configuracion_inicial(p_datos jsonb) returns jsonb
language plpgsql security definer set search_path=public as $$
declare u public.usuarios; r public.restaurantes; inv integer; stk integer;
  completo boolean; confirmar boolean; avance jsonb; nombre_nuevo text; zona text; paso integer;
begin
  select * into u from public.usuarios where id=auth.uid() and activo;
  if u.id is null or u.rol not in ('dueño','administrador','chef_ejecutivo') then
    raise exception 'Solo Dueño, Administración o Chef Ejecutivo pueden configurar el restaurante';
  end if;
  if p_datos ? 'rol' and p_datos->>'rol' is distinct from u.rol then
    raise exception 'El cargo no se cambia desde la configuración inicial';
  end if;
  select * into r from public.restaurantes where id=u.restaurante_id for update;
  nombre_nuevo:=trim(coalesce(p_datos->>'nombre',''));
  zona:=coalesce(p_datos->>'zona_horaria',r.zona_horaria);
  paso:=coalesce((p_datos->>'paso_actual')::integer,0);
  if length(nombre_nuevo) not between 1 and 120 or paso not between 0 and 3
    or not exists(select 1 from pg_timezone_names where name=zona) then raise exception 'Datos de configuración inválidos'; end if;
  select count(*) filter(where tipo_operativo in ('materia_prima','insumo')),
    count(*) filter(where tipo_operativo='elaborado') into inv,stk
    from public.productos where restaurante_id=u.restaurante_id and activo;
  completo:=coalesce((p_datos->>'completar')::boolean,false);
  confirmar:=coalesce((p_datos->>'confirmar_incompleto')::boolean,false);
  if completo and not confirmar and (inv=0 or stk=0) then
    raise exception 'Falta Inventario o Stock disponible. Confirma expresamente si deseas finalizar con datos incompletos';
  end if;
  avance:=coalesce(r.config->'onboarding','{}'::jsonb)||jsonb_build_object(
    'paso_actual',paso,'inventario_confirmado',inv>0,'stock_confirmado',stk>0,
    'completo',case when completo then (inv>0 and stk>0) or confirmar else coalesce(r.onboarding_completado,false) end,
    'confirmacion_incompleta',case when completo then confirmar else coalesce((r.config->'onboarding'->>'confirmacion_incompleta')::boolean,false) end,
    'cantidades',jsonb_build_object('inventario',inv,'stock_disponible',stk),'actualizado_en',now());
  update public.restaurantes set nombre=nombre_nuevo,zona_horaria=zona,
    config=coalesce(r.config,'{}'::jsonb)||jsonb_build_object('onboarding',avance),
    onboarding_completado=(avance->>'completo')::boolean where id=r.id;
  return jsonb_build_object('cantidadInventario',inv,'cantidadStock',stk,'onboarding',avance);
end $$;

revoke all on function public.actualizar_mi_nombre(text),public.marcar_alerta_leida(uuid),public.guardar_configuracion_inicial(jsonb) from public,anon;
grant execute on function public.actualizar_mi_nombre(text),public.marcar_alerta_leida(uuid),public.guardar_configuracion_inicial(jsonb) to authenticated;
commit;
