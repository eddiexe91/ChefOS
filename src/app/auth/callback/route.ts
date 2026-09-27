import { NextResponse, type NextRequest } from 'next/server'
import { crearClienteServidor } from '@/lib/supabase/servidor'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (!code) {
    return NextResponse.redirect(
      `${origin}/auth/login?error=Enlace inválido o expirado`
    )
  }

  const supabase = crearClienteServidor()

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('[auth/callback]', error.message)
    return NextResponse.redirect(
      `${origin}/auth/login?error=${encodeURIComponent(error.message.toLowerCase().includes('code verifier') || error.message.toLowerCase().includes('pkce')
        ? 'El enlace se abrió en otro navegador o dispositivo y no se pudo iniciar la sesión automáticamente. Prueba ingresar con tu correo y contraseña en ChefOS. Si aún pide verificar el correo, solicita un enlace nuevo desde ese dispositivo.'
        : 'No se pudo validar el enlace. Puede haber caducado o haberse utilizado. Solicita uno nuevo desde ChefOS.')}`
    )
  }

  const redirectUrl = next.startsWith('/') ? `${origin}${next}` : `${origin}/dashboard`
  return NextResponse.redirect(redirectUrl)
}
