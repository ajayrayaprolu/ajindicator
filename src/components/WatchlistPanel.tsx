//=====================================
// src/components/WatchlistPanel.tsx
//=====================================

import { useEffect, useState } from "react";
import { WatchlistStore, type WatchlistItem } from "../store/WatchlistStore";

interface Props {
    // CHANGED: was (symbol: string) => void. A bare symbol string has
    // nowhere to carry yahooSymbol (or exchange, feedSource, etc.)
    // through to whatever builds the chart from this selection — that
    // was the actual cause of "No Yahoo symbol resolved." on every
    // chart. Pass the whole item; the caller picks what it needs.
    onSelectSymbol: (item: WatchlistItem) => void;
}

export default function WatchlistPanel({ onSelectSymbol }: Props) {

    const [activeTab, setActiveTab] = useState(0);
    const [, forceRender] = useState(0);

    useEffect(() => {
        // One-time repair for watchlists saved before yahooSymbol
        // existed on WatchlistItem — see WatchlistStore.migrateMissingYahooSymbols
        // for exactly what it can and can't safely backfill.
        WatchlistStore.migrateMissingYahooSymbols();

        return WatchlistStore.subscribe(() => forceRender(n => n + 1));
    }, []);

    const items: WatchlistItem[] = WatchlistStore.getTab(activeTab);

    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%", color: "#ddd" }}>
            <div style={{
                display: "flex", borderBottom: "1px solid #333", flexShrink: 0
            }}>
                {Array.from({ length: WatchlistStore.getTabCount() }, (_, i) => (
                    <button
                        key={i}
                        onClick={() => setActiveTab(i)}
                        style={{
                            flex: 1,
                            padding: "8px 4px",
                            background: activeTab === i ? "#1e3a24" : "transparent",
                            color: activeTab === i ? "#8ee6a1" : "#999",
                            border: "none",
                            borderBottom: activeTab === i ? "2px solid #4caf50" : "2px solid transparent",
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: "pointer"
                        }}
                    >
                        WL {i + 1}
                    </button>
                ))}
            </div>
            <div style={{ flex: 1, overflowY: "auto" }}>
                {items.length === 0 && (
                    <div style={{ padding: 14, color: "#666", fontSize: 12 }}>
                        Empty. Add symbols using the + button in the symbol search.
                    </div>
                )}
                {items.map((item) => (
                    <div
                        key={`${item.exchange}:${item.symbol}:${item.expiry ?? ""}:${item.strike ?? ""}`}
                        style={{
                            display: "flex", justifyContent: "space-between", alignItems: "center",
                            padding: "8px 10px", borderBottom: "1px solid #1e1e1e", cursor: "pointer"
                        }}
                        onClick={() => onSelectSymbol(item)}
                    >
                        <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>
                                {item.displayName}
                                {item.exchange ? ` • ${item.exchange}` : ""}
                            </div>
                            <div style={{ fontSize: 10, color: "#888" }}>
                                {item.symbol}
                                {item.optionType ? ` • ${item.strike} ${item.optionType}` : ""}
                            </div>
                        </div>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                WatchlistStore.remove(activeTab, item);
                            }}
                            style={{
                                background: "transparent", border: "none", color: "#666",
                                cursor: "pointer", fontSize: 14, padding: "0 4px"
                            }}
                            title="Remove"
                        >
                            ✕
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
