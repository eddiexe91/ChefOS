export function normalizarComando(texto: string) {
  return texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim()
}

export function interpretarMerma(texto: string) {
  const numeros: Record<string, string> = { una: '1', un: '1', uno: '1', dos: '2', tres: '3', cuatro: '4', cinco: '5', seis: '6', siete: '7', ocho: '8', nueve: '9', diez: '10', media: '0.5', medio: '0.5' }
  // Reconocimiento determinista: acepta variantes habituales del dictado,
  // pero nunca inventa producto, cantidad o unidad ni ejecuta el movimiento.
  let frase = normalizarComando(texto)
    .replace(/^(?:chefos|chef os)[,:]?\s+/, '')
    .replace(/^(?:registra|registrar|registro|anota|anotar)\s+/, '')
    .replace(/[.!]+$/, '')
  const mermaAlInicio = /^(?:como\s+)?merma\s+(?:de\s+)?/.test(frase)
  if (mermaAlInicio) frase = frase.replace(/^(?:como\s+)?merma\s+(?:de\s+)?/, '')
  frase = frase.replace(/^(una|un|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|media|medio)\b/, n => numeros[n])
  const base = '(\\d+(?:[.,]\\d+)?)\\s*(porcion(?:es)?|unidad(?:es)?|kilos?|kilogramos?|kg|gramos?|g|litros?|lt|mililitros?|ml)\\s+'
  const patrones = mermaAlInicio
    ? [new RegExp('^' + base + '(?:de\\s+)?(.+)$')]
    : [
        new RegExp('^' + base + '(?:de\\s+)?(.+?)(?:\\s+como\\s+merma|\\s+por\\s+merma|\\s+de\\s+merma|\\s+merma)$'),
        new RegExp('^' + base + '(?:de\\s+)?merma\\s+de\\s+(.+)$'),
      ]
  const m = patrones.map(p => frase.match(p)).find(Boolean)
  if (!m || Number(m[1].replace(',', '.')) <= 0) return null
  const unidad = /^porci/.test(m[2]) ? 'porcion' : /^unidad/.test(m[2]) ? 'unidad' : /^(kilo|kg)/.test(m[2]) ? 'kg' : /^(gram|g$)/.test(m[2]) ? 'g' : /^(mili|ml)/.test(m[2]) ? 'ml' : 'lt'
  return { cantidad: Number(m[1].replace(',', '.')), unidad, producto: m[3].trim() }
}
