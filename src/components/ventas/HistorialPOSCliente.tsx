'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import ResumenHistorial from './ResumenHistorial'
import { ARCHIVOS_POS, filasArchivo, normalizarSoftRestaurant, validarCabecera, type ArchivoPOS, type FilaCSV } from '@/lib/ventas/softRestaurant'

async function enviar(body: object) {
  if (!navigator.onLine) throw new Error('Sin conexión. Recupera el mismo paquete al volver a conectarte.')
  const response = await fetch('/api/ventas/historial', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(65000) })
  const j = await response.json().catch(() => ({ error: 'El servidor no respondió a tiempo. Recupera este mismo paquete antes de repetir o confirmar.' }))
  if (!response.ok) throw new Error(j.error ?? 'No se pudo procesar. Reintenta sin cambiar los archivos.')
  return j.data
}
type AvancePublicacion = { fase: number; inicio: number }
type Preparacion = { id: string; creado_en: string; estado_procesamiento: string; manifiesto: Record<string, number> | null; resultado: Record<string, unknown> | null; validacion_parcial: { siguiente: number } | null; publicacion_parcial: AvancePublicacion | null }
const FASES_PUBLICACION = ['Preparar catálogo', 'Incorporar tickets', 'Incorporar líneas de venta', 'Incorporar pagos', 'Publicar resúmenes']
function describirAvance(avance: AvancePublicacion, registros: Record<string, number>) {
  const archivo = ['', 'tickets', 'ventas_detalle', 'pagos'][avance.fase]
  return `${FASES_PUBLICACION[avance.fase] ?? 'Finalizando'}${archivo ? `: ${avance.inicio.toLocaleString('es-CL')} de ${(registros[archivo] ?? 0).toLocaleString('es-CL')}` : ''}. Las ventas nuevas solo aparecerán al terminar el paquete. No se descuenta inventario.`
}
const ETAPAS = ['Verificar archivos completos', 'Buscar duplicados', 'Relacionar tickets y líneas', 'Revisar productos y equivalencias', 'Comprobar ventas existentes', 'Preparar resumen y pagos']
export default function HistorialPOSCliente() {
  const [archivos, setArchivos] = useState<Partial<Record<ArchivoPOS, File>>>({})
  const [encoding, setEncoding] = useState('utf-8')
  const [id, setId] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [estado, setEstado] = useState('')
  const [resumen, setResumen] = useState<Record<string, unknown> | null>(null)
  const [completado, setCompletado] = useState(false)
  const [preparaciones, setPreparaciones] = useState<Preparacion[]>([])
  const [manifiestoGuardado, setManifiestoGuardado] = useState<Record<string, number> | null>(null)
  const [siguiente, setSiguiente] = useState(0)
  const [recuperandoArchivos, setRecuperandoArchivos] = useState(false)
  const [publicacion, setPublicacion] = useState<AvancePublicacion | null>(null)
  async function cargarPreparaciones() {
    try { const r = await fetch('/api/ventas/historial?vista=preparaciones', { cache: 'no-store' }); const j = await r.json(); if (r.ok) setPreparaciones(j.data ?? []) } catch { /* El error de la operación activa se conserva. */ }
  }
  useEffect(() => { void cargarPreparaciones() }, [])
  async function validarEtapas(actual: string, manifiesto: Record<string, number>, comienzo = 0) {
    let resultado
    for (let paso = comienzo; paso < ETAPAS.length; paso++) {
      setEstado(`Validación ${paso + 1}/${ETAPAS.length}: ${ETAPAS[paso]}. No se han publicado ventas.`)
      resultado = await enviar({ accion: 'validar_paso', id: actual, manifiesto, paso })
      setSiguiente(resultado.siguiente)
    }
    if (resultado) setResumen(resultado.resumen)
    setEstado('Validación terminada. Revisa el resultado antes de confirmar.')
  }
  const [habilitado, setHabilitado] = useState(false)
  const [avisoEsquema, setAvisoEsquema] = useState('Comprobando disponibilidad del historial…')
  useEffect(() => { fetch('/api/health').then(r => r.json()).then(j => {
    const listo = j.historialPos?.disponible === true && j.historialPorEtapas?.disponible === true && j.historialPublicacionPorBloques?.disponible === true
    setHabilitado(listo)
    setAvisoEsquema(listo ? '' : 'La incorporación reanudable de 1.3.3 está pendiente de activar en Supabase. No importes todavía. Los paquetes preparados y tus existencias se conservan.')
  }).catch(() => setAvisoEsquema('No se pudo verificar el historial. Comprueba internet y vuelve a abrir esta pantalla.')) }, [])
  async function preparar() {
    if(!navigator.onLine){setEstado('Necesitas conexión para validar. Los archivos siguen seleccionados.');return}
    setOcupado(true); setEstado('Preparando archivos…'); setResumen(null)
    try {
      const actual = id ?? await enviar({ accion: 'iniciar' }); setId(actual)
      if (manifiestoGuardado) {
        await validarEtapas(actual, manifiestoGuardado, siguiente < 6 ? siguiente : 0)
        return
      }
      const manifiesto: Record<string, number> = {}
      for (const tipo of ARCHIVOS_POS) {
        const file = archivos[tipo]
        if (!file) throw new Error(`Selecciona ${tipo}.csv`)
        if (file.size > 100 * 1024 * 1024) throw new Error('Límite por archivo: 100 MB. Divide la exportación por períodos completos.')
        let inicio = 0, filas: { campos: FilaCSV; ocurrencia: number }[] = []
        const pagos = new Map<string, number>()
        for await (const campos of filasArchivo(file, encoding)) {
          validarCabecera(tipo, Object.keys(campos))
          const clave = normalizarSoftRestaurant(tipo, campos).clave
          const ocurrencia = tipo === 'pagos' ? (pagos.get(clave) ?? 0) + 1 : 1
          if (tipo === 'pagos') pagos.set(clave, ocurrencia)
          filas.push({ campos, ocurrencia })
          if (filas.length === 250) {
            await enviar({ accion: 'bloque', id: actual, tipo, inicio, filas }); inicio += filas.length; filas = []
            setEstado(`${tipo}: ${inicio.toLocaleString()} registros preparados. Todavía no son ventas publicadas.`)
          }
        }
        if (filas.length) await enviar({ accion: 'bloque', id: actual, tipo, inicio, filas })
        manifiesto[tipo] = inicio + filas.length
      }
      setManifiestoGuardado(manifiesto); setRecuperandoArchivos(false)
      await validarEtapas(actual, manifiesto)
    } catch (e) { setEstado(e instanceof Error ? e.message : 'Error al preparar.') }
    finally { setOcupado(false); void cargarPreparaciones() }
  }
  async function confirmar() {
    if (!id) return
    setOcupado(true); setEstado('Incorporando ventas y sus resúmenes. Si se interrumpe, recupera este paquete antes de repetir.')
    try {
      for (;;) {
        const paso = await enviar({ accion: 'confirmar_paso', id })
        if (paso.completado) {
          setResumen(paso.resultado); setCompletado(true); setPublicacion(null)
          setEstado('Historial importado. No se descontó inventario. Consulta las ventas y relaciona los platos útiles para tu cocina.')
          break
        }
        setPublicacion(paso.avance)
        setEstado(describirAvance(paso.avance, paso.registros))
      }
    }
    catch (e) { setEstado(`${e instanceof Error ? e.message : 'No se pudo completar.'} Recupera este mismo paquete y pulsa Continuar incorporación; no vuelvas a cargar los archivos.`) }
    finally { setOcupado(false); void cargarPreparaciones() }
  }
  return <section className="tarjeta p-4 space-y-4 text-texto-primario">
    <h2 className="text-lg font-bold">Historial de Soft Restaurant 8.1</h2>
    <p className="text-sm">El historial enseña a ChefOS qué platos se vendían y cuándo. No es una venta de hoy ni una orden de producir: para planificar necesita datos recientes, recetas relacionadas y existencias fiables.</p>
    <ol className="text-sm space-y-1 list-decimal pl-5"><li>Selecciona los 4 archivos, o recupera un paquete guardado.</li><li>Valida y revisa fechas, cantidades y advertencias.</li><li>Confirma una vez para incorporar las ventas, sin descontar stock.</li><li>Consulta las ventas y relaciona solo los platos útiles para tu operación.</li></ol>
    <p role="status" aria-live="polite" className="rounded border border-fondo-borde p-3 text-sm break-words">{estado || 'Listo para seleccionar archivos.'}</p>
    {avisoEsquema && <p role="alert" className="text-sm text-advertencia">{avisoEsquema}</p>}
    <p className="text-sm text-texto-secundario">Cuatro CSV del mismo período y restaurante. Solo análisis histórico: no modifica existencias. Las fechas se interpretan en la zona horaria del restaurante.</p>
    <p className="text-xs text-texto-secundario">Fechas admitidas: AAAA-MM-DD o DD/MM/AAAA. No se interpreta MM/DD/AAAA. Revisa las fechas de la vista previa.</p>
    {preparaciones.length > 0 && <section className="rounded-xl border border-fondo-borde p-3 space-y-2"><h3 className="font-medium">Paquetes ya preparados</h3><p className="text-xs text-texto-secundario">Recuperar no confirma ventas ni cambia existencias. Evita cargar otra copia del mismo período.</p>{preparaciones.map(p => <button key={p.id} disabled={ocupado} className="block w-full text-left min-h-12 rounded border border-fondo-borde p-2" onClick={() => {
      setId(p.id); setManifiestoGuardado(p.manifiesto); setSiguiente(p.validacion_parcial?.siguiente ?? 0)
      setResumen(p.estado_procesamiento === 'validado' || p.estado_procesamiento === 'completado' ? p.resultado : null)
      setCompletado(p.estado_procesamiento === 'completado'); setRecuperandoArchivos(!p.manifiesto); setArchivos({})
      setPublicacion(p.estado_procesamiento === 'completado' ? null : p.publicacion_parcial)
      setEstado(p.publicacion_parcial && p.estado_procesamiento !== 'completado' ? `${describirAvance(p.publicacion_parcial, p.manifiesto ?? {})} Pulsa Continuar incorporación.` : p.manifiesto ? 'Paquete recuperado del servidor. Revisa el resumen o continúa su validación; no se importó nada adicional.' : 'Preparación recuperada. Selecciona los mismos cuatro archivos y codificación: se comprobarán los bloques existentes sin duplicarlos.')
    }}>{new Date(p.creado_en).toLocaleString('es-CL')} · {p.estado_procesamiento==='completado'?'Ya importado · Ver resultado':p.publicacion_parcial?'Incorporación pendiente · Continuar':p.estado_procesamiento==='validado'?'Listo para confirmar · Recuperar':'Sin terminar · Continuar'} · {p.id.slice(0, 8)}</button>)}</section>}
    {(!manifiestoGuardado || recuperandoArchivos) && <div className="space-y-4"><label className="block">Codificación<select className="campo-input" disabled={ocupado || (!!id && !recuperandoArchivos)} value={encoding} onChange={e => setEncoding(e.target.value)}><option value="utf-8">UTF-8</option><option value="windows-1252">Windows-1252</option></select></label>
    <p className="text-xs text-texto-secundario">En Android se muestran todos los archivos porque algunos proveedores no identifican el tipo CSV. Elige el CSV y comprueba su nombre debajo. Si está en Drive, descárgalo primero al teléfono.</p>
    {ARCHIVOS_POS.map(tipo => <label key={tipo} className="block text-sm">{tipo}.csv<input key={`${id}-${tipo}`} className="block w-full mt-2 text-texto-primario" type="file" accept="*/*" disabled={ocupado || (!!id && !recuperandoArchivos)} onChange={e => {
      const archivo=e.target.files?.[0]
      if(!archivo){setEstado('No se recibió el archivo. Prueba desde Descargas del teléfono.');return}
      if(!/\.csv$/i.test(archivo.name)||archivo.size===0||archivo.size>100*1024*1024){setEstado('Selecciona un CSV no vacío, de hasta 100 MB.');e.target.value='';setArchivos(a=>({...a,[tipo]:undefined}));return}
      setArchivos(a=>({...a,[tipo]:archivo}));setEstado(`Seleccionado: ${archivo.name}. Falta validar su contenido.`)
    }}/><span aria-live="polite" className="block mt-2 text-acento">{archivos[tipo]?`${archivos[tipo]!.name} · ${(archivos[tipo]!.size/1024).toFixed(1)} KB`:'Ningún archivo seleccionado'}</span></label>)}</div>}
    {!publicacion && <button className="btn-primario w-full" disabled={!habilitado || ocupado || completado || (!manifiestoGuardado && ARCHIVOS_POS.some(t => !archivos[t]))} onClick={preparar}>{ocupado ? 'Procesando…' : id ? 'Continuar / reintentar validación' : 'Validar y ver vista previa'}</button>}
    {resumen && <ResumenHistorial resumen={resumen} completado={completado} />}
    {Number(resumen?.tickets_con_diferencia_pagos) > 0 && <p className="text-advertencia text-sm">Hay diferencias entre pagos y totales oficiales. Revisa propinas, moneda y tipo de cambio antes de confirmar; ChefOS no ajustará las cabeceras.</p>}
    {resumen && !completado && <button className="btn-primario w-full" disabled={!habilitado || ocupado || Number(resumen.errores) !== 0} onClick={confirmar}>{ocupado ? 'Incorporando…' : publicacion ? 'Continuar incorporación' : 'Confirmar importación histórica'}</button>}

    {id && <p className="text-xs text-texto-secundario">Importación: {id}. Si se interrumpe, recupera el mismo paquete. No cambies sus archivos. Las ventas nuevas se mostrarán juntas cuando termine la incorporación.</p>}
    {id && <button className="text-acento min-h-12" disabled={ocupado || !!publicacion} onClick={() => { setId(null); setResumen(null); setCompletado(false); setManifiestoGuardado(null); setSiguiente(0); setArchivos({}); setRecuperandoArchivos(false); setPublicacion(null); setEstado('La preparación anterior permanece registrada. Un paquete sin confirmar no cambia las consultas de ventas.') }}>Preparar otro paquete distinto</button>}
    <Link href="/ventas/mapeos" className="block text-acento min-h-12">Revisar equivalencias de productos POS →</Link>
    <Link href="/ventas/analitica" className="block text-acento min-h-12">Consultar memoria de ventas →</Link>
  </section>
}
