import {
  formatDailySummaryMessage,
  getDailySummary,
} from "@/lib/daily-summary";
import { prisma } from "@/lib/prisma";
import { sendTelegramMessage } from "@/lib/telegram";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  const cronSecret = process.env.CRON_SECRET?.trim();

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const summary = await getDailySummary();
  const message = formatDailySummaryMessage(summary);

  await sendTelegramMessage(message);

  // Auto-clear daily discount at end of business day
  await prisma.setting.upsert({
    where: { key: "daily_discount_active" },
    update: { value: "0" },
    create: { key: "daily_discount_active", value: "0" },
  });

  return new Response(JSON.stringify({
    success: true,
    data: summary,
  }), {
    headers: { "Content-Type": "application/json" },
  });
}
