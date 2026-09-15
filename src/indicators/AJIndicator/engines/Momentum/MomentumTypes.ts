/****************************************************************************************
 * File:
 * MomentumTypes.ts
 *
 * Path:
 * src/indicators/AJIndicator/engines/Momentum/MomentumTypes.ts
 *
 * Purpose:
 * Canonical input contracts and reusable types for the AJ v2
 * Momentum Engine.
 *
 * This file contains only contracts, enums and configuration.
 * No calculations or trading logic belong here.
 *
 * AJ Architecture
 *
 * Runtime
 *      ↓
 * MomentumEngine
 *      ↓
 * MomentumResult
 *      ↓
 * Risk Qualification
 *      ↓
 * Confidence
 *      ↓
 * Authority
 ****************************************************************************************/

//======================================================
// MOMENTUM DIRECTION
//======================================================

export type MomentumDirection =
    | "BULLISH"
    | "BEARISH"
    | "NEUTRAL";

//======================================================
// MOMENTUM STRENGTH
//======================================================

export type MomentumStrength =
    | "WEAK"
    | "MODERATE"
    | "STRONG"
    | "EXTREME";

//======================================================
// MOMENTUM STAGE
//======================================================

export type MomentumStage =
    | "BUILDING"
    | "ACCELERATING"
    | "DECELERATING"
    | "EXHAUSTION";

//======================================================
// BREAKOUT TYPE
//======================================================

export type BreakoutType =
    | "NONE"
    | "BULLISH"
    | "BEARISH";

//======================================================
// IMPULSE TYPE
//======================================================

export type ImpulseType =
    | "NONE"
    | "BULLISH"
    | "BEARISH";

//======================================================
// RSI INFORMATION
//======================================================

export interface RSIInformation {

    rsi: number;

    overbought: boolean;

    oversold: boolean;

}

//======================================================
// MOMENTUM METRICS
//======================================================

export interface MomentumMetrics {

    currentMomentum: number;

    previousMomentum: number;

    acceleration: number;

    momentumSlope?: number;

}

//======================================================
// BREAKOUT INFORMATION
//======================================================

export interface BreakoutInformation {

    breakoutStrength: number;

    breakoutConfirmed: boolean;

    breakoutType: BreakoutType;

}

//======================================================
// IMPULSE INFORMATION
//======================================================

export interface ImpulseInformation {

    impulseQuality: number;

    impulseType: ImpulseType;

    impulseStrength: number;

}

//======================================================
// ENGINE INPUT
//======================================================

export interface MomentumInput {

    //--------------------------------------------------
    // RSI
    //--------------------------------------------------

    rsi: number;

    //--------------------------------------------------
    // MOMENTUM
    //--------------------------------------------------

    currentMomentum: number;

    previousMomentum: number;

    //--------------------------------------------------
    // BREAKOUT
    //--------------------------------------------------

    breakoutStrength: number;

    //--------------------------------------------------
    // IMPULSE
    //--------------------------------------------------

    impulseQuality: number;

    //--------------------------------------------------
    // OPTIONAL
    //--------------------------------------------------

    close?: number;

    atr?: number;

    volume?: number;

}

//======================================================
// CONFIGURATION
//======================================================

export interface MomentumConfiguration {

    bullishRSI: number;

    bearishRSI: number;

    overboughtRSI: number;

    oversoldRSI: number;

    strongBreakout: number;

    strongImpulse: number;

}

//======================================================
// DEFAULT CONFIGURATION
//======================================================

export const DefaultMomentumConfiguration: MomentumConfiguration = {

    bullishRSI: 55,

    bearishRSI: 45,

    overboughtRSI: 70,

    oversoldRSI: 30,

    strongBreakout: 70,

    strongImpulse: 60

};