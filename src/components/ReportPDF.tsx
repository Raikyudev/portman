import { Document, Page, Text, View } from "@react-pdf/renderer";
import { createTw } from "react-pdf-tailwind";
import { format, parseISO } from "date-fns";
import tailwindConfig from "../../tailwind.config"; // Adjust path

const tw = createTw(tailwindConfig);

interface PortfolioData {
  fromDate: string | undefined;
  toDate: string;
  portfolioValueFrom: number;
  portfolioValueTo: number;
  stockHoldingsFrom: Record<string, { quantity: number; value: number }>;
  stockHoldingsTo: Record<string, { quantity: number; value: number }>;
  reportType?: string;
}

export const PortfolioPDFDocument = ({ data }: { data: PortfolioData }) => {
  const isSummaryReport = !data.fromDate;
  const formattedToDate = format(parseISO(data.toDate), "yyyy-MM-dd");
  const formattedFromDate = data.fromDate
    ? format(parseISO(data.fromDate), "yyyy-MM-dd")
    : undefined;

  const allTickers = Array.from(
    new Set([
      ...Object.keys(data.stockHoldingsFrom),
      ...Object.keys(data.stockHoldingsTo),
    ]),
  );

  return (
    <Document>
      <Page size="A4" style={tw("p-8 font-sans bg-black")}>
        <Text style={tw("text-2xl font-bold text-white mb-4")}>
          {isSummaryReport ? "Portfolio Summary Report" : "Portfolio Report"}
        </Text>
        <View style={tw("mb-6")}>
          {!isSummaryReport && formattedFromDate && (
            <Text style={tw("text-sm text-white")}>
              From Date: {formattedFromDate}
            </Text>
          )}
          <Text style={tw("text-sm text-white")}>
            Report Date: {formattedToDate}
          </Text>
        </View>
        <View style={tw("mb-8")}>
          <Text style={tw("text-lg font-semibold text-white mb-2")}>
            Stock Holdings
          </Text>
          <View style={tw("border border-red")}>
            <View style={tw("flex flex-row bg-black border-b border-red")}>
              {isSummaryReport ? (
                <>
                  <Text
                    style={tw(
                      "w-1/3 p-2 text-sm font-medium text-white text-center",
                    )}
                  >
                    Stock Name
                  </Text>
                  <Text
                    style={tw(
                      "w-1/3 p-2 text-sm font-medium text-white text-center",
                    )}
                  >
                    Shares ({formattedToDate})
                  </Text>
                  <Text
                    style={tw(
                      "w-1/3 p-2 text-sm font-medium text-white text-center",
                    )}
                  >
                    Value ({formattedToDate})
                  </Text>
                </>
              ) : (
                <>
                  <Text
                    style={tw(
                      "w-1/5 p-2 text-sm font-medium text-white text-center",
                    )}
                  >
                    Stock Name
                  </Text>
                  <Text
                    style={tw(
                      "w-1/5 p-2 text-sm font-medium text-white text-center",
                    )}
                  >
                    Shares ({formattedFromDate})
                  </Text>
                  <Text
                    style={tw(
                      "w-1/5 p-2 text-sm font-medium text-white text-center",
                    )}
                  >
                    Value ({formattedFromDate})
                  </Text>
                  <Text
                    style={tw(
                      "w-1/5 p-2 text-sm font-medium text-white text-center",
                    )}
                  >
                    Shares ({formattedToDate})
                  </Text>
                  <Text
                    style={tw(
                      "w-1/5 p-2 text-sm font-medium text-white text-center",
                    )}
                  >
                    Value ({formattedToDate})
                  </Text>
                </>
              )}
            </View>
            {allTickers.map((ticker, index) => {
              const fromHolding = data.stockHoldingsFrom[ticker] || {
                quantity: 0,
                value: 0,
              };
              const toHolding = data.stockHoldingsTo[ticker] || {
                quantity: 0,
                value: 0,
              };
              return (
                <View
                  key={ticker}
                  style={tw(
                    `flex flex-row bg-black ${index < allTickers.length - 1 ? "border-b border-red" : ""}`,
                  )}
                >
                  {isSummaryReport ? (
                    <>
                      <Text
                        style={tw("w-1/3 p-2 text-sm text-white text-center")}
                      >
                        {ticker}
                      </Text>
                      <Text
                        style={tw("w-1/3 p-2 text-sm text-white text-center")}
                      >
                        {toHolding.quantity}
                      </Text>
                      <Text
                        style={tw("w-1/3 p-2 text-sm text-white text-center")}
                      >
                        ${toHolding.value.toFixed(2)}
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text
                        style={tw("w-1/5 p-2 text-sm text-white text-center")}
                      >
                        {ticker}
                      </Text>
                      <Text
                        style={tw("w-1/5 p-2 text-sm text-white text-center")}
                      >
                        {fromHolding.quantity}
                      </Text>
                      <Text
                        style={tw("w-1/5 p-2 text-sm text-white text-center")}
                      >
                        ${fromHolding.value.toFixed(2)}
                      </Text>
                      <Text
                        style={tw("w-1/5 p-2 text-sm text-white text-center")}
                      >
                        {toHolding.quantity}
                      </Text>
                      <Text
                        style={tw("w-1/5 p-2 text-sm text-white text-center")}
                      >
                        ${toHolding.value.toFixed(2)}
                      </Text>
                    </>
                  )}
                </View>
              );
            })}
          </View>
        </View>
        <View>
          <Text style={tw("text-lg font-semibold text-white mb-2")}>
            Portfolio Value
          </Text>
          <View style={tw("border border-red")}>
            <View style={tw("flex flex-row bg-black border-b border-red")}>
              {isSummaryReport ? (
                <>
                  <Text
                    style={tw(
                      "w-1/2 p-2 text-sm font-medium text-white text-center",
                    )}
                  >
                    Description
                  </Text>
                  <Text
                    style={tw(
                      "w-1/2 p-2 text-sm font-medium text-white text-center",
                    )}
                  >
                    Value ({formattedToDate})
                  </Text>
                </>
              ) : (
                <>
                  <Text
                    style={tw(
                      "w-1/3 p-2 text-sm font-medium text-white text-center",
                    )}
                  >
                    Description
                  </Text>
                  <Text
                    style={tw(
                      "w-1/3 p-2 text-sm font-medium text-white text-center",
                    )}
                  >
                    Value ({formattedFromDate})
                  </Text>
                  <Text
                    style={tw(
                      "w-1/3 p-2 text-sm font-medium text-white text-center",
                    )}
                  >
                    Value ({formattedToDate})
                  </Text>
                </>
              )}
            </View>
            <View style={tw("flex flex-row bg-black")}>
              {isSummaryReport ? (
                <>
                  <Text style={tw("w-1/2 p-2 text-sm text-white text-center")}>
                    Portfolio Value
                  </Text>
                  <Text style={tw("w-1/2 p-2 text-sm text-white text-center")}>
                    ${data.portfolioValueTo.toFixed(2)}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={tw("w-1/3 p-2 text-sm text-white text-center")}>
                    Portfolio Value
                  </Text>
                  <Text style={tw("w-1/3 p-2 text-sm text-white text-center")}>
                    ${data.portfolioValueFrom.toFixed(2)}
                  </Text>
                  <Text style={tw("w-1/3 p-2 text-sm text-white text-center")}>
                    ${data.portfolioValueTo.toFixed(2)}
                  </Text>
                </>
              )}
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
};
