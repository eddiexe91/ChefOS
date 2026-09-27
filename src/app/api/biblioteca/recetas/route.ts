import { guardarReceta } from '@/lib/recetaGuardado'
export const POST = (request: Request) => guardarReceta(request, null)
