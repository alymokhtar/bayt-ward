import { prisma } from "@/lib/prisma";
import { sendTelegramMessage } from "@/lib/telegram";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getEgyptDayBounds(date = new Date()) {
  const now = new Date(
    date.toLocaleString("en-US", { timeZone: "Africa/Cairo" })
  );
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  const cronSecret = process.env.CRON_SECRET?.trim();

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { start, end } = getEgyptDayBounds();

  const [salesAgg, expensesAgg] = await Promise.all([
    prisma.sale.aggregate({
      where: {
        status: "COMPLETED",
        createdAt: { gte: start, lt: end },
      },
      _sum: { totalAmount: true },
      _count: true,
    }),
    prisma.expense.aggregate({
      where: {
        expenseDate: { gte: start, lt: end },
      },
      _sum: { amount: true },
    }),
  ]);

  const totalSales = salesAgg._sum.totalAmount ?? 0;
  const invoicesCount = salesAgg._count;
  const totalExpenses = expensesAgg._sum.amount ?? 0;
  const netProfit = totalSales - totalExpenses;

  const egyptDate = new Date().toLocaleString("ar-EG", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const message = [
    "📊 ملخص اليوم",
    "",
    `إجمالي المبيعات: ${formatCurrency(totalSales)}`,
    `عدد الفواتير: ${invoicesCount}`,
    `إجمالي المصروفات: ${formatCurrency(totalExpenses)}`,
    `صافي الربح: ${formatCurrency(netProfit)}`,
    "",
    `التاريخ: ${egyptDate}`,
  ].join("\n");

  await sendTelegramMessage(message);

  return new Response(JSON.stringify({
    success: true,
    data: {
      totalSales,
      invoicesCount,
      totalExpenses,
      netProfit,
    },
  }), {
    headers: { "Content-Type": "application/json" },
  });
}
