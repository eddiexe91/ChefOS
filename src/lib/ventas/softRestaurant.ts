import { leerCsvVentas } from '../csvVentas'

export const ARCHIVOS_POS = ['productos', 'tickets', 'ventas_detalle', 'pagos'] as const
export type ArchivoPOS = typeof ARCHIVOS_POS[number]
export type FilaCSV = Record<string, string>
export interface FilaCanonica {
  clave: string
  ticket?: string
  producto?: string
  nombre?: string
  fecha?: string
  hora?: string | null
  franja?: string | null
  cantidad?: number
  precio?: number
  total?: number
  categoria?: string | null
  datos: Record<string, string | number | boolean | null>
}
const requeridos: Record<ArchivoPOS, string[]> = {
  productos: ['producto_id', 'producto'],
  tickets: ['ticket_id', 'fecha', 'total_ticket'],
  ventas_detalle: ['ticket_id', 'movimiento', 'producto_id', 'producto', 'fecha', 'cantidad', 'precio_unitario', 'importe_linea_estimado'],
  pagos: ['ticket_id', 'forma_pago_id', 'importe'],
}
export function validarCabecera(tipo: ArchivoPOS, campos: string[]) {
  if (new Set(campos).size !== campos.length) throw new Error('Columnas duplicadas.')
  const faltantes = requeridos[tipo].filter(c => !campos.includes(c))
  if (faltantes.length) throw new Error(`${tipo}: faltan ${faltantes.join(', ')}.`)
}
export function numeroPOS(s: string | undefined, requerido = false): number | null {
  if (s == null || s.trim() === '') {
    if (requerido) throw new Error('Falta un valor numérico obligatorio.')
    return null
  }
  // No interpretar separadores de miles ambiguos silenciosamente.
  if (!/^-?\d+(?:[.,]\d+)?$/.test(s.trim())) throw new Error(`Número no válido: ${s}`)
  const n = Number(s.replace(',', '.'))
  if (!Number.isFinite(n) || Math.abs(n) > 999999999) throw new Error('Número fuera de rango.')
  return n
}
export function fechaPOS(s: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T].*)?$/.exec(s)
  const d = /^(\d{2})\/(\d{2})\/(\d{4})(?:[ T].*)?$/.exec(s)
  const iso = m ? `${m[1]}-${m[2]}-${m[3]}` : d ? `${d[3]}-${d[2]}-${d[1]}` : ''
  if (!iso || !Number.isFinite(Date.parse(iso)) || new Date(iso).toISOString().slice(0, 10) !== iso) throw new Error(`Fecha inválida: ${s}. Usa AAAA-MM-DD o DD/MM/AAAA.`)
  return iso
}
function horaPOS(s?: string): string | null {
  if (!s) return null
  const v = s.includes('T') || s.includes(' ') ? s.split(/[ T]/).pop()! : s
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?$/.exec(v)
  if (!m || +m[1] > 23 || +m[2] > 59 || +(m[3] ?? 0) > 59) throw new Error(`Hora inválida: ${s}`)
  return `${m[1].padStart(2, '0')}:${m[2]}:${m[3] ?? '00'}`
}
function bandera(s?: string): boolean | null {
  if (!s) return null
  if (/^(1|true|si|sí|s)$/i.test(s)) return true
  if (/^(0|false|no|n)$/i.test(s)) return false
  throw new Error(`Indicador inválido: ${s}`)
}
export function normalizarSoftRestaurant(tipo: ArchivoPOS, r: FilaCSV, ocurrencia = 1): FilaCanonica {
  for (const k of requeridos[tipo]) if (!r[k]?.trim()) throw new Error(`${tipo}: falta ${k}.`)
  if (Object.values(r).some(v => v.includes('\uFFFD') || v.includes('\0'))) throw new Error('Encoding inválido: selecciona UTF-8 o Windows-1252 según el archivo.')
  if (Object.values(r).some(v => v.length > 4000)) throw new Error('Celda demasiado larga (máximo 4000 caracteres).')
  if (r.estado && !/^(pagad[oa]|paid|cerrad[oa]|closed)$/i.test(r.estado)) throw new Error(`Estado ${r.estado}: requiere revisión antes de importar.`)
  const d: FilaCanonica['datos'] = {}
  const comunes: Record<string, string> = { origen: 'origen_externo', folio: 'folio', turno_id: 'turno_externo', mesa: 'mesa', mesero_id: 'empleado_externo', mesero: 'empleado_nombre', apertura: 'apertura_local', cierre: 'cierre_local', apertura_ticket: 'apertura_ticket_local', comanda: 'comanda_externa', comentario: 'comentario', tipo_servicio: 'tipo_servicio', area_id: 'area_externa', nombre_corto: 'nombre_corto', clasificacion: 'clasificacion', grupo_id: 'categoria_externa', cortesía_id: 'cortesia_externa', cortesia_id: 'cortesia_externa', tipo_descuento_id: 'tipo_descuento_externo', forma_pago_id: 'metodo_externo', forma_pago: 'metodo_nombre' }
  for (const [origen, destino] of Object.entries(comunes)) if (r[origen]) d[destino] = destino.endsWith('_local') ? `${fechaPOS(r[origen])}T${horaPOS(r[origen]) ?? '00:00:00'}` : r[origen]
  for (const [origen, destino] of Object.entries({ personas: 'personas', duracion_min: 'duracion_min', subtotal_ticket: 'subtotal', propina: 'propina', descuento_cabecera_pct: 'descuento_pct', total_descuentos: 'descuentos', total_cortesias: 'cortesias', reaperturas: 'reaperturas', importe_bruto_linea: 'importe_bruto', descuento_linea_pct: 'descuento_pct', iva_pct: 'impuesto_pct', tipo_cambio: 'tipo_cambio' })) {
    if (!(origen in r)) continue
    const n = numeroPOS(r[origen]); if (n !== null && (n < 0 || (destino.endsWith('_pct') && n > 100))) throw new Error(`${origen} fuera de rango.`)
    if (n !== null && ['personas', 'reaperturas'].includes(destino) && !Number.isInteger(n)) throw new Error(`${origen} debe ser entero.`)
    d[destino] = n
  }
  for (const k of ['cortesia', 'modificado', 'bloqueado']) if (k in r) d[k] = bandera(r[k])
  if (tipo === 'productos') return { clave: r.producto_id, producto: r.producto_id, nombre: r.producto, categoria: r.grupo || null, precio: numeroPOS(r.precio_catalogo) ?? undefined, datos: d }
  const base = { ticket: r.ticket_id, datos: d }
  if (tipo === 'pagos') {
    const total = numeroPOS(r.importe, true)!
    if (total < 0) throw new Error('Pago negativo: requiere conciliación manual.')
    // No hay ID de pago: contenido + multiplicidad preserva pagos idénticos legítimos.
    return { ...base, clave: JSON.stringify([r.ticket_id, r.forma_pago_id, total, d.propina ?? null, d.tipo_cambio ?? null, ocurrencia]), total }
  }
  const fecha = fechaPOS(r.fecha)
  const hora = horaPOS(tipo === 'ventas_detalle' ? r.hora_producto || r.hora : r.apertura || r.hora)
  const total = numeroPOS(tipo === 'tickets' ? r.total_ticket : r.importe_linea_estimado, true)!
  if (total < 0) throw new Error('Importe negativo: requiere revisión de devolución.')
  if (tipo === 'tickets') return { ...base, clave: r.ticket_id, fecha, hora, franja: r.franja || null, total }
  const cantidad = numeroPOS(r.cantidad, true)!, precio = numeroPOS(r.precio_unitario, true)!
  if (cantidad <= 0 || precio < 0) throw new Error('Cantidad no positiva o precio negativo: revisar movimiento.')
  return { ...base, clave: JSON.stringify([r.ticket_id, r.movimiento]), producto: r.producto_id, nombre: r.producto, categoria: r.grupo || null, fecha, hora, franja: r.franja || null, cantidad, precio, total }
}

/** Lectura acotada: conserva solamente un registro CSV y un bloque de bytes. */
export async function* filasArchivo(file: Blob, encoding = 'utf-8'): AsyncGenerator<FilaCSV> {
  const decoder = new TextDecoder(encoding, { fatal: true })
  let pendiente = '', comillas = false, cabecera: string[] | null = null
  const convertir = (linea: string) => {
    const filas = leerCsvVentas((cabecera ? cabecera.join(delimitador) + '\n' : '') + linea)
    if (!cabecera) {
      cabecera = filas[0]?.map(c => c.trim().toLowerCase())
      if (!cabecera || cabecera.some(c => !c) || new Set(cabecera).size !== cabecera.length) throw new Error('Cabecera vacía o con columnas duplicadas.')
      return null
    }
    const valores = filas[1]
    if (!valores) return null
    if (valores.length !== cabecera.length) throw new Error('Número de columnas incorrecto.')
    return Object.fromEntries(cabecera.map((c, i) => [c, valores[i]]))
  }
  let delimitador = ','
  // Retener última comilla hasta el siguiente bloque resuelve escapes divididos.
  for (let offset = 0; offset < file.size + 65536; offset += 65536) {
    const fin = offset >= file.size
    pendiente += fin ? decoder.decode() : decoder.decode(await file.slice(offset, offset + 65536).arrayBuffer(), { stream: true })
    let inicio = 0
    for (let i = 0; i < pendiente.length; i++) {
      const c = pendiente[i]
      if (c === '"') {
        if (i === pendiente.length - 1 && !fin) break
        if (comillas && pendiente[i + 1] === '"') { i++; continue }
        comillas = !comillas
      }
      if (c === '\n' && !comillas) {
        const linea = pendiente.slice(inicio, i).replace(/\r$/, '')
        inicio = i + 1
        if (!linea.trim()) continue
        if (!cabecera) delimitador = linea.includes(';') ? ';' : ','
        const r = convertir(linea); if (r) yield r
      }
    }
    pendiente = pendiente.slice(inicio)
    // Volver a escanear el registro incompleto desde su inicio en el bloque siguiente.
    comillas = false
    if (pendiente.length > 100000) throw new Error('Registro CSV demasiado largo.')
    if (fin && pendiente.trim()) { const r = convertir(pendiente); if (r) yield r }
  }
  if (!cabecera) throw new Error('Archivo vacío.')
}
