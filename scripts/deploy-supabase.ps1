param(
  [Parameter(Mandatory = $true)][string]$ProjectRef,
  [Parameter(Mandatory = $true)][string]$EdgeBaseUrl
)

$ErrorActionPreference = 'Stop'
if (-not $env:SUPABASE_ACCESS_TOKEN) { throw 'Define SUPABASE_ACCESS_TOKEN antes de desplegar.' }

$npx = Join-Path (Resolve-Path '.tools\package').Path 'bin\npx-cli.js'
function Invoke-Supabase([string[]]$Arguments) {
  & node $npx supabase @Arguments
  if ($LASTEXITCODE -ne 0) { throw "Supabase CLI falló con código $LASTEXITCODE: supabase $($Arguments -join ' ')" }
}

Invoke-Supabase @('link', '--project-ref', $ProjectRef)
Invoke-Supabase @('db', 'push')
if ($env:ANTHROPIC_API_KEY) { Invoke-Supabase @('secrets', 'set', "ANTHROPIC_API_KEY=$env:ANTHROPIC_API_KEY") }
foreach ($funcion in @('generar-briefing', 'chat-ia', 'cierre-diario')) {
  Invoke-Supabase @('functions', 'deploy', $funcion, '--project-ref', $ProjectRef)
}

Write-Host ''
Write-Host 'Migraciones y Edge Functions desplegadas.'
Write-Host 'Ejecuta una vez en el SQL Editor:'
Write-Host "select public.configurar_cron_chefos('$EdgeBaseUrl', '<SUPABASE_ANON_KEY>');"
