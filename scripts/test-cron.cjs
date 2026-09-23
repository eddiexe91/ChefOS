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
}
main().catch(error => { console.error(error); process.exitCode = 1 })
