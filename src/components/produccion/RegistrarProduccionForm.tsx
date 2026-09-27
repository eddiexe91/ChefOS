'use client'
import {useRef,useState} from 'react'
import {useQueryClient} from '@tanstack/react-query'
import Link from 'next/link'
import {useRecetas} from '@/hooks/useDominio'
export default function RegistrarProduccionForm({loteId,recetaInicialId}:{loteId:string;recetaInicialId?:string}){
 const recetas=useRecetas({es_produccion:true,activa:true}),cache=useQueryClient()
 const [id,setId]=useState(recetaInicialId??''),[tandas,setTandas]=useState('1'),[real,setReal]=useState(''),[notas,setNotas]=useState(''),[estado,setEstado]=useState(''),[ocupado,setOcupado]=useState(false)
 const intento=useRef({firma:'',id:''}),enviando=useRef(false)
 const receta=recetas.data?.find(r=>r.id===id)
 const prevista=Number(receta?.cantidad_salida??0)*Number(tandas)
 const obtenida=real===''?prevista:Number(real)
 async function guardar(){
  if(enviando.current)return
  if(!navigator.onLine){setEstado('Sin conexión. No se ha registrado producción.');return}
  const body={lote_id:loteId,receta_id:id,tandas:Number(tandas),salida_real:obtenida,notas}
  const firma=JSON.stringify(body);if(intento.current.firma!==firma)intento.current={firma,id:crypto.randomUUID()}
  if(!window.confirm('Registrar '+tandas+' receta(s) de '+receta?.nombre+' y añadir '+obtenida+' '+receta?.unidad_salida+' a Stock disponible. Se descontarán sus ingredientes. ¿Confirmar?'))return
  enviando.current=true;setOcupado(true);setEstado('')
  try{const r=await fetch('/api/produccion',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...body,solicitud_id:intento.current.id})});const j=await r.json();if(!r.ok)throw new Error(j.error)
   await cache.invalidateQueries();setEstado('Producción terminada registrada. Ingredientes y Stock disponible actualizados.');setId('');setReal('');setTandas('1')
  }catch(e){setEstado(e instanceof Error?e.message:'No se pudo confirmar. Revisa movimientos antes de repetir.')}finally{enviando.current=false;setOcupado(false)}
 }
 return <div className="space-y-4"><p className="text-sm text-texto-secundario">Registra aquí la producción que ya terminaste.</p>
 <label className="block">Receta<select className="campo-input" value={id} disabled={ocupado} onChange={e=>{setId(e.target.value);setReal('')}}><option value="">Seleccionar receta</option>{recetas.data?.map(r=><option key={r.id} value={r.id}>{r.nombre}</option>)}</select></label>
 <label className="block">Cantidad de recetas producidas (tandas)<input className="campo-input" type="number" min=".001" step=".001" inputMode="decimal" value={tandas} disabled={ocupado} onChange={e=>setTandas(e.target.value)}/></label>
 {receta&&<div className="tarjeta p-3 text-sm"><p>Una receta rinde {receta.cantidad_salida??'—'} {receta.unidad_salida??''} de {receta.producto_salida?.nombre??'salida sin configurar'}.</p><p>Con {tandas||0} receta(s), la salida prevista es {prevista} {receta.unidad_salida}.</p></div>}
 {receta&&!receta.producto_salida_id&&<Link className="block text-acento" href={'/biblioteca/'+receta.id+'/editar'}>Configurar producto de salida antes de producir →</Link>}
 <label className="block">Cantidad realmente obtenida ({receta?.unidad_salida??'unidad de salida'})<input className="campo-input" type="number" inputMode="decimal" min=".001" step=".001" placeholder={String(prevista)} value={real} disabled={ocupado} onChange={e=>setReal(e.target.value)}/></label>
 <p className="text-xs text-texto-secundario">Si obtuviste más o menos porciones, indica el resultado real. Los ingredientes se calculan por las tandas; no cambian al corregir el rendimiento de salida.</p>
 <label className="block">Notas<textarea className="campo-input" value={notas} onChange={e=>setNotas(e.target.value)}/></label>
 {estado&&<p role="status">{estado}</p>}<button className="btn-primario w-full" disabled={ocupado||!receta?.producto_salida_id||!(Number(tandas)>0)||!(obtenida>0)} onClick={()=>void guardar()}>{ocupado?'Registrando…':'Registrar producción terminada'}</button></div>
}
