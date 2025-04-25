import { GET } from "@/app/api/currency/get/route";
import CurrencyRate from "@/models/CurrencyRate";
import { NextRequest } from "next/server";
import { connectTestDB, closeDatabase } from "@/lib/testUtils";

describe("GET /api/currency/get", () => {
  beforeAll(async () => {
    await connectTestDB();
    await CurrencyRate.create([
      { currency: "EUR", rate: 0.9, last_updated: new Date() },
      { currency: "GBP", rate: 0.8, last_updated: new Date() },
    ]);
  });

  afterAll(async () => {
    await closeDatabase();
  });

  const createRequest = (query: string) =>
    new NextRequest(new Request(`http://localhost/api/currency/get?${query}`));

  it("returns 400 if currency1 is missing (F3)", async () => {
    const res = (await GET(createRequest(""))) as Response;
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.message).toBe("currency1 is required");
  });

  it("returns 1 if currency1 is USD and currency2 is missing (F11)", async () => {
    const res = (await GET(createRequest("currency1=USD"))) as Response;
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.currency).toBe("USD");
    expect(data.rate).toBe(1);
  });

  it("returns rate of single currency to USD if currency2 is missing (F11)", async () => {
    const res = (await GET(createRequest("currency1=eur"))) as Response;
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.currency).toBe("EUR");
    expect(data.base).toBe("USD");
    expect(data.rate).toBeCloseTo(0.9);
  });

  it("returns exchange rate between two currencies (F11)", async () => {
    const res = (await GET(
      createRequest("currency1=EUR&currency2=GBP"),
    )) as Response;
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.currency).toBe("EUR");
    expect(data.base).toBe("GBP");
    expect(data.rate).toBeCloseTo(0.9 / 0.8);
  });
});
