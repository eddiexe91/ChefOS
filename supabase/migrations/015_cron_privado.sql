-- Requiere Vault y pg_cron existentes. No contiene ni genera credenciales.
-- El operador crea chefos_cron_secret_v1 en Vault y copia su valor a
-- CHEFOS_CRON_SECRET en Edge Secrets. Jamás guardar ese valor en SQL/Git/APK.
-- Desplegar ambas funciones con su validación privada antes de llamar al helper.
begin;
create or replace function public.configurar_cron_chefos_privado(p_edge_base_url text)
returns void language plpgsql security definer set search_path=public as $$
declare j record; endpoint text;
begin
  if p_edge_base_url is null or p_edge_base_url !~ '^https://[a-z0-9]+\.supabase\.co/functions/v1$' then
    raise exception 'URL de funciones inválida';
  end if;
  if (select count(*) from vault.secrets where name='chefos_cron_secret_v1')<>1 then
    raise exception 'Configurar primero la credencial privada en Vault y Edge Secrets';
  end if;
  if (select count(*) from cron.job where jobname in ('chefos-briefing-0600','chefos-cierre-2300'))<>2 then
    raise exception 'Faltan los dos cron existentes; configurar horarios antes de activar';
  end if;
  for j in select jobid,jobname from cron.job where jobname in ('chefos-briefing-0600','chefos-cierre-2300') loop
    endpoint:=case when j.jobname='chefos-briefing-0600' then '/generar-briefing' else '/cierre-diario' end;
    perform cron.alter_job(j.jobid,command:=format($job$
      select net.http_post(
        url := %L,
        headers := jsonb_build_object('Content-Type','application/json',
          'x-chefos-cron-secret',(select decrypted_secret from vault.decrypted_secrets where name='chefos_cron_secret_v1')),
        body := '{}'::jsonb,
        timeout_milliseconds := 60000
      );
    $job$,p_edge_base_url||endpoint));
  end loop;
end $$;
revoke all on function public.configurar_cron_chefos_privado(text) from public,anon,authenticated;
commit;
