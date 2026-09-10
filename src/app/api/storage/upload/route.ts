import { NextResponse } from 'next/server'
import { crearClienteServidor } from '@/lib/supabase/servidor'

const BUCKETS = new Set(['recetas-imagenes', 'recetas-videos', 'facturas', 'importaciones'])

export async function POST(request: Request) {
  const supabase = crearClienteServidor()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
  const { data: perfil } = await supabase.from('usuarios').select('restaurante_id').eq('id', user.id).eq('activo', true).single()
  if (!perfil) return NextResponse.json({ error: 'Perfil no encontrado.' }, { status: 403 })
  const form = await request.formData()
  const archivo = form.get('archivo')
  const bucket = String(form.get('bucket') ?? '')
  if (!(archivo instanceof File) || !BUCKETS.has(bucket)) return NextResponse.json({ error: 'Archivo o bucket inválido.' }, { status: 400 })
  if (archivo.size > 25 * 1024 * 1024) return NextResponse.json({ error: 'El archivo supera el límite de 25 MB.' }, { status: 413 })
  const nombreSeguro = archivo.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const ruta = `${perfil.restaurante_id}/${crypto.randomUUID()}-${nombreSeguro}`
  const { error } = await supabase.storage.from(bucket).upload(ruta, await archivo.arrayBuffer(), { contentType: archivo.type || 'application/octet-stream', upsert: false })
  if (error) return NextResponse.json({ error: 'No se pudo guardar el archivo en Storage.' }, { status: 502 })
  const url = bucket === 'recetas-imagenes' || bucket === 'recetas-videos' ? supabase.storage.from(bucket).getPublicUrl(ruta).data.publicUrl : null
  return NextResponse.json({ bucket, ruta, url })
}
