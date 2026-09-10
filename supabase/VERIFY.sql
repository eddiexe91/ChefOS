-- Ejecutar después de DEPLOYMENT.md. Cada consulta debe devolver al menos una fila.
select table_name from information_schema.tables
where table_schema = 'public' and table_name in (
  'restaurantes','usuarios','productos','recetas','ventas_importaciones','ventas_items',
  'analisis_consumo','inventario_snapshots','briefings','conversaciones_ia',
  'grupos_restaurantes','cierres_diarios','tareas_programadas'
) order by table_name;

select routine_name from information_schema.routines
where routine_schema = 'public' and routine_name in (
  'registrar_produccion_completa','descontar_inventario_por_ventas',
  'calcular_analisis_consumo','configurar_cron_chefos'
) order by routine_name;

select id, name, public from storage.buckets
where id in ('recetas-imagenes','recetas-videos','facturas','importaciones') order by id;

select jobname, schedule, active from cron.job
where jobname in ('chefos-briefing-0600','chefos-cierre-2300') order by jobname;
