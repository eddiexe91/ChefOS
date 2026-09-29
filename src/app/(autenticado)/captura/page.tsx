'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Capacitor, registerPlugin } from '@capacitor/core'
import { useQueryClient } from '@tanstack/react-query'
import { useProductos } from '@/hooks/useDominio'
import { interpretarMerma, normalizarComando } from '@/lib/comandoVoz'

const voz = registerPlugin<{ escuchar(): Promise<{texto:string}> }>('ChefVoz')
export default function CapturaPage() {
  const productos = useProductos()
  const client = useQueryClient()
  const [texto,setTexto] = useState('')
  const [mensaje,setMensaje] = useState('')
  const [ocupado,setOcupado] = useState(false)
  const [borrador,setBorrador] = useState<{producto_id:string;cantidad:number;unidad_medida:string} | null>(null)
  const [motivo,setMotivo] = useState('otro')
  const [notas,setNotas] = useState('')
  const [foto,setFoto]=useState<File>()
  const [giro,setGiro]=useState(0)
  const [vista,setVista]=useState('')
  useEffect(()=>{if(!foto)return;const url=URL.createObjectURL(foto);setVista(url);return()=>URL.revokeObjectURL(url)},[foto])
  async function imagenOrientada(file:File) {
    const bitmap=await createImageBitmap(file)
    const escala=Math.min(1,2200/Math.max(bitmap.width,bitmap.height))
    const ancho=Math.round(bitmap.width*escala),alto=Math.round(bitmap.height*escala)
    const canvas=document.createElement('canvas')
    canvas.width=giro%180?alto:ancho;canvas.height=giro%180?ancho:alto
    const ctx=canvas.getContext('2d');if(!ctx){bitmap.close();throw new Error('No se pudo preparar la imagen')}
    ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height)
    ctx.translate(canvas.width/2,canvas.height/2);ctx.rotate(giro*Math.PI/180)
    ctx.filter='grayscale(1) contrast(1.2)';ctx.drawImage(bitmap,-ancho/2,-alto/2,ancho,alto);bitmap.close()
    return canvas
  }
  const [ocr,setOcr] = useState('')
  const [progreso,setProgreso] = useState('')
  const [csv,setCsv] = useState('')
  const [importacion,setImportacion] = useState('')
  function prepararVentas() {
    const filas = ocr.split(/\r?\n/).flatMap(linea=>{
      if(/mesa|total|propina|fecha|\\d{1,2}:\\d{2}/i.test(linea))return []
      const m=linea.trim().match(/^(\d+(?:[.,]\d+)?)\s*(?:[xX]\s+)?(.+?)(?:\s+\$\s*([\d.,]+))?$/)
      if(!m)return []
      return [`"${m[2].replaceAll('"','""')}",${m[1].replace(',','.')},0`]
    })
    setCsv('nombre,cantidad,precio\n'+filas.join('\n'));setImportacion('')
    setProgreso('Borrador parcial: revisa cada línea contra la foto, elimina encabezados y completa precios unitarios. Los precios se dejan en 0 para evitar confundir totales con precios unitarios.')
  }
  async function importarVentas() {
    setOcupado(true)
    try { const form=new FormData();form.set('archivo',new File([csv],'comanda-revisada.csv',{type:'text/csv'}));const r=await fetch('/api/ventas/importaciones',{method:'POST',body:form});const j=await r.json();if(!r.ok)throw new Error(j.error);setImportacion(j.data.id);setCsv('');setProgreso('Importación creada. Abre la revisión y confirma los platos antes de descontar existencias.');await client.invalidateQueries() }catch(e){setProgreso(e instanceof Error?e.message:'No se pudo importar.')}finally{setOcupado(false)}
  }
  async function escuchar() {
    setOcupado(true);setMensaje('');setBorrador(null)
    try { if(!Capacitor.isNativePlatform()) throw new Error('Usa el micrófono del teclado para dictar en el navegador.'); const r=await voz.escuchar();setTexto(r.texto) } catch(e){setMensaje(e instanceof Error?e.message:'No se pudo iniciar el dictado.')} finally{setOcupado(false)}
  }
  function interpretar() {
    setMensaje('');setBorrador(null)
    const comando=interpretarMerma(texto)
    if(!comando || comando.cantidad<=0) {setMensaje('No pude identificar cantidad, unidad y producto. Puedes editar el texto: “2 porciones de congrio como merma” o “2 porciones de merma de congrio”. Todavía no se ha descontado nada.');return}
    const coincidencias=(productos.data??[]).filter(p=>p.tipo_operativo==='elaborado'&&normalizarComando(p.nombre)===comando.producto)
    setBorrador({producto_id:coincidencias.length===1?coincidencias[0].id:'',cantidad:comando.cantidad,unidad_medida:comando.unidad})
    if(coincidencias.length!==1)setMensaje('Selecciona el producto exacto de Stock disponible para evitar confusiones.')
  }
  async function confirmar() {
    if(!borrador?.producto_id || ocupado)return
    if(!navigator.onLine){setMensaje('Sin conexión. No se registró la merma.');return}
    setOcupado(true);setMensaje('')
    try {const r=await fetch('/api/mermas',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...borrador,motivo,notas:`Comando revisado: ${texto}. ${notas}`})});const j=await r.json();if(!r.ok)throw new Error(j.error);setBorrador(null);setTexto('');setNotas('');setMotivo('otro');setMensaje('Merma registrada. Stock disponible actualizado.');await client.invalidateQueries()}catch(e){setMensaje(e instanceof Error?e.message:'No se pudo registrar.')}finally{setOcupado(false)}
  }
  async function leerFoto(file?:File) {
    if(!file)return
    if(!file.type.startsWith('image/') || file.size>15*1024*1024){setProgreso('Elige una imagen de hasta 15 MB.');return}
    setOcupado(true);setProgreso('Preparando lector de texto…')
    let worker: Awaited<ReturnType<typeof import('tesseract.js')['createWorker']>> | undefined
    try { const {createWorker}=await import('tesseract.js');worker=await createWorker('spa',1,{logger:m=>{if(m.status==='recognizing text')setProgreso(`Leyendo ${Math.round(m.progress*100)}%`)}});const r=await worker.recognize(await imagenOrientada(file));setOcr(r.data.text);setProgreso(r.data.confidence<65?'Lectura poco fiable. No prepares ventas sin corregir el texto contra la foto. La escritura a mano puede no reconocerse.':'Texto extraído. Revisa nombres, cantidades y precios; nada se ha registrado aún.') }catch{setProgreso('No se pudo leer la imagen. Prueba una foto nítida o pega el texto manualmente.')}finally{await worker?.terminate();setOcupado(false)}
  }
  return <div className="max-w-lg mx-auto px-4 py-6 pb-28 space-y-6"><h1 className="text-xl font-bold">Captura rápida · Voz y fotografía</h1><section className="tarjeta p-4 space-y-3"><h2 className="font-medium">Registrar merma por voz</h2><p className="text-xs text-texto-secundario">Dicta y revisa antes de confirmar. Android puede necesitar conexión según el servicio de voz instalado.</p><button className="btn-primario" disabled={ocupado} onClick={()=>void escuchar()}>Dictar comando</button><label className="block text-sm">Comando<textarea className="campo-input mt-1" value={texto} onChange={e=>{setTexto(e.target.value);setBorrador(null)}} placeholder="ChefOS registra 2 porciones de Congrio como merma" /></label><button className="text-acento" disabled={ocupado || productos.isPending} onClick={interpretar}>Revisar comando</button>{productos.isError&&<p>No se pudo cargar Stock disponible.</p>}{borrador&&<div className="border border-acento rounded-xl p-3 space-y-3"><label className="block text-sm">Producto<select value={borrador.producto_id} onChange={e=>setBorrador({...borrador,producto_id:e.target.value})} className="campo-input"><option value="">Selecciona el producto</option>{productos.data?.filter(p=>p.tipo_operativo==='elaborado').map(p=><option key={p.id} value={p.id}>{p.nombre} · {p.stock_actual} {p.unidad_medida}</option>)}</select></label><label className="block text-sm">Motivo<select className="campo-input" value={motivo} onChange={e=>setMotivo(e.target.value)}><option value="sobreproduccion">Sobreproducción</option><option value="error_coccion">Error de cocción</option><option value="vencimiento">Vencimiento</option><option value="manipulacion">Manipulación</option><option value="accidente">Accidente</option><option value="otro">Otro</option></select></label><label className="block text-sm">Notas (opcional)<textarea className="campo-input" maxLength={500} value={notas} onChange={e=>setNotas(e.target.value)} placeholder="Explica qué ocurrió"/></label><p>Descontar {borrador.cantidad} {borrador.unidad_medida} como merma.</p><button disabled={!borrador.producto_id||ocupado} className="btn-primario" onClick={()=>void confirmar()}>Confirmar merma</button><button className="text-sm" onClick={()=>setBorrador(null)}>Cancelar</button></div>}{mensaje&&<p role="status" className="text-sm">{mensaje}</p>}</section>
    <section className="tarjeta p-4 space-y-3"><h2 className="font-medium">Leer comanda o factura</h2><p className="text-xs text-texto-secundario">Lector gratuito en tu dispositivo. La primera lectura descarga el idioma español. La foto no se envía a una API de IA. Una foto no permite saber si una comanda fue anulada: verifica su estado.</p><p className="text-sm text-advertencia">Optimizado para texto impreso. Manuscritos, fotos giradas o borrosas requieren corrección manual; no se registran automáticamente.</p>
      <label className="block text-sm">Tomar foto ahora<input className="block mt-2 w-full text-xs" type="file" accept="image/*" capture="environment" disabled={ocupado} onChange={e=>{setFoto(e.target.files?.[0]);setGiro(0);setOcr('');setCsv('')}}/></label>
      <label className="block text-sm">Elegir foto guardada<input className="block mt-2 w-full text-xs" type="file" accept="image/*" disabled={ocupado} onChange={e=>{setFoto(e.target.files?.[0]);setGiro(0);setOcr('');setCsv('')}}/></label>
      {foto&&<div className="space-y-2"><div className="h-64 overflow-hidden flex items-center justify-center">{/* eslint-disable-next-line @next/next/no-img-element */}<img alt="Foto a revisar" src={vista} className="max-h-48 max-w-[70%] object-contain" style={{transform:`rotate(${giro}deg)`}}/></div><button disabled={ocupado} className="min-h-12 text-acento" onClick={()=>setGiro((giro+90)%360)}>Girar 90°</button><button disabled={ocupado} className="btn-primario w-full" onClick={()=>void leerFoto(foto)}>Leer foto orientada</button></div>}<p className="text-xs" role="status">{progreso}</p><label className="block text-sm">Texto revisable<textarea className="campo-input min-h-40 mt-1" value={ocr} onChange={e=>setOcr(e.target.value)}/></label><p className="text-xs text-texto-apagado">Para ventas, prepara un CSV con nombre,cantidad,precio. Las facturas se registran como compras después de revisar sus productos.</p><div className="flex gap-4 text-sm text-acento"><Link href="/ventas/importar">Importar ventas CSV →</Link><Link href="/compras">Registrar compra →</Link></div></section>
    {ocr && <section className="tarjeta p-4 space-y-3"><h2 className="font-medium">Preparar ventas de la comanda</h2><button className="text-acento" disabled={ocupado} onClick={prepararVentas}>Extraer borrador de líneas con cantidad</button>{csv&&<><label className="block text-sm">CSV revisable<textarea className="campo-input min-h-40 mt-1" value={csv} onChange={e=>setCsv(e.target.value)}/></label><p className="text-xs">Solo ventas efectivas. No incluyas comandas canceladas. Esta acción crea registros de ventas; confirma que este documento no esté importado previamente.</p><button disabled={ocupado} className="btn-primario" onClick={()=>void importarVentas()}>Importar ventas revisadas</button></>}{importacion&&<Link className="text-acento" href={`/ventas/${importacion}`}>Revisar platos y aplicar consumo →</Link>}</section>}
  </div>
}
