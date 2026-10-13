from pathlib import Path
import argparse
import os
import re
import shutil
import subprocess
import sys
from datetime import datetime

parser = argparse.ArgumentParser(description="Wire AlgoHome to read-only execution snapshots.")
parser.add_argument("--project-root", required=True, help="AJ Institutional root folder")
parser.add_argument("--dry-run", action="store_true", help="Validate patch anchors without writing or building")
args = parser.parse_args()
project_root = Path(args.project_root).resolve()
src_path = project_root / "src" / "pages" / "AlgoHome.tsx"
if not src_path.is_file():
    raise SystemExit(f"STOP: Target page not found: {src_path}")
raw_source = src_path.read_bytes().decode("utf-8-sig")
newline = "\r\n" if "\r\n" in raw_source else "\n"
s = raw_source.replace("\r\n", "\n")

# Idempotency: an already-installed, complete patch is a safe no-op.
# Check this before baseline anchors because a successful first run intentionally
# removes/replaces several of those anchors.
installed_marker = 'AJ_READONLY_EXECUTION_UI_V1'
installed_route = 'fetch(`/api/execution/snapshot?broker=${encodeURIComponent(feed)}`'
if installed_marker in s:
    if installed_route in s and 'const positions: Position[] = [' not in s and 'NIFTY 25,500 CE' not in s and '₹8,420' not in s:
        print('READ-ONLY EXECUTION UI PATCH ALREADY INSTALLED: marker and snapshot wiring verified.')
        print('No files changed; no additional build was run.')
        raise SystemExit(0)
    raise RuntimeError('patch marker exists but installed-state verification failed; no files changed. Inspect AlgoHome.tsx before retrying.')

# Confirm baseline anchors first.
required = [
    'const positions: Position[] = [',
    'const orders = [',
    'const history = [',
    'const searchAbortRef =',
    'const livePositions =',
    'POSITIONS / ORDERS / HISTORY',
    'positions.map(',
    'orders.map(',
    'history.map(',
    'Prototype metrics — not live',
]
for x in required:
    if x not in s:
        raise RuntimeError(f'missing baseline anchor: {x}')

# Replace model types.
old_type = '''type Position = {
  symbol: string;
  side: "BUY" | "SELL";
  qty: number;
  avg: number;
  ltp: number;
  pnl: number;
  strategy: string;
  status: "OPEN" | "CLOSED";
};'''
new_type = '''type Position = {
  symbol: string;
  side: "BUY" | "SELL" | "—";
  qty: number;
  avg: number | null;
  ltp: number | null;
  pnl: number | null;
  strategy: string;
  status: string;
};

type ExecutionOrderRecord = {
  brokerOrderId: string | null;
  symbol: string;
  exchange: string;
  product: string;
  side: string;
  quantity: number;
  filledQuantity: number;
  remainingQuantity: number;
  averageFillPrice: number | null;
  limitPrice: number | null;
  status: string;
  statusMessage: string | null;
  orderTime: string | null;
};

type ExecutionTradeRecord = {
  tradeKey: string;
  symbol: string;
  exchange: string;
  side: string;
  quantity: number;
  price: number | null;
  timestamp: string | null;
};

type ExecutionPositionRecord = {
  positionKey: string;
  symbol: string;
  exchange: string;
  product: string;
  netQuantity: number;
  averagePrice: number | null;
  ltp: number | null;
  brokerReportedPnl: number | null;
  estimatedOpenPnl: number | null;
  pnl: number | null;
  pnlSource: string;
  realizedPnl: number | null;
  isOpen: boolean;
};

type ExecutionPnlSummary = {
  openPositionCount: number;
  brokerReportedPnlTotal: number | null;
  estimatedOpenPnlTotal: number | null;
  brokerReportedRealizedPnlTotal: number | null;
  estimatedGrossRealizedPnlFromAvailableTrades: number | null;
  chargesAndTaxes: number | null;
  netPnlAfterCharges: number | null;
  dataQuality?: {
    positionSnapshotComplete?: boolean;
    brokerPnlComplete?: boolean;
    estimatedOpenPnlComplete?: boolean;
    brokerRealizedPnlComplete?: boolean;
    chargesAvailable?: boolean;
  };
};

type ExecutionSyncResource = {
  resource: string;
  status?: string;
  lastSuccessAt?: string | null;
  lastAttemptAt?: string | null;
  lastErrorCode?: string | null;
  lastErrorMessage?: string | null;
  recordCount?: number | null;
};

type ExecutionSnapshot = {
  success: boolean;
  broker: string;
  readOnly: boolean;
  data: {
    orders: ExecutionOrderRecord[];
    trades: ExecutionTradeRecord[];
    positions: ExecutionPositionRecord[];
    pnl: ExecutionPnlSummary;
  };
  sync: ExecutionSyncResource[];
  returnedAt: string;
  source?: string;
  refresh?: { hasErrors?: boolean; skipped?: boolean; reason?: string };
};

type ExecutionUiState = {
  loading: boolean;
  error: string;
  errorCode: string;
  lastAttemptAt: string | null;
};'''
assert s.count(old_type) == 1
s = s.replace(old_type, new_type, 1)

# Remove top-level prototype account arrays (not market-context prototype metrics).
arr_pattern = re.compile(r'const positions: Position\[\] = \[.*?\nconst fallbackInstruments: Instrument\[\] = \[\];', re.S)
arr_match = arr_pattern.search(s)
assert arr_match, 'sample position/order/history arrays not found as one block'
s = s[:arr_match.start()] + 'const fallbackInstruments: Instrument[] = [];\n' + s[arr_match.end():]

# Add safe formatting helpers.
old_money = '''function money(value: number) {
  return `${value < 0 ? "-" : ""}₹${Math.abs(value).toLocaleString("en-IN")}`;
}'''
new_money = '''function money(value: number) {
  return `${value < 0 ? "-" : ""}₹${Math.abs(value).toLocaleString("en-IN")}`;
}

function displayMoney(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? money(value) : "—";
}

function executionPrice(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? `₹${value.toFixed(2)}` : "—";
}

function executionTimestamp(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return String(value);
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function executionErrorMessage(code: string, message: string) {
  if (code === "EXECUTION_API_DISABLED") {
    return "Read-only account API is disabled by the safe rollout gate. No sample account data is shown.";
  }
  if (code === "AUTHENTICATION_REQUIRED") {
    return "Application authentication is required before account data can be displayed.";
  }
  if (code === "BROKER_NOT_SUPPORTED") {
    return "This broker's order/position read adapter is not verified yet.";
  }
  return message || "Unable to load broker account data.";
}'''
assert s.count(old_money) == 1
s = s.replace(old_money, new_money, 1)

# Add state after searchAbortRef.
old_search_ref = '''  const searchAbortRef =
    useRef<AbortController | null>(null);

  const livePositions =
    positions.filter(
      (item) => item.status === "OPEN",
    );

  const unrealized =
    livePositions.reduce(
      (sum, item) => sum + item.pnl,
      0,
    );'''
new_search_ref = '''  const searchAbortRef =
    useRef<AbortController | null>(null);

  // AJ_READONLY_EXECUTION_UI_V1: read-only account snapshot state. No order APIs are called.
  const [executionSnapshot, setExecutionSnapshot] = useState<ExecutionSnapshot | null>(null);
  const [executionUiState, setExecutionUiState] = useState<ExecutionUiState>({
    loading: true,
    error: "",
    errorCode: "",
    lastAttemptAt: null,
  });
  const [executionRefreshVersion, setExecutionRefreshVersion] = useState(0);
  const priorExecutionFeed = useRef<Feed>(feed);

  const executionPnl = executionSnapshot?.data?.pnl;
  const positions: Position[] = (executionSnapshot?.data?.positions ?? [])
    .filter((item) => item.netQuantity !== 0 && item.isOpen !== false)
    .map((item) => ({
      symbol: item.symbol || "—",
      side: item.netQuantity > 0 ? "BUY" : item.netQuantity < 0 ? "SELL" : "—",
      qty: Math.abs(item.netQuantity),
      avg: item.averagePrice,
      ltp: item.ltp,
      pnl: item.brokerReportedPnl ?? item.estimatedOpenPnl ?? null,
      strategy: "—",
      status: item.netQuantity === 0 ? "FLAT" : "OPEN",
    }));

  const livePositions = positions.filter((item) => item.status === "OPEN");
  const unrealized = executionPnl?.brokerReportedPnlTotal ?? executionPnl?.estimatedOpenPnlTotal ?? null;
  const realizedPnl = executionPnl?.brokerReportedRealizedPnlTotal ?? executionPnl?.estimatedGrossRealizedPnlFromAvailableTrades ?? null;
  const executionTrades = executionSnapshot?.data?.trades ?? [];
  const allExecutionOrders = [...(executionSnapshot?.data?.orders ?? [])].sort((a, b) => {
    const ta = a.orderTime ? Date.parse(a.orderTime) : 0;
    const tb = b.orderTime ? Date.parse(b.orderTime) : 0;
    return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
  });
  const terminalOrderStatuses = new Set(["FILLED", "CANCELLED", "REJECTED", "EXPIRED"]);
  const orders: string[][] = allExecutionOrders
    .filter((item) => !terminalOrderStatuses.has(String(item.status).toUpperCase()))
    .map((item) => [
      executionTimestamp(item.orderTime),
      item.symbol || "—",
      item.side || "—",
      String(item.quantity ?? "—"),
      executionPrice(item.averageFillPrice ?? item.limitPrice),
      item.status || "UNKNOWN",
    ]);
  const history: string[][] = allExecutionOrders.map((item) => [
    executionTimestamp(item.orderTime),
    item.symbol || "—",
    item.statusMessage ? `${item.status || "UNKNOWN"} · ${item.statusMessage}` : (item.status || "UNKNOWN"),
    executionPrice(item.averageFillPrice ?? item.limitPrice),
  ]);

  const accountDataEmptyMessage = executionUiState.error
    ? executionErrorMessage(executionUiState.errorCode, executionUiState.error)
    : executionUiState.loading
      ? "Loading read-only broker account data…"
      : "No broker records were returned for this account.";

  // Read-only poll. Failed refreshes preserve the last successful snapshot and
  // are explicitly reported as stale/error; failed requests never look like empty positions.
  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    let controller: AbortController | null = null;

    if (priorExecutionFeed.current !== feed) {
      setExecutionSnapshot(null);
      priorExecutionFeed.current = feed;
    }

    const pollSnapshot = async () => {
      const attemptedAt = new Date().toISOString();
      if (feed !== "fyers") {
        setExecutionUiState({
          loading: false,
          error: "The read-only execution adapter is currently verified for FYERS only.",
          errorCode: "BROKER_NOT_SUPPORTED",
          lastAttemptAt: attemptedAt,
        });
        return;
      }

      controller = new AbortController();
      setExecutionUiState((previous) => ({
        ...previous,
        loading: true,
        error: "",
        errorCode: "",
        lastAttemptAt: attemptedAt,
      }));

      try {
        const response = await fetch(`/api/execution/snapshot?broker=${encodeURIComponent(feed)}`, {
          method: "GET",
          headers: { Accept: "application/json" },
          credentials: "include",
          signal: controller.signal,
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok || payload?.success !== true || !payload?.data) {
          const error = new Error(payload?.message || `Execution API request failed (${response.status}).`) as Error & { code?: string };
          error.code = String(payload?.code || `HTTP_${response.status}`);
          throw error;
        }
        if (!Array.isArray(payload.data.positions) || !Array.isArray(payload.data.orders) || !Array.isArray(payload.data.trades)) {
          throw new Error("Execution API response is missing normalized broker resources.");
        }
        if (!cancelled) {
          setExecutionSnapshot(payload as ExecutionSnapshot);
          setExecutionUiState({
            loading: false,
            error: payload.refresh?.hasErrors ? "One or more broker resources failed to refresh; displayed rows may be stale." : "",
            errorCode: payload.refresh?.hasErrors ? "PARTIAL_SYNC" : "",
            lastAttemptAt: attemptedAt,
          });
        }
      } catch (error) {
        if (cancelled || (error instanceof DOMException && error.name === "AbortError")) return;
        const typed = error as Error & { code?: string };
        setExecutionUiState({
          loading: false,
          error: typed.message || "Unable to load broker account data.",
          errorCode: typed.code || "EXECUTION_API_ERROR",
          lastAttemptAt: attemptedAt,
        });
      } finally {
        if (!cancelled) timer = window.setTimeout(pollSnapshot, 15000);
      }
    };

    void pollSnapshot();
    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
      controller?.abort();
    };
  }, [feed, executionRefreshVersion]);'''
assert s.count(old_search_ref) == 1, 'search ref/live pnl block anchor mismatch'
s = s.replace(old_search_ref, new_search_ref, 1)

# Replace top summary P&L display/class and open positions count.
old_stat = '''            <div
              className={`aj-stat-value ${
                unrealized >= 0
                  ? "aj-positive"
                  : "aj-negative"
              }`}
            >
              {money(unrealized)}
            </div>

            <div className="aj-stat-change">
              3 open positions
            </div>'''
new_stat = '''            <div
              className={`aj-stat-value ${
                unrealized === null
                  ? ""
                  : unrealized >= 0
                    ? "aj-positive"
                    : "aj-negative"
              }`}
              title={executionPnl?.brokerReportedPnlTotal !== null && executionPnl?.brokerReportedPnlTotal !== undefined
                ? "Broker-reported open-position P&L"
                : executionPnl?.estimatedOpenPnlTotal !== null && executionPnl?.estimatedOpenPnlTotal !== undefined
                  ? "Local estimated open-position P&L"
                  : "P&L unavailable until a complete position snapshot is available"}
            >
              {displayMoney(unrealized)}
            </div>

            <div className="aj-stat-change">
              {executionPnl?.brokerReportedPnlTotal !== null && executionPnl?.brokerReportedPnlTotal !== undefined
                ? "Broker-reported P&L"
                : executionPnl?.estimatedOpenPnlTotal !== null && executionPnl?.estimatedOpenPnlTotal !== undefined
                  ? "Estimated P&L"
                  : "Waiting for verified account data"}
            </div>'''
assert s.count(old_stat) == 1, 'summary pnl card anchor mismatch'
s = s.replace(old_stat, new_stat, 1)

# Replace "Live monitoring" mock indicator with actual status + manual refresh.
old_live = '''            <div className="aj-light-theme-live-monitoring"
              style={{
                marginLeft: "auto",
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "0 10px",
                color: "#56647a",
                fontSize: 10,
              }}
            >
              <Clock3 size={12} />
              Live monitoring
            </div>'''
new_live = '''            <div
              className="aj-light-theme-live-monitoring"
              style={{
                marginLeft: "auto",
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                justifyContent: "flex-end",
                gap: 8,
                padding: "0 10px",
                color: executionUiState.error
                  ? (algoHomeTheme === "light" ? "#b45309" : "#fbbf24")
                  : (algoHomeTheme === "light" ? "#56647a" : "#94a3b8"),
                fontSize: 10,
              }}
            >
              <Clock3 size={12} />
              {executionUiState.loading
                ? "Refreshing account snapshot…"
                : executionUiState.error
                  ? `${executionErrorMessage(executionUiState.errorCode, executionUiState.error)}${executionSnapshot ? ` · Last good snapshot ${executionTimestamp(executionSnapshot.returnedAt)}` : ""}`
                  : executionSnapshot
                    ? `Read-only · ${executionSnapshot.broker.toUpperCase()} · Updated ${executionTimestamp(executionSnapshot.returnedAt)}`
                    : "Read-only account data unavailable"}
              <button
                type="button"
                onClick={() => setExecutionRefreshVersion((value) => value + 1)}
                disabled={executionUiState.loading}
                title="Refresh read-only broker orders, trades, positions and P&L"
                style={{
                  border: `1px solid ${algoHomeTheme === "light" ? "#cbd5e1" : "rgba(148,163,184,.25)"}`,
                  borderRadius: 7,
                  padding: "5px 8px",
                  background: "transparent",
                  color: "inherit",
                  cursor: executionUiState.loading ? "wait" : "pointer",
                  opacity: executionUiState.loading ? .6 : 1,
                  fontSize: 10,
                  fontWeight: 750,
                }}
              >
                Refresh
              </button>
            </div>'''
assert s.count(old_live) == 1, 'live monitoring indicator anchor mismatch'
s = s.replace(old_live, new_live, 1)

# Positions: empty row + nullable fields and honest side coloring.
old_pos_map = '''                <tbody>
                  {positions.map(
                    (item) => (
                      <tr
                        key={item.symbol}
                      >'''
new_pos_map = '''                <tbody>
                  {positions.length === 0 && (
                    <tr>
                      <td colSpan={8} style={{ padding: 24, textAlign: "center", color: algoHomeTheme === "light" ? "#64748b" : "#94a3b8" }}>
                        {accountDataEmptyMessage}
                      </td>
                    </tr>
                  )}
                  {positions.map(
                    (item) => (
                      <tr
                        key={`${item.symbol}-${item.side}`}
                      >'''
assert s.count(old_pos_map) == 1
s = s.replace(old_pos_map, new_pos_map, 1)
s = s.replace('''                        <td className="aj-positive">
                          {item.side}
                        </td>''','''                        <td className={item.side === "BUY" ? "aj-positive" : item.side === "SELL" ? "aj-negative" : ""}>
                          {item.side}
                        </td>''',1)
s = s.replace('''                        <td>
                          ₹
                          {item.avg.toFixed(
                            2,
                          )}
                        </td>

                        <td>
                          ₹
                          {item.ltp.toFixed(
                            2,
                          )}
                        </td>''','''                        <td>
                          {executionPrice(item.avg)}
                        </td>

                        <td>
                          {executionPrice(item.ltp)}
                        </td>''',1)
s = s.replace('''                        <td
                          className={
                            item.pnl >= 0
                              ? "aj-positive"
                              : "aj-negative"
                          }
                        >
                          {money(
                            item.pnl,
                          )}
                        </td>''','''                        <td
                          className={item.pnl === null ? "" : item.pnl >= 0 ? "aj-positive" : "aj-negative"}
                          title={item.pnl === null ? "P&L unavailable for this position" : "Broker-reported P&L when provided, otherwise local estimate"}
                        >
                          {displayMoney(item.pnl)}
                        </td>''',1)

# Orders should show active/nonterminal current order records; add empty state.
old_order_map = '''                <tbody>
                  {orders.map(
                    (row) => (
                      <tr'''
new_order_map = '''                <tbody>
                  {orders.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ padding: 24, textAlign: "center", color: algoHomeTheme === "light" ? "#64748b" : "#94a3b8" }}>
                        {accountDataEmptyMessage}
                      </td>
                    </tr>
                  )}
                  {orders.map(
                    (row) => (
                      <tr'''
assert s.count(old_order_map) == 1
s = s.replace(old_order_map, new_order_map, 1)

# Order History now reflects actual broker order records; no fabricated Net P&L.
s = s.replace('<th>Net P&L</th>', '<th>Fill / Limit Price</th>', 1)
old_history_map = '''                <tbody>
                  {history.map(
                    (row) => (
                      <tr'''
new_history_map = '''                <tbody>
                  {history.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ padding: 24, textAlign: "center", color: algoHomeTheme === "light" ? "#64748b" : "#94a3b8" }}>
                        {accountDataEmptyMessage}
                      </td>
                    </tr>
                  )}
                  {history.map(
                    (row) => (
                      <tr'''
assert s.count(old_history_map) == 1
s = s.replace(old_history_map, new_history_map, 1)

# Align order history price coloring with its meaning: no signed P&L here.
old_history_class = '''                        <td
                          className={
                            row[3].startsWith(
                              "-",
                            )
                              ? "aj-negative"
                              : "aj-positive"
                          }
                        >
                          {row[3]}
                        </td>'''
new_history_class = '''                        <td>
                          {row[3]}
                        </td>'''
assert s.count(old_history_class) == 1
s = s.replace(old_history_class, new_history_class, 1)

# Replace the performance P&L sample numbers and dynamic counts.
assert s.count('''                <strong className="aj-positive">
                  ₹8,420
                </strong>''') == 1
s = s.replace('''                <strong className="aj-positive">
                  ₹8,420
                </strong>''','''                <strong className={realizedPnl === null ? "" : realizedPnl >= 0 ? "aj-positive" : "aj-negative"} title={executionPnl?.brokerReportedRealizedPnlTotal !== null && executionPnl?.brokerReportedRealizedPnlTotal !== undefined ? "Broker-reported realized P&L" : "Gross FIFO estimate from available trade-book rows; charges excluded; history may be intraday-only"}>
                  {displayMoney(realizedPnl)}
                </strong>''',1)
s = s.replace('''                <strong className="aj-positive">
                  {money(unrealized)}
                </strong>''','''                <strong className={unrealized === null ? "" : unrealized >= 0 ? "aj-positive" : "aj-negative"}>
                  {displayMoney(unrealized)}
                </strong>''',1)
s = s.replace('''                <strong>
                  3
                </strong>
              </div>

              <div className="aj-metric">
                <span>
                  Today Trades
                </span>

                <strong>
                  7
                </strong>''','''                <strong>
                  {executionSnapshot ? livePositions.length : "—"}
                </strong>
              </div>

              <div className="aj-metric">
                <span>
                  Available Trades
                </span>

                <strong>
                  {executionSnapshot ? executionTrades.length : "—"}
                </strong>''',1)

# Label metrics accurately now that P&L comes from the read-only broker snapshot.
s = s.replace('Prototype metrics — not live\n                  account data', 'Read-only broker P&L · other performance metrics remain prototype-only', 1)

# Ensure static sample arrays are gone and refresh routes are read-only only.
for bad in ['NIFTY 25,500 CE', '₹8,420']:
    if bad in s:
        raise RuntimeError(f'sample account data remained after patch: {bad}')
for must in ['AJ_READONLY_EXECUTION_UI_V1', '/api/execution/snapshot?broker=', 'credentials: "include"', 'LIVE']:
    if must not in s:
        raise RuntimeError(f'expected verification marker missing: {must}')
if 'fetch(`/api/execution/snapshot?broker=${encodeURIComponent(feed)}`' not in s:
    raise RuntimeError('read-only snapshot route anchor mismatch')

if args.dry_run:
    print(f"DRY RUN PASS: all anchors validated and candidate generated ({len(s)} chars, {s.count(chr(10))} lines). No file was changed.")
    raise SystemExit(0)

stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
backup_path = src_path.with_name(src_path.name + f".bak-readonly-execution-ui-{stamp}")
failed_path = src_path.with_name(src_path.name + f".failed-readonly-execution-ui-{stamp}")
shutil.copy2(src_path, backup_path)
candidate = s.replace("\n", newline)
try:
    src_path.write_bytes(candidate.encode("utf-8"))
    print(f"Read-only execution UI patch written: {src_path}")
    print(f"Backup: {backup_path}")
    print("Running npm run build...")
    # On Windows, npm is commonly exposed to PowerShell as npm.ps1. Python's
    # CreateProcess does not resolve PowerShell aliases/scripts or PATHEXT the
    # same way, so launch the .cmd shim through the Windows command processor.
    if os.name == "nt":
        result = subprocess.run("npm.cmd run build", cwd=str(project_root), shell=True, check=False)
    else:
        result = subprocess.run(["npm", "run", "build"], cwd=str(project_root), check=False)
    if result.returncode != 0:
        shutil.copy2(src_path, failed_path)
        shutil.copy2(backup_path, src_path)
        print(f"BUILD FAILED. Previous source restored from backup: {backup_path}", file=sys.stderr)
        print(f"Failed candidate preserved at: {failed_path}", file=sys.stderr)
        raise SystemExit(result.returncode)
except Exception:
    if src_path.exists() and backup_path.exists():
        # Restore only if the installed candidate is still present. Keep the
        # failed candidate separately for diagnosis before rolling back.
        try:
            if src_path.read_bytes() != backup_path.read_bytes():
                if not failed_path.exists():
                    shutil.copy2(src_path, failed_path)
                shutil.copy2(backup_path, src_path)
        except OSError:
            pass
    raise

print("\nREAD-ONLY EXECUTION UI INSTALL COMPLETE")
print("Orders, positions, order history and displayed P&L now derive from the execution snapshot API.")
print("Live order submission/cancel/modify remain hard-disabled; no broker mutation endpoint is called by this UI patch.")
print("Note: because AJ_EXECUTION_API_ENABLED defaults off, the UI will show an explicit disabled/auth error until server authentication rollout gates are completed.")
