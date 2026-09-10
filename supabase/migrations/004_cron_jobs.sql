-- Activación real de los cron jobs de ChefOS.
-- Requiere pg_cron y pg_net habilitados en Supabase Dashboard.
create extension if not exists pg_cron;
create extension if not exists pg_net;

create or replace function public.configurar_cron_chefos(p_edge_base_url text, p_anon_key text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_edge_base_url is null or p_edge_base_url = '' or p_anon_key is null or p_anon_key = '' then
    raise exception 'Debes indicar la URL base de Edge Functions y la anon key';
  end if;
  perform cron.unschedule('chefos-briefing-0600') where exists (select 1 from cron.job where jobname = 'chefos-briefing-0600');
  perform cron.unschedule('chefos-cierre-2300') where exists (select 1 from cron.job where jobname = 'chefos-cierre-2300');
  perform cron.schedule('chefos-briefing-0600', '0 6 * * *', format($job$
    select net.http_post(
      url := %L,
      headers := jsonb_build_object('Authorization', %L, 'Content-Type', 'application/json'),
      body := '{}'::jsonb
    )
  $job$, p_edge_base_url || '/generar-briefing', 'Bearer ' || p_anon_key));
  perform cron.schedule('chefos-cierre-2300', '0 23 * * *', format($job$
    select net.http_post(
      url := %L,
      headers := jsonb_build_object('Authorization', %L, 'Content-Type', 'application/json'),
      body := '{}'::jsonb
    )
  $job$, p_edge_base_url || '/cierre-diario', 'Bearer ' || p_anon_key));
end; $$;

revoke all on function public.configurar_cron_chefos(text, text) from public;
