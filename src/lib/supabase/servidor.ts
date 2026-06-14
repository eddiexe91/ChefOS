import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database.types'

export function crearClienteServidor() {
  const cookieStore = cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(nombre: string) {
          return cookieStore.get(nombre)?.value
        },
        set(nombre: string, valor: string, opciones: CookieOptions) {
          try {
            cookieStore.set({ name: nombre, value: valor, ...opciones })
          } catch {
            // En Server Components de solo lectura — el middleware refresca la sesión
          }
        },
        remove(nombre: string, opciones: CookieOptions) {
          try {
            cookieStore.set({ name: nombre, value: '', ...opciones })
          } catch {
            // Mismo caso que set()
          }
        },
      },
    }
  )
}

export function crearClienteAdmin() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
