export type ProductoBriefing = {
  id: string
  nombre: string
  cantidad_gramos: number | null
  stock_minimo_gramos: number | null
  unidad_display: string | null
  unidad_medida: string
  activo: boolean
  tipo_operativo: 'materia_prima' | 'insumo' | 'elaborado'
  stock_actual: number
  stock_minimo: number
}

export type IngredienteCarta = {
  cantidad: number | null
  cantidad_gramos: number | null
  unidad_medida: string
  producto: ProductoBriefing | ProductoBriefing[] | null
}

export type RecetaCarta = {
  id: string
  nombre: string
  rendimiento_porciones: number | null
  unidad_rendimiento: string | null
  es_produccion: boolean
  producto_salida_id: string | null
  ingredientes: IngredienteCarta[] | null
}

export type RecetaProduccion = {
  id: string
  nombre: string
  producto_salida_id: string | null
  cantidad_salida_gramos: number | null
  producto_salida: Pick<ProductoBriefing, 'id' | 'nombre' | 'unidad_display' | 'unidad_medida'> | Pick<ProductoBriefing, 'id' | 'nombre' | 'unidad_display' | 'unidad_medida'>[] | null
}

function productoDeIngrediente(ingrediente: IngredienteCarta): ProductoBriefing | null {
  return Array.isArray(ingrediente.producto) ? ingrediente.producto[0] ?? null : ingrediente.producto
}


type AlertaBriefing = { tipo: string; severidad: 'critica'|'alta'|'media'|'baja'; mensaje: string }
export function calcularBriefingOperativo({ stock, carta, produccion, registros, alertas, fuentesIncompletas }: {
 stock: ProductoBriefing[]; carta: RecetaCarta[]; produccion: RecetaProduccion[]; registros: {receta_id:string}[]; alertas: AlertaBriefing[]; fuentesIncompletas: boolean
}) {
  const productos = stock
  const recetasCarta = carta
  const recetasProduccion = produccion

  const compras = new Map<string, { producto: string; cantidad_sugerida: number; unidad: string; urgencia: 'critica' | 'alta' | 'media' | 'baja'; razon: string }>()
  const basePorUnidadCompra = new Map<string, number>()
  const producciones = new Map<string, { nombre: string; cantidad: number; unidad: string; prioridad: 'critica' | 'alta' | 'media' | 'baja'; razon: string }>()
  const riesgos = new Map<string, { tipo: string; descripcion: string; severidad: 'critica' | 'alta' | 'media' | 'baja'; accion_sugerida: string }>()
  const produccionPorSalida = new Map<string, RecetaProduccion>()

  for (const receta of recetasProduccion) {
    if (receta.producto_salida_id) produccionPorSalida.set(receta.producto_salida_id, receta)
    if (!receta.producto_salida_id && !(registros ?? []).some(r => r.receta_id === receta.id)) {
      producciones.set(receta.id, { nombre: `Revisar producción de ${receta.nombre}`, cantidad: 1, unidad: 'lote', prioridad: 'alta', razon: 'Receta de producción sin registro hoy. Confirma la cantidad necesaria para el turno.' })
    }
  }

  for (const producto of productos) {
    const stockActual = Number(producto.stock_actual ?? 0)
    const minimo = Number(producto.stock_minimo ?? 0)
    if (minimo <= 0) {
      if (stockActual <= 0) riesgos.set(`minimo-${producto.id}`, { tipo: 'configuracion', descripcion: `${producto.nombre}: sin existencias y sin stock mínimo configurado.`, severidad: 'alta', accion_sugerida: 'Comprueba el conteo, la unidad y el mínimo. No hay base suficiente para indicar una cantidad de compra.' })
      continue
    }
    if (stockActual >= minimo) continue
    riesgos.set(`stock-${producto.id}`, { tipo: 'stock_actual', descripcion: `${producto.nombre}: ${stockActual} ${producto.unidad_medida} disponibles; mínimo ${minimo}.`, severidad: stockActual <= 0 ? 'critica' : 'alta', accion_sugerida: producto.tipo_operativo === 'elaborado' ? 'Revisar la producción para reponer el mínimo.' : 'Revisar la compra para reponer el mínimo.' })
    if (producto.tipo_operativo === 'elaborado') {
      const recetaSalida = produccionPorSalida.get(producto.id)
      if (recetaSalida && Number(recetaSalida.cantidad_salida_gramos) > 0) {
        producciones.set(recetaSalida.id, {
          nombre: `Preparar ${recetaSalida.nombre}`,
          cantidad: Math.ceil(Math.max(Number(producto.stock_minimo_gramos) - Number(producto.cantidad_gramos), 0) / Number(recetaSalida.cantidad_salida_gramos)),
          unidad: 'tandas',
          prioridad: stockActual <= 0 ? 'critica' : 'alta',
          razon: `Faltan ${Number((minimo-stockActual).toFixed(3))} ${producto.unidad_medida} de ${producto.nombre} para el mínimo ${minimo}. Tandas completas según la salida de la receta; confirma rendimiento e ingredientes. No es un pronóstico de ventas.`,
        })
      }
    } else {
      const equivalencia = Number(producto.stock_minimo_gramos) / minimo
      if (equivalencia > 0) basePorUnidadCompra.set(producto.id, equivalencia)
      compras.set(producto.id, {
        producto: producto.nombre,
        cantidad_sugerida: Math.max(minimo - stockActual, 0),
        unidad: producto.unidad_display ?? producto.unidad_medida ?? 'g',
        urgencia: stockActual <= 0 ? 'critica' : 'alta',
        razon: 'Stock bajo en Inventario.',
      })
    }
    if (producto.tipo_operativo === 'elaborado' && !produccionPorSalida.has(producto.id)) riesgos.set(`reponer-${producto.id}`, {
      tipo: 'produccion', descripcion: `Reponer ${producto.nombre} en Stock disponible.`, severidad: 'alta', accion_sugerida: 'Asocia una receta de producción o actualiza las existencias.',
    })
  }

  for (const receta of recetasCarta) {
    const rendimientoBase = Math.max(Number(receta.rendimiento_porciones ?? 1), 1)
    const faltantes = (receta.ingredientes ?? []).flatMap((ingrediente) => {
      const producto = productoDeIngrediente(ingrediente)
      if (!producto || producto.activo === false) return []
      const requerido = Number(ingrediente.cantidad_gramos ?? 0) / rendimientoBase
      const disponible = Number(producto.cantidad_gramos ?? 0)
      if (requerido <= 0 || disponible >= requerido) return []
      return [{ producto, requerido, disponible, faltante: Math.max(requerido - disponible, 0), cantidadEnUnidad: Math.max(requerido-disponible,0)/requerido*Number(ingrediente.cantidad)/rendimientoBase, unidad: ingrediente.unidad_medida }]
    })

    if (faltantes.length === 0) continue

    riesgos.set(`carta-${receta.id}`, {
      tipo: 'carta',
      descripcion: `${receta.nombre} tiene faltantes: ${faltantes.map((item) => item.producto.nombre).join(', ')}.`,
      severidad: faltantes.some((item) => item.disponible <= 0) ? 'critica' : 'alta',
      accion_sugerida: 'Reponer inventario o producir elaborados antes del servicio.',
    })

    for (const faltante of faltantes) {
      if (faltante.producto.tipo_operativo === 'elaborado') {
        const recetaSalida = produccionPorSalida.get(faltante.producto.id)
        if (recetaSalida) {
          const previo = producciones.get(recetaSalida.id)
          producciones.set(recetaSalida.id, {
            nombre: `Preparar ${recetaSalida.nombre}`,
            cantidad: Math.max(previo?.cantidad ?? 0, Number(recetaSalida.cantidad_salida_gramos) > 0 ? Math.ceil(faltante.faltante / Number(recetaSalida.cantidad_salida_gramos)) : 1),
            unidad: 'tandas',
            prioridad: faltante.disponible <= 0 ? 'critica' : 'alta',
            razon: `${previo?.razon ?? ''} ${receta.nombre} necesita ${faltante.producto.nombre}. Comprueba ingredientes y salida antes de producir.`,
          })
        } else {
          riesgos.set(`elaborado-${receta.id}-${faltante.producto.id}`, {
            tipo: 'stock_elaborado',
            descripcion: `${receta.nombre} requiere ${faltante.producto.nombre} y no hay producción asociada para reponerlo.`,
            severidad: 'alta',
            accion_sugerida: 'Crea o ajusta una receta de producción para este elaborado.',
          })
        }
      } else {
        const previa = compras.get(faltante.producto.id)
        const equivalenciaPrevia = basePorUnidadCompra.get(faltante.producto.id)
        const mismaUnidad = previa?.unidad === faltante.unidad
        const cantidad = previa && equivalenciaPrevia ? Math.max(previa.cantidad_sugerida, faltante.faltante / equivalenciaPrevia)
          : previa && mismaUnidad ? Math.max(previa.cantidad_sugerida, faltante.cantidadEnUnidad) : faltante.cantidadEnUnidad
        if (!previa && faltante.cantidadEnUnidad > 0) basePorUnidadCompra.set(faltante.producto.id, faltante.faltante / faltante.cantidadEnUnidad)
        compras.set(faltante.producto.id, {
          producto: faltante.producto.nombre,
          cantidad_sugerida: cantidad,
          unidad: previa?.unidad ?? faltante.unidad,
          urgencia: previa?.urgencia === 'critica' || faltante.disponible <= 0 ? 'critica' : 'alta',
          razon: `${previa?.razon ?? ''} Faltante para elaborar una unidad de ${receta.nombre}; no es una estimación de demanda del día. Se toma el mayor faltante, no se suman demandas no estimadas.`,
        })
      }
    }
  }

  for (const alerta of alertas ?? []) {
    // Stock alerts are past events. Current risks use fresh product quantities.
    if (alerta.tipo === 'stock_critico') continue
    riesgos.set(`alerta-${alerta.tipo}-${alerta.mensaje}`, {
      tipo: alerta.tipo,
      descripcion: alerta.mensaje,
      severidad: alerta.severidad,
      accion_sugerida: 'Revisar antes del servicio.',
    })
  }

  if (fuentesIncompletas) riesgos.set('conexion', { tipo: 'gestion', descripcion: 'No se pudieron verificar todos los datos del turno.', severidad: 'alta', accion_sugerida: 'Revisa la conexión y actualiza el briefing antes del servicio.' })
  if (!productos.some((p) => p.tipo_operativo !== 'elaborado')) riesgos.set('inventario', { tipo: 'configuracion', descripcion: 'Carga primero las materias primas de tu cocina.', severidad: 'alta', accion_sugerida: 'Completa Inventario para calcular compras y producción.' })
  if (!productos.some((p) => p.tipo_operativo === 'elaborado')) riesgos.set('stock', { tipo: 'configuracion', descripcion: 'Registra las preparaciones listas para servir.', severidad: 'media', accion_sugerida: 'Actualiza Stock disponible.' })
  if (!recetasCarta.length) riesgos.set('carta', { tipo: 'configuracion', descripcion: 'Añade los platos que ofrece tu restaurante.', severidad: 'media', accion_sugerida: 'Completa Carta para relacionar platos con existencias.' })

  return { produccion_sugerida: [...producciones.values()], compras_sugeridas: [...compras.values()], riesgos: [...riesgos.values()] }
}
