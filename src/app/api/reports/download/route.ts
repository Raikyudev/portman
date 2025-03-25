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
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !(session.user as { id?: string }).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const reportId = url.searchParams.get("id");

    if (!reportId) {
      return NextResponse.json(
        { error: "Report ID is required" },
        { status: 400 },
      );
    }

    await dbConnect();

    const report: IReport | null = await Report.findById(reportId);
    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    if (report.user_id.toString() !== (session.user as { id: string }).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

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

    console.log("Fetching server-side currency rates...");
    const currencyRates = await getServerExchangeRates(request);

    let mimeType, fileBuffer;

    switch (report.report_format) {
      case "json":
        console.log("Generating JSON report...");
        fileBuffer = Buffer.from(JSON.stringify(generationInputs, null, 2));
        mimeType = "application/json";
        break;

      case "pdf":
      default:
        console.log("Generating PDF report...");
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

    const fileName = `${report.name}.${report.report_format.toLowerCase()}`;
    console.log("Report download prepared:", fileName);
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
