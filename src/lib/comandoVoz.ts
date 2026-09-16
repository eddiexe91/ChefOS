export function normalizarComando(texto: string) {
  return texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim()
}

export function interpretarMerma(texto: string) {
  const numeros: Record<string, string> = { una: '1', un: '1', uno: '1', dos: '2', tres: '3', cuatro: '4', cinco: '5', seis: '6', siete: '7', ocho: '8', nueve: '9', diez: '10', media: '0.5', medio: '0.5' }
  const frase = normalizarComando(texto).replace(/^(?:(?:chefos|chef os)[,:]?\s+)?(?:registra[r]?\s+)?(una|un|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|media|medio)\b/, (_, n) => numeros[n])
  if (!/\bmerma\b/.test(frase)) return null
  const m = frase.match(/^(?:(?:chefos|chef os)[,:]?\s+)?(?:registra[r]?\s+)?(\d+(?:[.,]\d+)?)\s*(porcion(?:es)?|unidad(?:es)?|kilos?|kilogramos?|kg|gramos?|g|litros?|lt|mililitros?|ml)\s+(?:de\s+)?(.+?)(?:\s+como\s+merma|\s+por\s+merma|\s+de\s+merma|\s+merma)[.!]?$/)
  if (!m || Number(m[1].replace(',', '.')) <= 0) return null
  const unidad = /^porci/.test(m[2]) ? 'porcion' : /^unidad/.test(m[2]) ? 'unidad' : /^(kilo|kg)/.test(m[2]) ? 'kg' : /^(gram|g$)/.test(m[2]) ? 'g' : /^(mili|ml)/.test(m[2]) ? 'ml' : 'lt'
  return { cantidad: Number(m[1].replace(',', '.')), unidad, producto: m[3].trim() }
}
