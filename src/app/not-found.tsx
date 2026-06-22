import Link from 'next/link'
import { ChefHat } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-dvh bg-fondo-base flex flex-col items-center justify-center px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-fondo-elevado border border-fondo-borde flex items-center justify-center mb-6">
        <ChefHat size={28} className="text-texto-apagado" />
      </div>
      <h1 className="font-display text-2xl font-bold text-texto-primario mb-2">
        Página no encontrada
      </h1>
      <p className="text-sm font-sans text-texto-apagado mb-8 max-w-xs">
        Esta página no existe o fue movida a otra ubicación.
      </p>
      <Link
        href="/dashboard"
        className="inline-flex items-center justify-center
                   h-11 px-6 rounded-xl
                   bg-acento text-white
                   text-sm font-sans font-semibold
                   active:bg-acento-hover transition-colors"
      >
        Volver al inicio
      </Link>
    </div>
  )
}
