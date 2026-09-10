'use client'

import { useEffect, useState } from 'react'
import { Building2 } from 'lucide-react'
import { obtenerClienteNavegador } from '@/lib/supabase/navegador'
import { useApp } from '@/providers/AppProvider'

type RestauranteResumen = { id: string; nombre: string; activo: boolean; plan: string; grupo_id: string | null; alertas: number; stockBajo: number; ventas: number }

export default function RestaurantesPage() {
  const { restaurante } = useApp()
  const [filas, setFilas] = useState<RestauranteResumen[]>([])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void cargar() }, [restaurante?.id])
  async function cargar() {
    if (!restaurante?.id) return
    const supabase = obtenerClienteNavegador()
    const { data: actual } = await supabase.from('restaurantes').select('id,nombre,activo,plan,grupo_id').eq('id', restaurante.id).single()
    const grupoId = (actual as { grupo_id?: string | null } | null)?.grupo_id
    const { data } = grupoId
      ? await supabase.from('restaurantes').select('id,nombre,activo,plan,grupo_id').eq('grupo_id', grupoId).order('nombre')
      : { data: null }
    const locales = ((data?.length ? data : [actual ?? restaurante]) ?? []) as RestauranteResumen[]
    const conKpis = await Promise.all(locales.map(async (local) => {
      const [alertas, productos, ventas] = await Promise.all([
        supabase.from('alertas_sistema').select('id', { count: 'exact', head: true }).eq('restaurante_id', local.id).eq('leida', false),
        supabase.from('productos').select('cantidad_gramos,stock_minimo_gramos').eq('restaurante_id', local.id).eq('activo', true),
        supabase.from('ventas_items').select('total').eq('restaurante_id', local.id).gte('fecha_venta', new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)),
      ])
      return { ...local, alertas: alertas.count ?? 0, stockBajo: (productos.data ?? []).filter((p) => Number(p.cantidad_gramos) <= Number(p.stock_minimo_gramos)).length, ventas: (ventas.data ?? []).reduce((total, venta) => total + Number(venta.total ?? 0), 0) }
    }))
    setFilas(conKpis)
  }
  const totalVentas = filas.reduce((sum, fila) => sum + fila.ventas, 0)
  const totalAlertas = filas.reduce((sum, fila) => sum + fila.alertas, 0)
  return <div className="px-4 pt-6 pb-28 max-w-lg mx-auto space-y-5"><div className="flex items-center gap-3"><div className="w-11 h-11 rounded-2xl bg-acento-suave flex items-center justify-center"><Building2 className="text-acento" /></div><div><h1 className="text-xl font-display font-bold text-texto-primario">Mis restaurantes</h1><p className="text-xs text-texto-apagado">Panel multi-local y operación consolidada</p></div></div><div className="grid grid-cols-2 gap-3"><div className="tarjeta p-3"><p className="text-2xs text-texto-apagado uppercase">Ventas 30 días</p><p className="text-lg font-mono text-texto-primario mt-1">${totalVentas.toLocaleString('es-CL')}</p></div><div className="tarjeta p-3"><p className="text-2xs text-texto-apagado uppercase">Alertas abiertas</p><p className={`text-lg font-mono mt-1 ${totalAlertas ? 'text-peligro' : 'text-texto-primario'}`}>{totalAlertas}</p></div></div><div className="grid gap-3">{filas.map((fila) => <div key={fila.id} className="rounded-2xl border border-fondo-borde bg-fondo-elevado p-4"><div className="flex items-center justify-between"><div><p className="text-sm font-medium text-texto-primario">{fila.nombre}</p><p className="text-xs text-texto-apagado mt-1 capitalize">Plan {fila.plan} · {fila.activo ? 'Activo' : 'Inactivo'}</p></div><span className="w-2 h-2 rounded-full bg-exito" /></div><div className="grid grid-cols-3 gap-2 mt-4 text-center"><div><p className="text-sm font-mono text-texto-primario">{fila.ventas.toLocaleString('es-CL')}</p><p className="text-2xs text-texto-apagado">Ventas</p></div><div><p className={`text-sm font-mono ${fila.alertas ? 'text-peligro' : 'text-texto-primario'}`}>{fila.alertas}</p><p className="text-2xs text-texto-apagado">Alertas</p></div><div><p className={`text-sm font-mono ${fila.stockBajo ? 'text-advertencia-texto' : 'text-texto-primario'}`}>{fila.stockBajo}</p><p className="text-2xs text-texto-apagado">Stock bajo</p></div></div></div>)}</div><p className="text-xs text-texto-apagado">Para consolidar nuevos locales, asigna el mismo grupo_id en Supabase y aplica la migración de operación avanzada.</p></div>
}
