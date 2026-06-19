import {
  formatDailySummaryMessage,
  getDailySummary,
} from "@/lib/daily-summary";
import { getSession } from "@/lib/auth";
import { clearSessionCookie } from "@/lib/session-cookie";
import { sendTelegramMessage } from "@/lib/telegram";
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
  try {
    const session = await getSession();

    if (session) {
      const summary = await getDailySummary();
      await sendTelegramMessage(
        formatDailySummaryMessage(summary, "📊 ملخص اليوم عند تسجيل الخروج", [
          `اسم المستخدم: ${session.name}`,
        ])
      );
    }
  } catch (error) {
    console.error("Logout daily summary notification failed", error);
  }

  return clearSession(NextResponse.json({ success: true }));
}
