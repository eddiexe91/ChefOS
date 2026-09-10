import { NextResponse, type NextRequest } from 'next/server'
import { crearClienteServidor } from '@/lib/supabase/servidor'

function errorJSON(error: string, status: number) { return NextResponse.json({ data: null, error }, { status }) }

async function perfilActual() {
  const supabase = crearClienteServidor()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, perfil: null }
  const { data: perfil } = await supabase.from('usuarios').select('id, restaurante_id, activo, rol').eq('id', user.id).eq('activo', true).single()
  return { supabase, perfil }
}

function csv(texto: string) {
  return texto.split(/\r?\n/).filter(Boolean).map((linea) => linea.split(',').map((celda) => celda.trim().replace(/^"|"$/g, '')))
}

export async function GET() {
  const { supabase, perfil } = await perfilActual()
  if (!perfil) return errorJSON('No autenticado.', 401)
  const { data, error } = await supabase.from('ventas_importaciones').select('*').eq('restaurante_id', perfil.restaurante_id).order('id', { ascending: false })
  if (error) return errorJSON('No se pudieron cargar las importaciones.', 500)
  return NextResponse.json({ data: data ?? [], error: null })
}

export async function POST(request: NextRequest) {
  const { supabase, perfil } = await perfilActual()
  if (!perfil) return errorJSON('No autenticado.', 401)
  if (!['dueño', 'administrador'].includes(perfil.rol)) return errorJSON('Sin permisos para importar ventas.', 403)
  const form = await request.formData()
  const archivo = form.get('archivo')
  if (!(archivo instanceof File)) return errorJSON('Debes adjuntar un archivo CSV.', 400)
  const filas = csv(await archivo.text())
  if (filas.length < 2) return errorJSON('El CSV no contiene registros.', 400)
  const encabezados = filas[0].map((h) => h.toLowerCase())
  const indiceNombre = encabezados.findIndex((h) => ['nombre', 'plato', 'producto', 'name'].includes(h))
  const indiceCantidad = encabezados.findIndex((h) => ['cantidad', 'cantidad_vendida', 'qty'].includes(h))
  const indicePrecio = encabezados.findIndex((h) => ['precio', 'precio_unitario', 'price'].includes(h))
  if (indiceNombre < 0 || indiceCantidad < 0) return errorJSON('El CSV debe incluir columnas nombre y cantidad.', 400)
  const fecha = typeof form.get('fecha') === 'string' && form.get('fecha') ? String(form.get('fecha')) : new Date().toISOString().slice(0, 10)
  const { data: importacion, error: importError } = await supabase.from('ventas_importaciones').insert({ restaurante_id: perfil.restaurante_id, fecha_inicio: fecha, fecha_fin: fecha, origen_sistema: 'csv', estado_procesamiento: 'procesando', total_registros: filas.length - 1, procesado_por: perfil.id }).select().single()
  if (importError || !importacion) return errorJSON('No se pudo iniciar la importación.', 500)
  const nombreSeguro = archivo.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const rutaStorage = `${perfil.restaurante_id}/${importacion.id}/${nombreSeguro}`
  const { error: storageError } = await supabase.storage.from('importaciones').upload(rutaStorage, await archivo.arrayBuffer(), { contentType: archivo.type || 'text/csv', upsert: false })
  if (storageError) {
    await supabase.from('ventas_importaciones').update({ estado_procesamiento: 'error' }).eq('id', importacion.id)
    return errorJSON('La importación se creó, pero no se pudo guardar el archivo en Storage.', 502)
  }
  await supabase.from('ventas_importaciones').update({ archivo_url: rutaStorage }).eq('id', importacion.id)
  const { data: recetas } = await supabase.from('recetas').select('id, nombre').eq('restaurante_id', perfil.restaurante_id).eq('activa', true)
  const normalizar = (valor: string) => valor.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
  const similitud = (a: string, b: string) => {
    if (a === b) return 1
    if (!a || !b) return 0
    const tokensA = new Set(a.split(' ')); const tokensB = new Set(b.split(' '))
    const interseccion = [...tokensA].filter((token) => tokensB.has(token)).length
    const jaccard = interseccion / new Set([...tokensA, ...tokensB]).size
    const prefijo = a.startsWith(b) || b.startsWith(a) ? 0.15 : 0
    return Math.min(0.99, jaccard + prefijo)
  }
  const candidatos = (recetas ?? []).map((receta) => ({ ...receta, normalizado: normalizar(receta.nombre) }))
  const encontrarReceta = (nombre: string) => {
    const entrada = normalizar(nombre)
    return candidatos.reduce<{ receta: (typeof candidatos)[number] | null; confianza: number }>((mejor, candidato) => {
      const confianza = similitud(entrada, candidato.normalizado)
      return confianza > mejor.confianza ? { receta: candidato, confianza } : mejor
    }, { receta: null, confianza: 0 })
  }
  const items = filas.slice(1).map((fila) => { const nombre = fila[indiceNombre]; const match = encontrarReceta(nombre); const receta = match.confianza >= 0.85 ? match.receta : null; const cantidad = Number(String(fila[indiceCantidad]).replace(',', '.')); const precio = indicePrecio >= 0 ? Number(String(fila[indicePrecio] ?? 0).replace(',', '.')) : 0; return { restaurante_id: perfil.restaurante_id, importacion_id: importacion.id, nombre_original: nombre, nombre_normalizado: receta?.nombre ?? match.receta?.nombre ?? null, confianza_match: match.receta ? Number(match.confianza.toFixed(2)) : 0, requiere_revision: !receta, receta_id: receta?.id ?? null, cantidad_vendida: Number.isFinite(cantidad) ? cantidad : 0, precio_unitario: Number.isFinite(precio) ? precio : 0, total: (Number.isFinite(cantidad) ? cantidad : 0) * (Number.isFinite(precio) ? precio : 0), fecha_venta: fecha } })
  const { error: itemsError } = await supabase.from('ventas_items').insert(items)
  if (itemsError) return errorJSON('No se pudieron guardar los registros importados.', 500)
  const pendientes = items.filter((item) => item.requiere_revision).length
  const { data } = await supabase.from('ventas_importaciones').update({ estado_procesamiento: pendientes > 0 ? 'revision' : 'completado', registros_normalizados: items.length - pendientes, registros_pendientes: pendientes }).eq('id', importacion.id).select().single()
  return NextResponse.json({ data, error: null }, { status: 201 })
}
