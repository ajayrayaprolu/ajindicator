//===============================
// src/store/WatchlistStore.ts
//===============================
//
// 4 fixed watchlists, persisted to localStorage.
// Singleton object, same usage pattern as ActiveChartStore /
// DebugEngine elsewhere in this codebase — import and call
// its static-style methods directly, no prop drilling needed.
//===============================

export interface WatchlistItem {
    symbol: string;
    displayName: string;
    exchange: string;
    type: string;
    feedSource: string;
    // Yahoo's own symbol form for this instrument (e.g. "^NSEI" for
    // NIFTY, "RELIANCE.NS" for an equity). Search results already
    // carry this (see /api/symbols/search -> searchYahooSymbols) —
    // it MUST be captured here when an item is added, or every chart
    // created from this item will show "No Yahoo symbol resolved."
    // regardless of what the Yahoo feed itself can actually do.
    yahooSymbol?: string;
    expiry?: string;
    strike?: number;
    optionType?: string;
    underlying?: string;
}

const STORAGE_KEY = "ajWatchlists";
const TAB_COUNT = 4;

type Listener = () => void;

function emptyState(): WatchlistItem[][] {
    return Array.from({ length: TAB_COUNT }, () => []);
}

function loadFromStorage(): WatchlistItem[][] {
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return emptyState();
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed) || parsed.length !== TAB_COUNT) {
            return emptyState();
        }
        return parsed;
    } catch {
        return emptyState();
    }
}

function saveToStorage(state: WatchlistItem[][]) {
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
        // localStorage unavailable — in-memory state still works for this session.
    }
}

function itemKey(item: WatchlistItem): string {
    return `${item.exchange}:${item.symbol}:${item.expiry ?? ""}:${item.strike ?? ""}:${item.optionType ?? ""}`;
}

class WatchlistStoreImpl {

    private state: WatchlistItem[][] = loadFromStorage();
    private listeners: Set<Listener> = new Set();

    getTabCount(): number {
        return TAB_COUNT;
    }

    getTab(tabIndex: number): WatchlistItem[] {
        return this.state[tabIndex] ?? [];
    }

    getAll(): WatchlistItem[][] {
        return this.state;
    }

    add(tabIndex: number, item: WatchlistItem) {
        if (tabIndex < 0 || tabIndex >= TAB_COUNT) return;

        const tab = this.state[tabIndex] ?? [];
        const key = itemKey(item);

        if (tab.some(existing => itemKey(existing) === key)) {
            return; // already present
        }

        this.state = this.state.map((t, i) => i === tabIndex ? [...t, item] : t);
        saveToStorage(this.state);
        this.notify();
    }

    remove(tabIndex: number, item: WatchlistItem) {
        if (tabIndex < 0 || tabIndex >= TAB_COUNT) return;

        const key = itemKey(item);
        this.state = this.state.map((t, i) =>
            i === tabIndex ? t.filter(existing => itemKey(existing) !== key) : t
        );
        saveToStorage(this.state);
        this.notify();
    }

    //--------------------------------------------------
    // MIGRATE
    //
    // One-time repair for items that were already saved to
    // localStorage before yahooSymbol existed on this type.
    // Re-derives it from the symbol using the same NSE-equity
    // suffix rule YahooSymbolCatalog.js falls back to, so
    // existing watchlists don't need to be rebuilt by hand.
    // Indices/forex/crypto (NIFTY, USDINR, BTCUSDT, etc.) can't
    // be safely guessed this way, so those are left for the
    // user to remove and re-add via search (which will attach
    // yahooSymbol correctly going forward).
    //--------------------------------------------------

    migrateMissingYahooSymbols() {

        let changed = false;

        const migrated = this.state.map(tab =>
            tab.map(item => {

                if (item.yahooSymbol) {
                    return item;
                }

                if (item.type === "EQUITY" && item.exchange === "NSE") {
                    changed = true;
                    return { ...item, yahooSymbol: `${item.symbol}.NS` };
                }

                return item;
            })
        );

        if (changed) {
            this.state = migrated;
            saveToStorage(this.state);
            this.notify();
        }
    }

    subscribe(listener: Listener): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private notify() {
        this.listeners.forEach(listener => listener());
    }
}

export const WatchlistStore = new WatchlistStoreImpl();
