import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database.types'

export function crearClienteNavegador() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

let instancia: ReturnType<typeof crearClienteNavegador> | null = null

export function obtenerClienteNavegador() {
  if (!instancia) {
    instancia = crearClienteNavegador()
  }
  return instancia
}
