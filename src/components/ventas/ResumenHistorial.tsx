export default function ResumenHistorial({ resumen, completado }: { resumen: Record<string, unknown>; completado: boolean }) {
  const registros = (resumen.registros ?? {}) as Record<string, number>
  return <section className="rounded-xl border border-acento p-4 space-y-3">
    <h3 className="font-bold">{completado ? 'Historial incorporado a ChefOS' : 'Revisa antes de incorporar el historial'}</h3>
    <p>Período: {String(resumen.desde ?? '—')} a {String(resumen.hasta ?? '—')}</p>
    <dl className="grid grid-cols-2 gap-3 text-sm">{[['Cuentas / tickets',registros.tickets],['Líneas vendidas',registros.ventas_detalle],['Registros de pago',registros.pagos],['Productos de catálogo',registros.productos],['Errores que bloquean',resumen.errores],['Líneas ya existentes',resumen.lineas_existentes],...(completado ? [['Líneas nuevas incorporadas',resumen.lineas_nuevas]] : [])].map(([k,v])=><div key={String(k)}><dt className="text-texto-secundario">{String(k)}</dt><dd className="font-bold">{Number(v ?? 0).toLocaleString('es-CL')}</dd></div>)}</dl>
    <p className="text-sm">{completado ? 'Las ventas ya alimentan la memoria de ChefOS.' : 'Todavía no están incorporadas: el botón Confirmar las añadirá a la memoria de ventas.'} Tu inventario no se descuenta.</p>
    <p className="text-sm">{Number(resumen.productos_sin_mapear ?? 0)} productos sin equivalencia. No necesitas resolverlos todos para importar o consultar ventas. Después, empieza por los platos que sigues vendiendo.</p>
    <p className="text-sm">{Number(resumen.productos_sin_catalogo ?? 0)} productos vendidos sin catálogo actual: se conservan, incluso los no vigentes.</p>
    <details><summary className="min-h-12 text-acento">Ver advertencias y muestras de comprobación</summary>
      <p className="text-sm">Tickets sin detalle: {Number(resumen.tickets_sin_detalle ?? 0)}. Duplicados dentro de archivos: {Number(resumen.duplicados_archivo ?? 0)}.</p>
      {['muestra_tickets','muestra_lineas'].map(k=><div key={k} className="space-y-2 mt-3"><h4>{k==='muestra_tickets'?'Totales oficiales de algunas cuentas':'Ejemplos de productos vendidos'}</h4>{Array.isArray(resumen[k]) && (resumen[k] as Record<string, unknown>[]).map((fila,i)=><p key={i} className="text-sm border border-fondo-borde p-2 rounded">{Object.entries(fila).map(([n,v])=>`${n.replaceAll('_',' ')}: ${v}`).join(' · ')}</p>)}</div>)}
    </details>
  </section>
}
