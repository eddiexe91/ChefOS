insert into public.categorias_producto (restaurante_id, nombre, tipo, activa)
select r.id, 'Granos', 'materia_prima', true
from public.restaurantes r
where not exists (select 1 from public.categorias_producto c where c.restaurante_id=r.id and lower(c.nombre)=lower('Granos'));
