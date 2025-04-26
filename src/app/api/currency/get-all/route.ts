// Get all exchange rates from the database

import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import CurrencyRate from "@/models/CurrencyRate";

export async function GET() {
  await dbConnect();

  try {
    const rates = await CurrencyRate.find({});

    const currencyMap: Record<string, number> = { USD: 1 };
    rates.forEach((rate) => {
      currencyMap[rate.currency.toUpperCase()] = rate.rate;
    });

    return NextResponse.json({ rates: currencyMap }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch currency rates" },
      { status: 500 },
    );
  }
}
