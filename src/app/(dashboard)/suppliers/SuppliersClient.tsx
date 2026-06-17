"use client";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import {
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from "@/lib/actions/suppliers";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import SupplierDetailsModal from "@/app/(dashboard)/suppliers/SupplierDetailsModal";

type Supplier = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  notes: string | null;
  isActive: boolean;
  totalPurchaseAmount: number;
  lastPurchaseAmount: number | null;
  lastPurchaseAt: Date | null;
  _count: { purchases: number };
};

interface SuppliersClientProps {
  suppliers: Supplier[];
}

export default function SuppliersClient({
  suppliers: initial,
}: SuppliersClientProps) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [detailSupplierId, setDetailSupplierId] = useState<string | null>(null);

  function openCreate() {
    setEditing(null);
    setName("");
    setPhone("");
    setEmail("");
    setAddress("");
    setNotes("");
    setError("");
    setModalOpen(true);
  }

  function openEdit(s: Supplier) {
    setEditing(s);
    setName(s.name);
    setPhone(s.phone);
    setEmail(s.email || "");
    setAddress(s.address || "");
    setNotes(s.notes || "");
    setError("");
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = editing
      ? await updateSupplier(editing.id, { name, phone, email, address, notes })
      : await createSupplier({ name, phone, email, address, notes });

    setLoading(false);

    if (result.success) {
      setModalOpen(false);
      router.refresh();
    } else {
      setError(result.error ?? "حدث خطأ");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("هل أنت متأكد؟")) return;
    const result = await deleteSupplier(id);
    if (result.success) router.refresh();
    else alert(result.error);
  }

  async function toggleActive(s: Supplier) {
    const result = await updateSupplier(s.id, { isActive: !s.isActive });
    if (result.success) router.refresh();
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          مورد جديد
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>الاسم</TableHead>
            <TableHead>الهاتف</TableHead>
            <TableHead>عدد المشتريات</TableHead>
            <TableHead>إجمالي المشتريات</TableHead>
            <TableHead>آخر عملية شراء</TableHead>
            <TableHead>الحالة</TableHead>
            <TableHead>الإجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {initial.map((s) => (
            <TableRow key={s.id}>
              <TableCell>
                <button
                  type="button"
                  onClick={() => setDetailSupplierId(s.id)}
                  className="font-medium text-brown hover:text-gold hover:underline transition-colors text-start"
                >
                  {s.name}
                </button>
              </TableCell>
              <TableCell dir="ltr" className="text-start">
                {s.phone}
              </TableCell>
              <TableCell>{s._count.purchases}</TableCell>
              <TableCell className="font-medium text-gold">
                {formatCurrency(s.totalPurchaseAmount)}
              </TableCell>
              <TableCell>
                {s.lastPurchaseAmount != null ? (
                  <div>
                    <p className="font-medium text-brown">
                      {formatCurrency(s.lastPurchaseAmount)}
                    </p>
                    {s.lastPurchaseAt && (
                      <p className="text-xs text-muted">
                        {formatDateTime(s.lastPurchaseAt)}
                      </p>
                    )}
                  </div>
                ) : (
                  <span className="text-muted text-sm">—</span>
                )}
              </TableCell>
              <TableCell>
                <button type="button" onClick={() => toggleActive(s)}>
                  <Badge variant={s.isActive ? "success" : "danger"}>
                    {s.isActive ? "نشط" : "غير نشط"}
                  </Badge>
                </button>
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(s)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(s.id)}
                  >
                    <Trash2 className="h-4 w-4 text-danger" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "تعديل المورد" : "مورد جديد"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-danger">
              {error}
            </div>
          )}
          <Input label="الاسم" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input
            label="الهاتف"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            dir="ltr"
          />
          <Input
            label="البريد"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            dir="ltr"
          />
          <Input label="العنوان" value={address} onChange={(e) => setAddress(e.target.value)} />
          <Input label="ملاحظات" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit" loading={loading}>
              {editing ? "حفظ" : "إنشاء"}
            </Button>
          </div>
        </form>
      </Modal>

      <SupplierDetailsModal
        supplierId={detailSupplierId}
        onClose={() => setDetailSupplierId(null)}
      />
    </>
  );
}
