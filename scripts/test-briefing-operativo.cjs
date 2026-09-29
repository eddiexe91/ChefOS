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
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/app/api/ia/briefing/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,env)
 assert.equal((await env.exports.POST()).status,200)
 assert.equal(saved.compras_sugeridas.length,1)
 assert.equal(saved.compras_sugeridas[0].producto,'Harina')
 assert.equal(saved.compras_sugeridas[0].cantidad_sugerida,3)
 assert.equal(saved.compras_sugeridas[0].unidad,'kg')
 assert.ok(saved.riesgos.some(x=>x.tipo==='configuracion'&&x.descripcion.includes('Sin mínimo')))
 assert.equal(saved.produccion_sugerida.length,0,'no production invented from an open lot')
 failHistory=true;assert.equal((await env.exports.POST()).status,200)
 assert.equal(saved.compras_sugeridas[0].cantidad_sugerida,3,'history timeout must preserve operational purchases')
 assert.equal(saved.contexto_usado.ventas,null)
 assert.ok(saved.contexto_usado.observaciones_ventas[0].includes('No se pudo verificar'))
 assert.ok(saved.contexto_usado.verificado_en)
 failStock=true;await env.exports.POST();assert.ok(saved.riesgos.some(x=>x.tipo==='gestion'&&x.descripcion.includes('verificar')))
 console.log('PASS Briefing: minimum zero requires configuration, exact threshold buys nothing, shortage preserves units, incomplete sources are disclosed.')
}
main().catch(e=>{console.error(e);process.exitCode=1})
