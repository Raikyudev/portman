import { NextResponse } from "next/server";
import Report, { IReport } from "@/models/Report";
import { dbConnect } from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createGenerationInputs } from "@/lib/createGenerationInputs";
import { generatePDF } from "@/lib/reportUtils";

export async function GET(request: Request) {
  try {
    console.log("Authenticating user...");
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !(session.user as { id?: string }).id) {
      console.error("Authentication failed: Unauthorized");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url); // Parse the request URL
    const reportId = url.searchParams.get("id"); // Extract the "id" query parameter

    console.log(`Fetching report with ID: ${reportId}`);
    if (!reportId) {
      console.error("No report ID provided");
      return NextResponse.json(
        { error: "Report ID is required" },
        { status: 400 },
      );
    }

    console.log("Connecting to database...");
    await dbConnect();

    console.log(`Fetching report with ID: ${reportId}`);
    const report: IReport | null = await Report.findById(reportId);
    if (!report) {
      console.error("Report not found");
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Ensure the user has access to the report
    if (report.user_id.toString() !== (session.user as { id: string }).id) {
      console.error("Unauthorized access to report");
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Regenerate the report using createGenerationInputs
    const generationInputs = await createGenerationInputs({
      portfolio_ids: report.portfolio_ids.map((id) => id.toString()),
      report_type: report.report_type as
        | "income_report"
        | "portfolio_report"
        | "summary",
      from_date: report.generation_inputs.from_date,
      to_date: report.generation_inputs.to_date,
    });

    console.log("Generating report file...");
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
        fileBuffer = await generatePDF(generationInputs);
        mimeType = "application/pdf";
        break;
    }

    console.log("Preparing response...");
    const resolvedFileBuffer = fileBuffer;

    // Construct the filename using report.name and report.report_format
    const fileName = `${report.name}.${report.report_format.toLowerCase()}`;
    console.log("Report regenerated successfully:", fileName);
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
