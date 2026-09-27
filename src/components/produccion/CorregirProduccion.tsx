'use client'
import {useRef,useState} from 'react'
import {useQueryClient} from '@tanstack/react-query'
export default function CorregirProduccion({id}:{id:string}){
 const cache=useQueryClient(),intento=useRef({firma:'',id:''})
 const [abierto,setAbierto]=useState(false),[tandas,setTandas]=useState(''),[salida,setSalida]=useState(''),[motivo,setMotivo]=useState(''),[mensaje,setMensaje]=useState(''),[ocupado,setOcupado]=useState(false)
 async function guardar(anular=false){
  if(!navigator.onLine||ocupado){setMensaje('Necesitas conexión para corregir.');return}
  if(!motivo.trim()){setMensaje('Indica el motivo.');return}
  const body={tandas:anular?0:Number(tandas),salida_real:anular?0:Number(salida),motivo}
  const firma=JSON.stringify(body);if(intento.current.firma!==firma)intento.current={firma,id:crypto.randomUUID()}
  if(!window.confirm('Esta corrección compensará ingredientes y salida. Conserva el historial. ¿Confirmar?'))return
  setOcupado(true)
  try{const r=await fetch('/api/produccion/'+id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({...body,solicitud_id:intento.current.id})});const j=await r.json();if(!r.ok)throw new Error(j.error);await cache.invalidateQueries();setMensaje('Corrección registrada.');setAbierto(false)}catch(e){setMensaje(e instanceof Error?e.message:'No se pudo confirmar. Revisa antes de repetir.')}finally{setOcupado(false)}
 }
 return <div className="text-sm mt-2"><button className="min-h-12 text-acento" onClick={()=>setAbierto(!abierto)}>Corregir / anular registro</button>{abierto&&<div className="space-y-2"><p>Indica las cantidades correctas totales, no la diferencia. Los registros antiguos sin datos de rendimiento requieren revisión; no se recalculan por suposición.</p><label className="block">Recetas realmente producidas<input className="campo-input" type="number" min=".001" step=".001" value={tandas} onChange={e=>setTandas(e.target.value)}/></label><label className="block">Salida obtenida (misma unidad del registro)<input className="campo-input" type="number" min=".001" step=".001" value={salida} onChange={e=>setSalida(e.target.value)}/></label><label className="block">Motivo<input className="campo-input" value={motivo} onChange={e=>setMotivo(e.target.value)}/></label><button className="btn-primario" disabled={ocupado||!(Number(tandas)>0)||!(Number(salida)>0)} onClick={()=>void guardar()}>Guardar corrección</button><button className="min-h-12 text-peligro" disabled={ocupado} onClick={()=>void guardar(true)}>Anular y compensar existencias</button></div>}{mensaje&&<p role="status">{mensaje}</p>}</div>
}
