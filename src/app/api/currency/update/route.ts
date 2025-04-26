// Update exchange rates in the database

import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import CurrencyRate from "@/models/CurrencyRate";
import { SUPPORTED_CURRENCIES } from "@/lib/constants";

export async function POST() {
  await dbConnect();
  try {
    const response = await fetch(
      "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json",
    );
    if (!response.ok) {
      console.error("Error fetching exchange rates:" + response.statusText);
      return NextResponse.json({});
    }

    const data = await response.json();
    const rates = data.usd;
    for (const currency of SUPPORTED_CURRENCIES) {
      const lowerCaseCurrency = currency.toLowerCase();
      if (rates[lowerCaseCurrency]) {
        await CurrencyRate.findOneAndUpdate(
          { currency: currency },
          { rate: rates[lowerCaseCurrency], last_updated: new Date() },
          { upsert: true, new: true },
        );
      }
    }
    return NextResponse.json(
      { message: "Exchange rates updated" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error updating exchange rates:" + error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 },
    );
  }
}
