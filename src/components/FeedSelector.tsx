//======================================================
// src/components/FeedSelector.tsx  :- AJ v2 - FeedSelector
//======================================================
// 
// UI-only market feed selector.
//
// Feed authentication and lifecycle are handled by
// the chart/data layer, not this component.
//
//======================================================

interface Props {

    datasource: string;

    onChange: (
        source: string
    ) => void;

}

//======================================================
// FEED CATALOG
//======================================================

const FEEDS = [

	"Yahoo",
	"Fyers",
	"AliceBlue",
	"Zerodha",
	"Upstox",
    "Dhan",
	"Binance",
	"TwelveData"

] as const;

//======================================================
// COMPONENT
//======================================================

export default function FeedSelector({

    datasource,

    onChange

}: Props) {

    return (

        <select

            value={datasource}

            onChange={(event) =>
                onChange(
                    event.target.value
                )
            }

            aria-label="Market data feed"

            title="Select market data feed"

        >

            {
                FEEDS.map(
                    (feed) => (

                        <option

                            key={feed}

                            value={feed}

                        >

                            {feed}

                        </option>

                    )
                )
            }

        </select>

    );

}