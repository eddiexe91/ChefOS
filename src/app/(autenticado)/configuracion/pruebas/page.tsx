import Link from 'next/link'
import DescargarArchivo from '@/components/ui/DescargarArchivo'

const archivos = [
  ['inventario.csv','Inventario inicial: Harina y Azúcar'],
  ['inventario-sumar.csv','Sumar 2 kg de Azúcar (solo tras importar el inicial)'],
  ['stock.csv','Stock disponible: Bisque'],
  ['ventas-operativas.csv','Una venta operativa: descuenta al confirmar consumo'],
  ['historial/productos.csv','Historial ficticio: productos'],
  ['historial/tickets.csv','Historial ficticio: tickets'],
  ['historial/ventas_detalle.csv','Historial ficticio: detalle'],
  ['historial/pagos.csv','Historial ficticio: pagos'],
]
export default function PruebasPage() {
  return <div className="max-w-lg mx-auto px-4 pt-6 pb-28 space-y-5"><Link className="text-acento" href="/configuracion">← Configuración</Link><h1 className="text-xl font-bold">Archivos de prueba 1.3.2</h1><p>QA significa pruebas de calidad. Todos estos productos y ventas son ficticios. Úsalos únicamente en tu restaurante de pruebas, nunca en Cocina Puerto ni en otro restaurante real.</p><p className="text-advertencia">Descargar no modifica datos. Importar Inventario/Stock sí agrega existencias. El historial POS no descuenta stock; la venta operativa sí lo hace al confirmar consumo. No mezcles los períodos de ambos importadores.</p>{archivos.map(([file,label])=><section key={file} className="tarjeta p-4 space-y-2"><p>{label}</p><DescargarArchivo url={`/qa/1.3.2/${file}`} nombre={file.split('/').pop()!} etiqueta={`Guardar ${file.split('/').pop()}`}/></section>)}<a className="text-acento block" href="https://github.com/eddiexe91/ChefOS/blob/main/GUIA_TESTEO_CHEFOS_1.3.2.md" target="_blank" rel="noopener noreferrer">Guía paso a paso →</a></div>
}
