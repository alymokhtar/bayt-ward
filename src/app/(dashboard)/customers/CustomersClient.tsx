"use client";

import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import ConfirmDeleteDialog from "@/components/ui/ConfirmDeleteDialog";
import { Card, CardContent } from "@/components/ui/Card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import {
  createCustomer,
  updateCustomer,
  deleteCustomer,
  issueLoyaltyCoupon,
} from "@/lib/actions/customers";
import CustomerDetailsModal from "@/app/(dashboard)/customers/CustomerDetailsModal";
import { formatCurrency } from "@/lib/utils";
import {
  DEFAULT_LOYALTY_COUPON_THRESHOLD,
  getLoyaltyCouponEligibility,
} from "@/lib/loyalty-coupon-utils";
import {
  buildLoyaltyCouponWhatsAppMessage,
  formatPhoneForWhatsApp,
  getWhatsAppUrl,
} from "@/lib/whatsapp";
import CustomerWhatsAppButton from "@/components/whatsapp/CustomerWhatsAppButton";
import PaginationNav from "@/components/ui/PaginationNav";
import { Eye, MessageCircle, Pencil, Plus, Search, Tag, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type CustomerItem = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  notes: string | null;
  totalSpent: number;
  customThreshold: number | null;
  loyaltyMilestones: Array<{ level: number }>;
  visitCount: number;
  loyaltyPoints: number;
  _count: { sales: number; returns: number };
};

interface CustomersClientProps {
  customers: CustomerItem[];
  total: number;
  page: number;
  totalPages: number;
  search?: string;
  canManage?: boolean;
}

export default function CustomersClient({
  customers,
  total,
  page,
  totalPages,
  search,
  canManage = false,
}: CustomersClientProps) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerItem | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [customThreshold, setCustomThreshold] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CustomerItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [issuingCustomerId, setIssuingCustomerId] = useState<string | null>(null);
  const [couponFeedback, setCouponFeedback] = useState<{
    customerId: string;
    message: string;
    error: boolean;
  } | null>(null);

  const hasSearch = Boolean(search?.trim());

  function openCreate() {
    setEditing(null);
    setName("");
    setPhone("");
    setEmail("");
    setAddress("");
    setNotes("");
    setCustomThreshold("");
    setError("");
    setModalOpen(true);
  }

  function openEdit(c: CustomerItem) {
    setEditing(c);
    setName(c.name);
    setPhone(c.phone);
    setEmail(c.email || "");
    setAddress(c.address || "");
    setNotes(c.notes || "");
    setCustomThreshold(c.customThreshold?.toString() ?? "");
    setError("");
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");

    try {
      const parsedCustomThreshold = customThreshold.trim()
        ? Number(customThreshold)
        : null;
      if (
        editing &&
        parsedCustomThreshold !== null &&
        !Number.isFinite(parsedCustomThreshold)
      ) {
        setError("الحد المخصص يجب أن يكون رقماً صالحاً");
        return;
      }

      const result = editing
        ? await updateCustomer(editing.id, {
            name,
            phone,
            email,
            address,
            notes,
            customThreshold: parsedCustomThreshold,
          })
        : await createCustomer({ name, phone, email, address, notes });

      if (result.success) {
        setModalOpen(false);
        router.refresh();
      } else {
        setError(result.error ?? "حدث خطأ");
      }
    } catch {
      setError("تعذر حفظ بيانات العميل بسبب مشكلة في الاتصال. حاول مرة أخرى.");
    } finally {
      setLoading(false);
    }
  }

  async function handleIssueLoyaltyCoupon(customer: CustomerItem) {
    if (issuingCustomerId) return;
    if (!formatPhoneForWhatsApp(customer.phone)) {
      setCouponFeedback({
        customerId: customer.id,
        message: "رقم هاتف العميل غير صالح لفتح واتساب.",
        error: true,
      });
      return;
    }

    const whatsappWindow = window.open("about:blank", "_blank");
    if (!whatsappWindow) {
      setCouponFeedback({
        customerId: customer.id,
        message: "اسمح بفتح النوافذ المنبثقة لإصدار الكوبون وفتح رسالة واتساب.",
        error: true,
      });
      return;
    }
    whatsappWindow.opener = null;
    setIssuingCustomerId(customer.id);
    setCouponFeedback(null);

    try {
      const result = await issueLoyaltyCoupon(customer.id);
      if (!result.success) {
        whatsappWindow.close();
        setCouponFeedback({
          customerId: customer.id,
          message: result.error,
          error: true,
        });
        return;
      }

      const expiresAt = new Date(result.data.expiresAt).toLocaleDateString(
        "ar-EG",
        { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Cairo" }
      );
      const message = buildLoyaltyCouponWhatsAppMessage({
        customerName: result.data.customerName,
        totalSpent: result.data.totalSpent,
        couponCode: result.data.code,
        discountAmount: result.data.discountAmount ?? 0,
        expiresAt,
      });
      const whatsappUrl = getWhatsAppUrl(result.data.customerPhone, message);
      if (!whatsappUrl) {
        whatsappWindow.close();
        setCouponFeedback({
          customerId: customer.id,
          message: `تم إصدار الكوبون ${result.data.code}، لكن تعذر تجهيز رابط واتساب لأن رقم الهاتف غير صالح.`,
          error: true,
        });
      } else {
        whatsappWindow.location.href = whatsappUrl;
        setCouponFeedback({
          customerId: customer.id,
          message: `تم إصدار الكوبون ${result.data.code} وفتح رسالة واتساب جاهزة. أرسلها بعد مراجعتها.`,
          error: false,
        });
      }
      router.refresh();
    } catch (issueError) {
      console.error("Loyalty coupon issuance failed", issueError);
      whatsappWindow.close();
      setCouponFeedback({
        customerId: customer.id,
        message: "تعذر إصدار الكوبون. حاول مرة أخرى.",
        error: true,
      });
    } finally {
      setIssuingCustomerId(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError("");
    try {
      const result = await deleteCustomer(deleteTarget.id);
      if (result.success) {
        setDeleteTarget(null);
        router.refresh();
      } else {
        setDeleteError(result.error ?? "تعذر حذف العميل");
      }
    } catch {
      setDeleteError("تعذر حذف العميل بسبب مشكلة في الاتصال. حاول مرة أخرى.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brown">العملاء</h1>
          <p className="text-sm text-muted mt-1">{total} عميل</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          عميل جديد
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form
            className="flex gap-3 mb-6"
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const q = formData.get("search")?.toString() || "";
              const params = new URLSearchParams();
              if (q.trim()) params.set("search", q.trim());
              router.push(`/customers?${params.toString()}`);
            }}
          >
            <div className="relative flex-1 max-w-md">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
              <input
                name="search"
                defaultValue={search}
                placeholder="بحث بالاسم أو الهاتف..."
                className="w-full h-10 rounded-lg border border-border bg-white ps-10 pe-4 text-sm focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold"
              />
            </div>
            <Button type="submit" variant="secondary">
              بحث
            </Button>
          </form>

          {customers.length === 0 ? (
            <EmptyState
              icon={<Users className="h-8 w-8 text-gold" strokeWidth={1.5} />}
              title={hasSearch ? "لا توجد نتائج" : "لا يوجد عملاء"}
              description={
                hasSearch
                  ? "جرّب كلمات بحث مختلفة"
                  : "أضف عملاء جدد لتتبع مشترياتهم"
              }
              action={
                hasSearch
                  ? undefined
                  : { label: "عميل جديد", onClick: openCreate }
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الاسم</TableHead>
                  <TableHead>الهاتف</TableHead>
                  <TableHead>المبيعات</TableHead>
                  <TableHead>إجمالي الإنفاق</TableHead>
                  <TableHead>الزيارات</TableHead>
                  <TableHead>نقاط الولاء</TableHead>
                  <TableHead>كوبون الولاء</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((c) => {
                  const couponEligibility = getLoyaltyCouponEligibility({
                    totalSpent: c.totalSpent,
                    customThreshold: c.customThreshold,
                    lastIssuedLevel: c.loyaltyMilestones[0]?.level ?? 0,
                  });
                  return (
                    <TableRow key={c.id}>
                    <TableCell>
                      {canManage ? (
                        <button
                          type="button"
                          onClick={() => setSelectedCustomerId(c.id)}
                          className="font-medium text-gold hover:underline"
                        >
                          {c.name}
                        </button>
                      ) : (
                        <span className="font-medium">{c.name}</span>
                      )}
                    </TableCell>
                    <TableCell dir="ltr" className="text-start">
                      {c.phone}
                    </TableCell>
                    <TableCell>{c._count.sales}</TableCell>
                    <TableCell className="text-gold font-medium">
                      {formatCurrency(c.totalSpent)}
                    </TableCell>
                    <TableCell>{c.visitCount}</TableCell>
                    <TableCell>
                      <span className="inline-flex min-w-20 items-center justify-center rounded-full bg-gold/10 px-2.5 py-1 text-sm font-semibold text-gold">
                        {c.loyaltyPoints} نقطة
                      </span>
                    </TableCell>
                    <TableCell>
                      {couponEligibility.eligible ? (
                        <div className="space-y-2">
                          <span className="inline-flex items-center gap-1 rounded-full bg-gold/10 px-2.5 py-1 text-xs font-semibold text-gold">
                            <Tag className="h-3.5 w-3.5" />
                            مؤهل — المستوى {couponEligibility.nextLevel}
                          </span>
                          {canManage && (
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              disabled={
                                issuingCustomerId !== null ||
                                !formatPhoneForWhatsApp(c.phone)
                              }
                              loading={issuingCustomerId === c.id}
                              onClick={() => void handleIssueLoyaltyCoupon(c)}
                            >
                              <MessageCircle className="h-4 w-4" />
                              إصدار وإرسال واتساب
                            </Button>
                          )}
                          {canManage && !formatPhoneForWhatsApp(c.phone) && (
                            <p className="text-xs text-danger">
                              رقم الهاتف غير صالح لواتساب
                            </p>
                          )}
                          {couponFeedback?.customerId === c.id && (
                            <p
                              className={`max-w-64 text-xs ${couponFeedback.error ? "text-danger" : "text-green-700"}`}
                              role={couponFeedback.error ? "alert" : "status"}
                            >
                              {couponFeedback.message}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted">غير مؤهل</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <CustomerWhatsAppButton
                          customerName={c.name}
                          customerPhone={c.phone}
                        />
                        {canManage && (
                          <>
                            <Link href={`/customers/${c.id}`}>
                              <Button variant="ghost" size="icon">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEdit(c)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setDeleteError("");
                                setDeleteTarget(c);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-danger" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
          <PaginationNav
            page={page}
            totalPages={totalPages}
            basePath="/customers"
            searchParams={{ search }}
          />
        </CardContent>
      </Card>

      {deleteError && (
        <p role="alert" className="text-sm text-danger">
          {deleteError}
        </p>
      )}

      <ConfirmDeleteDialog
        isOpen={!!deleteTarget}
        onClose={() => {
          if (!deleting) {
            setDeleteTarget(null);
          }
        }}
        onConfirm={handleDelete}
        title="تأكيد حذف العميل"
        description="هل أنت متأكد؟ هذا الإجراء سيؤدي إلى حذف العميل نهائياً ولا يمكن التراجع عنه."
        itemName={deleteTarget?.name || undefined}
        loading={deleting}
      />

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "تعديل العميل" : "عميل جديد"}
        footer={
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit" form="modal-form-customer" loading={loading}>
              {editing ? "حفظ" : "إنشاء"}
            </Button>
          </div>
        }
      >
        <form id="modal-form-customer" onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-danger">
              {error}
            </div>
          )}
          <Input
            label="الاسم"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            label="الهاتف"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            dir="ltr"
          />
          <Input
            label="البريد الإلكتروني"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            dir="ltr"
          />
          <Input
            label="العنوان"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          <Input
            label="ملاحظات"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          {editing && canManage && (
            <Input
              label="حد استحقاق كوبون الولاء المخصص (ج.م)"
              type="number"
              min={DEFAULT_LOYALTY_COUPON_THRESHOLD + 0.01}
              step="any"
              value={customThreshold}
              onChange={(e) => setCustomThreshold(e.target.value)}
              placeholder={`اتركه فارغاً لاستخدام الحد العام ${formatCurrency(DEFAULT_LOYALTY_COUPON_THRESHOLD)}`}
              dir="ltr"
            />
          )}
        </form>
      </Modal>

      <CustomerDetailsModal
        customerId={selectedCustomerId}
        onClose={() => setSelectedCustomerId(null)}
      />
    </div>
  );
}
