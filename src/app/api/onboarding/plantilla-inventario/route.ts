import { NextResponse } from 'next/server'

export function GET() {
  const csv = '\ufeffnombre,unidad,costo,stock,stock_minimo,peso_unitario\nArroz,kg,1200,5,2,\nTomate,kg,900,3,1,\n'
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="plantilla-chefos-inventario.csv"',
      'Cache-Control': 'no-store',
    },
  })
}
