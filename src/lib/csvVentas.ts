// CSV de POS: delimitador coma/punto y coma, comillas y decimales locales.
export function leerCsvVentas(texto: string): string[][] {
  texto = texto.replace(/^\uFEFF/, '')
  const primera = texto.split(/\r?\n/, 1)[0]
  const delimitador = primera.includes(';') ? ';' : ','
  const filas: string[][] = []; let fila: string[] = []; let celda = ''; let comillas = false
  for (let i=0; i<texto.length; i++) {
    const c=texto[i]
    if(c==='"' && comillas && texto[i+1]==='"'){celda+='"';i++;continue}
    if(c==='"'){comillas=!comillas;continue}
    if(c===delimitador && !comillas){fila.push(celda.trim());celda='';continue}
    if((c==='\r'||c==='\n')&&!comillas){if(c==='\r'&&texto[i+1]==='\n')i++;fila.push(celda.trim());if(fila.some(Boolean))filas.push(fila);fila=[];celda='';continue}
    celda+=c
  }
  if(comillas)throw new Error('El CSV tiene comillas sin cerrar.')
  fila.push(celda.trim());if(fila.some(Boolean))filas.push(fila)
  return filas
}
