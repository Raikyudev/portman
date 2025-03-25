import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import CurrencyRate from "@/models/CurrencyRate";

export async function GET(request: Request) {
  await dbConnect();

  try {
    const { searchParams } = new URL(request.url);
    const currency1 = searchParams.get("currency1");
    const currency2 = searchParams.get("currency2");

    if (!currency1) {
      return NextResponse.json(
        {
          message: "currency1 is required",
        },
        { status: 400 },
      );
    }

    if (currency1.toUpperCase() === "USD" && !currency2) {
      return NextResponse.json(
        {
          base: "USD",
          currency: "USD",
          rate: 1,
        },
        { status: 200 },
      );
    }

    const c1 = currency1.toUpperCase();
    const c2 = currency2 ? currency2.toUpperCase() : "USD";

    const rates = await CurrencyRate.find({ currency: { $in: [c1, c2] } });

    const rateMap: Record<string, number> = {};
    rates.forEach((rate) => {
      rateMap[rate.currency] = rate.rate;
    });

    if (!currency2) {
      const rate = rateMap[c1] || 1;
      return NextResponse.json(
        {
          base: "USD",
          currency: c1,
          rate,
        },
        { status: 200 },
      );
    }

    const rate1 = rateMap[c1] || 1;
    const rate2 = rateMap[c2] || 1;
    const exchangeRate = rate1 / rate2;

    return NextResponse.json(
      {
        base: c2,
        currency: c1,
        rate: exchangeRate,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching exchange rates:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 },
    );
  }
}
