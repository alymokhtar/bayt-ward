"use client";

import Button from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import type { getLoyaltyAnalytics } from "@/lib/actions/loyalty";
import { formatCurrency } from "@/lib/utils";
import { Gift, Percent, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

type LoyaltyAnalytics = Awaited<ReturnType<typeof getLoyaltyAnalytics>>;
type Preset = "today" | "week" | "month" | "custom";

const PRESETS: { value: Exclude<Preset, "custom">; label: string }[] = [
  { value: "today", label: "اليوم" },
  { value: "week", label: "آخر 7 أيام" },
  { value: "month", label: "هذا الشهر" },
];

function getTodayDateKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function getPresetRange(preset: Exclude<Preset, "custom">) {
  const to = getTodayDateKey();
  if (preset === "today") return { from: to, to };
  if (preset === "month") return { from: `${to.slice(0, 7)}-01`, to };

  const start = new Date(`${to}T00:00:00.000Z`);
  start.setUTCDate(start.getUTCDate() - 6);
  return { from: start.toISOString().slice(0, 10), to };
}

function MetricCard({
  title,
  value,
  icon: Icon,
  description,
  tone,
}: {
  title: string;
  value: string;
  icon: typeof Gift;
  description: string;
  tone: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3 pt-5">
        <div className="min-w-0">
          <p className="text-sm text-muted">{title}</p>
          <p className="mt-2 break-words text-2xl font-bold text-brown">{value}</p>
          <p className="mt-1 text-xs text-muted">{description}</p>
        </div>
        <span className={`rounded-xl p-2.5 ${tone}`}>
          <Icon className="h-5 w-5" />
        </span>
      </CardContent>
    </Card>
  );
}

export default function LoyaltyAnalyticsClient({
  analytics,
}: {
  analytics: LoyaltyAnalytics;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [from, setFrom] = useState(analytics.range.from);
  const [to, setTo] = useState(analytics.range.to);

  function navigate(range: { from: string; to: string }) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("from", range.from);
    params.set("to", range.to);
    startTransition(() => router.replace(`${pathname}?${params.toString()}`, { scroll: false }));
  }

  function applyPreset(preset: Exclude<Preset, "custom">) {
    const range = getPresetRange(preset);
    setFrom(range.from);
    setTo(range.to);
    navigate(range);
  }

  function applyCustomRange() {
    if (!from || !to) return;
    navigate({ from, to });
  }

  const currentPreset = PRESETS.find((preset) => {
    const range = getPresetRange(preset.value);
    return range.from === analytics.range.from && range.to === analytics.range.to;
  })?.value;

  return (
    <div className="space-y-6">
      <section aria-label="فلترة نطاق التقرير" className="space-y-3 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              disabled={isPending}
              onClick={() => applyPreset(preset.value)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                currentPreset === preset.value
                  ? "bg-gold text-primary-foreground"
                  : "border border-border text-brown hover:bg-gold/10"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="grid gap-1 text-xs text-muted">
            من
            <input
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className="h-10 rounded-lg border border-border bg-white px-3 text-sm text-brown"
            />
          </label>
          <label className="grid gap-1 text-xs text-muted">
            إلى
            <input
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className="h-10 rounded-lg border border-border bg-white px-3 text-sm text-brown"
            />
          </label>
          <Button
            type="button"
            variant="secondary"
            loading={isPending}
            disabled={!from || !to}
            onClick={applyCustomRange}
          >
            تطبيق الفترة
          </Button>
          <p className="text-xs text-muted">
            الفترة المعروضة: {analytics.range.from} — {analytics.range.to}
          </p>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          title="النقاط المكتسبة"
          value={analytics.totalEarnedPoints.toLocaleString("ar-EG-u-nu-latn")}
          icon={TrendingUp}
          description="حركات كسب النقاط خلال الفترة"
          tone="bg-green-50 text-green-700"
        />
        <MetricCard
          title="النقاط المستبدلة"
          value={analytics.totalRedeemedPoints.toLocaleString("ar-EG-u-nu-latn")}
          icon={TrendingDown}
          description="النقاط المستخدمة في الخصومات"
          tone="bg-amber-50 text-amber-700"
        />
        <MetricCard
          title="قيمة خصومات الولاء"
          value={formatCurrency(analytics.totalDiscountValue)}
          icon={Gift}
          description="على الفواتير غير الملغاة"
          tone="bg-purple-50 text-purple-700"
        />
        <MetricCard
          title="معدل الاستبدال"
          value={`${analytics.redemptionRate.toFixed(1)}%`}
          icon={Percent}
          description="المستبدل ÷ المكتسب في الفترة"
          tone="bg-blue-50 text-blue-700"
        />
        <MetricCard
          title="الرصيد المتاح حالياً"
          value={analytics.outstandingBalance.toLocaleString("ar-EG-u-nu-latn")}
          icon={Wallet}
          description="مجموع الأرصدة الموجبة لكل العملاء"
          tone="bg-gold/10 text-gold"
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>اكتساب النقاط مقابل الاستبدال</CardTitle>
          <p className="text-xs text-muted">
            تجميع {analytics.trendGranularity === "daily" ? "يومي" : "شهري"} وفق يوم العمل في القاهرة.
          </p>
        </CardHeader>
        <CardContent>
          {analytics.trend.some((point) => point.earned > 0 || point.redeemed > 0) ? (
            <div className="h-72 min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.trend} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8dcc8" />
                  <XAxis dataKey="label" tick={{ fill: "#8b7355", fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fill: "#8b7355", fontSize: 11 }} />
                  <Tooltip
                    formatter={(value, name) => [
                      Number(value ?? 0).toLocaleString("ar-EG-u-nu-latn"),
                      name === "earned" ? "مكتسبة" : "مستبدلة",
                    ]}
                    contentStyle={{ direction: "rtl", borderRadius: 8 }}
                  />
                  <Line type="monotone" dataKey="earned" name="earned" stroke="#159c8c" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="redeemed" name="redeemed" stroke="#b8860b" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center text-sm text-muted">
              لا توجد حركات نقاط خلال هذه الفترة
            </div>
          )}
          <div className="mt-3 flex flex-wrap justify-center gap-5 text-xs text-muted">
            <span className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#159c8c]" />
              نقاط مكتسبة
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#b8860b]" />
              نقاط مستبدلة
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>أكثر العملاء تفاعلاً</CardTitle>
          <p className="text-xs text-muted">
            الترتيب حسب مجموع النقاط المكتسبة والمستبدلة خلال الفترة.
          </p>
        </CardHeader>
        <CardContent>
          {analytics.topCustomers.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">
              لا توجد حركات كسب أو استبدال لعرضها
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>العميل</TableHead>
                    <TableHead>الهاتف</TableHead>
                    <TableHead>النقاط المكتسبة</TableHead>
                    <TableHead>النقاط المستبدلة</TableHead>
                    <TableHead>الرصيد الحالي</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics.topCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-medium">{customer.name}</TableCell>
                      <TableCell dir="ltr" className="text-start">{customer.phone}</TableCell>
                      <TableCell className="text-green-700">
                        {customer.earnedPoints.toLocaleString("ar-EG-u-nu-latn")}
                      </TableCell>
                      <TableCell className="text-amber-700">
                        {customer.redeemedPoints.toLocaleString("ar-EG-u-nu-latn")}
                      </TableCell>
                      <TableCell>
                        {customer.loyaltyPoints.toLocaleString("ar-EG-u-nu-latn")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
