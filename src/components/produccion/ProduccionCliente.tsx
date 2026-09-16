'use client'

/**
 * src/components/produccion/ProduccionCliente.tsx
 *
 * Lista de lotes de producción con filtros en cliente.
 *
 * Dominio puro:       src/lib/produccion.ts
 * Presentación:       src/lib/produccionUI.ts
 */

import { useState, useMemo }   from 'react'
import Link                    from 'next/link'
import { useRouter }           from 'next/navigation'
import { ChevronRight, X, Plus, Play } from 'lucide-react'
import { useLotesProduccion, useRecetas, useRegistrosProduccion } from '@/hooks/useDominio'
import { useApp }              from '@/providers/AppProvider'
import { parsearFechaLocal }   from '@/lib/produccion'
import { ETIQUETAS_TURNO, ETIQUETAS_ESTADO, CLASES_ESTADO } from '@/lib/produccionUI'
import type { ProduccionLote, TurnoServicio } from '@/types/index'

// ─────────────────────────────────────────────────────────────
// Tipos de filtro
// ─────────────────────────────────────────────────────────────

type EstadoLote   = ProduccionLote['estado']
type FiltroTurno  = 'todos' | TurnoServicio
type FiltroEstado = 'todos' | EstadoLote

// ─────────────────────────────────────────────────────────────
// Subcomponente: skeletons
// ─────────────────────────────────────────────────────────────

function SkeletonLotes() {
  return (
    <div className="space-y-3">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="rounded-xl bg-fondo-elevado border border-fondo-borde p-4 space-y-2"
        >
          <div className="flex justify-between gap-3">
            <div className="space-y-1.5 flex-1">
              <div className="h-3 rounded-full bg-fondo-hover animate-pulse w-1/3" />
              <div className="h-2.5 rounded-full bg-fondo-hover animate-pulse w-1/2" />
            </div>
            <div className="h-5 w-20 rounded-full bg-fondo-hover animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Subcomponente: tarjeta de lote
// ─────────────────────────────────────────────────────────────

function TarjetaLote({ lote }: { lote: ProduccionLote }) {
  const fechaFormateada = parsearFechaLocal(lote.fecha).toLocaleDateString('es-CL', {
    weekday: 'short',
    day:     'numeric',
    month:   'short',
  })

  const etiquetaTurno  = ETIQUETAS_TURNO[lote.turno]
  const etiquetaEstado = ETIQUETAS_ESTADO[lote.estado]
  const clasesEstado   = CLASES_ESTADO[lote.estado]

  return (
    <Link
      href={`/produccion/${lote.id}`}
      className="flex items-center justify-between gap-3
                 rounded-xl bg-fondo-elevado border border-fondo-borde
                 px-4 py-3 active:bg-fondo-hover transition-colors"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-sans font-medium text-texto-primario">
            {etiquetaTurno}
          </p>
          <span className={`px-2 py-0.5 rounded-full text-2xs font-sans font-medium ${clasesEstado}`}>
            {etiquetaEstado}
          </span>
        </div>

        <p className="text-2xs font-sans text-texto-apagado mt-0.5">
          {fechaFormateada}
          {lote.items_producidos > 0 && (
            <> · {lote.items_producidos} ítem{lote.items_producidos !== 1 ? 's' : ''}</>
          )}
          {lote.costo_total_lote !== undefined && lote.costo_total_lote !== null && (
            <> · ${lote.costo_total_lote.toLocaleString('es-CL')}</>
          )}
        </p>

        {lote.responsable?.nombre && (
          <p className="text-2xs font-sans text-texto-apagado mt-0.5">
            {lote.responsable.nombre}
          </p>
        )}
      </div>

      <ChevronRight size={16} className="text-texto-apagado flex-shrink-0" />
    </Link>
  )
}

// ─────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────

export default function ProduccionCliente() {
  const { estaOnline, accionesPendientes } = useApp()
  const router = useRouter()

  const [filtroTurno,  setFiltroTurno]  = useState<FiltroTurno>('todos')
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('todos')

  const { isPending, isError, isSuccess, data } = useLotesProduccion()
  const recetasQuery = useRecetas({ es_produccion: true, activa: true })
  const [categoriaProduccion, setCategoriaProduccion] = useState('todas')
  const hoy = new Date().toISOString().slice(0, 10)
  const registrosQuery = useRegistrosProduccion({ fecha_desde: hoy, fecha_hasta: hoy })
  const [abriendoLote, setAbriendoLote] = useState(false)
  const [errorAbrirLote, setErrorAbrirLote] = useState<string | null>(null)

  const lotes: ProduccionLote[] = useMemo(() => data ?? [], [data])

  const lotesFiltrados = useMemo(() => {
    let resultado = lotes
    if (filtroTurno !== 'todos') {
      resultado = resultado.filter((l) => l.turno === filtroTurno)
    }
    if (filtroEstado !== 'todos') {
      resultado = resultado.filter((l) => l.estado === filtroEstado)
    }
    return resultado
  }, [lotes, filtroTurno, filtroEstado])

  const hayFiltros = filtroTurno !== 'todos' || filtroEstado !== 'todos'

  const limpiarFiltros = () => {
    setFiltroTurno('todos')
    setFiltroEstado('todos')
  }

  const recetasPendientes = useMemo(() => {
    const registradasHoy = new Set(
      (registrosQuery.data ?? []).map((registro) => registro.receta_id).filter(Boolean)
    )
    return (recetasQuery.data ?? []).filter((receta) => !registradasHoy.has(receta.id) && (categoriaProduccion === 'todas' || receta.categoria?.nombre === categoriaProduccion))
  }, [recetasQuery.data, registrosQuery.data, categoriaProduccion])

  const abrirProduccion = async (recetaId?: string) => {
    if (abriendoLote) return
    setAbriendoLote(true)
    setErrorAbrirLote(null)
    const hora = new Date().getHours()
    const turno = hora < 14 ? 'mañana' : hora < 19 ? 'tarde' : 'noche'
    try {
      const response = await fetch('/api/produccion/lotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fecha: hoy, turno }),
      })
      const payload = await response.json() as { data?: { id?: string }; error?: string }
      if (!response.ok || !payload.data?.id) {
        throw new Error(payload.error ?? 'No se pudo abrir la producción.')
      }
      router.push(`/produccion/${payload.data.id}${recetaId ? `?receta=${encodeURIComponent(recetaId)}` : ''}`)
    } catch (error) {
      setErrorAbrirLote(error instanceof Error ? error.message : 'No se pudo abrir la producción.')
    } finally {
      setAbriendoLote(false)
    }
  }

  return (
    <div className="px-4 pt-6 pb-28 space-y-5 max-w-lg mx-auto">

      {/* ── Encabezado ───────────────────────────────────── */}
      <section>
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="text-xl font-display font-bold text-texto-primario leading-tight">
            Producción
          </h1>
          {isSuccess && (
            <p className="text-xs font-sans text-texto-apagado flex-shrink-0">
              {hayFiltros
                ? `${lotesFiltrados.length} de ${lotes.length}`
                : `${lotes.length} lote${lotes.length !== 1 ? 's' : ''}`
              }
            </p>
          )}
        </div>
        <p className="text-xs font-sans text-texto-apagado mt-0.5">
          Registra producción y descuenta automáticamente sus ingredientes del inventario
        </p>
        <button
          type="button"
          onClick={() => void abrirProduccion()}
          disabled={abriendoLote}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-acento px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          <Plus size={16} />
          {abriendoLote ? 'Abriendo…' : 'Añadir producción'}
        </button>
      </section>

      {errorAbrirLote && (
        <section className="rounded-xl border border-peligro-borde bg-peligro-suave px-4 py-3">
          <p className="text-xs text-peligro-texto">{errorAbrirLote}</p>
        </section>
      )}

      <section className="rounded-xl bg-fondo-elevado border border-fondo-borde overflow-hidden">
        <div className="px-4 py-3 border-b border-fondo-borde">
          <p className="text-xs font-sans font-medium text-texto-secundario uppercase tracking-wide">
            Producciones pendientes
          </p>
          <label className="block text-xs mt-3">Categoría de producción<select className="campo-input mt-1" value={categoriaProduccion} onChange={e=>setCategoriaProduccion(e.target.value)}><option value="todas">Todas las categorías</option>{Array.from(new Set(['Caldos y Bases', ...(recetasQuery.data ?? []).flatMap(r=>r.categoria?.nombre ? [r.categoria.nombre] : [])])).map(c=><option key={c} value={c}>{c}</option>)}</select></label>
          <p className="text-2xs text-texto-apagado mt-1">
            Recetas marcadas como “Es producción” que todavía no registras hoy.
          </p>
        </div>
        <div className="px-4 py-3 space-y-2">
          {recetasQuery.isError || registrosQuery.isError ? <p className="text-xs text-peligro-texto">No se pudieron verificar las producciones. Actualiza la pantalla.</p> : recetasQuery.isPending || registrosQuery.isPending ? (
            <p className="text-xs text-texto-apagado">Cargando producciones…</p>
          ) : recetasPendientes.length === 0 ? (
            <p className="text-xs text-texto-apagado">No hay producciones pendientes para hoy.</p>
          ) : (
            recetasPendientes.map((receta) => (
              <div key={receta.id} className="flex items-center justify-between gap-3 rounded-lg border border-fondo-borde px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-texto-primario truncate">{receta.nombre}</p>
                  <p className="text-2xs text-texto-apagado">Rinde {receta.rendimiento_porciones} {receta.unidad_rendimiento}{receta.producto_salida?.nombre ? ` · salida ${receta.producto_salida.nombre}` : ''}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void abrirProduccion(receta.id)}
                  disabled={abriendoLote}
                  className="flex-shrink-0 inline-flex items-center gap-1 rounded-lg border border-acento px-2.5 py-1.5 text-2xs font-medium text-acento disabled:opacity-50"
                >
                  <Play size={12} /> Registrar
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      {/* ── Banner offline ───────────────────────────────── */}
      {(!estaOnline || accionesPendientes > 0) && (
        <section
          className={
            !estaOnline
              ? 'rounded-xl border px-4 py-3 bg-advertencia-suave border-advertencia-borde'
              : 'rounded-xl border px-4 py-3 bg-info-suave border-info-borde'
          }
        >
          <p
            className={
              !estaOnline
                ? 'text-xs font-sans font-medium text-advertencia-texto'
                : 'text-xs font-sans font-medium text-info-texto'
            }
          >
            {!estaOnline
              ? 'Sin conexión — los registros se sincronizarán al reconectar'
              : `Sincronizando ${accionesPendientes} acción${accionesPendientes !== 1 ? 'es' : ''} pendiente${accionesPendientes !== 1 ? 's' : ''}...`
            }
          </p>
        </section>
      )}

      {/* ── Filtros ──────────────────────────────────────── */}
      {isSuccess && lotes.length > 0 && (
        <section className="space-y-2">

          {/* Filtro por turno */}
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {(['todos', 'mañana', 'tarde', 'noche'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setFiltroTurno(t)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full
                            text-2xs font-sans font-medium border transition-colors
                            ${filtroTurno === t
                              ? 'bg-acento text-white border-acento'
                              : 'bg-fondo-elevado text-texto-apagado border-fondo-borde active:bg-fondo-hover'
                            }`}
              >
                {t === 'todos' ? 'Todos los turnos' : ETIQUETAS_TURNO[t]}
              </button>
            ))}
          </div>

          {/* Filtro por estado */}
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {(['todos', 'en_progreso', 'completado', 'cancelado'] as const).map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setFiltroEstado(e)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full
                            text-2xs font-sans font-medium border transition-colors
                            ${filtroEstado === e
                              ? 'bg-acento text-white border-acento'
                              : 'bg-fondo-elevado text-texto-apagado border-fondo-borde active:bg-fondo-hover'
                            }`}
              >
                {e === 'todos' ? 'Todos los estados' : ETIQUETAS_ESTADO[e]}
              </button>
            ))}
          </div>

          {/* Limpiar filtros */}
          {hayFiltros && (
            <button
              type="button"
              onClick={limpiarFiltros}
              className="flex items-center gap-1.5 text-2xs font-sans
                         text-acento active:text-acento/70 transition-colors"
            >
              <X size={11} />
              Limpiar filtros
            </button>
          )}
        </section>
      )}

      {/* ── Estado: cargando ─────────────────────────────── */}
      {isPending && <SkeletonLotes />}

      {/* ── Estado: error ────────────────────────────────── */}
      {isError && (
        <section className="rounded-xl bg-info-suave border border-info-borde px-4 py-4">
          <p className="text-xs font-sans font-medium text-info-texto">
            No se pudieron cargar los lotes de producción
          </p>
          <p className="text-2xs font-sans text-info-texto/70 mt-1 leading-relaxed">
            Verifica tu conexión e intenta nuevamente.
          </p>
        </section>
      )}

      {/* ── Sin resultados de filtro ─────────────────────── */}
      {isSuccess && lotesFiltrados.length === 0 && hayFiltros && (
        <section className="rounded-xl bg-fondo-elevado border border-fondo-borde px-4 py-8 text-center">
          <p className="text-sm font-sans font-medium text-texto-secundario">
            Sin resultados
          </p>
          <p className="text-xs font-sans text-texto-apagado mt-1">
            Ningún lote coincide con los filtros aplicados.
          </p>
          <button
            type="button"
            onClick={limpiarFiltros}
            className="mt-3 text-xs font-sans font-medium text-acento
                       active:text-acento/70 transition-colors"
          >
            Limpiar filtros
          </button>
        </section>
      )}

      {/* ── Sin lotes en BD ──────────────────────────────── */}
      {isSuccess && lotes.length === 0 && (
        <section className="rounded-xl bg-fondo-elevado border border-fondo-borde px-4 py-8 text-center">
          <p className="text-sm font-sans font-medium text-texto-secundario">
            No hay lotes activos
          </p>
          <p className="text-xs font-sans text-texto-apagado mt-1">
            Los lotes de producción del turno aparecerán aquí.
          </p>
        </section>
      )}

      {/* ── Lista de lotes ───────────────────────────────── */}
      {isSuccess && lotesFiltrados.length > 0 && (
        <section className="space-y-3">
          {lotesFiltrados.map((lote) => (
            <TarjetaLote key={lote.id} lote={lote} />
          ))}
        </section>
      )}

    </div>
  )
}
