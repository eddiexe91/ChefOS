// Contratos HTTP y renderizado SSR sin sesión, red ni datos reales.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
function cargar(file, sustituciones={}) {
  const contexto={exports:{},TextDecoder,Blob,Request,URL,console}
  contexto.require=name=>{
    if(name in sustituciones) return sustituciones[name]
    if(name.startsWith('@/') || name.startsWith('.')) {
      const base=name.startsWith('@/') ? path.resolve('src',name.slice(2)) : path.resolve(path.dirname(file),name)
      return cargar(['.ts','.tsx','/index.ts'].map(ext=>base+ext).find(fs.existsSync),sustituciones)
    }
    return require(name)
  }
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,contexto)
  return contexto.exports
}
async function main(){
  const sustituciones={'next/link':{__esModule:true,default:({children,href,...props})=>React.createElement('a',{href,...props},children)}}
  const importar=renderToStaticMarkup(React.createElement(cargar('src/components/ventas/HistorialPOSCliente.tsx',sustituciones).default))
  assert.equal((importar.match(/type="file"/g)||[]).length,4)
  assert.ok(importar.includes('Validar y ver vista previa'))
  assert.ok(!importar.includes('Confirmar importación histórica'),'no confirmar antes de validar')
  assert.ok(importar.includes('aria-live="polite"'))
  for(const file of ['src/app/(autenticado)/ventas/mapeos/page.tsx','src/app/(autenticado)/ventas/analitica/page.tsx']){
    const html=renderToStaticMarkup(React.createElement(cargar(file,sustituciones).default))
    assert.ok(html.includes('campo-input'));assert.ok(!html.includes('input-base'))
  }
  const css=fs.readFileSync('src/styles/globals.css','utf8')
  assert.match(css,/\.campo-input\s*\{[^}]*h-12[^}]*text-texto-primario/s)
  assert.match(css,/--color-texto-primario:\s*#F2EFE8/i)
  let autenticado=false,llamadas=[]
  const db={auth:{getUser:async()=>({data:{user:autenticado?{id:'usuario-sintetico'}:null}})},rpc:async(nombre,args)=>{llamadas.push({nombre,args});return{data:1,error:null}}}
  const ruta=cargar('src/app/api/ventas/historial/route.ts',{'@/lib/supabase/servidor':{crearClienteServidor:()=>db}})
  const peticion=body=>new Request('http://localhost/api/ventas/historial',{method:'POST',body:JSON.stringify(body)})
  assert.equal((await ruta.POST(peticion({accion:'confirmar',id:'otro'}))).status,401)
  assert.equal(llamadas.length,0)
  autenticado=true
  assert.equal((await ruta.POST(peticion({accion:'bloque',tipo:'tickets',inicio:0,filas:[]}))).status,400)
  assert.equal((await ruta.POST(peticion({accion:'bloque',tipo:'tickets',inicio:0,filas:[{ocurrencia:1,campos:{ticket_id:'H-1',fecha:'2026-02-30',total_ticket:'10'}}]}))).status,400)
  assert.equal(llamadas.length,0)
  const r=await ruta.POST(peticion({accion:'bloque',id:'importacion-sintetica',restaurante_id:'restaurante-inyectado',tipo:'tickets',inicio:0,filas:[{ocurrencia:1,campos:{ticket_id:'H-1',fecha:'2026-09-18',total_ticket:'10'}}]}))
  assert.equal(r.status,200)
  assert.equal(llamadas[0].nombre,'preparar_historial_bloque')
  assert.equal(llamadas[0].args.p_filas[0].total,10)
  assert.ok(!JSON.stringify(llamadas).includes('restaurante-inyectado'),'tenant no viene del cliente')
  const dbLegado={...db,from:tabla=>({select(){return this},eq(){return this},single:async()=>({data:tabla==='usuarios'?{id:'usuario',restaurante_id:'tenant',rol:'administrador'}:tabla==='ventas_importaciones'?{id:'importacion',modo:'historico'}:{id:'linea',ticket_id:'ticket'}})})}
  const depsLegado={'@/lib/supabase/servidor':{crearClienteServidor:()=>dbLegado}}
  const confirmarLegado=cargar('src/app/api/ventas/importaciones/[id]/confirmar/route.ts',depsLegado)
  const editarLegado=cargar('src/app/api/ventas/items/[id]/route.ts',depsLegado)
  const detalleLegado=cargar('src/app/api/ventas/importaciones/[id]/route.ts',depsLegado)
  const llamadasAntes=llamadas.length
  assert.equal((await confirmarLegado.POST(peticion({}),{params:{id:'importacion'}})).status,409)
  assert.equal((await editarLegado.PATCH(peticion({receta_id:'receta'}),{params:{id:'linea'}})).status,409)
  const detalle=await (await detalleLegado.GET(peticion({}),{params:{id:'importacion'}})).json()
  assert.equal(detalle.data.items.length,0,'no cargar historial desde revisión operativa')
  assert.equal(llamadas.length,llamadasAntes,'historial nunca invoca descuento operativo')
  const {totalVentasPeriodo}=cargar('src/lib/ventas/totalVentas.ts')
  const sinRPC={code:'PGRST202',message:'missing'}
  let lotes=0
  const anterior={rpc:async()=>({data:null,error:sinRPC}),from:tabla=>({select(){return this},eq(){return this},gte(){return this},lte(){return this},order(){return this},limit:async()=>({error:{code:'PGRST205'}}),range:async()=>{lotes++;return{data:lotes===1?Array.from({length:1000},()=>({total:1})):[{total:5}],error:null}}})}
  assert.equal((await totalVentasPeriodo(anterior,'tenant','2026-01-01','2026-01-02')).data,1005,'compatibilidad paginada sin truncar 1000 filas')
  assert.equal(lotes,2)
  const parcial={...anterior,from:()=>({select(){return this},limit:async()=>({error:null})})}
  assert.equal((await totalVentasPeriodo(parcial,'tenant','2026-01-01','2026-01-02')).error.code,'PGRST202','esquema histórico parcial no suma líneas como facturación')
  console.log('PASS SSR formularios, clases de contraste/tamaño, confirmación protegida y contratos API sin red. No equivale a test visual Android.')
}
main().catch(e=>{console.error(e);process.exitCode=1})
