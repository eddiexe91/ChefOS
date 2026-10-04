// Pruebas locales: ninguna llamada de red ni datos reales.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')

async function main() {
  for (const name of ['generar-briefing', 'cierre-diario']) {
    let handler, reads = 0, writes = 0, rpcError = null
    const env = { CHEFOS_CRON_SECRET: 'solo-fixture-local', SUPABASE_URL: 'https://example.invalid', SUPABASE_SERVICE_ROLE_KEY: 'fixture' }
    const db = {
      from() { reads++; return { select() { return { eq: async () => ({ data: [{ id: 'fixture' }], error: null }) } }, upsert() { writes++; throw Error('Escritura inesperada') } } },
      rpc: async () => { reads++; return { data: {}, error: rpcError } },
    }
    const sandbox = { exports: {}, Request, Response, console, Deno: { env: { get: k => env[k] }, serve: f => { handler = f } }, require: () => ({ createClient: () => db }) }
    const code = fs.readFileSync(`supabase/functions/${name}/index.ts`, 'utf8')
    vm.runInNewContext(ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, sandbox)
    const req = (secret, body = { verificar: true }, method = 'POST') => new Request('https://example.invalid', { method, headers: secret ? { 'x-chefos-cron-secret': secret } : {}, ...(method === 'POST' ? { body: JSON.stringify(body) } : {}) })
    assert.equal((await handler(req())).status, 401)
    assert.equal((await handler(req('incorrecta'))).status, 401)
    assert.equal(reads, 0, 'No leer restaurantes antes de autenticar')
    assert.equal((await handler(req(env.CHEFOS_CRON_SECRET, {}, 'GET'))).status, 405)
    assert.equal((await handler(req(env.CHEFOS_CRON_SECRET, { fecha: '2026-02-30' }))).status, 400)
    const ok = await handler(req(env.CHEFOS_CRON_SECRET))
    assert.equal(ok.status, 200)
    assert.equal((await ok.json()).modo, 'verificacion_sin_escrituras')
    assert.equal(writes, 0)
    rpcError = { message: 'fixture RPC no disponible' }
    assert.equal((await handler(req(env.CHEFOS_CRON_SECRET))).status, 500)
    delete env.CHEFOS_CRON_SECRET
    assert.equal((await handler(req('solo-fixture-local'))).status, 401)
    console.log(`PASS ${name}: autenticación, método, fecha, diagnóstico sin escrituras y errores RPC.`)
  }
  // Execute the real shared rules with a synthetic automatic briefing.
  let handler,guardado,fallarHistoria=false
  const motor={exports:{}},contexto={exports:{}}
  for(const [file,out] of [['briefingOperativo',motor],['contextoVentas',contexto]])
    vm.runInNewContext(ts.transpileModule(fs.readFileSync(`supabase/functions/_shared/${file}.ts`,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,out)
  const stock=[{id:'base',nombre:'Base ficticia',activo:true,tipo_operativo:'elaborado',stock_actual:0,stock_minimo:5,cantidad_gramos:0,stock_minimo_gramos:5,unidad_medida:'porcion'}]
  const db={from(tabla){let value=tabla==='restaurantes'?[{id:'sintetico',zona_horaria:'America/Santiago'}]:tabla==='productos'?stock:tabla==='alertas_sistema'?[{tipo:'stock_critico',severidad:'critica',mensaje:'Viejo stock 0'}]:tabla==='recetas'?[{id:'receta',nombre:'Base ficticia',producto_salida_id:'base',cantidad_salida_gramos:2,ingredientes:[]}]:[]
    return {select(){return this},eq(){return this},limit(){return this},upsert(v){guardado=v;return Promise.resolve({error:null})},then(resolve,reject){return Promise.resolve({data:value,error:null}).then(resolve,reject)}}},
    rpc(){return {abortSignal:async()=>({data:null,error:fallarHistoria?{message:'timeout'}:null})}}}
  const sandbox={exports:{},Request,Response,Date,Intl,AbortSignal,Deno:{env:{get:k=>k==='CHEFOS_CRON_SECRET'?'fixture':'https://example.invalid'},serve:f=>{handler=f}},require:n=>n.includes('briefingOperativo')?motor.exports:n.includes('contextoVentas')?contexto.exports:{createClient:()=>db}}
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('supabase/functions/generar-briefing/index.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,sandbox)
  const request=()=>new Request('https://example.invalid',{method:'POST',headers:{'x-chefos-cron-secret':'fixture'},body:JSON.stringify({fecha:'2026-10-03'})})
  assert.equal((await handler(request())).status,200)
  assert.equal(guardado.produccion_sugerida[0].cantidad,3)
  assert.ok(!guardado.riesgos.some(r=>r.descripcion.includes('Viejo')))
  stock[0].stock_actual=6;stock[0].cantidad_gramos=6;fallarHistoria=true
  assert.equal((await handler(request())).status,200)
  assert.equal(guardado.produccion_sugerida.length,0)
  assert.ok(guardado.contexto_usado.observaciones_ventas[0].includes('No se pudo verificar'))
  console.log('PASS cron real sintético: reglas compartidas, mínimo de producción, alerta antigua descartada y fallo histórico aislado.')
}
main().catch(error => { console.error(error); process.exitCode = 1 })
