/**
 * src/app/api/inventario/movimientos/route.ts
 *
 * API Route — Registrar un ajuste manual de inventario.
 *
 * POST /api/inventario/movimientos
 *
 * Flujo:
 * 1. Autenticar usuario via sesión Supabase.
 * 2. Obtener perfil del usuario (id, restaurante_id, activo).
 * 3. Validar el body de la request.
 * 4. Verificar que el producto exista y pertenezca al restaurante.
 * 5. Convertir el conteo físico a gramos vía convertirAGramos().
 * 6. Insertar en inventario_movimientos (tipo='ajuste'), con el conteo físico
 *    absoluto en cantidad_gramos.
 * 7. Retornar el movimiento creado con status 201.
 *
 * Arquitectura aprobada (DATABASE_SPEC.md, sección inventario_movimientos,
 * "Comportamiento específico para tipo = 'ajuste'" — Alternativa C):
 * el valor absoluto enviado en cantidad_gramos es únicamente un dato de
 * entrada para el trigger trigger_sincronizar_stock. La base de datos calcula
 * internamente el delta contra el stock vigente y sobrescribe cantidad_gramos
 * con ese delta antes de persistir la fila. Esta API Route NO calcula deltas,
 * NO actualiza productos.cantidad_gramos manualmente, y NO realiza un segundo
 * INSERT — toda esa responsabilidad pertenece exclusivamente al trigger.
 *
 * Convención de respuesta:
 * { data: T | null, error: string | null }
 */

import { NextResponse, type NextRequest } from 'next/server'
import { crearClienteServidor }           from '@/lib/supabase/servidor'

import {
  convertirAGramos,
  type UnidadEntrada,
} from '@/types/index'

// ─────────────────────────────────────────────────────────────
// Constantes de validación
// ─────────────────────────────────────────────────────────────

const UNIDADES_VALIDAS: readonly UnidadEntrada[] = [
  'g', 'kg', 'mg', 'oz', 'lb',
  'lt', 'ml', 'cl',
  'unidad', 'docena', 'caja', 'bandeja', 'porcion',
]

// ─────────────────────────────────────────────────────────────
// Tipos internos
// ─────────────────────────────────────────────────────────────

interface BodyAjuste {
  producto_id:     string
  cantidad_fisica: number
  unidad_medida:   UnidadEntrada
  motivo:          string | null
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
// POST /api/inventario/movimientos
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
  if (!('producto_id' in raw) || !('cantidad_fisica' in raw) || !('unidad_medida' in raw)) {
    return errorJSON(
      'Campos obligatorios faltantes: producto_id, cantidad_fisica, unidad_medida.',
      400
    )
  }

  if (typeof raw.producto_id !== 'string' || raw.producto_id.trim() === '') {
    return errorJSON('producto_id debe ser un string no vacío.', 400)
  }

  if (typeof raw.cantidad_fisica !== 'number' || raw.cantidad_fisica < 0) {
    return errorJSON('cantidad_fisica debe ser un número mayor o igual a 0.', 400)
  }

  if (
    typeof raw.unidad_medida !== 'string' ||
    !UNIDADES_VALIDAS.includes(raw.unidad_medida as UnidadEntrada)
  ) {
    return errorJSON(
      `unidad_medida debe ser una de: ${UNIDADES_VALIDAS.join(', ')}.`,
      400
    )
  }

  // Validar campo opcional si está presente
  if (
    'motivo' in raw &&
    raw.motivo !== null &&
    raw.motivo !== undefined &&
    typeof raw.motivo !== 'string'
  ) {
    return errorJSON('motivo debe ser un string o null.', 400)
  }

  // Construcción del body completamente validado
  const datos: BodyAjuste = {
    producto_id:     raw.producto_id.trim(),
    cantidad_fisica: raw.cantidad_fisica,
    unidad_medida:   raw.unidad_medida as UnidadEntrada,
    motivo:
      typeof raw.motivo === 'string' && raw.motivo.trim() !== ''
        ? raw.motivo.trim()
        : null,
  }

  // ── 4. Verificar producto ───────────────────────────────────
  const { data: producto, error: productoError } = await supabase
    .from('productos')
    .select('id, restaurante_id, costo_unitario_actual, costo_por_gramo, densidad_g_por_ml, peso_unitario_gramos')
    .eq('id', datos.producto_id)
    .single()

  if (productoError || !producto) {
    return errorJSON('Producto no encontrado.', 404)
  }

  // Verificación explícita de tenant — defensa en profundidad sobre RLS
  if (producto.restaurante_id !== perfil.restaurante_id) {
    return errorJSON('Sin autorización para ajustar inventario sobre este producto.', 403)
  }

  // ── 5. Convertir conteo físico a gramos ─────────────────────
  const conversion = convertirAGramos(
    datos.cantidad_fisica,
    datos.unidad_medida,
    producto.densidad_g_por_ml ?? undefined,
    producto.peso_unitario_gramos ?? undefined
  )

  const gramos: number | null = conversion.gramos

  if (gramos === null) {
    return errorJSON(
      'No fue posible convertir la cantidad a gramos. Verifica la unidad_medida o la configuración de densidad/peso unitario del producto.',
      400
    )
  }

  // ── 6. Insertar movimiento de ajuste ────────────────────────
  //
  // cantidad_gramos lleva el conteo físico ABSOLUTO (gramos). El trigger
  // trigger_sincronizar_stock calcula el delta real contra el stock vigente
  // y sobrescribe cantidad_gramos con ese delta antes de persistir la fila
  // (Alternativa C, DATABASE_SPEC.md aprobado). Esta ruta no calcula ningún
  // delta ni actualiza productos.cantidad_gramos manualmente.
  const { data: movimiento, error: movimientoError } = await supabase
    .from('inventario_movimientos')
    .insert({
      restaurante_id:  perfil.restaurante_id,
      producto_id:     datos.producto_id,
      tipo:            'ajuste',
      cantidad_gramos: gramos,
      costo_unitario:  producto.costo_unitario_actual,
      costo_por_gramo: producto.costo_por_gramo,
      motivo:          datos.motivo,
      referencia_id:   null,
      referencia_tipo: 'ajuste_manual',
      registrado_por:  perfil.id,
    })
    .select()
    .single()

  if (movimientoError || !movimiento) {
    console.error('[ChefOS/api/inventario/movimientos] Error al insertar ajuste:', movimientoError?.message)
    return errorJSON('Error al registrar el ajuste de inventario. Intenta nuevamente.', 500)
  }

  // ── 7. Respuesta exitosa ────────────────────────────────────
  return NextResponse.json(
    { data: movimiento, error: null },
    { status: 201 }
  )
}
