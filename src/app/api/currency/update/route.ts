import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import CurrencyRate from "@/models/CurrencyRate";

const SUPPORTED_CURRENCIES = ["cad", "gbp", "eur", "jpy", "hkd", "cny"];

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
      if (rates[currency]) {
        await CurrencyRate.findOneAndUpdate(
          { currency: currency.toUpperCase() },
          { rate: rates[currency], lastUpdated: new Date() },
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
