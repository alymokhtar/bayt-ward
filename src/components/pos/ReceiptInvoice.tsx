import { formatCurrency, formatDateTime, formatNumber, getPaymentMethodLabel } from "@/lib/utils";

export type ReceiptItem = {
  name: string;
  size: string;
  color: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

export type ReceiptData = {
  invoiceNumber: string;
  createdAt: Date;
  storeNameAr: string;
  storePhone?: string;
  currencySymbol: string;
  cashierName: string;
  customerName?: string;
  customerPhone?: string;
  paymentMethod: string;
  items: ReceiptItem[];
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  changeAmount: number;
  notes?: string;
};

function formatReceiptDateTime(date: Date) {
  return formatDateTime(date);
}

function DashedLine() {
  return (
    <div
      className="my-2 border-t border-dashed border-black/70"
      aria-hidden
    />
  );
}

export default function ReceiptInvoice({ data }: { data: ReceiptData }) {
  const fmt = (amount: number) => formatCurrency(amount, data.currencySymbol);

  return (
    <div className="pos-receipt-print mx-auto w-full max-w-[80mm] bg-white px-3 py-4 text-black font-mono text-[11px] leading-relaxed">
      <div className="text-center">
        <h1 className="text-base font-bold tracking-wide">{data.storeNameAr}</h1>
        {data.storePhone && (
          <p className="mt-1" dir="ltr">
            ت: {data.storePhone}
          </p>
        )}
      </div>

      <DashedLine />

      <div className="space-y-0.5 text-center">
        <p className="font-bold">فاتورة بيع</p>
        <p dir="ltr">{data.invoiceNumber}</p>
        <p>{formatReceiptDateTime(data.createdAt)}</p>
      </div>

      <DashedLine />

      <div className="space-y-0.5">
        <div className="flex justify-between gap-2">
          <span>الكاشير:</span>
          <span className="font-semibold">{data.cashierName}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span>العميل:</span>
          <span className="font-semibold">
            {data.customerName || "عميل نقدي"}
          </span>
        </div>
        {data.customerPhone && (
          <div className="flex justify-between gap-2">
            <span>الهاتف:</span>
            <span dir="ltr">{data.customerPhone}</span>
          </div>
        )}
      </div>

      <DashedLine />

      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-2 gap-y-1 font-bold text-[10px]">
        <span>الصنف</span>
        <span className="text-center">ك</span>
        <span className="text-end">السعر</span>
        <span className="text-end">الإجمالي</span>
      </div>

      <DashedLine />

      <div className="space-y-2">
        {data.items.map((item, index) => (
          <div key={index}>
            <p className="font-semibold break-words">{item.name}</p>
            {(item.size || item.color) && (
              <p className="text-[10px] text-black/70">
                {[item.size, item.color].filter(Boolean).join(" / ")}
              </p>
            )}
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-2 mt-0.5">
              <span />
              <span className="text-center">{item.quantity}</span>
              <span className="text-end" dir="ltr">
                {formatNumber(item.unitPrice)}
              </span>
              <span className="text-end font-semibold" dir="ltr">
                {formatNumber(item.totalPrice)}
              </span>
            </div>
          </div>
        ))}
      </div>

      <DashedLine />

      <div className="space-y-1">
        <div className="flex justify-between gap-2">
          <span>المجموع</span>
          <span dir="ltr">{fmt(data.subtotal)}</span>
        </div>
        {data.discountAmount > 0 && (
          <div className="flex justify-between gap-2">
            <span>الخصم</span>
            <span dir="ltr">- {fmt(data.discountAmount)}</span>
          </div>
        )}
        <div className="flex justify-between gap-2 text-sm font-bold">
          <span>الإجمالي</span>
          <span dir="ltr">{fmt(data.totalAmount)}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span>المدفوع</span>
          <span dir="ltr">{fmt(data.paidAmount)}</span>
        </div>
        {data.changeAmount > 0 && (
          <div className="flex justify-between gap-2 font-semibold">
            <span>الباقي</span>
            <span dir="ltr">{fmt(data.changeAmount)}</span>
          </div>
        )}
        <div className="flex justify-between gap-2">
          <span>طريقة الدفع</span>
          <span>{getPaymentMethodLabel(data.paymentMethod)}</span>
        </div>
      </div>

      {data.notes && (
        <>
          <DashedLine />
          <p className="break-words">ملاحظات: {data.notes}</p>
        </>
      )}

      <DashedLine />

      <div className="text-center space-y-1 pt-1">
        <p className="font-bold">شكراً لزيارتكم</p>
        <p className="text-[10px]">نتمنى لكم يوماً سعيداً</p>
        <p className="text-[9px] text-black/60 mt-2">*** نهاية الفاتورة ***</p>
      </div>
    </div>
  );
}
