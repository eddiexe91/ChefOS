'use client'

/**
 * src/components/alertas/AlertasCliente.tsx
 *
 * Pantalla profesional de alertas de ChefOS.
 *
 * Fuente primaria de datos: useApp().alertasNoLeidas
 * Los datos llegan via AppProvider + Realtime — siempre disponibles.
 *
 * useAlertasActivas() se mantiene como contrato arquitectónico secundario.
 * Su estado (pending/error/success) se refleja con un aviso informativo
 * pero nunca bloquea el render ni reemplaza los datos de useApp().
 *
 * Tipos verificados contra src/types/index.ts:
 * - AlertaSistema: id, tipo, severidad, mensaje, creado_en — confirmados.
 * - TipoAlerta: 7 valores confirmados.
 * - SeveridadAlerta: 4 valores confirmados.
 *
 * marcarAlertaLeida(alertaId: string) => Promise<void>
 * confirmado en EstadoApp de AppProvider.
 */

import { useState }           from 'react'
import { Bell, CheckCheck }   from 'lucide-react'
import { useApp }             from '@/providers/AppProvider'
import { useAlertasActivas }  from '@/hooks/useDominio'
import type { AlertaSistema, TipoAlerta, SeveridadAlerta } from '@/types/index'

// ─────────────────────────────────────────────────────────────
// Constantes de dominio
// ─────────────────────────────────────────────────────────────

const ETIQUETAS_TIPO: Record<TipoAlerta, string> = {
  stock_critico:       'Stock crítico',
  proximo_vencimiento: 'Próximo vencimiento',
  variacion_precio:    'Variación de precio',
  produccion_sugerida: 'Producción sugerida',
  compra_urgente:      'Compra urgente',
  merma_excesiva:      'Merma excesiva',
  otro:                'Otro',
}

const CLASES_SEVERIDAD: Record<SeveridadAlerta, string> = {
  critica: 'bg-peligro text-white',
  alta:    'bg-advertencia text-texto-inverso',
  media:   'bg-info-suave text-info-texto border border-info-borde',
  baja:    'bg-fondo-hover text-texto-apagado',
}

const CLASES_BORDE_SEVERIDAD: Record<SeveridadAlerta, string> = {
  critica: 'border-l-2 border-l-peligro',
  alta:    'border-l-2 border-l-advertencia',
  media:   'border-l-2 border-l-info-texto',
  baja:    'border-l-2 border-l-fondo-borde',
}

// ─────────────────────────────────────────────────────────────
// Subcomponente: tarjeta de alerta
// ─────────────────────────────────────────────────────────────

interface TarjetaAlertaProps {
  alerta:           AlertaSistema
  marcandoLeida:    boolean
  onMarcarLeida:    (id: string) => void
}

function TarjetaAlerta({ alerta, marcandoLeida, onMarcarLeida }: TarjetaAlertaProps) {
  const fechaFormateada = new Date(alerta.creado_en).toLocaleString('es-CL', {
    day:    'numeric',
    month:  'short',
    hour:   '2-digit',
    minute: '2-digit',
  })

  return (
    <div
      className={`rounded-xl bg-fondo-elevado border border-fondo-borde
                  overflow-hidden transition-opacity duration-200
                  ${marcandoLeida ? 'opacity-50' : 'opacity-100'}
                  ${CLASES_BORDE_SEVERIDAD[alerta.severidad]}`}
    >
      <div className="px-4 py-3 space-y-2">

        {/* Fila superior: tipo + badge de severidad */}
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-sans font-medium text-texto-secundario truncate">
            {ETIQUETAS_TIPO[alerta.tipo]}
          </p>
          <span
            className={`px-2 py-0.5 rounded-full text-2xs font-sans font-medium
                        flex-shrink-0 ${CLASES_SEVERIDAD[alerta.severidad]}`}
          >
            {alerta.severidad}
          </span>
        </div>

        {/* Mensaje */}
        <p className="text-sm font-sans text-texto-primario leading-snug">
          {alerta.mensaje}
        </p>

        {/* Pie: timestamp + acción */}
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <p className="text-2xs font-sans text-texto-apagado">
            {fechaFormateada}
          </p>
          <button
            type="button"
            disabled={marcandoLeida}
            onClick={() => onMarcarLeida(alerta.id)}
            className="flex items-center gap-1 text-2xs font-sans font-medium
                       text-acento active:text-acento/70 transition-colors
                       disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
          >
            <CheckCheck size={12} />
            Marcar como leída
          </button>
        </div>

      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────

export default function AlertasCliente() {
  const {
    alertasNoLeidas,
    totalAlertas,
    marcarAlertaLeida,
  } = useApp()

  // Contrato arquitectónico secundario — fuente futura cuando Fase 3.2 complete.
  // No se accede a data — alertasNoLeidas de useApp() es la fuente real.
  const {
    isError: queryError,
  } = useAlertasActivas()

  // Estado local para deshabilitar el botón mientras se procesa
  const [marcandoId, setMarcandoId] = useState<string | null>(null)

  const handleMarcarLeida = (alertaId: string) => {
    if (marcandoId !== null) return  // evitar doble tap
    setMarcandoId(alertaId)
    void marcarAlertaLeida(alertaId).finally(() => {
      setMarcandoId(null)
    })
  }

  return (
    <div className="px-4 pt-6 pb-28 space-y-6 max-w-lg mx-auto">

      {/* ── Encabezado ───────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-2.5">
          <Bell size={18} className="text-texto-apagado flex-shrink-0" />
          <h1 className="text-xl font-display font-bold text-texto-primario leading-tight">
            Alertas
          </h1>
          {totalAlertas > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-peligro text-white
                             text-2xs font-display font-bold flex-shrink-0">
              {totalAlertas > 9 ? '9+' : totalAlertas}
            </span>
          )}
        </div>
        <p className="text-xs font-sans text-texto-apagado mt-0.5">
          {totalAlertas === 0
            ? 'Sin alertas pendientes'
            : `${totalAlertas} alerta${totalAlertas !== 1 ? 's' : ''} sin leer`
          }
        </p>
      </section>

      {/* ── Aviso de fuente secundaria (informativo) ──────── */}
      {queryError && (
        <section className="rounded-xl bg-info-suave border border-info-borde px-4 py-3">
          <p className="text-2xs font-sans text-info-texto/70 leading-relaxed">
            El historial completo de alertas estará disponible próximamente.
            Las alertas activas se muestran en tiempo real.
          </p>
        </section>
      )}

      {/* ── Estado: sin alertas ──────────────────────────── */}
      {alertasNoLeidas.length === 0 && (
        <section className="rounded-xl bg-fondo-elevado border border-fondo-borde
                            px-4 py-10 text-center">
          <div className="flex justify-center mb-3">
            <div className="w-10 h-10 rounded-full bg-exito-suave
                            flex items-center justify-center">
              <CheckCheck size={18} className="text-exito-texto" />
            </div>
          </div>
          <p className="text-sm font-sans font-medium text-texto-secundario">
            Todo en orden
          </p>
          <p className="text-xs font-sans text-texto-apagado mt-1">
            No hay alertas pendientes en este momento.
          </p>
        </section>
      )}

      {/* ── Lista de alertas ─────────────────────────────── */}
      {alertasNoLeidas.length > 0 && (
        <section className="space-y-3">
          {alertasNoLeidas.map((alerta) => (
            <TarjetaAlerta
              key={alerta.id}
              alerta={alerta}
              marcandoLeida={marcandoId === alerta.id}
              onMarcarLeida={handleMarcarLeida}
            />
          ))}
        </section>
      )}

    </div>
  )
}
