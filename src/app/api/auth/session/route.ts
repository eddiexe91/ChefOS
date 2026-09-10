import { createChunks, DEFAULT_COOKIE_OPTIONS } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as {
    access_token?: string
    refresh_token?: string
    session?: Record<string, unknown>
  }

  if (!body.access_token || !body.refresh_token) {
    return NextResponse.json({ error: 'Sesión incompleta' }, { status: 400 })
  }

  // El cliente ya obtuvo la sesión de Supabase. No llamamos setSession aquí:
  // eso haría una segunda petición de red y falla en algunos WebView/túneles.
  // Escribimos la misma cookie chunked que usa createBrowserClient.
  const session = {
    ...(body.session ?? {}),
    access_token: body.access_token,
    refresh_token: body.refresh_token,
  }
  const response = NextResponse.json({ ok: true })
  const projectRef = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').hostname.split('.')[0]
  const cookieName = `sb-${projectRef}-auth-token`
  for (const chunk of createChunks(cookieName, JSON.stringify(session))) {
    response.cookies.set({
      name: chunk.name,
      value: chunk.value,
      ...DEFAULT_COOKIE_OPTIONS,
    })
  }
  return response
}
