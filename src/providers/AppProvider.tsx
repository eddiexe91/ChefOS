'use client'

import {
  useState,
  useEffect,
  useCallback,
  createContext,
  useContext,
} from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { usePathname } from 'next/navigation'
import { obtenerClienteNavegador } from '@/lib/supabase/navegador'
import { inventarioKeys, produccionKeys, alertasKeys, bibliotecaKeys, dashboardKeys } from '@/lib/queries'
import {
  contarAccionesPendientes,
} from '@/lib/offline/cola'
import type { AlertaSistema, Usuario, Restaurante } from '@/types'

function crearQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Los datos operativos deben reflejar inmediatamente altas y ajustes
        // realizados desde otro dispositivo o desde otra pantalla.
        staleTime:            0,
        gcTime:               1000 * 60 * 10,
        retry:                1,
        refetchOnWindowFocus: true,
        refetchOnMount:       'always',
        refetchOnReconnect:   true,
      },
      mutations: {
        retry: 0,
      },
    },
  })
}

interface EstadoApp {
  usuario:            Pick<Usuario, 'id' | 'nombre' | 'email' | 'rol' | 'restaurante_id' | 'avatar_url'> | null
  restaurante:        Pick<Restaurante, 'id' | 'nombre' | 'plan' | 'config' | 'onboarding_completado' | 'zona_horaria'> | null
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
  usuario:     Pick<Usuario, 'id' | 'nombre' | 'email' | 'rol' | 'restaurante_id' | 'avatar_url'>
  restaurante: Pick<Restaurante, 'id' | 'nombre' | 'plan' | 'config' | 'onboarding_completado' | 'zona_horaria'>
  children:    React.ReactNode
}

export function AppProvider({ usuario, restaurante, children }: Props) {
  const [queryClient]         = useState(crearQueryClient)
  const pathname = usePathname()
  const supabase              = obtenerClienteNavegador()

  const [alertasNoLeidas,    setAlertasNoLeidas]   = useState<AlertaSistema[]>([])
  const [estaOnline,         setEstaOnline]         = useState(true)
  const [accionesPendientes, setAccionesPendientes] = useState(0)

  useEffect(() => {
    const refrescar = () => {
      for (const key of [inventarioKeys.all, bibliotecaKeys.all, produccionKeys.all, dashboardKeys.all, ['actividad-operativa'], ['alertas']]) {
        void queryClient.invalidateQueries({ queryKey: key })
      }
    }
    const canal = supabase.channel(`operacion:${usuario.restaurante_id}`)
    for (const table of ['productos', 'recetas', 'produccion_registros', 'mermas']) {
      canal.on('postgres_changes', { event: '*', schema: 'public', table, filter: `restaurante_id=eq.${usuario.restaurante_id}` }, refrescar)
    }
    canal.subscribe()
    // Respaldo para proyectos donde la publicación Realtime aún no incluye una tabla.
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible' && navigator.onLine) refrescar() }, 30000)
    return () => { clearInterval(timer); void supabase.removeChannel(canal) }
  }, [supabase, usuario.restaurante_id, queryClient])

  const actualizarContadorOffline = useCallback(async () => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      setAccionesPendientes(0)
      return
    }
    try {
      setAccionesPendientes(await contarAccionesPendientes())
    } catch {
      setAccionesPendientes(0)
    }
  }, [])

  const sincronizarColaOffline = useCallback(async () => {
    // Legacy jobs lack tenant binding and reliable idempotency. Preserve them for
    // review instead of replaying under another login or deleting after 3 failures.
    await actualizarContadorOffline()
  }, [actualizarContadorOffline])

  // ── Online / Offline ─────────────────────────────────────────
  useEffect(() => {
    const onOnline = () => {
      setEstaOnline(true)
      queryClient.invalidateQueries({ queryKey: inventarioKeys.productos() })
      queryClient.invalidateQueries({ queryKey: produccionKeys.lotes() })
      queryClient.invalidateQueries({ queryKey: ['alertas'] })
      void sincronizarColaOffline()
    }
    const onOffline = () => setEstaOnline(false)

    setEstaOnline(navigator.onLine)
    window.addEventListener('online',  onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online',  onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [queryClient, sincronizarColaOffline])

  useEffect(() => {
    void actualizarContadorOffline()
    if (navigator.onLine) void sincronizarColaOffline()
  }, [actualizarContadorOffline, sincronizarColaOffline])

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
    void cargar()
    const timer = window.setInterval(() => { if (navigator.onLine && document.visibilityState === 'visible') void cargar() }, 15000)
    const alVolver = () => { if (document.visibilityState === 'visible' && navigator.onLine) void cargar() }
    window.addEventListener('online', alVolver)
    document.addEventListener('visibilitychange', alVolver)
    return () => { clearInterval(timer); window.removeEventListener('online', alVolver); document.removeEventListener('visibilitychange', alVolver) }
  }, [supabase, usuario.restaurante_id, pathname])

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
          queryClient.invalidateQueries({ queryKey: alertasKeys.activas() })
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
          queryClient.invalidateQueries({ queryKey: produccionKeys.lotes() })
          queryClient.invalidateQueries({ queryKey: produccionKeys.loteActivo() })
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(canal) }
  }, [supabase, usuario.restaurante_id, queryClient])

  // ── Funciones del contexto ────────────────────────────────────
  const marcarAlertaLeida = useCallback(async (alertaId: string) => {
    if (!navigator.onLine) throw new Error('Necesitas conexión para marcar la alerta.')
    const { data, error } = await supabase.rpc('marcar_alerta_leida', { p_alerta: alertaId })
    if (error || !data) throw new Error('No se pudo marcar la alerta como leída. Comprueba tu conexión y permisos.')
    await queryClient.invalidateQueries({ queryKey: ['alertas'] })
    setAlertasNoLeidas((prev) => prev.filter((a) => a.id !== alertaId))
  }, [supabase, queryClient])

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
