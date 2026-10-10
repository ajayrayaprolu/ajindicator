# AJ Institutional Trading Platform - Audit

Generated: 2026-10-10 15:53:39
Project: C:\AI-Institutional

## Summary

- Files inventoried: 591
- Candidate includes: 542
- Excluded: 44
- Requires review: 5

## Runtime checks

- node: AVAILABLE — v24.16.0
- npm: AVAILABLE — 12.2.0
- python: AVAILABLE — Python 3.14.5
- py: AVAILABLE — Python 3.14.5
- pwsh: AVAILABLE — PowerShell 7.6.6
- git: AVAILABLE — git version 2.55.0.windows.3

## Important paths

- package.json: FOUND
- package-lock.json: FOUND
- index.html: FOUND
- vite.config.ts: FOUND
- tsconfig.json: FOUND
- server/index.js: FOUND
- start-server.js: FOUND
- ecosystem.config.cjs: FOUND
- .gitignore: FOUND
- README.md: FOUND
- server/dailyIstScheduler.js: FOUND

## Package decisions

- CANDIDATE_INCLUDE: potential source/configuration files.
- EXCLUDE: secrets, sessions, certificates, runtime state, generated output.
- REVIEW: backups and environment templates that must be checked.

## Important safety notes

- No file contents from .env, session files, or private keys were added to reports.
- SQLite databases and WAL/SHM files are excluded by default.
- Do not assume every candidate file is required or safe to distribute.
- Verify that environment templates contain placeholders rather than live credentials.
- Confirm how instrument masters and broker symbol databases are downloaded or regenerated.
- Review package.json scripts and native dependencies before selecting runtime versions.

## Detailed output

- $ReportBase-manifests.json: package manifests, scripts and dependencies.
- $ReportBase-files.csv: inventory and proposed package decision per file.
- $ReportBase-env-references.csv: environment-variable names found in source.
- $ReportBase-review-exclude.csv: sensitive/runtime files and files needing review.
- $ReportBase-candidate-files.txt: candidate list only, not a final ZIP manifest.
