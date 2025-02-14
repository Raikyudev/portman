import Asset from "@/models/Asset";
import { dbConnect, closeDatabase } from "@/lib/mongodb";
import fetch from "node-fetch";

const FMP_API_KEY = process.env.FINANCIAL_API_KEY;
if (!FMP_API_KEY) {
    throw new Error("Missing Financial Modeling Prep API Key");
}

interface FetchedAsset {
    symbol: string;
    name: string;
    price: number;
    exchange: string;
    exchangeShortName: string;
    type: string;
}

const exchangeCurrencyMap: { [key: string]: string } = {
    "NASDAQ": "USD",
    "NYSE": "USD",
    "AMEX": "USD",
    "TSX": "CAD",
    "LSE": "GBP",
    "Euronext Paris": "EUR",
    "Frankfurt": "EUR",
    "Tokyo": "JPY",
    "Hong Kong": "HKD",
    "Shanghai": "CNY",
    "Other OTC": "USD",
};


export default async function fetchAssets() {
    await dbConnect();

    try{
        const response = await fetch (
            `https://financialmodelingprep.com/api/v3/available-traded/list?apikey=${FMP_API_KEY}`
        );

        if (!response.ok) {
            console.log("Error fetching assets");
        }


        const stocks: FetchedAsset[]  = await response.json() as FetchedAsset[];
        console.log(stocks)
        for (const stock of stocks) {
            try{
                const assetData = {
                    symbol: stock.symbol,
                    name: stock.name,
                    price: stock.price || 0,
                    currency: exchangeCurrencyMap[stock.exchange] || "USD",
                    market: stock.exchangeShortName,
                    asset_type: stock.type,
                };

                await Asset.findOneAndUpdate(
                    {symbol: assetData.symbol},
                    assetData,
                    {upsert: true, new: true}
                )
            }catch (error) {
                console.log("Error fetching asset data " + error);
            }
        }

    } catch (error) {
        console.log("Error fetching assets list" + error);
    }

    console.log("Finished fetching assets");
    await closeDatabase();

}
