import { NextResponse } from 'next/server'

export function GET() {
  const csv = '\ufeffnombre,unidad,costo,stock,stock_minimo,peso_unitario,tipo_operativo\nArroz,kg,1200,5,2,,materia_prima\nPesto,porcion,3500,12,4,80,elaborado\n'
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="plantilla-chefos-inventario.csv"',
      'Cache-Control': 'no-store',
    },
  })
}
