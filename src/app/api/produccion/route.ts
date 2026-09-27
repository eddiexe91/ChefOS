import { NextResponse } from 'next/server'
import { crearClienteServidor } from '@/lib/supabase/servidor'
export async function POST(request: Request) {
 const db=crearClienteServidor()
 const {data:{user}}=await db.auth.getUser()
 if(!user)return NextResponse.json({error:'No autenticado.'},{status:401})
 const b=await request.json().catch(()=>null)
 if(!b||!Number.isFinite(b.tandas)||b.tandas<=0||!Number.isFinite(b.salida_real)||b.salida_real<=0||typeof b.receta_id!=='string'||typeof b.lote_id!=='string'||!/^[0-9a-f-]{36}$/i.test(b.solicitud_id??''))return NextResponse.json({error:'Indica recetas producidas, salida real y receta.'},{status:400})
 const {data,error}=await db.rpc('registrar_produccion_segura',{p_receta_id:b.receta_id,p_lote_id:b.lote_id,p_tandas:b.tandas,p_salida_real:b.salida_real,p_solicitud:b.solicitud_id,p_notas:typeof b.notas==='string'?b.notas:null})
 if(error)return NextResponse.json({error:error.code==='P0001'?error.message:error.code==='PGRST202'?'Falta activar el registro seguro (migración 016). No se aplicó producción.':'No se pudo registrar. No repitas sin revisar los movimientos.'},{status:error.code==='P0001'?400:503})
 return NextResponse.json({data,error:null},{status:201})
}
