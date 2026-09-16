'use client'
import { useState } from 'react'
import { useUsuarios } from '@/hooks/useDominio'
import { useApp } from '@/providers/AppProvider'

export default function EquipoPage() {
  const { usuario, restaurante } = useApp()
  const equipo = useUsuarios()
  const [rol,setRol] = useState('cocinero')
  const [clave,setClave] = useState('')
  const [mensaje,setMensaje] = useState('')
  const [ocupado,setOcupado] = useState(false)
  async function crear() {
    setOcupado(true); setMensaje(''); setClave('')
    try { const r=await fetch('/api/configuracion/equipo/clave',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({rol})}); const j=await r.json(); if(!r.ok) throw new Error(j.error); setClave(j.clave) } catch(e) {setMensaje(e instanceof Error?e.message:'No se pudo generar la clave.')} finally {setOcupado(false)}
  }
  return <div className="max-w-lg mx-auto px-4 py-6 space-y-5"><h1 className="text-xl font-bold">Equipo de {restaurante?.nombre}</h1><p className="text-sm text-texto-secundario">Cada persona usa su cuenta. Inventario, carta y producción se comparten con todo el restaurante y se actualizan mientras trabajan.</p>
    {['dueño','administrador','chef_ejecutivo'].includes(usuario?.rol ?? '') && <section className="tarjeta p-4 space-y-3"><h2 className="font-medium">Invitar con clave de acceso</h2><label className="block text-sm">Rol del nuevo integrante<select className="campo-input mt-2" value={rol} onChange={e=>setRol(e.target.value)}><option value="cocinero">Cocinero</option><option value="chef_cocina">Chef de cocina</option>{usuario?.rol !== 'chef_ejecutivo' && <><option value="chef_ejecutivo">Chef ejecutivo</option><option value="administrador">Administración</option></>}</select></label><button disabled={ocupado} onClick={()=>void crear()} className="btn-primario">{ocupado?'Creando…':'Crear clave'}</button>{clave && <div className="space-y-2"><code className="block break-all rounded-lg bg-fondo-base p-3 text-acento select-all">{clave}</code><p className="text-xs">Comparte esta clave con una persona. En Crear restaurante debe elegir “Unirme a un restaurante”. Vence en 7 días y se usa una sola vez.</p></div>}{mensaje && <p role="alert">{mensaje}</p>}</section>}
    <section className="space-y-3"><h2 className="font-medium">Personas del restaurante</h2>{equipo.isError && <p>No se pudo cargar el equipo.</p>}{equipo.data?.map(p=><div key={p.id} className="tarjeta p-3"><p>{p.nombre}</p><p className="text-xs text-texto-apagado">{p.rol.replaceAll('_',' ')}</p></div>)}</section></div>
}
