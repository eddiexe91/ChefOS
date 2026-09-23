# ChefOS — guía de continuación

## Entrega de pruebas 1.3.0 — 22-09-2026

Consultar [RELEASE_1.3.0.md](RELEASE_1.3.0.md) y [GUIA_TESTEO_CHEFOS_1.3.0.md](GUIA_TESTEO_CHEFOS_1.3.0.md). APK 1.3.0 compilada, con firma compatible con 1.2.0. No borrar datos ni recrear cuenta. **Activación del historial en Supabase pendiente:** el importador verifica el esquema y muestra un bloqueo explícito si falta; Inicio conserva compatibilidad con la base anterior. Las notas históricas de debajo no certifican despliegue del nuevo esquema ni pruebas físicas.

## Infraestructura de historial POS

Leer [HISTORIAL_POS_ARQUITECTURA.md](HISTORIAL_POS_ARQUITECTURA.md). Se amplían ventas con tickets, pagos múltiples, productos POS/mapeos, preparación por bloques, validación, confirmación atómica e idempotencia. Migraciones nuevas **013 y 014**, aún no aplicadas en producción por esta tarea. No se importó historial real.

Nuevas pantallas: `/ventas/importar` (cuatro CSV), `/ventas/mapeos`, `/ventas/analitica`. El Briefing recibe contexto agregado y observaciones con período/limitaciones; no se ha calibrado un forecast ni implementado el ciclo de descongelación. Antes de activar/importar historial, aplicar y verificar ambas migraciones; el Dashboard utiliza `total_ventas_periodo` con compatibilidad limitada al esquema anterior sin historia.

Pruebas locales: `npm run test:historial` (PostgreSQL en memoria, sin Supabase), `npm run test:historial-ui`, `node scripts/test-historial.cjs --scale` (50.000 líneas sintéticas), `npm run test:captura`, type-check, lint y build. Pasaron localmente; lint/build conservan advertencias documentadas. Los resultados y límites deben consultarse en el documento citado; no confundirlos con una validación en Android o en producción. Los flujos antiguos de revisión/descuento están separados del historial y las escrituras históricas directas se rechazan también en PostgreSQL.

## Norte permanente y corrección de captura

El documento rector [CHEFOS_NORTE_ESTRATEGICO.md](CHEFOS_NORTE_ESTRATEGICO.md) y `AGENTS.md` gobiernan próximas decisiones junto con la arquitectura maestra. Prioridad: Briefing accionable en menos de 30 segundos, captura fiable, cálculos explicables, incertidumbre y resultado real; no agregar módulos por cantidad.

Corrección de testeo: colores base explícitos en modo oscuro y contraste de texto secundario; voz admite “registro dos porciones de merma de congrio” además de “2 porciones de congrio como merma”. Sigue siendo un intérprete determinista de variantes acotadas, con selección/revisión y confirmación; no es comprensión libre de cualquier frase. Se mantiene la APK 1.2.0 porque son cambios web, sin cambios nativos.

## Actualización 16-09-2026 — versión 1.2.0

Consultar primero [RELEASE_1.2.0.md](RELEASE_1.2.0.md): reemplaza las afirmaciones de validación general de la sección histórica. Incluye causa comprobada de Recetas/Carta, briefing dinámico, migración 012 aplicada, capturas por voz/foto, pruebas y limitaciones. Las funciones pendientes de 010 ya se aplicaron: prueba transaccional PASS de consumo, salida a Stock disponible, actividad y merma. Sigue pendiente el testeo físico de la nueva versión.

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
