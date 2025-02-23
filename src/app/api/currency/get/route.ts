import { NextResponse } from "next/server";
import { getExchangeRate } from "@/lib/currencyExchange";

export async function GET(request: Request) {
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

    const result = await getExchangeRate(currency1, currency2 || undefined);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Error fetching exchange rates:" + error);
    return NextResponse.json(
      { message: "Internal Server Error" + error },
      { status: 500 },
    );
  }
}
