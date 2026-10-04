// Synthetic HTTP test. No network, credentials or restaurant writes.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript')
async function main(){
 let saved,failStock=false,failHistory=false
 const fixtures={usuarios:{id:'qa',restaurante_id:'qa'},restaurantes:{zona_horaria:'America/Santiago'},productos:[
  {id:'sin-minimo',nombre:'Sin mínimo',stock_actual:0,stock_minimo:0,unidad_medida:'g',tipo_operativo:'materia_prima'},
  {id:'harina',nombre:'Harina',stock_actual:2,stock_minimo:5,unidad_medida:'kg',tipo_operativo:'materia_prima'},
  {id:'exacto',nombre:'Suficiente',stock_actual:5,stock_minimo:5,unidad_medida:'g',tipo_operativo:'materia_prima'}
 ],alertas_sistema:[],recetas:[],produccion_registros:[]}
 const db={auth:{getUser:async()=>({data:{user:{id:'qa'}}})},rpc:()=>({abortSignal:async(signal)=>{assert.ok(signal instanceof AbortSignal);return {data:failHistory?null:{},error:failHistory?{code:'57014',message:'timeout'}:null}}}),from(table){
  let value=fixtures[table]??[]
  const q={select(){return this},eq(){return this},limit(){return this},upsert(x){saved=x;value=x;return this},single:async()=>({data:value,error:null}),then(resolve,reject){return Promise.resolve({data:value,error:failStock&&table==='productos'?{code:'TEST',message:'fixture'}:null}).then(resolve,reject)}}
  return q
 }}
 const env={exports:{},console:{error(){}},Intl,Date,AbortSignal,require:n=>n==='@/lib/supabase/servidor'?{crearClienteServidor:()=>db}:n==='@/lib/ventas/contextoBriefing'?{observacionesVentas:()=>[]}:require(n)}
 const motor={exports:{}}
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('supabase/functions/_shared/briefingOperativo.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,motor)
 const requireAnterior=env.require
 env.require=n=>n.includes('_shared/briefingOperativo')?motor.exports:requireAnterior(n)
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/app/api/ia/briefing/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,env)
 assert.equal((await env.exports.POST()).status,200)
 assert.equal(saved.compras_sugeridas.length,1)
 assert.equal(saved.compras_sugeridas[0].producto,'Harina')
 assert.equal(saved.compras_sugeridas[0].cantidad_sugerida,3)
 assert.equal(saved.compras_sugeridas[0].unidad,'kg')
 assert.ok(saved.riesgos.some(x=>x.tipo==='configuracion'&&x.descripcion.includes('Sin mínimo')))
 assert.equal(saved.produccion_sugerida.length,0,'no production invented from an open lot')
 fixtures.alertas_sistema.push({tipo:'stock_critico',severidad:'critica',mensaje:'Existencia antigua: Base 0'})
 fixtures.productos.push({id:'base',nombre:'Base',stock_actual:0,stock_minimo:5,cantidad_gramos:0,stock_minimo_gramos:5,unidad_medida:'porcion',tipo_operativo:'elaborado'})
 fixtures.recetas.push({id:'base-receta',nombre:'Base receta',es_produccion:true,producto_salida_id:'base',cantidad_salida_gramos:2,ingredientes:[]})
 await env.exports.POST()
 assert.equal(saved.produccion_sugerida.find(x=>x.nombre.includes('Base')).cantidad,3,'5 needed / 2 per recipe rounds to 3 complete batches')
 assert.ok(!saved.riesgos.some(x=>x.descripcion.includes('Existencia antigua')),'old stock event cannot describe current risk')
 fixtures.productos.find(p=>p.id==='base').stock_actual=6
 fixtures.productos.find(p=>p.id==='base').cantidad_gramos=6
 await env.exports.POST()
 assert.equal(saved.produccion_sugerida.length,0,'replenishing clears production shortage even without reading the old alert')
 assert.ok(!saved.riesgos.some(x=>x.descripcion.includes('Base:')))
 const harina=fixtures.productos.find(p=>p.id==='harina')
 harina.cantidad_gramos=2000;harina.stock_minimo_gramos=5000
 fixtures.recetas.push({id:'plato',nombre:'Plato',es_produccion:false,ingredientes:[{cantidad:3000,cantidad_gramos:3000,unidad_medida:'g',producto:harina}]})
 await env.exports.POST()
 assert.equal(saved.compras_sugeridas.find(x=>x.producto==='Harina').cantidad_sugerida,3,'Carta must not reduce the minimum shortage or mix grams with kg')
 assert.equal(saved.compras_sugeridas.find(x=>x.producto==='Harina').unidad,'kg')
 failHistory=true;assert.equal((await env.exports.POST()).status,200)
 assert.equal(saved.compras_sugeridas[0].cantidad_sugerida,3,'history timeout must preserve operational purchases')
 assert.equal(saved.contexto_usado.ventas,null)
 assert.ok(saved.contexto_usado.observaciones_ventas[0].includes('No se pudo verificar'))
 assert.ok(saved.contexto_usado.verificado_en)
 failStock=true;await env.exports.POST();assert.ok(saved.riesgos.some(x=>x.tipo==='gestion'&&x.descripcion.includes('verificar')))
 console.log('PASS Briefing: minimum zero requires configuration, exact threshold buys nothing, shortage preserves units, incomplete sources are disclosed.')
}
main().catch(e=>{console.error(e);process.exitCode=1})
