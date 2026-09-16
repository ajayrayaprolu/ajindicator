//==========================================
// src/components/SymbolSelector.tsx
// Phase 5B — modal symbol search with category tabs
//==========================================
//
// Search flow:
//
//   Search bar click/focus
//         │
//         ▼
//   Modal opens (category tabs + results)
//         │
//   ┌─────┼─────────┬─────────┐
//   ▼     ▼         ▼         ▼
//  All  Stocks   Options   Indices
//   │     │         │         │
//   └─────┴────┬────┴─────────┘
//              ▼
//     /api/fyers/symbols/search   (Stocks / Indices / All-equity)
//     /api/fyers/options/search   (Options / All-option-pattern)
//     /api/symbols/search         (non-Fyers datasources, all categories)
//
// Last-used category persists in localStorage so the next
// search opens on whichever tab the user used last.
//==========================================

import {
    useEffect,
    useRef,
    useState
} from "react";

interface SymbolSearchResult {

    symbol: string;
    yahooSymbol?: string | null;
    displayName: string;
    exchange: string;
    type: string;
    feedSource: string;
    instrumentId?: number;
    tradingSymbol?: string;
    expiry?: string;
    strike?: number;
    optionType?: string;
    underlying?: string;
    tokenIdentifier?: string;
}

interface Props {

    value: string;
    displayName?: string;

	onChange: (
		symbol: string,
		yahooSymbol?: string,
		displayName?: string,
		optionMetadata?: {
			exchange?: string;
			feedSource?: string;
			underlying?: string;
			expiry?: string;
			strike?: number;
			optionType?: string;
		}
	) => void;

    // tabIndex identifies which of the 4 watchlists (0-3) the
    // symbol should be added to. Parent owns actual persistence.
    onAddToWatchlist?: (
        result: SymbolSearchResult,
        tabIndex: number
    ) => void;

    datasource?: string;
}

//==================================================
// CATEGORY
//==================================================

type Category = "ALL" | "STOCK" | "OPTIONS" | "INDEX";

const CATEGORY_STORAGE_KEY = "ajSymbolSearchCategory";

const CATEGORIES: { key: Category; label: string }[] = [
    { key: "ALL", label: "All" },
    { key: "STOCK", label: "Stocks" },
    { key: "OPTIONS", label: "F&O" },
    { key: "INDEX", label: "Indices" }
];

// Shown for parity with familiar broker UIs, but not wired to
// any data source yet — disabled rather than pretending to work.
const UNAVAILABLE_CATEGORIES = ["Futures", "ETF", "Commodity"];

const WATCHLIST_TABS = ["Watchlist 1", "Watchlist 2", "Watchlist 3", "Watchlist 4"];

function loadStoredCategory(): Category {

    try {
        const stored = window.localStorage.getItem(CATEGORY_STORAGE_KEY);
        if (stored === "ALL" || stored === "STOCK" || stored === "OPTIONS" || stored === "INDEX") {
            return stored;
        }
    } catch {
        // localStorage unavailable — fall through to default.
    }

    return "ALL";
}

//==================================================
// FYERS OPTION QUERY PARSER (used for the ALL tab)
//==================================================

function parseFyersOptionQuery(
    text: string
): { underlying?: string; strike?: string; optionType?: string } | null {

    const upper = text.trim().toUpperCase();
    const tokens = upper.split(/\s+/).filter(Boolean);

    const knownUnderlyings = ["NIFTY", "BANKNIFTY", "FINNIFTY", "MIDCPNIFTY", "SENSEX", "BANKEX"];
    const underlying = tokens.find(t => knownUnderlyings.includes(t));

    const optionType =
        tokens.includes("CE") ? "CE" : tokens.includes("PE") ? "PE" : undefined;

    const strikeToken =
        tokens.find(t => /^\d+(\.\d+)?$/.test(t));

    if (!optionType && !strikeToken) {
        return null;
    }

    return { underlying, strike: strikeToken, optionType };
}

//==================================================
// COMPONENT
//==================================================

export default function SymbolSelector({
    value,
    onChange,
    onAddToWatchlist,
    datasource
}: Props) {

    const [query, setQuery] = useState(value);
    const [results, setResults] = useState<SymbolSearchResult[]>([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [category, setCategory] = useState<Category>(loadStoredCategory);
    const [watchlistPopoverKey, setWatchlistPopoverKey] = useState<string | null>(null);

    const requestId = useRef(0);
    const isFyers = String(datasource ?? "").toLowerCase() === "fyers";
    const isAliceBlue = String(datasource ?? "").toLowerCase() === "aliceblue";
    const isIndstocks = String(datasource ?? "").toLowerCase() === "indstocks";

    // Remembers the last selection's friendly display name so the
    // value-sync effect below can show it instead of the raw
    // resolved symbol (e.g. "NFO|61647" for AliceBlue options) that
    // actually gets stored/used for chart fetching.
    const lastSelectedRef = useRef<{ symbol: string; displayName: string } | null>(null);

    //==================================================
    // Persist category choice
    //==================================================

    useEffect(() => {
        try {
            window.localStorage.setItem(CATEGORY_STORAGE_KEY, category);
        } catch {
            // ignore
        }
    }, [category]);

    //==================================================
    // Keep UI synchronized with selected chart symbol
    //==================================================

    useEffect(() => {
        if (
            lastSelectedRef.current &&
            lastSelectedRef.current.symbol === value
        ) {
            setQuery(lastSelectedRef.current.displayName);
        } else {
            setQuery(value || "");
        }
    }, [value]);

    //==================================================
    // SEARCH
    //==================================================

    useEffect(() => {

        const text = query.trim();

        if (!text || !open) {
            setResults([]);
            setLoading(false);
            return;
        }

        const timer = window.setTimeout(async () => {

            const id = ++requestId.current;

            try {
                setLoading(true);

                const mapped = await performSearch(category, text, isFyers);

                if (id !== requestId.current) {
                    return;
                }

                setResults(mapped);

            } catch (error) {

                console.error("[SYMBOL SEARCH]", error);

                if (id === requestId.current) {
                    setResults([]);
                }

            } finally {

                if (id === requestId.current) {
                    setLoading(false);
                }
            }

        }, 250);

        return () => window.clearTimeout(timer);

    }, [query, category, isFyers]);

    //==================================================
    // SEARCH IMPLEMENTATION
    //==================================================

    async function performSearch(
        cat: Category,
        text: string,
        fyers: boolean
    ): Promise<SymbolSearchResult[]> {

        //--------------------------------------------------
        // OPTIONS TAB — always an underlying-driven option
        // chain lookup, e.g. "RELIANCE" -> every RELIANCE
        // contract, "NIFTY" -> every NIFTY contract.
        //--------------------------------------------------

        if (cat === "OPTIONS") {

            if (fyers) {

                const params = new URLSearchParams({
                    underlying: text.toUpperCase(),
                    limit: "100"
                });

                const response = await fetch(`/api/fyers/options/search?${params.toString()}`);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const data = await response.json();

                return Array.isArray(data.results)
                    ? data.results.map((item: any) => ({
                        symbol: item.symbol,
                        displayName: `${item.underlying} ${item.strike} ${item.optionType}`,
                        exchange: item.exchange,
                        type: "OPTION",
                        feedSource: "FYERS",
                        expiry: item.expiry,
                        strike: item.strike,
                        optionType: item.optionType,
                        underlying: item.underlying
                    }))
                    : [];
            }

            if (isAliceBlue) {

                const params = new URLSearchParams({
                    underlying: text.toUpperCase(),
                    limit: "100"
                });

                const response = await fetch(`/api/aliceblue/options/search?${params.toString()}`);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const data = await response.json();

                return Array.isArray(data.results)
                    ? data.results.map((item: any) => ({
                        symbol: item.symbol, // EXCHANGE|TOKEN — authoritative, already resolved
                        displayName: `${item.underlying} ${item.strike} ${item.optionType}`,
                        exchange: item.exchange,
                        type: "OPTION",
                        feedSource: "ALICEBLUE",
                        expiry: item.expiry,
                        strike: item.strike,
                        optionType: item.optionType,
                        underlying: item.underlying
                    }))
                    : [];
            }

            if (isIndstocks) {

                const params = new URLSearchParams({
                    underlying: text.toUpperCase(),
                    limit: "100"
                });

                const response = await fetch(`/api/indstocks/options/search?${params.toString()}`);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const data = await response.json();

                return Array.isArray(data.results)
                    ? data.results.map((item: any) => ({
                        symbol: item.symbol, // EXCH_SECURITYID — authoritative, already resolved
                        displayName: item.displayName || `${item.underlying} ${item.strike} ${item.optionType}`,
                        exchange: item.exchange,
                        type: "OPTION",
                        feedSource: "INDSTOCKS",
                        expiry: item.expiry,
                        strike: item.strike,
                        optionType: item.optionType,
                        underlying: item.underlying
                    }))
                    : [];
            }

            const response = await fetch(`/api/symbols/search?q=${encodeURIComponent(text)}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();

            return (Array.isArray(data.results) ? data.results : [])
                .filter((r: SymbolSearchResult) =>
                    ["CE", "PE", "OPTION"].includes(String(r.type ?? "").toUpperCase())
                );
        }

        //--------------------------------------------------
        // STOCK / INDEX TABS — equity+index catalog, then
        // filtered client-side to the requested type.
        //--------------------------------------------------

        if (cat === "STOCK" || cat === "INDEX") {

            const url = fyers
                ? `/api/fyers/symbols/search?q=${encodeURIComponent(text)}`
                : isAliceBlue
                    ? `/api/aliceblue/symbols/search?q=${encodeURIComponent(text)}`
                    : isIndstocks
                        ? `/api/indstocks/symbols/search?q=${encodeURIComponent(text)}`
                        : `/api/symbols/search?q=${encodeURIComponent(text)}`;

            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();

            const allResults: SymbolSearchResult[] = Array.isArray(data.results) ? data.results : [];

            // Only FYERS, AliceBlue and IndStocks have real separate
            // equity/index endpoints backing this filter. Other
            // datasources (Yahoo, Zerodha) don't — filtering strictly
            // there just hides valid results (e.g. NIFTY tagged
            // type:"INDEX" disappearing under the Stocks tab). Return
            // everything unfiltered for those.
            if (!fyers && !isAliceBlue && !isIndstocks) {
                return allResults;
            }

            const wantType = cat === "STOCK" ? "EQUITY" : "INDEX";

            return allResults.filter(
                (r: SymbolSearchResult) => String(r.type ?? "").toUpperCase() === wantType
            );
        }

        //--------------------------------------------------
        // ALL — option-shaped query goes to options search,
        // otherwise the general equity/index/Yahoo search.
        // (Same behavior as before category tabs existed.)
        //--------------------------------------------------

        const optionQuery = (fyers || isAliceBlue || isIndstocks) ? parseFyersOptionQuery(text) : null;

        if (optionQuery) {

            const endpoint =
                fyers
                    ? "/api/fyers/options/search"
                    : isAliceBlue
                        ? "/api/aliceblue/options/search"
                        : "/api/indstocks/options/search";

            const feedSourceLabel =
                fyers ? "FYERS" : isAliceBlue ? "ALICEBLUE" : "INDSTOCKS";

            const params = new URLSearchParams({ limit: "50" });
            if (optionQuery.underlying) params.set("underlying", optionQuery.underlying);
            if (optionQuery.strike) params.set("strike", optionQuery.strike);
            if (optionQuery.optionType) params.set("type", optionQuery.optionType);

            const response = await fetch(`${endpoint}?${params.toString()}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();

            return Array.isArray(data.results)
                ? data.results.map((item: any) => ({
                    symbol: item.symbol,
                    displayName: item.displayName || `${item.underlying} ${item.strike} ${item.optionType}`,
                    exchange: item.exchange,
                    type: "OPTION",
                    feedSource: feedSourceLabel,
                    expiry: item.expiry,
                    strike: item.strike,
                    optionType: item.optionType,
                    underlying: item.underlying
                }))
                : [];
        }

            const url = fyers
                ? `/api/fyers/symbols/search?q=${encodeURIComponent(text)}`
                : isAliceBlue
                    ? `/api/aliceblue/symbols/search?q=${encodeURIComponent(text)}`
                    : isIndstocks
                        ? `/api/indstocks/symbols/search?q=${encodeURIComponent(text)}`
                        : `/api/symbols/search?q=${encodeURIComponent(text)}`;
			

        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();

        return Array.isArray(data.results) ? data.results : [];
    }

    //==================================================
    // Select symbol
    //==================================================

    function selectSymbol(result: SymbolSearchResult) {
        const isOption =
            String(result.type ?? "").toUpperCase() === "OPTION" ||
            String(result.optionType ?? "").toUpperCase() === "CE" ||
            String(result.optionType ?? "").toUpperCase() === "PE";

        if (isOption) {
            const canonicalSymbol =
                `${String(result.underlying ?? "").trim().toUpperCase()} ${Number(result.strike)} ${String(result.optionType ?? "").trim().toUpperCase()}`;

            lastSelectedRef.current = {
                symbol: canonicalSymbol,
                displayName: canonicalSymbol
            };

            onChange(
                canonicalSymbol,
                undefined,
                canonicalSymbol,
                {
                    exchange: result.exchange,
                    feedSource: result.feedSource,
                    underlying: result.underlying,
                    expiry: result.expiry,
                    strike: result.strike,
                    optionType: result.optionType
                }
            );
        } else {
            lastSelectedRef.current = {
                symbol: result.symbol,
                displayName: result.displayName || result.symbol
            };

            onChange(
                result.symbol,
                result.yahooSymbol || undefined,
                result.displayName || result.symbol
            );
        }

        setQuery(
            isOption
                ? `${String(result.underlying ?? "").trim().toUpperCase()} ${Number(result.strike)} ${String(result.optionType ?? "").trim().toUpperCase()}`
                : result.displayName || result.symbol
        );

        setOpen(false);
        setResults([]);
    }
	
    function resultKey(result: SymbolSearchResult) {
        return `${result.exchange}:${result.symbol}:${result.expiry ?? ""}:${result.strike ?? ""}:${result.optionType ?? ""}`;
    }

    //==================================================
    // UI
    //==================================================

    return (
        <div style={{ position: "relative", height: 26, minWidth: 180, flexShrink: 0 }}>

            {/*==========================================
                COMPACT TOOLBAR INPUT + WATCHLIST QUICK-ADD
            ==========================================*/}

            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>

                <input
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
                    onFocus={() => setOpen(true)}
                    placeholder="Search symbol..."
                    autoComplete="off"
                    style={{
                        width: 180,
                        height: 26,
                        boxSizing: "border-box",
                        background: "var(--bg-input)",
                        color: "var(--text-primary)",
                        border: "1px solid var(--border-primary)",
                        borderRadius: 3,
                        padding: "0 8px",
                        fontSize: 13,
                        fontWeight: 700,
                        outline: "none"
                    }}
                />

                <button
                    title="Add current symbol to watchlist"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() =>
                        setWatchlistPopoverKey(
                            watchlistPopoverKey === "CURRENT" ? null : "CURRENT"
                        )
                    }
                    disabled={!value}
                    style={{
                        width: 22,
                        height: 22,
                        lineHeight: "20px",
                        textAlign: "center",
                        background: "var(--bg-panel-secondary)",
                        border: "1px solid var(--border-primary)",
                        borderRadius: 3,
                        color: value ? "var(--text-secondary)" : "var(--text-disabled)",
                        cursor: value ? "pointer" : "default",
                        fontSize: 14,
                        fontWeight: 700,
                        padding: 0
                    }}
                >
                    +
                </button>

                {watchlistPopoverKey === "CURRENT" && (
                    <WatchlistPopover
                        onPick={(tabIndex) => {
                            onAddToWatchlist?.(
                                {
                                    symbol: value,
                                    displayName: value,
                                    exchange: "",
                                    type: "",
                                    feedSource: datasource ?? ""
                                },
                                tabIndex
                            );
                            setWatchlistPopoverKey(null);
                        }}
                        onClose={() => setWatchlistPopoverKey(null)}
                    />
                )}

            </div>

            {/*==========================================
                MODAL
            ==========================================*/}

            {open && (

                <div
                    onMouseDown={() => { setOpen(false); setWatchlistPopoverKey(null); }}
                    style={{
                        position: "fixed",
                        inset: 0,
                        background: "rgba(0,0,0,0.55)",
                        zIndex: 2000000,
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "center",
                        paddingTop: "8vh"
                    }}
                >

                    <div
                        onMouseDown={(e) => e.stopPropagation()}
                        style={{
                            width: 480,
                            maxHeight: "78vh",
                            display: "flex",
                            flexDirection: "column",
                            background: "var(--bg-modal)",
                            border: "1px solid var(--border-primary)",
                            borderRadius: 6,
                            boxShadow: "var(--shadow-heavy)",
                            overflow: "hidden"
                        }}
                    >

                        {/*---------- HEADER ----------*/}

                        <div style={{
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            padding: "12px 14px", borderBottom: "1px solid var(--border-primary)"
                        }}>
                            <div style={{ color: "var(--text-heading)", fontSize: 15, fontWeight: 700 }}>Search</div>
                            <button
                                onClick={() => setOpen(false)}
                                style={{ background: "transparent", border: "none", color: "var(--text-muted)", fontSize: 18, cursor: "pointer" }}
                            >
                                ✕
                            </button>
                        </div>

                        {/*---------- INPUT ----------*/}

                        <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border-primary)" }}>
                            <input
                                autoFocus
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}
                                placeholder="Type a symbol, e.g. RELIANCE, NIFTY, 24200 CE"
                                autoComplete="off"
                                style={{
                                    width: "100%", height: 34, boxSizing: "border-box",
                                    background: "var(--bg-input)", color: "var(--text-primary)", border: "1px solid var(--border-primary)",
                                    borderRadius: 4, padding: "0 10px", fontSize: 14, outline: "none"
                                }}
                            />
                        </div>

                        {/*---------- CATEGORY TABS ----------*/}

                        <div style={{
                            display: "flex", gap: 6, padding: "10px 14px",
                            borderBottom: "1px solid var(--border-primary)", flexWrap: "wrap"
                        }}>
                            {CATEGORIES.map(({ key, label }) => (
                                <button
                                    key={key}
                                    onClick={() => setCategory(key)}
                                    style={{
                                        padding: "5px 12px",
                                        borderRadius: 14,
                                        border: category === key ? "1px solid var(--success)" : "1px solid var(--border-primary)",
                                        background: category === key ? "var(--success-bg)" : "var(--bg-panel-secondary)",
                                        color: category === key ? "var(--success-text)" : "var(--text-secondary)",
                                        fontSize: 12, fontWeight: 700, cursor: "pointer"
                                    }}
                                >
                                    {label}
                                </button>
                            ))}

                            {UNAVAILABLE_CATEGORIES.map((label) => (
                                <button
                                    key={label}
                                    disabled
                                    title="Not available yet"
                                    style={{
                                        padding: "5px 12px", borderRadius: 14,
                                        border: "1px solid var(--border-subtle)", background: "var(--bg-panel-tertiary)",
                                        color: "var(--text-disabled)", fontSize: 12, fontWeight: 700, cursor: "not-allowed"
                                    }}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>

                        {/*---------- RESULTS ----------*/}

                        <div style={{ overflowY: "auto", flex: 1 }}>

                            {loading && (
                                <div style={{ padding: 16, color: "var(--text-muted)", fontSize: 12 }}>Searching...</div>
                            )}

                            {!loading && !query.trim() && (
                                <div style={{ padding: 16, color: "var(--text-muted)", fontSize: 12 }}>
                                    Type a symbol to search.
                                </div>
                            )}

                            {!loading && query.trim() && results.length === 0 && (
                                <div style={{ padding: 16, color: "var(--text-muted)", fontSize: 12 }}>
                                    No results found.
                                </div>
                            )}

                            {!loading && results.map((result) => {

                                const key = resultKey(result);

                                return (
                                    <div
                                        key={key}
                                        style={{
                                            padding: "10px 14px", cursor: "pointer",
                                            borderBottom: "1px solid var(--border-subtle)",
                                            display: "flex", justifyContent: "space-between", alignItems: "flex-start"
                                        }}
                                    >
                                        <div
                                            onMouseDown={(e) => { e.preventDefault(); selectSymbol(result); }}
                                            style={{ flex: 1 }}
                                        >
                                            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                                                <div style={{ color: "var(--text-primary)", fontSize: 13, fontWeight: 700 }}>
                                                    {result.displayName || result.symbol}
                                                </div>
                                                <div style={{ color: "var(--text-muted)", fontSize: 10 }}>{result.type}</div>
                                            </div>

                                            <div style={{ color: "var(--text-secondary)", fontSize: 11, marginTop: 2 }}>
                                                {result.symbol} {" • "} {result.exchange}
                                            </div>

                                            {result.type === "OPTION" && (
                                                <div style={{ color: "var(--text-secondary)", fontSize: 10, marginTop: 3 }}>
                                                    {result.underlying} {" • "} {result.strike} {result.optionType}
                                                    {result.expiry ? ` • ${result.expiry}` : ""}
                                                </div>
                                            )}
                                        </div>

                                        <div style={{ position: "relative", marginLeft: 8 }}>
                                            <button
                                                onMouseDown={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    setWatchlistPopoverKey(
                                                        watchlistPopoverKey === key ? null : key
                                                    );
                                                }}
                                                style={{
                                                    width: 22, height: 22, background: "var(--bg-panel-secondary)",
                                                    border: "1px solid var(--border-primary)", borderRadius: 3,
                                                    color: "var(--text-secondary)", cursor: "pointer", fontSize: 14, fontWeight: 700
                                                }}
                                            >
                                                +
                                            </button>

                                            {watchlistPopoverKey === key && (
                                                <WatchlistPopover
                                                    align="right"
                                                    onPick={(tabIndex) => {
                                                        onAddToWatchlist?.(result, tabIndex);
                                                        setWatchlistPopoverKey(null);
                                                    }}
                                                    onClose={() => setWatchlistPopoverKey(null)}
                                                />
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

//==================================================
// WATCHLIST QUICK-ADD POPOVER — 4 fixed tabs
//==================================================

function WatchlistPopover({
    onPick,
    onClose,
    align = "left"
}: {
    onPick: (tabIndex: number) => void;
    onClose: () => void;
    align?: "left" | "right";
}) {

    return (
        <div
            onMouseDown={(e) => e.stopPropagation()}
            style={{
                position: "absolute",
                top: 26,
                [align]: 0,
                background: "var(--bg-dropdown)",
                border: "1px solid var(--border-primary)",
                borderRadius: 4,
                boxShadow: "var(--shadow)",
                zIndex: 2000002,
                minWidth: 130
            } as React.CSSProperties}
        >
            {WATCHLIST_TABS.map((label, index) => (
                <div
                    key={label}
                    onMouseDown={(e) => {
                        e.preventDefault();
                        onPick(index);
                        onClose();
                    }}
                    style={{
                        padding: "7px 10px",
                        fontSize: 12,
                        color: "var(--text-secondary)",
                        cursor: "pointer",
                        borderBottom:
                            index < WATCHLIST_TABS.length - 1
                                ? "1px solid var(--border-subtle)"
                                : "none"
                    }}
                >
                    {label}
                </div>
            ))}
        </div>
    );
}
