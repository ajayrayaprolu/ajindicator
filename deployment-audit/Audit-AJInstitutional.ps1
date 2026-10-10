
# Audit-AJInstitutional.ps1
# Read-only project audit. Writes reports to .\deployment-audit.
# Does NOT install dependencies, modify source, or create the deployment ZIP.

[CmdletBinding()]
param(
    [string]$ProjectRoot = $PSScriptRoot
)

$ErrorActionPreference = "Stop"

$ProjectRoot = (Resolve-Path -LiteralPath $ProjectRoot).Path
$AuditDir = Join-Path $ProjectRoot "deployment-audit"
New-Item -ItemType Directory -Path $AuditDir -Force | Out-Null

$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$ReportBase = "AJ-Institutional-Audit-$Timestamp"

$ExcludedDirectoryNames = @(
    "node_modules", ".git", "dist", "build",
    ".logs", "git-logs", "deployment-audit"
)

$FileInventory = [System.Collections.Generic.List[object]]::new()
$ManifestReport = [System.Collections.Generic.List[object]]::new()
$EnvReferences = [System.Collections.Generic.List[object]]::new()
$Findings = [System.Collections.Generic.List[object]]::new()
$CandidateFiles = [System.Collections.Generic.List[string]]::new()

function Get-RelativePath([string]$Path) {
    return [System.IO.Path]::GetRelativePath($ProjectRoot, $Path).
        Replace("\", "/")
}

function Get-PackageClassification([string]$RelativePath) {
    $p = $RelativePath.Replace("\", "/")
    $name = [System.IO.Path]::GetFileName($p)

    # Sensitive files: never automatically include these.
    if ($p -match '(^|/)\.env($|\.)' -or
        $name -in @("session.json", "token.json", "credentials.json") -or
        $p -match '(^|/)(certs?|secrets?|private-keys?)(/|$)' -or
        $name -match '\.(pem|key|pfx|p12|jks)$') {
        return @{
            Decision = "EXCLUDE"
            Reason = "Potential secrets, sessions, credentials, or certificates"
        }
    }

    # Runtime state, generated data, and local-machine artifacts.
    if ($p -match '\.(db|sqlite|sqlite3|db-shm|db-wal)$' -or
        $p -match '(^|/)(node_modules|dist|build|\.logs|git-logs|\.git)(/|$)' -or
        $p -match '(^|/)(coverage|\.cache|\.vite|__pycache__)(/|$)' -or
        $name -match '^desktop\.ini$') {
        return @{
            Decision = "EXCLUDE"
            Reason = "Generated output, runtime data, cache, or OS artifact"
        }
    }

    # Backups must be reviewed rather than deployed automatically.
    if ($name -match '\.(bak|backup|old)(\.|$)' -or
        $name -match '\.bak[.-]' -or
        $name -match '\.backup[-.]') {
        return @{
            Decision = "REVIEW"
            Reason = "Backup or historical copy; verify whether required"
        }
    }

    # This file may contain real secrets despite its name.
    if ($name -in @("sample.env", ".env.example",
                    ".env.sample", ".env.template") -or
        $name -match '\.env\..*sample') {
        return @{
            Decision = "REVIEW"
            Reason = "Inspect for real credentials before including"
        }
    }

    return @{
        Decision = "CANDIDATE_INCLUDE"
        Reason = "Potential application source, configuration, or dependency file"
    }
}

Write-Host "`n=== AJ INSTITUTIONAL DEPLOYMENT AUDIT ===" -ForegroundColor Cyan
Write-Host "Project: $ProjectRoot"
Write-Host "Reports: $AuditDir"

# 1. Runtime versions
$RuntimeChecks = @()

foreach ($cmd in @(
    @{ Name = "node"; Args = @("--version") },
    @{ Name = "npm";  Args = @("--version") },
    @{ Name = "python"; Args = @("--version") },
    @{ Name = "py"; Args = @("--version") },
    @{ Name = "pwsh"; Args = @("--version") },
    @{ Name = "git"; Args = @("--version") }
)) {
    $command = Get-Command $cmd.Name -ErrorAction SilentlyContinue

    if ($command) {
        try {
            $output = (& $cmd.Name @($cmd.Args) 2>&1 |
                Out-String).Trim()
            $status = "AVAILABLE"
        }
        catch {
            $output = $_.Exception.Message
            $status = "ERROR"
        }
    }
    else {
        $output = "Not found on PATH"
        $status = "MISSING"
    }

    $RuntimeChecks += [PSCustomObject]@{
        Runtime = $cmd.Name
        Status = $status
        Output = $output
    }
}

# 2. Package manifests and declared scripts/dependencies
$ManifestNames = @(
    "package.json", "package-lock.json", "npm-shrinkwrap.json",
    "yarn.lock", "pnpm-lock.yaml", "requirements.txt",
    "pyproject.toml", "Pipfile", "poetry.lock",
    "tsconfig.json", "vite.config.ts", "ecosystem.config.cjs"
)

foreach ($manifestName in $ManifestNames) {
    $matches = Get-ChildItem -LiteralPath $ProjectRoot `
        -Recurse -File -Filter $manifestName `
        -ErrorAction SilentlyContinue |
        Where-Object {
            $_.FullName -notmatch '[\\/](node_modules|\.git|dist|build|deployment-audit)[\\/]'
        }

    foreach ($file in $matches) {
        $relative = Get-RelativePath $file.FullName
        $record = [ordered]@{
            Path = $relative
            Type = $file.Name
            SizeBytes = $file.Length
            Scripts = @()
            Dependencies = @()
            DevDependencies = @()
            ParseError = $null
        }

        if ($file.Name -eq "package.json") {
            try {
                $pkg = Get-Content -LiteralPath $file.FullName -Raw |
                    ConvertFrom-Json

                $record.Scripts = @(
                    $pkg.scripts.PSObject.Properties |
                    ForEach-Object {
                        "$($_.Name)=$($_.Value)"
                    }
                )

                $record.Dependencies = @(
                    $pkg.dependencies.PSObject.Properties |
                    ForEach-Object {
                        "$($_.Name)=$($_.Value)"
                    }
                )

                $record.DevDependencies = @(
                    $pkg.devDependencies.PSObject.Properties |
                    ForEach-Object {
                        "$($_.Name)=$($_.Value)"
                    }
                )
            }
            catch {
                $record.ParseError = $_.Exception.Message
                $Findings.Add("Could not parse ${relative}: $($_.Exception.Message)")
            }
        }

        $ManifestReport.Add([PSCustomObject]$record)
    }
}

# 3. File inventory and proposed package decisions.
# Skip large/generated directories during recursive enumeration.
$allFiles = Get-ChildItem -LiteralPath $ProjectRoot `
    -Recurse -File -Force -ErrorAction SilentlyContinue |
    Where-Object {
        $rel = Get-RelativePath $_.FullName
        $segments = $rel.Split("/")
        -not ($segments | Where-Object {
            $_ -in $ExcludedDirectoryNames
        })
    }

foreach ($file in $allFiles) {
    $relative = Get-RelativePath $file.FullName
    $classification = Get-PackageClassification $relative

    $entry = [PSCustomObject]@{
        Path = $relative
        SizeBytes = $file.Length
        Extension = $file.Extension
        Decision = $classification.Decision
        Reason = $classification.Reason
    }

    $FileInventory.Add($entry)

    if ($classification.Decision -eq "CANDIDATE_INCLUDE") {
        $CandidateFiles.Add($relative)
    }
}

# 4. Find environment-variable references in source code.
# Reads source code only; never reads .env or credential/session files.
$SourceExtensions = @(
    ".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx",
    ".py", ".ps1", ".json"
)

$EnvPattern = @(
    'process\.env\.([A-Za-z_][A-Za-z0-9_]*)',
    'import\.meta\.env\.([A-Za-z_][A-Za-z0-9_]*)',
    'process\.env\[[''"]([A-Za-z_][A-Za-z0-9_]*)[''"]\]',
    'os\.environ(?:\.get)?\([''"]([A-Za-z_][A-Za-z0-9_]*)[''"]'
) -join "|"

$sourceFiles = $allFiles | Where-Object {
    $_.Extension -in $SourceExtensions -and
    $_.Name -notmatch '\.min\.' -and
    $_.Length -lt 2MB
}

foreach ($file in $sourceFiles) {
    $relative = Get-RelativePath $file.FullName

    try {
        $content = Get-Content -LiteralPath $file.FullName -Raw

        foreach ($match in [regex]::Matches($content, $EnvPattern)) {
            $variable = $null

            for ($i = 1; $i -lt $match.Groups.Count; $i++) {
                if ($match.Groups[$i].Success) {
                    $variable = $match.Groups[$i].Value
                    break
                }
            }

            if ($variable) {
                $EnvReferences.Add([PSCustomObject]@{
                    Variable = $variable
                    ReferencedIn = $relative
                })
            }
        }
    }
    catch {
        $Findings.Add("Could not inspect source file $relative")
    }
}

$EnvReferences = @(
    $EnvReferences |
    Sort-Object Variable, ReferencedIn -Unique
)

# 5. Identify important paths and potentially required resources.
$ImportantPaths = @(
    "package.json", "package-lock.json", "index.html",
    "vite.config.ts", "tsconfig.json", "server/index.js",
    "start-server.js", "ecosystem.config.cjs", ".gitignore",
    "README.md", "server/dailyIstScheduler.js"
)

$ImportantPathStatus = foreach ($p in $ImportantPaths) {
    $full = Join-Path $ProjectRoot ($p.Replace("/", "\"))
    [PSCustomObject]@{
        Path = $p
        Exists = Test-Path -LiteralPath $full
    }
}

# Report names/locations of sensitive and runtime files, not their contents.
$SensitiveInventory = @(
    $FileInventory | Where-Object {
        $_.Decision -eq "EXCLUDE" -or $_.Decision -eq "REVIEW"
    }
)

# 6. Build an audit summary.
$Summary = [ordered]@{
    GeneratedAt = (Get-Date).ToString("o")
    ProjectRoot = $ProjectRoot
    OperatingSystem = [System.Environment]::OSVersion.VersionString
    MachineArchitecture = $env:PROCESSOR_ARCHITECTURE
    TotalInventoriedFiles = $FileInventory.Count
    CandidateIncludeCount = @(
        $FileInventory | Where-Object {
            $_.Decision -eq "CANDIDATE_INCLUDE"
        }
    ).Count
    ExcludedCount = @(
        $FileInventory | Where-Object {
            $_.Decision -eq "EXCLUDE"
        }
    ).Count
    ReviewCount = @(
        $FileInventory | Where-Object {
            $_.Decision -eq "REVIEW"
        }
    ).Count
    Note = "Candidate files are not yet an approved deployment package."
}

# 7. Save audit outputs.
$RuntimeChecks |
    Export-Csv -NoTypeInformation -Encoding UTF8 `
        -Path (Join-Path $AuditDir "$ReportBase-runtimes.csv")

$ManifestReport |
    ConvertTo-Json -Depth 8 |
    Set-Content -Encoding UTF8 `
        -Path (Join-Path $AuditDir "$ReportBase-manifests.json")

$FileInventory |
    Export-Csv -NoTypeInformation -Encoding UTF8 `
        -Path (Join-Path $AuditDir "$ReportBase-files.csv")

$EnvReferences |
    Export-Csv -NoTypeInformation -Encoding UTF8 `
        -Path (Join-Path $AuditDir "$ReportBase-env-references.csv")

$ImportantPathStatus |
    Export-Csv -NoTypeInformation -Encoding UTF8 `
        -Path (Join-Path $AuditDir "$ReportBase-important-paths.csv")

$SensitiveInventory |
    Export-Csv -NoTypeInformation -Encoding UTF8 `
        -Path (Join-Path $AuditDir "$ReportBase-review-exclude.csv")

$Summary |
    ConvertTo-Json -Depth 5 |
    Set-Content -Encoding UTF8 `
        -Path (Join-Path $AuditDir "$ReportBase-summary.json")

# Candidate list is informational only. Do not use it as a final ZIP
# allowlist until dependency/runtime/data requirements have been reviewed.
$CandidateFiles |
    Sort-Object -Unique |
    Set-Content -Encoding UTF8 `
        -Path (Join-Path $AuditDir "$ReportBase-candidate-files.txt")

# Human-readable report
$Report = [System.Collections.Generic.List[string]]::new()
$Report.Add("# AJ Institutional Trading Platform - Audit")
$Report.Add("")
$Report.Add("Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')")
$Report.Add("Project: $ProjectRoot")
$Report.Add("")
$Report.Add("## Summary")
$Report.Add("")
$Report.Add("- Files inventoried: $($FileInventory.Count)")
$Report.Add("- Candidate includes: $($Summary.CandidateIncludeCount)")
$Report.Add("- Excluded: $($Summary.ExcludedCount)")
$Report.Add("- Requires review: $($Summary.ReviewCount)")
$Report.Add("")
$Report.Add("## Runtime checks")
$Report.Add("")
foreach ($runtime in $RuntimeChecks) {
    $Report.Add("- $($runtime.Runtime): $($runtime.Status) — $($runtime.Output)")
}
$Report.Add("")
$Report.Add("## Important paths")
$Report.Add("")
foreach ($item in $ImportantPathStatus) {
    $Report.Add("- $($item.Path): $(if ($item.Exists) {'FOUND'} else {'MISSING'})")
}
$Report.Add("")
$Report.Add("## Package decisions")
$Report.Add("")
$Report.Add("- `CANDIDATE_INCLUDE`: potential source/configuration files.")
$Report.Add("- `EXCLUDE`: secrets, sessions, certificates, runtime state, generated output.")
$Report.Add("- `REVIEW`: backups and environment templates that must be checked.")
$Report.Add("")
$Report.Add("## Important safety notes")
$Report.Add("")
$Report.Add("- No file contents from `.env`, session files, or private keys were added to reports.")
$Report.Add("- SQLite databases and WAL/SHM files are excluded by default.")
$Report.Add("- Do not assume every candidate file is required or safe to distribute.")
$Report.Add("- Verify that environment templates contain placeholders rather than live credentials.")
$Report.Add("- Confirm how instrument masters and broker symbol databases are downloaded or regenerated.")
$Report.Add("- Review `package.json` scripts and native dependencies before selecting runtime versions.")
$Report.Add("")
$Report.Add("## Detailed output")
$Report.Add("")
$Report.Add("- `$ReportBase-manifests.json`: package manifests, scripts and dependencies.")
$Report.Add("- `$ReportBase-files.csv`: inventory and proposed package decision per file.")
$Report.Add("- `$ReportBase-env-references.csv`: environment-variable names found in source.")
$Report.Add("- `$ReportBase-review-exclude.csv`: sensitive/runtime files and files needing review.")
$Report.Add("- `$ReportBase-candidate-files.txt`: candidate list only, not a final ZIP manifest.")

$Report |
    Set-Content -Encoding UTF8 `
        -Path (Join-Path $AuditDir "$ReportBase-report.md")

Write-Host "`n=== AUDIT COMPLETE ===" -ForegroundColor Green
Write-Host "Files inventoried : $($FileInventory.Count)"
Write-Host "Candidate includes: $($Summary.CandidateIncludeCount)"
Write-Host "Excluded          : $($Summary.ExcludedCount)"
Write-Host "Needs review      : $($Summary.ReviewCount)"
Write-Host "`nReport directory: $AuditDir" -ForegroundColor Cyan

Get-ChildItem -LiteralPath $AuditDir -File |
    Select-Object Name, Length |
    Format-Table -AutoSize
