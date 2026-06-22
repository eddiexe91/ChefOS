import { redirect } from 'next/navigation'

export default function PaginaRaizAutenticada() {
  return redirect('/dashboard')
}
