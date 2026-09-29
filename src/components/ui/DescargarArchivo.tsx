'use client'

import { useState } from 'react'
import { Capacitor, registerPlugin } from '@capacitor/core'
import { Download } from 'lucide-react'

const archivos = registerPlugin<{ guardar(datos: { nombre: string; contenido: string }): Promise<void> }>('ChefArchivos')

export default function DescargarArchivo({ url, nombre, etiqueta = 'Descargar plantilla CSV' }: { url: string; nombre: string; etiqueta?: string }) {
  const [ocupado, setOcupado] = useState(false)
  const [mensaje, setMensaje] = useState('')
  async function descargar() {
    setOcupado(true); setMensaje('')
    try {
      const r = await fetch(url, { cache: 'no-store' })
      if (!r.ok) throw new Error('No se pudo obtener el archivo.')
      if (r.redirected || r.headers.get('Content-Type')?.includes('text/html')) throw new Error('La sesión cambió. Vuelve a iniciar sesión antes de descargar el CSV.')
      const contenido = await r.text()
      if (Capacitor.isNativePlatform()) {
        await archivos.guardar({ nombre, contenido })
        setMensaje('Archivo guardado en la ubicación que elegiste.')
      } else {
        const enlace = document.createElement('a')
        const href = URL.createObjectURL(new Blob([contenido], { type: 'text/csv;charset=utf-8' }))
        enlace.href = href; enlace.download = nombre; document.body.appendChild(enlace); enlace.click(); enlace.remove()
        window.setTimeout(() => URL.revokeObjectURL(href), 30000)
        setMensaje('Descarga solicitada. Revisa Descargas de tu navegador.')
      }
    } catch (e) { setMensaje(e instanceof Error ? `${e.message} Si tu Android no abre el guardado, comprueba que instalaste ChefOS 1.3.2.` : 'No se pudo guardar el archivo.') }
    finally { setOcupado(false) }
  }
  return <div><button type="button" className="inline-flex gap-2 items-center min-h-12 border border-acento rounded-xl px-4 text-acento text-sm" onClick={() => void descargar()} disabled={ocupado}><Download size={16} />{ocupado ? 'Preparando archivo…' : etiqueta}</button>{mensaje && <p className="text-xs mt-2" role="status">{mensaje}</p>}</div>
}
