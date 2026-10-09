"use client";

import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ConfirmDeleteDialog from "@/components/ui/ConfirmDeleteDialog";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Select from "@/components/ui/Select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import {
  createCoupon,
  deleteCoupon,
  getCoupons,
  toggleCouponStatus,
  updateCoupon,
} from "../actions";
import type { CouponInput, CouponRecord, CouponType } from "../types";
import { getCairoDateString } from "@/lib/promotion-date";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

type Notice = { message: string; error?: boolean };

function dateInputValue(value: Date | null): string {
  return value && Number.isFinite(value.getTime()) ? getCairoDateString(value) : "";
}

function CouponForm({
  coupon,
  onClose,
  onSaved,
}: {
  coupon: CouponRecord | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [code, setCode] = useState(coupon?.code ?? "");
  const [type, setType] = useState<CouponType>(coupon?.type ?? "PERCENTAGE");
  const [discountPercent, setDiscountPercent] = useState(coupon?.discountPercent?.toString() ?? "");
  const [discountAmount, setDiscountAmount] = useState(coupon?.discountAmount?.toString() ?? "");
  const [minOrderAmount, setMinOrderAmount] = useState(coupon?.minOrderAmount?.toString() ?? "");
  const [usageLimit, setUsageLimit] = useState(coupon?.usageLimit?.toString() ?? "");
  const [expiresAt, setExpiresAt] = useState(dateInputValue(coupon?.expiresAt ?? null));
  const [isActive, setIsActive] = useState(coupon?.isActive ?? true);
  const [stackable, setStackable] = useState(coupon?.stackable ?? false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function optionalNumber(value: string): number | null {
    return value.trim() ? Number(value) : null;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const input: CouponInput = {
      code,
      type,
      discountPercent: type === "PERCENTAGE" ? optionalNumber(discountPercent) : null,
      discountAmount: type === "FIXED_AMOUNT" ? optionalNumber(discountAmount) : null,
      minOrderAmount: optionalNumber(minOrderAmount),
      usageLimit: optionalNumber(usageLimit),
      expiresAt,
      isActive,
      stackable,
    };

    try {
      const result = coupon
        ? await updateCoupon(coupon.id, input)
        : await createCoupon(input);
      if (result.success) {
        onSaved(coupon ? "تم تحديث الكوبون" : "تم إنشاء الكوبون");
      } else {
        setError(result.error);
      }
    } catch {
      setError("تعذر حفظ الكوبون. حاول مرة أخرى");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      isOpen
      onClose={() => { if (!loading) onClose(); }}
      title={coupon ? "تعديل الكوبون" : "كوبون جديد"}
      description="حدد قيمة الكوبون وصلاحيته وحد الاستخدام"
      size="lg"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>إلغاء</Button>
          <Button type="submit" form="coupon-form" loading={loading}>
            {coupon ? "حفظ التعديلات" : "إنشاء الكوبون"}
          </Button>
        </>
      }
    >
      <form id="coupon-form" onSubmit={handleSubmit} className="space-y-4" dir="rtl">
        {error && <p role="alert" className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-800">{error}</p>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="رمز الكوبون" value={code} onChange={(event) => setCode(event.target.value)} maxLength={40} required dir="ltr" />
          <Select
            label="نوع الخصم"
            value={type}
            onChange={(event) => setType(event.target.value as CouponType)}
            options={[
              { value: "PERCENTAGE", label: "نسبة مئوية" },
              { value: "FIXED_AMOUNT", label: "مبلغ ثابت" },
            ]}
          />
          {type === "PERCENTAGE" ? (
            <Input label="نسبة الخصم (%)" type="number" min={0.01} max={100} step={0.01} value={discountPercent} onChange={(event) => setDiscountPercent(event.target.value)} required />
          ) : (
            <Input label="قيمة الخصم" type="number" min={0.01} step={0.01} value={discountAmount} onChange={(event) => setDiscountAmount(event.target.value)} required />
          )}
          <Input label="الحد الأدنى للطلب (اختياري)" type="number" min={0} step={0.01} value={minOrderAmount} onChange={(event) => setMinOrderAmount(event.target.value)} />
          <Input label="حد الاستخدام (اختياري)" type="number" min={1} step={1} value={usageLimit} onChange={(event) => setUsageLimit(event.target.value)} />
          <Input label="تاريخ الانتهاء (اختياري)" type="date" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} />
        </div>
        <label className="flex items-center gap-2 text-sm text-brown">
          <input type="checkbox" checked={stackable} onChange={(event) => setStackable(event.target.checked)} />
          يسمح بجمعه مع العروض التلقائية
        </label>
        <label className="flex items-center gap-2 text-sm text-brown">
          <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
          الكوبون مفعل
        </label>
      </form>
    </Modal>
  );
}

export default function CouponsClient({ onBack }: { onBack: () => void }) {
  const [coupons, setCoupons] = useState<CouponRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<CouponRecord | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CouponRecord | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      setCoupons(await getCoupons());
    } catch {
      setNotice({ message: "تعذر تحميل الكوبونات", error: true });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;
    getCoupons()
      .then((rows) => {
        if (mounted) setCoupons(rows);
      })
      .catch(() => {
        if (mounted) setNotice({ message: "تعذر تحميل الكوبونات", error: true });
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  async function toggle(coupon: CouponRecord) {
    setPendingId(coupon.id);
    try {
      const result = await toggleCouponStatus(coupon.id);
      if (!result.success) {
        setNotice({ message: result.error, error: true });
        return;
      }
      setCoupons((items) => items.map((item) =>
        item.id === coupon.id ? { ...item, isActive: !item.isActive } : item
      ));
    } catch {
      setNotice({ message: "تعذر تحديث حالة الكوبون", error: true });
    } finally {
      setPendingId(null);
    }
  }

  async function remove() {
    if (!deleteTarget) return;
    setPendingId(deleteTarget.id);
    try {
      const result = await deleteCoupon(deleteTarget.id);
      if (!result.success) {
        setNotice({ message: result.error, error: true });
        return;
      }
      setCoupons((items) => items.filter((item) => item.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      setNotice({ message: "تعذر حذف الكوبون", error: true });
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="ghost" onClick={onBack}>العودة إلى العروض</Button>
        <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Plus className="h-4 w-4" /> كوبون جديد
        </Button>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الرمز</TableHead><TableHead>الخصم</TableHead><TableHead>الاستخدام</TableHead>
              <TableHead>الانتهاء</TableHead><TableHead>الحالة</TableHead><TableHead>الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {coupons.length === 0 ? (
              <TableRow><td colSpan={6} className="p-8 text-center text-muted">{loading ? "جاري التحميل..." : "لا توجد كوبونات"}</td></TableRow>
            ) : coupons.map((coupon) => (
              <TableRow key={coupon.id}>
                <TableCell className="font-mono font-semibold" dir="ltr">{coupon.code}</TableCell>
                <TableCell>{coupon.type === "PERCENTAGE" ? `${coupon.discountPercent}%` : coupon.discountAmount}</TableCell>
                <TableCell>{coupon.usageCount}{coupon.usageLimit == null ? " / ∞" : ` / ${coupon.usageLimit}`}</TableCell>
                <TableCell>{coupon.expiresAt ? dateInputValue(coupon.expiresAt) : "بدون انتهاء"}</TableCell>
                <TableCell>
                  <button type="button" disabled={pendingId === coupon.id} onClick={() => void toggle(coupon)}>
                    <Badge variant={coupon.isActive ? "success" : "default"}>{coupon.isActive ? "مفعل" : "معطل"}</Badge>
                  </button>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button type="button" variant="ghost" size="icon" aria-label={`تعديل ${coupon.code}`} onClick={() => { setEditing(coupon); setFormOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button type="button" variant="ghost" size="icon" aria-label={`حذف ${coupon.code}`} onClick={() => setDeleteTarget(coupon)}><Trash2 className="h-4 w-4 text-danger" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {notice && <p role={notice.error ? "alert" : "status"} className={notice.error ? "text-sm text-danger" : "text-sm text-green-700"}>{notice.message}</p>}
      {formOpen && (
        <CouponForm
          key={editing?.id ?? "new-coupon"}
          coupon={editing}
          onClose={() => setFormOpen(false)}
          onSaved={(message) => {
            setFormOpen(false);
            setNotice({ message });
            void refresh();
          }}
        />
      )}
      <ConfirmDeleteDialog
        isOpen={!!deleteTarget}
        onClose={() => { if (!pendingId) setDeleteTarget(null); }}
        onConfirm={remove}
        title="حذف الكوبون"
        description="يُحذف الكوبون ولا يمكن استخدامه بعد ذلك. تبقى بيانات الكود والخصم المحفوظة في الفواتير."
        itemName={deleteTarget?.code}
        confirmLabel="حذف الكوبون"
        loading={pendingId === deleteTarget?.id}
      />
    </div>
  );
}
