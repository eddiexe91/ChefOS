'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Check, ChevronRight, Download, PackagePlus, Soup, UtensilsCrossed } from 'lucide-react'

import { useProductos } from '@/hooks/useDominio'
import { TIPOS_INVENTARIO } from '@/lib/productos'
import { useApp } from '@/providers/AppProvider'

const PASOS = [
  ['Inventario', 'Carga materias primas e insumos antes de continuar.'],
  ['Stock disponible', 'Registra productos elaborados, porcionados o listos para vender/usar.'],
  ['Recetas y Carta', 'Crea fichas técnicas de producción y elaboraciones de Carta.'],
  ['Producción', 'Registra solo recetas con es_produccion y salida configurada.'],
] as const

export default function OnboardingPage() {
  const { restaurante, usuario } = useApp()
  const inventarioQuery = useProductos({ tipos_operativos: TIPOS_INVENTARIO, activo: true })
  const stockQuery = useProductos({ tipos_operativos: ['elaborado'], activo: true })

  const onboardingGuardado = useMemo(() => restaurante?.config?.onboarding ?? {}, [restaurante?.config])
  const [paso, setPaso] = useState(Number(onboardingGuardado.paso_actual ?? 0))
  const [nombre, setNombre] = useState(restaurante?.nombre ?? '')
  const [rol, setRol] = useState<string>(usuario?.rol ?? 'dueño')
  const [zonaHoraria, setZonaHoraria] = useState(restaurante?.zona_horaria ?? 'America/Santiago')
  const [guardando, setGuardando] = useState(false)
  const [archivo, setArchivo] = useState<File | null>(null)
  const [mensaje, setMensaje] = useState('')
  const [duplicados, setDuplicados] = useState<string[]>([])
  const [tipoImportacionPendiente, setTipoImportacionPendiente] = useState<'productos' | 'stock'>('productos')
  const [confirmarIncompleto, setConfirmarIncompleto] = useState(false)

  useEffect(() => {
    setPaso(Number(onboardingGuardado.paso_actual ?? 0))
  }, [onboardingGuardado.paso_actual])

  const cantidadInventario = inventarioQuery.data?.length ?? 0
  const cantidadStock = stockQuery.data?.length ?? 0
  const inventarioListo = cantidadInventario > 0
  const stockListo = cantidadStock > 0
  const puedeCerrar = inventarioListo && stockListo

  async function guardarAvance(completar = false, silencioso = false) {
    if (!restaurante?.id) return
    if (!silencioso) setGuardando(true)
    const response = await fetch('/api/onboarding/configurar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre,
        rol,
        zona_horaria: zonaHoraria,
        paso_actual: paso,
        inventario_confirmado: inventarioListo,
        stock_confirmado: stockListo,
        completar,
        confirmar_incompleto: confirmarIncompleto,
      }),
    })
    const data = await response.json().catch(() => ({ error: 'No se pudo guardar el avance.' })) as { error?: string; estado?: { onboarding?: { completo?: boolean } } }
    if (!silencioso) setGuardando(false)
    if (!response.ok) {
      if (!silencioso) setMensaje(data.error ?? 'No se pudo guardar el avance.')
      return false
    }
    if (!silencioso) setMensaje(completar ? 'Onboarding guardado correctamente.' : 'Avance guardado.')
    return true
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void guardarAvance(false, true)
    }, 500)
    return () => window.clearTimeout(timeout)
  }, [nombre, paso, rol, zonaHoraria, inventarioListo, stockListo, confirmarIncompleto])

  async function importarInventario(tipoImportacion: 'productos' | 'stock' = 'productos', resolver?: 'mantener' | 'sumar' | 'omitir') {
    if (!archivo) return
    setGuardando(true)
    const form = new FormData()
    form.set('archivo', archivo)
    form.set('tipo', tipoImportacion)
    if (resolver) form.set('resolver_duplicados', resolver)
    const response = await fetch('/api/onboarding/importar', { method: 'POST', body: form })
    const data = await response.json().catch(() => ({ error: 'No se pudo importar.' })) as { importados?: number; error?: string; duplicados?: string[]; duplicados_resueltos?: number }
    setGuardando(false)
    if (response.status === 409 && data.duplicados?.length) {
      setDuplicados(data.duplicados)
      setTipoImportacionPendiente(tipoImportacion)
      setMensaje(`ChefOS detectó ${data.duplicados.length} producto(s) duplicado(s). Elige cómo resolverlos.`)
      return
    }
    setDuplicados([])
    setMensaje(response.ok ? `${data.importados ?? 0} registros importados. ${data.duplicados_resueltos ? `${data.duplicados_resueltos} duplicados resueltos.` : ''}` : (data.error ?? 'No se pudo importar.'))
  }

  async function continuar() {
    if (paso === PASOS.length - 1) {
      const ok = await guardarAvance(true)
      if (!ok) return
      return
    }
    if (paso === 0 && !inventarioListo) {
      setMensaje('Todavía no hay materias primas o insumos cargados. Puedes continuar, pero Inicio seguirá mostrando la alerta.')
    }
    if (paso === 1 && !stockListo) {
      setMensaje('Todavía no hay Stock disponible cargado. Puedes continuar, pero el onboarding no se marcará completo.')
    }
    setPaso((actual) => Math.min(actual + 1, PASOS.length - 1))
  }

  return (
    <div className="px-4 pt-8 pb-36 max-w-lg mx-auto space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wide text-acento">Configuración inicial</p>
        <h1 className="text-2xl font-display font-bold text-texto-primario mt-1">Organiza la operación base</h1>
        <p className="text-sm text-texto-secundario mt-2">ChefOS empezará por Inventario, luego Stock disponible, y recién después Carta y Producción.</p>
      </div>

      <section className="rounded-2xl border border-fondo-borde bg-fondo-elevado p-5 space-y-3">
        <h2 className="text-sm font-medium text-texto-primario">Identidad del restaurante</h2>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-texto-secundario">Nombre</span>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} className="campo-input" />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-texto-secundario">Tu rol</span>
            <select value={rol} onChange={(e) => setRol(e.target.value)} className="campo-input">
              <option value="dueño">Dueño/a</option>
              <option value="administrador">Administrador/a</option>
              <option value="chef_ejecutivo">Chef ejecutivo/a</option>
              <option value="chef_cocina">Chef de cocina</option>
              <option value="cocinero">Cocinero/a</option>
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-texto-secundario">Zona horaria</span>
            <select value={zonaHoraria} onChange={(e) => setZonaHoraria(e.target.value)} className="campo-input">
              <option value="America/Santiago">Chile continental</option>
              <option value="America/Argentina/Buenos_Aires">Argentina</option>
              <option value="America/Lima">Perú</option>
              <option value="America/Bogota">Colombia</option>
              <option value="America/Mexico_City">México centro</option>
              <option value="Europe/Madrid">España</option>
            </select>
          </label>
        </div>
      </section>

      <div className="flex gap-1">{PASOS.map((_, index) => <div key={index} className={`h-1.5 flex-1 rounded-full ${index <= paso ? 'bg-acento' : 'bg-fondo-borde'}`} />)}</div>

      <section className="rounded-2xl border border-fondo-borde bg-fondo-elevado p-5 min-h-64 space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-acento-suave flex items-center justify-center"><Check className="text-acento" /></div>
        <div>
          <h2 className="text-lg font-display font-bold text-texto-primario">{PASOS[paso][0]}</h2>
          <p className="text-sm text-texto-secundario mt-2">{PASOS[paso][1]}</p>
        </div>

        {paso === 0 ? (
          <div className="space-y-3">
            <div className="rounded-xl border border-fondo-borde bg-fondo-card p-4">
              <p className="text-xs text-texto-apagado">Productos cargados en Inventario</p>
              <p className="text-lg font-display font-bold text-texto-primario mt-1">{cantidadInventario}</p>
            </div>
            <Link href="/inventario" className="inline-flex items-center gap-2 rounded-xl border border-acento px-4 py-2.5 text-xs text-acento"><PackagePlus size={15} /> Abrir inventario</Link>
            <div className="space-y-2">
              <p className="text-xs text-texto-apagado">Si prefieres, importa un CSV con materias primas e insumos.</p>
              <input type="file" accept=".csv,text/csv" onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} className="w-full text-xs text-texto-secundario" />
              {archivo ? <button type="button" onClick={() => void importarInventario('productos')} disabled={guardando} className="min-h-11 rounded-xl border border-acento px-4 text-xs text-acento disabled:opacity-50">Importar inventario</button> : null}
              <a href="/api/onboarding/plantilla-inventario" download className="inline-flex items-center gap-1 text-xs text-acento"><Download size={13} /> Descargar plantilla CSV</a>
            </div>
          </div>
        ) : null}

        {paso === 1 ? (
          <div className="space-y-3">
            <div className="rounded-xl border border-fondo-borde bg-fondo-card p-4">
              <p className="text-xs text-texto-apagado">Productos elaborados en Stock disponible</p>
              <p className="text-lg font-display font-bold text-texto-primario mt-1">{cantidadStock}</p>
            </div>
            <Link href="/stock" className="inline-flex items-center gap-2 rounded-xl border border-acento px-4 py-2.5 text-xs text-acento"><Soup size={15} /> Abrir Stock disponible</Link>
            <p className="text-xs text-texto-apagado">Aquí van porciones, salsas, postres porcionados y producciones terminadas.</p>
            <input type="file" accept=".csv,text/csv" onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} className="w-full text-xs text-texto-secundario" />
            {archivo ? <button type="button" onClick={() => void importarInventario('stock')} disabled={guardando} className="min-h-11 rounded-xl border border-acento px-4 text-xs text-acento disabled:opacity-50">Importar Stock disponible</button> : null}
            <a href="/api/onboarding/plantilla-inventario" download className="inline-flex items-center gap-1 text-xs text-acento"><Download size={13} /> Descargar plantilla CSV</a>
          </div>
        ) : null}

        {paso === 2 ? (
          <div className="space-y-3">
            <p className="text-xs text-texto-apagado">Con la base cargada, crea recetas de producción y platos de Carta por separado.</p>
            <div className="flex flex-wrap gap-2">
              <Link href="/biblioteca" className="inline-flex items-center gap-2 rounded-xl border border-acento px-4 py-2.5 text-xs text-acento"><PackagePlus size={15} /> Abrir Recetas</Link>
              <Link href="/carta" className="inline-flex items-center gap-2 rounded-xl border border-acento px-4 py-2.5 text-xs text-acento"><UtensilsCrossed size={15} /> Abrir Carta</Link>
            </div>
          </div>
        ) : null}

        {paso === 3 ? (
          <div className="space-y-3">
            <p className="text-xs text-texto-apagado">Producción solo mostrará fichas con <code>es_produccion=true</code> y aumentará el producto de salida configurado.</p>
            <Link href="/produccion" className="inline-flex items-center gap-2 rounded-xl border border-acento px-4 py-2.5 text-xs text-acento"><Soup size={15} /> Abrir Producción</Link>
            {!puedeCerrar ? (
              <label className="flex items-start gap-2 rounded-xl border border-advertencia-borde bg-advertencia-suave px-4 py-3 text-xs text-advertencia-texto">
                <input type="checkbox" checked={confirmarIncompleto} onChange={(e) => setConfirmarIncompleto(e.target.checked)} />
                <span>Confirmo que quiero cerrar el onboarding aunque falten Inventario o Stock disponible. La alerta persistirá en Inicio hasta completarlos.</span>
              </label>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="rounded-xl border border-fondo-borde bg-fondo-card px-4 py-3 text-xs text-texto-secundario">
        <p className="font-medium text-texto-primario">Estado actual</p>
        <p className="mt-1">Inventario: {inventarioListo ? 'completo' : 'pendiente'} · Stock disponible: {stockListo ? 'completo' : 'pendiente'}</p>
        {!puedeCerrar ? <p className="mt-1 text-advertencia-texto">ChefOS no marcará el onboarding como completo hasta que ambos módulos tengan datos o lo confirmes explícitamente.</p> : null}
      </section>

      {mensaje ? <p className="text-xs text-texto-secundario">{mensaje}</p> : null}
      {duplicados.length > 0 ? (
        <section className="rounded-xl border border-advertencia-borde bg-advertencia-suave p-4 space-y-3">
          <p className="text-sm font-medium text-advertencia-texto">Productos duplicados detectados</p>
          <p className="text-xs text-advertencia-texto">{duplicados.slice(0, 8).join(', ')}{duplicados.length > 8 ? '…' : ''}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void importarInventario(tipoImportacionPendiente, 'sumar')} className="rounded-lg bg-acento px-3 py-2 text-xs text-white">Sumar cantidades</button>
            <button type="button" onClick={() => void importarInventario(tipoImportacionPendiente, 'omitir')} className="rounded-lg border border-acento px-3 py-2 text-xs text-acento">Omitir duplicados</button>
            <button type="button" onClick={() => void importarInventario(tipoImportacionPendiente, 'mantener')} className="rounded-lg border border-fondo-borde px-3 py-2 text-xs text-texto-secundario">Mantener todos</button>
          </div>
        </section>
      ) : null}

      <button onClick={() => void continuar()} disabled={guardando} className="w-full min-h-12 rounded-xl bg-acento text-white flex items-center justify-center gap-2 disabled:opacity-50">
        {paso === PASOS.length - 1 ? 'Finalizar onboarding' : 'Continuar'}
        <ChevronRight size={18} />
      </button>
    </div>
  )
}
