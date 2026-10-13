# AJ Institutional — Read-only execution UI wiring

This follow-on patch changes only `src/pages/AlgoHome.tsx`. It replaces prototype/sample Positions, Orders, Order History and P&L rows with the normalized read-only `/api/execution/snapshot?broker=fyers` response.

## What it changes

- Polls the existing execution snapshot route every 15 seconds and exposes a manual Refresh control.
- Uses cookie credentials for same-origin app auth. It does not send an order, cancel or modify request.
- Positions show actual net quantity, average price, LTP and broker-reported or labelled estimated P&L. Unknown values render as `—`, never as zero.
- Orders show non-terminal order records; Order History displays broker order status and average-fill/limit price. It no longer invents historical net P&L.
- The performance card uses broker-reported realized P&L where present or clearly titled gross FIFO estimate from available tradebook rows, excluding fees and charges.
- Refresh errors preserve the last successful snapshot and show a stale/error message; errors do not become empty books silently.
- Non-FYERS feed selection reports that its read adapter is not verified.
- Strategy win-rate and profit-factor sample metrics remain labelled prototype-only.

## Install

Extract this folder somewhere convenient (for example `C:\AJReadOnlyUI`). Then run PowerShell:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
& "C:\AJReadOnlyUI\Apply-ReadOnlyExecutionUI.ps1" -ProjectRoot "C:\AI-Institutional" -DryRun
& "C:\AJReadOnlyUI\Apply-ReadOnlyExecutionUI.ps1" -ProjectRoot "C:\AI-Institutional"
```

Run the dry-run first. The patcher validates all source anchors before writing. On installation it backs up `src/pages/AlgoHome.tsx`, applies changes, and runs `npm run build`. It is idempotent: if the complete read-only wiring is already present, it verifies the marker/route and exits successfully without modifying files or running another build. This avoids an error if the installer is accidentally run twice. The patcher launches `npm.cmd` via Windows command shell on Windows, where Python otherwise may fail to resolve PowerShell’s `npm` command. On build failure, it preserves the failed candidate and restores the backup.

## Important gate

The installed backend route is intentionally gated by `AJ_EXECUTION_API_ENABLED=true` and authenticated server-side user identity. Do not set the flag just to make the UI populate. Until the actual app auth identity/account scoping is connected, the page will explicitly show the safe disabled/auth state and will not display the old fake account figures. Live submission, cancellation and modification remain hard-disabled.
