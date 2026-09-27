-- Cierre de permisos heredados; no modifica datos operativos.
begin;
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as firma, p.proname,
           p.prorettype = 'trigger'::regtype as es_trigger,
           has_function_privilege('authenticated', p.oid, 'EXECUTE') as permite_usuario,
           has_function_privilege('service_role', p.oid, 'EXECUTE') as permite_servicio
      from pg_proc p
     where p.pronamespace = 'public'::regnamespace and p.prosecdef
       and not exists (select 1 from pg_depend d where d.classid = 'pg_proc'::regclass
                       and d.objid = p.oid and d.deptype = 'e')
  loop
    -- Supabase concede EXECUTE a anon directamente, no solo mediante PUBLIC.
    execute format('revoke execute on function %s from public, anon', f.firma);
    if f.es_trigger or f.proname in ('inicializar_restaurante', 'configurar_cron_chefos') then
      execute format('revoke execute on function %s from authenticated', f.firma);
    elsif f.permite_usuario then
      execute format('grant execute on function %s to authenticated', f.firma);
    end if;
    if f.permite_servicio then
      execute format('grant execute on function %s to service_role', f.firma);
    end if;
  end loop;
end $$;
alter function public.escalar_receta(uuid, integer) security invoker;
alter function public.convertir_a_gramos(numeric, text, numeric, numeric) set search_path = public;
do $$
declare firma text;
begin
  foreach firma in array array['public.actualizar_timestamp_operativo()', 'public.proteger_historial_inventario()'] loop
    if to_regprocedure(firma) is not null then
      execute format('alter function %s set search_path = public', firma);
    end if;
  end loop;
end $$;
-- Catalogo global: utiliza la politica unidades_medida_select ya existente.
alter table public.unidades_medida enable row level security;
revoke all on table public.unidades_medida from anon;
revoke insert, update, delete, truncate, references, trigger on table public.unidades_medida from authenticated;
grant select on table public.unidades_medida to authenticated;
notify pgrst, 'reload schema';
commit;
