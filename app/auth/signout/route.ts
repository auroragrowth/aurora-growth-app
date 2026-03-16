import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const headerStore = await headers();
  const forwardedProto = headerStore.get("x-forwarded-proto");
  const forwardedHost = headerStore.get("x-forwarded-host");
  const host = headerStore.get("host");
  const referer = headerStore.get("referer");

  let baseUrl = "";

  if (referer) {
    try {
      const refUrl = new URL(referer);
      baseUrl = refUrl.origin;
    } catch {}
  }

  if (!baseUrl && forwardedHost) {
    baseUrl = `${forwardedProto || "https"}://${forwardedHost}`;
  }

  if (!baseUrl && host) {
    const isLocal =
      host.includes("localhost") ||
      host.startsWith("127.0.0.1") ||
      host.endsWith(":3000") ||
      host.endsWith(":3001");

    if (isLocal) {
      baseUrl = "https://dev.auroragrowth.co.uk";
    } else {
      baseUrl = `${forwardedProto || "https"}://${host}`;
    }
  }

  if (!baseUrl) {
    baseUrl = "https://dev.auroragrowth.co.uk";
  }

  return NextResponse.redirect(`${baseUrl}/login`, { status: 303 });
}
