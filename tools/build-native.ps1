param(
    [string]$Godot = "$PSScriptRoot/bin/godot/Godot_v4.7.2-stable_win64_console.exe",
    [string]$Template = "$PSScriptRoot/bin/windows_release_x86_64.exe"
)
$ErrorActionPreference = 'Stop'
$projectPath = (Resolve-Path "$PSScriptRoot/../native").Path
$templatePath = (Resolve-Path $Template).Path.Replace('\','/')
$outputPath = Join-Path $projectPath 'build/Immortals-Glass-Choir'
New-Item -ItemType Directory -Force $outputPath | Out-Null
$preset = @"
[preset.0]
name="Windows"
platform="Windows Desktop"
runnable=true
advanced_options=false
export_filter="all_resources"
include_filter=""
exclude_filter="test-output/*,build/*,*.log"
export_path="build/Immortals-Glass-Choir/Immortals.exe"
encryption_include_filters=""
encryption_exclude_filters=""
encrypt_pck=false
encrypt_directory=false
[preset.0.options]
custom_template/debug=""
custom_template/release="$templatePath"
binary_format/embed_pck=false
binary_format/architecture="x86_64"
codesign/enable=false
application/modify_resources=false
"@
Set-Content -LiteralPath (Join-Path $projectPath 'export_presets.cfg') -Value $preset -Encoding utf8
& $Godot --headless --path $projectPath --export-release Windows
if ($LASTEXITCODE -ne 0) { throw 'Godot export failed' }
Copy-Item -LiteralPath "$projectPath/README.md" -Destination "$outputPath/README.md"
Copy-Item -LiteralPath "$projectPath/assets/ATTRIBUTION.md" -Destination "$outputPath/ASSET-CREDITS.md"
Copy-Item -LiteralPath "$PSScriptRoot/../LICENSE" -Destination "$outputPath/LICENSE.txt"
New-Item -ItemType Directory -Force "$outputPath/licenses" | Out-Null
Get-ChildItem -LiteralPath "$projectPath/licenses" -File | ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination "$outputPath/licenses" -Force
}
Copy-Item -LiteralPath "$projectPath/Launch-Compatibility.cmd" -Destination $outputPath -Force
$zipPath = Join-Path $projectPath 'build/Immortals-Glass-Choir-Windows-x64.zip'
Compress-Archive -Path "$outputPath/*" -DestinationPath $zipPath -Force
Get-FileHash -LiteralPath $zipPath -Algorithm SHA256
