// Route to re-generate and download a saved report

import { NextResponse } from "next/server";
import Report, { IReport } from "@/models/Report";
import { dbConnect } from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createGenerationInputs } from "@/lib/createGenerationInputs";
import { generatePDF } from "@/lib/reportUtils";
import { getServerExchangeRates } from "@/lib/currencyExchange";

export async function GET(request: Request) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !(session.user as { id?: string }).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get report id
    const url = new URL(request.url);
    const reportId = url.searchParams.get("id");

    if (!reportId) {
      return NextResponse.json(
        { error: "Report ID is required" },
        { status: 400 },
      );
    }

    await dbConnect();

    // Find report
    const report: IReport | null = await Report.findById(reportId);
    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Check ownership
    if (report.user_id.toString() !== (session.user as { id: string }).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Create generation inputs
    const generationInputs = await createGenerationInputs({
      portfolio_ids: report.portfolio_ids.map((id) => id.toString()),
      report_type: report.report_type as
        | "income_report"
        | "portfolio_report"
        | "summary",
      from_date: report.generation_inputs.from_date,
      to_date: report.generation_inputs.to_date,
    });

    const preferredCurrency =
      (session.user as any).preferences?.currency || "USD";

    // Fetch currency rates
    const currencyRates = await getServerExchangeRates(request);

    let mimeType, fileBuffer;

    // Generate report file based on format
    switch (report.report_format) {
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

    const resolvedFileBuffer = fileBuffer;

    // Prepare file for download
    const fileName = `${report.name}.${report.report_format.toLowerCase()}`;
    return new Response(resolvedFileBuffer, {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error("Error regenerating report:", error);
    return NextResponse.json(
      { error: `Error regenerating report: ${error}` },
      { status: 500 },
    );
  }
}
