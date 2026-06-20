"use client";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Select from "@/components/ui/Select";
import { addEmployeeAdjustment } from "@/lib/actions/employees";
import {
  dateKeyToUtcNoon,
  getEgyptCalendarDateKey,
} from "@/lib/business-day";
import { EMPLOYEE_ADJUSTMENT_TYPES } from "@/lib/constants";
import type { EmployeeAdjustmentType } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface EmployeeAdjustmentModalProps {
  employee: { id: string; name: string } | null;
  onClose: () => void;
}

export default function EmployeeAdjustmentModal({
  employee,
  onClose,
}: EmployeeAdjustmentModalProps) {
  const router = useRouter();
  const [type, setType] = useState<EmployeeAdjustmentType>("ADVANCE");
  const [amount, setAmount] = useState("");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [adjustmentDate, setAdjustmentDate] = useState(getEgyptCalendarDateKey);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!employee) return;

    setLoading(true);
    setError("");

    const result = await addEmployeeAdjustment({
      userId: employee.id,
      type,
      amount: parseFloat(amount) || 0,
      title: title || undefined,
      notes: notes || undefined,
      adjustmentDate: dateKeyToUtcNoon(adjustmentDate),
    });

    setLoading(false);

    if (result.success) {
      onClose();
      router.refresh();
    } else {
      setError(result.error ?? "حدث خطأ");
    }
  }

  return (
    <Modal
      isOpen={!!employee}
      onClose={onClose}
      title="إضافة استقطاع"
      description={employee ? `الموظف: ${employee.name}` : undefined}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-danger">
            {error}
          </div>
        )}

        <Select
          label="النوع"
          options={EMPLOYEE_ADJUSTMENT_TYPES.map((t) => ({
            value: t.value,
            label: t.label,
          }))}
          value={type}
          onChange={(e) => setType(e.target.value as EmployeeAdjustmentType)}
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

        <Input
          label="العنوان (اختياري)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="مثال: سلفة شهر يونيو"
        />

        <Input
          label="التاريخ"
          type="date"
          value={adjustmentDate}
          onChange={(e) => setAdjustmentDate(e.target.value)}
        />

        <Input
          label="ملاحظات"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <div className="flex gap-2 justify-end">
          <Button type="button" variant="ghost" onClick={onClose}>
            إلغاء
          </Button>
          <Button type="submit" loading={loading}>
            حفظ
          </Button>
        </div>
      </form>
    </Modal>
  );
}
