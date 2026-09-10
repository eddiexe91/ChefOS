'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard,
  BookOpen,
  FlameKindling,
  Boxes,
  Bell,
} from 'lucide-react'
import { clsx } from 'clsx'
import { useApp } from '@/providers/AppProvider'
import HeaderApp from '@/components/layout/HeaderApp'
import type { Restaurante, Usuario } from '@/types'

interface Props {
  usuario:     Pick<Usuario,     'id' | 'nombre' | 'email' | 'rol' | 'avatar_url' | 'restaurante_id'>
  restaurante: Pick<Restaurante, 'id' | 'nombre' | 'plan'>
  children:    React.ReactNode
}

const NAV_ITEMS = [
  {
    href:          '/dashboard',
    icono:         LayoutDashboard,
    etiqueta:      'Inicio',
    activo:        (r: string) => r === '/dashboard' || r === '/',
    esPrincipal:   false,
    tieneContador: false,
  },
  {
    href:          '/biblioteca',
    icono:         BookOpen,
    etiqueta:      'Recetas',
    activo:        (r: string) => r.startsWith('/biblioteca'),
    esPrincipal:   false,
    tieneContador: false,
  },
  {
    href:          '/produccion',
    icono:         FlameKindling,
    etiqueta:      'Producción',
    activo:        (r: string) => r.startsWith('/produccion'),
    esPrincipal:   true,
    tieneContador: false,
  },
  {
    href:          '/inventario',
    icono:         Boxes,
    etiqueta:      'Inventario',
    activo:        (r: string) => r.startsWith('/inventario') || r.startsWith('/mermas'),
    esPrincipal:   false,
    tieneContador: false,
  },
  {
    href:          '/alertas',
    icono:         Bell,
    etiqueta:      'Alertas',
    activo:        (r: string) => r.startsWith('/alertas'),
    esPrincipal:   false,
    tieneContador: true,
  },
] as const

export default function LayoutApp({ usuario, restaurante, children }: Props) {
  const ruta = usePathname()
  const { totalAlertas, estaOnline, accionesPendientes } = useApp()

  return (
    <div className="app-layout">
      <HeaderApp usuario={usuario} restaurante={restaurante} />

      {/* Banner offline */}
      {(!estaOnline || accionesPendientes > 0) && (
        <div
          className={clsx(
            'fixed left-0 right-0 z-40 text-center py-1.5 text-xs font-sans font-medium',
            'pt-[calc(env(safe-area-inset-top,0px)+56px)]',
            !estaOnline
              ? 'bg-advertencia text-texto-inverso'
              : 'bg-info-suave text-info-texto'
          )}
        >
          {!estaOnline
            ? `Sin conexión${accionesPendientes > 0
                ? ` · ${accionesPendientes} pendiente${accionesPendientes !== 1 ? 's' : ''}`
                : ''
              }`
            : `Sincronizando ${accionesPendientes} acción${accionesPendientes !== 1 ? 'es' : ''}...`
          }
        </div>
      )}

      <main
        className={clsx(
          'app-contenido',
          (!estaOnline || accionesPendientes > 0) && 'mt-7'
        )}
      >
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-[var(--z-nav)]
                   bg-fondo-card/95 backdrop-blur-md
                   border-t border-fondo-borde"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          height: 'calc(64px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <div className="flex items-center h-16 max-w-lg mx-auto">
          {NAV_ITEMS.map(({ href, icono: Icono, etiqueta, activo, esPrincipal, tieneContador }) => {
            const estaActivo = activo(ruta)

            if (esPrincipal) {
              return (
                <Link
                  key={href}
                  href={href}
                  className="flex-1 flex flex-col items-center justify-center gap-0.5 no-seleccionar"
                >
                  <div
                    className={clsx(
                      'w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200',
                      estaActivo
                        ? 'bg-acento shadow-acento scale-110'
                        : 'bg-acento/90 shadow-acento'
                    )}
                  >
                    <Icono size={20} className="text-white" strokeWidth={2} />
                  </div>
                  <span
                    className={clsx(
                      'text-2xs font-sans leading-none',
                      estaActivo ? 'text-acento font-medium' : 'text-texto-apagado'
                    )}
                  >
                    {etiqueta}
                  </span>
                </Link>
              )
            }

            return (
              <Link
                key={href}
                href={href}
                className={clsx(
                  'flex-1 flex flex-col items-center justify-center gap-1 h-full',
                  'transition-colors duration-150 no-seleccionar',
                  estaActivo
                    ? 'text-acento'
                    : 'text-texto-apagado active:text-texto-secundario'
                )}
              >
                <div className="relative">
                  <Icono
                    size={21}
                    strokeWidth={estaActivo ? 2 : 1.5}
                    className="transition-all duration-150"
                  />
                  {tieneContador && totalAlertas > 0 && (
                    <span
                      className={clsx(
                        'absolute -top-1.5 -right-1.5',
                        'min-w-[16px] h-4 px-0.5 rounded-full',
                        'bg-peligro text-white',
                        'text-2xs font-display font-bold',
                        'flex items-center justify-center',
                        'animate-pulse-suave'
                      )}
                    >
                      {totalAlertas > 9 ? '9+' : totalAlertas}
                    </span>
                  )}
                  {estaActivo && (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-acento" />
                  )}
                </div>
                <span
                  className={clsx(
                    'text-2xs font-sans leading-none',
                    estaActivo ? 'font-medium' : 'font-normal'
                  )}
                >
                  {etiqueta}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
