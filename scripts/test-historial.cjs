// Exclusivamente fixtures sintéticos. PostgreSQL en memoria, nunca Supabase remoto.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const vm = require('node:vm')
const { PGlite } = require('@electric-sql/pglite')
function cargar(file) {
  const out = { exports: {}, TextDecoder, Blob }
  out.require = name => cargar(path.resolve(path.dirname(file), name + '.ts'))
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, out)
  return out.exports
}
const parser = cargar('src/lib/ventas/softRestaurant.ts')
const { observacionesVentas } = cargar('src/lib/ventas/contextoBriefing.ts')
// Los cuatro CSV son pequeños, sintéticos y utilizables por el parser real.
const fixtures = {
 productos: 'producto_id;producto;grupo;precio_catalogo;iva_pct;bloqueado\nP1;Pescado prueba;Fondos;10;19;0\n',
 tickets: 'ticket_id;origen;folio;fecha;apertura;franja;personas;total_ticket;total_descuentos;total_cortesias\nH-1;H;1;2026-09-11;2026-09-11 13:00:00;Almuerzo;2;18;2;0\nA-1;A;1;2026-09-12;2026-09-12 20:00:00;Cena;1;7;0;0\n',
 ventas_detalle: 'ticket_id;movimiento;producto_id;producto;fecha;hora_producto;franja;cantidad;precio_unitario;importe_linea_estimado;descuento_linea_pct;cortesia\nH-1;1;P1;Pescado prueba;2026-09-11;13:05;Almuerzo;2;10;20;0;0\nA-1;1;OLD;PRODUCTO NO VIGENTE [OLD];2026-09-12;20:10;Cena;1;7;7;0;0\n',
 pagos: 'ticket_id;forma_pago_id;forma_pago;importe;propina;tipo_cambio\nH-1;EF;Efectivo;9;0;1\nH-1;TJ;Tarjeta;9;0;1\nA-1;EF;Efectivo;7;0;1\n',
}
async function main() {
  const canon = {}, raw = {}
  for (const [tipo, csv] of Object.entries(fixtures)) {
    raw[tipo] = []; canon[tipo] = []
    for await (const r of parser.filasArchivo(new Blob([csv]))) {
      parser.validarCabecera(tipo, Object.keys(r)); raw[tipo].push(r); canon[tipo].push(parser.normalizarSoftRestaurant(tipo, r))
    }
  }
  assert.equal(canon.tickets.length, 2)
  assert.notEqual(canon.tickets[0].clave, canon.tickets[1].clave, 'folios iguales no colisionan')
  assert.equal(canon.ventas_detalle[1].nombre, 'PRODUCTO NO VIGENTE [OLD]')
  assert.equal(parser.fechaPOS('29/02/2024'), '2024-02-29')
  assert.throws(() => parser.fechaPOS('2025-02-29'))
  assert.throws(() => parser.numeroPOS('1.000,00'))
  assert.equal(parser.numeroPOS('1,5'), 1.5)
  assert.throws(() => parser.normalizarSoftRestaurant('ventas_detalle', { ...raw.ventas_detalle[0], cantidad: '-1' }))
  assert.throws(() => parser.normalizarSoftRestaurant('tickets', { ...raw.tickets[0], estado: 'cancelado' }))
  assert.throws(() => parser.normalizarSoftRestaurant('tickets', { ...raw.tickets[0], descuento_cabecera_pct: '101' }))
  assert.notEqual(parser.normalizarSoftRestaurant('pagos', raw.pagos[0], 1).clave, parser.normalizarSoftRestaurant('pagos', raw.pagos[0], 2).clave)
  assert.equal(parser.normalizarSoftRestaurant('ventas_detalle', { ...raw.ventas_detalle[0], cortesia: '1', importe_linea_estimado: '0' }).total, 0)
  let count = 0
  for await (const r of parser.filasArchivo(new Blob(['nombre,cantidad\n' + '"Sopa, con ""sal""\ny agua",1\n'.repeat(5000)]))) { assert.equal(r.nombre, 'Sopa, con "sal"\ny agua'); count++ }
  assert.equal(count, 5000, 'stream cruza bloques y comillas')
  await assert.rejects(async () => { for await (const r of parser.filasArchivo(new Blob(['nombre,cantidad\n"sin cerrar,1']))) void r })
  await assert.rejects(async () => { for await (const r of parser.filasArchivo(new Blob([new Uint8Array([0xff])]), 'utf-8')) void r })
  let acento
  for await (const r of parser.filasArchivo(new Blob([new Uint8Array([110,111,109,98,114,101,10,99,97,102,233,10])]), 'windows-1252')) acento = r.nombre
  assert.equal(acento, 'café')
  assert.throws(() => parser.validarCabecera('tickets', ['ticket_id','ticket_id','fecha','total_ticket']))
  assert.throws(() => parser.normalizarSoftRestaurant('tickets', { ...raw.tickets[0], apertura: '2026-02-30 12:00' }))
  assert.equal(observacionesVentas({ ultima_venta: null }).length, 1)
  const contextoPrueba={version:'historico-v1',desde:'2026-07-24',hasta:'2026-09-17',fecha_objetivo:'2026-09-18',ultima_venta:'2026-09-17',dias_comparables:8,dias_4_semanas:20,dias_4_semanas_previas:20,productos:[{nombre:'Plato sintético',unidades_promedio:12,unidades_4_semanas:200,unidades_4_semanas_previas:100,mapeo:'confirmado'}]}
  assert.match(observacionesVentas(contextoPrueba)[0],/subió 100%/)
  assert.match(observacionesVentas({...contextoPrueba,ultima_venta:'2026-08-01'})[0],/Actualiza las ventas/)
  assert.match(observacionesVentas({...contextoPrueba,dias_comparables:2})[0],/todavía no hay base suficiente/)
  assert.equal(observacionesVentas({...contextoPrueba,productos:Array(10).fill(contextoPrueba.productos[0])}).length,3)
  console.log('PASS parser, normalización, codificación estructural y streaming 5000 filas.')

  const db = new PGlite()
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role;
      create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      create function auth.role() returns text language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claim.role',true),''),'authenticated') $$;
      grant usage on schema public,auth to authenticated,anon,service_role;
      grant execute on all functions in schema auth to authenticated,anon,service_role;`)
    // Esquema base real; solo se omiten extensiones/índices de búsqueda no usados en esta prueba.
    const base = fs.readFileSync('supabase/migrations/001_schema_base.sql','utf8').replace(/^create extension.*$/gm,'').replace(/^create index.*gin_trgm_ops.*$/gm,'')
    await db.exec(base)
    const auth = fs.readFileSync('supabase/migrations/007_integridad_operativa.sql','utf8')
    await db.exec(auth.slice(auth.indexOf('create or replace function public.chefos_es_miembro'), auth.indexOf('-- -----------------------------------------------------------------------------', auth.indexOf('grant execute on function public.chefos_tiene_rol'))))
    for (const file of ['013_historial_pos.sql','014_analitica_historial.sql']) await db.exec(fs.readFileSync('supabase/migrations/'+file,'utf8'))
    const r1='00000000-0000-0000-0000-000000000001', r2='00000000-0000-0000-0000-000000000002', u1='00000000-0000-0000-0000-000000000011', u2='00000000-0000-0000-0000-000000000012'
    await db.exec(`insert into restaurantes(id,nombre,slug) values('${r1}','Sintético Uno','sintetico-uno'),('${r2}','Sintético Dos','sintetico-dos'); insert into auth.users values('${u1}'),('${u2}'); insert into usuarios(id,restaurante_id,nombre,email,rol) values('${u1}','${r1}','QA uno','qa1@example.invalid','chef_ejecutivo'),('${u2}','${r2}','QA dos','qa2@example.invalid','chef_ejecutivo'); set role authenticated; select set_config('request.jwt.claim.sub','${u1}',false);`)
    const rpc = async (name, args) => (await db.query(`select public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) as v`,args)).rows[0].v
    const start = () => rpc('iniciar_historial_pos',['soft_restaurant_8_1','America/Santiago'])
    const stage = async (id, datos=canon) => { for (const [tipo, filas] of Object.entries(datos)) await rpc('preparar_historial_bloque',[id,tipo,0,JSON.stringify(filas)]) }
    const manifest = Object.fromEntries(Object.entries(canon).map(([k,v])=>[k,v.length]))
    const validar = id => rpc('validar_historial_pos',[id,JSON.stringify(manifest)])
    const id = await start(); await stage(id); await stage(id)
    let preview = await validar(id); assert.equal(preview.errores,0); assert.equal(preview.productos_sin_catalogo,1)
    const resultado = await rpc('confirmar_historial_pos',[id]); assert.equal(resultado.lineas_nuevas,2); assert.equal(resultado.pagos_nuevos,3)
    assert.equal((await rpc('confirmar_historial_pos',[id])).lineas_nuevas,2,'confirmación reintentada devuelve resultado original')
    const id2 = await start(); await stage(id2); await validar(id2)
    assert.equal((await rpc('confirmar_historial_pos',[id2])).lineas_nuevas,0,'reimportación idempotente')
    const metricas = await rpc('metricas_historial',[r1,'2026-09-01','2026-09-30'])
    assert.equal(metricas.tickets,2); assert.equal(metricas.facturacion,25); assert.equal(metricas.cubiertos,3)
    assert.equal(metricas.ticket_promedio,12.5, 'usa cabecera oficial y no suma de líneas')
    assert.equal(metricas.pagos.length,2)
    assert.equal(Number(await rpc('total_ventas_periodo',[r1,'2026-09-01','2026-09-30'])),25)
    const ctx = await rpc('contexto_ventas_briefing',[r1,'2026-09-18']); assert.equal(ctx.dias_comparables,1)
    const pos = (await db.query('select id from productos_pos order by id limit 1')).rows[0].id
    await rpc('mapear_producto_pos',[pos,'ignorado',null,null])
    await db.exec('reset role')
    const receta = (await db.query('insert into recetas(restaurante_id,nombre) values($1,$2) returning id',[r1,'Receta prueba'])).rows[0].id
    const recetaAjena = (await db.query('insert into recetas(restaurante_id,nombre) values($1,$2) returning id',[r2,'Receta ajena'])).rows[0].id
    await db.exec('set role authenticated')
    await rpc('mapear_producto_pos',[pos,'confirmado',receta,null])
    await assert.rejects(()=>rpc('mapear_producto_pos',[pos,'confirmado',recetaAjena,null]))
    assert.equal((await db.query('select receta_id from productos_pos_mapeos where pos_id=$1',[pos])).rows[0].receta_id,receta)
    const duplicado = await start()
    await stage(duplicado,{...canon,ventas_detalle:[...canon.ventas_detalle,canon.ventas_detalle[0]]})
    const prevDuplicado = await rpc('validar_historial_pos',[duplicado,JSON.stringify({...manifest,ventas_detalle:3})])
    assert.equal(prevDuplicado.duplicados_archivo,1); assert.equal(prevDuplicado.errores,0)
    assert.equal((await rpc('confirmar_historial_pos',[duplicado])).lineas_nuevas,0)
    const malformado = await start()
    await assert.rejects(()=>rpc('preparar_historial_bloque',[malformado,'ventas_detalle',0,JSON.stringify([{...canon.ventas_detalle[0],cantidad:-2}])]))
    const invalida = await start(); await stage(invalida,{...canon,ventas_detalle:[{...canon.ventas_detalle[0],ticket:'H-ausente'},canon.ventas_detalle[1]]})
    assert.ok((await validar(invalida)).errores>0); await assert.rejects(()=>rpc('confirmar_historial_pos',[invalida]))
    const conflicto = await start(); await stage(conflicto,{...canon,tickets:[{...canon.tickets[0],total:999},canon.tickets[1]]})
    assert.ok((await validar(conflicto)).errores>0)
    const rollback = await start()
    const roto={productos:canon.productos,tickets:[{...canon.tickets[0],clave:'H-ROLLBACK',ticket:'H-ROLLBACK'}],ventas_detalle:[{...canon.ventas_detalle[0],clave:'LINEA-ROLLBACK',ticket:'H-ROLLBACK',cantidad:1e12}],pagos:[{...canon.pagos[0],clave:'PAGO-ROLLBACK',ticket:'H-ROLLBACK'}]}
    await stage(rollback,roto)
    await rpc('validar_historial_pos',[rollback,JSON.stringify(Object.fromEntries(Object.entries(roto).map(([k,v])=>[k,v.length])))])
    await assert.rejects(()=>rpc('confirmar_historial_pos',[rollback]))
    assert.equal((await db.query("select id from ventas_tickets where id_externo='H-ROLLBACK'")).rows.length,0,'rollback de cabecera insertada antes del fallo de línea')
    const parcial = await start(); await rpc('preparar_historial_bloque',[parcial,'tickets',0,JSON.stringify(canon.tickets)])
    await assert.rejects(()=>validar(parcial))
    await db.exec(`select set_config('request.jwt.claim.sub','${u2}',false)`)
    assert.equal((await db.query('select * from ventas_tickets')).rows.length,0,'RLS entre restaurantes')
    await assert.rejects(()=>rpc('confirmar_historial_pos',[id]))
    await assert.rejects(()=>rpc('metricas_historial',[r1,'2026-09-01','2026-09-30']))
    await assert.rejects(()=>rpc('mapear_producto_pos',[pos,'ignorado',null,null]))
    await db.exec('reset role')
    await assert.rejects(()=>db.query("update ventas_importaciones set descuento_inventario_aplicado=true where id=$1",[id]))
    await assert.rejects(()=>db.query("update ventas_importaciones set modo='operativo' where id=$1",[id]))
    await db.exec('set role anon')
    await assert.rejects(()=>rpc('iniciar_historial_pos',['soft_restaurant_8_1','America/Santiago']))
    await db.exec('reset role')
    assert.equal(Number((await db.query('select count(*) n from inventario_movimientos')).rows[0].n),0)
    // Simular incluso una política heredada permisiva: el trigger sigue protegiendo
    // la identidad, los totales y el estado del historial frente a REST directo.
    await db.exec(`grant select,update,delete,insert on ventas_items,ventas_importaciones to authenticated;
      create policy prueba_escritura_items on ventas_items for all to authenticated using(true) with check(true);
      create policy prueba_escritura_importaciones on ventas_importaciones for all to authenticated using(true) with check(true);
      set role authenticated; select set_config('request.jwt.claim.sub','${u1}',false)`)
    await assert.rejects(()=>db.query('update ventas_items set total=1 where importacion_id=$1',[id]),/RPC autorizados/)
    await assert.rejects(()=>db.query('delete from ventas_items where importacion_id=$1',[id]),/RPC autorizados/)
    await assert.rejects(()=>db.query("update ventas_importaciones set estado_procesamiento='preparando' where id=$1",[id]),/RPC autorizados/)
    await db.exec('reset role; drop policy prueba_escritura_items on ventas_items; drop policy prueba_escritura_importaciones on ventas_importaciones')
    if (process.argv.includes('--scale')) {
      const inicio = Date.now()
      const ticketsEscala = Number(process.env.CHEFOS_TEST_TICKETS || 5000)
      console.log(`Escala: preparando ${ticketsEscala * 10} líneas sintéticas.`)
      await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${u1}',false)`)
      const grande = await start(), dataset = { productos:canon.productos,tickets:[],ventas_detalle:[],pagos:[] }
      for(let t=0;t<ticketsEscala;t++) {
        const ticket='H-SCALE-'+t
        dataset.tickets.push({...canon.tickets[0],clave:ticket,ticket,total:180})
        dataset.pagos.push({...canon.pagos[0],clave:JSON.stringify([ticket,'EF',180,0,1,1]),ticket,total:180})
        for(let l=0;l<10;l++) dataset.ventas_detalle.push({...canon.ventas_detalle[0],clave:JSON.stringify([ticket,l]),ticket})
      }
      for(const [tipo,filas] of Object.entries(dataset)) {
        for(let n=0;n<filas.length;n+=250) await rpc('preparar_historial_bloque',[grande,tipo,n,JSON.stringify(filas.slice(n,n+250))])
        console.log(`Escala: ${tipo} preparados (${filas.length}); ${((Date.now()-inicio)/1000).toFixed(1)} s.`)
      }
      const validacionInicio = Date.now()
      await rpc('validar_historial_pos',[grande,JSON.stringify(Object.fromEntries(Object.entries(dataset).map(([k,v])=>[k,v.length])))])
      console.log(`Escala: validación ${(Date.now()-validacionInicio)/1000} s.`)
      const confirmacionInicio = Date.now()
      const publicado=await rpc('confirmar_historial_pos',[grande])
      assert.equal(publicado.lineas_nuevas,ticketsEscala*10); assert.equal(publicado.tickets_nuevos,ticketsEscala)
      console.log(`PASS escala sintética: ${ticketsEscala*10} líneas, ${ticketsEscala} tickets y pagos en ${((Date.now()-inicio)/1000).toFixed(1)} s; confirmación ${(Date.now()-confirmacionInicio)/1000} s (PostgreSQL local, no Vercel).`)
    }
    console.log('PASS migraciones 013/014 PostgreSQL: relaciones, pagos múltiples, idempotencia, conflictos, parciales, métricas oficiales, RLS/RPC multi-tenant, mapeo y cero movimientos.')
  } finally { await db.close() }
}
main().catch(e=>{console.error(e);process.exitCode=1})
