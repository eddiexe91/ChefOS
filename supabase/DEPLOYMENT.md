# Despliegue real de ChefOS en Supabase

## Corte de estado — 10-09-2026

Las tres Edge Functions y los dos cron jobs están publicados y respondieron correctamente. El puente de sesión SSR del backend Next.js fue corregido: la prueba local con tokens reales de un usuario temporal devolvió HTTP 200 y cookies de sesión. La confirmación restante es el flujo completo desde el teléfono físico.

La migración `006_consistencia_operativa.sql` también fue aplicada desde el SQL Editor. Comprueba que `registrar_merma_completa` y `recibir_compra_completa` existan antes de desplegar una instalación nueva. El login SSR fue probado con un usuario temporal real y el endpoint `/dashboard` respondió HTTP 200.

Proyecto actualmente configurado: `nipovuqpxvsgeqdrszuq` — `https://nipovuqpxvsgeqdrszuq.supabase.co`.

1. Completar `.env.local` desde `.env.example` sin subirlo a Git.
2. Las migraciones `001` a `006` ya fueron aplicadas y verificadas. En una instalación nueva, ejecutarlas en orden desde el SQL Editor o con `supabase db push`.
3. Opcional: crear el secreto de Anthropic para activar el modo avanzado de Chef IA:

```bash
supabase secrets set ANTHROPIC_API_KEY=...
```

El modo básico de Chef IA no necesita este secreto. Desplegar las funciones:

```bash
supabase functions deploy generar-briefing
supabase functions deploy chat-ia
supabase functions deploy cierre-diario
```

5. Activar los cron jobs usando el SQL Editor. La URL base es `https://<project-ref>.supabase.co/functions/v1`:

```sql
select public.configurar_cron_chefos(
  'https://<project-ref>.supabase.co/functions/v1',
  '<SUPABASE_ANON_KEY>'
);
```

No se deben guardar claves de servicio en el repositorio. Los objetos de Storage deben usar como primer segmento del path el `restaurante_id`, por ejemplo `/<restaurante_id>/facturas/factura-01.jpg`.

## Estado actual del proyecto

- Las tres Edge Functions (`chat-ia`, `generar-briefing`, `cierre-diario`) están publicadas y respondieron HTTP 200.
- `configurar_cron_chefos` fue ejecutada en el proyecto real; los jobs `chefos-briefing-0600` y `chefos-cierre-2300` están activos.
- `ANTHROPIC_API_KEY` es opcional; sin ella se conserva el modo básico por reglas.
- Falta ejecutar la E2E completa de negocio desde Android y publicar el backend Next.js en hosting HTTPS permanente.
