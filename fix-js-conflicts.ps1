$backup = "backup_js_conflicts"
New-Item -ItemType Directory -Force -Path $backup | Out-Null

$projectRoot = (Resolve-Path ".").Path
$jsFiles = Get-ChildItem -Path "src" -Recurse -Filter "*.js" -File

foreach ($f in $jsFiles) {
  $base = [System.IO.Path]::ChangeExtension($f.FullName, $null)
  $ts  = "$base.ts"
  $tsx = "$base.tsx"

  if ((Test-Path $ts) -or (Test-Path $tsx)) {
    $rel = $f.FullName.Substring($projectRoot.Length + 1)
    $destDir = Join-Path $backup (Split-Path $rel)
    New-Item -ItemType Directory -Force -Path $destDir | Out-Null
    Move-Item -Force $f.FullName (Join-Path $destDir $f.Name)
  }
}

Write-Host "Done. Moved conflicting .js files into $backup"
