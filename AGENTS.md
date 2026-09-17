# Instrucciones del proyecto ChefOS

## Documentos rectores

Antes de tomar decisiones importantes, leer `CHEFOS_NORTE_ESTRATEGICO.md` y `CHEFOS_MASTER_ARCHITECTURE.md`. El Norte Estratégico es una directriz expresa del usuario: tiene igual jerarquía que la arquitectura maestra y prevalece en conflictos de misión, UX y priorización. No implica que sus capacidades futuras estén implementadas. Para estado comprobado consultar `GITHUB_HANDOFF.md` y notas de versión.

Cada propuesta importante debe explicar cómo mejora datos fiables, comprensión operacional o decisiones accionables del Briefing. Si no lo hace, es secundaria y debe justificar su coste. No desarrollar un clon de POS. Priorizar automatizar > importar > registrar manualmente. Mantener cálculos verificables, procedencia, confianza y decisión final del chef; nunca convertir predicciones en certezas.

Las capturas por voz/OCR preparan propuestas revisables. No inferir silenciosamente productos, cantidades o unidades ni descontar stock sin confirmación. Verificar contraste en modo oscuro y regresiones antes de publicar. No subir secretos ni archivos adjuntos del usuario.

## Solicitudes que comienzan con JARVIS

Convertir el prompt del usuario en un prompt elaborado con CONTEXTO Y FUENTES, OBJETIVO, ENTREGABLES, LÍMITES DE AUTONOMÍA y DEFINICIÓN DE COMPLETADO. Completar información faltante con el contexto conocido, indicando supuestos relevantes.
