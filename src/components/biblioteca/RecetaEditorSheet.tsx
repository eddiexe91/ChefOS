'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { useProductos } from '@/hooks/useDominio'
import { obtenerClienteNavegador } from '@/lib/supabase/navegador'
import type { CategoriaReceta, Receta } from '@/types'

const UNIDADES = ['g','kg','mg','oz','lb','lt','ml','cl','unidad','docena','caja','bandeja','porcion']
const normalizar = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim()
type Ingrediente = { key: string; producto_id: string; cantidad: string; unidad_medida: string; notas: string; es_opcional: boolean }
type Paso = { key: string; titulo: string; descripcion: string; duracion_min: string; temperatura_c: string; tecnica: string; punto_critico: boolean; foto_url?: string | null }
const nuevoIngrediente = (): Ingrediente => ({ key: crypto.randomUUID(), producto_id:'', cantidad:'', unidad_medida:'', notas:'', es_opcional:false })
const nuevoPaso = (): Paso => ({ key:crypto.randomUUID(),titulo:'',descripcion:'',duracion_min:'',temperatura_c:'',tecnica:'',punto_critico:false })

function Ventana({ titulo, children, cerrar }: { titulo: string; children: React.ReactNode; cerrar: () => void }) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if(e.key==='Escape') cerrar() }
    document.addEventListener('keydown',key)
    return () => document.removeEventListener('keydown',key)
  }, [cerrar])
  return createPortal(<div role="dialog" aria-modal="true" aria-label={titulo} className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4 pb-24">
    <section className="w-full max-w-lg max-h-[75dvh] overflow-y-auto rounded-2xl bg-fondo-elevado border border-fondo-borde p-5 text-texto-primario space-y-4">
      <div className="flex items-center justify-between"><h2 className="font-bold">{titulo}</h2><button type="button" className="min-h-12 px-3" aria-label="Cerrar" onClick={cerrar}>✕</button></div>{children}
    </section></div>,document.body)
}
export default function RecetaEditorSheet({ modo, receta, embebido=false, onClose, onSaved }: {
  modo:'receta'|'carta'; receta?:Receta|null; embebido?:boolean; onClose?:()=>void; onSaved?:()=>void
}) {
  const router=useRouter(), cache=useQueryClient()
  const productosQuery=useProductos()
  const productos=useMemo(()=>productosQuery.data??[],[productosQuery.data])
  const [categorias,setCategorias]=useState<CategoriaReceta[]>([])
  const [campos,setCampos]=useState({
    nombre:receta?.nombre??'', descripcion:receta?.descripcion??'', categoria_id:receta?.categoria_id??'',
    rendimiento_porciones:String(receta?.rendimiento_porciones??1), unidad_rendimiento:receta?.unidad_rendimiento??(modo==='carta'?'plato':'porcion'),
    tiempo_preparacion:String(receta?.tiempo_preparacion??''), dificultad:receta?.dificultad??'', precio_venta:String(receta?.precio_venta??''),
    en_carta:receta?.en_carta??modo==='carta', es_produccion:receta?.es_produccion??modo==='receta',
    producto_salida_id:receta?.producto_salida_id??'', cantidad_salida:String(receta?.cantidad_salida??receta?.rendimiento_porciones??1),
    unidad_salida:receta?.unidad_salida??'porcion', crear_salida:!receta?.producto_salida_id, nombre_salida:receta?.nombre??''
  })
  const [ingredientes,setIngredientes]=useState<Ingrediente[]>(()=>(receta?.ingredientes??[]).map(i=>({
    key:crypto.randomUUID(),producto_id:i.producto_id,cantidad:String(i.cantidad),unidad_medida:i.unidad_medida,notas:i.notas??'',es_opcional:i.es_opcional
  })))
  const [pasos,setPasos]=useState<Paso[]>(()=>(receta?.pasos??[]).map(p=>({
    key:crypto.randomUUID(),titulo:p.titulo,descripcion:p.descripcion,duracion_min:String(p.duracion_min??''),temperatura_c:String(p.temperatura_c??''),
    tecnica:p.tecnica??'',punto_critico:p.punto_critico,foto_url:p.foto_url
  })))
  const [ingrediente,setIngrediente]=useState<Ingrediente|null>(null)
  const [paso,setPaso]=useState<Paso|null>(null)
  const [busqueda,setBusqueda]=useState('')
  const [error,setError]=useState('')
  const [guardando,setGuardando]=useState(false)
  const ocupado=useRef(false)
  const solicitud=useRef({firma:'',id:''})
  useEffect(()=>{let activo=true; void obtenerClienteNavegador().from('categorias_receta').select('*').eq('activa',true).order('orden').then(({data})=>{if(activo)setCategorias(data??[])});return()=>{activo=false}},[])
  const filtrados=productos.filter(p=>normalizar(p.nombre).includes(normalizar(busqueda)))
  const salidas=productos.filter(p=>p.tipo_operativo==='elaborado')
  const campo=(key:keyof typeof campos,value:string|boolean)=>setCampos(c=>({...c,[key]:value}))
  function editarIngrediente(i?:Ingrediente){setBusqueda('');setIngrediente(i?{...i}:nuevoIngrediente())}
  function elegirProducto(id:string) {
    const p=productos.find(p=>p.id===id)
    setIngrediente(i=>i?{...i,producto_id:id,unidad_medida:p?.unidad_medida??''}:i)
  }
  async function guardar(){
    if(ocupado.current)return
    if(!navigator.onLine){setError('Sin conexión: el formulario sigue aquí, pero aún no se ha guardado. Reconecta para guardar.');return}
    if(!campos.nombre.trim()||!Number.isInteger(Number(campos.rendimiento_porciones))||Number(campos.rendimiento_porciones)<=0||!ingredientes.length||!pasos.length){
      setError('Completa nombre, rendimiento, al menos un ingrediente y un paso.');return
    }
    if(campos.es_produccion&&(!Number(campos.cantidad_salida)||(!campos.crear_salida&&!campos.producto_salida_id))){
      setError('Selecciona o crea el producto de salida y su cantidad por receta.');return
    }
    const payload={
      ...campos,nombre:campos.nombre.trim(),nombre_salida:campos.nombre_salida.trim()||campos.nombre.trim(),
      rendimiento_porciones:Number(campos.rendimiento_porciones), tiempo_preparacion:campos.tiempo_preparacion?Number(campos.tiempo_preparacion):null,
      precio_venta:campos.precio_venta?Number(campos.precio_venta):null,
      producto_salida_id:campos.es_produccion&&!campos.crear_salida?campos.producto_salida_id:null,
      cantidad_salida:campos.es_produccion?Number(campos.cantidad_salida):null,unidad_salida:campos.es_produccion?campos.unidad_salida:null,
      crear_salida:campos.es_produccion&&campos.crear_salida,version_esperada:receta?.version_actual??null,origen_editor:modo,
      ingredientes:ingredientes.map((i,n)=>({...i,cantidad:Number(i.cantidad),orden:n})),
      pasos:pasos.map((p,n)=>({...p,numero:n+1,duracion_min:p.duracion_min?Number(p.duracion_min):null,temperatura_c:p.temperatura_c?Number(p.temperatura_c):null}))
    }
    const firma=JSON.stringify(payload)
    if(solicitud.current.firma!==firma)solicitud.current={firma,id:crypto.randomUUID()}
    ocupado.current=true;setGuardando(true);setError('')
    try {
      const r=await fetch(receta?'/api/biblioteca/recetas/'+receta.id:'/api/biblioteca/recetas',{method:receta?'PATCH':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...payload,solicitud_id:solicitud.current.id})})
      const j=await r.json();if(!r.ok)throw new Error(j.error??'No se pudo guardar.')
      await cache.invalidateQueries()
      onSaved?.()
      if(onClose)onClose();else {router.push(modo==='carta'?'/carta':'/biblioteca');router.refresh()}
    } catch(e){setError(e instanceof Error?e.message:'No se pudo confirmar el guardado. Conservamos el formulario; reintentar sin cambios no duplica la receta.')}
    finally{ocupado.current=false;setGuardando(false)}
  }
  async function archivar(){
    if(!receta||ocupado.current||!window.confirm('¿Archivar '+receta.nombre+'? Se conservará su historial.'))return
    ocupado.current=true;setGuardando(true)
    try{const r=await fetch('/api/biblioteca/recetas/'+receta.id,{method:'DELETE'});const j=await r.json();if(!r.ok)throw new Error(j.error)
      await cache.invalidateQueries();onSaved?.();if(onClose)onClose();else router.push(modo==='carta'?'/carta':'/biblioteca')
    }catch(e){setError(e instanceof Error?e.message:'No se pudo archivar.')}finally{ocupado.current=false;setGuardando(false)}
  }
  return <div className={embebido?'max-w-lg mx-auto px-4 py-6 pb-36':'fixed inset-0 z-[70] bg-black/60 flex items-center justify-center p-4 pb-24'} role={embebido?undefined:'dialog'} aria-modal={embebido?undefined:true}>
    <div className={embebido?'space-y-5 text-texto-primario':'w-full max-w-lg max-h-[80dvh] overflow-y-auto rounded-2xl bg-fondo-elevado p-5 space-y-5 text-texto-primario'}>
      <div className="flex justify-between"><h1 className="text-xl font-bold">{receta?'Editar': 'Añadir'} {modo==='carta'?'plato de Carta':'receta'}</h1>{onClose&&<button className="min-h-12 px-3" onClick={onClose}>Cerrar</button>}</div>
      <label className="block">Nombre<input className="campo-input mt-1" value={campos.nombre} onChange={e=>campo('nombre',e.target.value)}/></label>
      <label className="block">Categoría<select className="campo-input mt-1" value={campos.categoria_id} onChange={e=>campo('categoria_id',e.target.value)}><option value="">Sin categoría</option>{categorias.map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}</select></label>
      <label className="block">Descripción<textarea className="campo-input mt-1" value={campos.descripcion} onChange={e=>campo('descripcion',e.target.value)}/></label>
      <div className="grid grid-cols-2 gap-3"><label>Rendimiento<input className="campo-input mt-1" type="number" min="1" step="1" value={campos.rendimiento_porciones} onChange={e=>campo('rendimiento_porciones',e.target.value)}/></label><label>Unidad del rendimiento<input className="campo-input mt-1" value={campos.unidad_rendimiento} onChange={e=>campo('unidad_rendimiento',e.target.value)}/></label></div>
      <details className="tarjeta p-3"><summary className="min-h-12 cursor-pointer">Tiempo, dificultad y precio</summary>
        <label className="block">Tiempo (min)<input className="campo-input" type="number" min="0" value={campos.tiempo_preparacion} onChange={e=>campo('tiempo_preparacion',e.target.value)}/></label>
        <label className="block">Dificultad<select className="campo-input" value={campos.dificultad} onChange={e=>campo('dificultad',e.target.value)}><option value="">Sin especificar</option>{['basica','intermedia','avanzada'].map(v=><option key={v}>{v}</option>)}</select></label>
        <label className="block">Precio de venta<input className="campo-input" type="number" min="0" value={campos.precio_venta} onChange={e=>campo('precio_venta',e.target.value)}/></label>
      </details>
      <label className="flex gap-3 min-h-12 items-center"><input type="checkbox" checked={campos.en_carta} onChange={e=>campo('en_carta',e.target.checked)}/>En Carta</label>
      <label className="flex gap-3 min-h-12 items-center"><input type="checkbox" checked={campos.es_produccion} onChange={e=>campo('es_produccion',e.target.checked)}/>Es producción (genera Stock disponible)</label>
      <section className="space-y-2"><h2 className="seccion-titulo">Ingredientes</h2>
        <button type="button" className="btn-primario w-full" onClick={()=>editarIngrediente()}>+ Agregar ingrediente</button>
        {productosQuery.isError&&<p role="alert">No se pudieron cargar productos. <button onClick={()=>void productosQuery.refetch()} className="text-acento">Reintentar</button></p>}
        {!ingredientes.length&&<p className="text-sm text-texto-secundario">Añade un ingrediente para comenzar.</p>}
        <ol>{ingredientes.map((i,n)=><li key={i.key} className="flex items-center justify-between gap-2 border-b border-fondo-borde"><button className="flex-1 text-left min-h-12" onClick={()=>editarIngrediente(i)}>{n+1}. {productos.find(p=>p.id===i.producto_id)?.nombre??receta?.ingredientes?.find(p=>p.producto_id===i.producto_id)?.producto?.nombre??'Producto no disponible'} · {i.cantidad} {i.unidad_medida}</button><button className="min-h-12 px-3 text-peligro" aria-label="Quitar ingrediente" onClick={()=>setIngredientes(a=>a.filter(x=>x.key!==i.key))}>✕</button></li>)}</ol>
      </section>
      <section className="space-y-2"><h2 className="seccion-titulo">Paso a paso / Procedimiento</h2><button className="btn-primario w-full" onClick={()=>setPaso(nuevoPaso())}>+ Agregar paso</button>
        <ol>{pasos.map((p,n)=><li key={p.key} className="flex items-center border-b border-fondo-borde"><button className="flex-1 text-left min-h-12" onClick={()=>setPaso({...p})}>{n+1}. {p.titulo}</button><button className="min-h-12 px-3 text-peligro" aria-label="Quitar paso" onClick={()=>setPasos(a=>a.filter(x=>x.key!==p.key))}>✕</button></li>)}</ol>
      </section>
      {campos.es_produccion&&<section className="tarjeta p-4 space-y-3"><h2 className="font-bold">Salida al Stock disponible</h2>
        <p className="text-sm text-texto-secundario">Por cada receta completa se obtendrá esta cantidad. Crear su ficha no añade existencias: solo producirlas lo hace.</p>
        <label className="flex gap-2 min-h-12 items-center"><input type="checkbox" checked={campos.crear_salida} onChange={e=>campo('crear_salida',e.target.checked)}/>Crear aquí un nuevo producto elaborado</label>
        {campos.crear_salida?<label className="block">Nombre del producto<input className="campo-input" placeholder={campos.nombre} value={campos.nombre_salida} onChange={e=>campo('nombre_salida',e.target.value)}/></label>:<label className="block">Producto existente<select className="campo-input" value={campos.producto_salida_id} onChange={e=>{const p=salidas.find(p=>p.id===e.target.value);setCampos(c=>({...c,producto_salida_id:e.target.value,unidad_salida:p?.unidad_medida??c.unidad_salida}))}}><option value="">Selecciona Stock disponible</option>{salidas.map(p=><option key={p.id} value={p.id}>{p.nombre}</option>)}</select></label>}
        <div className="grid grid-cols-2 gap-3"><label>Cantidad por receta<input className="campo-input" inputMode="decimal" type="number" min=".001" step=".001" value={campos.cantidad_salida} onChange={e=>campo('cantidad_salida',e.target.value)}/></label><label>Unidad<select className="campo-input" value={campos.unidad_salida} onChange={e=>campo('unidad_salida',e.target.value)}>{UNIDADES.map(u=><option key={u}>{u}</option>)}</select></label></div>
      </section>}
      {error&&<p role="alert" className="text-peligro-texto border border-peligro rounded p-3">{error}</p>}
      <button className="btn-primario w-full" disabled={guardando} onClick={()=>void guardar()}>{guardando?'Guardando…':modo==='carta'?'Guardar plato de Carta':'Guardar receta'}</button>
      {receta&&<button className="min-h-12 text-peligro" disabled={guardando} onClick={()=>void archivar()}>Archivar (conserva historial)</button>}
    </div>
    {ingrediente&&<Ventana titulo="Agregar o editar ingrediente" cerrar={()=>setIngrediente(null)}>
      <label className="block">Buscar producto<input autoFocus type="search" className="campo-input mt-1" value={busqueda} onChange={e=>setBusqueda(e.target.value)} placeholder="Nombre, con o sin acentos"/></label>
      {busqueda&&<div className="max-h-36 overflow-y-auto border border-fondo-borde rounded">{filtrados.slice(0,60).map(p=><button key={p.id} className="block w-full min-h-12 px-3 text-left border-b border-fondo-borde" onClick={()=>{elegirProducto(p.id);setBusqueda('')}}>{p.nombre} · {p.unidad_medida}</button>)}{!filtrados.length&&<p className="p-3">No hay coincidencias. Prueba otra palabra.</p>}</div>}
      <label className="block">Producto<select className="campo-input mt-1" value={ingrediente.producto_id} onChange={e=>elegirProducto(e.target.value)}><option value="">Seleccionar producto</option>{productos.map(p=><option key={p.id} value={p.id}>{p.nombre} · {p.unidad_medida}</option>)}</select></label>
      <div className="grid grid-cols-2 gap-3"><label>Cantidad<input className="campo-input" type="number" inputMode="decimal" min=".001" step=".001" value={ingrediente.cantidad} onChange={e=>setIngrediente({...ingrediente,cantidad:e.target.value})}/></label><label>Unidad<select className="campo-input" value={ingrediente.unidad_medida} onChange={e=>setIngrediente({...ingrediente,unidad_medida:e.target.value})}><option value="">Selecciona producto</option>{UNIDADES.map(u=><option key={u}>{u}</option>)}</select></label></div>
      <details><summary className="min-h-12">Notas y opcional</summary><input aria-label="Notas del ingrediente" className="campo-input" value={ingrediente.notas} onChange={e=>setIngrediente({...ingrediente,notas:e.target.value})}/><label className="flex min-h-12 gap-2 items-center"><input type="checkbox" checked={ingrediente.es_opcional} onChange={e=>setIngrediente({...ingrediente,es_opcional:e.target.checked})}/>Ingrediente opcional</label></details>
      <button className="btn-primario w-full" disabled={!ingrediente.producto_id||!ingrediente.unidad_medida||!(Number(ingrediente.cantidad)>0)} onClick={()=>{setIngredientes(a=>a.some(x=>x.key===ingrediente.key)?a.map(x=>x.key===ingrediente.key?ingrediente:x):[...a,ingrediente]);setIngrediente(null)}}>Listo</button>
    </Ventana>}
    {paso&&<Ventana titulo="Paso de elaboración" cerrar={()=>setPaso(null)}>
      <label className="block">Título<input autoFocus className="campo-input" value={paso.titulo} onChange={e=>setPaso({...paso,titulo:e.target.value})}/></label>
      <label className="block">Descripción<textarea className="campo-input min-h-24" value={paso.descripcion} onChange={e=>setPaso({...paso,descripcion:e.target.value})}/></label>
      <details><summary className="min-h-12">Tiempo, temperatura y técnica</summary>
        <label className="block">Minutos<input type="number" min="0" className="campo-input" value={paso.duracion_min} onChange={e=>setPaso({...paso,duracion_min:e.target.value})}/></label>
        <label className="block">Temperatura °C<input type="number" className="campo-input" value={paso.temperatura_c} onChange={e=>setPaso({...paso,temperatura_c:e.target.value})}/></label>
        <label className="block">Técnica<input className="campo-input" value={paso.tecnica} onChange={e=>setPaso({...paso,tecnica:e.target.value})}/></label>
        <label><input type="checkbox" checked={paso.punto_critico} onChange={e=>setPaso({...paso,punto_critico:e.target.checked})}/> Punto crítico</label>
      </details>
      <button className="btn-primario w-full" disabled={!paso.titulo.trim()||!paso.descripcion.trim()} onClick={()=>{setPasos(a=>a.some(x=>x.key===paso.key)?a.map(x=>x.key===paso.key?paso:x):[...a,paso]);setPaso(null)}}>Listo</button>
    </Ventana>}
  </div>
}
