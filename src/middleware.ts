import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const RUTAS_PUBLICAS = [
  '/auth/login',
  '/auth/registro',
  '/auth/recuperar',
  '/auth/callback',
]

const RUTAS_RESTRINGIDAS: Record<string, string[]> = {
  '/ventas':                    ['dueño', 'administrador'],
  '/configuracion/restaurante': ['dueño'],
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(nombre: string) {
          return request.cookies.get(nombre)?.value
        },
        set(nombre: string, valor: string, opciones: CookieOptions) {
          request.cookies.set({ name: nombre, value: valor, ...opciones })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name: nombre, value: valor, ...opciones })
        },
        remove(nombre: string, opciones: CookieOptions) {
          request.cookies.set({ name: nombre, value: '', ...opciones })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name: nombre, value: '', ...opciones })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const ruta = request.nextUrl.pathname

  if (ruta === '/') {
    return NextResponse.redirect(
      new URL(user ? '/dashboard' : '/auth/login', request.url)
    )
  }

  const esPublica = RUTAS_PUBLICAS.some((r) => ruta.startsWith(r))
  if (esPublica) {
    if (user) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return response
  }

  if (!user) {
    const urlLogin = new URL('/auth/login', request.url)
    urlLogin.searchParams.set('redirigir_a', ruta)
    return NextResponse.redirect(urlLogin)
  }

  for (const [rutaRestringida, rolesPermitidos] of Object.entries(RUTAS_RESTRINGIDAS)) {
    if (ruta.startsWith(rutaRestringida)) {
      const { data: perfil } = await supabase
        .from('usuarios')
        .select('rol')
        .eq('id', user.id)
        .single()

      if (!perfil || !rolesPermitidos.includes(perfil.rol)) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
      break
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons|images|manifest.json|sw.js|workbox-.*).*)',
  ],
}
