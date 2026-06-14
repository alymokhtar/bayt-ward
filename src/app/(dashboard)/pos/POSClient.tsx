"use client";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import ReceiptModal from "@/components/pos/ReceiptModal";
import type { ReceiptData } from "@/components/pos/ReceiptInvoice";
import { createSale } from "@/lib/actions/sales";
import { createCustomer, searchCustomers } from "@/lib/actions/customers";
import { searchVariants } from "@/lib/actions/products";
import { PAYMENT_METHODS } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import { buildWhatsAppMessage, openWhatsApp } from "@/lib/whatsapp";
import {
  Minus,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  User,
  UserPlus,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type VariantResult = Awaited<ReturnType<typeof searchVariants>>[number];
type CustomerResult = Awaited<ReturnType<typeof searchCustomers>>[number];

interface CartItem {
  variant: VariantResult;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
}

interface POSClientProps {
  storeNameAr?: string;
  storePhone?: string;
  currencySymbol?: string;
}

export default function POSClient({
  storeNameAr = "بيت ورد",
  storePhone,
  currencySymbol = "ج.م",
}: POSClientProps) {
  const searchRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<VariantResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paidAmount, setPaidAmount] = useState("");
  const [notes, setNotes] = useState("");

  const [customerQuery, setCustomerQuery] = useState("");
  const [customerResults, setCustomerResults] = useState<CustomerResult[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerResult | null>(null);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  const subtotal = cart.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity - item.discountAmount,
    0
  );
  const percentDiscount = (subtotal * discountPercent) / 100;
  const totalDiscount = discountAmount + percentDiscount;
  const totalAmount = Math.max(0, subtotal - totalDiscount);
  const paid = parseFloat(paidAmount) || 0;
  const changeAmount = Math.max(0, paid - totalAmount);

  function looksLikePhoneNumber(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return false;
    const digits = trimmed.replace(/\D/g, "");
    return digits.length >= 7;
  }

  function openNewCustomerForm() {
    const query = customerQuery.trim();
    setNewCustomerName("");
    setNewCustomerPhone(looksLikePhoneNumber(query) ? query : "");
    setCustomerQuery("");
    setCustomerResults([]);
    setShowNewCustomer(true);
  }

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    const data = await searchVariants(q);
    setResults(data);
    setSearching(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => doSearch(query), 300);
    return () => clearTimeout(timer);
  }, [query, doSearch]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!customerQuery.trim()) {
        setCustomerResults([]);
        return;
      }
      const data = await searchCustomers(customerQuery);
      setCustomerResults(data);
    }, 300);
    return () => clearTimeout(timer);
  }, [customerQuery]);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  function addToCart(variant: VariantResult) {
    setCart((prev) => {
      const existing = prev.find((i) => i.variant.id === variant.id);
      if (existing) {
        if (existing.quantity >= variant.stockQuantity) return prev;
        return prev.map((i) =>
          i.variant.id === variant.id
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [
        ...prev,
        { variant, quantity: 1, unitPrice: variant.sellingPrice, discountAmount: 0 },
      ];
    });
    setQuery("");
    setResults([]);
    searchRef.current?.focus();
  }

  function updateQuantity(variantId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.variant.id !== variantId) return item;
          const newQty = item.quantity + delta;
          if (newQty <= 0) return null;
          if (newQty > item.variant.stockQuantity) return item;
          return { ...item, quantity: newQty };
        })
        .filter(Boolean) as CartItem[]
    );
  }

  function removeItem(variantId: string) {
    setCart((prev) => prev.filter((i) => i.variant.id !== variantId));
  }

  async function handleCreateCustomer() {
    const result = await createCustomer({
      name: newCustomerName,
      phone: newCustomerPhone,
    });
    if (result.success && result.data) {
      setSelectedCustomer(result.data);
      setShowNewCustomer(false);
      setNewCustomerName("");
      setNewCustomerPhone("");
      setCustomerQuery("");
      setCustomerResults([]);
    } else {
      setError(result.success ? "حدث خطأ" : (result.error ?? "حدث خطأ"));
    }
  }

  async function handleCompleteSale() {
    setError("");
    setSuccess("");
    if (cart.length === 0) {
      setError("أضف منتجات إلى السلة أولاً");
      return;
    }
    if (paid < totalAmount) {
      setError("المبلغ المدفوع أقل من الإجمالي");
      return;
    }

    setLoading(true);
    const result = await createSale({
      customerId: selectedCustomer?.id,
      items: cart.map((item) => ({
        variantId: item.variant.id,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountAmount: item.discountAmount,
        totalPrice:
          item.unitPrice * item.quantity - item.discountAmount,
      })),
      subtotal,
      discountAmount: totalDiscount,
      discountPercent,
      totalAmount,
      paidAmount: paid,
      changeAmount,
      paymentMethod: paymentMethod as "CASH" | "CARD" | "TRANSFER" | "MIXED",
      notes: notes || undefined,
    });

    setLoading(false);

    if (result.success && result.data) {
      const customer = selectedCustomer;
      const invoiceNumber = result.data.invoiceNumber;
      const saleTotal = totalAmount;
      const soldItems = [...cart];

      const receiptData: ReceiptData = {
        invoiceNumber,
        createdAt: new Date(),
        storeNameAr,
        storePhone,
        currencySymbol,
        cashierName: result.data.user.name,
        customerName: customer?.name,
        customerPhone: customer?.phone,
        paymentMethod,
        items: soldItems.map((item) => ({
          name: item.variant.product.nameAr || item.variant.product.name,
          size: item.variant.size,
          color: item.variant.color,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice:
            item.unitPrice * item.quantity - item.discountAmount,
        })),
        subtotal,
        discountAmount: totalDiscount,
        totalAmount: saleTotal,
        paidAmount: paid,
        changeAmount,
        notes: notes || undefined,
      };

      setReceipt(receiptData);
      setSuccess(`تمت العملية بنجاح — ${invoiceNumber}`);
      setCart([]);
      setDiscountPercent(0);
      setDiscountAmount(0);
      setPaidAmount("");
      setNotes("");
      setSelectedCustomer(null);

      if (customer?.phone) {
        const itemsText = soldItems
          .map(
            (item) =>
              `• ${item.variant.product.nameAr || item.variant.product.name} × ${item.quantity}`
          )
          .join("\n");
        const message = buildWhatsAppMessage("sale_receipt", {
          storeNameAr,
          customerName: customer.name,
          invoiceNumber,
          totalAmount: saleTotal,
          currencySymbol,
          items: itemsText,
        });
        if (confirm("هل تريد إرسال الفاتورة للعميل عبر واتساب؟")) {
          openWhatsApp(customer.phone, message);
        }
      }
    } else {
      setError(result.success ? "حدث خطأ" : (result.error ?? "حدث خطأ"));
    }
  }

  function handleCloseReceipt() {
    setReceipt(null);
    setSuccess("");
    searchRef.current?.focus();
  }

  return (
    <>
      <ReceiptModal receipt={receipt} onClose={handleCloseReceipt} />
      <div className="grid gap-6 lg:grid-cols-5 min-h-[calc(100vh-10rem)] md:min-h-[calc(100vh-8rem)]">
      <div className="lg:col-span-3 flex flex-col gap-4 min-h-0">
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted" />
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث بالباركود أو SKU أو اسم المنتج..."
            className="w-full h-12 rounded-xl border border-border bg-white ps-10 pe-4 text-brown focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold"
          />
        </div>

        <div className="flex-1 overflow-y-auto rounded-xl border border-border bg-white">
          {searching ? (
            <p className="p-6 text-center text-muted">جاري البحث...</p>
          ) : results.length > 0 ? (
            <ul className="divide-y divide-border">
              {results.map((v) => (
                <li key={v.id}>
                  <button
                    type="button"
                    onClick={() => addToCart(v)}
                    disabled={v.stockQuantity <= 0}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-gold/5 transition-colors text-start disabled:opacity-50"
                  >
                    <div>
                      <p className="font-medium text-brown">
                        {v.product.nameAr || v.product.name}
                      </p>
                      <p className="text-xs text-muted mt-0.5">
                        {v.sku} · {v.size} · {v.color}
                      </p>
                    </div>
                    <div className="text-end shrink-0 ms-4">
                      <p className="font-semibold text-gold">
                        {formatCurrency(v.sellingPrice)}
                      </p>
                      <p className="text-xs text-muted">متوفر: {v.stockQuantity}</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : query ? (
            <p className="p-6 text-center text-muted">لا توجد نتائج</p>
          ) : (
            <p className="p-6 text-center text-muted">
              ابدأ بالبحث عن منتج لإضافته
            </p>
          )}
        </div>
      </div>

      <div className="lg:col-span-2 flex flex-col rounded-xl border border-border bg-white min-h-0">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <ShoppingCart className="h-5 w-5 text-gold" />
          <h2 className="font-semibold text-brown">سلة المشتريات</h2>
          <span className="ms-auto text-sm text-muted">{cart.length} منتج</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <p className="text-center text-muted py-8">السلة فارغة</p>
          ) : (
            cart.map((item) => (
              <div
                key={item.variant.id}
                className="rounded-lg border border-border p-3 space-y-2"
              >
                <div className="flex justify-between gap-2">
                  <p className="text-sm font-medium text-brown leading-snug">
                    {item.variant.product.nameAr || item.variant.product.name}
                  </p>
                  <button
                    type="button"
                    onClick={() => removeItem(item.variant.id)}
                    className="text-danger hover:bg-red-50 p-1 rounded"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-xs text-muted">
                  {item.variant.size} · {item.variant.color}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => updateQuantity(item.variant.id, -1)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-8 text-center font-medium">
                      {item.quantity}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => updateQuantity(item.variant.id, 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <span className="font-semibold text-gold">
                    {formatCurrency(
                      item.unitPrice * item.quantity - item.discountAmount
                    )}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-border p-4 space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted" />
              <span className="text-sm font-medium text-brown">العميل</span>
            </div>
            {selectedCustomer ? (
              <div className="flex items-center justify-between rounded-lg bg-cream-dark/50 px-3 py-2">
                <span className="text-sm">{selectedCustomer.name}</span>
                <button
                  type="button"
                  onClick={() => setSelectedCustomer(null)}
                  className="text-xs text-danger"
                >
                  إزالة
                </button>
              </div>
            ) : showNewCustomer ? (
              <div className="space-y-2">
                <Input
                  label="الاسم"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  autoFocus={!!newCustomerPhone}
                />
                <Input
                  label="الهاتف"
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                  dir="ltr"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleCreateCustomer}>
                    حفظ
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowNewCustomer(false)}
                  >
                    إلغاء
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  value={customerQuery}
                  onChange={(e) => setCustomerQuery(e.target.value)}
                  placeholder="ابحث بالاسم أو رقم الهاتف..."
                  className="w-full h-9 rounded-lg border border-border px-3 text-sm"
                />
                {customerQuery.trim() && customerResults.length === 0 && (
                  <p className="text-xs text-muted">
                    لم يُعثر على عميل — يمكنك إضافة عميل جديد
                  </p>
                )}
                {customerResults.length > 0 && (
                  <ul className="border border-border rounded-lg divide-y max-h-32 overflow-y-auto">
                    {customerResults.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCustomer(c);
                            setCustomerQuery("");
                            setCustomerResults([]);
                          }}
                          className="w-full px-3 py-2 text-sm text-start hover:bg-gold/5"
                        >
                          {c.name} — {c.phone}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={openNewCustomerForm}
                >
                  <UserPlus className="h-4 w-4" />
                  عميل جديد
                </Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Input
              label="خصم %"
              type="number"
              min={0}
              max={100}
              value={discountPercent || ""}
              onChange={(e) =>
                setDiscountPercent(parseFloat(e.target.value) || 0)
              }
            />
            <Input
              label="خصم مبلغ"
              type="number"
              min={0}
              value={discountAmount || ""}
              onChange={(e) =>
                setDiscountAmount(parseFloat(e.target.value) || 0)
              }
            />
          </div>

          <Select
            label="طريقة الدفع"
            options={PAYMENT_METHODS}
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
          />

          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">المجموع الفرعي</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {totalDiscount > 0 && (
              <div className="flex justify-between text-danger">
                <span>الخصم</span>
                <span>- {formatCurrency(totalDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold text-brown pt-1 border-t border-border">
              <span>الإجمالي</span>
              <span className="text-gold">{formatCurrency(totalAmount)}</span>
            </div>
          </div>

          <Input
            label="المبلغ المدفوع"
            type="number"
            min={0}
            value={paidAmount}
            onChange={(e) => setPaidAmount(e.target.value)}
            dir="ltr"
          />
          {paid >= totalAmount && totalAmount > 0 && (
            <p className="text-sm text-success font-medium">
              الباقي: {formatCurrency(changeAmount)}
            </p>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-danger">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-success">
              {success}
            </div>
          )}

          <Button
            className="w-full"
            size="lg"
            loading={loading}
            disabled={cart.length === 0}
            onClick={handleCompleteSale}
          >
            إتمام البيع
          </Button>
        </div>
      </div>
    </div>
    </>
  );
}
