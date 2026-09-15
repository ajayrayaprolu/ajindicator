//===================================
// src/config/InstrumentRegistry.ts
//===================================

export const InstrumentRegistry = {

    NIFTY: {

        yahoo: {
            symbol: "^NSEI"
        },

        dhan: {
            securityId: "13"
        },

        zerodha: {
            instrumentToken: "256265"
        },

        upstox: {
            instrumentKey:
                "NSE_INDEX|Nifty 50"
        },

        aliceblue: {
            exchange: "NSE",
            token: "26000",
            symbol: "NIFTY"
        }

    },

    BANKNIFTY: {

        yahoo: {
            symbol: "^NSEBANK"
        },

        dhan: {
            securityId: "25"
        },

        zerodha: {
            instrumentToken: "260105"
        },

        upstox: {
            instrumentKey:
                "NSE_INDEX|Nifty Bank"
        },

        aliceblue: {
            exchange: "NSE",
            token: "26009",
            symbol: "BANKNIFTY"
        }

    },

    RELIANCE: {

        yahoo: {
            symbol: "RELIANCE.NS"
        },

        dhan: {
            securityId: "2885"
        },

        zerodha: {
            instrumentToken: "738561"
        },

        upstox: {
            instrumentKey:
                "NSE_EQ|INE002A01018"
        },

        aliceblue: {
            exchange: "NSE",
            token: "2885",
            symbol: "RELIANCE"
        }

    },

    TCS: {

        yahoo: {
            symbol: "TCS.NS"
        },

        dhan: {
            securityId: "11536"
        },

        zerodha: {
            instrumentToken: "2953217"
        },

        upstox: {
            instrumentKey:
                "NSE_EQ|INE467B01029"
        },

        aliceblue: {
            exchange: "NSE",
            token: "11536",
            symbol: "TCS"
        }

    }

} as const;