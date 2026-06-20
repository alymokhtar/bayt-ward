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
import EmployeeAdjustmentModal from "@/app/(dashboard)/employees/EmployeeAdjustmentModal";
import EmployeeDetailsModal from "@/app/(dashboard)/employees/EmployeeDetailsModal";
import {
  createEmployee,
  updateEmployee,
  deleteEmployee,
} from "@/lib/actions/employees";
import {
  dateKeyToUtcNoon,
  getEgyptCalendarDateKey,
} from "@/lib/business-day";
import { USER_ROLES } from "@/lib/constants";
import { formatCurrency, formatDate, getRoleLabel } from "@/lib/utils";
import { Banknote, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Employee = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  salary: number;
  startDate: Date | null;
  pendingDeductions: number;
  isActive: boolean;
  createdAt: Date;
};

interface EmployeesClientProps {
  employees: Employee[];
  canManage?: boolean;
}

export default function EmployeesClient({
  employees: initial,
  canManage = false,
}: EmployeesClientProps) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [adjustmentEmployee, setAdjustmentEmployee] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [detailEmployeeId, setDetailEmployeeId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("CASHIER");
  const [salary, setSalary] = useState("");
  const [startDate, setStartDate] = useState(getEgyptCalendarDateKey);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function openCreate() {
    setEditing(null);
    setName("");
    setEmail("");
    setPhone("");
    setPassword("");
    setRole("CASHIER");
    setSalary("");
    setStartDate(getEgyptCalendarDateKey());
    setError("");
    setModalOpen(true);
  }

  function openEdit(emp: Employee) {
    setEditing(emp);
    setName(emp.name);
    setEmail(emp.email);
    setPhone(emp.phone || "");
    setPassword("");
    setRole(emp.role);
    setSalary(emp.salary.toString());
    setStartDate(
      emp.startDate ? getEgyptCalendarDateKey(emp.startDate) : getEgyptCalendarDateKey()
    );
    setError("");
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const salaryValue = parseFloat(salary) || 0;
    const startDateValue = startDate ? dateKeyToUtcNoon(startDate) : undefined;
    const result = editing
      ? await updateEmployee(editing.id, {
          name,
          email,
          phone,
          role: role as "ADMIN" | "MANAGER" | "CASHIER",
          salary: salaryValue,
          startDate: startDateValue ?? null,
          ...(password ? { password } : {}),
        })
      : await createEmployee({
          name,
          email,
          password,
          phone,
          role: role as "ADMIN" | "MANAGER" | "CASHIER",
          salary: salaryValue,
          startDate: startDateValue,
        });

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
    const result = await deleteEmployee(id);
    if (result.success) router.refresh();
    else alert(result.error);
  }

  async function toggleActive(emp: Employee) {
    const result = await updateEmployee(emp.id, { isActive: !emp.isActive });
    if (result.success) router.refresh();
    else alert(result.error);
  }

  return (
    <>
      {canManage && (
        <div className="flex justify-end mb-4">
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            موظف جديد
          </Button>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>الاسم</TableHead>
            <TableHead>البريد</TableHead>
            <TableHead>الدور</TableHead>
            <TableHead>الراتب</TableHead>
            <TableHead>استقطاعات معلقة</TableHead>
            <TableHead>الحالة</TableHead>
            <TableHead>بدء العمل</TableHead>
            {canManage && <TableHead>الإجراءات</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {initial.map((emp) => (
            <TableRow key={emp.id}>
              <TableCell>
                <button
                  type="button"
                  onClick={() => setDetailEmployeeId(emp.id)}
                  className="font-medium text-brown hover:text-gold hover:underline transition-colors text-start"
                >
                  {emp.name}
                </button>
              </TableCell>
              <TableCell dir="ltr" className="text-start text-sm">
                {emp.email}
              </TableCell>
              <TableCell>
                <Badge variant="gold">{getRoleLabel(emp.role)}</Badge>
              </TableCell>
              <TableCell className="font-medium text-gold">
                {formatCurrency(emp.salary)}
              </TableCell>
              <TableCell>
                {emp.pendingDeductions > 0 ? (
                  <span className="font-medium text-danger">
                    {formatCurrency(emp.pendingDeductions)}
                  </span>
                ) : (
                  <span className="text-muted text-sm">—</span>
                )}
              </TableCell>
              <TableCell>
                {canManage ? (
                  <button type="button" onClick={() => toggleActive(emp)}>
                    <Badge variant={emp.isActive ? "success" : "danger"}>
                      {emp.isActive ? "نشط" : "معطل"}
                    </Badge>
                  </button>
                ) : (
                  <Badge variant={emp.isActive ? "success" : "danger"}>
                    {emp.isActive ? "نشط" : "معطل"}
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-sm text-muted">
                {emp.startDate ? formatDate(emp.startDate) : "—"}
              </TableCell>
              {canManage && (
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setAdjustmentEmployee({ id: emp.id, name: emp.name })
                      }
                      title="سلفة / خصم / غياب"
                    >
                      <Banknote className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(emp)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(emp.id)}
                    >
                      <Trash2 className="h-4 w-4 text-danger" />
                    </Button>
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "تعديل الموظف" : "موظف جديد"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-danger">
              {error}
            </div>
          )}
          <Input label="الاسم" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input
            label="البريد الإلكتروني"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            dir="ltr"
          />
          <Input
            label="الهاتف"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            dir="ltr"
          />
          <Input
            label="الراتب الشهري"
            type="number"
            min={0}
            step={0.01}
            value={salary}
            onChange={(e) => setSalary(e.target.value)}
            required
          />
          <Input
            label="تاريخ بدء العمل"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
          <Input
            label={editing ? "كلمة مرور جديدة (اختياري)" : "كلمة المرور"}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required={!editing}
            dir="ltr"
          />
          <Select
            label="الدور"
            options={USER_ROLES}
            value={role}
            onChange={(e) => setRole(e.target.value)}
          />
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

      <EmployeeAdjustmentModal
        employee={adjustmentEmployee}
        onClose={() => setAdjustmentEmployee(null)}
      />

      <EmployeeDetailsModal
        employeeId={detailEmployeeId}
        onClose={() => setDetailEmployeeId(null)}
      />
    </>
  );
}
