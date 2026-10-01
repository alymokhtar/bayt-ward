"use client";

import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ConfirmDeleteDialog from "@/components/ui/ConfirmDeleteDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { BadgePercent, Pencil, Plus, Tag, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { deletePromotion, getPromotions, togglePromotionStatus } from "../actions";
import {
  PROMOTION_TYPES,
  type PromotionFormOptions,
  type PromotionRecord,
  type PromotionType,
  type PromotionView,
} from "../types";
import PromotionForm from "./PromotionForm";

interface PromotionsClientProps {
  promotions: PromotionRecord[];
  options: PromotionFormOptions;
}

type Notice = { message: string; error?: boolean };

const typeLabels: Record<PromotionType, string> = {
  [PROMOTION_TYPES.BUY_X_GET_Y]: "اشترِ X واحصل على Y",
  [PROMOTION_TYPES.PERCENTAGE]: "خصم نسبة مئوية",
  [PROMOTION_TYPES.FIXED_AMOUNT]: "خصم مبلغ ثابت",
};

function formatDate(date: Date | null): string {
  if (!date || !Number.isFinite(date.getTime())) return "مفتوح";
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function promotionDetails(promotion: PromotionRecord): string {
  if (promotion.type === PROMOTION_TYPES.BUY_X_GET_Y) {
    return `اشترِ ${promotion.buyQuantity ?? "—"} واحصل على ${promotion.getQuantity ?? "—"} بخصم ${promotion.discountPercent ?? 100}%`;
  }
  if (promotion.type === PROMOTION_TYPES.PERCENTAGE) {
    return `خصم ${promotion.discountPercent ?? "—"}% على السلة`;
  }
  return `خصم ${promotion.discountAmount ?? "—"} على السلة`;
}

function PromotionTypeBadge({ type }: { type: PromotionType }) {
  const style =
    type === PROMOTION_TYPES.BUY_X_GET_Y
      ? "border-orange-200 bg-orange-100 text-orange-800"
      : type === PROMOTION_TYPES.PERCENTAGE
        ? "border-sky-200 bg-sky-100 text-sky-800"
        : "border-green-200 bg-green-100 text-green-800";

  return (
    <span className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${style}`}>
      {type === PROMOTION_TYPES.BUY_X_GET_Y ? <Tag className="h-3.5 w-3.5" /> : <BadgePercent className="h-3.5 w-3.5" />}
      <span>{typeLabels[type]}</span>
    </span>
  );
}

export default function PromotionsClient({ promotions, options }: PromotionsClientProps) {
  const [promotionRows, setPromotionRows] = useState(promotions);
  const [view, setView] = useState<PromotionView>("current");
  const [loadingList, setLoadingList] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PromotionRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PromotionRecord | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  async function refreshRows(nextView = view) {
    setLoadingList(true);
    try {
      const rows = await getPromotions(nextView);
      setPromotionRows(rows);
      setView(nextView);
    } catch {
      setNotice({ message: "تعذر تحميل العروض. حاولي مرة أخرى", error: true });
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(promotion: PromotionRecord) {
    setEditing(promotion);
    setFormOpen(true);
  }

  function handleSaved(message: string) {
    setFormOpen(false);
    setEditing(null);
    setNotice({ message });
    void refreshRows();
  }

  async function handleToggle(promotion: PromotionRecord) {
    setPendingId(promotion.id);
    const result = await togglePromotionStatus(promotion.id);
    setPendingId(null);

    if (!result.success) {
      setNotice({ message: result.error, error: true });
      return;
    }

    setNotice({ message: promotion.isActive ? "تم إيقاف العرض" : "تم تفعيل العرض" });
    setPromotionRows((current) => current.map((row) =>
      row.id === promotion.id ? { ...row, isActive: !promotion.isActive } : row,
    ));
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setPendingId(deleteTarget.id);
    const result = await deletePromotion(deleteTarget.id);
    setPendingId(null);

    if (!result.success) {
      setNotice({ message: result.error, error: true });
      return;
    }

    setDeleteTarget(null);
    setNotice({ message: "تم حذف العرض" });
    setPromotionRows((current) => current.filter((row) => row.id !== deleteTarget.id));
  }

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="تصفية العروض"
          className="inline-flex rounded-lg border border-border bg-cream-dark/40 p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={view === "current"}
            disabled={loadingList}
            onClick={() => void refreshRows("current")}
            className={`min-h-9 rounded-md px-3 text-sm font-medium transition ${view === "current" ? "bg-white text-brown shadow-sm" : "text-muted hover:text-brown"} disabled:opacity-50`}
          >
            العروض الحالية
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === "expired"}
            disabled={loadingList}
            onClick={() => void refreshRows("expired")}
            className={`min-h-9 rounded-md px-3 text-sm font-medium transition ${view === "expired" ? "bg-white text-brown shadow-sm" : "text-muted hover:text-brown"} disabled:opacity-50`}
          >
            أرشيف العروض المنتهية
          </button>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted">{promotionRows.length} عرض</p>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          عرض جديد
        </Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>اسم العرض ووصفه</TableHead>
            <TableHead>نوع العرض</TableHead>
            <TableHead>التفاصيل</TableHead>
            <TableHead>فترة الصلاحية</TableHead>
            <TableHead>الحالة</TableHead>
            <TableHead>الإجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {promotionRows.length === 0 ? (
            <TableRow>
              <td colSpan={6} className="p-2 py-12 text-center text-muted md:p-3">
                {loadingList
                  ? "جاري تحميل العروض..."
                  : view === "expired"
                    ? "لا توجد عروض منتهية في الأرشيف"
                    : "لا توجد عروض حالية أو قادمة"}
              </td>
            </TableRow>
          ) : (
            promotionRows.map((promotion) => (
              <TableRow key={promotion.id}>
                <TableCell className="min-w-44">
                  <p className="font-semibold text-brown">{promotion.name}</p>
                  {promotion.description && (
                    <p className="mt-1 max-w-xs whitespace-normal text-xs leading-5 text-muted">
                      {promotion.description}
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  <PromotionTypeBadge type={promotion.type} />
                </TableCell>
                <TableCell className="min-w-52 whitespace-normal text-sm">
                  {promotionDetails(promotion)}
                  {promotion.minOrderAmount != null && promotion.type !== PROMOTION_TYPES.BUY_X_GET_Y && (
                    <p className="mt-1 text-xs text-muted">
                      الحد الأدنى: {promotion.minOrderAmount}
                    </p>
                  )}
                  {(promotion.categories.length > 0 || promotion.products.length > 0) && (
                    <p className="mt-1 text-xs text-muted">
                      يشمل {promotion.categories.length + promotion.products.length} استهدافات
                    </p>
                  )}
                </TableCell>
                <TableCell className="min-w-40 text-xs leading-5">
                  <span className="block">من {formatDate(promotion.startDate)}</span>
                  <span className="block">إلى {formatDate(promotion.endDate)}</span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={promotion.isActive}
                      aria-label={`${promotion.isActive ? "إيقاف" : "تفعيل"} ${promotion.name}`}
                      disabled={pendingId === promotion.id}
                      onClick={() => void handleToggle(promotion)}
                      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 disabled:opacity-50 ${promotion.isActive ? "bg-green-600" : "bg-stone-300"}`}
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${promotion.isActive ? "right-0.5" : "right-[22px]"}`}
                      />
                    </button>
                    <Badge variant={promotion.isActive ? "success" : "default"}>
                      {promotion.isActive ? "مفعل" : "معطل"}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`تعديل ${promotion.name}`}
                      title="تعديل"
                      onClick={() => openEdit(promotion)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`حذف ${promotion.name}`}
                      title="حذف"
                      onClick={() => setDeleteTarget(promotion)}
                    >
                      <Trash2 className="h-4 w-4 text-danger" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {notice && (
        <div
          role={notice.error ? "alert" : "status"}
          aria-live={notice.error ? "assertive" : "polite"}
          className={`fixed inset-x-4 top-4 z-[70] mx-auto max-w-md rounded-lg border px-4 py-3 text-sm shadow-lg md:inset-x-auto md:end-6 ${notice.error ? "border-red-200 bg-red-50 text-red-800" : "border-green-200 bg-green-50 text-green-800"}`}
        >
          {notice.message}
        </div>
      )}

      {formOpen && (
        <PromotionForm
          key={editing?.id ?? "new"}
          isOpen={formOpen}
          promotion={editing}
          options={options}
          onClose={() => setFormOpen(false)}
          onSaved={handleSaved}
        />
      )}

      <ConfirmDeleteDialog
        isOpen={!!deleteTarget}
        onClose={() => {
          if (pendingId !== deleteTarget?.id) setDeleteTarget(null);
        }}
        onConfirm={handleDelete}
        title="حذف العرض"
        description="سيؤدي هذا الإجراء إلى حذف العرض نهائياً وإزالة ارتباطاته بالأقسام والمنتجات."
        itemName={deleteTarget?.name}
        confirmLabel="حذف العرض"
        loading={pendingId === deleteTarget?.id}
      />
    </div>
  );
}