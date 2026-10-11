$ErrorActionPreference='Stop'
$root=Join-Path $env:USERPROFILE 'galaxy-watch-lab'
Set-Location $root
Write-Host 'Ensure receiver at http://127.0.0.1:8766 and watch GWL at 10 Hz START before capture.'
& node '.\gesture_campaign.mjs' capture
if($LASTEXITCODE -ne 0){throw 'CAMPAIGN_FAILED'}
