import Link from 'next/link'
import HistorialPOSCliente from '@/components/ventas/HistorialPOSCliente'

export default function PaginaImportarVentas() { return <div className="max-w-xl mx-auto px-4 pt-6 pb-32"><Link href="/ventas" className="block min-h-12 text-acento">← Ventas e importaciones del servicio</Link><HistorialPOSCliente /></div> }
