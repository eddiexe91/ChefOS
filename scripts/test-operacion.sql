-- Ejecutar como postgres en SQL Editor. Toda la prueba se revierte.
begin;
do $$
declare u uuid:=gen_random_uuid(); r uuid; p uuid; rec public.recetas; stock numeric; clave text; miembro uuid:=gen_random_uuid();
begin
  insert into auth.users(id,email,raw_user_meta_data) values(u,'qa-'||u||'@example.com','{"full_name":"QA ChefOS","restaurant_name":"QA ChefOS transaccional"}');
  select restaurante_id into r from public.usuarios where id=u;
  perform set_config('request.jwt.claims',json_build_object('sub',u,'role','authenticated')::text,true);
  if not public.chefos_tiene_rol(r,array['dueño']) then raise exception 'QA rol incorrecto'; end if;
  if not exists(select 1 from public.categorias_receta where restaurante_id=r and nombre='Caldos y Bases') then raise exception 'QA categoría ausente'; end if;
  clave:=public.crear_clave_equipo('cocinero');
  insert into auth.users(id,email,raw_user_meta_data) values(miembro,'qa-'||miembro||'@example.com',jsonb_build_object('full_name','QA Cocinero','clave_equipo',clave));
  if not exists(select 1 from public.usuarios where id=miembro and restaurante_id=r and rol='cocinero') then raise exception 'QA invitación incorrecta'; end if;
  if not exists(select 1 from public.invitaciones_equipo where usado_por=miembro and usado_en is not null) then raise exception 'QA clave no consumida'; end if;
  insert into public.productos(restaurante_id,nombre,unidad_medida,stock_actual,cantidad_gramos,stock_minimo,stock_minimo_gramos,tipo_operativo)
  values(r,'QA Corvina','kg',10,10000,20,20000,'materia_prima') returning id into p;
  rec:=public.crear_receta_completa(r,u,jsonb_build_object('nombre','QA Caldo','rendimiento_porciones',2,'unidad_rendimiento','porcion','en_carta',true,'es_produccion',true,'ingredientes',jsonb_build_array(jsonb_build_object('producto_id',p,'cantidad',1,'unidad_medida','kg','orden',0)),'pasos',jsonb_build_array(jsonb_build_object('numero',1,'titulo','Cocer','descripcion','Cocer ingredientes'))));
  if rec.id is null then raise exception 'QA receta no creada'; end if;
  perform public.registrar_produccion_completa(r,rec.id,2,u,null,'mañana',null);
  select cantidad_gramos into stock from public.productos where id=p;
  if stock<>9000 then raise exception 'QA descuento incorrecto: %',stock; end if;
  perform public.registrar_merma_completa(r,p,1,'kg','otro',u,'QA');
  select cantidad_gramos into stock from public.productos where id=p;
  if stock<>8000 then raise exception 'QA merma incorrecta: %',stock; end if;
end $$;
rollback;
select 'PASS: alta, categorías, equipo, receta/carta, producción y merma. Sin datos QA persistidos.' as resultado;
