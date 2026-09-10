import { NextResponse } from 'next/server'
import { crearClienteServidor } from '@/lib/supabase/servidor'
import { convertirAGramos, type UnidadEntrada } from '@/types'

function parseCsv(texto: string) {
  const filas: string[][] = []
  let fila: string[] = []
  let celda = ''
  let entreComillas = false
  for (let i = 0; i < texto.length; i += 1) {
    const caracter = texto[i]
    const siguiente = texto[i + 1]
    if (caracter === '"' && entreComillas && siguiente === '"') { celda += '"'; i += 1; continue }
    if (caracter === '"') { entreComillas = !entreComillas; continue }
    if (caracter === ',' && !entreComillas) { fila.push(celda.trim()); celda = ''; continue }
    if ((caracter === '\n' || caracter === '\r') && !entreComillas) {
      if (caracter === '\r' && siguiente === '\n') i += 1
      fila.push(celda.trim()); celda = ''
      if (fila.some(Boolean)) filas.push(fila)
      fila = []
      continue
    }
    celda += caracter
  }
  if (celda || fila.length) { fila.push(celda.trim()); if (fila.some(Boolean)) filas.push(fila) }
  return filas
}

export async function POST(request: Request) {
  const supabase = crearClienteServidor()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
  const { data: perfil } = await supabase.from('usuarios').select('id,restaurante_id,rol').eq('id', user.id).eq('activo', true).single()
  if (!perfil || !['dueño', 'administrador', 'chef_ejecutivo'].includes(perfil.rol)) return NextResponse.json({ error: 'Sin permisos para configurar el restaurante.' }, { status: 403 })
  const form = await request.formData()
  const archivo = form.get('archivo')
  const tipo = String(form.get('tipo') ?? '')
  if (!(archivo instanceof File) || !['productos', 'recetas'].includes(tipo)) return NextResponse.json({ error: 'Archivo o tipo de importación inválido.' }, { status: 400 })
  const filas = parseCsv(await archivo.text())
  if (filas.length < 2) return NextResponse.json({ error: 'El CSV no contiene registros.' }, { status: 400 })
  const headers = filas[0].map((header) => header.toLowerCase())
  const nombreIndex = headers.findIndex((header) => ['nombre', 'name', 'producto', 'receta'].includes(header))
  if (nombreIndex < 0) return NextResponse.json({ error: 'El CSV debe tener una columna nombre.' }, { status: 400 })
  const nombres = filas.slice(1).map((fila) => fila[nombreIndex]).filter(Boolean)
  if (tipo === 'recetas') {
    const registros = nombres.map((nombre) => ({ restaurante_id: perfil.restaurante_id, nombre, rendimiento_porciones: 1, unidad_rendimiento: 'porción', activa: true, creado_por: perfil.id }))
    const { error } = await supabase.from('recetas').insert(registros)
    if (error) return NextResponse.json({ error: 'No se pudieron importar las recetas.' }, { status: 500 })
    return NextResponse.json({ importados: registros.length, tipo })
  }
  const unidadIndex = headers.findIndex((header) => ['unidad', 'unidad_medida', 'unit'].includes(header))
  const costoIndex = headers.findIndex((header) => ['costo', 'costo_unitario', 'cost'].includes(header))
  const stockIndex = headers.findIndex((header) => ['stock', 'cantidad', 'cantidad_actual'].includes(header))
  const minimoIndex = headers.findIndex((header) => ['stock_minimo', 'mínimo', 'minimo'].includes(header))
  const densidadIndex = headers.findIndex((header) => ['densidad', 'densidad_g_por_ml'].includes(header))
  const pesoIndex = headers.findIndex((header) => ['peso_unitario', 'peso_unitario_gramos'].includes(header))
  const registros: Array<Record<string, unknown>> = []
  for (const fila of filas.slice(1).filter((fila) => fila[nombreIndex])) {
    const unidad = (unidadIndex >= 0 ? fila[unidadIndex] || 'g' : 'g').toLowerCase() as UnidadEntrada
    const densidad = densidadIndex >= 0 ? Number(String(fila[densidadIndex]).replace(',', '.')) : undefined
    const peso = pesoIndex >= 0 ? Number(String(fila[pesoIndex]).replace(',', '.')) : undefined
    const stock = stockIndex >= 0 ? Number(String(fila[stockIndex] ?? 0).replace(',', '.')) : 0
    const minimo = minimoIndex >= 0 ? Number(String(fila[minimoIndex] ?? 0).replace(',', '.')) : 0
    const stockEnGramos = convertirAGramos(Number.isFinite(stock) ? stock : 0, unidad, Number.isFinite(densidad) ? densidad : undefined, Number.isFinite(peso) ? peso : undefined)
    const minimoEnGramos = convertirAGramos(Number.isFinite(minimo) ? minimo : 0, unidad, Number.isFinite(densidad) ? densidad : undefined, Number.isFinite(peso) ? peso : undefined)
    if (stockEnGramos.gramos === null || minimoEnGramos.gramos === null) return NextResponse.json({ error: `El producto "${fila[nombreIndex]}" necesita peso unitario para convertirse a gramos.` }, { status: 400 })
    registros.push({ restaurante_id: perfil.restaurante_id, nombre: fila[nombreIndex], nombre_normalizado: fila[nombreIndex].toLowerCase(), unidad_medida: unidad, unidad_compra: unidad, unidad_display: unidad, densidad_g_por_ml: Number.isFinite(densidad) ? densidad : null, peso_unitario_gramos: Number.isFinite(peso) ? peso : null, costo_unitario_actual: costoIndex >= 0 ? Number(String(fila[costoIndex] ?? 0).replace(',', '.')) || 0 : 0, stock_actual: Number.isFinite(stock) ? stock : 0, stock_minimo: Number.isFinite(minimo) ? minimo : 0, cantidad_gramos: stockEnGramos.gramos, stock_minimo_gramos: minimoEnGramos.gramos, activo: true })
  }
  const { error } = await supabase.from('productos').insert(registros)
  if (error) return NextResponse.json({ error: 'No se pudo importar el inventario.' }, { status: 500 })
  return NextResponse.json({ importados: registros.length, tipo })
}
