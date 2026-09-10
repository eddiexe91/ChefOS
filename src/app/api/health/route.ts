import { NextResponse } from 'next/server'
import { crearClienteAdmin, crearClienteServidor } from '@/lib/supabase/servidor'

export async function GET() {
  const configuracion = {
    supabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')),
    supabaseAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes('placeholder')),
    anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
  }
  const supabase = crearClienteServidor()
  const admin = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? crearClienteAdmin()
    : supabase
  const { data: { user } } = await supabase.auth.getUser()
  const { data: buckets, error: storageError } = await admin.storage.listBuckets()
  const storageOk = !storageError
  return NextResponse.json({
    ok: configuracion.supabaseUrl && configuracion.supabaseAnonKey && storageOk,
    configuracion,
    autenticado: Boolean(user),
    storage: {
      accesible: storageOk,
      buckets: (buckets ?? []).map((bucket) => bucket.name),
    },
  })
}
