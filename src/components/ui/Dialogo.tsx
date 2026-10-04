'use client'
import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export default function Dialogo({ titulo, cerrar, children }: { titulo: string; cerrar: () => void; children: ReactNode }) {
  const panel = useRef<HTMLDivElement>(null)
  const cierre = useRef(cerrar)
  cierre.current = cerrar
  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panel.current?.focus()
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); cierre.current(); return }
      if (e.key !== 'Tab') return
      const botones = panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href]')
      if (!botones?.length) { e.preventDefault(); return }
      const first = botones[0], last = botones[botones.length-1]
      if (e.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && (document.activeElement === last || document.activeElement === panel.current)) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', key)
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', key); anterior?.focus() }
  }, [])
  return createPortal(<div className="fixed inset-0 z-[100] bg-black/70 p-4 pb-24 flex items-center justify-center">
    <div ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-label={titulo} className="w-full max-w-lg max-h-[75dvh] overflow-y-auto rounded-2xl border border-fondo-borde bg-fondo-elevado p-5 space-y-4 text-texto-primario">
      <div className="flex justify-between items-center gap-3"><h2 className="font-bold">{titulo}</h2><button type="button" onClick={cerrar} className="min-h-12 px-3" aria-label="Cerrar diálogo">✕</button></div>{children}
    </div></div>, document.body)
}
