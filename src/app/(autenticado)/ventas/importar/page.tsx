import ImportarVentasCliente from '@/components/ventas/ImportarVentasCliente'
import HistorialPOSCliente from '@/components/ventas/HistorialPOSCliente'

export default function PaginaImportarVentas() { return <div className="max-w-xl mx-auto px-4 pt-6 pb-32"><HistorialPOSCliente /><details className="mt-8"><summary>Importación operativa CSV simple (no usar para históricos)</summary><ImportarVentasCliente /></details></div> }
