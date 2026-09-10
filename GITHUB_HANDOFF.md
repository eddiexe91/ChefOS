# ChefOS — guía de continuación en GitHub

## Corte de estado — 10-09-2026

Edge Functions y cron ya están publicados y verificados en Supabase. El siguiente trabajo debe corregir `/api/auth/session`: la autenticación directa de Supabase funciona, pero el middleware de Next.js no recibe todavía las cookies SSR en la prueba E2E. Después hay que regenerar `artifacts/ChefOS-debug-final.apk` y repetir el login desde Android. El backend público actual sigue siendo un túnel temporal.

## Estado conocido

El proyecto Supabase real es `nipovuqpxvsgeqdrszuq`, con URL `https://nipovuqpxvsgeqdrszuq.supabase.co`. Las migraciones `001`–`005` están aplicadas; los buckets `facturas`, `importaciones`, `recetas-imagenes` y `recetas-videos` fueron verificados. No hay usuarios ni datos de negocio todavía.

Chef IA funciona en modo básico sin Anthropic: entrega recomendaciones usando el contexto real del restaurante. `ANTHROPIC_API_KEY` es opcional y activa el modo avanzado en el chat, el briefing y el cierre.

## Preparar una copia de trabajo

```powershell
git clone <URL_DEL_REPOSITORIO>
cd ChefOS-main
Copy-Item .env.example .env.local
npm install
npm run type-check
npm run lint
npm run build
```

Si el `npm` global de Windows no funciona, usar `node .tools/package/bin/npm-cli.js install --no-audit --no-fund`.

## Backend Supabase

No guardar claves en GitHub. Usar `SUPABASE_ACCESS_TOKEN` solo para la CLI y `ANTHROPIC_API_KEY` solo como secreto de Supabase si se desea el modo avanzado. Las funciones se despliegan con:

```powershell
supabase functions deploy generar-briefing
supabase functions deploy chat-ia
supabase functions deploy cierre-diario
# Opcional: solo para modo avanzado
supabase secrets set ANTHROPIC_API_KEY=<usar-secreto-seguro>
```

Después, en el SQL Editor:

```sql
select public.configurar_cron_chefos(
  'https://nipovuqpxvsgeqdrszuq.supabase.co/functions/v1',
  '<SUPABASE_ANON_KEY>'
);
```

## Hosting permanente

El workflow `.github/workflows/deploy.yml` reemplaza la plantilla anterior de GitHub Pages, porque ChefOS necesita runtime Next.js para sus API y middleware. Para activarlo en GitHub, configurar como secretos del repositorio `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `VERCEL_TOKEN`, `VERCEL_ORG_ID` y `VERCEL_PROJECT_ID`. El workflow valida el proyecto y publica la rama `main` en Vercel sin escribir secretos en el repositorio.

## Android

La APK entregada en `artifacts/ChefOS-debug.apk` está apuntando actualmente a un túnel HTTPS temporal de demostración. Ese túnel requiere que el servidor local y el proceso de Cloudflare permanezcan encendidos; no es un despliegue de producción.

Para un teléfono físico, compilar apuntando a HTTPS:

```powershell
$env:CHEFOS_ANDROID_URL='https://<backend-publicado>'
powershell -ExecutionPolicy Bypass -File .\scripts\build-android.ps1 -BackendUrl $env:CHEFOS_ANDROID_URL
```

Si Capacitor falla al leer el entorno Node de Windows, usar `-SkipCapacitorSync`; el script sincroniza los archivos web de forma equivalente y ejecuta Gradle con la configuración Android local.

El APK se genera en `artifacts/ChefOS-debug.apk`; si el archivo anterior está abierto por el sistema, el script usa `artifacts/ChefOS-debug-latest.apk`. Es un APK debug y debe probarse en un dispositivo físico.

## Orden recomendado de validación

1. Registrar un usuario y confirmar restaurante, perfil, relación y datos iniciales.
2. Crear receta y producto.
3. Importar un CSV de ventas y confirmar la importación.
4. Ejecutar briefing y chat IA.
5. Confirmar inventario, alertas, Storage y cierre diario.
6. Probar el APK Android y revisar red/autenticación.

## Documentos de referencia

- `CHEFOS_MASTER_ARCHITECTURE.md`
- `CHEFOS_DATABASE_SPEC.md`
- `CHEFOS_ROADMAP.md`
- `supabase/DEPLOYMENT.md`
- `scripts/deploy-supabase.ps1`
