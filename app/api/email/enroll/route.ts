import { NextResponse } from "next/server";
import { enrollLeadFlow } from "@/lib/email/enroll";

export async function POST(req: Request) {
  const { userId, email, firstName } = await req.json();

  await enrollLeadFlow({
    userId,
    email,
    firstName,
  });

  return NextResponse.json({ success: true });
}
