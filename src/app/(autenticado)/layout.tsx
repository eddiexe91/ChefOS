import { redirect } from 'next/navigation'
import { crearClienteServidor } from '@/lib/supabase/servidor'
import { AppProvider } from '@/providers/AppProvider'
import LayoutApp from '@/components/layout/LayoutApp'

export default async function LayoutAutenticado({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = crearClienteServidor()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: perfil } = await supabase
    .from('usuarios')
    .select('id, nombre, email, rol, avatar_url, restaurante_id, preferencias')
    .eq('id', user.id)
    .eq('activo', true)
    .single()

  if (!perfil) redirect('/auth/login')

  const { data: restaurante } = await supabase
    .from('restaurantes')
    .select('id, nombre, plan, config')
    .eq('id', perfil.restaurante_id)
    .single()

  if (!restaurante) redirect('/auth/login')

  return (
    <AppProvider usuario={perfil} restaurante={restaurante}>
      <LayoutApp usuario={perfil} restaurante={restaurante}>
        {children}
      </LayoutApp>
    </AppProvider>
  )
}
