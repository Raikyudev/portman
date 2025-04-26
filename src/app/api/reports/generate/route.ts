// Route to generate a new report

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { generatePDF } from "@/lib/reportUtils";
import { createGenerationInputs } from "@/lib/createGenerationInputs";
import Report from "@/models/Report";
import { dbConnect } from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { reportTypes } from "@/lib/constants";
import { getServerExchangeRates } from "@/lib/currencyExchange";

export async function POST(request: Request) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !(session.user as { id?: string }).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get parameters
    const {
      selectedPortfolios,
      type: reportType,
      format,
      dateRange,
      name,
    } = await request.json();

    if (!reportType || !format || !dateRange?.to || !name) {
      console.error("Validation failed: Missing required fields");
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    if (!reportTypes.some((type) => type.value === reportType)) {
      console.error("Validation failed: Invalid report type");
      return NextResponse.json(
        { error: "Invalid report type" },
        { status: 400 },
      );
    }

    // Validate dates
    const toDateObj: Date = new Date(dateRange.to);
    let fromDateObj: Date | undefined;

    if (reportType === "summary") {
      fromDateObj = new Date(toDateObj);
      fromDateObj.setFullYear(toDateObj.getFullYear() - 1);
    } else {
      fromDateObj = dateRange.from ? new Date(dateRange.from) : undefined;
    }

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

    await dbConnect();

    // Validate portfolio IDs
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

    // Create generation inputs
    const generationInputs = await createGenerationInputs({
      portfolio_ids: portfolioIds,
      report_type: reportType,
      from_date: fromDateObj,
      to_date: toDateObj,
    });

    const preferredCurrency =
      (session.user as any).preferences?.currency || "USD";

    const currencyRates = await getServerExchangeRates(request);

    // Generate report file
    const fileName = `${name}.${format}`;
    let mimeType, fileBuffer;

    switch (format) {
      case "json":
        fileBuffer = Buffer.from(JSON.stringify(generationInputs, null, 2));
        mimeType = "application/json";
        break;

      case "pdf":
      default:
        fileBuffer = await generatePDF(
          generationInputs,
          session.user.first_name || "User",
          session.user.last_name || "",
          preferredCurrency,
          currencyRates,
        );
        mimeType = "application/pdf";
        break;
    }

    // Save report metadata to the database
    const newReport = new Report({
      user_id: session.user.id,
      portfolio_ids: portfolioObjectIds,
      report_type: reportType,
      name: name,
      report_format: format,
      generation_inputs: {
        from_date: fromDateObj,
        to_date: toDateObj,
      },
      file_name: fileName,
    });

    await newReport.save();

    const resolvedFileBuffer = fileBuffer;

    // Return generated file
    return new Response(resolvedFileBuffer, {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error("Error generating report:", error);
    return NextResponse.json(
      { error: `Error generating report: ${error}` },
      { status: 500 },
    );
  }
}
