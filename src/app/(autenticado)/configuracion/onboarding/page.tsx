'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Check, ChevronRight, Download, PackagePlus, Users } from 'lucide-react'
import { useApp } from '@/providers/AppProvider'
import InvitarEquipo from '@/components/configuracion/InvitarEquipo'

const PASOS = [
  ['Identidad', 'Confirma el nombre, zona horaria y tu cargo dentro del restaurante.'],
  ['Carta', 'Define los platos que ofrece tu restaurante. Los productos y materias primas se administran en Inventario.'],
  ['Inventario', 'Revisa el stock mínimo y ajusta las cantidades cuando hagas el primer conteo físico.'],
  ['Equipo', 'Prepara el acceso de tu equipo; podrás añadir colaboradores desde la gestión del restaurante.'],
  ['Listo', 'Tu briefing operativo quedará preparado cada mañana.'],
]

export default function OnboardingPage() {
  const { restaurante, usuario } = useApp()
  const [paso, setPaso] = useState(0)
  const [nombre, setNombre] = useState(restaurante?.nombre ?? '')
  const [guardando, setGuardando] = useState(false)
  const [archivo, setArchivo] = useState<File | null>(null)
  const [tipoImportacion, setTipoImportacion] = useState<'recetas' | 'productos'>('recetas')
  const [mensajeImportacion, setMensajeImportacion] = useState('')
  const [rol, setRol] = useState<string>(usuario?.rol ?? 'dueño')
  const [zonaHoraria, setZonaHoraria] = useState('America/Santiago')

  useEffect(() => {
    if (usuario?.rol) setRol(usuario.rol)
  }, [usuario?.rol])

  useEffect(() => {
    if (!restaurante?.id) return
    const guardado = window.localStorage.getItem(`chefos:onboarding:paso:${restaurante.id}`)
    if (guardado) setPaso(Math.min(PASOS.length - 1, Number(guardado) || 0))
  }, [restaurante?.id])

  useEffect(() => {
    if (restaurante?.id) window.localStorage.setItem(`chefos:onboarding:paso:${restaurante.id}`, String(paso))
  }, [paso, restaurante?.id])

  async function importar() {
    if (!archivo) return
    setGuardando(true)
    const form = new FormData()
    form.set('archivo', archivo)
    form.set('tipo', tipoImportacion)
    const response = await fetch('/api/onboarding/importar', { method: 'POST', body: form })
    const data = await response.json() as { importados?: number; error?: string }
    setMensajeImportacion(response.ok ? `${data.importados ?? 0} registros importados.` : (data.error ?? 'No se pudo importar.'))
    setGuardando(false)
  }

  async function continuar() {
    if (paso < PASOS.length - 1) return setPaso((actual) => actual + 1)
    setGuardando(true)
    const response = await fetch('/api/onboarding/configurar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre, rol, zona_horaria: zonaHoraria }) })
    if (!response.ok) { const data = await response.json() as { error?: string }; setMensajeImportacion(data.error ?? 'No se pudo guardar la configuración.'); setGuardando(false); return }
    setGuardando(false)
    if (restaurante?.id) window.localStorage.removeItem(`chefos:onboarding:paso:${restaurante.id}`)
  }

  return <div className="px-4 pt-8 pb-28 max-w-lg mx-auto space-y-6">
    <div><p className="text-xs uppercase tracking-wide text-acento">Configuración inicial</p><h1 className="text-2xl font-display font-bold text-texto-primario mt-1">Pongamos ChefOS a trabajar</h1><p className="text-sm text-texto-secundario mt-2">Cinco pasos breves para adaptar la operación a tu restaurante.</p></div>
    <div className="flex gap-1">{PASOS.map((_, i) => <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= paso ? 'bg-acento' : 'bg-fondo-borde'}`} />)}</div>
    <div className="rounded-2xl border border-fondo-borde bg-fondo-elevado p-5 min-h-56"><div className="w-12 h-12 rounded-2xl bg-acento-suave flex items-center justify-center mb-4"><Check className="text-acento" /></div><h2 className="text-lg font-display font-bold text-texto-primario">{PASOS[paso][0]}</h2><p className="text-sm text-texto-secundario mt-2 leading-relaxed">{PASOS[paso][1]}</p>{paso === 0 && <div className="mt-5 space-y-3"><input value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full min-h-12 rounded-xl border border-fondo-borde bg-fondo-card px-3 text-sm text-texto-primario" placeholder="Nombre del restaurante" /><select value={rol} onChange={(e) => setRol(e.target.value)} className="w-full min-h-12 rounded-xl border border-fondo-borde bg-fondo-card px-3 text-sm text-texto-primario"><option value="dueño">Dueño/a</option><option value="administrador">Administrador/a</option><option value="chef_ejecutivo">Chef ejecutivo/a</option><option value="chef_cocina">Chef de cocina</option><option value="cocinero">Cocinero/a</option></select><select value={zonaHoraria} onChange={(e) => setZonaHoraria(e.target.value)} className="w-full min-h-12 rounded-xl border border-fondo-borde bg-fondo-card px-3 text-sm text-texto-primario"><option value="America/Santiago">Chile continental</option><option value="America/Argentina/Buenos_Aires">Argentina</option><option value="America/Lima">Perú</option><option value="America/Bogota">Colombia</option><option value="America/Mexico_City">México centro</option><option value="Europe/Madrid">España</option></select></div>}{paso === 1 && <div className="mt-5 space-y-3"><div className="rounded-xl bg-acento-suave p-3 text-xs text-texto-secundario"><p className="font-medium text-texto-primario">Carta y platos</p><p className="mt-1">Marca tus recetas como “En carta” para que aparezcan en el menú del restaurante.</p><Link href="/carta" className="mt-2 inline-flex items-center gap-1 text-acento font-medium"><PackagePlus size={14} /> Abrir Carta</Link></div></div>}{paso === 2 && <div className="mt-5 space-y-3"><p className="text-xs text-texto-apagado">Crea productos y ajusta su stock directamente desde Inventario.</p><Link href="/inventario" className="inline-flex items-center gap-2 rounded-xl border border-acento px-4 py-2.5 text-xs text-acento"><PackagePlus size={15} /> Abrir inventario</Link><div className="flex items-center justify-between gap-3"><input type="file" accept=".csv,text/csv" onChange={(e) => { setArchivo(e.target.files?.[0] ?? null); setTipoImportacion('productos') }} className="min-w-0 w-full text-xs text-texto-secundario" />{archivo && tipoImportacion === 'productos' && <button type="button" onClick={() => void importar()} disabled={guardando} className="flex-shrink-0 min-h-10 rounded-xl border border-acento px-3 text-acento text-xs disabled:opacity-50">{guardando ? 'Importando…' : 'Importar'}</button>}</div><a href="/api/onboarding/plantilla-inventario" download className="inline-flex items-center gap-1 text-xs text-acento"><Download size={13} /> Descargar plantilla CSV</a>{mensajeImportacion && <p className="text-xs text-exito-texto">{mensajeImportacion}</p>}</div>}{paso === 3 && <div className="mt-5"><div className="rounded-xl bg-fondo-card border border-fondo-borde p-3 text-xs text-texto-secundario flex gap-2"><Users size={16} className="text-acento flex-shrink-0" /><span>Envía una invitación y asigna el permiso correcto.</span></div><InvitarEquipo /></div>}</div>
    <button onClick={continuar} disabled={guardando} className="w-full min-h-12 rounded-xl bg-acento text-white flex items-center justify-center gap-2 disabled:opacity-50">{paso === PASOS.length - 1 ? 'Terminar configuración' : 'Continuar'}<ChevronRight size={18} /></button>
  </div>
}
