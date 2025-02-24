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
import { getStockPrices } from "@/lib/stockPrices";

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
    const stockHoldings = await calculateStockHoldings(transactions, toDate);
    console.log("test");

    const stockValuesFrom = await getStockPrices(stockHoldings, fromDate);
    const stockValuesTo = await getStockPrices(stockHoldings, toDate);

    const portfolioValueFrom = calculatePortfolioValue(
      stockHoldings,
      stockValuesFrom,
    );
    const portfolioValueTo = calculatePortfolioValue(
      stockHoldings,
      stockValuesTo,
    );
    const generationInputs = {
      fromDate,
      toDate,
      transactions,
      stockHoldings,
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
      file_buffer: fileBuffer,
    });

    await newReport.save();

    return new Response(fileBuffer, {
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
