-- ChefOS — categoría de inventario para postres.
-- Idempotente: agrega la categoría a restaurantes existentes y también deja
-- la función de inicialización preparada para futuras cuentas.

insert into public.categorias_producto (restaurante_id, nombre, tipo)
select r.id, 'Postres', 'postre'
from public.restaurantes r
where not exists (
  select 1
  from public.categorias_producto c
  where c.restaurante_id = r.id
    and lower(c.nombre) = lower('Postres')
);

create or replace function public.inicializar_restaurante(p_restaurante_id uuid)
returns void language plpgsql security definer set search_path = public
as $$
begin
  insert into public.categorias_producto(restaurante_id, nombre, tipo)
  select p_restaurante_id, x.nombre, x.tipo from (values
    ('Pescados','proteina'),('Mariscos','proteina'),('Carnes','proteina'),('Aves','proteina'),
    ('Verduras','verdura'),('Frutas','verdura'),('Lácteos','lacteo'),('Condimentos','condimento'),
    ('Aceites','insumo'),('Harinas','insumo'),('Pastas','insumo'),('Legumbres','insumo'),
    ('Bebidas','bebida'),('Limpieza','limpieza'),('Postres','postre'),('Otros','otro')
  ) x(nombre, tipo) where not exists (
    select 1 from public.categorias_producto c where c.restaurante_id = p_restaurante_id and lower(c.nombre) = lower(x.nombre)
  );
  insert into public.categorias_receta(restaurante_id, nombre, orden)
  select p_restaurante_id, x.nombre, x.orden from (values
    ('Fondos y Bases',1),('Salsas',2),('Mise en Place',3),('Entradas',4),('Sopas',5),
    ('Platos de Fondo',6),('Guarniciones',7),('Postres',8),('Bebidas',9)
  ) x(nombre, orden) where not exists (
    select 1 from public.categorias_receta c where c.restaurante_id = p_restaurante_id and c.nombre = x.nombre
  );
end $$;

grant execute on function public.inicializar_restaurante(uuid) to authenticated, service_role;
