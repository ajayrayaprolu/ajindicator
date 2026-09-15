//======================================================
// server/fyers/history.js
//======================================================
//
// FYERS API v3 Historical Data
//
// Endpoint:
//
//   GET https://api-t1.fyers.in/data/history
//
//======================================================

import axios from "axios";

import {
    getAppId,
    getAccessToken
}
from "./token.js";

//======================================================
// BASE URL
//======================================================

const FYERS_DATA_BASE = "https://api-t1.fyers.in/data";

//======================================================
// RESOLUTION
//======================================================

export function normalizeResolution(
    timeframe
) {

    const value =
        String(
            timeframe ??
            "1m"
        )
        .trim()
        .toLowerCase();

    const map = {

        "1s":
            "5S",

        "5s":
            "5S",

        "10s":
            "10S",

        "15s":
            "15S",

        "30s":
            "30S",

        "45s":
            "45S",

        "1m":
            "1",

        "1min":
            "1",

        "1minute":
            "1",

        "2m":
            "2",

        "3m":
            "3",

        "5m":
            "5",

        "10m":
            "10",

        "15m":
            "15",

        "20m":
            "20",

        "30m":
            "30",

        "60m":
            "60",

        "1h":
            "60",

        "120m":
            "120",

        "2h":
            "120",

        "240m":
            "240",

        "4h":
            "240",

        "1d":
            "D",

        "day":
            "D",

        "daily":
            "D",

        "1w":
            "1W",

        "week":
            "1W",

        "1mo":
            "1M",

        "1month":
            "1M"

    };

    return (
        map[value] ??
        timeframe
    );

}

//======================================================
// GET HISTORY
//======================================================

export async function getHistory(
    symbol,
    timeframe = "1m",
    options = {}
) {

    if (
        !symbol
    ) {

        throw new Error(
            "[FYERS HISTORY] Symbol is required."
        );

    }

    const appId =
        getAppId();

    const accessToken =
        getAccessToken();

    if (
        !appId ||
        !accessToken
    ) {

        throw new Error(
            "[FYERS HISTORY] FYERS access token missing."
        );

    }

    const resolution =
        normalizeResolution(
            timeframe
        );

    const now =
        Math.floor(
            Date.now() / 1000
        );

    //--------------------------------------------------
    // DEFAULT RANGE
    //--------------------------------------------------

    const defaultDays =
        isDailyResolution(
            resolution
        )
            ? 30
            : 7;

    const rangeTo =
        normalizeDateValue(
            options.rangeTo,
            now
        );

    const rangeFrom =
        normalizeDateValue(
            options.rangeFrom,
            rangeTo -
                (
                    defaultDays *
                    24 *
                    60 *
                    60
                )
        );

    //--------------------------------------------------
    // REQUEST
    //--------------------------------------------------

    const params = {

        symbol:
            String(symbol)
                .trim()
                .toUpperCase(),

        resolution,

        date_format:
            "0",

        range_from:
            rangeFrom,

        range_to:
            rangeTo,

        cont_flag:
            options.contFlag ??
            "1"

    };

    if (
        options.oiFlag
    ) {

        params.oi_flag =
            "1";

    }
	let response;
	
	try {
	
		response =
			await axios.get(
				`${FYERS_DATA_BASE}/history`,
				{
					params,
					headers: {
						Authorization:
							`${appId}:${accessToken}`
					}
				}
			);
	
	}
//=================================================	
	catch (error) {

		console.error(
			"[FYERS HISTORY] Failed:",
			params.symbol,
			error?.response?.status ?? "",
			error?.response?.data?.message ?? error?.message
		);

		const httpStatus =
			error?.response?.status;

		if (
			httpStatus === 401 ||
			httpStatus === 403
		) {

			const sessionError =
				new Error(
					"[FYERS HISTORY] FYERS access token has expired or is invalid. Log in again via /api/fyers/login, then retry."
				);

			sessionError.fyersReason =
				"SESSION_EXPIRED";

			throw sessionError;
		}

		//--------------------------------------------------
		// SURFACE THE REAL FYERS ERROR
		//
		// FYERS puts the actual rejection reason in the
		// response body (bad symbol, bad resolution, out-
		// of-range dates, etc). A bare "Request failed with
		// status code 422" tells you nothing - the body does.
		//--------------------------------------------------

		const fyersMessage =
			error?.response?.data?.message ??
			error?.response?.data?.s ??
			null;

		if (fyersMessage) {

			const detailedError =
				new Error(
					`[FYERS HISTORY] ${fyersMessage} (symbol: ${params.symbol}, resolution: ${params.resolution})`
				);

			detailedError.fyersReason =
				"REQUEST_REJECTED";

			throw detailedError;
		}

		throw error;

	}

    const data =
        response.data;

    if (
        !data ||
        data.s !== "ok"
    ) {

        throw new Error(

            `[FYERS HISTORY] ${
                data?.message ??
                JSON.stringify(data)
            }`

        );

    }

    if (
        !Array.isArray(
            data.candles
        )
    ) {

        return [];

    }

    return data.candles.map(
        normalizeCandle
    );

}

//======================================================
// NORMALIZE CANDLE
//======================================================

function normalizeCandle(
    row
) {

    return {

        time:
            Number(row[0]),

        open:
            Number(row[1]),

        high:
            Number(row[2]),

        low:
            Number(row[3]),

        close:
            Number(row[4]),

        volume:
            Number(
                row[5] ??
                0
            ),

        oi:
            row.length > 6
                ? Number(row[6])
                : undefined

    };

}

//======================================================
// DAILY RESOLUTION
//======================================================

function isDailyResolution(
    resolution
) {

    return (
        resolution === "D" ||
        resolution === "1D" ||
        resolution === "1W" ||
        resolution === "1M"
    );

}

//======================================================
// DATE
//======================================================

function normalizeDateValue(
    value,
    fallback
) {

    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {

        return fallback;

    }

    if (
        typeof value === "number"
    ) {

        return Math.floor(
            value
        );

    }

    const parsed =
        Date.parse(
            value
        );

    if (
        Number.isNaN(parsed)
    ) {

        throw new Error(
            `[FYERS HISTORY] Invalid date: ${value}`
        );

    }

    return Math.floor(
        parsed / 1000
    );

}

//======================================================
// DEFAULT
//======================================================

export default {

    getHistory,

    normalizeResolution

};




