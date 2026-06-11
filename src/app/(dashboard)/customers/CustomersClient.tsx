"use client";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
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
} from "@/lib/actions/customers";
import { formatCurrency } from "@/lib/utils";
import CustomerWhatsAppButton from "@/components/whatsapp/CustomerWhatsAppButton";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Customer = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  notes: string | null;
  totalSpent: number;
  visitCount: number;
  _count: { sales: number; returns: number };
};

interface CustomersClientProps {
  customers: Customer[];
}

export default function CustomersClient({
  customers: initial,
}: CustomersClientProps) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  function openEdit(c: Customer) {
    setEditing(c);
    setName(c.name);
    setPhone(c.phone);
    setEmail(c.email || "");
    setAddress(c.address || "");
    setNotes(c.notes || "");
    setError("");
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = editing
      ? await updateCustomer(editing.id, { name, phone, email, address, notes })
      : await createCustomer({ name, phone, email, address, notes });

    setLoading(false);

    if (result.success) {
      setModalOpen(false);
      router.refresh();
    } else {
      setError(result.error ?? "حدث خطأ");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("هل أنت متأكد من حذف هذا العميل؟")) return;
    const result = await deleteCustomer(id);
    if (result.success) router.refresh();
    else alert(result.error);
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          عميل جديد
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>الاسم</TableHead>
            <TableHead>الهاتف</TableHead>
            <TableHead>المبيعات</TableHead>
            <TableHead>إجمالي الإنفاق</TableHead>
            <TableHead>الزيارات</TableHead>
            <TableHead>الإجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {initial.map((c) => (
            <TableRow key={c.id}>
              <TableCell className="font-medium">{c.name}</TableCell>
              <TableCell dir="ltr" className="text-start">
                {c.phone}
              </TableCell>
              <TableCell>{c._count.sales}</TableCell>
              <TableCell className="text-gold font-medium">
                {formatCurrency(c.totalSpent)}
              </TableCell>
              <TableCell>{c.visitCount}</TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <CustomerWhatsAppButton
                    customerName={c.name}
                    customerPhone={c.phone}
                  />
                  <Link href={`/customers/${c.id}`}>
                    <Button variant="ghost" size="icon">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(c.id)}
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
        title={editing ? "تعديل العميل" : "عميل جديد"}
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
            label="البريد الإلكتروني"
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
    </>
  );
}
