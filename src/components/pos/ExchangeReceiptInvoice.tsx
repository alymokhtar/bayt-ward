import { formatCurrency, formatNumber, getPaymentMethodLabel } from "@/lib/utils";

export type ExchangeReceiptLine = {
  name: string;
  size: string;
  color: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

export type ExchangeReceiptData = {
  exchangeNumber: string;
  originalInvoiceNumber: string;
  returnNumber: string;
  replacementInvoiceNumber: string;
  createdAt: Date | string;
  cashierName: string;
  customerName: string | null;
  customerPhone: string | null;
  returnedItems: ExchangeReceiptLine[];
  replacementItems: ExchangeReceiptLine[];
  refundAmount: number;
  replacementSubtotal: number;
  replacementDiscountAmount: number;
  replacementTotal: number;
  settlementBalance: number;
  settlementMethod: "CASH" | "CARD" | "WALLET" | null;
  storeNameAr?: string;
  storePhone?: string | null;
  currencySymbol?: string;
};

function formatExchangeDateTime(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return "—";

  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Cairo",
  }).format(date);
}

function DashedLine() {
  return <div className="my-2 border-t border-dashed border-black/70" aria-hidden />;
}

function ReceiptItems({
  items,
  sign,
}: {
  items: ExchangeReceiptLine[];
  sign: "-" | "+";
}) {
  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={`${item.name}-${item.size}-${item.color}-${index}`}>
          <p className="break-words font-semibold">{item.name}</p>
          {(item.size || item.color) && (
            <p className="text-[10px] text-black/70">
              {[item.size, item.color].filter(Boolean).join(" / ")}
            </p>
          )}
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-2">
            <span />
            <span className="text-center">{item.quantity}</span>
            <span className="text-end" dir="ltr">{formatNumber(item.unitPrice)}</span>
            <span className="text-end font-semibold" dir="ltr">
              {sign} {formatNumber(item.totalPrice)}
            </span>
          </div>
        </div>
      ))}
      {items.length === 0 && <p className="text-center text-black/60">لا توجد أصناف</p>}
    </div>
  );
}

export default function ExchangeReceiptInvoice({
  data,
}: {
  data: ExchangeReceiptData;
}) {
  const currencySymbol = data.currencySymbol || "ج.م";
  const fmt = (amount: number) => formatCurrency(amount, currencySymbol);
  const settlementDescription = data.settlementBalance > 0
    ? `المطلوب تحصيله: ${fmt(data.settlementBalance)}`
    : data.settlementBalance < 0
      ? `المبلغ المردود للعميل: ${fmt(Math.abs(data.settlementBalance))}`
      : "الاستبدال متكافئ — لا يوجد فرق مالي";

  return (
    <div
      className="mx-auto w-full max-w-[80mm] bg-white px-3 py-4 font-mono text-[11px] leading-relaxed text-black"
      dir="rtl"
    >
      <div className="text-center">
        <h1 className="text-base font-bold tracking-wide">{data.storeNameAr || "بيت ورد"}</h1>
        {data.storePhone && <p className="mt-1" dir="ltr">ت: {data.storePhone}</p>}
      </div>

      <DashedLine />

      <div className="space-y-0.5 text-center">
        <p className="font-bold">فاتورة استبدال</p>
        <p dir="ltr">{data.exchangeNumber}</p>
        <p>الفاتورة الأصلية: <span dir="ltr">{data.originalInvoiceNumber}</span></p>
        <p>رقم المرتجع: <span dir="ltr">{data.returnNumber}</span></p>
        <p>فاتورة البديل: <span dir="ltr">{data.replacementInvoiceNumber}</span></p>
        <p>{formatExchangeDateTime(data.createdAt)}</p>
      </div>

      <DashedLine />

      <div className="space-y-0.5">
        <div className="flex justify-between gap-2">
          <span>الكاشير:</span>
          <span className="font-semibold">{data.cashierName}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span>العميل:</span>
          <span className="font-semibold">{data.customerName || "عميل نقدي"}</span>
        </div>
        {data.customerPhone && (
          <div className="flex justify-between gap-2">
            <span>الهاتف:</span>
            <span dir="ltr">{data.customerPhone}</span>
          </div>
        )}
      </div>

      <DashedLine />

      <p className="mb-1 text-center font-bold">الأصناف المرتجعة (−)</p>
      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-2 font-bold text-[10px]">
        <span>الصنف</span><span className="text-center">ك</span><span className="text-end">السعر</span><span className="text-end">الصافي</span>
      </div>
      <ReceiptItems items={data.returnedItems} sign="-" />
      <div className="flex justify-between gap-2 font-semibold">
        <span>إجمالي المرتجع</span>
        <span dir="ltr">− {fmt(data.refundAmount)}</span>
      </div>

      <DashedLine />

      <p className="mb-1 text-center font-bold">الأصناف البديلة (+)</p>
      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-2 font-bold text-[10px]">
        <span>الصنف</span><span className="text-center">ك</span><span className="text-end">السعر</span><span className="text-end">الإجمالي</span>
      </div>
      <ReceiptItems items={data.replacementItems} sign="+" />
      <div className="space-y-0.5">
        <div className="flex justify-between gap-2">
          <span>مجموع البدائل</span><span dir="ltr">{fmt(data.replacementSubtotal)}</span>
        </div>
        {data.replacementDiscountAmount > 0 && (
          <div className="flex justify-between gap-2">
            <span>خصومات البدائل</span><span dir="ltr">− {fmt(data.replacementDiscountAmount)}</span>
          </div>
        )}
        <div className="flex justify-between gap-2 font-semibold">
          <span>صافي البدائل</span><span dir="ltr">{fmt(data.replacementTotal)}</span>
        </div>
      </div>

      <DashedLine />

      <div className="space-y-1 text-center">
        <p className="text-sm font-bold">{settlementDescription}</p>
        {data.settlementBalance !== 0 && data.settlementMethod && (
          <p>طريقة التسوية: {getPaymentMethodLabel(data.settlementMethod)}</p>
        )}
      </div>

      <DashedLine />

      <div className="space-y-1 text-center">
        <p className="font-bold">يرجى الاحتفاظ بفاتورة الاستبدال</p>
        <p className="text-[9px] text-black/60">*** نهاية الفاتورة ***</p>
      </div>
    </div>
  );
}
