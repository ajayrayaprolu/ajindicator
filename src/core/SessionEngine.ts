//==================================================================================================
// File:
// SessionEngine.ts
//
// Path:
// src/core/SessionEngine.ts
//
// AJ v2 - Institutional Market Session Engine
//
// Purpose
// -------
// SessionEngine is the canonical market session intelligence engine of the
// AJ v2 institutional trading framework.
//
// It classifies the current NSE trading session, institutional liquidity,
// expected volatility, market participation, and execution permissions.
//
// Unlike a simple "Is NSE Open?" utility, this engine provides normalized
// session intelligence that can be consumed consistently throughout the
// AJ v2 runtime.
//
// Responsibilities
// ----------------
// • Detect NSE market status.
// • Classify trading session.
// • Estimate institutional liquidity.
// • Estimate expected volatility.
// • Estimate market participation.
// • Provide execution permissions.
// • Produce normalized SessionResult.
//
// Functional Areas
// ----------------
// • Market Status
// • Session Classification
// • Institutional Liquidity
// • Volatility Profile
// • Participation Profile
// • Trading Permissions
// • Runtime Session Information
//
// Downstream Consumers
// --------------------
// • ContextEngine
// • OrderFlowEngine
// • BreakoutEngine
// • LiquidityEngine
// • AIEngine
// • AIConfidenceEngine
// • AJRuntimeContextBuilder
// • ExecutionEngine
//
// Design Principles
// -----------------
// • Single Responsibility Principle
// • Pure deterministic engine
// • No trading decisions
// • No signal generation
// • No execution authority
// • Immutable output
// • Phase 15.5 compliant
//==================================================================================================

export type MarketStatus =
    | "OPEN"
    | "PRE_MARKET"
    | "POST_MARKET"
    | "CLOSED";

export type SessionType =
    | "PRE_MARKET"
    | "OPENING_DRIVE"
    | "MORNING_TREND"
    | "LUNCH"
    | "AFTERNOON"
    | "POWER_HOUR"
    | "CLOSING_AUCTION"
    | "POST_MARKET"
    | "CLOSED";

export interface SessionResult {

    //--------------------------------------------------
    // MARKET
    //--------------------------------------------------

    marketName: string;

    marketStatus: MarketStatus;

    marketOpen: boolean;

    //--------------------------------------------------
    // SESSION
    //--------------------------------------------------

    sessionType: SessionType;

    //--------------------------------------------------
    // SESSION FLAGS
    //--------------------------------------------------

    openingSession: boolean;

    morningSession: boolean;

    lunchSession: boolean;

    afternoonSession: boolean;

    powerHour: boolean;

    closingAuction: boolean;

    postMarket: boolean;

    //--------------------------------------------------
    // INSTITUTIONAL PROFILE
    //--------------------------------------------------

    institutionalLiquidity: number;

    volatilityExpectation: number;

    participationScore: number;

    //--------------------------------------------------
    // EXECUTION FLAGS
    //--------------------------------------------------

    allowScalp: boolean;

    allowIntraday: boolean;

    allowSwing: boolean;

    lowLiquidity: boolean;

    highLiquidity: boolean;

    //--------------------------------------------------
    // DISPLAY
    //--------------------------------------------------

    sessionText: string;

}

export class SessionEngine {

    //--------------------------------------------------
    // NSE MARKET HOURS
    //--------------------------------------------------

    private static readonly PRE_MARKET_START =
        9 * 60;

    private static readonly MARKET_OPEN =
        9 * 60 + 15;

    private static readonly OPENING_END =
        9 * 60 + 45;

    private static readonly MORNING_END =
        11 * 60 + 30;

    private static readonly LUNCH_END =
        13 * 60;

    private static readonly AFTERNOON_END =
        14 * 60 + 45;

    private static readonly POWER_HOUR_END =
        15 * 60 + 20;

    private static readonly MARKET_CLOSE =
        15 * 60 + 30;

    //--------------------------------------------------
    // TIME
    //--------------------------------------------------

    private static totalMinutes(
        date: Date
    ): number {

        return (
            date.getHours() * 60 +
            date.getMinutes()
        );

    }

    //--------------------------------------------------
    // RANGE
    //--------------------------------------------------

    private static between(

        value: number,

        start: number,

        end: number

    ): boolean {

        return (
            value >= start &&
            value < end
        );

    }

    //--------------------------------------------------
    // PROFILE
    //--------------------------------------------------

    private static profile(
        session: SessionType
    ) {

        switch (session) {

            case "OPENING_DRIVE":

                return {

                    liquidity: 95,
                    volatility: 95,
                    participation: 95

                };

            case "MORNING_TREND":

                return {

                    liquidity: 85,
                    volatility: 80,
                    participation: 85

                };

            case "LUNCH":

                return {

                    liquidity: 25,
                    volatility: 20,
                    participation: 30

                };

            case "AFTERNOON":

                return {

                    liquidity: 60,
                    volatility: 55,
                    participation: 60

                };

            case "POWER_HOUR":

                return {

                    liquidity: 90,
                    volatility: 85,
                    participation: 90

                };

            case "CLOSING_AUCTION":

                return {

                    liquidity: 100,
                    volatility: 90,
                    participation: 100

                };

            case "PRE_MARKET":

                return {

                    liquidity: 10,
                    volatility: 15,
                    participation: 10

                };
			
			case "POST_MARKET":

                return {

                    liquidity: 0,
                    volatility: 0,
                    participation: 0

                };

            default:

                return {

                    liquidity: 0,
                    volatility: 0,
                    participation: 0

                };

        }

    }

    //--------------------------------------------------
    // EVALUATE
    //--------------------------------------------------

    static evaluate(

        date = new Date()

    ): SessionResult {

        const total =

            SessionEngine.totalMinutes(
                date
            );

        //--------------------------------------------------
        // SESSION
        //--------------------------------------------------

        let marketStatus: MarketStatus =

            "CLOSED";

        let sessionType: SessionType =

            "CLOSED";

        if (

            SessionEngine.between(
                total,
                SessionEngine.PRE_MARKET_START,
                SessionEngine.MARKET_OPEN
            )

        ) {

            marketStatus = "PRE_MARKET";
            sessionType = "PRE_MARKET";

        }

        else if (

            SessionEngine.between(
                total,
                SessionEngine.MARKET_OPEN,
                SessionEngine.OPENING_END
            )

        ) {

            marketStatus = "OPEN";
            sessionType = "OPENING_DRIVE";

        }

        else if (

            SessionEngine.between(
                total,
                SessionEngine.OPENING_END,
                SessionEngine.MORNING_END
            )

        ) {

            marketStatus = "OPEN";
            sessionType = "MORNING_TREND";

        }

        else if (

            SessionEngine.between(
                total,
                SessionEngine.MORNING_END,
                SessionEngine.LUNCH_END
            )

        ) {

            marketStatus = "OPEN";
            sessionType = "LUNCH";

        }

        else if (

            SessionEngine.between(
                total,
                SessionEngine.LUNCH_END,
                SessionEngine.AFTERNOON_END
            )

        ) {

            marketStatus = "OPEN";
            sessionType = "AFTERNOON";

        }

        else if (

            SessionEngine.between(
                total,
                SessionEngine.AFTERNOON_END,
                SessionEngine.POWER_HOUR_END
            )

        ) {

            marketStatus = "OPEN";
            sessionType = "POWER_HOUR";

        }

        else if (

            SessionEngine.between(
                total,
                SessionEngine.POWER_HOUR_END,
                SessionEngine.MARKET_CLOSE
            )

        ) {

            marketStatus = "OPEN";
            sessionType = "CLOSING_AUCTION";

        }

        else if (

            total >=
            SessionEngine.MARKET_CLOSE

        ) {

            marketStatus = "POST_MARKET";
            sessionType = "POST_MARKET";

        }

        //--------------------------------------------------
        // PROFILE
        //--------------------------------------------------

        const profile =

            SessionEngine.profile(
                sessionType
            );

        //--------------------------------------------------
        // FLAGS
        //--------------------------------------------------

        const openingSession =
            sessionType === "OPENING_DRIVE";

        const morningSession =
            sessionType === "MORNING_TREND";

        const lunchSession =
            sessionType === "LUNCH";

        const afternoonSession =
            sessionType === "AFTERNOON";

        const powerHour =
            sessionType === "POWER_HOUR";

        const closingAuction =
            sessionType === "CLOSING_AUCTION";

        const postMarket =
            sessionType === "POST_MARKET";

        //--------------------------------------------------
        // EXECUTION
        //--------------------------------------------------

        const marketOpen =
            marketStatus === "OPEN";

        const allowScalp =

            marketOpen &&

            !lunchSession;

        const allowIntraday =

            marketOpen;

        const allowSwing =

            true;

        const lowLiquidity =

            profile.liquidity < 40;

        const highLiquidity =

            profile.liquidity >= 80;

        //--------------------------------------------------
        // DISPLAY
        //--------------------------------------------------

        const sessionText =

            sessionType

                .replaceAll(
                    "_",
                    " "
                );

        //--------------------------------------------------
        // RESULT
        //--------------------------------------------------

        return {

            //--------------------------------------------------
            // MARKET
            //--------------------------------------------------

            marketName: "NSE",

            marketStatus,

            marketOpen,

            //--------------------------------------------------
            // SESSION
            //--------------------------------------------------

            sessionType,

            //--------------------------------------------------
            // FLAGS
            //--------------------------------------------------

            openingSession,

            morningSession,

            lunchSession,

            afternoonSession,

            powerHour,

            closingAuction,

            postMarket,

            //--------------------------------------------------
            // PROFILE
            //--------------------------------------------------

            institutionalLiquidity:
                profile.liquidity,

            volatilityExpectation:
                profile.volatility,

            participationScore:
                profile.participation,

            //--------------------------------------------------
            // EXECUTION
            //--------------------------------------------------

            allowScalp,

            allowIntraday,

            allowSwing,

            lowLiquidity,

            highLiquidity,

            //--------------------------------------------------
            // DISPLAY
            //--------------------------------------------------

            sessionText

        };

    }

}