'use client'

import {
  useState,
  useEffect,
  useCallback,
  createContext,
  useContext,
} from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { obtenerClienteNavegador } from '@/lib/supabase/navegador'
import { inventarioKeys }          from '@/lib/queries'
import type { AlertaSistema, Usuario, Restaurante } from '@/types'

function crearQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime:            1000 * 60 * 2,
        gcTime:               1000 * 60 * 10,
        retry:                1,
        refetchOnWindowFocus: false,
        refetchOnReconnect:   true,
      },
      mutations: {
        retry: 0,
      },
    },
  })
}

interface EstadoApp {
  usuario:            Pick<Usuario, 'id' | 'nombre' | 'rol' | 'restaurante_id' | 'avatar_url'> | null
  restaurante:        Pick<Restaurante, 'id' | 'nombre' | 'plan'> | null
  alertasNoLeidas:    AlertaSistema[]
  totalAlertas:       number
  estaOnline:         boolean
  accionesPendientes: number
  marcarAlertaLeida:      (alertaId: string) => Promise<void>
  agregarAccionPendiente: () => void
  reducirAccionPendiente: () => void
}

const ContextoApp = createContext<EstadoApp | null>(null)

export function useApp(): EstadoApp {
  const ctx = useContext(ContextoApp)
  if (!ctx) throw new Error('useApp debe usarse dentro de <AppProvider>')
  return ctx
}

interface Props {
  usuario:     Pick<Usuario, 'id' | 'nombre' | 'rol' | 'restaurante_id' | 'avatar_url'>
  restaurante: Pick<Restaurante, 'id' | 'nombre' | 'plan'>
  children:    React.ReactNode
}

export function AppProvider({ usuario, restaurante, children }: Props) {
  const [queryClient]         = useState(crearQueryClient)
  const supabase              = obtenerClienteNavegador()

  const [alertasNoLeidas,    setAlertasNoLeidas]   = useState<AlertaSistema[]>([])
  const [estaOnline,         setEstaOnline]         = useState(true)
  const [accionesPendientes, setAccionesPendientes] = useState(0)

  // ── Online / Offline ─────────────────────────────────────────
  useEffect(() => {
    const onOnline = () => {
      setEstaOnline(true)
      queryClient.invalidateQueries({ queryKey: inventarioKeys.productos() })
      queryClient.invalidateQueries({ queryKey: ['produccion'] })
      queryClient.invalidateQueries({ queryKey: ['alertas'] })
    }
    const onOffline = () => setEstaOnline(false)

    setEstaOnline(navigator.onLine)
    window.addEventListener('online',  onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online',  onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, []) // queryClient es estable — no cambia entre renders

  // ── Cargar alertas iniciales ──────────────────────────────────
  useEffect(() => {
    const cargar = async () => {
      const { data } = await supabase
        .from('alertas_sistema')
        .select('*')
        .eq('restaurante_id', usuario.restaurante_id)
        .eq('leida', false)
        .order('creado_en', { ascending: false })
        .limit(20)
      if (data) setAlertasNoLeidas(data as AlertaSistema[])
    }
    cargar()
  }, [supabase, usuario.restaurante_id])

  // ── Realtime: alertas ─────────────────────────────────────────
  useEffect(() => {
    const canal = supabase
      .channel(`alertas:${usuario.restaurante_id}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'alertas_sistema',
          filter: `restaurante_id=eq.${usuario.restaurante_id}`,
        },
        (payload) => {
          const nueva = payload.new as AlertaSistema
          setAlertasNoLeidas((prev) => [nueva, ...prev].slice(0, 20))
          if (nueva.tipo === 'stock_critico') {
            queryClient.invalidateQueries({ queryKey: inventarioKeys.productos() })
          }
          if (nueva.tipo === 'merma_excesiva') {
            queryClient.invalidateQueries({ queryKey: ['analisis-consumo'] })
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event:  'UPDATE',
          schema: 'public',
          table:  'alertas_sistema',
          filter: `restaurante_id=eq.${usuario.restaurante_id}`,
        },
        (payload) => {
          const actualizada = payload.new as AlertaSistema
          if (actualizada.leida) {
            setAlertasNoLeidas((prev) => prev.filter((a) => a.id !== actualizada.id))
          }
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(canal) }
  }, [supabase, usuario.restaurante_id, queryClient])

  // ── Realtime: inventario ──────────────────────────────────────
  useEffect(() => {
    const canal = supabase
      .channel(`inventario:${usuario.restaurante_id}`)
      .on(
        'postgres_changes',
        {
          event:  'UPDATE',
          schema: 'public',
          table:  'productos',
          filter: `restaurante_id=eq.${usuario.restaurante_id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: inventarioKeys.productos() })
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(canal) }
  }, [supabase, usuario.restaurante_id, queryClient])

  // ── Realtime: producción ──────────────────────────────────────
  useEffect(() => {
    const canal = supabase
      .channel(`produccion:${usuario.restaurante_id}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'produccion_registros',
          filter: `restaurante_id=eq.${usuario.restaurante_id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['produccion'] })
          /**
           * TODO (Fase 3.2 — Iteración 3):
           * Reemplazar ['lote-activo', usuario.restaurante_id] por
           * produccionKeys.loteActivo() cuando se implemente esa key.
           * Actualmente esta invalidación no tiene query correspondiente
           * y es inofensiva.
           */
          queryClient.invalidateQueries({ queryKey: ['lote-activo', usuario.restaurante_id] })
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(canal) }
  }, [supabase, usuario.restaurante_id, queryClient])

  // ── Sincronizador offline ─────────────────────────────────────
  // TODO Fase 3: integrar con src/lib/offline/cola.ts
  // const sincronizando = useRef(false)
  // useEffect(() => {
  //   if (!estaOnline) return
  //   const timer = setTimeout(async () => {
  //     if (sincronizando.current) return
  //     sincronizando.current = true
  //     try {
  //       const acciones = await obtenerAccionesPendientes(usuario.restaurante_id)
  //       // ... procesar cola
  //     } finally {
  //       sincronizando.current = false
  //     }
  //   }, 1500)
  //   return () => clearTimeout(timer)
  // }, [estaOnline])

  // ── Funciones del contexto ────────────────────────────────────
  const marcarAlertaLeida = useCallback(async (alertaId: string) => {
    await supabase
      .from('alertas_sistema')
      .update({
        leida:     true,
        leida_por: usuario.id,
        leida_en:  new Date().toISOString(),
      })
      .eq('id', alertaId)
    setAlertasNoLeidas((prev) => prev.filter((a) => a.id !== alertaId))
  }, [supabase, usuario.id])

  const agregarAccionPendiente = useCallback(() => {
    setAccionesPendientes((n) => n + 1)
  }, [])

  const reducirAccionPendiente = useCallback(() => {
    setAccionesPendientes((n) => Math.max(0, n - 1))
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <ContextoApp.Provider
        value={{
          usuario,
          restaurante,
          alertasNoLeidas,
          totalAlertas: alertasNoLeidas.length,
          estaOnline,
          accionesPendientes,
          marcarAlertaLeida,
          agregarAccionPendiente,
          reducirAccionPendiente,
        }}
      >
        {children}
      </ContextoApp.Provider>
    </QueryClientProvider>
  )
}
