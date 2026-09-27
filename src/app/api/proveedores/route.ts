import {NextResponse} from 'next/server'
import {crearClienteServidor} from '@/lib/supabase/servidor'
export async function POST(request:Request){
 const db=crearClienteServidor();const {data:{user}}=await db.auth.getUser()
 if(!user)return NextResponse.json({error:'No autenticado'},{status:401})
 const {data:perfil}=await db.from('usuarios').select('restaurante_id,rol').eq('id',user.id).eq('activo',true).single()
 if(!perfil||!['dueño','administrador','chef_ejecutivo'].includes(perfil.rol))return NextResponse.json({error:'Sin permisos para proveedores'},{status:403})
 const b=await request.json().catch(()=>null),nombre=typeof b?.nombre==='string'?b.nombre.trim():''
 if(!nombre||nombre.length>160)return NextResponse.json({error:'Indica el nombre del proveedor (hasta 160 caracteres)'},{status:400})
 const {data,error}=await db.from('proveedores').insert({restaurante_id:perfil.restaurante_id,nombre,activo:true}).select().single()
 return NextResponse.json({data,error:error?'No se pudo crear el proveedor. Comprueba permisos y conexión.':null},{status:error?400:201})
}
