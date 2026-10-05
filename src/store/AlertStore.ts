//===============================
// src/store/AlertStore.ts
//===============================
//
// Price alerts, persisted to localStorage.
// Same pattern as WatchlistStore: singleton, subscribe(), no prop drilling.
//
// An alert is created at a price with a direction ("above" / "below")
// relative to the last close at creation time. It fires once, when the
// last close crosses it, and then moves to the "triggered" list.
//===============================

export type AlertDirection = "above" | "below";
export type AlertStatus = "active" | "triggered";

export interface PriceAlert {
    id: string;
    symbol: string;
    chartId: string;
    timeframe: string;
    price: number;
    direction: AlertDirection;
    status: AlertStatus;
    createdAt: number;
    triggeredAt?: number;
    triggeredPrice?: number;
    message: string;
    read: boolean;
}

export interface NewAlertInput {
    symbol: string;
    chartId: string;
    timeframe: string;
    price: number;
    direction: AlertDirection;
}

const STORAGE_KEY = "ajAlerts";
const MAX_TRIGGERED = 100;

type Listener = () => void;

function formatPrice(p: number): string {
    return p >= 100 ? p.toFixed(2) : p.toFixed(4);
}

function load(): PriceAlert[] {
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function save(state: PriceAlert[]) {
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
        // localStorage unavailable - in-memory state still works this session.
    }
}

function beep() {
    try {
        const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!Ctx) return;
        const ctx = new Ctx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        gain.gain.value = 0.05;
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
        setTimeout(() => ctx.close(), 400);
    } catch {
        // audio blocked / unavailable - the panel still shows the alert.
    }
}

class AlertStoreImpl {

    private state: PriceAlert[] = load();
    private listeners: Set<Listener> = new Set();

    getAll(): PriceAlert[] {
        return this.state;
    }

    getActive(symbol?: string): PriceAlert[] {
        return this.state.filter(
            a => a.status === "active" && (symbol === undefined || a.symbol === symbol)
        );
    }

    getTriggered(): PriceAlert[] {
        return this.state
            .filter(a => a.status === "triggered")
            .sort((a, b) => (b.triggeredAt ?? 0) - (a.triggeredAt ?? 0));
    }

    getUnreadCount(): number {
        return this.state.filter(a => a.status === "triggered" && !a.read).length;
    }

    add(input: NewAlertInput): PriceAlert | null {

        const price = Number(formatPrice(input.price));

        if (!Number.isFinite(price)) return null;

        const duplicate = this.state.some(
            a => a.status === "active" && a.symbol === input.symbol && a.price === price
        );

        if (duplicate) return null;

        const alert: PriceAlert = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            symbol: input.symbol,
            chartId: input.chartId,
            timeframe: input.timeframe,
            price,
            direction: input.direction,
            status: "active",
            createdAt: Date.now(),
            message: "",
            read: false
        };

        this.state = [...this.state, alert];
        save(this.state);
        this.notify();
        return alert;
    }

    remove(id: string) {
        this.state = this.state.filter(a => a.id !== id);
        save(this.state);
        this.notify();
    }

    trigger(id: string, lastPrice: number) {

        const target = this.state.find(a => a.id === id);

        if (!target || target.status !== "active") return;

        const message =
            `${target.symbol} crossed ${target.direction} ${formatPrice(target.price)} (last ${formatPrice(lastPrice)})`;

        this.state = this.state.map(a =>
            a.id === id
                ? { ...a, status: "triggered" as AlertStatus, triggeredAt: Date.now(), triggeredPrice: lastPrice, message, read: false }
                : a
        );

        // keep triggered history bounded
        const triggered = this.state.filter(a => a.status === "triggered");
        if (triggered.length > MAX_TRIGGERED) {
            const drop = new Set(
                triggered
                    .sort((a, b) => (a.triggeredAt ?? 0) - (b.triggeredAt ?? 0))
                    .slice(0, triggered.length - MAX_TRIGGERED)
                    .map(a => a.id)
            );
            this.state = this.state.filter(a => !drop.has(a.id));
        }

        save(this.state);
        this.notify();
        beep();
    }

    markAllRead() {
        if (this.getUnreadCount() === 0) return;
        this.state = this.state.map(a =>
            a.status === "triggered" ? { ...a, read: true } : a
        );
        save(this.state);
        this.notify();
    }

    clearTriggered() {
        this.state = this.state.filter(a => a.status !== "triggered");
        save(this.state);
        this.notify();
    }

    subscribe(listener: Listener): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private notify() {
        this.listeners.forEach(listener => listener());
    }
}

export const AlertStore = new AlertStoreImpl();