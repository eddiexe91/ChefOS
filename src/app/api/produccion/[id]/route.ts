import {NextResponse} from 'next/server'
import {crearClienteServidor} from '@/lib/supabase/servidor'
export async function PATCH(request:Request,{params}:{params:{id:string}}){
 const db=crearClienteServidor();const {data:{user}}=await db.auth.getUser()
 if(!user)return NextResponse.json({error:'No autenticado'},{status:401})
 const b=await request.json().catch(()=>null)
 if(!b||!Number.isFinite(b.tandas)||!Number.isFinite(b.salida_real)||typeof b.motivo!=='string'||!/^[0-9a-f-]{36}$/i.test(b.solicitud_id??''))return NextResponse.json({error:'Datos de corrección inválidos'},{status:400})
 const {data,error}=await db.rpc('corregir_produccion_segura',{p_registro:params.id,p_tandas:b.tandas,p_salida:b.salida_real,p_motivo:b.motivo,p_solicitud:b.solicitud_id})
 return NextResponse.json({data,error:error?.code==='P0001'?error.message:error?'No se pudo aplicar la corrección. No se modificó el registro.':null},{status:error?400:200})
}
