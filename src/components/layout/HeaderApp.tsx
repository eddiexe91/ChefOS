'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ChefHat,
  Bell,
  User,
  Settings,
  LogOut,
  ChevronRight,
} from 'lucide-react'
import { clsx } from 'clsx'
import { obtenerClienteNavegador } from '@/lib/supabase/navegador'
import { useApp } from '@/providers/AppProvider'
import type { Restaurante, Usuario } from '@/types'

interface Props {
  usuario:     Pick<Usuario,     'id' | 'nombre' | 'email' | 'rol' | 'avatar_url' | 'restaurante_id'>
  restaurante: Pick<Restaurante, 'id' | 'nombre' | 'plan'>
}

const ETIQUETAS_ROL: Record<string, string> = {
  dueño:          'Dueño',
  administrador:  'Administrador',
  chef_ejecutivo: 'Chef Ejecutivo',
  chef_cocina:    'Chef de Cocina',
  cocinero:       'Cocinero',
}

export default function HeaderApp({ usuario, restaurante }: Props) {
  const supabase = obtenerClienteNavegador()
  const router   = useRouter()
  const { totalAlertas, estaOnline } = useApp()

  const [menuAbierto, setMenuAbierto] = useState(false)

  const cerrarSesion = async () => {
    setMenuAbierto(false)
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  const iniciales = usuario.nombre
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-[var(--z-header)]
                   bg-fondo-base/95 backdrop-blur-md
                   border-b border-fondo-borde"
        style={{
          paddingTop: 'env(safe-area-inset-top, 0px)',
          height: 'calc(56px + env(safe-area-inset-top, 0px))',
        }}
      >
        <div className="flex items-center justify-between px-4 h-14">

          {/* Logo + nombre restaurante */}
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 no-seleccionar min-w-0"
          >
            <div className="w-7 h-7 rounded-lg bg-acento flex items-center justify-center flex-shrink-0">
              <ChefHat size={14} className="text-white" />
            </div>
            <div className="min-w-0">
              <span className="font-display font-bold text-sm text-texto-primario tracking-tight leading-none block">
                ChefOS
              </span>
              {restaurante.nombre && (
                <span className="font-sans text-2xs text-texto-apagado leading-none block mt-0.5 overflow-hidden text-ellipsis whitespace-nowrap max-w-[120px]">
                  {restaurante.nombre}
                </span>
              )}
            </div>
          </Link>

          {/* Acciones */}
          <div className="flex items-center gap-1">

            {/* Punto online/offline */}
            <div
              className={clsx(
                'w-2 h-2 rounded-full flex-shrink-0 transition-colors duration-500',
                estaOnline ? 'bg-exito' : 'bg-advertencia animate-pulse-suave'
              )}
              title={estaOnline ? 'En línea' : 'Sin conexión'}
            />

            {/* Campana alertas */}
            <Link
              href="/alertas"
              className="btn-icono relative"
              aria-label={`Alertas${totalAlertas > 0 ? ` (${totalAlertas} sin leer)` : ''}`}
            >
              <Bell size={18} />
              {totalAlertas > 0 && (
                <span
                  className={clsx(
                    'absolute -top-0.5 -right-0.5',
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
            </Link>

            {/* Avatar */}
            <button
              onClick={() => setMenuAbierto(!menuAbierto)}
              className="w-8 h-8 rounded-full bg-fondo-elevado border border-fondo-borde
                         flex items-center justify-center ml-1
                         text-xs font-display font-semibold text-texto-secundario
                         active:bg-fondo-hover transition-colors"
              aria-label="Menú de usuario"
              aria-expanded={menuAbierto}
            >
              {usuario.avatar_url ? (
                <img
                  src={usuario.avatar_url}
                  alt={usuario.nombre}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                iniciales
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Backdrop */}
      {menuAbierto && (
        <div
          className="fixed inset-0 z-[calc(var(--z-dropdown)-1)]"
          onClick={() => setMenuAbierto(false)}
          aria-hidden="true"
        />
      )}

      {/* Dropdown */}
      {menuAbierto && (
        <div
          className={clsx(
            'fixed right-4 z-[var(--z-dropdown)]',
            'w-64 rounded-xl',
            'bg-fondo-elevado border border-fondo-borde',
            'shadow-modal animate-fade-in'
          )}
          style={{
            top: 'calc(56px + env(safe-area-inset-top, 0px) + 8px)',
          }}
        >
          {/* Info usuario */}
          <div className="px-4 py-3 border-b border-fondo-borde">
            <p className="text-sm font-sans font-medium text-texto-primario overflow-hidden text-ellipsis whitespace-nowrap">
              {usuario.nombre}
            </p>
            <p className="text-xs font-sans text-texto-apagado overflow-hidden text-ellipsis whitespace-nowrap mt-0.5">
              {usuario.email}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="px-2 py-0.5 rounded-full bg-acento-suave text-2xs font-sans font-medium text-acento">
                {ETIQUETAS_ROL[usuario.rol] ?? usuario.rol}
              </span>
              <span
                className={clsx(
                  'px-2 py-0.5 rounded-full text-2xs font-sans',
                  estaOnline
                    ? 'bg-exito-suave text-exito-texto'
                    : 'bg-advertencia-suave text-advertencia-texto'
                )}
              >
                {estaOnline ? 'En línea' : 'Sin conexión'}
              </span>
            </div>
          </div>

          {/* Opciones */}
          <div className="py-1">
            <Link
              href="/configuracion/perfil"
              onClick={() => setMenuAbierto(false)}
              className="flex items-center justify-between px-4 py-3
                         text-sm font-sans text-texto-secundario
                         active:bg-fondo-hover transition-colors"
            >
              <div className="flex items-center gap-3">
                <User size={16} className="text-texto-apagado" />
                Mi perfil
              </div>
              <ChevronRight size={14} className="text-texto-apagado" />
            </Link>

            <Link
              href="/configuracion"
              onClick={() => setMenuAbierto(false)}
              className="flex items-center justify-between px-4 py-3
                         text-sm font-sans text-texto-secundario
                         active:bg-fondo-hover transition-colors"
            >
              <div className="flex items-center gap-3">
                <Settings size={16} className="text-texto-apagado" />
                Configuración
              </div>
              <ChevronRight size={14} className="text-texto-apagado" />
            </Link>
          </div>

          {/* Cerrar sesión */}
          <div className="border-t border-fondo-borde py-1">
            <button
              onClick={cerrarSesion}
              className="flex items-center gap-3 w-full px-4 py-3
                         text-sm font-sans text-peligro-texto
                         active:bg-fondo-hover transition-colors text-left"
            >
              <LogOut size={16} />
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </>
  )
          }
