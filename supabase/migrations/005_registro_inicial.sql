-- Alta de la primera cuenta desde ChefOS: crea restaurante y perfil automáticamente.
create or replace function public.crear_restaurante_para_usuario()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_nombre text := coalesce(nullif(trim(new.raw_user_meta_data ->> 'restaurant_name'), ''), 'Mi restaurante');
  v_slug text := trim(both '-' from regexp_replace(lower(unaccent(v_nombre)), '[^a-z0-9]+', '-', 'g')) || '-' || substr(new.id::text, 1, 8);
  v_restaurante uuid;
begin
  insert into public.restaurantes(nombre, slug, plan) values (v_nombre, v_slug, 'basico') returning id into v_restaurante;
  insert into public.usuarios(id, restaurante_id, nombre, email, rol) values (new.id, v_restaurante, coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)), new.email, 'dueño');
  insert into public.usuarios_restaurantes(usuario_id, restaurante_id, rol) values (new.id, v_restaurante, 'dueño');
  perform public.inicializar_restaurante(v_restaurante);
  return new;
end; $$;

drop trigger if exists on_auth_user_created_chefos on auth.users;
create trigger on_auth_user_created_chefos
  after insert on auth.users
  for each row execute function public.crear_restaurante_para_usuario();
