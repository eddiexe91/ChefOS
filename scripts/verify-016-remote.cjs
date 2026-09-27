// Read-only schema and negative permission probes. Never inserts fixtures remotely.
const assert = require('node:assert/strict')
require('@next/env').loadEnvConfig(process.cwd())
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const admin = process.env.SUPABASE_SERVICE_ROLE_KEY
async function request(path, key, body) {
  const response = await fetch(`${url}/rest/v1/${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  return { status: response.status, data: await response.json() }
}
async function main() {
  assert.ok(url && anon && admin, 'Missing server configuration; no secrets are printed')
  for (const path of [
    'recetas_guardados?select=solicitud_id&limit=0',
    'produccion_correcciones?select=id&limit=0',
    'produccion_registros?select=tandas,salida_real,anulado,conversiones_registradas,solicitud_datos&limit=0',
    'recetas?select=ultima_solicitud&limit=0',
  ]) {
    const result = await request(path, admin)
    assert.equal(result.status, 200, `${path}: ${result.data.code || result.status}`)
  }
  for (const name of ['recetas_guardados', 'produccion_correcciones']) {
    const result = await request(`${name}?select=*&limit=0`, anon)
    assert.equal(result.status, 401, `anon must not read ${name}`)
    assert.equal(result.data.code, '42501')
  }
  const calls = [
    ['guardar_receta_atomica', { p_restaurante_id:null,p_usuario_id:null,p_receta_id:null,p_datos:{solicitud_id:'00000000-0000-4000-8000-000000000001'} }],
    ['registrar_produccion_segura', {p_receta_id:null,p_lote_id:null,p_tandas:1,p_salida_real:1,p_solicitud:'00000000-0000-4000-8000-000000000001',p_notas:null}],
    ['corregir_produccion_segura', {p_registro:null,p_tandas:1,p_salida:1,p_motivo:'permission probe',p_solicitud:'00000000-0000-4000-8000-000000000001'}],
  ]
  for (const [name, body] of calls) {
    const result = await request(`rpc/${name}`, anon, body)
    assert.equal(result.data.code, '42501', `anon cannot execute ${name}; got ${result.data.code}`)
  }
  const product = {unidad_medida:'porcion',nombre:'synthetic parameter',peso_unitario_gramos:null,densidad_g_por_ml:null}
  const good = await request('rpc/cantidad_operativa_producto', admin, {p_producto:product,p_cantidad:2,p_unidad:'porción'})
  assert.equal(good.status,200);assert.equal(Number(good.data),2)
  const bad = await request('rpc/cantidad_operativa_producto', admin, {p_producto:product,p_cantidad:2,p_unidad:'g'})
  assert.equal(bad.data.code,'P0001')
  console.log('PASS remote 016: schema, anonymous access denied, portion conversion and incompatible unit rejected. No data written; not authenticated E2E.')
}
main().catch(error=>{console.error(error.message);process.exitCode=1})
