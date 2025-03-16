import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { generatePDF } from "@/lib/reportUtils";
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
import { ITransaction } from "@/models/Transaction";

export async function POST(request: Request) {
  try {
    console.log("Authenticating user...");
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !(session.user as { id?: string }).id) {
      console.error("Authentication failed: Unauthorized");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Parsing request payload...");
    const {
      selectedPortfolios,
      type: reportType,
      format,
      dateRange,
      name,
    } = await request.json();

    console.log("Received payload:", {
      selectedPortfolios,
      reportType,
      format,
      dateRange,
      name,
    });

    // Validate required fields
    if (!reportType || !format || !dateRange?.to || !name) {
      console.error("Validation failed: Missing required fields");
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const fromDateObj: Date | undefined = dateRange.from
      ? new Date(dateRange.from)
      : undefined;
    const toDateObj: Date = new Date(dateRange.to);

    if (
      isNaN(toDateObj.getTime()) ||
      (fromDateObj && isNaN(fromDateObj.getTime()))
    ) {
      console.error("Validation failed: Invalid date format", { dateRange });
      return NextResponse.json(
        { error: "Invalid date format" },
        { status: 400 },
      );
    }

    if (fromDateObj && toDateObj < fromDateObj) {
      console.error("Validation failed: End date must be after start date");
      return NextResponse.json(
        { error: "End date must be after start date" },
        { status: 400 },
      );
    }

    const formattedFromDate = fromDateObj
      ? fromDateObj.toISOString()
      : undefined;
    const formattedToDate = toDateObj.toISOString();

    console.log("Connecting to database...");
    await dbConnect();

    console.log("Validating portfolio IDs...");
    const portfolioIds = Array.isArray(selectedPortfolios)
      ? selectedPortfolios
      : [selectedPortfolios];

    if (portfolioIds.length === 0) {
      console.error("Validation failed: No portfolios selected");
      return NextResponse.json(
        { error: "No portfolios selected" },
        { status: 400 },
      );
    }

    const portfolioObjectIds = portfolioIds.map((id: string) => {
      try {
        return new mongoose.Types.ObjectId(id);
      } catch (error) {
        console.error(`Invalid portfolio ID: ${id}`, error);
        throw new Error(`Invalid portfolio ID: ${id}`);
      }
    });

    console.log(`Processing portfolios: ${portfolioIds}`);
    let allTransactions: ITransaction[] = [];
    const aggregatedHoldingsFrom: Record<string, number> = {};
    const aggregatedHoldingsTo: Record<string, number> = {};

    for (const portfolioId of portfolioIds) {
      console.log(`Fetching transactions for portfolio: ${portfolioId}`);
      const transactions = await getTransactions(portfolioId);

      if (!transactions || transactions.length === 0) {
        console.warn(`No transactions found for portfolio ID: ${portfolioId}`);
        continue;
      }

      allTransactions = allTransactions.concat(transactions);

      // Only calculate fromDate holdings if provided
      if (formattedFromDate) {
        console.log("Calculating stock holdings (from)...");
        const stockHoldingsFrom = await calculateStockHoldings(
          transactions,
          formattedFromDate,
        );

        for (const symbol in stockHoldingsFrom) {
          if (!aggregatedHoldingsFrom[symbol]) {
            aggregatedHoldingsFrom[symbol] = 0;
          }
          aggregatedHoldingsFrom[symbol] += stockHoldingsFrom[symbol];
        }
      }

      console.log("Calculating stock holdings (to)...");
      const stockHoldingsTo = await calculateStockHoldings(
        transactions,
        formattedToDate,
      );

      for (const symbol in stockHoldingsTo) {
        if (!aggregatedHoldingsTo[symbol]) {
          aggregatedHoldingsTo[symbol] = 0;
        }
        aggregatedHoldingsTo[symbol] += stockHoldingsTo[symbol];
      }
    }

    console.log("Fetching stock prices (from)...");
    const stockValuesFrom = formattedFromDate
      ? await getStocksPriceForDay(aggregatedHoldingsFrom, formattedFromDate)
      : {};

    console.log("Fetching stock prices (to)...");
    const stockValuesTo = await getStocksPriceForDay(
      aggregatedHoldingsTo,
      formattedToDate,
    );

    console.log("Calculating portfolio value (from)...");
    const portfolioValueFrom = formattedFromDate
      ? calculatePortfolioValue(aggregatedHoldingsFrom, stockValuesFrom)
      : 0;

    console.log("Calculating portfolio value (to)...");
    const portfolioValueTo = calculatePortfolioValue(
      aggregatedHoldingsTo,
      stockValuesTo,
    );

    const generationInputs = {
      fromDate: formattedFromDate,
      toDate: formattedToDate,
      transactions: allTransactions,
      stockHoldingsFrom: aggregatedHoldingsFrom,
      stockHoldingsTo: aggregatedHoldingsTo,
      stockValuesFrom,
      stockValuesTo,
      portfolioValueFrom,
      portfolioValueTo,
    };

    if (!generationInputs || Object.keys(generationInputs).length === 0) {
      console.error("Validation failed: Invalid data for report generation");
      return NextResponse.json(
        { error: "Invalid data for report generation" },
        { status: 400 },
      );
    }

    console.log("Generating report file...");
    const fileName = `${name}`;
    let mimeType, fileBuffer;

    // Use the provided name for the file name, appending format and date

    switch (format) {
      case "json":
        console.log("Generating JSON report...");
        fileBuffer = Buffer.from(JSON.stringify(generationInputs, null, 2));
        mimeType = "application/json";
        break;

      case "pdf":
      default:
        console.log("Generating PDF report...");
        fileBuffer = await generatePDF(generationInputs);
        mimeType = "application/pdf";
        break;
    }

    console.log("Saving report to database...");
    const newReport = new Report({
      user_id: session.user.id,
      portfolio_ids: portfolioObjectIds,
      report_type: reportType,
      name: name, // Use the provided name directly
      report_format: format,
      generation_inputs: {
        from_date: fromDateObj,
        to_date: toDateObj,
      },
      file_name: fileName,
    });

    console.log("Saving report with data:", newReport.toObject());
    await newReport.save();

    console.log("Preparing response...");
    const resolvedFileBuffer = fileBuffer;

    console.log("Report generated successfully:", fileName);
    return new Response(resolvedFileBuffer, {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error("Error generating report:", error);
    return NextResponse.json(
      { error: `Error generating report: ` + error },
      { status: 500 },
    );
  }
}
