AJ Institutional Lightweight Charts API compatibility fix

Purpose
The reported TypeScript compiler error says rsiSeries.current.paneIndex() does not exist on ISeriesApi. In Lightweight Charts v5, use rsiSeries.current.getPane().paneIndex(): getPane() returns the pane API, and paneIndex() is a method on that pane API.

Run from PowerShell 7:
  pwsh -NoProfile -ExecutionPolicy Bypass -File .\Fix-LightweightCharts-PaneIndex.ps1

Default source root: C:\AI-Institutional

The script backs up src\charts\ChartEngine.tsx before editing. It changes only the exact expression, then runs npm run build. It does not modify package.json or package-lock.json. If other TypeScript errors appear, the script reports them; it does not silently alter unrelated code.

If you want to rerun only the build without changing ChartEngine.tsx:
  pwsh -NoProfile -ExecutionPolicy Bypass -File .\Fix-LightweightCharts-PaneIndex.ps1 -BuildOnly

Important: the source dependency upgrade has already changed node_modules and lock/manifests. Do not rerun the full upgrade script just to address this pane API error. The npm cleanup EPERM warnings in the prior log may indicate a running Node process is holding files under node_modules. Prefer finishing validation in a quiet maintenance window; the fix script itself does not stop existing processes.
