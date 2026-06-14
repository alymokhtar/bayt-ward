import CustomersClient from "@/app/(dashboard)/customers/CustomersClient";
import { getCustomers } from "@/lib/actions/customers";
import { getSession } from "@/lib/auth";

interface CustomersPageProps {
  searchParams: Promise<{ search?: string; page?: string }>;
}

export default async function CustomersPage({
  searchParams,
}: CustomersPageProps) {
  const { search, page } = await searchParams;

  const [customerResult, session] = await Promise.all([
    getCustomers({ search, page: page ? Number(page) : 1 }),
    getSession(),
  ]);

  const canManage =
    session?.role === "ADMIN" || session?.role === "MANAGER";

  return (
    <CustomersClient
      customers={customerResult.items}
      total={customerResult.total}
      page={customerResult.page}
      totalPages={customerResult.totalPages}
      search={search}
      canManage={canManage}
    />
  );
}
