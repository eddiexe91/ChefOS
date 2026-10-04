'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { useApp } from '@/providers/AppProvider'
import { obtenerClienteNavegador } from '@/lib/supabase/navegador'
import type { AlertaSistema } from '@/types'

export default function AlertasCliente() {
  const { usuario, marcarAlertaLeida } = useApp()
  const [filtro, setFiltro] = useState('pendientes')
  const [pagina, setPagina] = useState(0)
  const [ocupado, setOcupado] = useState('')
  const [mensaje, setMensaje] = useState('')
  const consulta = useQuery({
    queryKey: ['alertas', 'historial', usuario?.restaurante_id, filtro, pagina], enabled: !!usuario?.restaurante_id, refetchInterval: 15000,
    queryFn: async () => {
      let q = obtenerClienteNavegador().from('alertas_sistema').select('*', { count: 'exact' }).eq('restaurante_id', usuario!.restaurante_id).order('creado_en', { ascending: false }).order('id').range(pagina*25, pagina*25+24)
      if (filtro !== 'todas') q = q.eq('leida', filtro === 'leidas')
      const { data, error, count } = await q
      if (error) throw error
      return { filas: (data ?? []) as AlertaSistema[], total: count ?? 0 }
    },
  })
  async function leer(id: string) {
    if (ocupado) return
    setOcupado(id); setMensaje('')
    try { await marcarAlertaLeida(id); setMensaje('Marcada como leída. Sigue disponible en Leídas.'); await consulta.refetch() }
    catch { setMensaje('No se pudo guardar la lectura. Comprueba la conexión.') }
    finally { setOcupado('') }
  }
  return <div className="max-w-lg mx-auto px-4 py-6 pb-28 space-y-4 text-texto-primario">
    <h1 className="text-xl font-bold">Alertas y su historial</h1>
    <p className="text-sm text-texto-secundario">Cada alerta conserva lo que ocurrió en su fecha. Leer no repone stock; el Briefing calcula los faltantes actuales.</p>
    <div className="flex gap-2 flex-wrap">{[['pendientes','Sin leer'],['leidas','Leídas'],['todas','Todas']].map(([valor,nombre]) => <button key={valor} onClick={() => { setFiltro(valor); setPagina(0) }} aria-pressed={filtro===valor} className={`min-h-12 px-4 rounded-xl border ${filtro===valor?'border-acento text-acento':'border-fondo-borde'}`}>{nombre}</button>)}</div>
    <button className="btn-secundario" disabled={consulta.isFetching} onClick={() => void consulta.refetch()}>{consulta.isFetching ? 'Actualizando…' : 'Actualizar alertas'}</button>
    {mensaje && <p role="status">{mensaje}</p>}
    {consulta.isError && <p role="alert">No se pudo verificar el historial de alertas. Comprueba tu conexión.</p>}
    {consulta.isSuccess && <p className="text-sm">{consulta.data.total} alertas en este filtro.</p>}
    {consulta.data?.filas.map(a => <article key={a.id} className="tarjeta p-4 space-y-3">
      <div className="flex justify-between text-xs"><span>{a.tipo.replaceAll('_',' ')}</span><span>{a.severidad} · {a.leida?'Leída':'Sin leer'}</span></div>
      <p>{a.mensaje}</p><p className="text-xs text-texto-secundario">{new Date(a.creado_en).toLocaleString('es-CL')}</p>
      {a.tipo === 'stock_critico' && <Link className="block text-acento min-h-11" href="/dashboard">Consultar el faltante actual en Inicio →</Link>}
      {!a.leida && <button disabled={!!ocupado} className="btn-secundario" onClick={() => void leer(a.id)}>{ocupado===a.id?'Guardando…':'Marcar como leída'}</button>}
    </article>)}
    <div className="flex justify-between"><button className="btn-secundario" disabled={pagina===0} onClick={() => setPagina(pagina-1)}>Anterior</button><span>Página {pagina+1}</span><button className="btn-secundario" disabled={!consulta.data || (pagina+1)*25>=consulta.data.total} onClick={() => setPagina(pagina+1)}>Siguiente</button></div>
  </div>
}
