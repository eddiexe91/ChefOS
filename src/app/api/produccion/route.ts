/**
 * src/app/api/produccion/route.ts
 *
 * API Route — Registrar producción en un lote activo.
 *
 * POST /api/produccion
 *
 * Flujo:
 * 1. Autenticar usuario via sesión Supabase.
 * 2. Obtener perfil del usuario (id, restaurante_id, activo).
 * 3. Validar el body de la request.
 * 4. Verificar que el lote exista, pertenezca al restaurante y esté en progreso.
 * 5. Insertar en produccion_registros.
 * 6. Retornar el registro creado con status 201.
 *
 * TODO:
 * Reemplazar el INSERT directo por la llamada a la RPC
 * registrar_produccion_completa() cuando se confirme su firma exacta.
 * La RPC es atómica y descuenta inventario automáticamente.
 *
 * Convención de respuesta:
 * { data: T | null, error: string | null }
 */

import { NextResponse, type NextRequest } from 'next/server'
import { crearClienteServidor }           from '@/lib/supabase/servidor'

// ─────────────────────────────────────────────────────────────
// Tipos internos
// ─────────────────────────────────────────────────────────────

interface BodyProduccion {
  lote_id:            string
  cantidad_producida: number
  unidad:             string
  receta_id:          string | null
  notas:              string | null
}

// ─────────────────────────────────────────────────────────────
// Helper — respuesta de error
// ─────────────────────────────────────────────────────────────

function errorJSON(mensaje: string, status: number) {
  return NextResponse.json(
    { data: null, error: mensaje },
    { status }
  )
}

// ─────────────────────────────────────────────────────────────
// POST /api/produccion
// ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const supabase = crearClienteServidor()

  // ── 1. Autenticación ───────────────────────────────────────
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return errorJSON('No autenticado.', 401)
  }

  // ── 2. Perfil del usuario ──────────────────────────────────
  const { data: perfil, error: perfilError } = await supabase
    .from('usuarios')
    .select('id, restaurante_id, activo')
    .eq('id', user.id)
    .eq('activo', true)
    .single()

  if (perfilError || !perfil) {
    return errorJSON('Usuario no encontrado o inactivo.', 401)
  }

  // ── 3. Parsear y validar body ──────────────────────────────
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return errorJSON('Body inválido — se esperaba JSON.', 400)
  }

  // Verificar que body sea un objeto no nulo antes de cualquier cast
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return errorJSON('El body debe ser un objeto JSON.', 400)
  }

  // Cast seguro: body ya fue verificado como objeto no nulo y no array
  const raw = body as Record<string, unknown>

  // Validar campos obligatorios
  if (!('lote_id' in raw) || !('cantidad_producida' in raw) || !('unidad' in raw)) {
    return errorJSON(
      'Campos obligatorios faltantes: lote_id, cantidad_producida, unidad.',
      400
    )
  }

  if (typeof raw.lote_id !== 'string' || raw.lote_id.trim() === '') {
    return errorJSON('lote_id debe ser un string no vacío.', 400)
  }

  if (typeof raw.cantidad_producida !== 'number' || raw.cantidad_producida <= 0) {
    return errorJSON('cantidad_producida debe ser un número mayor que 0.', 400)
  }

  if (typeof raw.unidad !== 'string' || raw.unidad.trim() === '') {
    return errorJSON('unidad debe ser un string no vacío.', 400)
  }

  // Validar campos opcionales si están presentes
  if (
    'receta_id' in raw &&
    raw.receta_id !== null &&
    raw.receta_id !== undefined &&
    typeof raw.receta_id !== 'string'
  ) {
    return errorJSON('receta_id debe ser un string o null.', 400)
  }

  if (
    'notas' in raw &&
    raw.notas !== null &&
    raw.notas !== undefined &&
    typeof raw.notas !== 'string'
  ) {
    return errorJSON('notas debe ser un string o null.', 400)
  }

  // Construcción del body completamente validado
  const datos: BodyProduccion = {
    lote_id:            raw.lote_id.trim(),
    cantidad_producida: raw.cantidad_producida,
    unidad:             raw.unidad.trim(),
    receta_id:
      typeof raw.receta_id === 'string' && raw.receta_id.trim() !== ''
        ? raw.receta_id.trim()
        : null,
    notas:
      typeof raw.notas === 'string' && raw.notas.trim() !== ''
        ? raw.notas.trim()
        : null,
  }

  // ── 4. Verificar lote ──────────────────────────────────────
  const { data: lote, error: loteError } = await supabase
    .from('produccion_lotes')
    .select('id, restaurante_id, estado, turno, fecha')
    .eq('id', datos.lote_id)
    .single()

  if (loteError || !lote) {
    return errorJSON('Lote no encontrado.', 404)
  }

  // Verificación explícita de tenant — defensa en profundidad sobre RLS
  if (lote.restaurante_id !== perfil.restaurante_id) {
    return errorJSON('Sin autorización para registrar en este lote.', 403)
  }

  // Verificar que el lote esté activo
  if (lote.estado !== 'en_progreso') {
    return errorJSON(
      `No se puede registrar producción en un lote con estado "${lote.estado}".`,
      409
    )
  }

  // ── 5. Insertar registro de producción ─────────────────────
  const { data: registro, error: insertError } = await supabase
    .from('produccion_registros')
    .insert({
      restaurante_id:        perfil.restaurante_id,
      lote_id:               datos.lote_id,
      receta_id:             datos.receta_id,
      cantidad_producida:    datos.cantidad_producida,
      unidad:                datos.unidad,
      fecha_produccion:      lote.fecha,
      turno:                 lote.turno,
      responsable_id:        perfil.id,
      notas:                 datos.notas,
      inventario_descontado: false,
    })
    .select()
    .single()

  if (insertError || !registro) {
    console.error('[ChefOS/api/produccion] Error al insertar:', insertError?.message)
    return errorJSON('Error al registrar la producción. Intenta nuevamente.', 500)
  }

  // ── 6. Respuesta exitosa ───────────────────────────────────
  return NextResponse.json(
    { data: registro, error: null },
    { status: 201 }
  )
    }
