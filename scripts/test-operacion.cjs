// Prueba autenticada contra el servidor local o desplegado. Solo crea y limpia
// un restaurante QA propio; nunca usa usuarios ni productos existentes.
const { loadEnvConfig } = require('@next/env');
loadEnvConfig(process.cwd());
const { createClient } = require('@supabase/supabase-js');
const { createServerClient } = require('@supabase/ssr');
const { randomUUID } = require('node:crypto');
const assert = require('node:assert/strict');
const base = process.env.CHEFOS_TEST_URL || 'http://localhost:3000';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, {auth:{persistSession:false,autoRefreshToken:false}});
const tag = `qa-chefos-${randomUUID()}`;
const cookies = new Map();
const db = createServerClient(url, anon, {cookies:{get:n=>cookies.get(n),set:(n,v)=>cookies.set(n,v),remove:n=>cookies.delete(n)}});
let userId, restauranteId;
async function request(path,body,method='POST') {
  const r = await fetch(base+path,{method,headers:{'Content-Type':'application/json',Cookie:[...cookies].map(([k,v])=>`${k}=${v}`).join('; ')},body:JSON.stringify(body)});
  const j=await r.json();
  assert.ok(r.ok,`${path}: ${r.status} ${JSON.stringify(j)}`);return j;
}
function check(r,label) {if(r.error)throw new Error(`${label}: ${r.error.message}`); return r.data;}
(async()=>{
try {
  const password=randomUUID()+'Aa1!';
  const created=check(await admin.auth.admin.createUser({email:`${tag}@example.com`,password,email_confirm:true,user_metadata:{full_name:'QA ChefOS',restaurant_name:tag}}),'crear QA');
  userId=created.user.id;
  check(await db.auth.signInWithPassword({email:created.user.email,password}),'login QA');
  const perfil=check(await db.from('usuarios').select('restaurante_id').eq('id',userId).single(),'perfil');restauranteId=perfil.restaurante_id;
  assert.equal(check(await admin.from('restaurantes').select('nombre').eq('id',restauranteId).single(),'scope QA').nombre,tag);
  const list=check(await db.from('recetas').select('*,categoria:categorias_receta(id,nombre,orden),producto_salida:productos!recetas_producto_salida_id_fkey(id,nombre)').eq('restaurante_id',restauranteId),'lista recetas');
  assert.equal(list.length,0);console.log('PASS lista Recetas y Carta, relación sin ambigüedad');
  const ing=(await request('/api/inventario/productos',{nombre:'QA Corvina',unidad_medida:'kg',stock:10,stock_minimo:20,costo_unitario:1000,tipo_operativo:'materia_prima'})).data;
  assert.ok(ing?.id,'Producto API devuelve data.id');
  const receta=(await request('/api/biblioteca/recetas',{nombre:'QA Caldo de pescado',categoria_id:null,rendimiento_porciones:2,unidad_rendimiento:'porcion',en_carta:true,es_produccion:true,ingredientes:[{producto_id:ing.id,cantidad:1,unidad_medida:'kg'}],pasos:[{numero:1,titulo:'Cocer',descripcion:'Cocer los ingredientes'}]})).data;
  assert.ok(receta?.id); console.log('PASS crear receta y plato de carta');
  const detalle=check(await db.from('recetas').select('*,ingredientes:recetas_ingredientes(*,producto:productos(id,nombre)),producto_salida:productos!recetas_producto_salida_id_fkey(id,nombre)').eq('id',receta.id).single(),'detalle');
  assert.equal(detalle.ingredientes.length,1);console.log('PASS detalle e ingredientes');
  const briefing=(await request('/api/ia/briefing',{})).data;
  assert.ok(briefing.compras_sugeridas.some(x=>x.producto==='QA Corvina'));console.log('PASS briefing con compra crítica real');
  const producido=check(await db.rpc('registrar_produccion_completa',{p_restaurante_id:restauranteId,p_receta_id:receta.id,p_porciones:2,p_responsable_id:userId,p_turno:'mañana'}),'produccion');
  assert.ok(producido);const stock=check(await db.from('productos').select('cantidad_gramos').eq('id',ing.id).single(),'stock');assert.equal(Number(stock.cantidad_gramos),9000);console.log('PASS producción descuenta exactamente 1 kg');
  await request('/api/mermas',{producto_id:ing.id,cantidad:1,unidad_medida:'kg',motivo:'otro'});
  const stockMerma=check(await db.from('productos').select('cantidad_gramos').eq('id',ing.id).single(),'stock merma');assert.equal(Number(stockMerma.cantidad_gramos),8000);console.log('PASS merma descuenta exactamente 1 kg');
} finally {
  if(restauranteId){const r=await admin.from('restaurantes').select('nombre').eq('id',restauranteId).single();if(r.data?.nombre===tag){check(await admin.from('restaurantes').delete().eq('id',restauranteId),'limpieza restaurante QA');}}
  if(userId)check(await admin.auth.admin.deleteUser(userId),'limpieza usuario QA');
  await db.auth.signOut();console.log('Limpieza de datos QA completada');
}
})().catch(e=>{console.error(e.message);process.exitCode=1});
