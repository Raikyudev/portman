import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import Watchlist from "@/models/Watchlist";
import { NextResponse } from "next/server";
import { z } from "zod";

const watchlistSchema = z.object({
  asset_id: z.string(),
});

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "Asset ID is required" },
      { status: 400 },
    );
  }

  await dbConnect();

  const isInWatchlist = await Watchlist.findOne({
    user_id: (session.user as { id: string }).id,
    asset_id: id,
  });

  return NextResponse.json({ inWatchlist: !!isInWatchlist });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const body = await request.json();
  const result = watchlistSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.format() }, { status: 400 });
  }

  await dbConnect();

  const existingWatchlist = await Watchlist.findOne({
    user_id: (session.user as { id: string }).id,
    asset_id: result.data.asset_id,
  });

  if (existingWatchlist) {
    return NextResponse.json(
      { error: "Asset already in watchlist" },
      { status: 400 },
    );
  }

  const newWatchlistAsset = new Watchlist({
    user_id: (session.user as { id: string }).id,
    asset_id: result.data.asset_id,
  });

  await newWatchlistAsset.save();

  return NextResponse.json(
    { message: `Added asset to the watchlist.` },
    { status: 201 },
  );
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "Asset ID is required " },
      { status: 400 },
    );
  }

  await dbConnect();

  const removedWatchlist = await Watchlist.findOneAndDelete({
    user_id: (session.user as { id: string }).id,
    asset_id: id,
  });

  if (!removedWatchlist) {
    return NextResponse.json(
      { error: "Asset not found in watchlist" },
      { status: 404 },
    );
  }

  return NextResponse.json(
    { message: "Removed from watchlist" },
    { status: 200 },
  );
}
