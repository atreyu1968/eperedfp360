#requires -Version 5.1
<#
.SYNOPSIS
  Importa las 20 aplicaciones didacticas y compila EPE FP360 Portable para Windows.
.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\scripts\compilar-portable-windows.ps1 -ContenidoZip C:\Descargas\EPE_FP360_20_APLICACIONES_ALUMNADO_IMPORTACION.zip -ClavePublica C:\Docente\teacher-public.pem
.NOTES
  EJECUTAR EN WINDOWS 10/11 CON NODE.JS 24. No firma comercialmente el EXE.
  La clave privada NO se copia al ejecutable.
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)][string]$ContenidoZip,
  [string]$ClavePublica,
  [switch]$GenerarClaves
)
$ErrorActionPreference='Stop'
$root=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $root
function Fail([string]$message){ throw "[EPE FP360] $message" }
if(-not (Test-Path -LiteralPath $ContenidoZip -PathType Leaf)){ Fail "No existe el ZIP: $ContenidoZip" }
if(-not (Get-Command node -ErrorAction SilentlyContinue)){ Fail 'Instale Node.js 24 LTS (incluye npm) antes de compilar' }
if(-not (Get-Command npm -ErrorAction SilentlyContinue)){ Fail 'No se ha localizado npm' }
$nodeVersion=& node -p "Number(process.versions.node.split('.')[0])"
if([int]$nodeVersion -lt 24){ Fail "Se requiere Node.js 24 o superior. Actual: $nodeVersion" }

Write-Host '== EPE FP360: instalando dependencias ==' -ForegroundColor Cyan
& npm install --no-audit
if($LASTEXITCODE -ne 0){ Fail 'npm install ha fallado' }

$publicFile=Join-Path $root 'curriculum\teacher-public.pem'
if($GenerarClaves){
  if(Test-Path -LiteralPath $publicFile){ Fail 'Ya existe la clave publica. No se sobrescribira' }
  $secret=Read-Host -Prompt 'Frase de paso para proteger la clave privada docente (14+ caracteres)' -AsSecureString
  $ptr=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
  try{
    $env:EPE_TEACHER_KEY_PASSWORD=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
    if($env:EPE_TEACHER_KEY_PASSWORD.Length -lt 14){ Fail 'La frase de paso debe tener 14 caracteres o mas' }
    & node (Join-Path $root 'scripts\generate-teacher-keys.mjs')
    if($LASTEXITCODE -ne 0){ Fail 'No se pudo generar el par de claves docentes' }
  }finally{
    Remove-Item Env:\EPE_TEACHER_KEY_PASSWORD -ErrorAction SilentlyContinue
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
  }
}elseif($ClavePublica){
  if(-not (Test-Path -LiteralPath $ClavePublica -PathType Leaf)){ Fail "No existe el archivo de clave publica: $ClavePublica" }
  Copy-Item -LiteralPath $ClavePublica -Destination $publicFile -Force
}elseif(-not (Test-Path -LiteralPath $publicFile)){
  Fail 'Falta la clave publica. Use -ClavePublica RUTA o -GenerarClaves. Nunca copie la clave privada a curriculum/'
}
if(-not ((Get-Content -LiteralPath $publicFile -Raw).Contains('BEGIN PUBLIC KEY'))){ Fail 'El PEM publico parece invalido' }

$temp=Join-Path ([IO.Path]::GetTempPath()) ('epe-import-'+[guid]::NewGuid().ToString('N'))
New-Item -Path $temp -ItemType Directory -Force | Out-Null
try{
  Write-Host '== Extrayendo e importando 20 aplicaciones ==' -ForegroundColor Cyan
  Expand-Archive -LiteralPath $ContenidoZip -DestinationPath $temp -Force
  & node (Join-Path $root 'scripts\import-content.mjs') "--source=$temp"
  if($LASTEXITCODE -ne 0){ Fail 'No se localizaron los 20 HTML esperados en el ZIP' }
}finally{
  Remove-Item -LiteralPath $temp -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host '== Verificando permisos, evaluacion y adaptadores ==' -ForegroundColor Cyan
& npm test
if($LASTEXITCODE -ne 0){ Fail 'Las pruebas automatizadas no se han superado' }

Write-Host '== Preparando SQLite para Electron ==' -ForegroundColor Cyan
& npx electron-builder install-app-deps
if($LASTEXITCODE -ne 0){ Fail 'No se pudo reconstruir el modulo SQLite' }

Write-Host '== Compilando ejecutable portable de Windows ==' -ForegroundColor Cyan
& npm run build:win
if($LASTEXITCODE -ne 0){ Fail 'La compilacion portable ha fallado' }

$artifacts=@(Get-ChildItem -LiteralPath (Join-Path $root 'dist') -Filter '*.exe' -File -ErrorAction SilentlyContinue)
if($artifacts.Count -eq 0){ Fail 'No se encontro ningun archivo EXE tras compilar' }
Write-Host 'Compilacion completada. Aplicaciones encontradas:' -ForegroundColor Green
foreach($exe in $artifacts){ Write-Host ("  {0} ({1:N1} MB)" -f $exe.FullName,($exe.Length/1MB)) }
Write-Host 'IMPORTANTE: El ejecutable todavia requiere pruebas funcionales en un equipo de alumnado.' -ForegroundColor Yellow
Write-Host 'NO distribuya teacher-secrets ni archivos CSV docentes.' -ForegroundColor Yellow
