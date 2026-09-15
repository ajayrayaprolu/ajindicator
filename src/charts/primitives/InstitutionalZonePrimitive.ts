//======================================================
// src/charts/primitives/InstitutionalZonePrimitive.ts
// Institutional Pane Primitive
// Step 1: Reusable rectangle renderer for: // Demand // Supply // Neutral // Target // FVG // Liquidity
// ChartEngine owns lifecycle. // This class only renders zones.
//======================================================

import type {
    IChartApi,
    ISeriesApi,
    Time
} from "lightweight-charts";

import { AJLoggingGate } from "@/indicators/AJIndicator/debug/AJLoggingGate";

//------------------------------------------------------
// ZONE TYPES
//------------------------------------------------------
export type InstitutionalZoneType =
    | "demand"
    | "supply"
    | "neutral"
    | "target"
    | "fvg"
    | "liquidity"
    | "orderBlock"
    | "bosBullish"
    | "bosBearish"
    | "chochBullish"
    | "chochBearish";
//------------------------------------------------------
// SINGLE ZONE
//------------------------------------------------------
export interface InstitutionalZone {

    id:string;
    type:InstitutionalZoneType;
    from:Time;
    to:Time;
    high:number;
    low:number;
    color:string;
    borderColor?:string;
    opacity?:number;
    label?:string;
	level?: number;

}
//------------------------------------------------------
// INTERNAL RENDER OBJECT
//------------------------------------------------------
interface ZonePrimitive {

    zone: InstitutionalZone;
    attached: boolean;
    primitive: any;

}
//======================================================
// PRIMITIVE
//======================================================
export class InstitutionalZonePrimitive {

    //--------------------------------------------------
    // OWNER
    //--------------------------------------------------
    private readonly chart:
        IChartApi;

    private readonly series:
        ISeriesApi<any>;

    //--------------------------------------------------
    // STORAGE
    //--------------------------------------------------
    private zones:
        ZonePrimitive[] = [];

    //--------------------------------------------------
    // CTOR
    //--------------------------------------------------
    constructor(

        chart: IChartApi,
        series: ISeriesApi<any>
    ) {
        this.chart =
            chart;
        this.series =
            series;
    }

    //--------------------------------------------------
    // SET ZONES
    //--------------------------------------------------

	setZones(
		zones: InstitutionalZone[]
	): void {
	
		this.clear();
	
		this.zones =
			zones
				.filter(
					zone =>
						zone &&
						zone.from != null &&
						zone.to != null &&
						Number.isFinite(zone.high) &&
						Number.isFinite(zone.low)
				)
				.map(
					zone => ({
						zone,
						attached: false,
						primitive: null
					})
				);
	
		this.render();
	}

    //--------------------------------------------------
    // ADD
    //--------------------------------------------------
    addZone(
        zone:
            InstitutionalZone
    ): void {
        this.zones.push({
            zone,
            attached: false,
            primitive: null
        });
        this.render();
    }

    //--------------------------------------------------
    // REMOVE
    //--------------------------------------------------
    removeZone(
        id: string
    ): void {
        const existing =
            this.zones.find(
                z =>
                    z.zone.id === id
            );
        if (
            existing?.attached &&
            existing.primitive
        ) {
            try {
                this.series.detachPrimitive(
                    existing.primitive
                );
            }
            catch {}
        }
        this.zones =
            this.zones.filter(
                z =>
                    z.zone.id !== id
            );
    }

    //--------------------------------------------------
    // CLEAR
    //--------------------------------------------------
    clear(): void {
        for (
            const item
            of
            this.zones
        ) {
            if (
                item.attached &&
                item.primitive
            ) {

                const primitive =
                    item.primitive;

                // Mark detached first so a synchronous
                // detached() callback re-entering clear()
                // has nothing left to detach.
                item.attached = false;
                item.primitive = null;

                try {
                    this.series.detachPrimitive(
                        primitive
                    );
                }
                catch (error) {
                    AJLoggingGate.warn(
                        "[InstitutionalZonePrimitive]",
                        error
                    );
                }
            }
        }
        this.zones = [];
    }

    //--------------------------------------------------
    // DESTROY
    //--------------------------------------------------

    destroy(): void {
        this.clear();
    }
	
	//--------------------------------------------------
    // RENDER
    //--------------------------------------------------
    private render(): void {
        for (
            const item
            of
            this.zones
        ) {
            if (
                item.attached
            ) {
                continue;
            }
            item.primitive =
                this.createRectanglePrimitive(
                    item.zone
                );
            if (
                !item.primitive
            ) {
                continue;
            }
            try {
                this.series.attachPrimitive(
                    item.primitive
                );
                item.attached =
                    true;
            }
            catch (
                error
            ) {
                AJLoggingGate.warn(
                    "[InstitutionalZonePrimitive]",
                    error
                );
            }
        }
    }

//--------------------------------------------------
// CREATE RECTANGLE PRIMITIVE
//
// RV-25
// Was a permanent no-op stub — zones would compute correctly
// and reach this point but nothing was ever drawn, regardless
// of data shape. Implements the lightweight-charts v5.2.0
// primitive contract: paneViews() -> renderer() -> draw(target)
// using target.useBitmapCoordinateSpace() for the actual canvas
// fill/stroke, converted from the series' time/price coordinate
// helpers already defined lower in this class.
//--------------------------------------------------

private createRectanglePrimitive(
    zone: InstitutionalZone
): any {

    const self = this;

    const isStructureLine =
        zone.type === "bosBullish" ||
        zone.type === "bosBearish" ||
        zone.type === "chochBullish" ||
        zone.type === "chochBearish";

    return {

        paneViews() {

            return [{

                renderer() {

                    return {

                        draw(target: any): void {

                            target.useBitmapCoordinateSpace(
                                (scope: any) => {

                                    const ctx =
                                        scope.context;

                                    const ratioX =
                                        scope.horizontalPixelRatio;

                                    const ratioY =
                                        scope.verticalPixelRatio;

                                    if (isStructureLine) {

                                        if (
                                            zone.level == null
                                        ) {
                                            return;
                                        }

                                        const y =
                                            self.priceToCoordinate(
                                                zone.level
                                            );

                                        const x1 =
                                            self.timeToCoordinate(
                                                zone.from
                                            );

                                        const x2 =
                                            self.timeToCoordinate(
                                                zone.to
                                            );

                                        if (
                                            y == null ||
                                            x1 == null ||
                                            x2 == null
                                        ) {
                                            return;
                                        }

                                        ctx.save();

                                        ctx.globalAlpha = 1;

                                        ctx.strokeStyle =
                                            zone.type.includes("choch")
                                                ? "#ffb300"
                                                : zone.type === "bosBullish"
                                                    ? "#00e676"
                                                    : "#ff5252";

                                        ctx.lineWidth =
                                            Math.max(
                                                1,
                                                ratioY
                                            );

                                        ctx.setLineDash([
                                            6 * ratioX,
                                            5 * ratioX
                                        ]);

                                        ctx.beginPath();

                                        ctx.moveTo(
                                            Math.min(x1, x2) * ratioX,
                                            y * ratioY
                                        );

                                        ctx.lineTo(
                                            Math.max(x1, x2) * ratioX,
                                            y * ratioY
                                        );

                                        ctx.stroke();

                                        ctx.setLineDash([]);

                                        if (zone.label) {

                                            ctx.font =
                                                `bold ${Math.max(
                                                    10,
                                                    11 * ratioY
                                                )}px sans-serif`;

                                            ctx.fillStyle =
                                                ctx.strokeStyle;

                                            ctx.textBaseline =
                                                "bottom";

                                            ctx.fillText(
                                                zone.label,
                                                Math.min(x1, x2) *
                                                    ratioX +
                                                    4 * ratioX,
                                                y * ratioY -
                                                    4 * ratioY
                                            );
                                        }

                                        ctx.restore();

                                        return;
                                    }

                                    const x1 =
                                        self.timeToCoordinate(
                                            zone.from
                                        );

                                    const x2 =
                                        self.timeToCoordinate(
                                            zone.to
                                        );

                                    const y1 =
                                        self.priceToCoordinate(
                                            zone.high
                                        );

                                    const y2 =
                                        self.priceToCoordinate(
                                            zone.low
                                        );

                                    if (
                                        x1 == null ||
                                        x2 == null ||
                                        y1 == null ||
                                        y2 == null
                                    ) {
                                        return;
                                    }

                                    const left =
                                        Math.min(x1, x2) *
                                        ratioX;

                                    const right =
                                        Math.max(x1, x2) *
                                        ratioX;

                                    const top =
                                        Math.min(y1, y2) *
                                        ratioY;

                                    const bottom =
                                        Math.max(y1, y2) *
                                        ratioY;

                                    const width =
                                        Math.max(
                                            right - left,
                                            1
                                        );

                                    const height =
                                        Math.max(
                                            bottom - top,
                                            1
                                        );

                                    ctx.save();

                                    //==================================================
                                    // VISIBLE LIGHT ZONE FILL
                                    //
                                    // Zone colors already contain RGBA transparency.
                                    // Keep globalAlpha at 1 so the fill remains visible.
                                    //==================================================

                                    ctx.globalAlpha =
                                        1;

                                    ctx.fillStyle =
                                        zone.color;

                                    ctx.fillRect(
                                        left,
                                        top,
                                        width,
                                        height
                                    );

                                    //==================================================
                                    // VISIBLE BORDER
                                    //==================================================

                                    if (
                                        zone.borderColor
                                    ) {

                                        ctx.globalAlpha =
                                            0.95;

                                        ctx.strokeStyle =
                                            zone.borderColor;

                                        ctx.lineWidth =
                                            Math.max(
                                                1.5,
                                                1.5 * ratioX
                                            );

                                        ctx.strokeRect(
                                            left,
                                            top,
                                            width,
                                            height
                                        );
                                    }

                                    //==================================================
                                    // READABLE LABEL
                                    //==================================================

                                    if (
                                        zone.label
                                    ) {

                                        const fontSize =
                                            Math.max(
                                                11,
                                                12 * ratioY
                                            );

                                        ctx.font =
                                            `bold ${fontSize}px sans-serif`;

                                        ctx.textBaseline =
                                            "top";

                                        const paddingX =
                                            5 * ratioX;

                                        const paddingY =
                                            3 * ratioY;

                                        const textMetrics =
                                            ctx.measureText(
                                                zone.label
                                            );

                                        const labelWidth =
                                            textMetrics.width +
                                            paddingX * 2;

                                        const labelHeight =
                                            fontSize +
                                            paddingY * 2;

                                        const labelX =
                                            left +
                                            4 * ratioX;

                                        const labelY =
                                            top +
                                            4 * ratioY;

                                        // Dark label background
                                        ctx.globalAlpha =
                                            0.82;

                                        ctx.fillStyle =
                                            "rgba(0, 0, 0, 0.82)";

                                        ctx.fillRect(
                                            labelX,
                                            labelY,
                                            labelWidth,
                                            labelHeight
                                        );

                                        // Bright readable label
                                        ctx.globalAlpha =
                                            1;

                                        ctx.fillStyle =
                                            zone.borderColor ??
                                            "#ffffff";

                                        ctx.fillText(
                                            zone.label,
                                            labelX +
                                                paddingX,
                                            labelY +
                                                paddingY
                                        );
                                    }

                                    ctx.restore();
                                }
                            );
                        }
                    };
                }
            }];
        }
    };
}

    //--------------------------------------------------
    // UPDATE
    //--------------------------------------------------

    update(
        zones:
            InstitutionalZone[]
    ): void {
        this.setZones(
            zones
        );
    }

    //--------------------------------------------------
    // ATTACHED
    //--------------------------------------------------
    attached(): void {
        this.render();
    }

    //--------------------------------------------------
    // DETACHED
    //--------------------------------------------------
    detached(): void {
        for (
            const item
            of
            this.zones
        ) {
            item.attached = false;
            item.primitive = null;
        }
        this.zones = [];
    }

    //--------------------------------------------------
    // AUTOSCALE
    //--------------------------------------------------
    autoscaleInfo(): any {
        return null;
    }

    //--------------------------------------------------
    // HELPERS
    //--------------------------------------------------
    protected timeToCoordinate(
        time: Time
    ): number | null {
        return this.chart
            .timeScale()
            .timeToCoordinate(
                time
            );
    }

    //--------------------------------------------------
    protected priceToCoordinate(
        price: number
    ): number | null {
        return this.series
            .priceToCoordinate(
                price
            );
    }

    //--------------------------------------------------
    // ZONE COUNT
    //--------------------------------------------------
    get size(): number {
        return this.zones.length;
    }

    //--------------------------------------------------
    // EMPTY
    //--------------------------------------------------
    get empty(): boolean {
        return this.zones.length === 0;

    }

    //--------------------------------------------------
    // ALL ZONES
    //--------------------------------------------------
    getZones():
        InstitutionalZone[] {
        return this.zones.map(
            x => x.zone
        );
    }

    //--------------------------------------------------
    // HAS ZONE
    //--------------------------------------------------
    has(
        id: string
    ): boolean {
        return this.zones.some(
            z =>
                z.zone.id === id
        );
    }

    //--------------------------------------------------
    // FIND
    //--------------------------------------------------
    find(
        id: string
    ):
        InstitutionalZone | undefined {
        return this.zones.find(
            z =>
                z.zone.id === id
        )?.zone;
    }
}