param([switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$projectDir = Split-Path -Parent $PSScriptRoot
$appUrl = 'http://127.0.0.1:8787/'
$healthUrl = $appUrl + 'api/health'

function Test-PrimerServer {
    try {
        $health = Invoke-RestMethod -Uri $healthUrl -TimeoutSec 2
        return $null -ne $health.engines
    } catch { return $false }
}

try {
    if (-not (Test-PrimerServer)) {
        $candidates = @()
        $installed = Get-ChildItem -Path (Join-Path $env:LOCALAPPDATA 'Programs\Python\Python*\python.exe') -ErrorAction SilentlyContinue | Sort-Object FullName -Descending
        $candidates += @($installed | ForEach-Object { $_.FullName })
        $pathPython = Get-Command python.exe -ErrorAction SilentlyContinue
        if ($pathPython) { $candidates += $pathPython.Source }
        $python = $null
        foreach ($candidate in $candidates) {
            try {
                & $candidate -c 'import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)' 2>$null
                if ($LASTEXITCODE -eq 0) { $python = $candidate; break }
            } catch { continue }
        }
        if (-not $python) { throw 'Python 3.10 or newer was not found. Install Python and run Start Primer.cmd again.' }

        $runtimeDir = Join-Path $projectDir '.runtime'
        New-Item -ItemType Directory -Force -Path $runtimeDir | Out-Null
        $stdoutLog = Join-Path $runtimeDir 'primer-server.log'
        $stderrLog = Join-Path $runtimeDir 'primer-server-error.log'
        $serverScript = Join-Path $PSScriptRoot 'translator_server.py'
        # Refresh the optional per-user API key when the launching shell predates it.
        if (-not $env:TBA_AUTH_KEY) {
            $primerTbaKey = [Environment]::GetEnvironmentVariable('TBA_AUTH_KEY', 'User')
            if ($primerTbaKey) { $env:TBA_AUTH_KEY = $primerTbaKey }
        }
        $process = Start-Process -FilePath $python -ArgumentList @('"' + $serverScript + '"') -WorkingDirectory $projectDir -WindowStyle Hidden -RedirectStandardOutput $stdoutLog -RedirectStandardError $stderrLog -PassThru
        for ($attempt = 0; $attempt -lt 40; $attempt++) {
            if (Test-PrimerServer) { break }
            if ($process.HasExited) { throw "The Primer server exited. Check $stderrLog for details." }
            Start-Sleep -Milliseconds 250
        }
        if (-not (Test-PrimerServer)) { throw "The Primer server did not start. Check $stderrLog for details." }
    }
    if (-not $NoBrowser) { Start-Process $appUrl }
} catch {
    Write-Host "Could not start Primer: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
