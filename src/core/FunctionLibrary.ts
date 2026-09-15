export function pctChange(a: number, b: number): number {
    if (b === 0) return 0;
    return ((a - b) / b) * 100;
}

export function roundToStep(price: number, step: number): number {
    return Math.round(price / step) * step;
}

export function clamp(
    value: number,
    min: number,
    max: number
): number {
    return Math.max(min, Math.min(max, value));
}

export function isBullish(v: number): boolean {
    return v > 0;
}

export function isBearish(v: number): boolean {
    return v < 0;
}
