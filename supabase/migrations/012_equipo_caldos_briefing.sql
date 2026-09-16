-- Acceso al equipo por clave de un solo uso; nunca comparte la contraseña personal.
begin;
create table if not exists public.invitaciones_equipo (
  id uuid primary key default gen_random_uuid(),
  restaurante_id uuid not null references public.restaurantes(id) on delete cascade,
  clave_hash text not null unique,
  rol text not null check (rol in ('administrador','chef_ejecutivo','chef_cocina','cocinero')),
  creado_por uuid not null references public.usuarios(id),
  vence_en timestamptz not null default now() + interval '7 days',
  usado_por uuid references auth.users(id) on delete set null,
  usado_en timestamptz,
  creado_en timestamptz not null default now()
);
alter table public.invitaciones_equipo enable row level security;
revoke all on public.invitaciones_equipo from anon, authenticated;
grant all on public.invitaciones_equipo to service_role;

create or replace function public.crear_restaurante_para_usuario()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_nombre text := nullif(trim(new.raw_user_meta_data ->> 'restaurant_name'), '');
  v_restaurante uuid;
  v_rol text := 'dueño';
  v_clave text := nullif(trim(new.raw_user_meta_data ->> 'clave_equipo'), '');
  v_invitacion public.invitaciones_equipo;
begin
  if v_clave is not null then
    select * into v_invitacion from public.invitaciones_equipo
      where clave_hash = encode(sha256(convert_to(v_clave, 'UTF8')), 'hex')
        and usado_en is null and vence_en > now() for update;
    if v_invitacion.id is null then raise exception 'La clave de equipo no es válida o ya venció'; end if;
    v_restaurante := v_invitacion.restaurante_id;
    v_rol := v_invitacion.rol;
    if not exists(select 1 from public.restaurantes where id = v_restaurante and activo) then
      raise exception 'Restaurante no disponible';
    end if;
  else
    v_nombre := coalesce(v_nombre, 'Mi restaurante');
    insert into public.restaurantes(nombre, slug, plan)
    values (v_nombre, 'restaurante-' || new.id::text, 'basico') returning id into v_restaurante;
    perform public.inicializar_restaurante(v_restaurante);
  end if;
  insert into public.usuarios(id, restaurante_id, nombre, email, rol)
  values(new.id, v_restaurante, coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), split_part(new.email,'@',1)), new.email, v_rol);
  insert into public.usuarios_restaurantes(usuario_id, restaurante_id, rol) values(new.id,v_restaurante,v_rol);
  if v_invitacion.id is not null then
    update public.invitaciones_equipo set usado_por=new.id, usado_en=now() where id=v_invitacion.id;
  end if;
  return new;
end $$;

create or replace function public.categorias_operativas_nuevo_restaurante()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.categorias_producto(restaurante_id,nombre,tipo) values
    (new.id,'Caldos y Bases','otro'), (new.id,'Granos','insumo');
  insert into public.categorias_receta(restaurante_id,nombre,orden) values(new.id,'Caldos y Bases',10);
  return new;
end $$;
drop trigger if exists categorias_operativas_restaurante on public.restaurantes;
create trigger categorias_operativas_restaurante after insert on public.restaurantes
for each row execute function public.categorias_operativas_nuevo_restaurante();
insert into public.categorias_producto(restaurante_id,nombre,tipo)
select r.id,'Caldos y Bases','otro' from public.restaurantes r where not exists
(select 1 from public.categorias_producto c where c.restaurante_id=r.id and c.nombre='Caldos y Bases');
insert into public.categorias_receta(restaurante_id,nombre,orden)
select r.id,'Caldos y Bases',10 from public.restaurantes r where not exists
(select 1 from public.categorias_receta c where c.restaurante_id=r.id and c.nombre='Caldos y Bases');

drop policy if exists chefos_briefings_insert on public.briefings;
create policy chefos_briefings_insert on public.briefings for insert to authenticated
with check (public.chefos_es_miembro(restaurante_id));
drop policy if exists chefos_briefings_update on public.briefings;
create policy chefos_briefings_update on public.briefings for update to authenticated
using (public.chefos_es_miembro(restaurante_id)) with check (public.chefos_es_miembro(restaurante_id));
create or replace function public.crear_clave_equipo(p_rol text)
returns text language plpgsql security definer set search_path=public as $$
declare v_perfil public.usuarios; v_clave text;
begin
  select * into v_perfil from public.usuarios where id=auth.uid() and activo;
  if v_perfil.id is null or v_perfil.rol not in ('dueño','administrador','chef_ejecutivo') then raise exception 'Sin permisos'; end if;
  if p_rol not in ('administrador','chef_ejecutivo','chef_cocina','cocinero') or p_rol is null then raise exception 'Rol no válido'; end if;
  if v_perfil.rol='chef_ejecutivo' and p_rol not in ('chef_cocina','cocinero') then raise exception 'Sin permisos para ese rol'; end if;
  if (select count(*) from public.invitaciones_equipo where creado_por=v_perfil.id and creado_en>now()-interval '1 hour') >= 30 then raise exception 'Límite de invitaciones por hora alcanzado'; end if;
  v_clave := replace(gen_random_uuid()::text,'-','');
  insert into public.invitaciones_equipo(restaurante_id,clave_hash,rol,creado_por)
  values(v_perfil.restaurante_id,encode(sha256(convert_to(v_clave,'UTF8')),'hex'),p_rol,v_perfil.id);
  return v_clave;
end $$;
revoke all on function public.crear_clave_equipo(text) from public, anon;
grant execute on function public.crear_clave_equipo(text) to authenticated;
notify pgrst, 'reload schema';
commit;
