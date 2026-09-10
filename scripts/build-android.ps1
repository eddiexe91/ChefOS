param([Parameter(Mandatory = $true)][string]$BackendUrl, [switch]$SkipCapacitorSync)

$ErrorActionPreference = 'Stop'
$env:CHEFOS_ANDROID_URL = $BackendUrl
$env:JAVA_HOME = (Resolve-Path '.android-tools\jdk21\jdk-21.0.12.1+1').Path
$env:ANDROID_HOME = (Resolve-Path '.android-tools\sdk').Path
$env:ANDROID_SDK_ROOT = (Resolve-Path '.android-tools\sdk').Path
$env:ANDROID_USER_HOME = (Join-Path (Get-Location).Path '.android-build-user')
$env:GRADLE_USER_HOME = (Join-Path (Get-Location).Path '.gradle-home')
$keytool = Join-Path $env:JAVA_HOME 'bin\keytool.exe'
if (-not (Test-Path 'android\app\chefos-debug.keystore')) {
  & $keytool -genkeypair -keystore 'android\app\chefos-debug.keystore' -storepass 'chefos-debug' -alias 'chefos-debug' -keypass 'chefos-debug' -keyalg RSA -keysize 2048 -validity 10000 -dname 'CN=ChefOS Debug, OU=ChefOS, O=ChefOS, L=Santiago, ST=RM, C=CL'
  if ($LASTEXITCODE -ne 0) { throw "No se pudo crear el almacén de firma debug." }
}
$npx = Join-Path (Resolve-Path '.tools\package').Path 'bin\npx-cli.js'
$nodeExe = if ($env:CHEFOS_NODE_PATH) { $env:CHEFOS_NODE_PATH } else { 'node' }
if ($SkipCapacitorSync) {
  Copy-Item 'public\*' 'android\app\src\main\assets\public' -Recurse -Force
  @{ appId = 'com.chefos.app'; appName = 'ChefOS'; webDir = 'public'; server = @{ url = $BackendUrl; cleartext = $BackendUrl.StartsWith('http://'); allowNavigation = @('*') }; android = @{ backgroundColor = '#080808' } } |
    ConvertTo-Json -Depth 5 | Set-Content 'android\app\src\main\assets\capacitor.config.json' -Encoding utf8
} else {
  & $nodeExe $npx cap sync android
  if ($LASTEXITCODE -ne 0) { throw "Capacitor sync falló con código $LASTEXITCODE. Usa -SkipCapacitorSync si el problema proviene del entorno Node." }
}
Push-Location android
try { & '.\gradlew.bat' assembleDebug --no-daemon --no-problems-report; if ($LASTEXITCODE -ne 0) { throw "Gradle falló con código $LASTEXITCODE." } } finally { Pop-Location }
New-Item -ItemType Directory -Force -Path artifacts | Out-Null
try {
  Copy-Item 'android\app\build\outputs\apk\debug\app-debug.apk' 'artifacts\ChefOS-debug.apk' -Force
  Write-Host 'APK generada en artifacts\ChefOS-debug.apk'
} catch {
  Copy-Item 'android\app\build\outputs\apk\debug\app-debug.apk' 'artifacts\ChefOS-debug-latest.apk' -Force
  Write-Host 'APK generada en artifacts\ChefOS-debug-latest.apk porque la anterior estaba abierta.'
}
