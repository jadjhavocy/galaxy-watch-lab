$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$base = Join-Path $env:LOCALAPPDATA 'GalaxyWatchLab\gradle'
$target = Join-Path $base 'gradle-8.9'
$gradle = Join-Path $target 'bin\gradle.bat'
if (-not (Test-Path $gradle)) {
    New-Item -ItemType Directory -Path $base -Force | Out-Null
    $zip = Join-Path $base 'gradle-8.9-bin.zip'
    Write-Host 'Downloading official Gradle 8.9 distribution (~130 MB)...'
    Invoke-WebRequest -Uri 'https://services.gradle.org/distributions/gradle-8.9-bin.zip' -OutFile $zip
    Expand-Archive -LiteralPath $zip -DestinationPath $base -Force
    Remove-Item $zip
}
$jbrPaths = @(
    (Join-Path $env:ProgramFiles 'Android\Android Studio\jbr'),
    (Join-Path $env:ProgramFiles 'Android Studio\jbr')
)
if (-not $env:JAVA_HOME) {
    foreach ($path in $jbrPaths) {
        if (Test-Path (Join-Path $path 'bin\java.exe')) { $env:JAVA_HOME=$path; break }
    }
}
if (-not $env:JAVA_HOME) { throw 'Set JAVA_HOME to Android Studio bundled JBR first' }
$sdk = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
if (-not $env:ANDROID_HOME -and (Test-Path $sdk)) { $env:ANDROID_HOME=$sdk }
if (-not $env:ANDROID_HOME) { throw 'Android SDK not found in default location; set ANDROID_HOME' }
Push-Location $root
try { & $gradle @args; exit $LASTEXITCODE } finally { Pop-Location }
