export interface AIPrediction {
  symbol: string;
  currentPrice: number;
  predictedPrice12Months: number;
  predictedChangePercentage: number;
}

async function callGeminiAPI(prompt: string): Promise<string> {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) {
    throw new Error("AI_API_KEY is not defined in environment variables");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
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
          maxOutputTokens: 100,
        },
      }),
    },
  );
  if (response.status === 429) throw new Error("Gemini API rate limit reached");

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
  portfolioHoldings: Record<
    string,
    { stockHoldingsTo: Record<string, { value: number; quantity: number }> }
  >,
): Promise<AIPrediction[]> {
  const predictions: AIPrediction[] = [];
  for (const symbol of symbols) {
    const prompt = `Predict the 12-month price change percentage for ${symbol} stock. Reason step by step and provide a numerical percentage in the format: "X%".`;
    const response = await callGeminiAPI(prompt);

    const match = response.match(/-?\d+\.?\d*%$/);
    const predictedChange = match
      ? parseFloat(match[0].replace("%", ""))
      : Math.random() * 50 - 25;
    const portfolioId = Object.keys(portfolioHoldings)[0];
    const currentPrice =
      portfolioHoldings[portfolioId]?.stockHoldingsTo[symbol]?.value /
        portfolioHoldings[portfolioId]?.stockHoldingsTo[symbol]?.quantity || 50;
    const predictedPrice12Months = currentPrice * (1 + predictedChange / 100);

    predictions.push({
      symbol,
      currentPrice,
      predictedPrice12Months,
      predictedChangePercentage: predictedChange,
    });
  }
  return predictions;
}

export async function getAIRecommendations(
  currentHoldings: string[],
): Promise<AIPrediction[]> {
  const prompt = `Suggest 3 stocks or funds to replace ${currentHoldings.join(", ")} for better performance over the next 12 months. List them as a comma-separated string (e.g., GOOGL,TSLA,SPY).`;
  const response = await callGeminiAPI(prompt);

  const suggestedSymbols = response
    .split(",")
    .map((s) => s.trim())
    .slice(0, 3);
  const mockPortfolioHoldings: Record<
    string,
    { stockHoldingsTo: Record<string, { value: number; quantity: number }> }
  > = {
    mockPortfolio: {
      stockHoldingsTo: suggestedSymbols.reduce(
        (acc, symbol) => {
          acc[symbol] = {
            value: (Math.random() * 100 + 50) * 100,
            quantity: 100,
          }; // Mock data
          return acc;
        },
        {} as Record<string, { value: number; quantity: number }>,
      ),
    },
  };
  return await getAIPredictions(suggestedSymbols, mockPortfolioHoldings);
}
