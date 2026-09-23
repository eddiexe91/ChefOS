import { NextResponse } from 'next/server'
import { crearClienteServidor } from '@/lib/supabase/servidor'
import { fechaPOS } from '@/lib/ventas/softRestaurant'
export const dynamic = 'force-dynamic'
export async function GET(request: Request) {
  const db = crearClienteServidor()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Inicia sesión.' }, { status: 401 })
  const { data: p } = await db.from('usuarios').select('restaurante_id').eq('id', user.id).eq('activo', true).single()
  if (!p) return NextResponse.json({ error: 'Perfil no disponible.' }, { status: 403 })
  try {
    const u = new URL(request.url), desde = fechaPOS(u.searchParams.get('desde') ?? ''), hasta = fechaPOS(u.searchParams.get('hasta') ?? '')
    const duracion = (Date.parse(hasta) - Date.parse(desde)) / 86400000 + 1
    if (duracion < 1 || duracion > 1101) throw new Error('Rango inválido.')
    const anteriorHasta = new Date(Date.parse(desde) - 86400000).toISOString().slice(0, 10)
    const anteriorDesde = new Date(Date.parse(desde) - duracion * 86400000).toISOString().slice(0, 10)
    const [actual, anterior] = await Promise.all([
      db.rpc('metricas_historial', { p_restaurante: p.restaurante_id, p_desde: desde, p_hasta: hasta }),
      db.rpc('metricas_historial', { p_restaurante: p.restaurante_id, p_desde: anteriorDesde, p_hasta: anteriorHasta }),
    ])
    if (actual.error || anterior.error) throw new Error('No se pudo consultar la analítica. Verifica las migraciones de historial.')
    return NextResponse.json({ data: { actual: actual.data, anterior: anterior.data } })
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : 'Error de consulta.' }, { status: 400 }) }
}
