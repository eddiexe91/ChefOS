import { NextResponse } from 'next/server'
import { crearClienteServidor } from '@/lib/supabase/servidor'
import { ARCHIVOS_POS, normalizarSoftRestaurant, validarCabecera, type ArchivoPOS, type FilaCSV } from '@/lib/ventas/softRestaurant'

export const dynamic = 'force-dynamic'
export const maxDuration = 60
export async function POST(request: Request) {
  const db = crearClienteServidor()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Inicia sesión.' }, { status: 401 })
  try {
    const texto = await request.text()
    if (texto.length > 1500000) throw new Error('Bloque demasiado grande.')
    const b = JSON.parse(texto)
    let resultado
    switch (b.accion) {
      case 'iniciar': {
        const { data: perfil } = await db.from('usuarios').select('restaurante_id').eq('id', user.id).eq('activo', true).single()
        const { data: restaurante } = await db.from('restaurantes').select('zona_horaria').eq('id', perfil?.restaurante_id).single()
        resultado = await db.rpc('iniciar_historial_pos', { p_fuente: 'soft_restaurant_8_1', p_zona: restaurante?.zona_horaria ?? 'America/Santiago' })
        break
      }
      case 'bloque': {
        if (!ARCHIVOS_POS.includes(b.tipo) || !Array.isArray(b.filas) || !b.filas.length || b.filas.length > 250 || !Number.isInteger(b.inicio) || b.inicio < 0) throw new Error('Bloque inválido.')
        const tipo = b.tipo as ArchivoPOS
        const filas = b.filas.map((r: { campos: FilaCSV; ocurrencia: number }, n: number) => {
          if (!r.campos || Object.values(r.campos).some(v => typeof v !== 'string')) throw new Error('Campos inválidos.')
          validarCabecera(tipo, Object.keys(r.campos))
          if (!Number.isInteger(r.ocurrencia) || r.ocurrencia < 1) throw new Error('Ocurrencia inválida.')
          try { return normalizarSoftRestaurant(tipo, r.campos, r.ocurrencia) }
          catch (e) { throw new Error(`${tipo}, registro ${b.inicio + n + 1}: ${e instanceof Error ? e.message : 'inválido'}`) }
        })
        resultado = await db.rpc('preparar_historial_bloque', { p_id: b.id, p_tipo: tipo, p_inicio: b.inicio, p_filas: filas })
        break
      }
      case 'validar': resultado = await db.rpc('validar_historial_pos', { p_id: b.id, p_manifiesto: b.manifiesto }); break
      case 'confirmar': resultado = await db.rpc('confirmar_historial_pos', { p_id: b.id }); break
      case 'mapear': resultado = await db.rpc('mapear_producto_pos', { p_pos: b.pos, p_estado: b.estado, p_receta: b.receta || null, p_producto: b.producto || null }); break
      default: throw new Error('Acción inválida.')
    }
    if (resultado.error) return NextResponse.json({ error: resultado.error.message }, { status: 400 })
    return NextResponse.json({ data: resultado.data }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : 'No se pudo procesar.' }, { status: 400 }) }
}

export async function GET(request: Request) {
  const db = crearClienteServidor()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Inicia sesión.' }, { status: 401 })
  const { data: perfil } = await db.from('usuarios').select('restaurante_id').eq('id', user.id).eq('activo', true).single()
  if (!perfil) return NextResponse.json({ error: 'Perfil no disponible.' }, { status: 403 })
  const u = new URL(request.url)
  const pagina = Math.max(0, Number(u.searchParams.get('pagina')) || 0)
  const { data, error } = await db.from('productos_pos').select('id,nombre,id_externo,fuente,categoria,productos_pos_mapeos(estado,receta_id,producto_id)').eq('restaurante_id', perfil.restaurante_id).order('id').range(pagina * 100, pagina * 100 + 99)
  return NextResponse.json(error ? { error: error.message } : { data: (data ?? []).map(p => ({ ...p, productos_pos_mapeos: Array.isArray(p.productos_pos_mapeos) ? p.productos_pos_mapeos : p.productos_pos_mapeos ? [p.productos_pos_mapeos] : [] })) })
}
