'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
export default function TutorialPrimeraVez({ id, titulo, texto }: { id:string; titulo:string; texto:string }) {
  const key=`chefos:tutorial:${id}`; const [abierto,setAbierto]=useState(false)
  useEffect(()=>{ if(new URLSearchParams(window.location.search).get('tutorial')==='1'||!localStorage.getItem(key)) setAbierto(true) },[key])
  function cerrar(){localStorage.setItem(key,'1');setAbierto(false)}
  if(!abierto)return null
  return <div className="fixed inset-0 z-40 bg-black/60 flex items-center justify-center p-5"><div className="w-full max-w-md rounded-2xl bg-fondo-elevado border border-fondo-borde p-5"><p className="text-xs uppercase tracking-wide text-acento">Tutorial ChefOS</p><h2 className="text-xl font-display font-bold text-texto-primario mt-2">{titulo}</h2><p className="text-sm text-texto-secundario leading-relaxed mt-3">{texto}</p><div className="flex gap-2 mt-6"><button onClick={cerrar} className="flex-1 min-h-11 rounded-xl border border-fondo-borde text-sm text-texto-secundario">Saltar tutorial</button><button onClick={cerrar} className="flex-1 min-h-11 rounded-xl bg-acento text-white text-sm">Entendido</button></div><Link href="/configuracion/tutoriales" onClick={cerrar} className="block text-center text-xs text-acento mt-4">Ver todos los tutoriales</Link></div></div>
}
