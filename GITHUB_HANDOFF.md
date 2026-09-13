# ChefOS — guía de continuación en GitHub

## Corte de estado — 13-09-2026

Edge Functions y cron ya están publicados y verificados en Supabase. `/api/auth/session` y el middleware API fueron corregidos; una prueba E2E con tokens reales confirmó cookie SSR, Storage accesible y `/dashboard` HTTP 200. Vercel está publicado en `https://chefos-pied.vercel.app` y la APK final ya fue regenerada con ese backend. Solo falta la prueba física final y el flujo E2E completo de negocio.

## Estado conocido

El proyecto Supabase real es `nipovuqpxvsgeqdrszuq`, con URL `https://nipovuqpxvsgeqdrszuq.supabase.co`. Las migraciones `001`–`006`, los buckets `facturas`, `importaciones`, `recetas-imagenes` y `recetas-videos`, las Edge Functions y los cron jobs fueron verificados. Vercel responde salud con Supabase y Storage operativos; los datos de negocio completos aún requieren una prueba E2E.

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

El workflow `.github/workflows/deploy.yml` reemplaza la plantilla anterior de GitHub Pages, porque ChefOS necesita runtime Next.js para sus API y middleware. Para activarlo en GitHub, configurar como secretos del repositorio `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (debe contener la Secret key actual `sb_secret_...` de Supabase), `ANTHROPIC_API_KEY`, `VERCEL_TOKEN`, `VERCEL_ORG_ID` y `VERCEL_PROJECT_ID`. El workflow valida el proyecto y publica la rama `main` en Vercel sin escribir secretos en el repositorio.

## Android

La APK final está en `artifacts/ChefOS-debug-final.apk` y apunta a `https://chefos-pied.vercel.app`. Es un APK debug para instalar directamente en Android; contiene `appId=com.chefos.app`, `cleartext=false` y fue compilado correctamente.

Para un teléfono físico, compilar apuntando a HTTPS:

```powershell
$env:CHEFOS_ANDROID_URL='https://chefos-pied.vercel.app'
powershell -ExecutionPolicy Bypass -File .\scripts\build-android.ps1 -BackendUrl $env:CHEFOS_ANDROID_URL -SkipCapacitorSync
```

Si Capacitor falla al leer el entorno Node de Windows, usar `-SkipCapacitorSync`; el script sincroniza los archivos web de forma equivalente y ejecuta Gradle con la configuración Android local.

El APK se genera en `artifacts/ChefOS-debug.apk`; si el archivo anterior está abierto por el sistema, el script usa `artifacts/ChefOS-debug-latest.apk`. La copia final entregada está en `artifacts/ChefOS-debug-final.apk` y debe probarse en un dispositivo físico.

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
