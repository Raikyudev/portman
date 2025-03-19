import { NextResponse } from "next/server";
import mongoose from "mongoose";
import Report, { IReport } from "@/models/Report";
import { dbConnect } from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    console.log("Authenticating user...");
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !(session.user as { id?: string }).id) {
      console.error("Authentication failed: Unauthorized");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;

    console.log("Connecting to database...");
    await dbConnect();

    // Parse query parameters for date range
    const { searchParams } = new URL(request.url);
    let fromDate = searchParams.get("fromDate");
    let toDate = searchParams.get("toDate");

    // Default to last year if no date range is provided
    const today = new Date();
    const defaultFromDate = new Date(today);
    defaultFromDate.setFullYear(today.getFullYear() - 1);

    const fromDateObj = fromDate ? new Date(fromDate) : defaultFromDate;
    const toDateObj = toDate ? new Date(toDate) : today;

    if (fromDate && isNaN(fromDateObj.getTime())) {
      console.error("Invalid fromDate:", fromDate);
      return NextResponse.json({ error: "Invalid fromDate" }, { status: 400 });
    }

    if (toDate && isNaN(toDateObj.getTime())) {
      console.error("Invalid toDate:", toDate);
      return NextResponse.json({ error: "Invalid toDate" }, { status: 400 });
    }

    if (fromDate && toDate && toDateObj < fromDateObj) {
      console.error("toDate must be after fromDate");
      return NextResponse.json(
        { error: "toDate must be after fromDate" },
        { status: 400 },
      );
    }

    console.log(
      `Fetching reports for user ${userId} from ${fromDateObj} to ${toDateObj}...`,
    );

    // Fetch and sort reports by date in descending order (most recent first)
    const reports: IReport[] = await Report.find({
      user_id: new mongoose.Types.ObjectId(userId),
      generated_at: {
        $gte: fromDateObj,
        $lte: toDateObj,
      },
    }).sort({ generated_at: -1 }); // Sort by generated_at in descending order

    // Format the reports for the frontend
    const formattedReports = reports.map((report) => {
      // For summary reports, only show the to_date
      const timePeriod =
        report.report_type === "summary"
          ? new Date(report.generation_inputs.to_date).toLocaleDateString(
              "en-GB",
            )
          : report.generation_inputs.from_date
            ? `${new Date(
                report.generation_inputs.from_date,
              ).toLocaleDateString("en-GB")} - ${new Date(
                report.generation_inputs.to_date,
              ).toLocaleDateString("en-GB")}`
            : new Date(report.generation_inputs.to_date).toLocaleDateString(
                "en-GB",
              );

      return {
        _id: report._id.toString(),
        name: report.name,
        type: report.report_type,
        dateCreated: new Date(report.generated_at).toLocaleDateString("en-GB"),
        timePeriod,
        format: report.report_format.toUpperCase(),
      };
    });

    console.log(`Found ${formattedReports.length} reports`);
    return NextResponse.json({ reports: formattedReports }, { status: 200 });
  } catch (error) {
    console.error("Error fetching reports:", error);
    return NextResponse.json(
      { error: `Error fetching reports: ${error}` },
      { status: 500 },
    );
  }
}
