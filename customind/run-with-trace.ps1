try {
    & '.\DeployAJInstitutionaltoOpenAlgoIndicator.ps1' -Execute -Force
} catch {
    Write-Host '=== MESSAGE ===' -ForegroundColor Red
    Write-Host $_.Exception.Message
    Write-Host '=== LINE ===' -ForegroundColor Red
    Write-Host $_.InvocationInfo.ScriptLineNumber
    Write-Host '=== LINE TEXT ===' -ForegroundColor Red
    Write-Host $_.InvocationInfo.Line
    Write-Host '=== STACK ===' -ForegroundColor Red
    Write-Host $_.ScriptStackTrace
}
