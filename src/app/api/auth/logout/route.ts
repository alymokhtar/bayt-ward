import { clearSessionCookie } from "@/lib/session-cookie";
import { NextResponse } from "next/server";

function clearSession(response: NextResponse) {
  clearSessionCookie(response);
  return response;
}

/** Clears stale session cookies after DB reset (used by layout redirects). */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const redirectTo = url.searchParams.get("redirect");

  if (redirectTo?.startsWith("/") && !redirectTo.startsWith("//")) {
    return clearSession(NextResponse.redirect(new URL(redirectTo, url.origin)));
  }

  return clearSession(NextResponse.json({ success: true }));
}

export async function POST() {
  return clearSession(NextResponse.json({ success: true }));
}
