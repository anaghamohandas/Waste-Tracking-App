// app/api/balance/route.ts
import { NextResponse } from "next/server";
import { getUserByEmail, getUserBalance } from "@/utils/db/actions";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");

  if (!email) return NextResponse.json({ balance: 0 }, { status: 400 });

  const user = await getUserByEmail(email);
  if (!user) return NextResponse.json({ balance: 0 }, { status: 404 });

  const balance = await getUserBalance(user.id);
  return NextResponse.json({ balance });
}
