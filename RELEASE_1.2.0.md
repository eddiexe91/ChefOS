# ChefOS 1.2.0 — 16 septiembre 2026

## Corrección posterior al testeo de voz

- La transcripción real “registro dos porciones de merma de congrio” ahora se interpreta como 2 porciones de congrio, siempre pendientes de revisión y confirmación.
- Se acepta `registro`, `registra`, `registrar`, `anota`, `anotar` y formas acotadas de “merma de…”. No es interpretación generativa ni comprensión ilimitada. Los datos ambiguos no se ejecutan automáticamente.
- Colores base explícitos, esquema oscuro y mayor contraste de texto secundario. La causa del negro era la ausencia de color heredado en body para títulos/etiquetas sin clase específica.
- 17 pruebas de voz/CSV y compilación Next.js correctas. Vista SSR local con datos simulados: títulos y etiquetas calculados en rgb(242,239,232), fondo rgb(8,8,8); ancho de contenido 390px para viewport 390px, sin desborde. La captura de pantalla del navegador no estuvo disponible; no se afirma validación en Android físico.
- Documento `CHEFOS_NORTE_ESTRATEGICO.md` incorporado como rector y enlazado desde arquitectura/AGENTS/handoff. Guía de prioridades futuras, no declaración de funciones ya terminadas.
- Cambios exclusivamente web: no requieren otra compilación de la APK 1.2.0. Cerrar y abrir la aplicación tras el despliegue para probarlos.

## Correcciones y funciones

- Recetas/Carta: relación explícita `productos!recetas_producto_salida_id_fkey`. La consulta anterior devuelve PGRST201 porque hay dos relaciones posibles; la corregida respondió HTTP 200.
- Briefing: análisis operativo al entrar y cada minuto, con compras, producción y configuración pendiente. Devuelve recomendaciones aun si no puede guardar el historial; si falla alguna fuente advierte que el análisis está incompleto. Sin dependencia de Anthropic.
- Categoría Caldos y Bases en productos/recetas y filtro de producción.
- Registro en dos pasos: restaurante primero, cuenta personal después. Unirse a un restaurante mediante clave de equipo de un uso, 7 días, rol asignado por dueño/administración/chef ejecutivo. No compartir contraseñas personales.
- Datos compartidos mediante Supabase/RLS: eventos en tiempo real y actualización de respaldo cada 30 segundos con la app visible.
- Captura rápida desde Inicio/configuración: dictado Android para preparar una merma, selección exacta de producto y confirmación antes del descuento.
- OCR gratuito de fotos con Tesseract.js en el dispositivo; descarga inicial de idioma. Texto revisable y borrador CSV de comandas. Los precios se dejan en cero para revisión; no confundir total de línea con precio unitario.
- Ventas CSV: comillas, separador coma/punto y coma, validación de cantidades/precios, omisión de filas anuladas. El consumo requiere confirmación en Ventas.
- Icono propio: llama cobre sobre fondo oscuro con elemento de corte; identidad consistente con el encabezado. Fuente vectorial en `public/chefos-mark.svg`; regenerar con `node scripts/generate-icons.cjs`.

## Supabase y validaciones

- Migración 012 aplicada y confirmada en SQL Editor: categorías, claves/roles de equipo, políticas de escritura de briefings y RPC para crear claves sin depender de service_role en el servidor web.
- Prueba SQL con BEGIN/ROLLBACK: alta de restaurante, categorías, usuario de equipo, clave consumida, creación de receta/carta, descuento por producción y merma. Resultado PASS; no persisten datos de prueba. Archivo `scripts/test-operacion.sql`.
- RESUELTO el 16-09-2026: se recuperó la sesión de Supabase mediante la cuenta vinculada. Se completaron las funciones, el trigger de validación de salida y la restricción de actividad de `010_stock_operativo_carta.sql` que faltaban (la estructura ya existía). SQL Editor confirmó éxito. Prueba BEGIN/ROLLBACK: receta guarda salida de 1000 g, producción consume 1000 g de materia prima y acredita 1000 g de elaborado, registra actividad y una merma de 250 g deja 750 g. Resultado PASS, sin datos QA persistidos. No cambiaron permisos ni existencias reales.
- La clave administrativa local respondió `Unregistered API key`. No se copia a GitHub. `scripts/test-operacion.cjs` necesita una clave administrativa válida y un backend de prueba para sus pruebas API; no se ejecutó satisfactoriamente. La prueba SQL transaccional sí pasó, pero no sustituye pruebas RLS con un usuario real.
- Compilación web y Android correctas. Avisos existentes: dependencia useEffect de onboarding, compatibilidad Edge de Supabase y advertencias Gradle/flatDir. No son pruebas de funcionamiento en un teléfono.
- `node scripts/test-captura.cjs`: 11 pruebas de interpretación de voz y CSV, sin dependencias nuevas de test.

## Compilar y desplegar

1. Instalar dependencias con `npm ci` (o runtime npm local `.tools/package/bin/npm-cli.js`).
2. Ejecutar `npm run type-check`, `npm run lint`, `npm run build`, `node scripts/test-captura.cjs`.
3. Publicar `main`, comprobar deployment de Vercel y `/api/health` con `version: 1.2.0`. La APK carga `https://chefos-pied.vercel.app`: compilar Android NO publica los cambios web.
4. `powershell -ExecutionPolicy Bypass -File scripts/build-android.ps1 -BackendUrl https://chefos-pied.vercel.app -SkipCapacitorSync`. Esta opción requiere dependencias Capacitor ya sincronizadas; usar sin el switch en un equipo nuevo.
5. Artefacto `artifacts/ChefOS-debug.apk`, versionCode 3/versionName 1.2.0. Mantener el almacén de firma local para actualizar sin desinstalar. No publicar claves ni almacenes de firma.

## Testeo prioritario en teléfono

1. Abrir Recetas y Carta: deben mostrar las fichas existentes; crear una ficha de prueba con ingredientes en g/kg y comprobar el guardado.
2. Inicio: con stock crítico deben aparecer compras sugeridas, no “Sin briefing para hoy”. Modificar existencias y volver a Inicio.
3. Producción: verificar descuento y aumento del producto elaborado configurado; las funciones 010 ya están aplicadas y probadas en base de datos.
4. Crear clave en Configuración > Equipo; otra persona registra su propia cuenta con ella. Verificar mismo restaurante/rol, rechazo de reutilización y datos visibles únicamente a miembros.
5. Captura rápida: dictar, revisar y cancelar primero; luego confirmar una merma controlada y verificar un único descuento.
6. Foto de comanda: comprobar OCR, corregir borrador y precios, importar una sola vez, revisar platos y confirmar consumo. No importar comandas reales dos veces.

## Alcance y pendientes

- No hay integración directa por API con un POS concreto; el intercambio disponible es CSV y foto con revisión.
- Importar/confirmar ventas requiere Dueño o Administración, de acuerdo con las políticas existentes; no se amplían permisos de ventas al chef ejecutivo en esta entrega.
- OCR de factura extrae texto, NO registra automáticamente una compra ni interpreta impuestos.
- No se implementó conciliación de cancelaciones posteriores a una venta ya descontada ni deduplicación automática de comandas.
- Dictado depende del reconocedor Android; puede requerir Internet. No hay escucha permanente ni activación por palabra clave.
- Modo offline completo, sincronización de escrituras y pruebas simultáneas con dos teléfonos pendientes.
- No se han validado cámara/micrófono ni el flujo autenticado completo en un dispositivo físico en esta entrega. Requiere testeo del usuario.
- APK de prueba: `artifacts/ChefOS-1.2.0-test.apk`, SHA256 `D56D83F2D09E6026DE211B599A7AC430F39776F8281015B7535DC069CAC5CE37`. Firma verificada con apksigner.

## Fuentes técnicas y criterio visual

Icono simple, contraste alto y silueta reconocible a tamaño pequeño: se comunica cocina/acción sin texto diminuto. Es una decisión de diseño, no un estudio publicitario con usuarios.

- [Android: especificación de iconos](https://developer.android.com/distribute/google-play/resources/icon-design-specifications)
- [Android RecognizerIntent](https://developer.android.com/reference/android/speech/RecognizerIntent)
- [Tesseract.js](https://github.com/naptha/tesseract.js)
