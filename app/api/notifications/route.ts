// app/api/notifications/route.ts
import { NextResponse } from "next/server";
import { getUserByEmail, getUnreadNotifications } from "@/utils/db/actions";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");

  if (!email) return NextResponse.json([], { status: 400 });

  const user = await getUserByEmail(email);
  if (!user) return NextResponse.json([], { status: 404 });

  const notifications = await getUnreadNotifications(user.id);
  return NextResponse.json(notifications || []);
}
