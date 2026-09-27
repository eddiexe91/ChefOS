// Real schema and RPCs, synthetic fixtures only, isolated PostgreSQL in memory.
const fs=require('node:fs'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto')
const {PGlite}=require('@electric-sql/pglite')
async function main(){
 const db=new PGlite()
 try{
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;
 create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create function auth.role() returns text language sql stable as $$select 'authenticated'::text$$;
 create function public.unaccent(text) returns text language sql immutable as $$select $1$$;
 grant usage on schema public,auth to authenticated,anon;grant execute on all functions in schema auth to authenticated;
 alter default privileges in schema public grant execute on functions to anon,authenticated,service_role;`)
 for(const n of ['001','002','006','007','008','009','010','011','016']){
  const f=fs.readdirSync('supabase/migrations').find(x=>x.startsWith(n+'_'))
  let sql=fs.readFileSync('supabase/migrations/'+f,'utf8').replace(/^create extension.*$/gm,'').replace(/^create index.*gin_trgm_ops.*$/gm,'')
  if(n==='007')await db.exec(`alter table restaurantes add column zona_horaria text default 'America/Santiago';`)
  await db.exec(sql)
 }
 await db.exec(fs.readFileSync('supabase/migrations/20260927120202_cierre_permisos_operativos.sql','utf8'))
 assert.equal((await db.query(`select count(*)::int n from pg_proc where pronamespace='public'::regnamespace and prosecdef and has_function_privilege('anon',oid,'EXECUTE')`)).rows[0].n,0,'explicit anon grants must be revoked')
 assert.equal((await db.query(`select has_function_privilege('authenticated','public.inicializar_restaurante(uuid)','EXECUTE') allowed`)).rows[0].allowed,false)
 assert.equal((await db.query(`select relrowsecurity enabled from pg_class where oid='public.unidades_medida'::regclass`)).rows[0].enabled,true)
 console.log('PASS anonymous grants closed; internal initialization denied; unit catalog protected')
 await db.exec('grant select on all tables in schema public to authenticated')
 const rid=randomUUID(),other=randomUUID(),uid=randomUUID()
 await db.query(`insert into restaurantes(id,nombre,slug) values($1,'QA','qa'),($2,'Ajeno','ajeno')`,[rid,other])
 await db.query(`insert into auth.users(id) values($1)`,[uid])
 await db.query(`insert into usuarios(id,restaurante_id,nombre,email,rol) values($1,$2,'QA','qa@example.invalid','chef_ejecutivo')`,[uid,rid])
 const ins=async(name,unit,qty,scale,tenant=rid)=>(await db.query(`insert into productos(restaurante_id,nombre,unidad_medida,stock_actual,cantidad_gramos,tipo_operativo) values($1,$2,$3,$4,$5,'materia_prima') returning id`,[tenant,name,unit,qty,scale])).rows[0].id
 const kg=await ins('Harina','kg',10,10000),portion=await ins('Bisque','porcion',10,10),foreign=await ins('Ajeno','kg',10,10000,other)
 const foreignRecipe=(await db.query(`insert into recetas(restaurante_id,nombre,rendimiento_porciones) values($1,'Receta ajena',1) returning id`,[other])).rows[0].id
 await db.query(`insert into recetas_ingredientes(receta_id,producto_id,cantidad,unidad_medida,cantidad_gramos,orden) values($1,$2,1,'kg',1000,1)`,[foreignRecipe,foreign])
 await db.query('update productos set costo_unitario_actual=1000 where id=$1',[kg])
 await db.query('update productos set costo_unitario_actual=200 where id=$1',[portion])
 await db.query(`select set_config('request.jwt.claim.sub',$1,false)`,[uid]);await db.exec('set role authenticated')
 const rpc=async(name,args)=>(await db.query(`select to_jsonb(public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')})) as v`,args)).rows[0].v
 const data={solicitud_id:randomUUID(),nombre:'QA base',rendimiento_porciones:2,unidad_rendimiento:'porcion',es_produccion:true,crear_salida:true,nombre_salida:'QA listo',cantidad_salida:2,unidad_salida:'porcion',ingredientes:[{producto_id:kg,cantidad:1,unidad_medida:'kg'},{producto_id:portion,cantidad:1,unidad_medida:'porcion'}],pasos:[{titulo:'Cocer',descripcion:'Cocer ingredientes'}]}
 const save=(id,d)=>rpc('guardar_receta_atomica',[rid,uid,id,JSON.stringify(d)])
 let r=await save(null,data);assert.equal((await save(null,data)).id,r.id,'create retry idempotent')
 assert.equal((await db.query('select * from escalar_receta($1,2)',[foreignRecipe])).rows.length,0,'scaling cannot read another tenant')
 assert.equal((await db.query('select * from escalar_receta($1,2)',[r.id])).rows.length,2,'own scaling works')
 assert.ok(r.producto_salida_id);assert.equal(Number(r.cantidad_salida_gramos),2)
 for(let i=0;i<3;i++){
  r=await save(r.id,{...data,crear_salida:false,producto_salida_id:r.producto_salida_id,version_esperada:r.version_actual,solicitud_id:randomUUID()})
  assert.equal(Number((await db.query('select count(*) n from recetas_ingredientes where receta_id=$1',[r.id])).rows[0].n),2)
  assert.equal(Number((await db.query('select count(*) n from recetas_pasos where receta_id=$1',[r.id])).rows[0].n),1)
 }
 assert.equal((await save(null,data)).id,r.id,'delayed create retry after later edits must not create another recipe')
 await assert.rejects(()=>save(null,{...data,nombre:'Alterado'}),/otros datos/)
 const invalid={...data,crear_salida:false,producto_salida_id:r.producto_salida_id,version_esperada:r.version_actual,solicitud_id:randomUUID(),ingredientes:[{producto_id:kg,cantidad:1,unidad_medida:'kg'},{producto_id:portion,cantidad:1,unidad_medida:'g'}]}
 await assert.rejects(()=>save(r.id,invalid),/equivalencia de peso/)
 await assert.rejects(()=>save(r.id,{...invalid,ingredientes:[{producto_id:kg,cantidad:1,unidad_medida:'porción'}]}),/equivalencia de peso/)
 assert.equal(Number((await db.query("select cantidad_operativa_producto(p,2,'porción') n from productos p where id=$1",[portion])).rows[0].n),2,'accented portion is still a count, never mass')
 assert.equal(Number((await db.query('select count(*) n from recetas_ingredientes where receta_id=$1',[r.id])).rows[0].n),2,'failure rolls back child replacement')
 await assert.rejects(()=>save(r.id,{...invalid,ingredientes:[{producto_id:foreign,cantidad:1,unidad_medida:'kg'}]}),/Ingrediente inválido/)
 await assert.rejects(()=>save(r.id,{...invalid,version_esperada:0}),/cambió/)
 console.log('PASS atomic create/edit, retries, no duplicated children, rollback, portions without mass, tenant isolation and stale edit rejection')
 await db.exec('reset role')
 const lote=(await db.query(`insert into produccion_lotes(restaurante_id,fecha,turno,responsable_id) values($1,current_date,'mañana',$2) returning id`,[rid,uid])).rows[0].id
 await db.exec('set role authenticated')
 const sid=randomUUID();let prod=await rpc('registrar_produccion_segura',[r.id,lote,1,7,sid,'QA'])
 assert.equal((await rpc('registrar_produccion_segura',[r.id,lote,1,7,sid,'QA'])).id,prod.id)
 await assert.rejects(()=>rpc('registrar_produccion_segura',[r.id,lote,2,7,sid,'QA']),/otros datos/)
 const stock=async id=>Number((await db.query('select stock_actual from productos where id=$1',[id])).rows[0].stock_actual)
 assert.equal(await stock(kg),9);assert.equal(await stock(portion),9);assert.equal(await stock(r.producto_salida_id),7)
 assert.equal(Number(prod.costo_real),1200,'cost uses price per kg and per portion, not the unit factor as price')
 await assert.rejects(()=>rpc('registrar_produccion_segura',[r.id,lote,100,200,randomUUID(),'Sin stock']),/Stock insuficiente/)
 assert.equal(await stock(kg),9,'stock failure rolls back')
 await db.exec('reset role');await db.query('update productos set peso_unitario_gramos=50 where id=$1',[r.producto_salida_id]);await db.exec('set role authenticated')
 await assert.rejects(()=>rpc('registrar_produccion_segura',[r.id,lote,1,2,randomUUID(),'Equivalencia cambió']),/Cambió la unidad/)
 await db.exec('reset role');await db.query('update productos set peso_unitario_gramos=null where id=$1',[r.producto_salida_id]);await db.exec('set role authenticated')
 await db.exec('reset role');await db.query('update productos set peso_unitario_gramos=100 where id=$1',[portion]);await db.exec('set role authenticated')
 await assert.rejects(()=>rpc('corregir_produccion_segura',[prod.id,2,10,'Cambio de unidad',randomUUID()]),/Cambió la unidad/)
 assert.equal(await stock(kg),9,'conversion change rolls back all compensation')
 await db.exec('reset role');await db.query('update productos set peso_unitario_gramos=null where id=$1',[portion]);await db.exec('set role authenticated')
 const correction=randomUUID();prod=await rpc('corregir_produccion_segura',[prod.id,2,10,'Cantidad corregida',correction]);await rpc('corregir_produccion_segura',[prod.id,2,10,'Cantidad corregida',correction])
 await assert.rejects(()=>rpc('corregir_produccion_segura',[prod.id,3,10,'Cantidad corregida',correction]),/otros datos/)
 assert.equal((await rpc('registrar_produccion_segura',[r.id,lote,1,7,sid,'QA'])).id,prod.id,'late retry after a correction remains the same production')
 assert.equal(await stock(kg),8);assert.equal(await stock(r.producto_salida_id),10)
 assert.equal(Number(prod.costo_real),2400)
 assert.equal(Number(prod.ingredientes_consumidos.find(x=>x.producto_id===kg).cantidad_gramos),2000)
 await rpc('corregir_produccion_segura',[prod.id,0,0,'Anular ensayo',randomUUID()])
 assert.equal(await stock(kg),10);assert.equal(await stock(r.producto_salida_id),0)
 const merma=await rpc('registrar_merma_completa',[rid,portion,1,'porcion','otro',uid,'QA'])
 assert.equal(await stock(portion),9)
 assert.equal(Number((await db.query("select count(*) n from actividad_operativa where entidad_id=$1 and accion='registrar_merma'",[merma.id])).rows[0].n),1)
 await assert.rejects(()=>rpc('registrar_merma_completa',[rid,portion,1,'g','otro',uid,'Incompatible']),/equivalencia de peso/)
 assert.equal(await stock(portion),9)
 await db.exec('reset role');await db.query("update usuarios set rol='cocinero' where id=$1",[uid]);await db.exec('set role authenticated')
 await assert.rejects(()=>save(null,{...data,solicitud_id:randomUUID()}),/Sin permisos/)
 assert.equal(Number((await db.query('select count(*) n from productos where restaurante_id=$1',[other])).rows[0].n),0,'RLS hides other tenant products')
 console.log('PASS production actual yield, repeat prevention, correction and compensated cancellation')
 }finally{await db.close()}
}
main().catch(e=>{console.error(e.message,e.detail??'');process.exitCode=1})
