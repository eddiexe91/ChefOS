'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Dialogo from '@/components/ui/Dialogo'
import { obtenerClienteNavegador } from '@/lib/supabase/navegador'

type POS = { id: string; nombre: string; id_externo: string; categoria?: string; productos_pos_mapeos: { estado: string; receta_id: string | null; producto_id: string | null }[] }
type Destino = { id: string; nombre: string; tipo: 'receta' | 'producto'; grupo: string }
const normalizar = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim()
const estadoDe = (p: POS) => p.productos_pos_mapeos?.[0]?.estado ?? 'pendiente'

export default function MapeosPOS() {
  const [filas, setFilas] = useState<POS[]>([]), [destinos, setDestinos] = useState<Destino[]>([])
  const [filtro, setFiltro] = useState('pendiente'), [buscarPOS, setBuscarPOS] = useState('')
  const [pagina, setPagina] = useState(0), [mensaje, setMensaje] = useState(''), [cargando, setCargando] = useState(true)
  const [editando, setEditando] = useState<POS|null>(null), [busqueda, setBusqueda] = useState(''), [grupo, setGrupo] = useState('carta')
  const [seleccion, setSeleccion] = useState(''), [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    let vigente = true
    async function cargar() {
      try {
        const todosPOS: POS[] = []
        for (let page = 0; ; page++) {
          const response = await fetch('/api/ventas/historial?pagina='+page), j = await response.json()
          if (!response.ok || j.error) throw new Error(j.error ?? 'Error de carga')
          todosPOS.push(...j.data)
          if (j.data.length < 100) break
          if (page >= 99) throw new Error('Catálogo mayor de 10.000 productos: requiere búsqueda por servidor. No se mostrará una lista incompleta.')
        }
        const db = obtenerClienteNavegador()
        const { data: { user } } = await db.auth.getUser()
        const { data: perfil } = await db.from('usuarios').select('restaurante_id').eq('id', user?.id).single()
        if (!perfil) throw new Error('No se pudo verificar el restaurante.')
        const todos: Destino[] = []
        for (const tabla of ['recetas','productos'] as const) {
          for (let desde=0; ; desde+=500) {
            const { data, error: fallo } = await db.from(tabla).select(tabla==='recetas'?'id,nombre,en_carta':'id,nombre,tipo_operativo').eq('restaurante_id',perfil.restaurante_id).eq(tabla==='recetas'?'activa':'activo',true).order('id').range(desde,desde+499)
            if (fallo) throw new Error(fallo.message)
            const registros = data as unknown as {id:string;nombre:string;en_carta?:boolean;tipo_operativo?:string}[]
            todos.push(...registros.map(d=>({id:d.id,nombre:d.nombre,tipo:tabla==='recetas'?'receta' as const:'producto' as const,grupo:tabla==='recetas'?(d.en_carta?'carta':'receta'):(d.tipo_operativo==='elaborado'?'stock':'inventario')})))
            if (registros.length<500) break
            if (desde>=9500) throw new Error('Catálogo interno demasiado grande para este selector. No se cargarán equivalencias parciales.')
          }
        }
        if(vigente) {setFilas(todosPOS);setDestinos(todos)}
      } catch(e) {if(vigente)setError(e instanceof Error?e.message:'No se pudo cargar.')}
      finally {if(vigente)setCargando(false)}
    }
    void cargar(); return ()=>{vigente=false}
  },[])
  function abrir(f:POS, propuesta?:Destino) {
    const m=f.productos_pos_mapeos?.[0]
    setEditando(f);setBusqueda('');setGrupo(propuesta?.grupo??'carta')
    setSeleccion(propuesta?propuesta.tipo+':'+propuesta.id:m?.receta_id?'receta:'+m.receta_id:m?.producto_id?'producto:'+m.producto_id:'')
    setMensaje('')
  }
  async function guardar(f:POS, estado:string) {
    if(ocupado)return
    setOcupado(true)
    const [tipo,id]=seleccion.split(':')
    try {
      const response=await fetch('/api/ventas/historial',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({accion:'mapear',pos:f.id,estado,receta:estado==='confirmado'&&tipo==='receta'?id:null,producto:estado==='confirmado'&&tipo==='producto'?id:null})})
      const j=await response.json();if(!response.ok)throw new Error(j.error)
      setFilas(a=>a.map(p=>p.id===f.id?{...p,productos_pos_mapeos:[{estado,receta_id:estado==='confirmado'&&tipo==='receta'?id:null,producto_id:estado==='confirmado'&&tipo==='producto'?id:null}]}:p))
      setMensaje(f.nombre+': '+(estado==='ignorado'?'guardado en Ignorados. Sus ventas se conservan.':estado==='confirmado'?'equivalencia confirmada para futuras importaciones.':'vuelve a Pendientes.'))
      setEditando(null);setPagina(0)
    } catch(e) {setMensaje(e instanceof Error?e.message:'No se pudo guardar.')}
    finally {setOcupado(false)}
  }
  const filtradas=filas.filter(p=>(filtro==='todas'||estadoDe(p)===filtro)&&normalizar(p.nombre+' '+(p.categoria??'')).includes(normalizar(buscarPOS)))
  const opciones=destinos.filter(d=>(grupo==='todos'||d.grupo===grupo)&&normalizar(d.nombre).includes(normalizar(busqueda)))
  const seleccionado=destinos.find(d=>d.tipo+':'+d.id===seleccion)
  return <main className="max-w-xl mx-auto px-4 pt-6 pb-32 space-y-4 text-texto-primario">
    <Link className="text-acento" href="/ventas">← Ventas</Link><h1 className="text-xl font-bold">Relacionar platos vendidos</h1>
    <p className="text-sm">El historial ya aporta ventas y tendencias sin relacionar todo. Empieza por platos que sigues vendiendo: vincularlos permite reconocer tus fichas ChefOS. No debes enlazar un plato completo con uno solo de sus ingredientes.</p>
    <p className="text-sm">Ignorar quita el producto de las recomendaciones, no borra sus ventas. Puedes recuperarlo en Ignorados. Las propuestas por nombre exacto requieren tu confirmación.</p>
    <div className="flex flex-wrap gap-2">{[['pendiente','Pendientes'],['confirmado','Confirmados'],['ignorado','Ignorados'],['todas','Todos']].map(([v,n])=><button key={v} className={`min-h-12 rounded-xl border px-3 ${filtro===v?'border-acento text-acento':'border-fondo-borde'}`} aria-pressed={filtro===v} onClick={()=>{setFiltro(v);setPagina(0)}}>{n} ({filas.filter(p=>v==='todas'||estadoDe(p)===v).length})</button>)}</div>
    <label className="block text-sm">Buscar producto vendido o categoría<input className="campo-input" value={buscarPOS} onChange={e=>{setBuscarPOS(e.target.value);setPagina(0)}}/></label>
    {cargando&&<p role="status">Cargando catálogo, no las líneas de ventas…</p>}
    {error&&<p role="alert">{error}</p>}
    <p role="status" aria-live="polite">{mensaje}</p>
    {!cargando&&!error&&filtradas.length===0&&<p>No hay productos en este filtro.</p>}
    {!error&&filtradas.slice(pagina*15,pagina*15+15).map(f=>{
      const exactas=destinos.filter(d=>normalizar(d.nombre)===normalizar(f.nombre))
      const m=f.productos_pos_mapeos?.[0]
      const vinculo=destinos.find(d=>(d.tipo==='receta'&&d.id===m?.receta_id)||(d.tipo==='producto'&&d.id===m?.producto_id))
      return <section className="tarjeta p-4 space-y-3" key={f.id}><h2 className="font-bold">{f.nombre}</h2><p className="text-xs">{f.categoria} · {estadoDe(f)}</p>
        {vinculo&&<p>Vinculado a: {vinculo.nombre} ({vinculo.grupo})</p>}
        {estadoDe(f)==='pendiente'&&exactas.length===1&&<button disabled={ocupado} className="btn-secundario" onClick={()=>abrir(f,exactas[0])}>Revisar coincidencia exacta: {exactas[0].nombre}</button>}
        <button disabled={ocupado} className="btn-primario w-full" onClick={()=>abrir(f)}>Buscar equivalencia</button>
        <div className="flex gap-2">{estadoDe(f)!=='ignorado'&&<button disabled={ocupado} className="btn-secundario min-h-12" onClick={()=>void guardar(f,'ignorado')}>Ignorar para recomendaciones</button>}{estadoDe(f)!=='pendiente'&&<button disabled={ocupado} className="btn-secundario min-h-12" onClick={()=>void guardar(f,'pendiente')}>Volver a pendientes</button>}</div>
      </section>
    })}
    <div className="flex justify-between"><button className="btn-secundario" disabled={pagina===0} onClick={()=>setPagina(pagina-1)}>Anterior</button><span>{pagina+1}</span><button className="btn-secundario" disabled={(pagina+1)*15>=filtradas.length} onClick={()=>setPagina(pagina+1)}>Siguiente</button></div>
    {editando&&<Dialogo titulo={'Equivalencia de '+editando.nombre} cerrar={()=>{if(!ocupado)setEditando(null)}}>
      <label className="block">Buscar en<select className="campo-input" value={grupo} onChange={e=>setGrupo(e.target.value)}>{[['carta','Carta'],['receta','Recetas de producción'],['stock','Stock disponible'],['inventario','Inventario'],['todos','Todos']].map(([v,n])=><option key={v} value={v}>{n}</option>)}</select></label>
      <label className="block">Nombre en ChefOS<input className="campo-input" value={busqueda} onChange={e=>setBusqueda(e.target.value)} placeholder="Escribe parte del nombre"/></label>
      <div className="max-h-48 overflow-y-auto space-y-2">{opciones.slice(0,30).map(d=><button key={d.tipo+':'+d.id} className="block w-full text-left min-h-12 rounded border border-fondo-borde p-2" aria-pressed={seleccion===d.tipo+':'+d.id} onClick={()=>setSeleccion(d.tipo+':'+d.id)}>{seleccion===d.tipo+':'+d.id?'✓ ':''}{d.nombre} · {d.grupo}</button>)}</div>
      {opciones.length>30&&<p>Hay más resultados. Escribe un nombre más específico.</p>}{opciones.length===0&&<p>No hay coincidencias. Prueba otra palabra o sección.</p>}
      <p>Seleccionado: {seleccionado?.nombre??'ninguno'}</p>
      <button disabled={ocupado||!seleccionado} className="btn-primario w-full" onClick={()=>void guardar(editando,'confirmado')}>{ocupado?'Guardando…':'Confirmar esta equivalencia'}</button>
      <p role="status">{mensaje}</p>
    </Dialogo>}
  </main>
}
