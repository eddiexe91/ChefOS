import Link from 'next/link'
import { BarChart3, Building2, ChevronRight, ClipboardCheck, ShieldCheck, ShoppingCart, UserRound } from 'lucide-react'

export default function PaginaConfiguracion() {
  return (
    <div className="px-4 pt-6 pb-28 space-y-6 max-w-lg mx-auto">
      <section>
        <h1 className="text-xl font-display font-bold text-texto-primario">
          Configuración
        </h1>
        <p className="text-xs font-sans text-texto-apagado mt-1">
          Preferencias de tu cuenta y del restaurante.
        </p>
      </section>

      <nav className="rounded-xl bg-fondo-elevado border border-fondo-borde overflow-hidden">
        <Link
          href="/configuracion/perfil"
          className="flex items-center justify-between px-4 py-4 active:bg-fondo-hover transition-colors"
        >
          <span className="flex items-center gap-3 text-sm text-texto-primario">
            <UserRound size={18} className="text-acento" />
            Mi perfil
          </span>
          <ChevronRight size={17} className="text-texto-apagado" />
        </Link>
        <Link href="/compras" className="flex items-center justify-between px-4 py-4 border-t border-fondo-borde active:bg-fondo-hover transition-colors">
          <span className="flex items-center gap-3 text-sm text-texto-primario"><ShoppingCart size={18} className="text-acento" /> Compras</span>
          <ChevronRight size={17} className="text-texto-apagado" />
        </Link>
        <Link href="/configuracion/onboarding" className="flex items-center justify-between px-4 py-4 border-t border-fondo-borde active:bg-fondo-hover transition-colors">
          <span className="flex items-center gap-3 text-sm text-texto-primario"><ClipboardCheck size={18} className="text-acento" /> Configuración inicial</span>
          <ChevronRight size={17} className="text-texto-apagado" />
        </Link>
        <Link href="/configuracion/restaurantes" className="flex items-center justify-between px-4 py-4 border-t border-fondo-borde active:bg-fondo-hover transition-colors">
          <span className="flex items-center gap-3 text-sm text-texto-primario"><Building2 size={18} className="text-acento" /> Mis restaurantes</span>
          <ChevronRight size={17} className="text-texto-apagado" />
        </Link>
        <Link href="/analitica" className="flex items-center justify-between px-4 py-4 border-t border-fondo-borde active:bg-fondo-hover transition-colors">
          <span className="flex items-center gap-3 text-sm text-texto-primario"><BarChart3 size={18} className="text-acento" /> Analítica y snapshots</span>
          <ChevronRight size={17} className="text-texto-apagado" />
        </Link>
        <Link href="/configuracion/estado" className="flex items-center justify-between px-4 py-4 border-t border-fondo-borde active:bg-fondo-hover transition-colors">
          <span className="flex items-center gap-3 text-sm text-texto-primario"><ShieldCheck size={18} className="text-acento" /> Estado del sistema</span>
          <ChevronRight size={17} className="text-texto-apagado" />
        </Link>
      </nav>
    </div>
  )
}
