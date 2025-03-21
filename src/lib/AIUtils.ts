import { getTodayPriceBySymbol } from "@/lib/stockPrices";
import { PortfolioHoldings } from "@/types/portfolio";

export interface AIPrediction {
  symbol: string;
  currentPrice: number;
  predictedPrice12Months: number;
  predictedChangePercentage: number;
  justification?: string;
}

async function callGeminiAPI(prompt: string): Promise<string> {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) {
    throw new Error("AI_API_KEY is not defined in environment variables");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 200,
        },
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const result = await response.json();
  return (
    result.candidates[0]?.content?.parts[0]?.text || "No prediction available"
  );
}

export async function getAIPredictions(
  symbols: string[],
  currentPrices: Record<string, number>,
  justifications?: string[],
): Promise<AIPrediction[]> {
  const predictions: AIPrediction[] = [];
  for (let i = 0; i < symbols.length; i++) {
    const symbol = symbols[i];
    const prompt = `Predict the 12-month price change percentage for ${symbol} stock. Provide a numerical percentage in the format: "X%".`;
    const response = await callGeminiAPI(prompt);

    const match = response.match(/-?\d+\.?\d*%$/);
    const predictedChange = match
      ? parseFloat(match[0].replace("%", ""))
      : Math.random() * 50 - 25;

    let currentPrice =
      currentPrices[symbol] ?? (await getTodayPriceBySymbol(symbol));
    if (currentPrice === 0) {
      console.log(`No price available for ${symbol}, using default price`);
      currentPrice = 50;
    }

    const predictedPrice12Months = currentPrice * (1 + predictedChange / 100);

    predictions.push({
      symbol,
      currentPrice,
      predictedPrice12Months,
      predictedChangePercentage: predictedChange,
      justification: justifications ? justifications[i] : undefined,
    });
  }
  return predictions;
}

export async function getAIRecommendations(
  holdings: Record<string, PortfolioHoldings>,
  currentHoldingsPredictions: AIPrediction[] = [],
): Promise<AIPrediction[]> {
  const currentHoldings =
    holdings && Object.keys(holdings).length > 0
      ? Object.values(holdings).flatMap((h) => Object.keys(h.stockHoldingsTo))
      : [];

  if (currentHoldings.length === 0) {
    console.log(
      "No current holdings provided for recommendations, using default symbols",
    );
    currentHoldings.push("AAPL", "MSFT", "VTI");
  }

  const currentHoldingsSummary = currentHoldingsPredictions
    .map(
      (p) =>
        `${p.symbol}: Current Price = ${p.currentPrice.toFixed(
          2,
        )}, Predicted Change = ${
          p.predictedChangePercentage
        }%, Predicted Price (12 months) = ${p.predictedPrice12Months.toFixed(2)}`,
    )
    .join(". ");

  const minimumPerformance = Math.min(
    ...currentHoldingsPredictions.map((p) => p.predictedChangePercentage),
  );
  const averagePerformance =
    currentHoldingsPredictions.reduce(
      (acc, p) => acc + p.predictedChangePercentage,
      0,
    ) / currentHoldingsPredictions.length;

  const prompt = `Here are the current holdings and their predicted price changes for the next 12 months: ${currentHoldingsSummary}. Based on this, suggest 3 other stocks not in the attached list (not funds) that each have a better predicted percentage gain than the current holdings. The recommended stocks MUST:
    1. Only include stocks with a higher predicted % gain than at least ${minimumPerformance.toFixed(
      2,
    )}% (minimum performance of current holdings).
    2. Ideally exceed the average performance of the current holdings (${averagePerformance.toFixed(
      2,
    )}%).
Return your response strictly in this format:
    Symbol1, Symbol2, Symbol3
    Symbol1: [reason].
    Symbol2: [reason].
    Symbol3: [reason].
Each reason must clearly explain why the stock has better growth potential for the next 12 months (Not just the numbers but actual reason why the company is expected to perform well.)
I need you to put a dot "." after the last symbol. For the justification, make sure to always put a dot "." at the end of the sentence even if it's the end of your response.
At the end of your response (After giving your reasons for all the stocks already) return expected growth percentage for each stock in the format: "Symbol1: X%, Symbol2: Y%, Symbol3: Z%,"
The stocks you choose don't have to be from 1 specific sector. Try to look at a broader market to find the best picks.
The price growth predictions don't have to be even numbers, it could be something like 32.48% for example.
Don't leave a gap between the sections of your response.`;

  const response = await callGeminiAPI(prompt);
  console.log("Recommendation response: ", response);

  const [symbolsPart, ...remainingParts] = response.split(".");
  const suggestedSymbols = symbolsPart
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s && /^[A-Z]+$/.test(s))
    .slice(0, 3);

  if (suggestedSymbols.length === 0) {
    console.log(
      "No valid suggested symbols received, using default suggestions",
    );
    suggestedSymbols.push("AAPL", "MSFT", "NVDA");
  }

  let justifications: string[] = [];
  let growthPercentages: Record<string, number> = {};

  const remainingText = remainingParts.join(".");
  const lines = remainingText
    .split(".")
    .map((line) => line.trim())
    .filter((line) => line);

  justifications = suggestedSymbols.map((symbol) => {
    const justificationLine = lines.find((line) =>
      line.startsWith(`${symbol}:`),
    );
    if (justificationLine) {
      const text = justificationLine.replace(`${symbol}:`, "").trim();
      // Stop at the next symbol or percentage
      const nextSymbolIndex = suggestedSymbols
        .filter((s) => s !== symbol)
        .map((s) => text.indexOf(`${s}:`))
        .filter((i) => i >= 0)
        .sort((a, b) => a - b)[0];
      const percentageIndex = text.indexOf("%");
      if (
        nextSymbolIndex >= 0 &&
        (percentageIndex < 0 || nextSymbolIndex < percentageIndex)
      ) {
        return text.substring(0, nextSymbolIndex).trim();
      }
      if (percentageIndex >= 0) {
        return text.substring(0, percentageIndex).trim();
      }
      return text;
    }
    return "No reasoning provided";
  });

  lines.forEach((line) => {
    if (line.includes("%")) {
      const percentageParts = line.split(",").map((part) => part.trim());
      percentageParts.forEach((part) => {
        suggestedSymbols.forEach((symbol) => {
          if (part.startsWith(`${symbol}:`)) {
            const percentageMatch = part.match(/(\d+\.?\d*)%/);
            if (percentageMatch) {
              const percentage = parseFloat(
                percentageMatch[0].replace("%", ""),
              );
              if (!isNaN(percentage)) {
                growthPercentages[symbol] = percentage;
              }
            }
          }
        });
      });
    }
  });

  console.log("Symbols:", suggestedSymbols);
  console.log("Justifications:", justifications);
  console.log("Growth Percentages:", growthPercentages);
  const pricePromises = suggestedSymbols.map(async (symbol) => ({
    symbol,
    price: await getTodayPriceBySymbol(symbol),
  }));
  const prices = await Promise.all(pricePromises);
  const currentPrices: Record<string, number> = prices.reduce(
    (acc, { symbol, price }) => {
      acc[symbol] = price;
      return acc;
    },
    {} as Record<string, number>,
  );

  return suggestedSymbols.map((symbol, index) => ({
    symbol,
    currentPrice: currentPrices[symbol] || 0,
    predictedChangePercentage: growthPercentages[symbol] || 0,
    predictedPrice12Months:
      currentPrices[symbol] * (1 + (growthPercentages[symbol] || 0) / 100),
    justification: justifications[index] || "No reasoning provided",
  }));
}
