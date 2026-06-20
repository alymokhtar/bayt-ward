import EmployeesClient from "@/app/(dashboard)/employees/EmployeesClient";
import { Card, CardContent } from "@/components/ui/Card";
import { getEmployees } from "@/lib/actions/employees";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function EmployeesPage() {
  const session = await getSession();
  if (
    session?.role !== "ADMIN" &&
    session?.role !== "MANAGER" &&
    session?.role !== "CASHIER"
  ) {
    redirect("/dashboard");
  }

  const employees = await getEmployees();
  const canManage = session.role === "ADMIN";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brown">الموظفين</h1>
        <p className="text-sm text-muted mt-1">
          {canManage ? "إدارة حسابات الموظفين" : "عرض بيانات الموظفين"}
        </p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <EmployeesClient employees={employees} canManage={canManage} />
        </CardContent>
      </Card>
    </div>
  );
}
