import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { generatePDF } from "@/lib/reportUtils";
import { createGenerationInputs } from "@/lib/createGenerationInputs"; // Import the new function
import Report from "@/models/Report";
import { dbConnect } from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

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

    if (
      !["income_report", "portfolio_report", "summary"].includes(reportType)
    ) {
      console.error("Validation failed: Invalid report type");
      return NextResponse.json(
        { error: "Invalid report type" },
        { status: 400 },
      );
    }

    const toDateObj: Date = new Date(dateRange.to);
    let fromDateObj: Date | undefined;

    // For summary report, set fromDate to one year prior to toDate
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

    // Generate the full generation inputs
    const generationInputs = await createGenerationInputs({
      portfolio_ids: portfolioIds,
      report_type: reportType,
      from_date: fromDateObj,
      to_date: toDateObj,
    });

    console.log("Generating report file...");
    const fileName = `${name}.${format}`;
    let mimeType, fileBuffer;

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
      name: name,
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
      { error: `Error generating report: ${error}` },
      { status: 500 },
    );
  }
}
