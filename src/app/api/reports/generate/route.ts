import { NextResponse } from "next/server";

import { generatePDF, generateCSV, generateExcel } from "@/lib/reportUtils";
import Report from "@/models/Report";
import { dbConnect } from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { getTransactions } from "@/lib/transactions";
import { authOptions } from "@/lib/auth";
import {
  calculatePortfolioValue,
  calculateStockHoldings,
} from "@/lib/portfolioCalculations";
import { getStocksPriceForDay } from "@/lib/stockPrices";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !(session.user as { id?: string }).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { portfolioId, reportType, format, fromDate, toDate } =
      await request.json();
    if (!portfolioId || !reportType || !format || !fromDate || !toDate) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    await dbConnect();

    const transactions = await getTransactions(portfolioId);
    const stockHoldingsFrom = await calculateStockHoldings(
      transactions,
      fromDate,
    );
    const stockHoldingsTo = await calculateStockHoldings(transactions, toDate);
    console.log("test");

    const stockValuesFrom = await getStocksPriceForDay(
      stockHoldingsFrom,
      fromDate,
    );
    console.log("Stock prices fetched for fromDate:", stockValuesFrom);

    const stockValuesTo = await getStocksPriceForDay(stockHoldingsTo, toDate);
    console.log("Stock prices fetched for toDate:", stockValuesTo);

    const portfolioValueFrom = calculatePortfolioValue(
      stockHoldingsFrom,
      stockValuesFrom,
    );
    const portfolioValueTo = calculatePortfolioValue(
      stockHoldingsTo,
      stockValuesTo,
    );
    const generationInputs = {
      fromDate,
      toDate,
      transactions,
      stockHoldingsFrom,
      stockHoldingsTo,
      stockValuesFrom,
      stockValuesTo,
      portfolioValueFrom,
      portfolioValueTo,
    };

    if (!generationInputs || Object.keys(generationInputs).length === 0) {
      console.error("generationInputs is empty or null:", generationInputs);
      return NextResponse.json(
        { error: "Invalid data for report generation" },
        { status: 400 },
      );
    }
    const today = new Date().toLocaleDateString("en-GB");

    let fileBuffer, mimeType, fileName;

    switch (format) {
      case "csv":
        fileBuffer = generateCSV(generationInputs);
        mimeType = "text/csv";
        fileName = `${reportType} - ${session.user.first_name} ${session.user.last_name} ( ${today} ) .csv`;
        break;
      case "xlsx":
        fileBuffer = generateExcel(generationInputs);
        mimeType =
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        fileName = `${reportType} - ${session.user.first_name} ${session.user.last_name} ( ${today} ) xlsx`;
        break;
      case "pdf":
      default:
        fileBuffer = await generatePDF(generationInputs);
        mimeType = "application/pdf";
        fileName = `${reportType} - ${session.user.first_name} ${session.user.last_name} ( ${today} ) .pdf`;
        break;
    }

    const newReport = new Report({
      user_id: session.user.id,
      portfolio_id: portfolioId,
      report_type: reportType,
      name: fileName,
      report_format: format,
      generation_inputs: {
        from_date: new Date(fromDate),
        to_date: new Date(toDate),
      },
      file_name: fileName,
    });

    await newReport.save();
    const resolvedFileBuffer = await fileBuffer;

    return new Response(resolvedFileBuffer, {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error("Error generating report: " + error);
    return NextResponse.json(
      {
        error: "Error generating report: " + error,
      },
      { status: 400 },
    );
  }
}
