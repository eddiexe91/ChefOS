# ChefOS — guía de continuación

## Actualización 16-09-2026 — versión 1.2.0

Consultar primero [RELEASE_1.2.0.md](RELEASE_1.2.0.md): reemplaza las afirmaciones de validación general de la sección histórica. Incluye causa comprobada de Recetas/Carta, briefing dinámico, migración 012 aplicada, capturas por voz/foto, pruebas y limitaciones. Sigue pendiente completar/verificar las funciones de salida de producción de 010; no considerar suficiente la presencia de columnas.

## Estado histórico al 15-09-2026

`main` contiene la versión validada de ChefOS. Login, onboarding con cargo, Inventario, Recetas, Carta, Producción, actividad reciente, compras, alertas, briefing y Chef IA básico están conectados al backend publicado.

Validado en teléfono: creación de recetas, creación de producciones, producciones pendientes y descuento de ingredientes del inventario al registrar producción. La migración `009_categoria_postres.sql` está en el repositorio y fue aplicada en Supabase.

La especificación completa de la siguiente iteración está en [COPILOT_NEXT_ITERATION.md](COPILOT_NEXT_ITERATION.md). Incluye separación Inventario/Stock disponible, elaboración de Carta, edición y archivado, onboarding, briefing y criterios de aceptación.

## Servicios actuales

- Vercel: [https://chefos-pied.vercel.app](https://chefos-pied.vercel.app)
- Supabase: proyecto `nipovuqpxvsgeqdrszuq`
- Supabase URL: `https://nipovuqpxvsgeqdrszuq.supabase.co`
- Rama fuente: `main`
- Chef IA: modo básico; Anthropic es opcional.

## Preparar y verificar

```powershell
Copy-Item .env.example .env.local
node .tools/package/bin/npm-cli.js install --no-audit --no-fund
node .tools/package/bin/npm-cli.js run type-check
node .tools/package/bin/npm-cli.js run lint
node .tools/package/bin/npm-cli.js run build
```

Si cambia el esquema, aplicar la nueva migración en el SQL Editor de Supabase antes de probar. No guardar secretos en GitHub.

## Generar APK

```powershell
powershell -ExecutionPolicy Bypass -File scripts/build-android.ps1 -BackendUrl https://chefos-pied.vercel.app -SkipCapacitorSync
```

Resultado esperado: `artifacts/ChefOS-debug.apk` o `artifacts/ChefOS-debug-latest.apk`. Es una APK debug instalable en Android y necesita el backend HTTPS publicado.

## Documentos de referencia

- [COPILOT_NEXT_ITERATION.md](COPILOT_NEXT_ITERATION.md)
- `CHEFOS_MASTER_ARCHITECTURE.md`
- `CHEFOS_DATABASE_SPEC.md`
- `CHEFOS_ROADMAP.md`
- `INVENTARIO_MAESTRO_SPRINT3.md`
- `supabase/DEPLOYMENT.md`
