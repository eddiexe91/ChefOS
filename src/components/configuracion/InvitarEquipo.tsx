'use client'

import { useState, type FormEvent } from 'react'
import { Send, UserPlus } from 'lucide-react'

export default function InvitarEquipo() {
  const [email, setEmail] = useState('')
  const [nombre, setNombre] = useState('')
  const [rol, setRol] = useState('cocinero')
  const [mensaje, setMensaje] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function invitar(evento: FormEvent) {
    evento.preventDefault(); setEnviando(true); setMensaje('')
    const response = await fetch('/api/configuracion/equipo/invitar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, nombre, rol }) })
    const data = await response.json() as { error?: string }
    setEnviando(false)
    if (!response.ok) { setMensaje(data.error ?? 'No se pudo enviar la invitación.'); return }
    setMensaje('Invitación enviada. La persona recibirá un correo para crear su acceso.')
    setEmail(''); setNombre('')
  }

  return <form onSubmit={invitar} className="mt-5 space-y-3 rounded-xl border border-fondo-borde bg-fondo-card p-3"><div className="flex items-center gap-2 text-xs font-medium text-texto-primario"><UserPlus size={15} className="text-acento" /> Invitar a una persona</div><input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Correo electrónico" className="w-full min-h-10 rounded-lg border border-fondo-borde bg-fondo-elevado px-3 text-sm text-texto-primario" /><input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre (opcional)" className="w-full min-h-10 rounded-lg border border-fondo-borde bg-fondo-elevado px-3 text-sm text-texto-primario" /><div className="flex gap-2"><select value={rol} onChange={(e) => setRol(e.target.value)} className="min-h-10 flex-1 rounded-lg border border-fondo-borde bg-fondo-elevado px-3 text-xs text-texto-primario"><option value="cocinero">Cocinero/a</option><option value="chef_cocina">Chef de cocina</option><option value="chef_ejecutivo">Chef ejecutivo/a</option><option value="administrador">Administrador/a</option></select><button disabled={enviando} className="flex items-center gap-1 rounded-lg bg-acento px-3 text-xs text-white disabled:opacity-50"><Send size={13} />{enviando ? 'Enviando…' : 'Invitar'}</button></div>{mensaje && <p className="text-xs text-texto-secundario" role="status">{mensaje}</p>}</form>
}
