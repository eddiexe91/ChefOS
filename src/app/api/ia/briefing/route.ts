import { NextResponse } from 'next/server'
import { crearClienteServidor } from '@/lib/supabase/servidor'

type ProductoBriefing = {
  id: string
  nombre: string
  cantidad_gramos: number | null
  stock_minimo_gramos: number | null
  unidad_display: string | null
  activo: boolean
}

type IngredienteCarta = {
  cantidad_gramos: number | null
  unidad_medida: string
  producto: ProductoBriefing | ProductoBriefing[] | null
}

type RecetaCarta = {
  id: string
  nombre: string
  rendimiento_porciones: number | null
  ingredientes: IngredienteCarta[] | null
}

function productoDeIngrediente(ingrediente: IngredienteCarta): ProductoBriefing | null {
  return Array.isArray(ingrediente.producto) ? ingrediente.producto[0] ?? null : ingrediente.producto
}

export async function POST() {
  const supabase = crearClienteServidor()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
  const { data: perfil } = await supabase.from('usuarios').select('id,restaurante_id').eq('id', user.id).eq('activo', true).single()
  if (!perfil) return NextResponse.json({ error: 'Perfil no encontrado.' }, { status: 403 })
  const fecha = new Date().toISOString().slice(0, 10)
  const [{ data: stock }, { data: alertas }, { data: produccion }, { data: carta }] = await Promise.all([
    supabase.from('productos').select('id,nombre,cantidad_gramos,stock_minimo_gramos,unidad_display,activo').eq('restaurante_id', perfil.restaurante_id).eq('activo', true).limit(100),
    supabase.from('alertas_sistema').select('tipo,severidad,mensaje').eq('restaurante_id', perfil.restaurante_id).eq('leida', false).limit(20),
    supabase.from('produccion_lotes').select('id,turno,estado').eq('restaurante_id', perfil.restaurante_id).eq('fecha', fecha).eq('estado', 'en_progreso'),
    supabase.from('recetas').select('id,nombre,rendimiento_porciones,ingredientes:recetas_ingredientes(cantidad_gramos,unidad_medida,producto:productos(id,nombre,cantidad_gramos,stock_minimo_gramos,unidad_display,activo))').eq('restaurante_id', perfil.restaurante_id).eq('activa', true).eq('en_carta', true).limit(100),
  ])
  const productos = (stock ?? []) as ProductoBriefing[]
  const recetasCarta = (carta ?? []) as RecetaCarta[]
  const bajos = productos.filter((item) => Number(item.cantidad_gramos) <= Number(item.stock_minimo_gramos))
  const comprasPorProducto = new Map<string, { producto: string; cantidad_sugerida: number; unidad: string; urgencia: 'critica' | 'alta' | 'media' | 'baja'; razon: string }>()
  bajos.forEach((item) => comprasPorProducto.set(item.id, { producto: item.nombre, cantidad_sugerida: Number(item.stock_minimo_gramos ?? 0), unidad: item.unidad_display ?? 'g', urgencia: 'alta', razon: 'stock bajo' }))

  const produccionCarta = recetasCarta.map((receta) => {
    const ingredientes = (receta.ingredientes ?? []).filter((item) => productoDeIngrediente(item)?.activo !== false && productoDeIngrediente(item))
    const faltantes = ingredientes.filter((item) => {
      const porciones = Math.max(Number(receta.rendimiento_porciones ?? 1), 1)
      return Number(productoDeIngrediente(item)?.cantidad_gramos ?? 0) < Number(item.cantidad_gramos ?? 0) / porciones
    })
    const nombresFaltantes = faltantes.map((item) => productoDeIngrediente(item)?.nombre).filter(Boolean).join(', ')
    const nombresDisponibles = ingredientes.filter((item) => !faltantes.includes(item)).map((item) => productoDeIngrediente(item)?.nombre).filter(Boolean).join(', ')
    faltantes.forEach((item) => {
      const producto = productoDeIngrediente(item)!
      const porciones = Math.max(Number(receta.rendimiento_porciones ?? 1), 1)
      const faltanGramos = Math.max(Number(item.cantidad_gramos ?? 0) / porciones - Number(producto.cantidad_gramos ?? 0), 0)
      const actual = comprasPorProducto.get(producto.id)
      comprasPorProducto.set(producto.id, { producto: producto.nombre, cantidad_sugerida: Math.max(actual?.cantidad_sugerida ?? 0, faltanGramos), unidad: producto.unidad_display ?? 'g', urgencia: 'critica', razon: `Falta para preparar ${receta.nombre}` })
    })
    return { nombre: `Preparar ${receta.nombre}`, cantidad: 1, unidad: 'plato', prioridad: faltantes.length > 0 ? 'alta' : 'media', razon: faltantes.length > 0 ? `Revisar ${nombresFaltantes}` : `Tienes ${nombresDisponibles || 'los ingredientes'} suficientes para este plato` }
  })
  const produccionLotes = (produccion ?? []).map((item) => ({ nombre: `Lote ${item.turno}`, cantidad: 1, unidad: 'lote', prioridad: 'media', razon: 'lote abierto del turno' }))
  const briefing = { restaurante_id: perfil.restaurante_id, fecha, turno: new Date().getHours() < 14 ? 'mañana' : new Date().getHours() < 19 ? 'tarde' : 'noche', confianza_estimacion: 'media', produccion_sugerida: [...produccionCarta, ...produccionLotes], compras_sugeridas: Array.from(comprasPorProducto.values()), riesgos: (alertas ?? []).map((item) => ({ tipo: item.tipo, descripcion: item.mensaje, severidad: item.severidad, accion_sugerida: 'Revisar antes del servicio' })), alertas: alertas ?? [], actividad_reciente: [], contexto_usado: { generado_por: 'api/ia/briefing', stock_bajo: bajos.length, platos_en_carta: recetasCarta.length, analisis_carta: true } }
  const { data, error } = await supabase.from('briefings').upsert(briefing, { onConflict: 'restaurante_id,fecha,turno' }).select().single()
  if (error) return NextResponse.json({ error: 'No se pudo guardar el briefing.' }, { status: 500 })
  return NextResponse.json({ data })
}
