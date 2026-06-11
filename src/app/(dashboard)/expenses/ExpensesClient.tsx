"use client";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Select from "@/components/ui/Select";
import Badge from "@/components/ui/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { createExpense, deleteExpense } from "@/lib/actions/expenses";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Expense = {
  id: string;
  title: string;
  amount: number;
  category: string;
  description: string | null;
  expenseDate: Date;
  user: { name: string };
};

interface ExpensesClientProps {
  expenses: Expense[];
}

export default function ExpensesClient({
  expenses: initial,
}: ExpensesClientProps) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("OTHER");
  const [description, setDescription] = useState("");
  const [expenseDate, setExpenseDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const total = initial.reduce((s, e) => s + e.amount, 0);

  const categoryLabel = (cat: string) =>
    EXPENSE_CATEGORIES.find((c) => c.value === cat)?.label || cat;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await createExpense({
      title,
      amount: parseFloat(amount) || 0,
      category: category as "RENT" | "UTILITIES" | "SALARIES" | "MARKETING" | "SUPPLIES" | "MAINTENANCE" | "OTHER",
      description: description || undefined,
      expenseDate: new Date(expenseDate),
    });

    setLoading(false);

    if (result.success) {
      setModalOpen(false);
      setTitle("");
      setAmount("");
      setDescription("");
      router.refresh();
    } else {
      setError(result.error ?? "حدث خطأ");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("حذف هذا المصروف؟")) return;
    const result = await deleteExpense(id);
    if (result.success) router.refresh();
    else alert(result.error);
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted">
          الإجمالي:{" "}
          <span className="font-bold text-gold text-lg">
            {formatCurrency(total)}
          </span>
        </p>
        <Button onClick={() => { setModalOpen(true); setError(""); }}>
          <Plus className="h-4 w-4" />
          مصروف جديد
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>العنوان</TableHead>
            <TableHead>التصنيف</TableHead>
            <TableHead>المبلغ</TableHead>
            <TableHead>التاريخ</TableHead>
            <TableHead>بواسطة</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {initial.map((e) => (
            <TableRow key={e.id}>
              <TableCell>
                <p className="font-medium">{e.title}</p>
                {e.description && (
                  <p className="text-xs text-muted">{e.description}</p>
                )}
              </TableCell>
              <TableCell>
                <Badge variant="outline">{categoryLabel(e.category)}</Badge>
              </TableCell>
              <TableCell className="font-semibold text-danger">
                {formatCurrency(e.amount)}
              </TableCell>
              <TableCell>{formatDate(e.expenseDate)}</TableCell>
              <TableCell>{e.user.name}</TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(e.id)}
                >
                  <Trash2 className="h-4 w-4 text-danger" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="مصروف جديد"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-danger">
              {error}
            </div>
          )}
          <Input
            label="العنوان"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <Input
            label="المبلغ"
            type="number"
            min={0}
            step={0.01}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
          <Select
            label="التصنيف"
            options={EXPENSE_CATEGORIES}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
          <Input
            label="التاريخ"
            type="date"
            value={expenseDate}
            onChange={(e) => setExpenseDate(e.target.value)}
          />
          <Input
            label="الوصف"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit" loading={loading}>
              حفظ
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
